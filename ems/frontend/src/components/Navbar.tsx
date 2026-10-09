import React from 'react';
import { User } from '../types';
import { Film, Bot, LogOut } from 'lucide-react';
import { logoutUser } from '../services/storage';

interface NavbarProps {
  currentUser: User;
  onUserChange: (user: User | null) => void;
  onOpenAiAssistant: () => void;
  onOpenAiKeyClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  onOpenAiAssistant,
}) => {

  const handleLogout = () => {
    logoutUser();
    onUserChange(null);
  };

  return (
    <header className="glass-nav sticky top-0 z-40 px-4 lg:px-8 py-3 flex items-center justify-between shadow-sm bg-white/95 border-b border-slate-200">
      {/* Brand & Logo - Synchronized with POS and TMS */}
      <div className="flex items-center gap-3.5">
        <img
          src="/aurora-logo.svg"
          alt="Aurora Cinema"
          className="h-10 w-auto object-contain cursor-pointer"
        />
        <div className="h-7 w-px bg-slate-200 hidden sm:block" />
        <div className="hidden sm:flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs tracking-wider text-slate-900 uppercase">
              Hệ Thống EMS
            </span>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              Quản Trị Rạp
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">Quản lý Đào tạo & Nhân sự Cụm Rạp</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* AI Assistant Button */}
        <button
          onClick={onOpenAiAssistant}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl shadow-md transition cursor-pointer"
        >
          <Bot className="w-4 h-4 text-cyan-100" />
          <span>Trợ Lý Nghiệp Vụ</span>
        </button>

        {/* User Info Capsule */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <img
            src={currentUser.avatar}
            alt={currentUser.name}
            className="w-9 h-9 rounded-xl object-cover ring-2 ring-amber-500/30"
          />
          <div className="hidden sm:block text-left">
            <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</div>
            <div className="text-[10px] text-amber-700 font-semibold">{currentUser.staffCode}</div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-slate-600 hover:text-red-700 hover:bg-red-50 rounded-xl border border-slate-200 hover:border-red-200 text-xs font-bold transition cursor-pointer shadow-2xs"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline">Đăng xuất</span>
        </button>
      </div>
    </header>
  );
};
