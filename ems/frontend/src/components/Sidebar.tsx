import React from 'react';
import { Role } from '../types';
import { 
  BookOpen, 
  FileCheck, 
  Award, 
  User as UserIcon, 
  CalendarPlus, 
  Calendar, 
  Users, 
  UserPlus, 
  CalendarRange, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  Home,
  GraduationCap
} from 'lucide-react';

import { getAttendanceExceptions } from '../services/storage';

export type NavTab = 
  | 'dashboard'
  | 'courses'              // UC05: Học các khóa học
  | 'quizzes'              // UC06: Làm kiểm tra đánh giá hàng tháng
  | 'certificates'         // UC07: Xem các chứng chỉ đã đạt được
  | 'profile'              // UC02: Xem hồ sơ nhân viên
  | 'shift-register'       // UC09: Đăng ký lịch làm việc
  | 'shift-view'           // UC10: Xem lịch làm việc
  | 'employees'            // UC03: Tra cứu hồ sơ danh sách nhân viên
  | 'create-employee'      // UC04: Tạo tài khoản nhân viên
  | 'manager-scheduler'    // UC11: Set lịch làm việc cho nhân viên + AI
  | 'attendance'           // UC12: Quản lý chấm công
  | 'attendance-exceptions'// UC13: Xử lý các trường hợp chấm công
  | 'manager-quiz-creator';// UC08: Tạo bài kiểm tra/khóa học CTKM + AI

interface SidebarProps {
  userRole: Role;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  badge?: string;
  isAi?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ userRole, activeTab, onTabChange }) => {
  const pendingCount = getAttendanceExceptions().filter(e => e.status === 'pending').length;

  const staffMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Trang Chủ Tổng Quan', icon: Home },
    { id: 'attendance', label: 'Điểm Danh & Chấm Công', icon: Clock },
    { 
      id: 'attendance-exceptions', 
      label: 'Giải Trình Chấm Công', 
      icon: AlertCircle,
      badge: pendingCount > 0 ? `${pendingCount}` : undefined 
    },
    { id: 'shift-view', label: 'Xem Lịch Phân Ca', icon: Calendar },
    { id: 'shift-register', label: 'Đăng Ký Lịch Làm Việc', icon: CalendarPlus },
    { id: 'courses', label: 'Học Các Khóa Học', icon: BookOpen },
    { id: 'quizzes', label: 'Làm Bài Kiểm Tra Hàng Tháng', icon: FileCheck },
    { id: 'certificates', label: 'Chứng Chỉ Đã Đạt Được', icon: Award },
    { id: 'profile', label: 'Xem Hồ Sơ Nhân Viên', icon: UserIcon },
  ];

  const managerMenuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Trang Chủ Quản Trị', icon: Home },
    { id: 'employees', label: 'Quản Lý Nhân Sự & Tài Khoản', icon: Users },
    { id: 'manager-scheduler', label: 'Duyệt Ca & Xếp Lịch Làm Việc', icon: CalendarRange },
    { 
      id: 'attendance', 
      label: 'Quản Lý Chấm Công', 
      icon: Clock,
      badge: pendingCount > 0 ? `${pendingCount} Chờ duyệt` : undefined 
    },
    { id: 'manager-quiz-creator', label: 'Khóa Học & Đề Khảo Thí', icon: GraduationCap },
  ];

  const menu = userRole === 'manager' ? managerMenuItems : staffMenuItems;

  return (
    <aside 
      className="w-64 shrink-0 h-full flex flex-col justify-between p-4 overflow-y-auto sidebar-custom-scroll select-none border-r border-white/10 shadow-[6px_0_24px_rgba(13,27,46,0.18)] z-30"
      style={{ background: 'linear-gradient(180deg, #0d1b2e 0%, #112847 56%, #0a1626 100%)' }}
    >
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#8ea1c1] px-3 mb-3 flex items-center justify-between">
            <span>{userRole === 'manager' ? 'QUẢN LÝ CỤM RẠP' : 'NHÂN VIÊN CỤM RẠP'}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#f4c04a]/70"></span>
          </div>
          <nav className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as NavTab)}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'text-[#0d1b2e] font-bold shadow-md shadow-amber-500/25 border border-[#ffe39a]'
                      : 'text-[#dce6f7] hover:text-white hover:bg-white/[0.08] border border-transparent font-medium'
                  }`}
                  style={
                    isActive
                      ? { background: 'linear-gradient(105deg, #f4c04a 0%, #ffd466 100%)' }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <Icon 
                      className={`w-4 h-4 transition-colors ${
                        isActive 
                          ? 'text-[#0d1b2e]' 
                          : 'text-[#8ea1c1] group-hover:text-[#f4c04a]'
                      }`} 
                    />
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      isActive 
                        ? 'bg-[#0d1b2e]/15 text-[#0d1b2e] border border-[#0d1b2e]/20'
                        : item.isAi 
                        ? 'bg-purple-900/60 text-purple-200 border border-purple-400/40' 
                        : 'bg-white/10 text-[#f4c04a] border border-[#f4c04a]/30'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-4 p-3.5 bg-white/[0.05] border border-white/10 rounded-2xl text-center space-y-1 backdrop-blur-xs">
        <div className="flex items-center justify-center gap-1.5 text-xs text-[#f4c04a] font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-[#f4c04a]" />
          <span className="text-[#f8fbff]">AURORA CINEMAS EMS</span>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#8ea1c1]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Đồng bộ hệ thống cụm rạp</span>
        </div>
      </div>
    </aside>
  );
};
