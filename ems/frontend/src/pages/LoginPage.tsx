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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-100 via-amber-50/20 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-10 select-none">
      
      {/* ========================================================================= */}
      {/* HỆ THỐNG HOA VĂN, HỌA TIẾT ĐIỆN ẢNH CHUẨN TONE MÀU AURORA CINEMA */}
      {/* ========================================================================= */}

      {/* 1. Ánh sáng phát quang Aurora mềm mại trên nền sáng */}
      <div className="absolute -top-36 -left-36 w-[650px] h-[650px] bg-gradient-to-br from-[#0d1b2e]/12 via-[#162740]/8 to-transparent blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-36 -right-36 w-[700px] h-[700px] bg-gradient-to-tl from-[#f4c04a]/25 via-amber-200/15 to-transparent blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-[#f4c04a]/10 blur-[150px] rounded-full pointer-events-none" />

      {/* 2. Hoa văn lưới hình học điện ảnh sắc nét rõ ràng trên nền sáng (Geometric Cinema Grid) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="cinema-diamond-light-pattern" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 48 24 L 24 48 L 0 24 Z" fill="none" stroke="rgba(13, 27, 46, 0.15)" strokeWidth="1" />
            <circle cx="24" cy="24" r="1.8" fill="#f4c04a" />
            <circle cx="0" cy="0" r="1.2" fill="rgba(13, 27, 46, 0.3)" />
            <circle cx="48" cy="0" r="1.2" fill="rgba(13, 27, 46, 0.3)" />
            <circle cx="0" cy="48" r="1.2" fill="rgba(13, 27, 46, 0.3)" />
            <circle cx="48" cy="48" r="1.2" fill="rgba(13, 27, 46, 0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#cinema-diamond-light-pattern)" />
      </svg>

      {/* 3. Họa tiết dải cuộn phim 35mm uốn lượn nghệ thuật góc trên bên trái (Cinema 35mm Film Ribbon) */}
      <svg className="absolute -top-10 -left-10 w-[550px] h-[400px] pointer-events-none opacity-80" viewBox="0 0 550 400" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="filmGradLeftLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0d1b2e" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#1a3152" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#f4c04a" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        {/* Đường viền cuộn phim ngoài */}
        <path d="M-20 60 C 140 40, 260 180, 420 120 C 490 90, 530 140, 560 170" stroke="url(#filmGradLeftLight)" strokeWidth="36" strokeLinecap="round" />
        {/* Lòng băng phim màu sáng tương phản */}
        <path d="M-20 60 C 140 40, 260 180, 420 120 C 490 90, 530 140, 560 170" stroke="#f8fafc" strokeWidth="22" strokeLinecap="round" />
        {/* Răng cưa lỗ phim (Perforations) */}
        <path d="M-15 47 C 145 27, 265 167, 425 107 C 495 77, 535 127, 565 157" stroke="#0d1b2e" strokeWidth="3" strokeDasharray="5 7" />
        <path d="M-25 73 C 135 53, 255 193, 415 133 C 485 103, 525 153, 555 183" stroke="#0d1b2e" strokeWidth="3" strokeDasharray="5 7" />
      </svg>

      {/* 4. Họa tiết dải cuộn phim uốn lượn nghệ thuật góc dưới bên phải */}
      <svg className="absolute -bottom-16 -right-16 w-[600px] h-[450px] pointer-events-none opacity-80" viewBox="0 0 600 450" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="filmGradRightLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f4c04a" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#1a3152" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0d1b2e" stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <path d="M30 380 C 180 340, 320 460, 480 350 C 540 310, 580 340, 620 370" stroke="url(#filmGradRightLight)" strokeWidth="40" strokeLinecap="round" />
        <path d="M30 380 C 180 340, 320 460, 480 350 C 540 310, 580 340, 620 370" stroke="#f8fafc" strokeWidth="26" strokeLinecap="round" />
        <path d="M35 365 C 185 325, 325 445, 485 335 C 545 295, 585 325, 625 355" stroke="#f4c04a" strokeWidth="3" strokeDasharray="5 7" />
        <path d="M25 395 C 175 355, 315 475, 475 365 C 535 325, 575 355, 615 385" stroke="#f4c04a" strokeWidth="3" strokeDasharray="5 7" />
      </svg>

      {/* 5. Hoa văn bánh xe cuộn phim cổ điển góc trái bên dưới (Film Reel Wheels) */}
      <div className="absolute -bottom-24 -left-24 pointer-events-none opacity-25">
        <svg width="380" height="380" viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-[#0d1b2e]">
          <circle cx="100" cy="100" r="90" strokeWidth="3" strokeDasharray="8 4" />
          <circle cx="100" cy="100" r="75" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="28" strokeWidth="3" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          <line x1="100" y1="10" x2="100" y2="190" strokeWidth="2" />
          <line x1="10" y1="100" x2="190" y2="100" strokeWidth="2" />
          <line x1="36" y1="36" x2="164" y2="164" strokeWidth="2" />
          <line x1="36" y1="164" x2="164" y2="36" strokeWidth="2" />
          <circle cx="65" cy="65" r="14" fill="rgba(13, 27, 46, 0.08)" strokeWidth="1.5" />
          <circle cx="135" cy="65" r="14" fill="rgba(13, 27, 46, 0.08)" strokeWidth="1.5" />
          <circle cx="65" cy="135" r="14" fill="rgba(13, 27, 46, 0.08)" strokeWidth="1.5" />
          <circle cx="135" cy="135" r="14" fill="rgba(13, 27, 46, 0.08)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 6. Hoa văn bánh xe cuộn phim góc phải bên trên */}
      <div className="absolute -top-20 -right-20 pointer-events-none opacity-30">
        <svg width="360" height="360" viewBox="0 0 200 200" fill="none" stroke="currentColor" className="text-[#f4c04a]">
          <circle cx="100" cy="100" r="90" strokeWidth="3" strokeDasharray="6 4" />
          <circle cx="100" cy="100" r="75" strokeWidth="1.5" />
          <circle cx="100" cy="100" r="28" strokeWidth="3" />
          <circle cx="100" cy="100" r="10" fill="currentColor" />
          <line x1="100" y1="10" x2="100" y2="190" strokeWidth="2" />
          <line x1="10" y1="100" x2="190" y2="100" strokeWidth="2" />
          <line x1="36" y1="36" x2="164" y2="164" strokeWidth="2" />
          <line x1="36" y1="164" x2="164" y2="36" strokeWidth="2" />
          <circle cx="65" cy="65" r="14" fill="rgba(244, 192, 74, 0.15)" strokeWidth="1.5" />
          <circle cx="135" cy="65" r="14" fill="rgba(244, 192, 74, 0.15)" strokeWidth="1.5" />
          <circle cx="65" cy="135" r="14" fill="rgba(244, 192, 74, 0.15)" strokeWidth="1.5" />
          <circle cx="135" cy="135" r="14" fill="rgba(244, 192, 74, 0.15)" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 7. Đường sóng ánh sáng lượn nghệ thuật Guilloche (Cinema Waves) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" xmlns="http://www.w3.org/2000/svg">
        <path d="M 0 300 Q 300 150 600 320 T 1200 280 T 1800 350" fill="none" stroke="#f4c04a" strokeWidth="2" />
        <path d="M 0 320 Q 320 170 620 340 T 1220 300 T 1820 370" fill="none" stroke="#162740" strokeWidth="1.5" />
        <path d="M 0 340 Q 340 190 640 360 T 1240 320 T 1840 390" fill="none" stroke="#0d1b2e" strokeWidth="1" />
      </svg>

      {/* ========================================================================= */}
      {/* 8. KHUNG ĐĂNG NHẬP CHÍNH (MAIN LUXURY CARD) */}
      {/* ========================================================================= */}
      <div className="relative z-10 w-full max-w-4xl lg:max-w-5xl bg-white/95 backdrop-blur-2xl border border-white/80 rounded-[32px] shadow-[0_25px_70px_-15px_rgba(13,27,46,0.18),0_15px_30px_-10px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col md:flex-row min-h-[560px]">
        
        {/* Cột Trái: Nhận diện Thương hiệu Tông Màu Chủ Đạo Rạp (#0d1b2e & #f4c04a) */}
        <div className="md:w-5/12 bg-gradient-to-br from-[#0d1b2e] via-[#14263f] to-[#0a1524] p-8 sm:p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden border-r border-[#f4c04a]/20">
          
          {/* Lớp hoa văn hạt ánh sáng chìm bên trong cột trái */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-25"
            style={{
              backgroundImage: 'radial-gradient(rgba(244, 192, 74, 0.45) 1.2px, transparent 1.2px)',
              backgroundSize: '22px 22px'
            }}
          />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-[#f4c04a]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[#f4c04a]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Nội dung trên cột trái: Chỉ giữ thương hiệu sang trọng */}
          <div className="relative z-10 space-y-6">
            {/* Logo Aurora Cinema */}
            <div className="bg-white/95 p-3.5 rounded-2xl shadow-xl inline-flex items-center border border-[#f4c04a]/50">
              <img
                src="/aurora-logo.svg"
                alt="Aurora Cinema"
                className="h-9 w-auto object-contain"
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4c04a]/20 border border-[#f4c04a]/50 text-[#f4c04a] text-[11px] font-black tracking-wider uppercase mb-3 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#f4c04a] animate-pulse"></span>
                <span>HỆ THỐNG NỘI BỘ</span>
              </div>
              <h2 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
                AURORA CINEMA <span className="text-[#f4c04a]">EMS</span>
              </h2>
              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-medium">
                Hệ thống quản lý điều hành nhân sự, chấm công Face ID và kiểm soát nghiệp vụ vận hành rạp chiếu phim.
              </p>
            </div>

            {/* Họa tiết minh họa đồ họa điện ảnh nghệ thuật */}
            <div className="pt-6 flex flex-col items-center justify-center opacity-95">
              <svg className="w-44 h-32" viewBox="0 0 160 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Cuộn phim nghệ thuật tông màu chủ đạo */}
                <rect x="15" y="15" width="130" height="80" rx="16" fill="rgba(13,27,46,0.65)" stroke="#f4c04a" strokeWidth="2" />
                <circle cx="55" cy="55" r="22" stroke="rgba(244, 192, 74, 0.7)" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="55" cy="55" r="7" fill="#f4c04a" />
                <circle cx="105" cy="55" r="22" stroke="rgba(244, 192, 74, 0.7)" strokeWidth="3" strokeDasharray="4 3" />
                <circle cx="105" cy="55" r="7" fill="#f4c04a" />
                <path d="M 55 33 Q 80 45 105 33" stroke="#f4c04a" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M 55 77 Q 80 65 105 77" stroke="#f4c04a" strokeWidth="2" strokeDasharray="3 3" />
                {/* Perforations */}
                <rect x="25" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="40" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="55" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="70" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="85" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="100" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="115" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
                <rect x="127" y="20" width="8" height="5" rx="1.5" fill="#f4c04a" fillOpacity="0.85" />
              </svg>
            </div>
          </div>

          {/* Phần chân cột trái */}
          <div className="relative z-10 text-[11px] text-slate-300 pt-6 border-t border-white/15 flex items-center justify-between">
            <span>© 2026 AURORA CINEMAS</span>
            <span className="font-mono text-[10px] text-[#f4c04a] font-bold">INTERNAL v2.6</span>
          </div>
        </div>

        {/* Cột Phải: Form Đăng Nhập Chuẩn Mực */}
        <div className="md:w-7/12 p-8 sm:p-10 lg:p-14 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-6">
            
            {/* Tiêu đề cổng đăng nhập */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#0d1b2e]/5 text-[#0d1b2e] border border-[#f4c04a]/40 text-xs font-black uppercase tracking-wider mb-2">
                <Building2 className="w-4 h-4 text-[#f4c04a]" />
                <span>CỔNG ĐĂNG NHẬP NỘI BỘ</span>
              </div>
              <h3 className="text-2xl font-black text-[#0d1b2e] tracking-tight">
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
                  <Smartphone className="w-4 h-4 text-[#0d1b2e]" />
                  <span>Mã Nhân Viên (Số Điện Thoại)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Nhập số điện thoại của bạn"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-12 px-4 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#f4c04a] focus:bg-white focus:ring-4 focus:ring-[#f4c04a]/15 rounded-2xl text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Input 2: Mật Khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#0d1b2e]" />
                  <span>Mật Khẩu</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 pl-4 pr-11 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-[#f4c04a] focus:bg-white focus:ring-4 focus:ring-[#f4c04a]/15 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none transition shadow-2xs"
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
                  className="w-full h-12 bg-[#0d1b2e] hover:bg-[#14233a] border border-[#f4c04a]/60 hover:border-[#f4c04a] active:bg-[#091320] disabled:opacity-50 text-[#f4c04a] font-black text-sm rounded-2xl shadow-lg shadow-[#0d1b2e]/30 hover:shadow-[#f4c04a]/20 hover:-translate-y-0.5 active:translate-y-0 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Đang xác thực thông tin...' : 'Đăng Nhập EMS'}</span>
                  <ArrowRight className="w-4 h-4 text-[#f4c04a]" />
                </button>
              </div>
            </form>

            {/* Quick Demo Login Chips */}
            <div className="mt-5 pt-4 border-t border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-600">⚡ Chọn nhanh tài khoản trải nghiệm:</span>
                <span className="text-[10px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full font-bold">MK: 8888</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('0988888888');
                    setPassword('8888');
                  }}
                  className="p-2.5 text-left bg-slate-50 hover:bg-[#0d1b2e] hover:text-white border border-slate-200 hover:border-[#f4c04a] rounded-xl text-xs transition group cursor-pointer shadow-2xs"
                >
                  <div className="font-extrabold flex items-center justify-between text-slate-800 group-hover:text-white">
                    <span>Quản Lý</span>
                    <span className="text-[10px] text-[#f4c04a] font-black">★ Manager</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300 mt-0.5">0988888888</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIdentifier('0901234567');
                    setPassword('8888');
                  }}
                  className="p-2.5 text-left bg-slate-50 hover:bg-[#0d1b2e] hover:text-white border border-slate-200 hover:border-[#f4c04a] rounded-xl text-xs transition group cursor-pointer shadow-2xs"
                >
                  <div className="font-extrabold flex items-center justify-between text-slate-800 group-hover:text-white">
                    <span>Nhân Viên</span>
                    <span className="text-[10px] text-indigo-600 group-hover:text-[#f4c04a] font-black">Staff</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 group-hover:text-slate-300 mt-0.5">0901234567</div>
                </button>
              </div>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
};
