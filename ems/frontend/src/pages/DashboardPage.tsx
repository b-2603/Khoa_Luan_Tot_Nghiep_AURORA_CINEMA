import React from 'react';
import { User } from '../types';
import { 
  Users, 
  BookOpen, 
  Award, 
  Sparkles, 
  ArrowUpRight, 
  FileCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';
import { getCourses, getQuizzes, getCertificates, getUsers } from '../services/storage';
import { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, onNavigate }) => {
  const users = getUsers();
  const courses = getCourses();
  const quizzes = getQuizzes();
  const certificates = getCertificates();

  const isManager = currentUser.role === 'manager';

  const performanceData = [
    { month: 'T4', score: 82, attendance: 95 },
    { month: 'T5', score: 85, attendance: 96 },
    { month: 'T6', score: 88, attendance: 94 },
    { month: 'T7', score: 90, attendance: 98 },
    { month: 'T8', score: 91, attendance: 97 },
    { month: 'T9', score: 94, attendance: 99 },
  ];

  const shiftStatsData = [
    { day: 'T2', caSang: 8, caChieu: 12, caDem: 5 },
    { day: 'T3', caSang: 8, caChieu: 10, caDem: 4 },
    { day: 'T4', caSang: 10, caChieu: 14, caDem: 6 },
    { day: 'T5', caSang: 9, caChieu: 12, caDem: 5 },
    { day: 'T6', caSang: 12, caChieu: 18, caDem: 10 },
    { day: 'T7', caSang: 15, caChieu: 22, caDem: 14 },
    { day: 'CN', caSang: 16, caChieu: 24, caDem: 16 },
  ];

  return (
    <div className="space-y-6">
      {/* Bright Glass Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-cyan-500/10 border border-slate-200 p-6 md:p-8 glass-panel shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>HỆ THỐNG QUẢN TRỊ NHÂN SỰ NỘI BỘ</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              Xin chào, {currentUser.name}! 👋
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-xl font-medium">
              {isManager 
                ? 'Hệ thống quản lý phân ca, chấm công Face ID và đào tạo nhân sự rạp.'
                : 'Theo dõi ca trực cá nhân, lịch làm việc và bài kiểm tra nghiệp vụ rạp.'}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isManager ? (
              <button
                onClick={() => onNavigate('manager-scheduler')}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:opacity-90 flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Duyệt Ca & Xếp Lịch Làm Việc</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate('quizzes')}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md hover:bg-amber-400 flex items-center gap-2 transition cursor-pointer"
              >
                <FileCheck className="w-4 h-4" />
                <span>Làm Bài Kiểm Tra Nghiệp Vụ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Tổng Nhân Sự Rạp</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{users.length} <span className="text-xs font-normal text-slate-500">nhân viên</span></div>
            <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1 font-bold">
              <ArrowUpRight className="w-3 h-3" /> +100% Hoạt động
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Khóa Đào Tạo Nghiệp Vụ</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{courses.length} <span className="text-xs font-normal text-slate-500">khóa</span></div>
            <div className="text-[10px] text-amber-700 mt-1 font-bold">
              Bao gồm CTKM Rạp 2026
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Bài Đánh Giá Hàng Tháng</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{quizzes.length} <span className="text-xs font-normal text-slate-500">đề thi</span></div>
            <div className="text-[10px] text-purple-600 mt-1 font-bold">
              Tỷ lệ Đạt: 94.2%
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Chứng Chỉ Đã Đạt</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{certificates.length} <span className="text-xs font-normal text-slate-500">chứng chỉ</span></div>
            <div className="text-[10px] text-emerald-600 mt-1 font-bold">
              Cấp QR Code Tự Động
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Analytics Charts & Schedules */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Chỉ Số Năng Lực & Tỷ Lệ Đúng Giờ Nhân Sự</h3>
              <p className="text-xs text-slate-500">Thống kê kết quả đào tạo & chấm công qua các tháng</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono font-bold">
              2026
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[70, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#0f172a' }}
                />
                <Area type="monotone" dataKey="score" name="Điểm Đào Tạo (%)" stroke="#d97706" fillOpacity={1} fill="url(#colorScore)" strokeWidth={2} />
                <Area type="monotone" dataKey="attendance" name="Chấm Công Đúng Giờ (%)" stroke="#0284c7" fillOpacity={1} fill="url(#colorAtt)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift Peak Chart / Action Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-slate-900">Nhu Cầu Nhân Sự Theo Ca</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                Peak Hours
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-4">Phân bổ ca làm việc dịp phim Cuối Tuần Bom Tấn</p>
            
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shiftStatsData}>
                  <XAxis dataKey="day" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '8px', fontSize: '10px' }} />
                  <Bar dataKey="caChieu" name="Ca Chiều (Cao điểm)" fill="#d97706" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="caSang" name="Ca Sáng" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Lịch phân ca tuần 38</span>
            <button
              onClick={() => onNavigate(isManager ? 'manager-scheduler' : 'shift-view')}
              className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Xem chi tiết</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Access Use Case Cards */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3">Truy Cập Nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            onClick={() => onNavigate(isManager ? 'employees' : 'courses')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Tra Cứu Hồ Sơ' : 'Khóa Học Nghiệp Vụ'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Danh sách nhân sự' : 'Học bài giảng'}</div>
          </button>

          <button
            onClick={() => onNavigate(isManager ? 'create-employee' : 'quizzes')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Tạo Tài Khoản' : 'Bài Kiểm Tra Định Kỳ'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Thêm nhân sự mới' : 'Trắc nghiệm đánh giá'}</div>
          </button>

          <button
            onClick={() => onNavigate(isManager ? 'manager-scheduler' : 'certificates')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Xếp Lịch Ca Làm' : 'Xem Chứng Chỉ'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Phân ca nhân sự' : 'Kho chứng chỉ QR'}</div>
          </button>

          <button
            onClick={() => onNavigate(isManager ? 'attendance' : 'shift-register')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Quản Lý Chấm Công' : 'Đăng Ký Ca Làm'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Nhật ký check-in' : 'Nguyện vọng tuần'}</div>
          </button>

          <button
            onClick={() => onNavigate(isManager ? 'attendance-exceptions' : 'shift-view')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Xử Lý Ngoại Lệ' : 'Xem Lịch Phân Ca'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Duyệt phép / đổi ca' : 'Lịch làm cá nhân'}</div>
          </button>

          <button
            onClick={() => onNavigate(isManager ? 'manager-quiz-creator' : 'profile')}
            className="p-3.5 bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl text-left transition group shadow-xs cursor-pointer"
          >
            <div className="font-bold text-xs text-slate-900 group-hover:text-amber-600">{isManager ? 'Soạn Đề Khảo Thí' : 'Hồ Sơ Cá Nhân'}</div>
            <div className="text-[10px] text-slate-500 mt-1">{isManager ? 'Khóa học & đề thi' : 'Thông tin nhân viên'}</div>
          </button>
        </div>
      </div>
    </div>
  );
};
