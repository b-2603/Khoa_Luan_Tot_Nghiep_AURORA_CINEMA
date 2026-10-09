import React, { useState } from 'react';
import { User } from '../types';
import { loginUserApi } from '../services/authApi';
import { Lock, AlertCircle, CheckCircle2, ArrowRight, Building2, Smartphone, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Login State: Bắt buộc người dùng nhập thông tin để đăng nhập
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Submit Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginUserApi({
        identifier: identifier.trim(),
        password: password.trim()
      });

      if (res.success && res.user) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 300);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('Đã có lỗi xảy ra khi xác thực tài khoản. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-100 via-indigo-50/70 to-amber-50/60 flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none">
      
      {/* ========================================================================= */}
      {/* HỆ THỐNG HOA VĂN, HỌA TIẾT ĐIỆN ẢNH NỔI BẬT NỀN SÁNG (LIGHT CINEMA THEME) */}
      {/* ========================================================================= */}

      {/* 1. Ánh sáng phát quang Aurora mềm mại trên nền sáng */}
      <div className="absolute -top-36 -left-36 w-[650px] h-[650px] bg-gradient-to-br from-indigo-300/40 via-purple-300/30 to-transparent blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-[700px] h-[700px] bg-gradient-to-tl from-amber-300/45 via-rose-300/30 to-transparent blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-cyan-200/40 blur-[150px] rounded-full pointer-events-none" />

      {/* 2. Hoa văn lưới hình học điện ảnh sắc nét rõ ràng trên nền sáng (Geometric Cinema Grid) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cinema-diamond-light-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 48 24 L 24 48 L 0 24 Z" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1" />
            <circle cx="24" cy="24" r="1.8" fill="rgba(245, 158, 11, 0.65)" />
            <circle cx="0" cy="0" r="1.2" fill="rgba(99, 102, 241, 0.45)" />
            <circle cx="48" cy="0" r="1.2" fill="rgba(99, 102, 241, 0.45)" />
            <circle cx="0" cy="48" r="1.2" fill="rgba(99, 102, 241, 0.45)" />
            <circle cx="48" cy="48" r="1.2" fill="rgba(99, 102, 241, 0.45)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cinema-diamond-light-pattern)" />
      </svg>

      {/* 3. Họa tiết dải cuộn phim 35mm uốn lượn nghệ thuật góc trên bên trái (Cinema 35mm Film Ribbon) */}
      <svg className="absolute -top-10 -left-10 w-[550px] h-[400px] pointer-events-none opacity-75" viewBox="0 0 550 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="filmGradLeftLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        {/* Đường viền cuộn phim ngoài */}
        <path d="M-20 60 C 140 40, 260 180, 420 120 C 490 90, 530 140, 560 170" stroke="url(#filmGradLeftLight)" strokeWidth="36" strokeLinecap="round" />
        {/* Lòng băng phim màu sáng tương phản */}
        <path d="M-20 60 C 140 40, 260 180, 420 120 C 490 90, 530 140, 560 170" stroke="#f8fafc" strokeWidth="22" strokeLinecap="round" />
        {/* Răng cưa lỗ phim (Perforations) */}
        <path d="M-15 47 C 145 27, 265 167, 425 107 C 495 77, 535 127, 565 157" stroke="#4f46e5" strokeWidth="3" strokeDasharray="5 7" />
        <path d="M-25 73 C 135 53, 255 193, 415 133 C 485 103, 525 153, 555 183" stroke="#4f46e5" strokeWidth="3" strokeDasharray="5 7" />
      </svg>

      {/* 4. Họa tiết dải cuộn phim uốn lượn nghệ thuật góc dưới bên phải */}
      <svg className="absolute -bottom-16 -right-16 w-[600px] h-[450px] pointer-events-none opacity-75" viewBox="0 0 600 450" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="filmGradRightLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#a855f7" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M30 380 C 180 340, 320 460, 480 350 C 540 310, 580 340, 620 370" stroke="url(#filmGradRightLight)" strokeWidth="40" strokeLinecap="round" />
        <path d="M30 380 C 180 340, 320 460, 480 350 C 540 310, 580 340, 620 370" stroke="#f8fafc" strokeWidth="26" strokeLinecap="round" />
        <path d="M35 365 C 185 325, 325 445, 485 335 C 545 295, 585 325, 625 355" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5 7" />
        <path d="M25 395 C 175 355, 315 475, 475 365 C 535 325, 575 355, 615 385" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5 7" />
      </svg>

      {/* 5. Hoa văn bánh xe cuộn phim cổ điển góc trái bên dưới (Film Reel Wheels) */}
      <div className="absolute -bottom-24 -left-24 pointer-events-none opacity-35">
        <svg width="380" height="380" viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-indigo-400">
          <circle cx="100" cy="100" r="90" strokeWidth="3" strokeDasharray="8 4" />
          <circle cx="100" cy="100" r="75" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="28" strokeWidth="3" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          <line x1="100" y1="10" x2="100" y2="190" strokeWidth="2" />
          <line x1="10" y1="100" x2="190" y2="100" strokeWidth="2" />
          <line x1="36" y1="36" x2="164" y2="164" strokeWidth="2" />
          <line x1="36" y1="164" x2="164" y2="36" strokeWidth="2" />
          <circle cx="65" cy="65" r="14" fill="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" />
          <circle cx="135" cy="65" r="14" fill="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" />
          <circle cx="65" cy="135" r="14" fill="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" />
          <circle cx="135" cy="135" r="14" fill="rgba(99, 102, 241, 0.12)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 6. Hoa văn bánh xe cuộn phim góc phải bên trên */}
      <div className="absolute -top-20 -right-20 pointer-events-none opacity-35">
        <svg width="360" height="360" viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-amber-500">
          <circle cx="100" cy="100" r="90" strokeWidth="3" strokeDasharray="6 4" />
          <circle cx="100" cy="100" r="75" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="28" strokeWidth="3" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          <line x1="100" y1="10" x2="100" y2="190" strokeWidth="2" />
          <line x1="10" y1="100" x2="190" y2="100" strokeWidth="2" />
          <line x1="36" y1="36" x2="164" y2="164" strokeWidth="2" />
          <line x1="36" y1="164" x2="164" y2="36" strokeWidth="2" />
          <circle cx="65" cy="65" r="14" fill="rgba(245, 158, 11, 0.12)" strokeWidth="1.5" />
          <circle cx="135" cy="65" r="14" fill="rgba(245, 158, 11, 0.12)" strokeWidth="1.5" />
          <circle cx="65" cy="135" r="14" fill="rgba(245, 158, 11, 0.12)" strokeWidth="1.5" />
          <circle cx="135" cy="135" r="14" fill="rgba(245, 158, 11, 0.12)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 7. Đường sóng ánh sáng lượn nghệ thuật Guilloche (Cinema Waves) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0 300 Q 300 150 600 320 T 1200 280 T 1800 350" fill="none" stroke="rgba(245, 158, 11, 0.8)" strokeWidth="2" />
        <path d="M 0 320 Q 320 170 620 340 T 1220 300 T 1820 370" fill="none" stroke="rgba(168, 85, 247, 0.75)" strokeWidth="1.5" />
        <path d="M 0 340 Q 340 190 640 360 T 1240 320 T 1840 390" fill="none" stroke="rgba(99, 102, 241, 0.75)" strokeWidth="1" />
      </svg>

      {/* ========================================================================= */}
      {/* 8. KHUNG ĐĂNG NHẬP CHÍNH (MAIN LUXURY CARD) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-[0_25px_70px_-15px_rgba(99,102,241,0.2),0_15px_30px_-10px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row min-h-[560px]">
        
        {/* Cột Trái: Nhận diện Thương hiệu & Họa tiết Cuộn phim nghệ thuật */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-700 via-purple-700 to-amber-600 p-8 sm:p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          
          {/* Lớp hoa văn hạt ánh sáng chìm bên trong cột trái */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1.2px, transparent 1.2px)',
              backgroundSize: '20px 20px'
            }}
          />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-400/30 rounded-full blur-3xl pointer-events-none" />

          {/* Nội dung trên cột trái: Chỉ giữ thương hiệu sang trọng, KHÔNG có hộp chú thích */}
          <div className="relative z-10 space-y-6">
            {/* Logo Aurora Cinema */}
            <div className="bg-white/95 p-3.5 rounded-2xl shadow-xl inline-flex items-center">
              <img
                src="/aurora-logo.svg"
                alt="Aurora Cinema"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/25 border border-amber-300/40 text-amber-200 text-[11px] font-bold tracking-wider uppercase mb-3">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>HỆ THỐNG NỘI BỘ</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
                AURORA CINEMA EMS
              </h2>
              <p className="text-xs text-indigo-100 mt-3 leading-relaxed font-medium">
                Hệ thống quản lý điều hành nhân sự, chấm công Face ID và kiểm soát nghiệp vụ vận hành rạp chiếu phim.
              </p>
            </div>

            {/* Họa tiết minh họa đồ họa điện ảnh nghệ thuật (thay thế hoàn toàn các hộp chú thích chữ) */}
            <div className="pt-6 flex flex-col items-center justify-center opacity-90">
              <svg className="w-44 h-32 text-white/90" viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cuộn phim nghệ thuật */}
                <rect x="15" y="15" width="130" height="80" rx="16" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.45)" strokeWidth="2" />
                <circle cx="55" cy="55" r="22" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="55" cy="55" r="6" fill="#f59e0b" />
                <circle cx="105" cy="55" r="22" stroke="rgba(255,255,255,0.85)" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="105" cy="55" r="6" fill="#f59e0b" />
                <path d="M 55 33 Q 80 45 105 33" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                <path d="M 55 77 Q 80 65 105 77" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
                {/* Perforations */}
                <rect x="25" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="40" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="55" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="70" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="85" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="100" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="115" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
                <rect x="127" y="20" width="8" height="5" rx="1.5" fill="rgba(255,255,255,0.65)" />
              </svg>
            </div>
          </div>

          {/* Phần chân cột trái */}
          <div className="relative z-10 text-[11px] text-white/70 pt-6 border-t border-white/20 flex items-center justify-between">
            <span>© 2026 AURORA CINEMAS</span>
            <span className="font-mono text-[10px] text-amber-200">INTERNAL v2.6</span>
          </div>
        </div>

        {/* Cột Phải: Form Đăng Nhập Chuẩn Mực */}
        <div className="md:w-7/12 p-8 sm:p-10 lg:p-14 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Tiêu đề cổng đăng nhập */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-extrabold uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>CỔNG ĐĂNG NHẬP NỘI BỘ</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Đăng Nhập
              </h3>
            </div>

            {/* Thông báo lỗi / thành công */}
            {errorMsg && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2.5 font-bold animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Biểu mẫu đăng nhập */}
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              
              {/* Input 1: Mã Nhân Viên (Số Điện Thoại) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  <span>Mã Nhân Viên (Số Điện Thoại)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nhập số điện thoại của bạn"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 rounded-2xl text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Input 2: Mật Khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-indigo-600" />
                  <span>Mật Khẩu</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-4 pr-11 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Nút Đăng Nhập Chính */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-600 active:from-indigo-700 active:to-indigo-800 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Đang xác thực thông tin...' : 'Đăng Nhập EMS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>


          </div>
        </div>
      </div>
    </div>
  );
};
