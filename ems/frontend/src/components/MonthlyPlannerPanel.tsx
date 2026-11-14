import React, { useState } from 'react';
import { User } from '../types';
import {
  SHIFT_DEFS,
  MIN_SHIFTS_PER_WEEK,
  MonthlyDraft,
  generateMonthlyPlan,
  getMonthlyDraft,
  saveMonthlyDraft,
  publishMonthlyDraft,
  getAvailability,
  availableDaysPerWeek,
  getMonthDates,
  getMonthKey,
  shiftMonth,
  monthLabel,
  isWeekendDate,
  parseDate,
  toDateStr,
  getSwapRequests,
} from '../services/shiftPlanner';
import { Sparkles, CheckCheck, AlertTriangle, ChevronLeft, ChevronRight, Users, Repeat } from 'lucide-react';
import { formatDateDMY } from '../utils/dateUtils';

interface MonthlyPlannerPanelProps {
  staff: User[];
  onPublished: (count: number) => void;
}

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export const MonthlyPlannerPanel: React.FC<MonthlyPlannerPanelProps> = ({ staff, onPublished }) => {
  const [month, setMonth] = useState<string>(() => shiftMonth(getMonthKey(new Date()), 1));
  const [draft, setDraft] = useState<MonthlyDraft | null>(() => getMonthlyDraft(shiftMonth(getMonthKey(new Date()), 1)));
  const [message, setMessage] = useState<string>('');

  const changeMonth = (delta: number) => {
    const next = shiftMonth(month, delta);
    setMonth(next);
    setDraft(getMonthlyDraft(next));
    setMessage('');
  };

  const availabilityRows = staff.map(u => {
    const info = getAvailability(u, month);
    return { user: u, ...info, days: availableDaysPerWeek(info.availability) };
  });
  const notRegistered = availabilityRows.filter(r => r.days === 0);
  const lowDays = availabilityRows.filter(r => r.days > 0 && r.days < MIN_SHIFTS_PER_WEEK);
  const readyCount = availabilityRows.filter(r => r.days >= MIN_SHIFTS_PER_WEEK).length;

  const dates = getMonthDates(month);
  const totalNeeded = dates.reduce(
    (sum, d) => sum + SHIFT_DEFS.reduce((acc, s) => acc + (isWeekendDate(d) ? s.weekend : s.weekday), 0),
    0
  );

  const handleGenerate = () => {
    const result = generateMonthlyPlan(month, staff);
    saveMonthlyDraft(result);
    setDraft(result);
    setMessage(
      result.shortages.length === 0
        ? `Đã tạo bản nháp ${monthLabel(month)}: đủ người cho mọi ca.`
        : `Đã tạo bản nháp ${monthLabel(month)}: còn ${result.shortages.length} ca chưa đủ người cần bổ sung.`
    );
  };

  const handlePublish = () => {
    if (!draft) return;
    const ok = window.confirm(
      `Xuất bản lịch ${monthLabel(month)}? Lịch hiện có của các ngày từ hôm nay trở đi trong tháng này sẽ được thay bằng bản nháp.`
    );
    if (!ok) return;
    const count = publishMonthlyDraft(draft, toDateStr(new Date()));
    setMessage(`Đã xuất bản ${count} ca cho ${monthLabel(month)}.`);
    onPublished(count);
  };

  const swapRows = getSwapRequests().filter(r => r.date.startsWith(month));
  const waitingSwaps = swapRows.filter(r => r.status === 'waiting').length;
  const escalatedSwaps = swapRows.filter(r => r.status === 'escalated').length;
  const acceptedSwaps = swapRows.filter(r => r.status === 'accepted').length;

  const namesFor = (date: string, shiftId: string) =>
    (draft?.schedules || []).filter(s => s.date === date && s.shiftId === shiftId).map(s => s.userName);
  const shortageFor = (date: string, shiftId: string) =>
    draft?.shortages.find(s => s.date === date && s.shiftId === shiftId);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-black text-slate-900 text-base">{monthLabel(month)}</h3>
          <button onClick={() => changeMonth(1)} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            <span>{draft ? 'Tạo lại bản nháp' : 'Tạo bản nháp tự động'}</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={!draft}
            className={`px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-2 transition ${
              draft
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Xuất bản lịch tháng</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800">{message}</div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-500 font-semibold">Nhân viên đã sẵn sàng</div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {readyCount}/{staff.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Rảnh từ {MIN_SHIFTS_PER_WEEK} ngày/tuần</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-500 font-semibold">Tổng suất cần trong tháng</div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalNeeded}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{dates.length} ngày × 3 ca</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-500 font-semibold">Bản nháp đã xếp</div>
          <div className="text-xl font-black text-slate-900 mt-1">{draft ? draft.schedules.length : '--'}</div>
          <div className={`text-[10px] font-bold mt-0.5 ${draft && draft.shortages.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {draft ? `${draft.shortages.length} ca thiếu người` : 'Chưa tạo'}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
            <Repeat className="w-3 h-3" />
            Yêu cầu đổi ca
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{swapRows.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Đã đổi {acceptedSwaps} • Chờ {waitingSwaps} • Cần xử lý {escalatedSwaps}
          </div>
        </div>
      </div>

      {(notRegistered.length > 0 || lowDays.length > 0) && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs space-y-1.5">
          <div className="font-bold text-amber-950 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700" />
            Nhân viên cần nhắc cập nhật lịch rảnh
          </div>
          {notRegistered.length > 0 && (
            <div className="text-amber-900">
              <Users className="w-3 h-3 inline mr-1" />
              Chưa đăng ký: {notRegistered.map(r => r.user.name).join(', ')}
            </div>
          )}
          {lowDays.length > 0 && (
            <div className="text-amber-900">
              Rảnh dưới {MIN_SHIFTS_PER_WEEK} ngày/tuần: {lowDays.map(r => `${r.user.name} (${r.days})`).join(', ')}
            </div>
          )}
        </div>
      )}

      {draft ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px] min-w-[110px]">Ngày</th>
                  {SHIFT_DEFS.map(s => (
                    <th key={s.id} className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px] min-w-[190px]">
                      {s.short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dates.map(date => (
                  <tr key={date} className={`border-b border-slate-100 ${isWeekendDate(date) ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-3 py-2 font-bold text-slate-800">
                      {DOW_SHORT[parseDate(date).getDay()]} • {formatDateDMY(date)}
                    </td>
                    {SHIFT_DEFS.map(s => {
                      const names = namesFor(date, s.id);
                      const short = shortageFor(date, s.id);
                      const backup = draft.backupCount[`${date}|${s.id}`] || 0;
                      return (
                        <td key={s.id} className="px-3 py-2 align-top">
                          <div className="flex flex-wrap gap-1">
                            {names.map(n => (
                              <span key={n} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                                {n}
                              </span>
                            ))}
                            {short && (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                                Thiếu {short.needed - short.got}
                              </span>
                            )}
                          </div>
                          {backup > 0 && <div className="text-[10px] text-slate-400 mt-0.5">Dự phòng: {backup} người</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-center text-xs text-slate-600 font-semibold">
          Chưa có bản nháp cho {monthLabel(month)}. Bấm "Tạo bản nháp tự động" để hệ thống xếp lịch theo lịch rảnh của nhân viên.
        </div>
      )}
    </div>
  );
};

