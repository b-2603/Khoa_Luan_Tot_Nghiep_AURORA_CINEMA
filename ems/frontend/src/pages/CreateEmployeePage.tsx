import React, { useState } from 'react';
import { UserPlus, CheckCircle, Shield, Mail, Lock, User as UserIcon, Phone, Building } from 'lucide-react';
import { createEmployee } from '../services/apiClient';
import { Department, Role } from '../types';

export const CreateEmployeePage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState<Department>('Vé & Chăm sóc Khách hàng');
  const [role, setRole] = useState<Role>('staff');
  const [password, setPassword] = useState('Aurora@2026');
  const [submitted, setSubmitted] = useState(false);
  const [createdCode, setCreatedCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    const staffCode = `AR-${role === 'manager' ? 'MGR' : 'STAFF'}-${Math.floor(100 + Math.random() * 900)}`;

    await createEmployee({
      staffCode,
      name,
      email,
      role,
      department,
      avatar: role === 'manager'
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      phone: phone || '0901234567',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      performanceScore: 90,
    });

    setCreatedCode(staffCode);
    setSubmitted(true);
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setSubmitted(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-slate-900">Tạo Tài Khoản Nhân Viên Mới</h2>
        <p className="text-xs text-slate-500 mt-1">Cấp tài khoản đăng nhập EMS, gán vai trò & phòng ban làm việc tại cụm rạp Aurora Cinema</p>
      </div>

      {submitted ? (
        <div className="bg-white border border-emerald-300 rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-lg text-slate-900">Tạo Tài Khoản Thành Công!</h3>
          <p className="text-xs text-slate-600">
            Tài khoản đã được tạo và kích hoạt trên hệ thống EMS Aurora Cinema.
          </p>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-left space-y-1.5 max-w-sm mx-auto">
            <div><span className="text-slate-500">Mã Nhân Sự:</span> <span className="text-amber-700 font-bold">{createdCode}</span></div>
            <div><span className="text-slate-500">Họ Tên:</span> <span className="text-slate-900 font-semibold">{name}</span></div>
            <div><span className="text-slate-500">Email:</span> <span className="text-slate-900 font-semibold">{email}</span></div>
            <div><span className="text-slate-500">Mật khẩu khởi tạo:</span> <span className="text-emerald-700 font-bold">{password}</span></div>
          </div>
          <button
            onClick={handleReset}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-sm transition"
          >
            Tạo Thêm Nhân Viên Mới
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8 space-y-5 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <UserIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>Họ và Tên Nhân Viên *</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ví dụ: Nguyễn Hoàng Anh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-cyan-600" />
                <span>Email Công Việc *</span>
              </label>
              <input
                type="email"
                required
                placeholder="hoanganh@auroracinema.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Số Điện Thoại</span>
              </label>
              <input
                type="text"
                placeholder="0901234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-purple-600" />
                <span>Bộ Phận Trực Thuộc</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              >
                <option value="Vé & Chăm sóc Khách hàng">Vé & Chăm sóc Khách hàng</option>
                <option value="Bắp nước & Quầy Concession">Bắp nước & Quầy Concession</option>
                <option value="Kỹ thuật Phim & Âm thanh">Kỹ thuật Phim & Âm thanh</option>
                <option value="Quản lý Đào tạo & Nhân sự">Quản lý Đào tạo & Nhân sự</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-600" />
                <span>Vai Trò Hệ Thống (Role)</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition"
              >
                <option value="staff">Nhân viên Phục vụ (Staff)</option>
                <option value="manager">Quản lý Đào tạo (Manager)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              <span>Mật Khẩu Ban Đầu</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-extrabold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Kích Hoạt Tài Khoản Nhân Viên</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
