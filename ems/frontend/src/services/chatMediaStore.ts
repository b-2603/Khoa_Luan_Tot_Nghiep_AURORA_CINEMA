/**
 * IndexedDB Media Store cho Kênh Chat Nội Bộ Aurora EMS
 * Lưu ảnh, video, âm thanh/giọng nói và tệp đính kèm dung lượng lớn mà không làm tràn localStorage.
 */

const DB_NAME = 'aurora_ems_chat_media_db';
const STORE_NAME = 'media_blobs';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const objectUrlCache = new Map<string, string>();

export async function saveChatMediaBlob(mediaId: string, blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(mediaId, url);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(blob, mediaId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    // Vẫn giữ được objectUrl trong phiên hiện tại ngay cả khi IndexedDB bị hạn chế
    console.warn('IndexedDB save fallback to in-memory URL:', err);
  }
  return url;
}

export async function getChatMediaUrl(mediaId: string): Promise<string | null> {
  if (objectUrlCache.has(mediaId)) {
    return objectUrlCache.get(mediaId)!;
  }
  try {
    const db = await openDb();
    const blob = await new Promise<Blob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(mediaId);
      req.onsuccess = () => resolve(req.result as Blob | undefined);
      req.onerror = () => reject(req.error);
    });
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(mediaId, url);
    return url;
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatAudioDuration(sec?: number): string {
  if (!sec || !isFinite(sec)) return '0:00';
  const total = Math.max(0, Math.round(sec));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}


/**
 * Mã hóa mảng mẫu PCM Float32 thành file WAV chuẩn (16-bit Mono)
 * Tương thích 100% mọi trình duyệt (Chrome, Edge, Safari, Firefox), có sẵn độ dài chính xác và phát ngay không lỗi codec.
 */
export function encodePcmToWavBlob(chunks: Float32Array[], sourceSampleRate: number, targetSampleRate = 16000): Blob {
  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  // Downsample nhẹ về 16kHz để dung lượng gọn (~32KB/giây) mà giọng nói vẫn rõ nét
  const sampleRate = sourceSampleRate > targetSampleRate ? targetSampleRate : sourceSampleRate;
  let samples: Float32Array;
  if (sampleRate < sourceSampleRate && merged.length > 0) {
    const ratio = sourceSampleRate / sampleRate;
    const newLength = Math.max(1, Math.round(merged.length / ratio));
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const idx = Math.min(merged.length - 1, Math.floor(i * ratio));
      samples[i] = merged[idx];
    }
  } else {
    samples = merged;
  }

  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (pos: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(pos + i, str.charCodeAt(i));
    }
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true);  // AudioFormat = 1 (PCM)
  view.setUint16(22, 1, true);  // NumChannels = 1 (Mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // ByteRate
  view.setUint16(32, 2, true);  // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let pos = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    pos += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
