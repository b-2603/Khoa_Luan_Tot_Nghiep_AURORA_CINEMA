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
  WIFI_CONFIG: 'aurora_authorized_wifi_config_v3',
};

const MATCH_DISTANCE_THRESHOLD = 0.42;

export function isIpInSameWifi(clientIp: string, authorizedIp: string): boolean {
  if (!clientIp || !authorizedIp) return false;
  const c = clientIp.trim();
  const a = authorizedIp.trim();
  if (c === 'Đang dò mạng...' || c === 'Chưa xác định') return false;
  return c === a;
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
  const [rtcRes, localApiRes, publicIpRes] = await Promise.allSettled([
    getLocalIpViaWebRTC(),
    fetch('http://localhost:8000/network-info', { signal: AbortSignal.timeout(1200) }).then(r => (r.ok ? r.json() : null)),
    fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(1500) }).then(r => (r.ok ? r.json() : null)),
  ]);

  const localIp = rtcRes.status === 'fulfilled' && rtcRes.value && rtcRes.value !== '127.0.0.1' ? rtcRes.value : null;
  const serverIp =
    localApiRes.status === 'fulfilled' &&
      localApiRes.value?.ip &&
      localApiRes.value.ip !== '127.0.0.1' &&
      localApiRes.value.ip !== '::1'
      ? localApiRes.value.ip
      : null;
  const publicIp = publicIpRes.status === 'fulfilled' && publicIpRes.value?.ip ? publicIpRes.value.ip : null;

  const resolvedIp = localIp || serverIp || publicIp || 'Chưa xác định';
  return {
    ip: resolvedIp,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    localIp: localIp || serverIp || undefined,
  };
}

export function getAuthorizedWifiConfig(): NetworkConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WIFI_CONFIG);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.authorizedIp) {
        return parsed;
      }
    }
  } catch (e) { }

  return {
    authorizedIp: '192.168.1.206',
    updatedAt: new Date().toISOString(),
    wifiSsidName: 'AURORA-CINEMA-STAFF-5G',
  };
}

export function setAuthorizedWifiConfig(ip: string, wifiSsidName: string): NetworkConfig {
  const config: NetworkConfig = {
    authorizedIp: ip,
    wifiSsidName: wifiSsidName || 'AURORA-CINEMA-STAFF-5G',
    updatedAt: new Date().toISOString(),
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

const detectorOptions = (inputSize = 320, scoreThreshold = 0.25) =>
  new faceapi.TinyFaceDetectorOptions({ inputSize, scoreThreshold });

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

function checkFaceOcclusionAndQuality(
  video: HTMLVideoElement,
  box: { x: number; y: number; width: number; height: number },
  landmarks: faceapi.FaceLandmarks68,
  score: number
): { isOccluded: boolean; reason?: string } {
  if (score < 0.62) {
    return {
      isOccluded: true,
      reason: 'Khuôn mặt bị che khuất hoặc chưa rõ! Vui lòng bỏ tay/vật che mặt ra.'
    };
  }

  const pts = landmarks.positions;
  if (!pts || pts.length < 68) {
    return {
      isOccluded: true,
      reason: 'Không nhận diện đủ ngũ quan khuôn mặt!'
    };
  }

  const avgPoint = (indices: number[]) => {
    let sx = 0;
    let sy = 0;
    for (const idx of indices) {
      sx += pts[idx].x;
      sy += pts[idx].y;
    }
    return { x: sx / indices.length, y: sy / indices.length };
  };

  const leftEye = avgPoint([36, 37, 38, 39, 40, 41]);
  const rightEye = avgPoint([42, 43, 44, 45, 46, 47]);
  const noseTip = pts[30];
  const mouthCenter = avgPoint([60, 61, 62, 63, 64, 65, 66, 67]);

  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const eyeDistRatio = eyeDist / Math.max(1, box.width);
  if (eyeDistRatio < 0.24 || eyeDistRatio > 0.56) {
    return {
      isOccluded: true,
      reason: 'Vui lòng nhìn thẳng chính diện và không che mặt!'
    };
  }

  const eyeTilt = Math.abs(rightEye.y - leftEye.y) / Math.max(1, eyeDist);
  if (eyeTilt > 0.28) {
    return {
      isOccluded: true,
      reason: 'Vui lòng giữ thẳng đầu và nhìn trực diện vào camera!'
    };
  }

  const noseRatioX = (noseTip.x - leftEye.x) / Math.max(1, rightEye.x - leftEye.x);
  if (noseRatioX < 0.28 || noseRatioX > 0.72) {
    return {
      isOccluded: true,
      reason: 'Khuôn mặt bị lệch hoặc bị che khuất! Vui lòng bỏ tay ra và nhìn thẳng.'
    };
  }

  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const noseToEye = (noseTip.y - eyeMidY) / Math.max(1, box.height);
  const mouthToNose = (mouthCenter.y - noseTip.y) / Math.max(1, box.height);
  if (noseToEye < 0.11 || noseToEye > 0.40 || mouthToNose < 0.11 || mouthToNose > 0.40) {
    return {
      isOccluded: true,
      reason: 'Phát hiện vật che mặt! Vui lòng để lộ rõ mắt, mũi, miệng.'
    };
  }

  try {
    const canvas = document.createElement('canvas');
    const cSize = 96;
    canvas.width = cSize;
    canvas.height = cSize;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, cSize, cSize);
      const imgData = ctx.getImageData(0, 0, cSize, cSize).data;

      const regionStats = (cx: number, cy: number, rx: number, ry: number) => {
        const x0 = Math.max(0, Math.floor(((cx - box.x) / box.width) * cSize - rx));
        const x1 = Math.min(cSize - 1, Math.ceil(((cx - box.x) / box.width) * cSize + rx));
        const y0 = Math.max(0, Math.floor(((cy - box.y) / box.height) * cSize - ry));
        const y1 = Math.min(cSize - 1, Math.ceil(((cy - box.y) / box.height) * cSize + ry));

        let sum = 0;
        let sumSq = 0;
        let min = 255;
        let max = 0;
        let n = 0;
        for (let y = y0; y <= y1; y++) {
          for (let x = x0; x <= x1; x++) {
            const i = (y * cSize + x) * 4;
            const lum = 0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2];
            sum += lum;
            sumSq += lum * lum;
            if (lum < min) min = lum;
            if (lum > max) max = lum;
            n++;
          }
        }
        if (n === 0) return { mean: 0, std: 0, range: 0 };
        const mean = sum / n;
        const std = Math.sqrt(Math.max(0, sumSq / n - mean * mean));
        return { mean, std, range: max - min };
      };

      const lEyeStat = regionStats(leftEye.x, leftEye.y, 9, 6);
      const rEyeStat = regionStats(rightEye.x, rightEye.y, 9, 6);
      const mouthStat = regionStats(mouthCenter.x, mouthCenter.y, 12, 7);

      if (lEyeStat.range < 24 || rEyeStat.range < 24 || lEyeStat.std < 6.5 || rEyeStat.std < 6.5) {
        return {
          isOccluded: true,
          reason: 'Phát hiện tay hoặc vật che vùng mắt! Vui lòng bỏ tay ra.'
        };
      }

      if (mouthStat.range < 20 || mouthStat.std < 5.5) {
        return {
          isOccluded: true,
          reason: 'Phát hiện vật che vùng mũi/miệng! Vui lòng bỏ tay hoặc khẩu trang ra.'
        };
      }
    }
  } catch { }

  return { isOccluded: false };
}

// 4. BẮT NÉT & NHẬN DIỆN KHUÔN MẶT THỜI GIAN THỰC (REAL-TIME FACE TRACKER)
export async function detectFaceInRealtime(video: HTMLVideoElement): Promise<DetectedFaceBox> {
  if (!video || video.readyState < 2 || !video.videoWidth) {
    return { hasFace: false, confidence: 0 };
  }

  try {
    await loadFaceModels();
    const results = await faceapi
      .detectAllFaces(video, detectorOptions(320, 0.35))
      .withFaceLandmarks(true)
      .withFaceDescriptors();

    if (!results || results.length === 0) {
      return {
        hasFace: false,
        confidence: 0,
        isOccluded: false,
        occlusionReason: 'Không thấy khuôn mặt! Vui lòng nhìn thẳng vào camera.'
      };
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const sortedByCenter = [...results].sort((a, b) => {
      const acx = a.detection.box.x + a.detection.box.width / 2 - vw / 2;
      const acy = a.detection.box.y + a.detection.box.height / 2 - vh / 2;
      const bcx = b.detection.box.x + b.detection.box.width / 2 - vw / 2;
      const bcy = b.detection.box.y + b.detection.box.height / 2 - vh / 2;
      return Math.hypot(acx, acy) - Math.hypot(bcx, bcy);
    });

    const result = sortedByCenter[0];
    const box = result.detection.box;
    const score = result.detection.score;
    const confidence = Math.round(score * 100);

    const occlusionCheck = checkFaceOcclusionAndQuality(
      video,
      { x: box.x, y: box.y, width: box.width, height: box.height },
      result.landmarks,
      score
    );

    if (occlusionCheck.isOccluded) {
      return {
        hasFace: true,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        confidence,
        isOccluded: true,
        occlusionReason: occlusionCheck.reason || 'Khuôn mặt đang bị che khuất! Vui lòng bỏ tay ra.'
      };
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
  if (track.hasFace && !track.isOccluded && track.confidence >= 62 && track.descriptor && track.box) {
    return {
      descriptor: track.descriptor,
      capturedImage: cropFaceToDataUrl(video, track.box),
      hasValidFeatures: true,
      timestamp: Date.now()
    };
  }

  return null;
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
        if (!result || result.detection.score < 0.4) {
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
