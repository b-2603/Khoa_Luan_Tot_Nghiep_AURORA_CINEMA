import React, { useState } from 'react';
import { User, Department, Role } from '../types';
import { getUsers, addUser, setCurrentUser } from '../services/storage';
import { X, UserPlus, LogIn, Mail, Lock, User as UserIcon, Phone, Building, CheckCircle2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>('Vé & Chăm sóc Khách hàng');
  const [role, setRole] = useState<Role>('staff');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const users = getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setCurrentUser(found);
      onLoginSuccess(found);
      onClose();
    } else {
      setErrorMsg('Email hoặc mật khẩu không chính xác. Bạn có thể sử dụng nút Đăng Ký hoặc Đăng nhập nhanh bên dưới.');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name || !email) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ tên và Email.');
      return;
    }

    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setErrorMsg('Email này đã được đăng ký tài khoản trên hệ thống EMS.');
      return;
    }

    const staffCode = `AR-${role === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(100 + Math.random() * 900)}`;
    const created = addUser({
      staffCode,
      name,
      email,
      role,
      department,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: phone || '0901234567',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 90
    });

    setCurrentUser(created);
    setSuccessMsg(`Đăng ký tài khoản thành công! Mã nhân sự: ${staffCode}`);
    setTimeout(() => {
      onLoginSuccess(created);
      onClose();
    }, 1200);
  };

  const handleGoogleLogin = () => {
    const googleUser = users.find(u => u.email.includes('minh')) || users[0];
    const created: User = {
      id: `usr-google-${Date.now()}`,
      staffCode: `AR-STAFF-${Math.floor(200 + Math.random() * 800)}`,
      name: 'Nguyễn Văn Minh (Google Account)',
      email: 'minh.nguyen.google@auroracinema.vn',
      role: 'staff',
      department: 'Vé & Chăm sóc Khách hàng',
      avatar: 'https://lh3.googleusercontent.com/a/ACg8ocI8yX...',
      phone: '0908888888',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 95
    };

    addUser(created);
    setCurrentUser(created);
    onLoginSuccess(created);
    onClose();
  };

  const handleFacebookLogin = () => {
    const fbUser: User = {
      id: `usr-fb-${Date.now()}`,
      staffCode: `AR-STAFF-${Math.floor(300 + Math.random() * 700)}`,
      name: 'Trần Thu Hà (Facebook Account)',
      email: 'ha.tran.fb@auroracinema.vn',
      role: 'staff',
      department: 'Bắp nước & Quầy Concession',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      phone: '0919999999',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 92
    };

    addUser(fbUser);
    setCurrentUser(fbUser);
    onLoginSuccess(fbUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-purple-600 p-0.5 shadow-lg shadow-amber-500/20 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <h3 className="font-extrabold text-xl text-slate-900 dark:text-white">
            {isRegisterMode ? 'Đăng Ký Tài Khoản EMS' : 'Đăng Nhập Hệ Thống EMS'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hệ thống QL Nhân sự & Đào tạo AURORA CINEMAS
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Social Authentication Buttons */}
        <div className="space-y-2.5 mb-6">
          <button
            onClick={handleGoogleLogin}
            className="w-full py-2.5 px-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-3 transition shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>Tiếp Tục Với Tài Khoản Google</span>
          </button>

          <button
            onClick={handleFacebookLogin}
            className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166FE5] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-3 transition shadow-sm"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            <span>Đăng Nhập Bằng Facebook</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-semibold text-slate-400">hoặc bằng Email</span>
          <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
        </div>

        {/* Email Auth Form */}
        <form onSubmit={isRegisterMode ? handleRegister : handleLogin} className="space-y-3.5">
          {isRegisterMode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Họ và Tên Nhân Viên *
              </label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Trần Hoàng An"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Email Đăng Nhập *
            </label>
            <input
              type="email"
              required
              placeholder="nhanvien@auroracinema.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Mật Khẩu *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {isRegisterMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Bộ Phận</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value as Department)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-900 dark:text-white"
                >
                  <option value="Vé & Chăm sóc Khách hàng">Vé & CSKH</option>
                  <option value="Bắp nước & Quầy Concession">Bắp nước</option>
                  <option value="Kỹ thuật Phim & Âm thanh">Kỹ thuật Sound</option>
                  <option value="Quản lý Đào tạo & Nhân sự">Quản lý HR</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">Vai Trò</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] text-slate-900 dark:text-white"
                >
                  <option value="staff">Nhân Viên</option>
                  <option value="manager">Quản Lý</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition mt-2"
          >
            {isRegisterMode ? 'Tự Đăng Ký Tài Khoản Mới' : 'Đăng Nhập EMS'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegisterMode(!isRegisterMode); setErrorMsg(''); }}
            className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
          >
            {isRegisterMode ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký nhân sự mới tại đây'}
          </button>
        </div>
      </div>
    </div>
  );
};
