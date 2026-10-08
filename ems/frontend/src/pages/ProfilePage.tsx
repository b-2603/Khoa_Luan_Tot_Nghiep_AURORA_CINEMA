import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { Mail, Phone, Calendar, Shield, Award, Star, Camera, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw, Trash2, X, Sparkles, Upload, Image, Link as LinkIcon, Check } from 'lucide-react';
import { getCertificates, updateUser } from '../services/storage';
import { updateEmployee } from '../services/apiClient';
import { getEnrolledFace, saveEnrolledFace, removeEnrolledFace, startWebcamStream, extractFaceFromVideo, FaceFeatures } from '../services/biometrics';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
];

interface ProfilePageProps {
  currentUser: User;
  onUpdateUser?: (updatedUser: User) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ currentUser, onUpdateUser }) => {
  const certs = getCertificates().filter(c => c.userId === currentUser.id);
  const [enrolledFace, setEnrolledFace] = useState<FaceFeatures | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(currentUser.avatar);

  // Face Enrollment Camera Modal State (Chỉ phục vụ Face ID hệ thống)
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [cameraErrorMessage, setCameraErrorMessage] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Profile Avatar Modal State (Đổi ảnh hồ sơ theo ý thích)
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(currentUser.avatar);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (currentUser?.id) {
      setEnrolledFace(getEnrolledFace(currentUser.id));
      setAvatarUrl(currentUser.avatar);
      setAvatarPreview(currentUser.avatar);
    }
  }, [currentUser.id, currentUser.avatar]);

  const [activeCameraName, setActiveCameraName] = useState<string>('');

  // Handle Camera initialization inside Profile modal
  const initCamera = async () => {
    setCameraError(false);
    setCameraReady(false);
    setCameraErrorMessage('');

    await new Promise(r => setTimeout(r, 120));
    const video = videoRef.current;
    if (!video) return;

    const res = await startWebcamStream(video);
    if (res.stream) {
      mediaStreamRef.current = res.stream;
      setActiveCameraName(res.activeCameraName || 'Camera thiết bị này');
      setCameraReady(true);
      setCameraError(false);
    } else {
      setCameraError(true);
      setCameraErrorMessage(res.error || 'Không thể kết nối camera.');
    }
  };

  useEffect(() => {
    if (isFaceModalOpen) {
      initCamera();
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      setCameraReady(false);
    }

    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [isFaceModalOpen]);

  // Lưu ảnh hồ sơ mới (Tùy chọn tải ảnh hoặc link)
  const handleSaveAvatar = (newAvatar: string) => {
    if (!newAvatar.trim()) return;
    setAvatarUrl(newAvatar);
    setAvatarPreview(newAvatar);
    const updated = updateUser(currentUser.id, { avatar: newAvatar });
    updateEmployee(currentUser.id, { avatar: newAvatar }).catch(console.warn);
    if (updated && onUpdateUser) {
      onUpdateUser(updated);
    }
    setIsAvatarModalOpen(false);
    showNotification('Đã cập nhật ảnh hồ sơ thành công!', 'success');
  };

  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleSaveAvatar(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Capture and save face to Face ID biometric system (Chỉ lưu sinh trắc học hệ thống, KHÔNG đè ảnh hồ sơ)
  const handleCaptureAndSaveFace = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) {
      alert('Camera chưa sẵn sàng!');
      return;
    }

    const face = extractFaceFromVideo(video);
    if (!face) {
      alert('Không nhận được khung hình từ camera. Hãy nhìn thẳng vào camera và thử lại!');
      return;
    }

    // 1. Lưu vector đặc trưng Face ID và hình ảnh sinh trắc học vào hệ thống
    saveEnrolledFace(currentUser.id, face);
    setEnrolledFace(face);

    setIsFaceModalOpen(false);
    showNotification(`Đã lưu dữ liệu Face ID của ${currentUser.name} vào hệ thống! Bạn có thể tự do đổi ảnh hồ sơ tùy ý.`, 'success');
  };

  // Remove face
  const handleRemoveFace = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dữ liệu Face ID này?')) {
      removeEnrolledFace(currentUser.id);
      setEnrolledFace(null);
      showNotification('Đã xóa dữ liệu Face ID.', 'info');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : toast.type === 'error'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Title */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Xem Hồ Sơ Nhân Viên</h2>
          <p className="text-xs text-slate-500 mt-1">Thông tin cá nhân, chức vụ, bộ phận và dữ liệu sinh trắc học Face ID</p>
        </div>
      </div>

      {/* Main Profile Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start shadow-sm">
        {/* Avatar & Key Status */}
        <div className="flex flex-col items-center shrink-0 w-full md:w-auto">
          <div 
            className="relative group cursor-pointer" 
            onClick={() => setIsAvatarModalOpen(true)}
            title="Bấm để đổi ảnh đại diện hồ sơ"
          >
            <img
              src={avatarUrl}
              alt={currentUser.name}
              className="w-32 h-32 rounded-3xl object-cover ring-4 ring-amber-500/20 shadow-lg group-hover:opacity-90 transition"
            />
            <div className="absolute inset-0 bg-slate-950/40 rounded-3xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center text-white text-[11px] font-bold gap-1 backdrop-blur-xs">
              <Camera className="w-5 h-5 text-amber-300" />
              <span>Đổi ảnh</span>
            </div>
            <span className="absolute bottom-2 right-2 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>

          <button
            type="button"
            onClick={() => setIsAvatarModalOpen(true)}
            className="mt-2.5 text-[11px] font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 transition cursor-pointer shadow-xs"
          >
            <Camera className="w-3.5 h-3.5 text-amber-600" />
            Đổi ảnh hồ sơ
          </button>

          <h3 className="font-black text-lg text-slate-900 mt-2">{currentUser.name}</h3>
          <span className="text-xs font-mono text-amber-700 font-bold">{currentUser.staffCode}</span>
          <span className="mt-2 text-[11px] px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold">
            {currentUser.role === 'manager' ? 'Quản lý Đào tạo & HR' : 'Nhân viên Phục vụ Rạp'}
          </span>
        </div>

        {/* Detailed Fields */}
        <div className="flex-1 w-full space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Bộ Phận Trực Thuộc</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{currentUser.department}</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <Mail className="w-3.5 h-3.5 text-cyan-600" />
                <span>Email Công Việc</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{currentUser.email}</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số Điện Thoại</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{currentUser.phone}</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                <span>Ngày Gia Nhập Rạp</span>
              </div>
              <div className="text-xs font-bold text-slate-900">{currentUser.joinDate}</div>
            </div>
          </div>

          {/* Performance & Achievements */}
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Đánh Giá Hiệu Suất (KPI Performance):</span>
              </span>
              <span className="text-sm font-black text-amber-700">{currentUser.performanceScore || 90}/100</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${currentUser.performanceScore || 90}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* FACE ID BIOMETRIC ENROLLMENT CARD (MỤC ĐĂNG KÝ GƯƠNG MẶT) */}
      <div className="bg-gradient-to-r from-purple-500/10 via-white to-amber-500/10 border border-purple-200 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">
                  Dữ Liệu Sinh Trắc Học Face ID (Chấm Công Rạp)
                </h3>
                {enrolledFace ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-300">
                    ✓ Đã Được Quản Lý Kích Hoạt
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] border border-amber-300">
                    ⚠️ Chưa Được Quản Lý Kích Hoạt
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xl">
                {currentUser.role === 'staff'
                  ? 'Dữ liệu Face ID được bảo mật chống gian lận điểm danh. Chỉ Quản lý rạp (Manager/HR) mới có quyền chụp và kích hoạt Face ID cho nhân viên.'
                  : 'Dữ liệu khuôn mặt mẫu được dùng để so khớp sinh trắc học khi Check-in / Check-out tại rạp để chống điểm danh hộ.'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            {currentUser.role === 'staff' ? (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>{enrolledFace ? 'Quyền do Quản lý quản lý' : 'Liên hệ Quản lý để kích hoạt'}</span>
              </div>
            ) : !enrolledFace ? (
              <button
                onClick={() => setIsFaceModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                📸 Mở Camera Đăng Ký Gương Mặt Ngay
              </button>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsFaceModalOpen(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Chụp Cập Nhật Lại
                </button>
                <button
                  onClick={handleRemoveFace}
                  className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition cursor-pointer"
                  title="Xóa dữ liệu khuôn mặt này"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Display enrolled face thumbnail if exists */}
        {enrolledFace && (
          <div className="mt-5 pt-4 border-t border-purple-100 flex items-center gap-4 bg-white/80 p-3.5 rounded-2xl border">
            <img
              src={enrolledFace.capturedImage}
              alt="Khuôn mặt đã đăng ký"
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-purple-500 shadow-md"
            />
            <div className="space-y-0.5 text-xs text-slate-600">
              <div className="font-bold text-slate-900">Khuôn mặt mẫu đã được lưu trong hệ thống</div>
              <div className="text-[11px] text-slate-500 font-mono">
                Dữ liệu sinh trắc học Face ID • Lưu ngày: {new Date(enrolledFace.timestamp).toLocaleDateString('vi-VN')}
              </div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {currentUser.role === 'staff'
                  ? 'Đã được Quản lý kích hoạt: Sẵn sàng dùng để tự động quét nhận diện tại trang Điểm Danh'
                  : 'Sẵn sàng sử dụng để Quét Chấm Công tại mục "Điểm Danh & Chấm Công"'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Earned Certificates Summary */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            <span>Chứng Chỉ Đào Tạo Đã Đạt Được ({certs.length})</span>
          </h3>
        </div>

        {certs.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500">
            Chưa có chứng chỉ nào. Hãy làm bài kiểm tra nghiệp vụ hàng tháng để nhận chứng chỉ điện tử!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certs.map(c => (
              <div key={c.certificateCode || c.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-800">{c.courseTitle}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">Mã: {c.certificateCode}</div>
                  <div className="text-[10px] text-slate-400">Cấp ngày: {c.issuedAt}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 px-2.5 py-1 rounded bg-emerald-100 border border-emerald-200">
                    {c.score} Điểm
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL MỞ CAMERA ĐĂNG KÝ GƯƠNG MẶT FACE ID TRỰC TIẾP */}
      {isFaceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Đăng Ký Gương Mặt Face ID</h3>
                  <p className="text-xs text-slate-500">Nhân viên: <strong className="text-slate-900">{currentUser.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => setIsFaceModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Camera Indicator */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-2 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Camera đang dùng: <strong className="text-purple-700">{activeCameraName || 'Camera tích hợp của thiết bị này'}</strong></span>
            </div>

            {/* Camera Viewport */}
            <div className="relative bg-slate-950 rounded-2xl overflow-hidden h-64 flex items-center justify-center border-2 border-slate-800 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100 block"
              />

              {/* Error if camera blocked */}
              {cameraError && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-4 text-center z-20">
                  <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
                  <span className="text-xs text-rose-300 font-semibold mb-2 leading-relaxed max-w-sm">
                    {cameraErrorMessage || 'Không thể truy cập camera!'}
                  </span>
                  <button
                    type="button"
                    onClick={initCamera}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Thử Lại Kết Nối Camera
                  </button>
                </div>
              )}

              {/* Neon oval frame */}
              {!cameraError && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                  <div className="w-44 h-52 rounded-[45%] border-2 border-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.8)]" />
                </div>
              )}

              {/* Instruction tag */}
              {!cameraError && (
                <div className="absolute bottom-2.5 px-3 py-1 bg-slate-900/85 backdrop-blur-md rounded-full text-[11px] font-semibold text-white border border-slate-700/80 z-20">
                  Nhìn thẳng vào khung hình và bấm "Chụp & Lưu Gương Mặt" bên dưới
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => setIsFaceModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition"
              >
                Hủy Bỏ
              </button>

              <button
                type="button"
                onClick={handleCaptureAndSaveFace}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-amber-300" />
                Lưu Dữ Liệu Face ID Vào Hệ Thống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ĐỔI ẢNH ĐẠI DIỆN HỒ SƠ TỰ DO (ĐỘC LẬP VỚI FACE ID) */}
      {isAvatarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Đổi Ảnh Đại Diện Hồ Sơ</h3>
                  <p className="text-xs text-slate-500">Tùy ý đổi ảnh cá nhân (không làm ảnh hưởng dữ liệu Face ID)</p>
                </div>
              </div>
              <button
                onClick={() => setIsAvatarModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current / Preview Avatar */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative">
                <img
                  src={avatarPreview || avatarUrl}
                  alt="Preview avatar"
                  className="w-28 h-28 rounded-3xl object-cover ring-4 ring-amber-500/20 shadow-md"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-2 font-medium">Ảnh đại diện đang áp dụng</span>
            </div>

            {/* Upload Options */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  1. Tải ảnh từ máy tính / điện thoại
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleAvatarFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-600" />
                  Chọn File Ảnh Từ Thiết Bị (JPG, PNG)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  2. Hoặc dán đường dẫn ảnh trực tuyến (Image URL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={customAvatarUrl}
                    onChange={(e) => {
                      setCustomAvatarUrl(e.target.value);
                      if (e.target.value.startsWith('http')) {
                        setAvatarPreview(e.target.value);
                      }
                    }}
                    className="flex-1 px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customAvatarUrl.trim()) {
                        handleSaveAvatar(customAvatarUrl.trim());
                      }
                    }}
                    disabled={!customAvatarUrl.trim()}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition"
                  >
                    Lưu Link
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  3. Hoặc chọn nhanh từ bộ sưu tập ảnh đại diện
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setAvatarPreview(preset);
                        handleSaveAvatar(preset);
                      }}
                      className="group relative rounded-xl overflow-hidden aspect-square border-2 border-transparent hover:border-amber-500 transition cursor-pointer"
                      title="Chọn ảnh này"
                    >
                      <img src={preset} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 text-xs font-semibold rounded-xl transition"
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
