import React, { useState, useRef, useEffect } from 'react';
import { Camera, Trash2, Eye, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { startWebcamStream, getAvailableCameras } from '../services/biometrics';

interface ProofPhotoCaptureProps {
  proofImage?: string;
  onImageChange: (image: string | undefined) => void;
  staffInfo?: string;
}

export const ProofPhotoCapture: React.FC<ProofPhotoCaptureProps> = ({
  proofImage,
  onImageChange,
  staffInfo,
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isViewingZoom, setIsViewingZoom] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [activeCameraName, setActiveCameraName] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Tắt camera khi unmount hoặc người dùng đóng
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
    setCameraError(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Mở webcam máy tính/laptop trực tiếp
  const startCamera = async (targetDeviceId?: string) => {
    setCameraError(null);
    setIsCameraOpen(true);

    // Chờ element video mount vào DOM
    await new Promise((r) => setTimeout(r, 120));

    if (!videoRef.current) {
      setCameraError('Không tìm thấy khung hiển thị video.');
      return;
    }

    const devId = targetDeviceId || selectedCameraId;
    const result = await startWebcamStream(videoRef.current, devId || undefined);

    if (result.stream) {
      streamRef.current = result.stream;
      setActiveCameraName(result.activeCameraName || 'Webcam máy tính');
      setCameraError(null);

      // Cập nhật danh sách camera để người dùng có thể đổi nếu cần
      getAvailableCameras().then((cams) => {
        setAvailableCameras(cams);
      });
    } else {
      setCameraError(result.error || 'Không thể mở webcam trên thiết bị này.');
    }
  };

  // Đổi camera khi người dùng chọn camera khác
  const handleCameraChange = async (newDeviceId: string) => {
    setSelectedCameraId(newDeviceId);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    startCamera(newDeviceId);
  };

  // Chụp ảnh liền lập tức từ video stream của laptop/thiết bị
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);

      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const timestamp = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;

      ctx.fillStyle = 'rgba(13, 27, 46, 0.85)';
      ctx.fillRect(0, height - 42, width, 42);

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#f4c04a';
      const watermarkText = `AURORA CINEMA • ${timestamp} ${staffInfo ? `(${staffInfo})` : ''}`;
      ctx.fillText(watermarkText, 16, height - 16);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onImageChange(dataUrl);
      stopCamera();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700">
          Ảnh Minh Chứng:
        </label>
        {proofImage && (
          <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã chụp ảnh
          </span>
        )}
      </div>

      {cameraError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{cameraError}</span>
        </div>
      )}

      {/* KHUNG CAMERA LIVE ĐỂ CHỤP LIỀN TRÊN LAPTOP */}
      {isCameraOpen ? (
        <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-700 shadow-xl">
          <div className="relative aspect-video max-h-[280px] w-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-4 pointer-events-none border border-white/30 rounded-xl" />
          </div>

          <div className="p-3 bg-slate-900 flex items-center justify-between border-t border-slate-800 gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={stopCamera}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl flex items-center gap-1 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
                Đóng
              </button>

              {/* Cho phép chọn camera nếu có nhiều camera trên máy */}
              {availableCameras.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraChange(e.target.value)}
                  className="bg-slate-800 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
                >
                  {availableCameras.map((cam, idx) => (
                    <option key={cam.deviceId || idx} value={cam.deviceId}>
                      {cam.label || `Camera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="button"
              onClick={capturePhoto}
              className="px-6 py-2 bg-gradient-to-r from-[#f4c04a] to-[#ffd466] hover:brightness-105 active:scale-95 text-[#0d1b2e] font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#0d1b2e]" />
              <span>Chụp Ảnh</span>
            </button>
          </div>
        </div>
      ) : proofImage ? (
        /* XEM TRƯỚC ẢNH VỪA CHỤP */
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div
              onClick={() => setIsViewingZoom(true)}
              className="relative w-20 h-16 rounded-xl overflow-hidden border border-slate-300 cursor-pointer group shadow-2xs shrink-0"
              title="Nhấn để xem ảnh phóng to"
            >
              <img
                src={proofImage}
                alt="Minh chứng"
                className="w-full h-full object-cover group-hover:scale-105 transition"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
            <div className="text-xs font-bold text-slate-800">
              Ảnh chụp minh chứng
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsViewingZoom(true)}
              className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-white rounded-xl border border-slate-200 transition cursor-pointer"
              title="Xem ảnh phóng to"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => startCamera()}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl border border-amber-300 transition flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Chụp Lại</span>
            </button>
            <button
              type="button"
              onClick={() => onImageChange(undefined)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* NÚT CHỤP ẢNH TRỰC TIẾP TRÊN THIẾT BỊ */
        <button
          type="button"
          onClick={() => startCamera()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-amber-300 bg-amber-50 hover:bg-amber-100/80 active:bg-amber-200 text-amber-900 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
        >
          <Camera className="w-4 h-4 text-amber-700" />
          <span>Chụp Ảnh Minh Chứng</span>
        </button>
      )}

      {/* MODAL PHÓNG TO ẢNH MINH CHỨNG */}
      {isViewingZoom && proofImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsViewingZoom(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3.5 bg-slate-800 border-b border-slate-700 text-white">
              <span className="text-xs font-bold text-[#f4c04a] flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#f4c04a]" />
                Ảnh Minh Chứng
              </span>
              <button
                type="button"
                onClick={() => setIsViewingZoom(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/60 max-h-[70vh] overflow-auto">
              <img
                src={proofImage}
                alt="Minh chứng"
                className="max-h-[60vh] max-w-full rounded-xl object-contain border border-slate-800"
              />
            </div>
            <div className="p-3 bg-slate-800/80 text-right">
              <button
                type="button"
                onClick={() => setIsViewingZoom(false)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
