/**
 * REAL BIOMETRIC & NETWORK VERIFICATION SERVICE
 * Nhận diện khuôn mặt THẬT bằng mô hình học máy (face-api: TinyFaceDetector + Landmarks 68 + FaceRecognition 128-d)
 * chạy hoàn toàn trên trình duyệt, kèm kiểm tra mạng Wi-Fi nội bộ qua IP rạp.
 */
import * as faceapi from '@vladmandic/face-api';

export interface FaceFeatures {
  /** Vector đặc trưng khuôn mặt 128 chiều (face descriptor) */
  descriptor?: number[];
  capturedImage: string; // Base64 data URL
  timestamp: number;
  hasValidFeatures?: boolean;
}

export interface NetworkConfig {
  authorizedIp: string;
  wifiSsidName: string;
  updatedAt: string;
}

export interface DetectedFaceBox {
  hasFace: boolean;
  box?: { x: number; y: number; width: number; height: number };
  confidence: number;
  isOccluded?: boolean;
  occlusionReason?: string;
  /** Descriptor của khung hình hiện tại (nếu bắt được mặt) */
  descriptor?: number[];
}

const STORAGE_KEYS = {
  FACE_PREFIX: 'aurora_enrolled_face_v2_',
  WIFI_CONFIG: 'aurora_authorized_wifi_config',
};

const MATCH_DISTANCE_THRESHOLD = 0.48;

export function isIpInSameWifi(clientIp: string, authorizedIp: string): boolean {
  if (!clientIp || !authorizedIp) return false;
  const c = clientIp.trim();
  const a = authorizedIp.trim();
  if (c === a) return true;
  if ((c === '127.0.0.1' || c === 'localhost') && (a === '127.0.0.1' || a === 'localhost')) return true;

  const cParts = c.split('.');
  const aParts = a.split('.');
  if (cParts.length === 4 && aParts.length === 4) {
    if (cParts[0] === aParts[0] && cParts[1] === aParts[1] && cParts[2] === aParts[2]) {
      return true;
    }
  }
  return false;
}

async function getLocalIpViaWebRTC(): Promise<string | null> {
  if (typeof window === 'undefined' || !(window as any).RTCPeerConnection) return null;
  return new Promise((resolve) => {
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => resolve(null));
      const timer = setTimeout(() => {
        try { pc.close(); } catch { }
        resolve(null);
      }, 1200);

      pc.onicecandidate = (event) => {
        if (!event || !event.candidate || !event.candidate.candidate) return;
        const cand = event.candidate.candidate;
        const match = cand.match(/([0-9]{1,3}(\.[0-9]{1,3}){3})/);
        if (match && match[1] && !match[1].startsWith('127.')) {
          clearTimeout(timer);
          try { pc.close(); } catch { }
          resolve(match[1]);
        }
      };
    } catch {
      resolve(null);
    }
  });
}

export async function detectCurrentNetwork(): Promise<{ ip: string; isOnline: boolean; localIp?: string }> {
  let localIp: string | null = null;
  try {
    localIp = await getLocalIpViaWebRTC();
  } catch { }

  try {
    const res = await fetch('http://localhost:8000/network-info', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      const serverIp = (data.ip && data.ip !== '127.0.0.1' && data.ip !== '::1') ? data.ip : null;
      const resolvedIp = (localIp && localIp !== '127.0.0.1') ? localIp : serverIp;
      if (resolvedIp) {
        return {
          ip: resolvedIp,
          isOnline: true,
          localIp: localIp || undefined
        };
      }
    }
  } catch (e) {
  }

  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        return {
          ip: (localIp && localIp !== '127.0.0.1') ? localIp : data.ip,
          isOnline: true,
          localIp: localIp || undefined
        };
      }
    }
  } catch (e) {
  }

  return {
    ip: localIp || '0.0.0.0',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    localIp: localIp || undefined
  };
}

export function getAuthorizedWifiConfig(): NetworkConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WIFI_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (
        parsed.authorizedIp?.startsWith('192.168.') ||
        parsed.wifiSsidName === 'Wi-Fi Cụm Rạp Aurora (Mạng Hiện Tại)'
      ) {
        const resetConfig: NetworkConfig = {
          authorizedIp: '10.179.243.65',
          wifiSsidName: 'AURORA-CINEMA-STAFF-5G',
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(STORAGE_KEYS.WIFI_CONFIG, JSON.stringify(resetConfig));
        return resetConfig;
      }
      return parsed;
    }
  } catch (e) { }

  return {
    authorizedIp: '10.179.243.65',
    wifiSsidName: 'AURORA-CINEMA-STAFF-5G',
    updatedAt: new Date().toISOString()
  };
}

export function setAuthorizedWifiConfig(ip: string, wifiSsidName: string): NetworkConfig {
  const config: NetworkConfig = {
    authorizedIp: ip,
    wifiSsidName: wifiSsidName || 'AURORA-CINEMA-STAFF-5G',
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(STORAGE_KEYS.WIFI_CONFIG, JSON.stringify(config));
  return config;
}

export async function getAvailableCameras(): Promise<MediaDeviceInfo[]> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return [];
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput');
  } catch {
    return [];
  }
}

// 2. KHỞI ĐỘNG WEBCAM TRỰC TIẾP CỦA THIẾT BỊ HIỆN TẠI (ƯU TIÊN WEBCAM MÁY TÍNH/LAPTOP THAY VÌ LINK ĐIỆN THOẠI)
export async function startWebcamStream(
  videoElement: HTMLVideoElement,
  deviceId?: string
): Promise<{ stream: MediaStream | null; activeCameraName?: string; error?: string }> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { stream: null, error: 'Trình duyệt không hỗ trợ WebRTC Camera.' };
  }

  // Tự động tìm kiếm và ưu tiên Camera tích hợp của Laptop / PC
  let targetDeviceId = deviceId;
  const isPhoneOrVirtual = (label: string) => {
    const l = (label || '').toLowerCase();
    return l.includes('phone') || l.includes('droid') || l.includes('camo') ||
      l.includes('virtual') || l.includes('iriun') || l.includes('link to windows') ||
      l.includes('windows phone') || l.includes('connected device');
  };

  if (!targetDeviceId) {
    try {
      const devices = await getAvailableCameras();
      if (devices.length > 0) {
        const builtIn = devices.find(d => {
          const name = (d.label || '').toLowerCase();
          return (name.includes('integrated') || name.includes('hd') || name.includes('webcam') || name.includes('built-in') || name.includes('camera')) && !isPhoneOrVirtual(name);
        }) || devices.find(d => !isPhoneOrVirtual(d.label));

        if (builtIn && builtIn.deviceId) {
          targetDeviceId = builtIn.deviceId;
        } else if (devices[0]?.deviceId) {
          targetDeviceId = devices[0].deviceId;
        }
      }
    } catch { }
  }

  // Chú ý: Tránh dùng { facingMode: 'user' } trước vì trên Windows 11 sẽ kích hoạt prompt liên kết điện thoại
  const candidateConstraints: MediaStreamConstraints[] = targetDeviceId
    ? [
      { video: { deviceId: { exact: targetDeviceId } } },
      { video: { deviceId: targetDeviceId } },
      { video: true }
    ]
    : [
      { video: true }, // Mở camera mặc định của phần cứng máy tính
      { video: { width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: 'user' } },
    ];

  let lastErr = '';
  for (const constraints of candidateConstraints) {
    try {
      let stream = await navigator.mediaDevices.getUserMedia(constraints);

      // Kiểm tra sau khi cấp quyền: nếu camera đang nhận là Phone Link mà trên máy có Webcam tích hợp, tự động chuyển
      if (!targetDeviceId) {
        try {
          const currentTrack = stream.getVideoTracks()[0];
          const currentLabel = currentTrack?.label || '';
          if (isPhoneOrVirtual(currentLabel)) {
            const allCams = await getAvailableCameras();
            const realLaptopCam = allCams.find(c => !isPhoneOrVirtual(c.label));
            if (realLaptopCam && realLaptopCam.deviceId && realLaptopCam.deviceId !== currentTrack.getSettings().deviceId) {
              currentTrack.stop();
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: realLaptopCam.deviceId } }
              });
            }
          }
        } catch { }
      }

      videoElement.srcObject = stream;
      videoElement.muted = true;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.setAttribute('autoplay', 'true');

      try {
        await videoElement.play();
      } catch (playErr) {
        setTimeout(() => videoElement.play().catch(() => { }), 100);
      }

      const tracks = stream.getVideoTracks();
      const rawLabel = tracks[0]?.label || '';
      const activeCameraName = rawLabel
        ? rawLabel
        : targetDeviceId
          ? 'Webcam tích hợp máy tính'
          : 'Camera của thiết bị này';

      return { stream, activeCameraName };
    } catch (err: any) {
      lastErr = err?.name || err?.message || 'Unknown error';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        return {
          stream: null,
          error: 'Trình duyệt chưa được cấp quyền Camera! Vui lòng bấm biểu tượng ổ khóa hoặc camera trên thanh địa chỉ và chọn "Cho phép".'
        };
      }
      if (err?.name === 'NotReadableError') {
        return {
          stream: null,
          error: 'Camera đang bị ứng dụng khác (Zoom, Zalo, Teams...) chiếm dụng. Vui lòng tắt ứng dụng đó và thử lại.'
        };
      }
    }
  }

  return {
    stream: null,
    error: `Không thể kết nối thiết bị Webcam (${lastErr}). Bạn hãy kiểm tra lại kết nối webcam hoặc cấp quyền camera cho trình duyệt.`
  };
}

// 3. TẢI MÔ HÌNH NHẬN DIỆN KHUÔN MẶT (chỉ tải một lần)
let modelsPromise: Promise<void> | null = null;
export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const base = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(base),
        faceapi.nets.faceRecognitionNet.loadFromUri(base),
      ]);
    })().catch((err) => {
      modelsPromise = null;
      throw err;
    });
  }
  return modelsPromise;
}

type MediaSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

const detectorOptions = () => new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

// Cắt vùng khuôn mặt (có chừa lề) thành ảnh vuông 120x120
function cropFaceToDataUrl(source: MediaSource, box: { x: number; y: number; width: number; height: number }): string {
  const canvas = document.createElement('canvas');
  canvas.width = 120;
  canvas.height = 120;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const size = Math.max(box.width, box.height) * 1.35;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  try {
    ctx.drawImage(source, cx - size / 2, cy - size / 2, size, size, 0, 0, 120, 120);
    return canvas.toDataURL('image/jpeg', 0.88);
  } catch {
    return '';
  }
}

// 4. BẮT NÉT & NHẬN DIỆN KHUÔN MẶT THỜI GIAN THỰC (REAL-TIME FACE TRACKER)
export async function detectFaceInRealtime(video: HTMLVideoElement): Promise<DetectedFaceBox> {
  if (!video || video.readyState < 2 || !video.videoWidth) {
    return { hasFace: false, confidence: 0 };
  }

  try {
    await loadFaceModels();
    const result = await faceapi
      .detectSingleFace(video, detectorOptions())
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!result) {
      return {
        hasFace: false,
        confidence: 0,
        isOccluded: true,
        occlusionReason: 'Không thấy khuôn mặt! Vui lòng nhìn thẳng vào camera và bỏ tay/vật che ra.'
      };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const box = result.detection.box;
    const score = result.detection.score;
    const confidence = Math.round(score * 100);

    // Khuôn mặt phải đủ rõ (tay che hoặc che một phần làm điểm tin cậy tụt thấp)
    if (score < 0.7) {
      return {
        hasFace: false,
        confidence,
        isOccluded: true,
        occlusionReason: 'Khuôn mặt bị che khuất hoặc không rõ! Vui lòng bỏ tay/vật che ra khỏi mặt.'
      };
    }

    // Khuôn mặt phải nằm trong vòng tròn và đủ lớn
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    if (box.width < vw * 0.18) {
      return { hasFace: false, confidence, occlusionReason: 'Hãy lại gần camera hơn một chút' };
    }
    if (Math.abs(cx - vw / 2) > vw * 0.16 || Math.abs(cy - vh / 2) > vh * 0.2) {
      return { hasFace: false, confidence, occlusionReason: 'Hãy căn khuôn mặt vào giữa vòng tròn' };
    }

    return {
      hasFace: true,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      confidence,
      isOccluded: false,
      descriptor: Array.from(result.descriptor)
    };
  } catch (e) {
    console.error('Face detection error', e);
    return { hasFace: false, confidence: 0 };
  }
}

// 5. Trích xuất đặc trưng khuôn mặt THẬT từ Video Stream
export async function extractFaceFromVideo(video: HTMLVideoElement, knownTrack?: DetectedFaceBox): Promise<FaceFeatures | null> {
  if (!video) return null;
  const track = knownTrack || (await detectFaceInRealtime(video));
  if (!track.hasFace || track.isOccluded || !track.descriptor || !track.box) {
    return null;
  }

  return {
    descriptor: track.descriptor,
    capturedImage: cropFaceToDataUrl(video, track.box),
    hasValidFeatures: true,
    timestamp: Date.now()
  };
}

// 6. So khớp hai khuôn mặt bằng khoảng cách Euclid giữa descriptor 128 chiều
export function compareFaces(currentFace: FaceFeatures, enrolledFace: FaceFeatures): {
  similarity: number;
  isMatch: boolean;
  reason: string;
} {
  if (!currentFace?.descriptor || currentFace.descriptor.length !== 128) {
    return { similarity: 0, isMatch: false, reason: 'Không đọc được đặc trưng khuôn mặt hiện tại!' };
  }
  if (!enrolledFace?.descriptor || enrolledFace.descriptor.length !== 128) {
    return {
      similarity: 0,
      isMatch: false,
      reason: 'Mẫu Face ID cũ không còn hợp lệ. Vui lòng chụp lại khuôn mặt mẫu!'
    };
  }

  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const d = currentFace.descriptor[i] - enrolledFace.descriptor[i];
    sum += d * d;
  }
  const distance = Math.sqrt(sum);

  let similarity: number;
  if (distance <= MATCH_DISTANCE_THRESHOLD) {
    similarity = Math.round(99 - (distance / MATCH_DISTANCE_THRESHOLD) * 24); // 75 - 99
  } else {
    similarity = Math.round(75 - ((distance - MATCH_DISTANCE_THRESHOLD) / 0.4) * 70);
  }
  similarity = Math.max(5, Math.min(99, similarity));

  const isMatch = distance <= MATCH_DISTANCE_THRESHOLD;

  return {
    similarity,
    isMatch,
    reason: isMatch
      ? `Khuôn mặt trùng khớp chính chủ (${similarity}%)`
      : `Khuôn mặt không khớp (${similarity}%). Vui lòng nhìn thẳng chính diện, không che mặt!`
  };
}

// 7. Quản lý Khuôn mặt mẫu đã đăng ký theo User ID
export function getEnrolledFace(userId: string): FaceFeatures | null {
  try {
    const key = `${STORAGE_KEYS.FACE_PREFIX}${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function saveEnrolledFace(userId: string, face: FaceFeatures): void {
  const key = `${STORAGE_KEYS.FACE_PREFIX}${userId}`;
  localStorage.setItem(key, JSON.stringify(face));
}

export function removeEnrolledFace(userId: string): void {
  const key = `${STORAGE_KEYS.FACE_PREFIX}${userId}`;
  localStorage.removeItem(key);
}

// 8. Trích xuất đặc trưng khuôn mặt từ file ảnh tải lên (JPG, PNG)
export function extractFaceFromDataUrl(dataUrl: string): Promise<FaceFeatures | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        await loadFaceModels();
        const result = await faceapi
          .detectSingleFace(img, detectorOptions())
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        if (!result || result.detection.score < 0.7) {
          resolve(null);
          return;
        }
        const b = result.detection.box;
        resolve({
          descriptor: Array.from(result.descriptor),
          capturedImage: cropFaceToDataUrl(img, { x: b.x, y: b.y, width: b.width, height: b.height }),
          hasValidFeatures: true,
          timestamp: Date.now()
        });
      } catch (e) {
        console.error(e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}
