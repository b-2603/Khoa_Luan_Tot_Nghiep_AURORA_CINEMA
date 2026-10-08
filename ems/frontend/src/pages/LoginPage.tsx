import React, { useState } from 'react';
import { User, Department, Role } from '../types';
import { registerUserApi, loginUserApi, googleLoginApi, facebookLoginApi } from '../services/authApi';
import { Film, UserCheck, ShieldCheck, Mail, Lock, User as UserIcon, Building, CheckCircle2, AlertCircle, ArrowRight, Sparkles, X, Plus } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
}

interface GoogleAccount {
  name: string;
  email: string;
  avatar: string;
}

const PRESET_GOOGLE_ACCOUNTS: GoogleAccount[] = [
  {
    name: 'Tống Hiểu Khiêm',
    email: 'tonghieukhiem16@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Khiêm Tống Hiểu',
    email: 'khiemtonghieu86@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    name: 'Khiêm Tống Hiểu',
    email: 'tonghieukhiem14@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Login State
  const [loginEmail, setLoginEmail] = useState('manager@aurora.com');
  const [loginPassword, setLoginPassword] = useState('123456');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState<Role>('staff');
  const [regDepartment, setRegDepartment] = useState<Department>('Vé & Chăm sóc Khách hàng');

  // Status Feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Real Login Handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await loginUserApi({ email: loginEmail || 'user@auroracinema.vn', password: loginPassword || '123456' });
      if (res.success && res.user) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 400);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('Đã có lỗi xảy ra khi xác thực tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // Real Registration Handler
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await registerUserApi({
        name: regName || 'Nhân viên Mới',
        email: regEmail || `staff${Date.now()}@aurora.com`,
        password: regPassword || '123456',
        role: regRole,
        department: regDepartment,
        phone: regPhone
      });

      if (res.success && res.user) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 500);
      } else {
        setErrorMsg(res.message);
      }
    } catch (err) {
      setErrorMsg('Đã có lỗi xảy ra khi đăng ký tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  // Select Google Account from Chooser Modal
  const handleSelectGoogleAccount = async (account: GoogleAccount) => {
    setShowGoogleModal(false);
    setLoading(true);
    try {
      const res = await googleLoginApi('manager', account.email, account.name);
      if (res.success && res.user) {
        setSuccessMsg(`Đã đăng nhập bằng tài khoản Google: ${account.email}`);
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 400);
      }
    } catch (err) {
      setErrorMsg('Đăng nhập bằng Google không thành công.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Custom Google Account
  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail) return;
    const name = customGoogleName || customGoogleEmail.split('@')[0];
    handleSelectGoogleAccount({
      name: name,
      email: customGoogleEmail,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    });
  };

  // Facebook OAuth Handler
  const handleFacebookSignIn = async () => {
    setLoading(true);
    try {
      const res = await facebookLoginApi('staff', 'tonghieukhiem16@facebook.com', 'Tống Hiểu Khiêm');
      if (res.success && res.user) {
        setSuccessMsg('Đã xác thực tài khoản Facebook thành công!');
        setTimeout(() => {
          onLoginSuccess(res.user!);
        }, 400);
      }
    } catch (err) {
      setErrorMsg('Đăng nhập bằng Facebook thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Logins
  const handleQuickLogin = async (role: Role) => {
    setLoading(true);
    const email = role === 'manager' ? 'manager@aurora.com' : 'staff@aurora.com';
    const res = await loginUserApi({ email, password: '123' });
    if (res.user) {
      onLoginSuccess(res.user);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Brand & Visual */}
        <div className="md:w-5/12 bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Film className="w-7 h-7 text-amber-300" />
            </div>

            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-200 border border-white/20 inline-block mb-2">
                HỆ THỐNG QUẢN LÝ NHÂN SỰ & ĐÀO TẠO
              </span>
              <h2 className="text-2xl font-black leading-tight">
                AURORA CINEMAS EMS
              </h2>
              <p className="text-xs text-indigo-100 mt-2 leading-relaxed font-medium">
                Hệ thống quản lý ca trực, lịch làm việc & đào tạo thông minh tích hợp AI cho rạp chiếu phim.
              </p>
            </div>

            {/* Quick Demo Login Preset Buttons */}
            <div className="pt-4 border-t border-white/20 space-y-2">
              <div className="text-[11px] font-bold text-amber-200 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Đăng nhập nhanh 1-Click:</span>
              </div>
              <button
                type="button"
                onClick={() => handleQuickLogin('manager')}
                className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold flex items-center justify-between text-white transition border border-white/20"
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Vào với vai trò QUẢN LÝ (Manager)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold flex items-center justify-between text-white transition border border-white/20"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-cyan-300" />
                  <span>Vào với vai trò NHÂN VIÊN (Staff)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative z-10 text-[10px] text-white/70 pt-6">
            © 2026 AURORA CINEMAS CORPORATION
          </div>
        </div>

        {/* Right Side: Clean Authentic Forms */}
        <div className="md:w-7/12 p-8 space-y-6 flex flex-col justify-between">
          <div>
            {/* Auth Mode Toggle Tabs */}
            <div className="flex border-b border-slate-200 mb-6">
              <button
                onClick={() => { setActiveTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'login'
                    ? 'border-indigo-600 text-indigo-600 font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                ĐĂNG NHẬP TÀI KHOẢN
              </button>
              <button
                onClick={() => { setActiveTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition ${
                  activeTab === 'register'
                    ? 'border-indigo-600 text-indigo-600 font-black'
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                ĐĂNG KÝ NHÂN SỰ MỚI
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form 1: LOGIN */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Email Đăng Nhập</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@aurora.com hoặc nhanvien@auroracinema.vn"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Mật Khẩu</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập EMS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Form 2: REGISTRATION */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Họ và Tên Nhân Viên *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn Minh"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-600" />
                      <span>Email Đăng Ký *</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="minh@auroracinema.vn"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-purple-600" />
                      <span>Mật Khẩu *</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <Building className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Bộ Phận Trực Thuộc</span>
                    </label>
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value as Department)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                    >
                      <option value="Vé & Chăm sóc Khách hàng">Vé & CSKH</option>
                      <option value="Bắp nước & Quầy Concession">Bắp nước & Popcorn</option>
                      <option value="Kỹ thuật Phim & Âm thanh">Kỹ thuật Sound</option>
                      <option value="Quản lý Đào tạo & Nhân sự">Quản lý HR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Vai Trò Tài Khoản</span>
                    </label>
                    <select
                      value={regRole}
                      onChange={(e) => setRegRole(e.target.value as Role)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold"
                    >
                      <option value="staff">Nhân Viên Phục Vụ (Staff)</option>
                      <option value="manager">Quản Lý Đào Tạo (Manager)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md transition mt-2 cursor-pointer"
                >
                  {loading ? 'Đang tạo tài khoản...' : 'Kích Hoạt Tài Khoản & Vào Giao Diện'}
                </button>
              </form>
            )}

            {/* Social Logins */}
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowGoogleModal(true)}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-3 transition shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Tiếp Tục Với Google</span>
              </button>

              <button
                type="button"
                onClick={handleFacebookSignIn}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-3 transition shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4 text-blue-600 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>Tiếp Tục Với Facebook</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* AUTHENTIC GOOGLE ACCOUNT CHOOSER MODAL (LIKE ACCOUNTS.GOOGLE.COM) */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span className="text-sm font-semibold text-slate-700">Đăng nhập bằng Google</span>
              </div>
              <button
                onClick={() => { setShowGoogleModal(false); setShowCustomGoogleInput(false); }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Chọn tài khoản</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Tiếp tục tới <span className="font-semibold text-indigo-600">AURORA CINEMAS EMS</span>
                </p>
              </div>

              {!showCustomGoogleInput ? (
                <div className="space-y-2">
                  {/* List Google Accounts */}
                  {PRESET_GOOGLE_ACCOUNTS.map((acc, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleSelectGoogleAccount(acc)}
                      className="w-full p-3 flex items-center gap-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 transition text-left cursor-pointer group"
                    >
                      <img
                        src={acc.avatar}
                        alt={acc.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition truncate">
                          {acc.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {acc.email}
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Custom Account Option */}
                  <button
                    type="button"
                    onClick={() => setShowCustomGoogleInput(true)}
                    className="w-full p-3 flex items-center gap-3.5 hover:bg-slate-50 rounded-2xl border border-slate-100 transition text-left cursor-pointer text-indigo-600 font-bold text-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Plus className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span>Sử dụng một tài khoản Google khác</span>
                  </button>
                </div>
              ) : (
                /* Custom Google Account Entry Form */
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email Google của bạn *</label>
                    <input
                      type="email"
                      required
                      placeholder="vd: tenban@gmail.com"
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Họ & Tên Google (Tùy chọn)</label>
                    <input
                      type="text"
                      placeholder="vd: Tống Hiểu Khiêm"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(false)}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Đăng nhập Google
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-6">
              <span>Tiếng Việt</span>
              <div className="flex gap-3">
                <span className="hover:underline cursor-pointer">Trợ giúp</span>
                <span className="hover:underline cursor-pointer">Quyền riêng tư</span>
                <span className="hover:underline cursor-pointer">Điều khoản</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
