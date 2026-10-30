import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, RotateCw } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  imageUrl: string;
  title?: string;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  imageUrl,
  title = 'Xem Ảnh Phóng To',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !imageUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `aurora-avatar-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Floating Toolbar Header */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute top-5 inset-x-0 mx-auto max-w-md px-4 flex items-center justify-between text-white"
      >
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-2 text-xs font-bold text-slate-200 flex items-center gap-2 shadow-xl">
          <span>{title}</span>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-xl">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono px-1 font-bold text-amber-400">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title="Xoay ảnh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-300 hover:text-white transition cursor-pointer"
            title="Tải ảnh về máy"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition cursor-pointer ml-1"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-3xl max-h-[82vh] overflow-hidden flex items-center justify-center p-2"
      >
        <img
          src={imageUrl}
          alt={title}
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-w-full max-h-[80vh] object-contain rounded-3xl shadow-2xl ring-2 ring-white/10 select-none"
        />
      </div>

      {/* Bottom Hint */}
      <div className="absolute bottom-5 inset-x-0 text-center pointer-events-none">
        <span className="text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-xs">
          Nhấp ra ngoài hoặc bấm dấu ✕ để đóng
        </span>
      </div>
    </div>
  );
};
