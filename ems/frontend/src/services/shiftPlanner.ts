import { User, WorkSchedule } from '../types';
import { getWorkSchedules, saveWorkSchedules, mergeWorkSchedules, saveAttendanceException } from './storage';

export const SHIFT_DEFS = [
  { id: 'shift-1', name: 'Ca Sáng (08:00–16:00)', short: 'Ca Sáng', startHour: 8, startMinute: 0, weekday: 1, weekend: 2 },
  { id: 'shift-2', name: 'Ca Chiều (15:30–23:00)', short: 'Ca Chiều', startHour: 15, startMinute: 30, weekday: 2, weekend: 2 },
  { id: 'shift-3', name: 'Ca Đêm (22:00–02:00)', short: 'Ca Đêm', startHour: 22, startMinute: 0, weekday: 1, weekend: 1 },
];

export const MIN_SHIFTS_PER_WEEK = 4;
export const MAX_SHIFTS_PER_WEEK = 6;
export const SWAP_MIN_NOTICE_HOURS = 24;
export const REGISTRATION_OPEN_FROM_DAY = 20;
export const REGISTRATION_OPEN_TO_DAY = 25;

export interface Availability {
  userId: string;
  userName: string;
  month: string;
  weekly: Record<number, string[]>;
  blockedDates: string[];
  updatedAt: string;
}

export interface PlanShortage {
  date: string;
  shiftId: string;
  needed: number;
  got: number;
}

export interface MonthlyDraft {
  month: string;
  schedules: WorkSchedule[];
  shortages: PlanShortage[];
  backupCount: Record<string, number>;
  generatedAt: string;
}

export interface SwapRequest {
  id: string;
  scheduleId: string;
  date: string;
  shiftId: string;
  shiftName: string;
  fromUserId: string;
  fromUserName: string;
  reason: string;
  candidateIds: string[];
  declinedIds: string[];
  status: 'waiting' | 'accepted' | 'escalated' | 'cancelled';
  acceptedById?: string;
  acceptedByName?: string;
  escalateReason?: string;
  createdAt: string;
}

const AV_KEY = 'aurora_ems_availability_v1';
const DRAFT_KEY = 'aurora_ems_monthly_draft_v1';
const SWAP_KEY = 'aurora_ems_swap_requests_v1';

const pad = (n: number) => String(n).padStart(2, '0');
const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();
const sameUser = (a?: string, b?: string) => Boolean(a && b) && cleanId(a) === cleanId(b);

export const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const getMonthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split('-').map(Number);
  return getMonthKey(new Date(y, m - 1 + delta, 1));
};
export const getMonthDates = (key: string): string[] => {
  const [y, m] = key.split('-').map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
};
export const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  return `Tháng ${Number(m)}/${y}`;
};
export const weekKeyOf = (dateStr: string) => {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
};
export const isWeekendDate = (dateStr: string) => {
  const g = parseDate(dateStr).getDay();
  return g === 0 || g === 6;
};
export const monthOfDate = (dateStr: string) => dateStr.slice(0, 7);

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

export function getAllAvailabilities(): Availability[] {
  return readJson<Availability[]>(AV_KEY, []);
}

export function getAvailability(user: Pick<User, 'id' | 'name'>, month: string): {
  availability: Availability;
  saved: boolean;
  inherited: boolean;
} {
  const all = getAllAvailabilities().filter(a => sameUser(a.userId, user.id));
  const exact = all.find(a => a.month === month);
  if (exact) return { availability: exact, saved: true, inherited: false };
  const earlier = all.filter(a => a.month < month).sort((a, b) => b.month.localeCompare(a.month))[0];
  if (earlier) {
    return {
      availability: { ...earlier, month, blockedDates: [], updatedAt: earlier.updatedAt },
      saved: false,
      inherited: true,
    };
  }
  return {
    availability: { userId: user.id, userName: user.name, month, weekly: {}, blockedDates: [], updatedAt: '' },
    saved: false,
    inherited: false,
  };
}

export function saveAvailability(av: Availability): void {
  const all = getAllAvailabilities().filter(a => !(sameUser(a.userId, av.userId) && a.month === av.month));
  all.push({ ...av, updatedAt: new Date().toISOString() });
  writeJson(AV_KEY, all);
}

export function isAvailableOn(av: Availability, date: string, shiftId: string): boolean {
  if (av.blockedDates.includes(date)) return false;
  const dow = parseDate(date).getDay();
  return (av.weekly[dow] || []).includes(shiftId);
}

export function availableDaysPerWeek(av: Availability): number {
  return Object.values(av.weekly).filter(list => list && list.length > 0).length;
}

function defaultLocationFor(staff: User, offset: number): string {
  const dept = (staff.department || '').toLowerCase();
  if (dept.includes('bắp') || dept.includes('concession') || dept.includes('nước')) {
    return offset % 2 === 0 ? 'Cụm Rạp 1 - Quầy Bắp Nước Concession' : 'Sảnh Chính & Kiểm Soát Vé';
  }
  if (dept.includes('kỹ thuật') || dept.includes('usher') || dept.includes('soát')) {
    return offset % 2 === 0 ? 'Phòng Máy Chiếu & Kỹ Thuật IMAX' : 'Sảnh Chính & Kiểm Soát Vé';
  }
  return offset % 2 === 0 ? 'Cụm Rạp 1 - Quầy Vé Box Office' : 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
}

export function generateMonthlyPlan(month: string, staff: User[]): MonthlyDraft {
  const dates = getMonthDates(month);
  const avMap = new Map<string, Availability>();
  staff.forEach(u => avMap.set(u.id, getAvailability(u, month).availability));

  const weekCount: Record<string, Record<string, number>> = {};
  const total: Record<string, number> = {};
  const hardCount: Record<string, number> = {};
  staff.forEach(u => {
    weekCount[u.id] = {};
    total[u.id] = 0;
    hardCount[u.id] = 0;
  });

  const schedules: WorkSchedule[] = [];
  const shortages: PlanShortage[] = [];
  const backupCount: Record<string, number> = {};
  let prevNight = new Set<string>();
  const order = ['shift-3', 'shift-1', 'shift-2'];

  dates.forEach(date => {
    const wk = weekKeyOf(date);
    const weekend = isWeekendDate(date);
    const assignedToday = new Set<string>();
    const nightToday = new Set<string>();

    order.forEach(shiftId => {
      const def = SHIFT_DEFS.find(s => s.id === shiftId)!;
      const needed = weekend ? def.weekend : def.weekday;
      const candidates = staff
        .filter(u => {
          const av = avMap.get(u.id)!;
          if (!isAvailableOn(av, date, shiftId)) return false;
          if (assignedToday.has(u.id)) return false;
          if ((weekCount[u.id][wk] || 0) >= MAX_SHIFTS_PER_WEEK) return false;
          if (shiftId === 'shift-1' && prevNight.has(u.id)) return false;
          return true;
        })
        .sort((a, b) => {
          const wa = weekCount[a.id][wk] || 0;
          const wb = weekCount[b.id][wk] || 0;
          if (wa !== wb) return wa - wb;
          const hard = shiftId === 'shift-3' || weekend;
          if (hard && hardCount[a.id] !== hardCount[b.id]) return hardCount[a.id] - hardCount[b.id];
          if (total[a.id] !== total[b.id]) return total[a.id] - total[b.id];
          return a.name.localeCompare(b.name);
        });

      const picked = candidates.slice(0, needed);
      backupCount[`${date}|${shiftId}`] = Math.max(0, candidates.length - picked.length);

      picked.forEach((u, idx) => {
        assignedToday.add(u.id);
        if (shiftId === 'shift-3') nightToday.add(u.id);
        weekCount[u.id][wk] = (weekCount[u.id][wk] || 0) + 1;
        total[u.id] += 1;
        if (shiftId === 'shift-3' || weekend) hardCount[u.id] += 1;
        schedules.push({
          id: `sch-auto-${date}-${cleanId(u.id)}-${shiftId.replace('shift-', '')}`,
          userId: u.id,
          userName: u.name,
          userAvatar: u.avatar,
          staffCode: u.phone || u.staffCode,
          department: u.department,
          date,
          shiftId,
          shiftName: def.name,
          location: defaultLocationFor(u, idx + total[u.id]),
          status: 'assigned',
          assignedBy: 'Hệ thống xếp tự động',
        });
      });

      if (picked.length < needed) {
        shortages.push({ date, shiftId, needed, got: picked.length });
      }
    });

    prevNight = nightToday;
  });

  schedules.sort((a, b) => a.date.localeCompare(b.date) || a.shiftId.localeCompare(b.shiftId));
  return { month, schedules, shortages, backupCount, generatedAt: new Date().toISOString() };
}

export function getMonthlyDraft(month: string): MonthlyDraft | null {
  const draft = readJson<MonthlyDraft | null>(DRAFT_KEY, null);
  return draft && draft.month === month ? draft : null;
}
export function saveMonthlyDraft(draft: MonthlyDraft): void {
  writeJson(DRAFT_KEY, draft);
}

export function publishMonthlyDraft(draft: MonthlyDraft, todayStr: string): number {
  const dates = getMonthDates(draft.month).filter(d => d >= todayStr);
  const items = draft.schedules.filter(s => s.date >= todayStr);
  mergeWorkSchedules(items, dates);
  return items.length;
}

export function hoursUntilShift(date: string, shiftId: string): number {
  const def = SHIFT_DEFS.find(s => s.id === shiftId) || SHIFT_DEFS[0];
  const d = parseDate(date);
  d.setHours(def.startHour, def.startMinute, 0, 0);
  return (d.getTime() - Date.now()) / 3600000;
}

export function getSwapRequests(): SwapRequest[] {
  return readJson<SwapRequest[]>(SWAP_KEY, []);
}
const saveSwapRequests = (list: SwapRequest[]) => writeJson(SWAP_KEY, list);

function isEligibleReplacement(
  user: User,
  date: string,
  shiftId: string,
  schedules: WorkSchedule[]
): boolean {
  if (user.role !== 'staff' || user.status !== 'active') return false;
  const av = getAvailability(user, monthOfDate(date)).availability;
  if (!isAvailableOn(av, date, shiftId)) return false;
  const mine = schedules.filter(s => sameUser(s.userId, user.id));
  if (mine.some(s => s.date === date)) return false;
  const wk = weekKeyOf(date);
  if (mine.filter(s => weekKeyOf(s.date) === wk).length >= MAX_SHIFTS_PER_WEEK) return false;
  const d = parseDate(date);
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  const prevStr = toDateStr(prev);
  const nextStr = toDateStr(next);
  const sid = (s: WorkSchedule) => s.shiftId.replace('shift-', '');
  if (sid({ shiftId } as WorkSchedule) === '1' && mine.some(s => s.date === prevStr && sid(s) === '3')) return false;
  if (sid({ shiftId } as WorkSchedule) === '3' && mine.some(s => s.date === nextStr && sid(s) === '1')) return false;
  return true;
}

export function findSwapCandidates(
  date: string,
  shiftId: string,
  excludeUserId: string,
  staff: User[],
  schedules: WorkSchedule[]
): User[] {
  const wk = weekKeyOf(date);
  const count = (u: User) =>
    schedules.filter(s => sameUser(s.userId, u.id) && weekKeyOf(s.date) === wk).length;
  return staff
    .filter(u => !sameUser(u.id, excludeUserId) && isEligibleReplacement(u, date, shiftId, schedules))
    .sort((a, b) => count(a) - count(b) || a.name.localeCompare(b.name));
}

function escalate(request: SwapRequest, requester: User, why: string): SwapRequest {
  saveAttendanceException({
    userId: requester.id,
    userName: requester.name,
    staffCode: requester.phone || requester.staffCode,
    type: 'shift_swap',
    typeTitle: 'Xin Đổi Ca (cần Quản lý xử lý)',
    reason: `${request.reason} — ${why}`,
    targetDate: request.date,
    status: 'pending',
    submittedAt: new Date().toLocaleString('vi-VN'),
  });
  return { ...request, status: 'escalated', escalateReason: why };
}

export function createSwapRequest(
  schedule: WorkSchedule,
  reason: string,
  requester: User,
  staff: User[]
): SwapRequest {
  const all = getSwapRequests();
  const existing = all.find(r => r.scheduleId === schedule.id && r.status === 'waiting');
  if (existing) return existing;

  const base: SwapRequest = {
    id: `swap-${Date.now()}`,
    scheduleId: schedule.id,
    date: schedule.date,
    shiftId: schedule.shiftId,
    shiftName: schedule.shiftName,
    fromUserId: requester.id,
    fromUserName: requester.name,
    reason,
    candidateIds: [],
    declinedIds: [],
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };

  let result: SwapRequest;
  if (hoursUntilShift(schedule.date, schedule.shiftId) < SWAP_MIN_NOTICE_HOURS) {
    result = escalate(base, requester, `Báo bận dưới ${SWAP_MIN_NOTICE_HOURS} giờ trước giờ làm`);
  } else {
    const candidates = findSwapCandidates(schedule.date, schedule.shiftId, requester.id, staff, getWorkSchedules());
    if (candidates.length === 0) {
      result = escalate(base, requester, 'Không có đồng nghiệp rảnh để thay');
    } else {
      result = { ...base, candidateIds: candidates.map(c => c.id) };
    }
  }
  saveSwapRequests([result, ...all]);
  return result;
}

export function getInvitationsFor(userId: string): SwapRequest[] {
  return getSwapRequests().filter(
    r =>
      r.status === 'waiting' &&
      r.candidateIds.some(id => sameUser(id, userId)) &&
      !r.declinedIds.some(id => sameUser(id, userId))
  );
}

export function acceptSwap(requestId: string, user: User, staff: User[]): { ok: boolean; message: string } {
  const all = getSwapRequests();
  const req = all.find(r => r.id === requestId);
  if (!req || req.status !== 'waiting') {
    return { ok: false, message: 'Yêu cầu này không còn mở (đã có người nhận hoặc đã hủy).' };
  }
  const schedules = getWorkSchedules();
  const idx = schedules.findIndex(
    s =>
      s.id === req.scheduleId ||
      (s.date === req.date && sameUser(s.userId, req.fromUserId) && s.shiftId === req.shiftId)
  );
  if (idx < 0) return { ok: false, message: 'Không tìm thấy ca cần thay trong lịch.' };

  const stillOk = findSwapCandidates(req.date, req.shiftId, req.fromUserId, staff, schedules).some(
    u => sameUser(u.id, user.id)
  );
  if (!stillOk) return { ok: false, message: 'Bạn không còn đủ điều kiện nhận ca này (đã có ca khác hoặc vượt giới hạn tuần).' };

  schedules[idx] = {
    ...schedules[idx],
    userId: user.id,
    userName: user.name,
    userAvatar: user.avatar,
    staffCode: user.phone || user.staffCode,
    department: user.department,
    status: 'assigned',
    assignedBy: `Đổi ca tự động (thay ${req.fromUserName})`,
  };
  saveWorkSchedules(schedules);
  saveSwapRequests(
    all.map(r =>
      r.id === requestId ? { ...r, status: 'accepted' as const, acceptedById: user.id, acceptedByName: user.name } : r
    )
  );
  return { ok: true, message: `Bạn đã nhận ca ${req.shiftName} ngày ${req.date} thay cho ${req.fromUserName}.` };
}

export function declineSwap(requestId: string, user: User, staff: User[]): void {
  const all = getSwapRequests();
  const updated = all.map(r => {
    if (r.id !== requestId || r.status !== 'waiting') return r;
    const next: SwapRequest = { ...r, declinedIds: [...r.declinedIds, user.id] };
    const remaining = next.candidateIds.filter(id => !next.declinedIds.some(d => sameUser(d, id)));
    if (remaining.length === 0) {
      const requester = staff.find(u => sameUser(u.id, r.fromUserId));
      if (requester) return escalate(next, requester, 'Tất cả đồng nghiệp được mời đều từ chối');
      return { ...next, status: 'escalated' as const, escalateReason: 'Tất cả đồng nghiệp được mời đều từ chối' };
    }
    return next;
  });
  saveSwapRequests(updated);
}

export function cancelSwap(requestId: string): void {
  saveSwapRequests(
    getSwapRequests().map(r => (r.id === requestId && r.status === 'waiting' ? { ...r, status: 'cancelled' as const } : r))
  );
}

