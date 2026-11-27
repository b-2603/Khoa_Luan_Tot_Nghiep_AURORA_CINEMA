import React, { useState, useMemo } from 'react';
import { User, WorkSchedule } from '../types';
import { getUsers, getWorkSchedules } from '../services/storage';
import {
  SHIFT_DEFS,
  MIN_SHIFTS_PER_WEEK,
  SWAP_MIN_NOTICE_HOURS,
  REGISTRATION_OPEN_FROM_DAY,
  REGISTRATION_OPEN_TO_DAY,
  Availability,
  getAvailability,
  saveAvailability,
  availableDaysPerWeek,
  getMonthKey,
  shiftMonth,
  getMonthDates,
  monthLabel,
  parseDate,
  toDateStr,
  createSwapRequest,
  getSwapRequests,
  getInvitationsFor,
  acceptSwap,
  declineSwap,
  cancelSwap,
  SwapRequest,
} from '../services/shiftPlanner';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Lock,
  Unlock,
  Save,
  Repeat,
  AlertTriangle,
  Users,
  X,
  ArrowRight,
  Info,
  Sun,
  Sunset,
  Moon,
  MapPin,
  RotateCcw,
} from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

interface StaffShiftRegisterPageProps {
  currentUser: User;
  onNavigateToSchedule?: () => void;
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABEL: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  0: 'Chủ nhật',
};

const SHIFT_META: Record<string, { icon: React.ElementType; on: string; off: string; time: string }> = {
  'shift-1': {
    icon: Sun,
    on: 'bg-amber-500 border-amber-500 text-slate-950',
    off: 'bg-white border-slate-200 text-slate-500 hover:border-amber-300 hover:bg-amber-50/50',
    time: '08:00 – 16:00',
  },
  'shift-2': {
    icon: Sunset,
    on: 'bg-indigo-600 border-indigo-600 text-white',
    off: 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:bg-indigo-50/50',
    time: '15:30 – 23:00',
  },
  'shift-3': {
    icon: Moon,
    on: 'bg-slate-900 border-slate-900 text-white',
    off: 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:bg-slate-50',
    time: '22:00 – 02:00',
  },
};

const sameUser = (a?: string, b?: string) =>
  Boolean(a && b) && String(a).replace('usr-', '') === String(b).replace('usr-', '');

export const StaffShiftRegisterPage: React.FC<StaffShiftRegisterPageProps> = ({ currentUser, onNavigateToSchedule }) => {
  const targetMonth = useMemo(() => shiftMonth(getMonthKey(new Date()), 1), []);
  const staffList = useMemo(() => getUsers().filter(u => u.role === 'staff'), []);
  const todayStr = toDateStr(new Date());

  const initial = getAvailability(currentUser, targetMonth);
  const [weekly, setWeekly] = useState<Record<number, string[]>>(initial.availability.weekly);
  const [blocked, setBlocked] = useState<string[]>(initial.availability.blockedDates);
  const [isSaved, setIsSaved] = useState(initial.saved);
  const [isInherited, setIsInherited] = useState(initial.inherited);
  const [dirty, setDirty] = useState(false);

  const [gateMode, setGateMode] = useState<'open' | 'locked' | 'realtime'>('open');
  const dayOfMonth = new Date().getDate();
  const realtimeOpen = dayOfMonth >= REGISTRATION_OPEN_FROM_DAY && dayOfMonth <= REGISTRATION_OPEN_TO_DAY;
  const isOpen = gateMode === 'open' ? true : gateMode === 'locked' ? false : realtimeOpen;

  const [schedules, setSchedules] = useState<WorkSchedule[]>(getWorkSchedules());
  const [swaps, setSwaps] = useState<SwapRequest[]>(getSwapRequests());
  const [invitations, setInvitations] = useState<SwapRequest[]>(getInvitationsFor(currentUser.id));
  const [swapTarget, setSwapTarget] = useState<WorkSchedule | null>(null);
  const [swapReason, setSwapReason] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const refreshSwapData = () => {
    setSchedules(getWorkSchedules());
    setSwaps(getSwapRequests());
    setInvitations(getInvitationsFor(currentUser.id));
  };

  const guardOpen = (msg: string) => {
    if (!isOpen) {
      showToast('error', msg);
      return false;
    }
    return true;
  };

  const toggleShift = (dow: number, shiftId: string) => {
    if (!guardOpen('Cổng cập nhật lịch rảnh đang khóa. Nếu bận một ngày cụ thể, hãy dùng nút "Báo bận" ở ca của bạn bên dưới.')) return;
    setWeekly(prev => {
      const list = prev[dow] || [];
      const next = list.includes(shiftId) ? list.filter(s => s !== shiftId) : [...list, shiftId];
      return { ...prev, [dow]: next };
    });
    setDirty(true);
  };

  const toggleWholeDay = (dow: number) => {
    if (!guardOpen('Cổng cập nhật lịch rảnh đang khóa.')) return;
    setWeekly(prev => {
      const all = SHIFT_DEFS.map(s => s.id);
      const hasAll = all.every(id => (prev[dow] || []).includes(id));
      return { ...prev, [dow]: hasAll ? [] : all };
    });
    setDirty(true);
  };

  const applyPreset = (preset: 'weekdays' | 'all' | 'clear') => {
    if (!guardOpen('Cổng cập nhật lịch rảnh đang khóa.')) return;
    const all = SHIFT_DEFS.map(s => s.id);
    const next: Record<number, string[]> = {};
    WEEK_ORDER.forEach(dow => {
      const isWeekday = dow >= 1 && dow <= 5;
      next[dow] = preset === 'all' ? [...all] : preset === 'weekdays' && isWeekday ? [...all] : [];
    });
    setWeekly(next);
    setDirty(true);
  };

  const toggleBlocked = (date: string) => {
    if (!guardOpen('Cổng cập nhật lịch rảnh đang khóa. Hãy dùng nút "Báo bận" ở ca của bạn bên dưới.')) return;
    setBlocked(prev => (prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]));
    setDirty(true);
  };

  const draftAvailability: Availability = {
    userId: currentUser.id,
    userName: currentUser.name,
    month: targetMonth,
    weekly,
    blockedDates: blocked,
    updatedAt: '',
  };
  const freeDays = availableDaysPerWeek(draftAvailability);
  const freePct = Math.min(100, Math.round((freeDays / 7) * 100));
  const meetsMin = freeDays >= MIN_SHIFTS_PER_WEEK;

  const handleSave = () => {
    if (!meetsMin) {
      showToast('error', `Bạn cần rảnh ít nhất ${MIN_SHIFTS_PER_WEEK} ngày mỗi tuần để hệ thống xếp đủ ca. Hiện mới chọn ${freeDays} ngày.`);
      return;
    }
    saveAvailability(draftAvailability);
    setIsSaved(true);
    setIsInherited(false);
    setDirty(false);
    showToast('success', `Đã lưu lịch rảnh ${monthLabel(targetMonth)}. Tháng sau hệ thống sẽ tự dùng lại lịch này.`);
  };

  const monthDates = getMonthDates(targetMonth);
  const firstDow = (parseDate(monthDates[0]).getDay() + 6) % 7;

  const mySchedules = schedules
    .filter(s => sameUser(s.userId, currentUser.id) && s.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.shiftId.localeCompare(b.shiftId));

  const swapOf = (scheduleId: string) => swaps.find(r => r.scheduleId === scheduleId && r.status !== 'cancelled');

  const submitSwap = () => {
    if (!swapTarget) return;
    if (!swapReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do bận.');
      return;
    }
    const result = createSwapRequest(swapTarget, swapReason.trim(), currentUser, staffList);
    setSwapTarget(null);
    setSwapReason('');
    refreshSwapData();
    if (result.status === 'waiting') {
      showToast('success', `Đã gửi lời mời nhận ca đến ${result.candidateIds.length} đồng nghiệp đang rảnh. Ai nhận trước sẽ thay bạn.`);
    } else {
      showToast('info', `Chưa tự tìm được người thay (${result.escalateReason}). Yêu cầu đã chuyển Quản lý xử lý.`);
    }
  };

  const handleAccept = (req: SwapRequest) => {
    const res = acceptSwap(req.id, currentUser, staffList);
    refreshSwapData();
    showToast(res.ok ? 'success' : 'error', res.message);
  };

  const handleDecline = (req: SwapRequest) => {
    declineSwap(req.id, currentUser, staffList);
    refreshSwapData();
    showToast('info', 'Đã từ chối lời mời nhận ca.');
  };

  const handleCancelSwap = (req: SwapRequest) => {
    cancelSwap(req.id);
    refreshSwapData();
    showToast('info', 'Đã hủy yêu cầu báo bận, bạn vẫn giữ ca này.');
  };

  const shiftIconOf = (shiftId: string) => {
    const Icon = SHIFT_META[shiftId]?.icon || Clock;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md flex items-start gap-2.5 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-semibold ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : toast.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <Info className="w-4.5 h-4.5 shrink-0 mt-0.5" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Đăng Ký Lịch Rảnh • {monthLabel(targetMonth)}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    isOpen
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {isOpen ? 'Đang mở' : `Đã khóa (mở ngày ${REGISTRATION_OPEN_FROM_DAY}–${REGISTRATION_OPEN_TO_DAY})`}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Chọn ca bạn rảnh một lần, hệ thống tự xếp lịch cả tháng và tự dùng lại cho tháng sau.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={gateMode}
              onChange={e => setGateMode(e.target.value as 'open' | 'locked' | 'realtime')}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-pointer focus:outline-none focus:border-amber-400"
              title="Chế độ xem thử cổng đăng ký"
            >
              <option value="open">Xem thử: Cổng mở</option>
              <option value="locked">Xem thử: Cổng khóa</option>
              <option value="realtime">Theo ngày thật</option>
            </select>
            {onNavigateToSchedule && (
              <button
                onClick={onNavigateToSchedule}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition"
              >
                <span>Xem lịch chính thức</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* 3-step guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            { n: 1, t: 'Chọn ca rảnh theo tuần', d: 'Bấm vào các ca bạn có thể đi làm' },
            { n: 2, t: 'Đánh dấu ngày bận', d: 'Ngày không thể đi làm trong tháng' },
            { n: 3, t: 'Lưu & chờ xếp lịch', d: 'Quản lý xuất bản lịch chính thức' },
          ].map(s => (
            <div key={s.n} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/70">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                {s.n}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">{s.t}</div>
                <div className="text-xs text-slate-500">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Swap invitations */}
      {invitations.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <Users className="w-4.5 h-4.5 text-amber-700" />
            <span>Đồng nghiệp nhờ bạn nhận ca thay ({invitations.length})</span>
          </div>
          {invitations.map(req => (
            <div
              key={req.id}
              className="p-4 bg-white border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="text-sm text-slate-800">
                <div className="font-semibold">
                  {req.shiftName} • {formatDateDMY(req.date)}
                </div>
                <div className="text-slate-500 text-xs mt-0.5">
                  {req.fromUserName} bận: {req.reason}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Nhận ca
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer transition"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT: Weekly availability */}
        <section className="lg:col-span-7 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ca rảnh lặp lại mỗi tuần</h3>
                <p className="text-xs text-slate-500">Bấm vào ca bạn có thể đi làm</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('weekdays')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition cursor-pointer"
              >
                T2–T6
              </button>
              <button
                type="button"
                onClick={() => applyPreset('all')}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200/80 rounded-lg transition cursor-pointer"
              >
                Cả tuần
              </button>
              <button
                type="button"
                onClick={() => applyPreset('clear')}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                title="Bỏ chọn tất cả"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-6 pt-4 space-y-3">
            {isInherited && !dirty && (
              <div className="px-4 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-800 font-medium flex items-center gap-2">
                <Repeat className="w-3.5 h-3.5 shrink-0" />
                Đang dùng lại lịch rảnh tháng trước. Nếu không có gì thay đổi, bạn không cần làm gì thêm.
              </div>
            )}
            {isSaved && !dirty && (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                Lịch rảnh {monthLabel(targetMonth)} đã được lưu.
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="px-6 pt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
            {SHIFT_DEFS.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1.5">
                {shiftIconOf(s.id)}
                <strong className="text-slate-700">{s.short}</strong>
                <span className="font-mono">{SHIFT_META[s.id]?.time}</span>
              </span>
            ))}
          </div>

          <div className="p-6 space-y-2.5">
            {WEEK_ORDER.map(dow => {
              const dayShifts = weekly[dow] || [];
              const isWeekend = dow === 0 || dow === 6;
              const allOn = SHIFT_DEFS.every(s => dayShifts.includes(s.id));
              return (
                <div
                  key={dow}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-xl border ${
                    dayShifts.length > 0 ? 'border-slate-200 bg-slate-50/60' : 'border-slate-100 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleWholeDay(dow)}
                    className="sm:w-24 text-left shrink-0 cursor-pointer group"
                    title="Bấm để chọn / bỏ cả ngày"
                  >
                    <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition">
                      {DOW_LABEL[dow]}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {dayShifts.length === 0 ? 'Nghỉ' : allOn ? 'Cả ngày' : `${dayShifts.length} ca`}
                      {isWeekend && ' • Lương ×1.2'}
                    </div>
                  </button>

                  <div className="grid grid-cols-3 gap-2 flex-1">
                    {SHIFT_DEFS.map(s => {
                      const on = dayShifts.includes(s.id);
                      const meta = SHIFT_META[s.id];
                      const Icon = meta?.icon || Clock;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleShift(dow, s.id)}
                          className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-xl border-2 transition cursor-pointer ${
                            on ? meta?.on : meta?.off
                          }`}
                        >
                          <span className="flex items-center gap-1 text-xs font-bold">
                            <Icon className="w-3.5 h-3.5" />
                            {s.short.replace('Ca ', '')}
                          </span>
                          <span className={`text-[10px] font-mono ${on ? 'opacity-80' : 'text-slate-400'}`}>
                            {meta?.time}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Blocked dates + summary + save */}
        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-4">
          <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ngày bận đột xuất</h3>
                <p className="text-xs text-slate-500">Bấm ngày không thể đi làm trong tháng</p>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(l => (
                  <div key={l}>{l}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDow }).map((_, i) => (
                  <div key={`b-${i}`} />
                ))}
                {monthDates.map(date => {
                  const isBlocked = blocked.includes(date);
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => toggleBlocked(date)}
                      className={`aspect-square rounded-lg text-xs font-semibold border transition cursor-pointer ${
                        isBlocked
                          ? 'bg-rose-500 border-rose-500 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {Number(date.slice(8))}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Ngày bận
                </span>
                <span>
                  Đã chọn <strong className="text-slate-800">{blocked.length}</strong> ngày
                </span>
              </div>
            </div>
          </section>

          {/* Summary & save */}
          <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Tổng kết lịch rảnh</span>
              <span className={`text-xs font-bold ${meetsMin ? 'text-emerald-700' : 'text-amber-700'}`}>
                {freeDays}/7 ngày
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${meetsMin ? 'bg-emerald-500' : 'bg-amber-500'}`}
                style={{ width: `${freePct}%` }}
              />
            </div>
            <p className={`text-xs ${meetsMin ? 'text-emerald-700' : 'text-amber-800'}`}>
              {meetsMin
                ? `Đạt yêu cầu: rảnh từ ${MIN_SHIFTS_PER_WEEK} ngày/tuần trở lên.`
                : `Cần rảnh tối thiểu ${MIN_SHIFTS_PER_WEEK} ngày/tuần (còn thiếu ${MIN_SHIFTS_PER_WEEK - freeDays} ngày).`}
            </p>
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty}
              className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                dirty
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{dirty ? `Lưu lịch rảnh ${monthLabel(targetMonth)}` : 'Chưa có thay đổi'}</span>
            </button>
          </section>
        </aside>
      </div>

      {/* Upcoming shifts */}
      <section className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 text-xs font-bold flex items-center justify-center">
            3
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Ca sắp tới của tôi</h3>
            <p className="text-xs text-slate-500">
              Bận thì bấm "Báo bận" trước giờ làm ít nhất {SWAP_MIN_NOTICE_HOURS} giờ, hệ thống tự tìm người thay
            </p>
          </div>
        </div>

        {mySchedules.length === 0 ? (
          <div className="py-12 px-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <CalendarDays className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Chưa có ca nào sắp tới</p>
            <p className="text-xs text-slate-400 mt-0.5">Quản lý sẽ xuất bản lịch sau khi hệ thống xếp xong</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mySchedules.slice(0, 12).map(s => {
              const req = swapOf(s.id);
              const meta = SHIFT_META[s.shiftId];
              const d = parseDate(s.date);
              return (
                <div
                  key={s.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 text-center shrink-0">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase">
                        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()]}
                      </div>
                      <div className="text-xl font-bold text-slate-900 leading-none">{d.getDate()}</div>
                      <div className="text-[10px] text-slate-400">Th {d.getMonth() + 1}</div>
                    </div>
                    <div className="h-10 w-px bg-slate-200" />
                    <div>
                      <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        {shiftIconOf(s.shiftId)}
                        {s.shiftName}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {meta && <span className="font-mono">{meta.time}</span>}
                        <span className="text-slate-300">•</span>
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span className="truncate">{s.location}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req?.status === 'waiting' && (
                      <>
                        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                          Chờ đồng nghiệp nhận ({req.candidateIds.length} người được mời)
                        </span>
                        <button
                          onClick={() => handleCancelSwap(req)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition"
                        >
                          Hủy yêu cầu
                        </button>
                      </>
                    )}
                    {req?.status === 'escalated' && (
                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Đã chuyển Quản lý xử lý
                      </span>
                    )}
                    {req?.status === 'accepted' && (
                      <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã có người thay: {req.acceptedByName}
                      </span>
                    )}
                    {!req && (
                      <button
                        onClick={() => {
                          setSwapTarget(s);
                          setSwapReason('');
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <Repeat className="w-3.5 h-3.5" />
                        Báo bận
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Swap modal */}
      {swapTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
          onClick={() => setSwapTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Báo bận và nhờ đổi ca</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {swapTarget.shiftName} • {formatDateDMY(swapTarget.date)}
                </p>
              </div>
              <button
                onClick={() => setSwapTarget(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['Lịch thi / học', 'Việc gia đình', 'Sức khỏe', 'Sự cố phương tiện'].map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSwapReason(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    swapReason === r
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            <textarea
              value={swapReason}
              onChange={e => setSwapReason(e.target.value)}
              rows={3}
              placeholder="Lý do bận (ví dụ: lịch thi, việc gia đình...)"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 resize-none"
            />

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSwapTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer transition"
              >
                Đóng
              </button>
              <button
                onClick={submitSwap}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded-xl cursor-pointer transition"
              >
                Gửi yêu cầu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
