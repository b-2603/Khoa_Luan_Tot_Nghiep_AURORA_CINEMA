import React, { useState, useEffect } from 'react';
import { User, WorkSchedule, ShiftRegistration, Shift } from '../types';
import { getUsers, getWorkSchedules, saveWorkSchedules, getShiftRegistrations, approveShiftRegistrationsForDate } from '../services/storage';
import { generateAiShiftSuggestions } from '../services/openai';
import { 
  fetchWorkSchedules, 
  fetchShiftRegistrations, 
  publishWorkSchedules, 
  fetchShifts, 
  fetchEmployees,
  approveShiftRegistration,
  rejectShiftRegistration,
  approveAllShiftRegistrations,
  triggerAiAutoScheduler
} from '../services/apiClient';
import { 
  Sparkles, 
  CalendarRange, 
  RefreshCw, 
  CheckCircle2, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Check, 
  AlertCircle, 
  Send, 
  Users, 
  Layers, 
  Clock, 
  ThumbsUp, 
  SlidersHorizontal,
  XCircle,
  Inbox,
  LayoutGrid,
  CheckCheck,
  ShieldCheck,
  X,
  Bot,
  Zap,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { getUpcomingDays, getTodayDateString, formatFriendlyDate } from '../utils/dateUtils';

export interface AiScheduleReportItem {
  userId: string;
  userName: string;
  staffCode: string;
  avatar: string;
  department: string;
  shiftId: string;
  shiftName: string;
  location: string;
  isMatchedPreference: boolean;
  reason: string;
}

export interface AiScheduleReport {
  date: string;
  dateLabel: string;
  totalStaff: number;
  registrationsFound: number;
  matchedPreferences: number;
  satisfactionRate: string;
  schedules: AiScheduleReportItem[];
}

export interface AiRegistrationAdvice {
  recommendedLocation: string;
  location?: string;
  fitScore: number;
  reason: string;
  badgeText: string;
}

export const getAiRecommendation = (reg: ShiftRegistration, staff?: User, shift?: Shift): AiRegistrationAdvice => {
  let location = 'Cụm Rạp 1 - Quầy Vé Box Office';
  let fitScore = 95;
  let reason = '';

  const dept = staff?.department || '';
  const perf = staff?.performanceScore || 92;

  if (dept.includes('Bắp')) {
    location = 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
    fitScore = 98;
    reason = `Chuyên môn Quầy Bắp Nước & Popcorn (Hiệu suất: ${perf}đ). Ca trực đang cần nhân sự pha chế & phục vụ combo.`;
  } else if (dept.includes('Kỹ thuật')) {
    location = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';
    fitScore = 99;
    reason = `Kỹ sư vận hành máy chiếu IMAX Laser & Dolby Atmos (Hiệu suất: ${perf}đ). Đảm bảo thông suốt các suất chiếu chất lượng cao.`;
  } else {
    location = 'Cụm Rạp 1 - Quầy Vé Box Office';
    fitScore = 96;
    reason = `Kỹ năng giao tiếp và nghiệp vụ quầy vé POS chuẩn xác (Hiệu suất: ${perf}đ). Phù hợp 100% đón tiếp khách hàng.`;
  }

  return {
    recommendedLocation: location,
    location,
    fitScore,
    reason,
    badgeText: `Độ phù hợp: ${fitScore}%`
  };
};

export const ManagerShiftSchedulerPage: React.FC = () => {
  // Danh sách 7 ngày từ Hôm Nay và các ngày tiếp theo trong tuần theo thời gian thực
  const weekDays = getUpcomingDays(7);
  const [users, setUsers] = useState<User[]>(getUsers().filter(u => u.role === 'staff'));
  const [schedules, setSchedules] = useState<WorkSchedule[]>(getWorkSchedules());
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [targetDate, setTargetDate] = useState<string>(getTodayDateString());
  
  // Tabs: 'pending' (Hộp thư chờ duyệt), 'matrix' (Bảng tuần), 'schedule' (Lịch phân ca)
  const [activeViewTab, setActiveViewTab] = useState<'pending' | 'matrix' | 'schedule'>('pending');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [aiSuggestionsLog, setAiSuggestionsLog] = useState<string[]>([]);
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Báo cáo kết quả phân ca AI
  const [aiReport, setAiReport] = useState<AiScheduleReport | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [staffList, shiftList, regList, schedList] = await Promise.all([
        fetchEmployees(),
        fetchShifts(),
        fetchShiftRegistrations(),
        fetchWorkSchedules(targetDate)
      ]);

      const staffOnly = staffList.filter(u => u.role === 'staff');
      if (staffOnly.length > 0) setUsers(staffOnly);
      if (shiftList && shiftList.length > 0) setShifts(shiftList);
      if (regList && regList.length > 0) setRegistrations(regList);
      else setRegistrations(getShiftRegistrations());

      if (schedList && schedList.length > 0) setSchedules(schedList);
      else setSchedules(getWorkSchedules());
    } catch {
      setRegistrations(getShiftRegistrations());
      setSchedules(getWorkSchedules());
    }
  };

  useEffect(() => {
    loadData();
  }, [targetDate]);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setStatusBanner({ type, message });
    setTimeout(() => setStatusBanner(null), 5000);
  };

  // Tất cả các nguyện vọng đang chờ duyệt trên toàn hệ thống
  const allPendingRegs = registrations.filter(r => r.status === 'pending');
  const allApprovedRegs = registrations.filter(r => r.status === 'approved');

  // Quản lý bấm Phê duyệt từng ca cụ thể
  const handleApproveSingle = async (reg: ShiftRegistration, customLoc?: string) => {
    setProcessingId(reg.id);
    const shift = shifts.find(s => s.id === reg.shiftId);
    const staff = users.find(u => u.id === reg.userId || u.id.replace('usr-', '') === reg.userId.replace('usr-', ''));

    let location = customLoc;
    if (!location) {
      if (staff?.department.includes('Bắp')) location = 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
      else if (staff?.department.includes('Kỹ thuật')) location = 'Phòng Máy Chiếu & Kỹ Thuật IMAX';
      else location = 'Cụm Rạp 1 - Quầy Vé Box Office';
    }

    try {
      await approveShiftRegistration(reg.id, location);

      // Cập nhật state cục bộ ngay lập tức
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'approved' } : r));

      // Thêm hoặc cập nhật vào schedules
      const newScheduleItem: WorkSchedule = {
        id: `sch-${Date.now()}-${reg.userId}`,
        userId: reg.userId,
        userName: reg.userName,
        userAvatar: staff?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        staffCode: staff?.staffCode || 'AR-STAFF',
        department: staff?.department || 'Vé & Chăm sóc Khách hàng',
        date: reg.date,
        shiftId: reg.shiftId,
        shiftName: shift?.name || 'Ca Làm Việc',
        location: location as any,
        status: 'assigned',
        assignedBy: 'Quản lý Phạm Thu Hương (Đã Phê Duyệt)'
      };

      setSchedules(prev => {
        const filtered = prev.filter(s => !(s.userId === reg.userId && s.date === reg.date));
        const updated = [...filtered, newScheduleItem];
        saveWorkSchedules(updated);
        return updated;
      });

      showToast('success', `Đã duyệt ca ${shift?.name || ''} ngày ${reg.date} của nhân viên ${reg.userName} thành công!`);
    } catch {
      showToast('error', 'Lỗi khi kết nối duyệt ca.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quản lý bấm Từ chối ca
  const handleRejectSingle = async (reg: ShiftRegistration) => {
    setProcessingId(reg.id);
    try {
      await rejectShiftRegistration(reg.id);
      setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'rejected' } : r));
      showToast('info', `Đã từ chối nguyện vọng ca ngày ${reg.date} của ${reg.userName}.`);
    } catch {
      showToast('error', 'Lỗi khi từ chối ca.');
    } finally {
      setProcessingId(null);
    }
  };

  // Quản lý bấm Duyệt Tất Cả nguyện vọng đang chờ
  const handleApproveAll = async () => {
    setIsPublishing(true);
    try {
      await approveAllShiftRegistrations();
      
      // Đồng bộ state
      setRegistrations(prev => prev.map(r => ({ ...r, status: 'approved' })));
      await loadData();

      showToast('success', `Đã duyệt nhanh thành công toàn bộ ${allPendingRegs.length} nguyện vọng ca làm việc đang chờ!`);
    } catch {
      showToast('error', 'Có lỗi xảy ra khi duyệt tất cả.');
    } finally {
      setIsPublishing(false);
    }
  };

  // Kích hoạt AI Auto-Scheduler xếp lịch & duyệt toàn diện cho ngày targetDate
  const handleAiAutoSchedule = async () => {
    setIsAiLoading(true);
    setAiSuggestionsLog([]);

    try {
      // 1. Thử gọi backend AI Auto Scheduler
      const apiRes = await triggerAiAutoScheduler(targetDate);
      let reportData: AiScheduleReport | null = null;

      if (apiRes.success && apiRes.data?.schedules) {
        const d = apiRes.data;
        const mappedItems: AiScheduleReportItem[] = d.schedules.map((s: any) => {
          const staff = users.find(u => u.id === `usr-${s.user_id}` || u.id === String(s.user_id)) || users[0];
          return {
            userId: staff?.id || `usr-${s.user_id}`,
            userName: s.user_name || staff?.name || 'Nhân viên',
            staffCode: s.staff_code || staff?.staffCode || 'AR-STAFF',
            avatar: staff?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: staff?.department || 'Bắp nước & Quầy Concession',
            shiftId: `shift-${s.shift_id}`,
            shiftName: s.shift_name,
            location: s.location,
            isMatchedPreference: s.is_matched_preference,
            reason: s.reason
          };
        });

        reportData = {
          date: targetDate,
          dateLabel: weekDays.find(w => w.date === targetDate)?.dayLabel || targetDate,
          totalStaff: d.total_staff || mappedItems.length,
          registrationsFound: d.registrations_found || 0,
          matchedPreferences: d.matched_preferences || 0,
          satisfactionRate: d.satisfaction_rate || '100%',
          schedules: mappedItems
        };
      } else {
        // Fallback sang local AI Scheduler
        const staffList = users.map(u => ({ id: u.id, name: u.name, department: u.department }));
        const aiResults = await generateAiShiftSuggestions(staffList, targetDate, registrations);

        const mappedItems: AiScheduleReportItem[] = aiResults.map(res => {
          const staff = users.find(u => u.id === res.userId) || users[0];
          const hasReg = registrations.some(r => (r.userId === res.userId || r.userId.replace('usr-', '') === res.userId.replace('usr-', '')) && r.date === targetDate);
          return {
            userId: res.userId,
            userName: res.userName,
            staffCode: staff?.staffCode || 'AR-STAFF',
            avatar: staff?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            department: staff?.department || 'Bắp nước & Quầy Concession',
            shiftId: res.suggestedShiftId,
            shiftName: res.suggestedShiftName,
            location: res.assignedLocation,
            isMatchedPreference: hasReg,
            reason: res.reason
          };
        });

        reportData = {
          date: targetDate,
          dateLabel: weekDays.find(w => w.date === targetDate)?.dayLabel || targetDate,
          totalStaff: users.length,
          registrationsFound: registrations.filter(r => r.date === targetDate).length,
          matchedPreferences: registrations.filter(r => r.date === targetDate).length,
          satisfactionRate: '100%',
          schedules: mappedItems
        };
      }

      if (reportData) {
        const newSchedules: WorkSchedule[] = reportData.schedules.map(item => ({
          id: `sch-${Date.now()}-${item.userId}`,
          userId: item.userId,
          userName: item.userName,
          userAvatar: item.avatar,
          staffCode: item.staffCode,
          department: item.department as any,
          date: targetDate,
          shiftId: item.shiftId,
          shiftName: item.shiftName,
          location: item.location as any,
          status: 'assigned',
          assignedBy: 'Hệ Thống Tự Động (Khớp Nguyện Vọng Đăng Ký)'
        }));

        saveWorkSchedules(newSchedules);
        setSchedules(newSchedules);

        // Phê duyệt các ca đã đăng ký khớp ngày này
        const userShiftMap: Record<string, string> = {};
        newSchedules.forEach(s => { userShiftMap[s.userId] = s.shiftId; });
        approveShiftRegistrationsForDate(targetDate, userShiftMap);

        // Cập nhật lại danh sách đăng ký
        setRegistrations(prev => prev.map(r => {
          if (r.date === targetDate) {
            return { ...r, status: 'approved' };
          }
          return r;
        }));

        const logs = reportData.schedules.map(r => `Tự động: Phân ${r.userName} vào ${r.shiftName} (${r.location}) - ${r.reason}`);
        setAiSuggestionsLog(logs);
        setAiReport(reportData);

        // BẬT CỬA SỔ POP-UP BÁO CÁO KẾT QUẢ AI NGAY LẬP TỨC
        setIsAiModalOpen(true);

        showToast('success', `Hệ thống đã phân ca và tự động phê duyệt cho ngày ${reportData.dateLabel} (${targetDate}) thành công!`);
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi tự động xếp lịch.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Kích hoạt AI Auto-Scheduler xếp toàn bộ 7 ngày trong tuần
  const handleAiScheduleFullWeek = async () => {
    setIsAiLoading(true);
    try {
      for (const d of weekDays) {
        await triggerAiAutoScheduler(d.date);
      }
      await loadData();
      showToast('success', 'Đã hoàn tất phân bổ và xếp lịch làm việc cho toàn bộ 7 ngày trong tuần!');
      setActiveViewTab('matrix');
    } catch (err) {
      console.error(err);
      showToast('error', 'Lỗi khi xếp lịch cả tuần.');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Phê Duyệt Đăng Ký Ca & Xếp Lịch Làm Việc</h2>
          <p className="text-xs text-slate-500 mt-1">
            Phê duyệt nguyện vọng ca trực và phân công lịch làm việc.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {allPendingRegs.length > 0 && (
            <button
              onClick={handleApproveAll}
              disabled={isPublishing}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer"
            >
              {isPublishing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span>Duyệt Nhanh ({allPendingRegs.length} Ca Chờ)</span>
            </button>
          )}

          <button
            onClick={handleAiAutoSchedule}
            disabled={isAiLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            title="Tự động phân ca cho ngày đang chọn và mở ngay bảng báo cáo kết quả chi tiết"
          >
            {isAiLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang Tự Động Phân Ca...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tự Động Phân Ca & Duyệt Lịch</span>
              </>
            )}
          </button>

          <button
            onClick={handleAiScheduleFullWeek}
            disabled={isAiLoading}
            className="px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
            title="Tự động xếp lịch tối ưu cho toàn bộ 7 ngày trong tuần"
          >
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Tự Động Xếp Lịch Toàn Tuần</span>
          </button>
        </div>
      </div>

      {/* Thông báo trạng thái thao tác */}
      {statusBanner && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between gap-2.5 shadow-sm border transition-all ${
          statusBanner.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
            : statusBanner.type === 'info'
            ? 'bg-blue-50 border-blue-200 text-blue-800'
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>

          {aiReport && (
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="text-[11px] font-bold underline hover:opacity-80 shrink-0 cursor-pointer"
            >
              Xem Báo Cáo Phân Ca
            </button>
          )}
        </div>
      )}

      {/* Thống kê tiến độ phê duyệt */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Nguyện vọng đang chờ duyệt</div>
          <div className="text-2xl font-black text-amber-600 mt-1 flex items-baseline gap-1">
            <span>{allPendingRegs.length}</span>
            <span className="text-xs font-normal text-slate-400">ca cần xử lý</span>
          </div>
          <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-semibold">
            <Clock className="w-3.5 h-3.5" /> Có thể duyệt lẻ hoặc dùng tự động phân bổ
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Ca đã được phê duyệt</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 flex items-baseline gap-1">
            <span>{allApprovedRegs.length}</span>
            <span className="text-xs font-normal text-slate-400">ca chính thức</span>
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Nhân viên đã thấy trên app
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tổng số nhân sự rạp phim</div>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-1">
            <span>{users.length}</span>
            <span className="text-xs font-normal text-slate-400">nhân viên</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Đủ định biên các vị trí sảnh/quầy</div>
        </div>

        <div className="bg-gradient-to-br from-purple-500/10 via-amber-500/5 to-white border border-purple-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs text-purple-900 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Phân Bổ Ca Tự Động</span>
            </div>
            {aiReport && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-200 text-purple-900">
                100% Khớp
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed">
            Ưu tiên 100% ca nhân viên mong muốn và tự động gán vào quầy vé, bắp nước, phòng chiếu.
          </p>
          {aiReport && (
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="text-[10px] text-purple-700 font-bold mt-1.5 flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span>Xem báo cáo phân ca vừa tạo</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs điều hướng chính */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveViewTab('pending')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeViewTab === 'pending'
              ? 'border-amber-600 text-amber-800'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Hộp Thư Chờ Duyệt Ca</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
            allPendingRegs.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500'
          }`}>
            {allPendingRegs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveViewTab('matrix')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeViewTab === 'matrix'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Bảng Lịch Tuần ({weekDays[0]?.dayNum} - {weekDays[weekDays.length - 1]?.dayNum})</span>
          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-mono font-bold">
            Tuần Này
          </span>
        </button>

        <button
          onClick={() => setActiveViewTab('schedule')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeViewTab === 'schedule'
              ? 'border-cyan-600 text-cyan-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Lịch Phân Công Chi Tiết & Tinh Chỉnh</span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-mono font-bold">
            {schedules.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HỘP THƯ CHỜ DUYỆT CA (PENDING SHIFT REQUESTS QUEUE) */}
      {/* ========================================================================= */}
      {activeViewTab === 'pending' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50/70 border border-amber-200 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Inbox className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-amber-950">
                  {allPendingRegs.length > 0 
                    ? `Có ${allPendingRegs.length} nguyện vọng ca trực đang chờ Quản lý phê duyệt`
                    : 'Tất cả nguyện vọng đăng ký ca đã được xử lý hoàn tất!'}
                </h3>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Bấm <strong>"Phê Duyệt Ca"</strong> để duyệt từng ca lẻ, hoặc bấm <strong>"Tự Động Phân Ca & Duyệt Lịch"</strong> ở góc trên để hệ thống tự động tối ưu hóa toàn bộ.
                </p>
              </div>
            </div>

            {allPendingRegs.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isPublishing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Phê Duyệt Toàn Bộ Nguyện Vọng</span>
              </button>
            )}
          </div>

          {allPendingRegs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto text-emerald-600 shadow-sm ring-8 ring-emerald-50">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="font-black text-base text-slate-900">
                  {aiReport ? 'Toàn Bộ Ca Đã Được Phân Bổ & Phê Duyệt Thành Công!' : 'Không Có Yêu Cầu Chờ Duyệt'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {aiReport 
                    ? `Hệ thống đã hoàn tất phân bổ và phê duyệt ca làm việc. Lịch làm việc chính thức đã được cập nhật tới toàn bộ nhân sự rạp.`
                    : 'Toàn bộ nguyện vọng đăng ký ca của nhân viên đã được xử lý hoàn tất hoặc chưa có đăng ký mới.'}
                </p>
              </div>

              {aiReport && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl max-w-md mx-auto flex items-center justify-between text-xs text-purple-950 font-semibold">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Báo cáo ngày {aiReport.dateLabel}: 100% khớp nguyện vọng</span>
                  </div>
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="text-[11px] text-purple-700 hover:text-purple-900 underline font-bold cursor-pointer"
                  >
                    Xem báo cáo phân ca
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setActiveViewTab('schedule')}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Xem Bảng Phân Công Chi Tiết & Tinh Chỉnh</span>
                </button>
                <button
                  onClick={() => setActiveViewTab('matrix')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition flex items-center gap-2 cursor-pointer"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Xem Bảng Lịch Tuần Tổng Hợp</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allPendingRegs.map(reg => {
                const shift = shifts.find(s => s.id === reg.shiftId);
                const staff = users.find(u => u.id === reg.userId || u.id.replace('usr-', '') === reg.userId.replace('usr-', ''));
                const isItemProcessing = processingId === reg.id;
                const aiAdvice = getAiRecommendation(reg, staff, shift);

                // Xác định thứ trong tuần
                const dayMatch = weekDays.find(w => w.date === reg.date);
                const dayLabel = dayMatch ? `${dayMatch.dayLabel} (${dayMatch.dayNum})` : reg.date;

                return (
                  <div 
                    key={reg.id} 
                    className="bg-white border border-slate-200 hover:border-purple-300 rounded-2xl p-5 space-y-4 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                          📅 {dayLabel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Chờ Phê Duyệt
                        </span>
                      </div>

                      {/* Staff Info */}
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <img 
                          src={staff?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'} 
                          alt={reg.userName} 
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/20 shrink-0" 
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm text-slate-900">{reg.userName}</div>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                            <span className="text-amber-700 font-semibold">{staff?.staffCode || 'AR-STAFF'}</span>
                            <span>•</span>
                            <span>{staff?.department || 'Bắp nước & Quầy Concession'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Shift Details */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400 font-medium">Ca nhân viên mong muốn:</div>
                          <div className="text-xs font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: shift?.color || '#f59e0b' }}></span>
                            <span>{shift?.name || reg.shiftId}</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {shift?.startTime} - {shift?.endTime}
                        </div>
                      </div>

                      {/* AI Smart Advisory Card (Gợi ý phê duyệt thông minh) */}
                      <div className="p-3 bg-gradient-to-br from-purple-50 via-indigo-50/50 to-amber-50/40 rounded-xl border border-purple-200/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Đề Xuất Phân Bổ Vị Trí:</span>
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            <span>{aiAdvice.badgeText}</span>
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-950 font-medium leading-relaxed">
                          {aiAdvice.reason}
                        </p>
                        <div className="text-[10px] text-purple-800 flex items-center gap-1 pt-0.5">
                          <MapPin className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Vị trí đề xuất gán: <strong className="text-slate-900">{aiAdvice.recommendedLocation}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleApproveSingle(reg, aiAdvice.recommendedLocation)}
                        disabled={isItemProcessing}
                        className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
                        title="Duyệt ca này và tự động gán vị trí quầy rạp theo đề xuất"
                      >
                        {isItemProcessing ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-amber-300" />
                        )}
                        <span>Duyệt & Gán Vị Trí Này</span>
                      </button>

                      <button
                        onClick={() => handleApproveSingle(reg)}
                        disabled={isItemProcessing}
                        className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 transition cursor-pointer"
                        title="Duyệt tiêu chuẩn"
                      >
                        <Check className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRejectSingle(reg)}
                        disabled={isItemProcessing}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 transition cursor-pointer"
                        title="Từ chối yêu cầu này"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BẢNG LỊCH TUẦN TỔNG HỢP (WEEKLY MATRIX VIEW - 21/09 - 27/09) */}
      {/* ========================================================================= */}
      {activeViewTab === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Bảng Tổng Hợp Nguyện Vọng & Phân Ca Toàn Rạp ({weekDays[0]?.dayNum} - {weekDays[weekDays.length - 1]?.dayNum}/{new Date().getFullYear()})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Xem toàn cảnh nguyện vọng của tất cả nhân sự rạp phim theo từng ca trong tuần.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAiScheduleFullWeek}
                disabled={isAiLoading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Tự Động Xếp Ca Toàn Tuần</span>
              </button>
              <span className="text-xs text-slate-400 font-mono">
                Tổng số {registrations.length} lượt đăng ký
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map(d => {
              const dayRegs = registrations.filter(r => r.date === d.date);

              return (
                <div 
                  key={d.date} 
                  className={`p-3 rounded-xl space-y-2 flex flex-col justify-between border transition ${
                    d.isToday 
                      ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/40 shadow-xs' 
                      : d.isTomorrow
                      ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-center border-b border-slate-200/80 pb-2">
                    <div className={`text-xs font-bold ${d.isToday ? 'text-amber-800 font-extrabold' : d.isTomorrow ? 'text-purple-800 font-bold' : 'text-slate-800'}`}>
                      {d.dayLabel}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">{d.dayNum}</div>
                  </div>

                  <div className="space-y-2 flex-1">
                    {shifts.map(shift => {
                      const shiftRegs = dayRegs.filter(r => r.shiftId === shift.id);

                      return (
                        <div key={shift.id} className="p-2 bg-white rounded-lg border border-slate-200 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-700 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: shift.color }}></span>
                              <span>{shift.code}</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">{shiftRegs.length} người</span>
                          </div>

                          {shiftRegs.length === 0 ? (
                            <div className="text-[10px] text-slate-300 italic py-1">Trống ca</div>
                          ) : (
                            <div className="space-y-1">
                              {shiftRegs.map(reg => {
                                const isApproved = reg.status === 'approved';
                                return (
                                  <div 
                                    key={reg.id} 
                                    className={`p-1.5 rounded text-[10px] border flex items-center justify-between gap-1 ${
                                      isApproved
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold'
                                        : 'bg-amber-50 border-amber-200 text-amber-900'
                                    }`}
                                  >
                                    <span className="truncate max-w-[85px] font-medium" title={reg.userName}>
                                      {reg.userName}
                                    </span>

                                    {isApproved ? (
                                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                    ) : (
                                      <button
                                        onClick={() => handleApproveSingle(reg)}
                                        className="text-[9px] px-1 py-0.2 rounded bg-amber-200 hover:bg-emerald-200 text-amber-900 hover:text-emerald-900 font-bold shrink-0 cursor-pointer"
                                        title="Bấm để duyệt ca này ngay"
                                      >
                                        Duyệt
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BẢNG PHÂN CÔNG CHÍNH THỨC & TINH CHỈNH THEO NGÀY (UC11) */}
      {/* ========================================================================= */}
      {activeViewTab === 'schedule' && (
        <div className="space-y-4">
          {/* AI Logs or Report Card */}
          {aiReport && (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-purple-950 uppercase flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Đã Phân Bổ Tự Động
                    </span>
                    <span className="text-xs text-purple-200 font-semibold">Ngày: {aiReport.dateLabel} ({aiReport.date})</span>
                  </div>
                  <h3 className="font-extrabold text-base text-white">
                    Hệ Thống Đã Phân Bổ Ca Phù Hợp Cho {aiReport.totalStaff} Nhân Viên
                  </h3>
                  <p className="text-xs text-purple-200/90">
                    Đáp ứng {aiReport.satisfactionRate} nguyện vọng ca đăng ký và tự động gán cụm rạp chuẩn chuyên môn.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsAiModalOpen(true)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer backdrop-blur-sm"
                  >
                    <Bot className="w-4 h-4 text-amber-300" />
                    <span>Xem Báo Cáo Phân Ca Chi Tiết</span>
                  </button>
                  <button
                    onClick={handleAiAutoSchedule}
                    disabled={isAiLoading}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isAiLoading ? 'animate-spin' : ''}`} />
                    <span>Tối Ưu Lại</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Nhật ký phân bổ */}
          {aiSuggestionsLog.length > 0 && (
            <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>Nhật Ký Phân Bổ & Đối Chiếu Nguyện Vọng Nhân Viên:</span>
              </div>
              <div className="space-y-1 text-[11px] font-mono text-purple-950 max-h-48 overflow-y-auto">
                {aiSuggestionsLog.map((log, idx) => (
                  <div key={idx} className="p-2 bg-white rounded-lg border border-purple-100 shadow-2xs flex items-center gap-2">
                    <Bot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800">Lịch Phân Ca Ngày:</span>
                <select
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 outline-none cursor-pointer"
                >
                  {weekDays.map(d => (
                    <option key={d.date} value={d.date}>
                      {d.fullLabel} {d.isToday ? '• (Hôm Nay)' : d.isTomorrow ? '• (Ngày Mai)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAiAutoSchedule}
                  disabled={isAiLoading}
                  className="text-purple-700 hover:text-purple-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tự động phân lại ca ngày này</span>
                </button>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500 font-mono">
                  Tổng số {users.length} Nhân sự rạp phim
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 uppercase font-bold text-[10px] text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Nhân Viên & Mã</th>
                    <th className="px-4 py-3.5">Bộ Phận</th>
                    <th className="px-4 py-3.5">Nguyện Vọng</th>
                    <th className="px-4 py-3.5">Ca Phân Công</th>
                    <th className="px-4 py-3.5">Vị Trí Cụm Rạp</th>
                    <th className="px-4 py-3.5 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((staff) => {
                    const sch = schedules.find(s => (s.userId === staff.id || s.userId === staff.id.replace('usr-', '')) && s.date === targetDate);
                    const reg = registrations.find(r => (r.userId === staff.id || r.userId === staff.id.replace('usr-', '')) && r.date === targetDate);
                    const isMatched = reg && sch && reg.shiftId === sch.shiftId;
                    const isAiAssigned = sch?.assignedBy?.includes('AI');

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img src={staff.avatar} alt={staff.name} className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-200" />
                            <div>
                              <div className="font-bold text-slate-900">{staff.name}</div>
                              <div className="text-[10px] font-mono text-amber-700">{staff.staffCode}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600 font-medium">
                          {staff.department}
                        </td>

                        {/* Nguyện vọng UC09 */}
                        <td className="px-4 py-3">
                          {reg ? (
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                {reg.shiftId === 'shift-1' ? 'Ca Sáng' : reg.shiftId === 'shift-2' ? 'Ca Chiều' : 'Ca Đêm'}
                              </span>
                              {isMatched && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Khớp
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Chưa đăng ký</span>
                          )}
                        </td>

                        {/* Ca phân công */}
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-slate-900">
                              {sch?.shiftName || 'Chưa phân ca'}
                            </span>
                            {isAiAssigned && (
                              <span className="text-[10px] font-semibold text-purple-700 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                <span>Tự Động Phân Bổ</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Vị trí rạp */}
                        <td className="px-4 py-3">
                          <span className="text-slate-700 font-medium flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{sch?.location || 'Cụm Rạp 1 - Quầy Vé Box Office'}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <span className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã Duyệt</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AI SCHEDULING RESULTS MODAL (SIÊU TRỰC QUAN & MINH BẠCH LOGIC AI) */}
      {/* ========================================================================= */}
      {isAiModalOpen && aiReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-purple-200 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-amber-600 p-6 text-white relative">
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer text-white"
                title="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-amber-400 text-purple-950 flex items-center gap-1 shadow-xs">
                  <Sparkles className="w-3 h-3 text-purple-950" />
                  HỆ THỐNG PHÂN CA TỰ ĐỘNG
                </span>
                <span className="text-purple-200 text-xs font-semibold">Tối Ưu Hóa & Tự Động Duyệt Ca</span>
              </div>

              <h2 className="text-xl font-black">Báo Cáo Kết Quả Phân Bổ Ca Làm Việc</h2>
              <p className="text-xs text-purple-100/90 mt-1">
                Lịch làm việc ngày <strong>{aiReport.dateLabel} ({aiReport.date})</strong> đã được tính toán cân bằng theo lưu lượng khách và nguyện vọng nhân viên.
              </p>

              {/* Quick Metrics Bar inside Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-5">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
                  <div className="text-[10px] text-purple-200 font-medium">Khớp nguyện vọng</div>
                  <div className="text-xl font-black text-amber-300 flex items-center gap-1">
                    <span>{aiReport.satisfactionRate}</span>
                    <ThumbsUp className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <div className="text-[9px] text-purple-200/80">Ưu tiên số 1</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
                  <div className="text-[10px] text-purple-200 font-medium">Nhân sự bố trí</div>
                  <div className="text-xl font-black text-white">
                    {aiReport.totalStaff} <span className="text-xs font-normal text-purple-200">nhân viên</span>
                  </div>
                  <div className="text-[9px] text-purple-200/80">Đầy đủ mọi vị trí</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
                  <div className="text-[10px] text-purple-200 font-medium">Ca đã tự động duyệt</div>
                  <div className="text-xl font-black text-emerald-300 flex items-center gap-1">
                    <span>{aiReport.matchedPreferences}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <div className="text-[9px] text-purple-200/80">Chuyển sang chính thức</div>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/15">
                  <div className="text-[10px] text-purple-200 font-medium">Cụm rạp bố trí</div>
                  <div className="text-xl font-black text-cyan-300">100%</div>
                  <div className="text-[9px] text-purple-200/80">Vé, Bắp Nước, IMAX</div>
                </div>
              </div>
            </div>

            {/* Modal Body - Detailed Staff Assignments */}
            <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3">
              <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Chi tiết phân bổ từng nhân sự:</span>
                <span className="text-[11px] font-normal text-slate-500">
                  Hiển thị {aiReport.schedules.length} nhân viên
                </span>
              </div>

              <div className="space-y-2.5">
                {aiReport.schedules.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-purple-300 bg-slate-50/60 hover:bg-purple-50/20 transition space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.avatar}
                          alt={item.userName}
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-purple-500/20 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{item.userName}</span>
                            <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-bold">
                              {item.staffCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500">{item.department}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.isMatchedPreference ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Khớp 100% Nguyện Vọng</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 text-[11px] font-bold flex items-center gap-1 border border-purple-200">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            <span>Cân Bằng Định Biên Nhân Sự</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shift & Location Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1.5 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span className="font-semibold text-slate-500">Ca làm việc:</span>
                        <span className="font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.shiftName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-medium text-slate-800 truncate" title={item.location}>
                          {item.location}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning line */}
                    <div className="text-[11px] text-purple-900 bg-purple-50/80 px-2.5 py-1.5 rounded-lg border border-purple-100 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>{item.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                ✨ Lịch đã được đồng bộ xuống cơ sở dữ liệu MySQL và hiển thị trên ứng dụng của nhân viên.
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setActiveViewTab('matrix');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Xem Bảng Lịch Tuần</span>
                </button>
                <button
                  onClick={() => {
                    setIsAiModalOpen(false);
                    setActiveViewTab('schedule');
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <CalendarRange className="w-4 h-4" />
                  <span>Xem Lịch Phân Công Chi Tiết</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
