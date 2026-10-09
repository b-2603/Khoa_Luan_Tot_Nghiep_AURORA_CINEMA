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
  Home
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
    { id: 'employees', label: 'Tra Cứu Danh Sách Nhân Viên', icon: Users },
    { id: 'create-employee', label: 'Tạo Tài Khoản Nhân Viên', icon: UserPlus },
    { id: 'manager-scheduler', label: 'Duyệt Ca & Xếp Lịch Làm Việc', icon: CalendarRange, badge: 'Tự động', isAi: true },
    { id: 'attendance', label: 'Quản Lý Chấm Công', icon: Clock },
    { 
      id: 'attendance-exceptions', 
      label: 'Xử Lý Ngoại Lệ Chấm Công', 
      icon: AlertCircle,
      badge: pendingCount > 0 ? `${pendingCount} Chờ duyệt` : undefined 
    },
    { id: 'manager-quiz-creator', label: 'Tạo Khóa Học & Đề Khảo Thí', icon: Sparkles, badge: 'Đề thi', isAi: true },
  ];

  const menu = userRole === 'manager' ? managerMenuItems : staffMenuItems;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col justify-between shrink-0 min-h-[calc(100vh-61px)] shadow-sm">
      <div className="space-y-6">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">
            {userRole === 'manager' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
          </div>
          <nav className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id as NavTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 text-left">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      item.isAi 
                        ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
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
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1 shadow-xs">
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-700 font-bold">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>AURORA CINEMAS EMS</span>
        </div>
        <p className="text-[10px] text-slate-500">Hệ thống quản lý nhân sự</p>
      </div>
    </aside>
  );
};
