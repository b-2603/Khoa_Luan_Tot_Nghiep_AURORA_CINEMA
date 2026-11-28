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
import {
  Sparkles,
  CheckCheck,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Users,
  Repeat,
  CalendarCheck,
  LayoutGrid,
  Info,
} from 'lucide-react';

interface MonthlyPlannerPanelProps {
  staff: User[];
  onPublished: (count: number) => void;
}

const DOW_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const SHIFT_STYLE: Record<string, string> = {
  'shift-1': 'bg-amber-50 text-amber-900 border-amber-200',
  'shift-2': 'bg-indigo-50 text-indigo-900 border-indigo-200',
  'shift-3': 'bg-slate-100 text-slate-800 border-slate-300',
};

export const MonthlyPlannerPanel: React.FC<MonthlyPlannerPanelProps> = ({ staff, onPublished }) => {
  const [month, setMonth] = useState<string>(() => shiftMonth(getMonthKey(new Date()), 1));
  const [draft, setDraft] = useState<MonthlyDraft | null>(() => getMonthlyDraft(shiftMonth(getMonthKey(new Date()), 1)));
  const [message, setMessage] = useState<string>('');
  const [onlyProblems, setOnlyProblems] = useState(false);

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
  const readyPct = staff.length > 0 ? Math.round((readyCount / staff.length) * 100) : 0;

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

  const filledPct =
    draft && totalNeeded > 0 ? Math.min(100, Math.round((draft.schedules.length / totalNeeded) * 100)) : 0;
  const hasProblems = (date: string) => SHIFT_DEFS.some(s => shortageFor(date, s.id));
  const visibleDates = onlyProblems ? dates.filter(hasProblems) : dates;
  const needyCount = notRegistered.length + lowDays.length;

  const lastName = (full: string) => full.trim().split(' ').slice(-2).join(' ');

  // Thống kê công bằng: mỗi người được xếp bao nhiêu ca / tuần trong bản nháp
  const weeksInMonth = dates.length / 7;
  const fairness = draft
    ? staff
        .map(u => {
          const count = draft.schedules.filter(s => String(s.userId).replace('usr-', '') === String(u.id).replace('usr-', '')).length;
          const avg = count / weeksInMonth;
          const days = availabilityRows.find(r => r.user.id === u.id)?.days || 0;
          return { user: u, count, avg, days };
        })
        .sort((a, b) => a.avg - b.avg)
    : [];
  const underStaff = fairness.filter(f => f.days > 0 && f.avg < MIN_SHIFTS_PER_WEEK - 0.5);
  const maxCount = Math.max(1, ...fairness.map(f => f.count));
  const surplusSlots = draft ? Object.values(draft.backupCount).reduce((s, n) => s + n, 0) : 0;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg cursor-pointer transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-4 text-sm font-bold text-slate-900 min-w-[120px] text-center">{monthLabel(month)}</span>
            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg cursor-pointer transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          {draft && (
            <span className="text-xs text-slate-500 hidden sm:inline">
              Bản nháp tạo lúc {new Date(draft.generatedAt).toLocaleString('vi-VN')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center gap-2 cursor-pointer transition active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{draft ? 'Tạo lại bản nháp' : 'Tạo bản nháp tự động'}</span>
          </button>
          <button
            onClick={handlePublish}
            disabled={!draft}
            className={`px-5 py-2.5 font-bold text-sm rounded-xl flex items-center gap-2 transition ${
              draft
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Xuất bản lịch tháng</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Nhân viên sẵn sàng</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">
            {readyCount}
            <span className="text-sm font-medium text-slate-400">/{staff.length}</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${readyPct}%` }} />
          </div>
          <div className="text-[11px] text-slate-400 mt-1.5">Rảnh từ {MIN_SHIFTS_PER_WEEK} ngày/tuần</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Suất ca cần trong tháng</span>
            <CalendarCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{totalNeeded}</div>
          <div className="text-[11px] text-slate-400 mt-3.5">{dates.length} ngày × 3 ca</div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Bản nháp đã xếp</span>
            <LayoutGrid className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{draft ? draft.schedules.length : '--'}</div>
          <div
            className={`text-[11px] font-semibold mt-3.5 ${
              draft && draft.shortages.length > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}
          >
            {draft ? `${filledPct}% • ${draft.shortages.length} ca thiếu người` : 'Chưa tạo bản nháp'}
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Yêu cầu đổi ca</span>
            <Repeat className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1.5">{swapRows.length}</div>
          <div className="text-[11px] text-slate-400 mt-3.5">
            Đã đổi {acceptedSwaps} • Chờ {waitingSwaps} •{' '}
            <span className={escalatedSwaps > 0 ? 'text-rose-600 font-semibold' : ''}>Cần xử lý {escalatedSwaps}</span>
          </div>
        </div>
      </div>

      {/* Needs attention */}
      {needyCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-950">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-700" />
            Cần nhắc {needyCount} nhân viên cập nhật lịch rảnh
          </div>
          <div className="flex flex-wrap gap-2">
            {notRegistered.map(r => (
              <span
                key={r.user.id}
                className="px-3 py-1 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-700"
              >
                {r.user.name} • chưa đăng ký
              </span>
            ))}
            {lowDays.map(r => (
              <span
                key={r.user.id}
                className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-xs font-semibold text-amber-900"
              >
                {r.user.name} • rảnh {r.days}/{MIN_SHIFTS_PER_WEEK} ngày
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fairness / surplus handling */}
      {draft && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Phân bổ công bằng khi có nhiều người cùng rảnh</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ca nào dư người, hệ thống ưu tiên người đang có ít ca trong tuần nhất, sau đó đến người ít ca đêm / cuối tuần,
                rồi tổng ca cả tháng. Người chưa được xếp sẽ ghi là "dự phòng" để thay khi có người báo bận.
              </p>
            </div>
            <div className="text-xs text-slate-500">
              <strong className="text-slate-800">{surplusSlots}</strong> lượt dự phòng
            </div>
          </div>

          {underStaff.length > 0 && (
            <div className="mx-6 mt-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>{underStaff.length} nhân viên</strong> được xếp dưới {MIN_SHIFTS_PER_WEEK} ca/tuần do ca đã đủ người
                ({underStaff.slice(0, 4).map(f => lastName(f.user.name)).join(', ')}
                {underStaff.length > 4 ? '…' : ''}). Nên cân nhắc giảm chỉ tiêu ca hoặc bù ca cho nhóm này.
              </span>
            </div>
          )}

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 max-h-72 overflow-y-auto">
            {fairness.map(f => {
              const low = f.days > 0 && f.avg < MIN_SHIFTS_PER_WEEK - 0.5;
              const none = f.days === 0;
              return (
                <div key={f.user.id} className="flex items-center gap-3 text-xs">
                  <span className="w-32 truncate font-medium text-slate-700" title={f.user.name}>
                    {lastName(f.user.name)}
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${none ? 'bg-slate-300' : low ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(f.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-28 text-right font-mono text-slate-500">
                    {f.count} ca • {f.avg.toFixed(1)}/tuần
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Draft calendar */}
      {draft ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Bản nháp lịch {monthLabel(month)}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {draft.shortages.length === 0
                  ? 'Mọi ca đều đủ người, có thể xuất bản.'
                  : `${draft.shortages.length} ca còn thiếu người, hiển thị nhãn đỏ.`}
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyProblems}
                onChange={e => setOnlyProblems(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              Chỉ hiện ngày thiếu người
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-3 text-left min-w-[110px]">Ngày</th>
                  {SHIFT_DEFS.map(s => (
                    <th key={s.id} className="px-4 py-3 text-left min-w-[200px]">
                      {s.short}
                      <span className="ml-1.5 normal-case font-medium text-slate-400">
                        ({s.name.match(/\((.*)\)/)?.[1]})
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-emerald-700 font-medium">
                      Không có ngày nào thiếu người.
                    </td>
                  </tr>
                ) : (
                  visibleDates.map(date => {
                    const d = parseDate(date);
                    const weekend = isWeekendDate(date);
                    return (
                      <tr
                        key={date}
                        className={`border-b border-slate-100 ${weekend ? 'bg-amber-50/40' : ''} ${
                          hasProblems(date) ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="px-5 py-3 align-top">
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-slate-900 leading-none">{d.getDate()}</span>
                            <span className={`text-xs font-semibold ${weekend ? 'text-amber-700' : 'text-slate-400'}`}>
                              {DOW_SHORT[d.getDay()]}
                            </span>
                          </div>
                        </td>
                        {SHIFT_DEFS.map(s => {
                          const names = namesFor(date, s.id);
                          const short = shortageFor(date, s.id);
                          const backup = draft.backupCount[`${date}|${s.id}`] || 0;
                          return (
                            <td key={s.id} className="px-4 py-3 align-top">
                              <div className="flex flex-wrap gap-1.5">
                                {names.map(n => (
                                  <span
                                    key={n}
                                    title={n}
                                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium ${SHIFT_STYLE[s.id]}`}
                                  >
                                    {lastName(n)}
                                  </span>
                                ))}
                                {short && (
                                  <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                                    Thiếu {short.needed - short.got}
                                  </span>
                                )}
                              </div>
                              {backup > 0 && (
                                <div
                                  className="text-[11px] text-slate-400 mt-1 cursor-help"
                                  title={`Cũng rảnh ca này, chưa được xếp: ${(draft.backupNames?.[`${date}|${s.id}`] || []).join(', ')}`}
                                >
                                  Dự phòng: {backup} người
                                  {(draft.backupNames?.[`${date}|${s.id}`] || []).length > 0 && (
                                    <span className="text-slate-300">
                                      {' '}• {(draft.backupNames?.[`${date}|${s.id}`] || []).slice(0, 2).map(lastName).join(', ')}
                                      {backup > 2 ? '…' : ''}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl py-14 px-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-sm font-semibold text-slate-700 mb-5">Chưa có bản nháp cho {monthLabel(month)}</p>
          <button
            onClick={handleGenerate}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl inline-flex items-center gap-2 cursor-pointer transition"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Tạo bản nháp tự động
          </button>
        </div>
      )}
    </div>
  );
};
