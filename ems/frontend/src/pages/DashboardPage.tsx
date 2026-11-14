import React, { useState, useEffect } from 'react';
import { User, Certificate, WorkSchedule, Attendance, AttendanceException } from '../types';
import { 
  Users, 
  BookOpen, 
  Award, 
  Sparkles, 
  ArrowUpRight, 
  FileCheck,
  Bell,
  Calendar,
  Clock,
  CheckCircle2,
  Scan,
  Building2,
  Star
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  getCourses, 
  getQuizzes, 
  getCertificates, 
  getUsers, 
  getWorkSchedules,
  getAttendances,
  getShiftRegistrations,
  getAttendanceExceptions,
  getShiftReminders, 
  dismissShiftReminder 
} from '../services/storage';
import {
  fetchCertificates,
  fetchWorkSchedules,
  fetchAttendances,
  fetchEmployees,
  fetchAttendanceExceptions
} from '../services/apiClient';
import { getTodayDateString, formatDateDMY } from '../utils/dateUtils';
import { NavTab } from '../components/Sidebar';

interface DashboardPageProps {
  currentUser: User;
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentUser, onNavigate }) => {
  const [users, setUsers] = useState<User[]>(getUsers());
  const courses = getCourses();
  const quizzes = getQuizzes();
  const [certificates, setCertificates] = useState<Certificate[]>(getCertificates());
  const [schedules, setSchedules] = useState<WorkSchedule[]>(getWorkSchedules());
  const [attendances, setAttendances] = useState<Attendance[]>(getAttendances());
  const registrations = getShiftRegistrations();
  const [exceptions, setExceptions] = useState<AttendanceException[]>(getAttendanceExceptions());

  const isManager = currentUser.role === 'manager';
  const [myReminders, setMyReminders] = useState(() => isManager ? [] : getShiftReminders(currentUser.id));

  useEffect(() => {
    Promise.all([
      fetchCertificates(),
      fetchWorkSchedules(),
      fetchAttendances(),
      fetchEmployees(),
      fetchAttendanceExceptions()
    ]).then(([certData, schData, attData, empData, excData]) => {
      if (excData && excData.length > 0) setExceptions(excData);
      if (certData && certData.length > 0) setCertificates(certData);
      if (schData && schData.length > 0) setSchedules(schData);
      if (attData && attData.length > 0) setAttendances(attData);
      if (empData && empData.length > 0) setUsers(empData);
    }).catch(() => {});
  }, []);

  const isMatchUser = (recordUserId?: string, recordUserName?: string) => {
    const clean1 = String(recordUserId || '').replace('usr-', '').trim();
    const clean2 = String(currentUser.id || '').replace('usr-', '').trim();
    if (clean1 && clean2 && clean1 === clean2) return true;
    if (recordUserName && currentUser.name && recordUserName.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) {
      return true;
    }
    return false;
  };

  const todayStr = getTodayDateString();

  // Dữ liệu cá nhân hóa cho Nhân viên (!isManager)
  const myCertificates = certificates.filter(c => {
    const clean1 = String(c.userId || '').replace('usr-', '').trim();
    const clean2 = String(currentUser.id || '').replace('usr-', '').trim();
    return c.userId === currentUser.id || (clean1 && clean1 === clean2);
  });

  const myAvgCertScore = myCertificates.length > 0
    ? Math.round(myCertificates.reduce((sum, c) => sum + (c.score || 90), 0) / myCertificates.length)
    : 0;

  const myPassedQuizIds = new Set(myCertificates.map(c => c.courseId));
  const mySchedules = schedules.filter(s => isMatchUser(s.userId, s.userName));
  const myAttendances = attendances.filter(a => isMatchUser(a.userId, a.userName));
  const myTodayAttendance = myAttendances.find(a => a.date === todayStr);
  const myRegistrations = registrations.filter(r => isMatchUser(r.userId, r.userName));

  const matchRecord = (aId?: string, aName?: string, bId?: string, bName?: string) => {
    const c1 = String(aId || '').replace('usr-', '').trim();
    const c2 = String(bId || '').replace('usr-', '').trim();
    if (c1 && c2 && c1 === c2) return true;
    return Boolean(aName && bName && aName.toLowerCase().trim() === bName.toLowerCase().trim());
  };
  const staffList = users.filter(u => u.role !== 'manager');
  const todayAttendances = attendances.filter(a => a.date === todayStr && a.checkIn);
  const checkedInToday = staffList.filter(u => todayAttendances.some(a => matchRecord(a.userId, a.userName, u.id, u.name))).length;
  const lateToday = todayAttendances.filter(a => a.status === 'late').length;
  const todaySchedules = schedules.filter(s => s.date === todayStr);
  const notCheckedInToday = todaySchedules.filter(s => !todayAttendances.some(a => matchRecord(a.userId, a.userName, s.userId, s.userName)));
  const pendingRegs = registrations.filter(r => r.status === 'pending');
  const pendingExceptions = exceptions.filter(e => e.status === 'pending');
  const weeklyAttendance = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const dayAtt = attendances.filter(a => a.date === key && a.checkIn);
    return {
      day: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'),
      onTime: dayAtt.filter(a => a.status !== 'late').length,
      late: dayAtt.filter(a => a.status === 'late').length,
    };
  });
  const departmentStats = Object.entries(
    staffList.reduce<Record<string, number>>((acc, u) => {
      const k = u.department || 'Khác';
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, count]) => ({ name, count }));

  return (
    <div className="space-y-6">
      {!isManager && myReminders.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-amber-950">
                Nhắc nhở đăng ký ca làm việc ({myReminders[0].createdAt})
              </div>
              <p className="text-xs text-amber-900 mt-0.5 font-medium">
                {myReminders[0].message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('shift-register')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer"
            >
              Đăng Ký Ca Ngay
            </button>
            <button
              onClick={() => {
                dismissShiftReminder(currentUser.id);
                setMyReminders([]);
              }}
              className="px-3 py-2 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-xl cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}

      {/* Bright Glass Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-purple-600/10 to-cyan-500/10 border border-slate-200 p-6 md:p-8 glass-panel shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {isManager
                  ? 'HỆ THỐNG QUẢN TRỊ NHÂN SỰ NỘI BỘ'
                  : `CỔNG THÔNG TIN NHÂN VIÊN • ${(currentUser.department || 'CỤM RẠP AURORA').toUpperCase()}`}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">
              Xin chào, {currentUser.name}! 👋
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-xl font-medium">
              {isManager 
                ? 'Hệ thống quản lý phân ca, chấm công Face ID và đào tạo nhân sự toàn cụm rạp.'
                : `Mã nhân sự: ${currentUser.phone || currentUser.staffCode} • Theo dõi lịch phân ca, chấm công Face ID và chứng chỉ đào tạo của riêng bạn.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {isManager ? (
              <button
                onClick={() => onNavigate('manager-scheduler')}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:opacity-90 flex items-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Duyệt Ca & Xếp Lịch Làm Việc</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('attendance')}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <Scan className="w-4 h-4 text-amber-400" />
                  <span>Điểm Danh Face ID</span>
                </button>
                <button
                  onClick={() => onNavigate('quizzes')}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md hover:bg-amber-400 flex items-center gap-2 transition cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Làm Bài Kiểm Tra Nghiệp Vụ</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stat Cards: Phân tách rõ Quản lý vs Nhân viên */}
      {isManager ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div onClick={() => onNavigate('attendance')} className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer">
            <div>
              <div className="text-xs text-slate-500 font-semibold">Đã Điểm Danh Hôm Nay</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{checkedInToday}/{staffList.length} <span className="text-xs font-normal text-slate-500">nhân viên</span></div>
              <div className="text-[10px] text-emerald-600 mt-1 font-bold">Đạt {staffList.length > 0 ? Math.round((checkedInToday / staffList.length) * 100) : 0}% quân số</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Scan className="w-6 h-6" />
            </div>
          </div>

          <div onClick={() => onNavigate('attendance')} className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer">
            <div>
              <div className="text-xs text-slate-500 font-semibold">Đi Muộn Hôm Nay</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{lateToday} <span className="text-xs font-normal text-slate-500">lượt</span></div>
              <div className="text-[10px] text-amber-700 mt-1 font-bold">Chưa vào ca: {notCheckedInToday.length} người</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div onClick={() => onNavigate('manager-scheduler')} className="bg-white border border-slate-200 hover:border-purple-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer">
            <div>
              <div className="text-xs text-slate-500 font-semibold">Nguyện Vọng Ca Chờ Duyệt</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pendingRegs.length} <span className="text-xs font-normal text-slate-500">đăng ký</span></div>
              <div className="text-[10px] text-purple-600 mt-1 font-bold">Ca đã phân công hôm nay: {todaySchedules.length}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div onClick={() => onNavigate('attendance-exceptions')} className="bg-white border border-slate-200 hover:border-rose-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer">
            <div>
              <div className="text-xs text-slate-500 font-semibold">Đơn Ngoại Lệ Chờ Xử Lý</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{pendingExceptions.length} <span className="text-xs font-normal text-slate-500">đơn</span></div>
              <div className="text-[10px] text-rose-600 mt-1 font-bold">Chứng chỉ đã cấp: {certificates.length}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <Bell className="w-6 h-6" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => onNavigate('shift-view')}
            className="bg-white border border-slate-200 hover:border-cyan-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer"
          >
            <div>
              <div className="text-xs text-slate-500 font-semibold">Ca Trực Của Tôi</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {mySchedules.length} <span className="text-xs font-normal text-slate-500">ca phân công</span>
              </div>
              <div className={`text-[10px] mt-1 flex items-center gap-1 font-bold ${
                myTodayAttendance?.checkIn ? 'text-emerald-600' : 'text-amber-600'
              }`}>
                <Clock className="w-3 h-3" />
                {myTodayAttendance?.checkIn
                  ? `Hôm nay: Đã vào ca (${myTodayAttendance.checkIn})`
                  : 'Hôm nay: Chưa chấm công'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-600">
              <Calendar className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => onNavigate('courses')}
            className="bg-white border border-slate-200 hover:border-amber-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer"
          >
            <div>
              <div className="text-xs text-slate-500 font-semibold">Khóa Học Nghiệp Vụ</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {courses.length} <span className="text-xs font-normal text-slate-500">khóa học</span>
              </div>
              <div className="text-[10px] text-amber-700 mt-1 font-bold">
                Bộ phận: {currentUser.department || 'Nhân viên rạp'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => onNavigate('quizzes')}
            className="bg-white border border-slate-200 hover:border-purple-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer"
          >
            <div>
              <div className="text-xs text-slate-500 font-semibold">Bài Kiểm Tra Đã Đạt</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {myPassedQuizIds.size}/{quizzes.length} <span className="text-xs font-normal text-slate-500">đề thi</span>
              </div>
              <div className="text-[10px] text-purple-600 mt-1 font-bold">
                {myAvgCertScore > 0 ? `Điểm TB đạt: ${myAvgCertScore}/100` : 'Chưa có bài thi đạt'}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>

          <div
            onClick={() => onNavigate('certificates')}
            className="bg-white border border-slate-200 hover:border-emerald-400 rounded-2xl p-5 flex items-center justify-between shadow-sm transition cursor-pointer"
          >
            <div>
              <div className="text-xs text-slate-500 font-semibold">Chứng Chỉ Đã Đạt</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {myCertificates.length} <span className="text-xs font-normal text-slate-500">chứng chỉ</span>
              </div>
              <div className="text-[10px] text-emerald-600 mt-1 font-bold">
                Của riêng {currentUser.name}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <Award className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts (Manager) OR Personal Workspace (Staff) */}
      {isManager ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Chấm Công 7 Ngày Gần Nhất</h3>
                  <p className="text-xs text-slate-500">Số lượt vào ca đúng giờ và đi muộn toàn cụm rạp</p>
                </div>
                <button onClick={() => onNavigate('attendance')} className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                  <span>Xem giám sát</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyAttendance}>
                    <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#cbd5e1', borderRadius: '10px', fontSize: '11px' }} />
                    <Bar dataKey="onTime" name="Đúng giờ" stackId="a" fill="#059669" />
                    <Bar dataKey="late" name="Đi muộn" stackId="a" fill="#d97706" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ca Trực Hôm Nay ({formatDateDMY(todayStr)})</h3>
                  <p className="text-xs text-slate-500">Tình trạng điểm danh của nhân sự được phân công</p>
                </div>
                <button onClick={() => onNavigate('manager-scheduler')} className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer">
                  <span>Xếp lịch</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              {todaySchedules.length === 0 ? (
                <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-600 font-semibold">
                  Hôm nay chưa có ca nào được phân công.
                </div>
              ) : (
                <div className="space-y-2">
                  {todaySchedules.slice(0, 6).map(sch => {
                    const att = todayAttendances.find(a => matchRecord(a.userId, a.userName, sch.userId, sch.userName));
                    return (
                      <div key={sch.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{sch.userName}</div>
                          <div className="text-[11px] text-slate-500 truncate">{sch.shiftName} • {sch.location}</div>
                        </div>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          att?.checkOut ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : att?.checkIn ? (att.status === 'late' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200')
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {att?.checkOut ? `Đã tan ca ${att.checkOut}` : att?.checkIn ? `Vào ca ${att.checkIn}${att.status === 'late' ? ' (muộn)' : ''}` : 'Chưa điểm danh'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Cần Xử Lý Ngay</h3>
              <button onClick={() => onNavigate('manager-scheduler')} className="w-full p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-50 text-left transition cursor-pointer">
                <div className="text-xs font-bold text-purple-900">{pendingRegs.length} nguyện vọng đăng ký ca chờ duyệt</div>
                <div className="text-[11px] text-purple-700 mt-0.5">Mở bảng xếp lịch để duyệt</div>
              </button>
              <button onClick={() => onNavigate('attendance-exceptions')} className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50/50 hover:bg-rose-50 text-left transition cursor-pointer">
                <div className="text-xs font-bold text-rose-900">{pendingExceptions.length} đơn giải trình / xin phép chờ duyệt</div>
                <div className="text-[11px] text-rose-700 mt-0.5">Xử lý ngoại lệ chấm công</div>
              </button>
              <button onClick={() => onNavigate('attendance')} className="w-full p-3 rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-50 text-left transition cursor-pointer">
                <div className="text-xs font-bold text-amber-900">{notCheckedInToday.length} nhân sự có ca nhưng chưa điểm danh</div>
                <div className="text-[11px] text-amber-700 mt-0.5 truncate">
                  {notCheckedInToday.slice(0, 3).map(s => s.userName).join(', ') || 'Tất cả đã điểm danh'}
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200">
              <div className="text-xs font-bold text-slate-900 mb-2">Nhân sự theo bộ phận</div>
              <div className="space-y-1.5">
                {departmentStats.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 truncate">{d.name}</span>
                    <span className="font-bold text-slate-900">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái (2 cột): Lịch phân ca cá nhân & Chứng chỉ đã đạt của riêng nhân viên */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Lịch Phân Ca & Ca Trực Của Tôi</h3>
                  <p className="text-xs text-slate-500">Các ca trực được Ban quản lý phân công cho {currentUser.name}</p>
                </div>
                <button
                  onClick={() => onNavigate('shift-view')}
                  className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Xem toàn bộ lịch</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {mySchedules.length === 0 ? (
                <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Bạn chưa có ca trực nào được phân công trong danh sách hiện tại.</p>
                  <p className="text-[11px] text-slate-500 mt-1">Hãy đăng ký nguyện vọng ca làm việc để Quản lý duyệt lịch.</p>
                  <button
                    onClick={() => onNavigate('shift-register')}
                    className="mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    + Đăng Ký Ca Làm Việc
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {mySchedules.slice(0, 4).map(sch => (
                    <div
                      key={sch.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">
                            {sch.shiftName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                            <span>Ngày: <strong>{formatDateDMY(sch.date)}</strong></span>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {sch.location}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã phân công
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chứng chỉ của riêng nhân viên */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Chứng Chỉ Nghiệp Vụ Đã Đạt ({myCertificates.length})
                  </h3>
                  <p className="text-xs text-slate-500">Chứng chỉ sát hạch cấp riêng cho hồ sơ {currentUser.name}</p>
                </div>
                <button
                  onClick={() => onNavigate('certificates')}
                  className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Mở kho chứng chỉ</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {myCertificates.length === 0 ? (
                <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                  <Award className="w-7 h-7 text-slate-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">Bạn chưa có chứng chỉ nào.</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Hoàn thành bài kiểm tra định kỳ đạt từ 80% trở lên để nhận chứng chỉ QR.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myCertificates.map(cert => (
                    <div
                      key={cert.id}
                      onClick={() => onNavigate('certificates')}
                      className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/70 transition flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shrink-0">
                          <Award className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{cert.courseTitle}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Mã: <span className="font-mono font-semibold text-slate-700">{cert.certificateCode}</span> • Cấp ngày {formatDateDMY(cert.issuedAt)}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {cert.score}/100 điểm
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải (1 cột): Tóm tắt hồ sơ & Chấm công cá nhân */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Tổng Quan Hồ Sơ Cá Nhân</h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-bold border border-amber-200">
                  Nhân viên rạp
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{currentUser.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã nhân sự / SĐT:</span>
                  <span className="font-mono font-bold text-amber-700">{currentUser.phone || currentUser.staffCode}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Bộ phận nghiệp vụ:</span>
                  <span className="font-semibold text-slate-800">{currentUser.department || 'Box ticket'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Điểm đánh giá năng lực:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {currentUser.performanceScore || 92}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Nguyện vọng ca đã gửi:</span>
                  <span className="font-bold text-slate-900">{myRegistrations.length} ca</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số buổi đã chấm công:</span>
                  <span className="font-bold text-slate-900">{myAttendances.length} buổi</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs ${
                myTodayAttendance?.checkIn
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Trạng thái điểm danh hôm nay ({formatDateDMY(todayStr)})</span>
                </div>
                <p className="text-[11px] mt-1">
                  {myTodayAttendance?.checkIn
                    ? `Đã Check-in lúc ${myTodayAttendance.checkIn}${myTodayAttendance.checkOut ? ` • Đã Tan ca lúc ${myTodayAttendance.checkOut}` : ' (Đang trong ca trực)'}`
                    : 'Bạn chưa thực hiện quét Face ID điểm danh vào ca hôm nay.'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">Cập nhật thông tin & Face ID</span>
              <button
                onClick={() => onNavigate('profile')}
                className="text-xs text-amber-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Hồ sơ của tôi</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

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
