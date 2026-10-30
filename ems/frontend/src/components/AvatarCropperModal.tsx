import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Undo2, Crop } from 'lucide-react';

interface AvatarCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export const AvatarCropperModal: React.FC<AvatarCropperModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete,
}) => {
  const [safeSrc, setSafeSrc] = useState(imageSrc);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [baseSize, setBaseSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Viewport & Circular Aperture Sizes
  const VIEW_SIZE = 340;      // 340x340 px interactive frame
  const CROP_DIAMETER = 260;  // 260px circle cut-out

  // Handle external image CORS cleanly
  useEffect(() => {
    if (!imageSrc) return;
    if (imageSrc.startsWith('http') && !imageSrc.startsWith(window.location.origin)) {
      fetch(imageSrc, { mode: 'cors' })
        .then((res) => res.blob())
        .then((blob) => {
          setSafeSrc(URL.createObjectURL(blob));
        })
        .catch(() => {
          setSafeSrc(imageSrc);
        });
    } else {
      setSafeSrc(imageSrc);
    }
  }, [imageSrc]);

  // Reset state when a new image or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    }
  }, [isOpen, safeSrc]);

  // When image loads, compute natural proportional base size to fit the crop circle
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const nw = e.currentTarget.naturalWidth || 400;
    const nh = e.currentTarget.naturalHeight || 400;
    const fitScale = Math.max(CROP_DIAMETER / nw, CROP_DIAMETER / nh);
    setBaseSize({
      w: nw * fitScale,
      h: nh * fitScale,
    });
  };

  // Drag handlers (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers (Mobile / Touchscreen)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - offset.x, y: touch.clientY - offset.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setOffset({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom((prev) => Math.min(Math.max(0.4, prev + delta), 4.0));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Rotate 90 degrees clockwise
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Reset to center
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };



  // High-Resolution 1:1 Canvas Render
  const handleApplyCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const OUT_SIZE = 500; // 500x500 high-res avatar
    const canvas = document.createElement('canvas');
    canvas.width = OUT_SIZE;
    canvas.height = OUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Clip exact circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUT_SIZE / 2, OUT_SIZE / 2, OUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // 2. Scale factor between viewport crop diameter and canvas
    const factor = OUT_SIZE / CROP_DIAMETER;

    // Apply translation & rotation
    ctx.translate(OUT_SIZE / 2 + offset.x * factor, OUT_SIZE / 2 + offset.y * factor);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw image matching exact DOM dimensions
    const drawW = (baseSize.w || img.naturalWidth || 300) * factor;
    const drawH = (baseSize.h || img.naturalHeight || 300) * factor;
    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    try {
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
      onCropComplete(croppedDataUrl);
      onClose();
    } catch (e) {
      console.error('Canvas export error:', e);
      // Fallback
      onCropComplete(safeSrc);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 flex flex-col space-y-4 max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <Crop className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Cắt & Căn Chỉnh Góc Ảnh Tròn</h3>
              <p className="text-[11px] text-slate-500">Giữ chuột kéo để chọn góc/vị trí ảnh muốn làm ảnh đại diện</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Cropper Viewport */}
        <div className="flex flex-col items-center justify-center select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ width: `${VIEW_SIZE}px`, height: `${VIEW_SIZE}px` }}
            className="relative bg-slate-950 rounded-2xl overflow-hidden cursor-move flex items-center justify-center shadow-2xl"
          >
            {/* The Image being transformed */}
            <img
              ref={imgRef}
              src={safeSrc}
              crossOrigin="anonymous"
              onLoad={handleImageLoad}
              alt="Crop target"
              draggable={false}
              style={{
                width: baseSize.w ? `${baseSize.w}px` : 'auto',
                height: baseSize.h ? `${baseSize.h}px` : 'auto',
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: isDragging ? 'none' : 'transform 0.08s ease-out',
                position: 'absolute',
                maxWidth: 'none',
                maxHeight: 'none',
              }}
              className="pointer-events-none user-select-none"
            />

            {/* Dark Mask with Circular Transparent Cutout (SVG) */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width={VIEW_SIZE}
              height={VIEW_SIZE}
              viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
            >
              <defs>
                <mask id="circle-cutout-mask-v2">
                  <rect width={VIEW_SIZE} height={VIEW_SIZE} fill="white" />
                  <circle
                    cx={VIEW_SIZE / 2}
                    cy={VIEW_SIZE / 2}
                    r={CROP_DIAMETER / 2}
                    fill="black"
                  />
                </mask>
              </defs>

              {/* Shaded Background (Semi-transparent black) */}
              <rect
                width={VIEW_SIZE}
                height={VIEW_SIZE}
                fill="rgba(15, 23, 42, 0.72)"
                mask="url(#circle-cutout-mask-v2)"
              />

              {/* Glowing Guideline Circle */}
              <circle
                cx={VIEW_SIZE / 2}
                cy={VIEW_SIZE / 2}
                r={CROP_DIAMETER / 2}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeDasharray="8 6"
                className="animate-pulse"
              />

              {/* Rule of Thirds Grid Lines inside circle */}
              <line
                x1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + CROP_DIAMETER / 3}
                y1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + 10}
                x2={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + CROP_DIAMETER / 3}
                y2={VIEW_SIZE / 2 + CROP_DIAMETER / 2 - 10}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="3 3"
              />
              <line
                x1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + (CROP_DIAMETER / 3) * 2}
                y1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + 10}
                x2={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + (CROP_DIAMETER / 3) * 2}
                y2={VIEW_SIZE / 2 + CROP_DIAMETER / 2 - 10}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="3 3"
              />
              <line
                x1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + 10}
                y1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + CROP_DIAMETER / 3}
                x2={VIEW_SIZE / 2 + CROP_DIAMETER / 2 - 10}
                y2={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + CROP_DIAMETER / 3}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="3 3"
              />
              <line
                x1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + 10}
                y1={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + (CROP_DIAMETER / 3) * 2}
                x2={VIEW_SIZE / 2 + CROP_DIAMETER / 2 - 10}
                y2={VIEW_SIZE / 2 - CROP_DIAMETER / 2 + (CROP_DIAMETER / 3) * 2}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="3 3"
              />
            </svg>
          </div>

          <span className="text-[11px] text-slate-500 mt-2 font-medium flex items-center gap-1.5 text-center">
            <span>🖱️ Giữ chuột và kéo để di chuyển tới góc muốn cắt • Lăn chuột để zoom</span>
          </span>
        </div>



        {/* Toolbar & Sliders */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min="0.4"
              max="4.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
            />
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(4.0, z + 0.15))}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-700 min-w-[45px] text-right">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Quick Buttons: Rotate & Reset */}
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleRotate}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-600" />
              <span>Xoay 90° ({rotation}°)</span>
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Đặt lại ban đầu</span>
            </button>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-sm flex items-center gap-1.5 transition cursor-pointer"
          >
            <Check className="w-4 h-4 text-slate-950" />
            <span>Cắt & Áp Dụng Làm Avatar</span>
          </button>
        </div>
      </div>
    </div>
  );
};
