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

  const toggleShift = (dow: number, shiftId: string) => {
    if (!isOpen) {
      showToast('error', 'Cổng cập nhật lịch rảnh đang khóa. Nếu bận một ngày cụ thể, hãy dùng nút "Báo bận" ở ca của bạn bên dưới.');
      return;
    }
    setWeekly(prev => {
      const list = prev[dow] || [];
      const next = list.includes(shiftId) ? list.filter(s => s !== shiftId) : [...list, shiftId];
      return { ...prev, [dow]: next };
    });
    setDirty(true);
  };

  const toggleBlocked = (date: string) => {
    if (!isOpen) {
      showToast('error', 'Cổng cập nhật lịch rảnh đang khóa. Hãy dùng nút "Báo bận" ở ca của bạn bên dưới.');
      return;
    }
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

  const handleSave = () => {
    if (freeDays < MIN_SHIFTS_PER_WEEK) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">Lịch Rảnh Làm Việc {monthLabel(targetMonth)}</h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 border ${
                isOpen
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {isOpen ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {isOpen
                ? 'Đang mở cập nhật'
                : `Cổng khóa (mở ngày ${REGISTRATION_OPEN_FROM_DAY}–${REGISTRATION_OPEN_TO_DAY} hàng tháng)`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ cần chọn những ngày và ca bạn rảnh một lần. Hệ thống tự xếp lịch cả tháng, tháng sau tự dùng lại. Khi bận một ngày thì báo bận để đổi ca.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={gateMode}
            onChange={e => setGateMode(e.target.value as 'open' | 'locked' | 'realtime')}
            className="px-2.5 py-2 bg-white border border-slate-300 rounded-xl text-[11px] font-semibold text-slate-700 cursor-pointer"
            title="Chế độ xem thử cổng đăng ký"
          >
            <option value="open">Xem thử: Cổng mở</option>
            <option value="locked">Xem thử: Cổng khóa</option>
            <option value="realtime">Theo ngày thật</option>
          </select>
          {onNavigateToSchedule && (
            <button
              onClick={onNavigateToSchedule}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <span>Xem Lịch Chính Thức</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold border shadow-sm flex items-start gap-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{toast.text}</span>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <Users className="w-4 h-4 text-amber-700" />
            <span>Đồng nghiệp nhờ bạn nhận ca thay ({invitations.length})</span>
          </div>
          {invitations.map(req => (
            <div
              key={req.id}
              className="p-3 bg-white border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="text-xs text-slate-800">
                <div className="font-bold">
                  {req.shiftName} • {formatDateDMY(req.date)}
                </div>
                <div className="text-slate-500 mt-0.5">
                  {req.fromUserName} bận: {req.reason}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAccept(req)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Nhận ca
                </button>
                <button
                  onClick={() => handleDecline(req)}
                  className="px-3.5 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900">1. Khung giờ rảnh lặp lại mỗi tuần</h3>
              <p className="text-xs text-slate-500 mt-0.5">Bấm vào ca bạn có thể đi làm trong từng thứ.</p>
            </div>
            <span
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                freeDays >= MIN_SHIFTS_PER_WEEK
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Rảnh {freeDays} ngày/tuần (tối thiểu {MIN_SHIFTS_PER_WEEK})
            </span>
          </div>

          {isInherited && !dirty && (
            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 font-medium flex items-center gap-1.5">
              <Repeat className="w-3.5 h-3.5 shrink-0" />
              Đang dùng lại lịch rảnh tháng trước. Nếu không có gì thay đổi, bạn không cần làm gì thêm.
            </div>
          )}
          {isSaved && !dirty && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              Lịch rảnh {monthLabel(targetMonth)} đã được lưu.
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-500">
                  <th className="py-2 pr-3 font-bold">Ngày</th>
                  {SHIFT_DEFS.map(s => (
                    <th key={s.id} className="py-2 px-1.5 font-bold text-center">
                      {s.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WEEK_ORDER.map(dow => (
                  <tr key={dow} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-bold text-slate-800">{DOW_LABEL[dow]}</td>
                    {SHIFT_DEFS.map(s => {
                      const on = (weekly[dow] || []).includes(s.id);
                      return (
                        <td key={s.id} className="py-1.5 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => toggleShift(dow, s.id)}
                            className={`w-full px-2 py-1.5 rounded-lg border text-[11px] font-bold transition cursor-pointer ${
                              on
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {on ? 'Rảnh' : 'Bận'}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">2. Ngày bận đột xuất trong tháng</h3>
            <p className="text-xs text-slate-500 mt-0.5">Bấm vào ngày bạn không thể đi làm dù lịch lặp lại có rảnh.</p>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
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
                  className={`py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    isBlocked
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Number(date.slice(8))}
                </button>
              );
            })}
          </div>
          <div className="text-[11px] text-slate-500">Đã chọn {blocked.length} ngày bận.</div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty}
            className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition ${
              dirty
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{dirty ? `Lưu lịch rảnh ${monthLabel(targetMonth)}` : 'Chưa có thay đổi'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              3. Ca sắp tới của tôi
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Nếu bận, bấm "Báo bận" trước giờ làm ít nhất {SWAP_MIN_NOTICE_HOURS} giờ. Hệ thống sẽ tự tìm đồng nghiệp rảnh để thay.
            </p>
          </div>
        </div>

        {mySchedules.length === 0 ? (
          <div className="p-5 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-600 font-semibold">
            Bạn chưa có ca nào sắp tới. Quản lý sẽ xuất bản lịch tháng sau khi hệ thống xếp xong.
          </div>
        ) : (
          <div className="space-y-2">
            {mySchedules.slice(0, 12).map(s => {
              const req = swapOf(s.id);
              return (
                <div
                  key={s.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{s.shiftName}</div>
                      <div className="text-[11px] text-slate-500">
                        {formatDateDMY(s.date)} • {s.location}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {req?.status === 'waiting' && (
                      <>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Đang chờ đồng nghiệp nhận ({req.candidateIds.length} người được mời)
                        </span>
                        <button
                          onClick={() => handleCancelSwap(req)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-slate-300 text-slate-700 bg-white cursor-pointer"
                        >
                          Hủy yêu cầu
                        </button>
                      </>
                    )}
                    {req?.status === 'escalated' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Đã chuyển Quản lý xử lý
                      </span>
                    )}
                    {req?.status === 'accepted' && (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Đã có người thay: {req.acceptedByName}
                      </span>
                    )}
                    {!req && (
                      <button
                        onClick={() => {
                          setSwapTarget(s);
                          setSwapReason('');
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 flex items-center gap-1.5 cursor-pointer"
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
      </div>

      {swapTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Báo bận và nhờ đổi ca</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {swapTarget.shiftName} • {formatDateDMY(swapTarget.date)}
                </p>
              </div>
              <button onClick={() => setSwapTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={swapReason}
              onChange={e => setSwapReason(e.target.value)}
              rows={3}
              placeholder="Lý do bận (ví dụ: lịch thi, việc gia đình...)"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSwapTarget(null)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={submitSwap}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl cursor-pointer"
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
