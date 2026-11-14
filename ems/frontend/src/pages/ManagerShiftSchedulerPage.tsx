import React, { useState, useEffect, useRef } from 'react';
import { User, WorkSchedule, ShiftRegistration, Shift } from '../types';
import {
  getUsers, getWorkSchedules, saveWorkSchedules, getShiftRegistrations,
  saveShiftRegistrations, updateShiftRegistrationStatus, syncApprovedRegistrationsToSchedules,
  mergeWorkSchedules, saveSingleWorkSchedule, removeSingleWorkSchedule,
  approveShiftRegistrationsForDate, getShiftReminders, sendShiftReminders, ShiftReminder
} from '../services/storage';
import {
  fetchWorkSchedules, fetchShiftRegistrations, fetchShifts, fetchEmployees,
  approveShiftRegistration, rejectShiftRegistration, approveAllShiftRegistrations,
  assignWorkSchedule, deleteWorkScheduleApi, publishWorkSchedules
} from '../services/apiClient';
import {
  Sparkles, RefreshCw, CheckCircle2, MapPin,
  Check, AlertCircle, XCircle, Inbox, LayoutGrid, CheckCheck,
  X, Edit3, Trash2, Save, Bell, Lock,
  Unlock, Zap, BarChart3,
  ClipboardList, ShieldCheck, UserPlus
} from 'lucide-react';
import { getWeekDaysByOffset, getTodayDateString } from '../utils/dateUtils';
import { MonthlyPlannerPanel } from '../components/MonthlyPlannerPanel';

const LOCATIONS = [
  'Cụm Rạp 1 - Quầy Vé Box Office',
  'Cụm Rạp 1 - Quầy Bắp Nước Concession',
  'Phòng Máy Chiếu & Kỹ Thuật IMAX',
  'Sảnh Chính & Kiểm Soát Vé',
];

const FIXED_SHIFTS = [
  {
    shiftId: 'shift-1',
    shiftName: 'Ca Sáng (08:00–16:00)',
    shortName: 'Ca Sáng',
    neededWeekday: 1,
    neededWeekend: 2,
  },
  {
    shiftId: 'shift-2',
    shiftName: 'Ca Chiều (15:30–23:00)',
    shortName: 'Ca Chiều',
    neededWeekday: 2,
    neededWeekend: 2,
  },
  {
    shiftId: 'shift-3',
    shiftName: 'Ca Đêm (22:00–02:00)',
    shortName: 'Ca Đêm',
    neededWeekday: 1,
    neededWeekend: 1,
  },
];

const MIN_SHIFTS_PER_WEEK = 4;
const MAX_SHIFTS_PER_WEEK = 6;

const matchUserId = (a?: string | number, b?: string | number) =>
  a && b ? String(a).replace('usr-', '').trim() === String(b).replace('usr-', '').trim() : false;

const matchShiftId = (a?: string | number, b?: string | number) =>
  a && b ? String(a).replace('shift-', '').trim() === String(b).replace('shift-', '').trim() : false;

function getDefaultLocationForStaff(staff?: User, offset = 0): string {
  const dept = (staff?.department || '').toLowerCase();
  if (dept.includes('bắp') || dept.includes('concession') || dept.includes('nước')) {
    return offset % 2 === 0 ? 'Cụm Rạp 1 - Quầy Bắp Nước Concession' : 'Sảnh Chính & Kiểm Soát Vé';
  }
  if (dept.includes('kỹ thuật') || dept.includes('usher') || dept.includes('soát')) {
    return offset % 2 === 0 ? 'Phòng Máy Chiếu & Kỹ Thuật IMAX' : 'Sảnh Chính & Kiểm Soát Vé';
  }
  return offset % 2 === 0 ? 'Cụm Rạp 1 - Quầy Vé Box Office' : 'Cụm Rạp 1 - Quầy Bắp Nước Concession';
}

export const ManagerShiftSchedulerPage: React.FC = () => {
  const [weekOffset, setWeekOffset] = useState<number>(1);
  const weekDays = getWeekDaysByOffset(weekOffset);
  const currentWeekDays = getWeekDaysByOffset(0);
  const nextWeekDays = getWeekDaysByOffset(1);
  const today = getTodayDateString();

  const [users, setUsers] = useState<User[]>(getUsers().filter(u => u.role === 'staff'));
  const [schedules, setSchedules] = useState<WorkSchedule[]>(getWorkSchedules());
  const [registrations, setRegistrations] = useState<ShiftRegistration[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [reminders, setReminders] = useState<ShiftReminder[]>(getShiftReminders());

  const [registrationGateStatus, setRegistrationGateStatus] = useState<'open' | 'locked'>(() => {
    try {
      const saved = localStorage.getItem('aurora_ems_gate_status');
      return saved === 'locked' ? 'locked' : 'open';
    } catch {
      return 'open';
    }
  });

  const [activeTab, setActiveTab] = useState<'published' | 'registrations' | 'monthly'>('monthly');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info' | 'error'; msg: string } | null>(null);

  const [editingCell, setEditingCell] = useState<{ userId: string; date: string; shiftId?: string } | null>(null);
  const [editShiftId, setEditShiftId] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [planVersion, setPlanVersion] = useState<number>(1);
  const seedRef = useRef<number>(1);
  const [viewDate, setViewDate] = useState<string>(weekDays[0]?.date || today);

  useEffect(() => {
    (async () => {
      try {
        const [staffList, shiftList, regList, schedList] = await Promise.all([
          fetchEmployees(),
          fetchShifts(),
          fetchShiftRegistrations(),
          fetchWorkSchedules(),
        ]);
        const staffOnly = staffList.filter(u => u.role === 'staff');
        if (staffOnly.length > 0) setUsers(staffOnly);
        if (shiftList?.length) setShifts(shiftList);
        const finalRegs = regList?.length ? regList : getShiftRegistrations();
        setRegistrations(finalRegs);

        const baseScheds = schedList?.length ? schedList : getWorkSchedules();
        const syncedScheds = syncApprovedRegistrationsToSchedules(finalRegs, baseScheds);
        setSchedules(syncedScheds);
      } catch {
        const localRegs = getShiftRegistrations();
        setRegistrations(localRegs);
        setSchedules(syncApprovedRegistrationsToSchedules(localRegs));
      }
    })();
  }, []);

  const showToast = (type: 'success' | 'info' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleToggleGate = () => {
    const nextStatus: 'open' | 'locked' = registrationGateStatus === 'open' ? 'locked' : 'open';
    setRegistrationGateStatus(nextStatus);
    localStorage.setItem('aurora_ems_gate_status', nextStatus);
    showToast(
      nextStatus === 'open' ? 'success' : 'info',
      nextStatus === 'open' ? 'Đã mở cổng đăng ký ca tuần!' : 'Đã khóa cổng đăng ký ca!'
    );
  };

  const handleApproveSingle = async (reg: ShiftRegistration) => {
    setProcessingId(reg.id);
    const shift = shifts.find(s => matchShiftId(s.id, reg.shiftId)) || FIXED_SHIFTS.find(n => matchShiftId(n.shiftId, reg.shiftId));
    const staff = users.find(u => matchUserId(u.id, reg.userId));
    const location = getDefaultLocationForStaff(staff, 0);

    try {
      await approveShiftRegistration(reg.id, location);
      const updatedRegs = updateShiftRegistrationStatus(reg.id, 'approved');
      setRegistrations(updatedRegs);

      const newItem: WorkSchedule = {
        id: `sch-${Date.now()}-${reg.userId}`,
        userId: staff?.id || reg.userId,
        userName: staff?.name || reg.userName,
        userAvatar: staff?.avatar || '',
        staffCode: staff?.phone || staff?.staffCode || '',
        department: staff?.department || 'Box ticket',
        date: reg.date,
        shiftId: reg.shiftId.startsWith('shift-') ? reg.shiftId : `shift-${reg.shiftId}`,
        shiftName: (shift as any)?.shiftName || (shift as any)?.name || reg.shiftId,
        location: location as any,
        status: 'assigned',
        assignedBy: 'Quản lý duyệt'
      };

      const updated = saveSingleWorkSchedule(newItem);
      setSchedules(updated);
      try {
        await assignWorkSchedule({
          userId: String(staff?.id || reg.userId).replace('usr-', ''),
          date: reg.date,
          shiftId: String(reg.shiftId).replace('shift-', ''),
          location,
          managerName: 'Quản lý duyệt',
        });
      } catch {}
      showToast('success', `Đã duyệt và thêm vào lịch tuần: ${newItem.shiftName} ngày ${reg.date} (${newItem.userName})`);
    } catch {
      showToast('error', 'Lỗi khi duyệt ca');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSingle = async (reg: ShiftRegistration) => {
    setProcessingId(reg.id);
    try {
      await rejectShiftRegistration(reg.id);
      const updatedRegs = updateShiftRegistrationStatus(reg.id, 'rejected');
      setRegistrations(updatedRegs);
      const updatedScheds = removeSingleWorkSchedule(reg.userId, reg.date, reg.shiftId);
      setSchedules(updatedScheds);
      showToast('info', `Đã từ chối nguyện vọng của ${reg.userName} ngày ${reg.date}`);
    } catch {
      showToast('error', 'Lỗi khi từ chối ca');
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveAll = async () => {
    setIsPublishing(true);
    try {
      await approveAllShiftRegistrations();
      const updatedRegs: ShiftRegistration[] = registrations.map(r =>
        r.status === 'pending' ? { ...r, status: 'approved' } : r
      );
      saveShiftRegistrations(updatedRegs);
      setRegistrations(updatedRegs);

      const syncedScheds = syncApprovedRegistrationsToSchedules(updatedRegs, schedules);
      setSchedules(syncedScheds);

      showToast('success', 'Đã phê duyệt toàn bộ nguyện vọng và cập nhật ngay lên Lịch Tuần!');
    } catch {
      showToast('error', 'Lỗi khi duyệt tất cả');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleRunSmartWeeklyScheduler = async (customSeed?: number) => {
    setIsAiLoading(true);
    const currentSeed = customSeed !== undefined ? customSeed : seedRef.current;
    setPlanVersion(currentSeed);

    const allDates = weekDays.map(d => d.date);
    const generatedSchedules: WorkSchedule[] = [];

    const weeklyShiftCount: Record<string, number> = {};
    const nightWeekendCount: Record<string, number> = {};
    const assignedShiftByDay: Record<string, Record<string, string>> = {};

    users.forEach(u => {
      weeklyShiftCount[u.id] = 0;
      nightWeekendCount[u.id] = 0;
    });

    for (let dayIdx = 0; dayIdx < weekDays.length; dayIdx++) {
      const dayObj = weekDays[dayIdx];
      const dateStr = dayObj.date;
      const prevDateStr = dayIdx > 0 ? weekDays[dayIdx - 1].date : '';
      const isWeekend = dayObj.dayLabel.includes('Thứ Bảy') || dayObj.dayLabel.includes('Chủ Nhật');

      assignedShiftByDay[dateStr] = {};

      const canAssignStaffToShift = (staff: User, shiftId: string): boolean => {
        if (assignedShiftByDay[dateStr][staff.id]) return false;
        if (weeklyShiftCount[staff.id] >= MAX_SHIFTS_PER_WEEK) return false;
        if (shiftId === 'shift-1' && prevDateStr) {
          const prevShift = assignedShiftByDay[prevDateStr]?.[staff.id];
          if (prevShift === 'shift-3') return false;
        }
        return true;
      };

      for (const need of FIXED_SHIFTS) {
        const targetCount = isWeekend ? need.neededWeekend : need.neededWeekday;
        if (targetCount <= 0) continue;

        const applicants = registrations
          .filter(r => r.date === dateStr && matchShiftId(r.shiftId, need.shiftId) && r.status !== 'rejected')
          .map(r => users.find(u => matchUserId(u.id, r.userId)))
          .filter((u): u is User => Boolean(u))
          .filter(u => canAssignStaffToShift(u, need.shiftId));

        let chosenApplicants: User[] = [];

        if (applicants.length <= targetCount) {
          chosenApplicants = applicants;
        } else {
          chosenApplicants = [...applicants].sort((a, b) => {
            const countDiff = (weeklyShiftCount[a.id] || 0) - (weeklyShiftCount[b.id] || 0);
            if (countDiff !== 0) return countDiff;

            const nwDiff = (nightWeekendCount[a.id] || 0) - (nightWeekendCount[b.id] || 0);
            if (nwDiff !== 0) return nwDiff;

            const hashA = ((Number(a.id.replace(/\D/g, '')) || 1) * 31 + currentSeed * 17 + dayIdx * 7) % 100;
            const hashB = ((Number(b.id.replace(/\D/g, '')) || 2) * 31 + currentSeed * 17 + dayIdx * 7) % 100;
            return hashA - hashB;
          }).slice(0, targetCount);
        }

        chosenApplicants.forEach((staff, idx) => {
          assignedShiftByDay[dateStr][staff.id] = need.shiftId;
          weeklyShiftCount[staff.id] = (weeklyShiftCount[staff.id] || 0) + 1;
          if (isWeekend || need.shiftId === 'shift-3') {
            nightWeekendCount[staff.id] = (nightWeekendCount[staff.id] || 0) + 1;
          }

          const loc = getDefaultLocationForStaff(staff, currentSeed + idx);
          generatedSchedules.push({
            id: `sch-${Date.now()}-${dateStr}-${staff.id}`,
            userId: staff.id,
            userName: staff.name,
            userAvatar: staff.avatar,
            staffCode: staff.phone || staff.staffCode,
            department: staff.department,
            date: dateStr,
            shiftId: need.shiftId,
            shiftName: need.shiftName,
            location: loc as any,
            status: 'assigned',
            assignedBy: `Khớp đăng ký (PA #${currentSeed})`,
          });
        });
      }

      for (const need of FIXED_SHIFTS) {
        const targetCount = isWeekend ? need.neededWeekend : need.neededWeekday;
        const currentAssignedInShift = Object.values(assignedShiftByDay[dateStr]).filter(sId => sId === need.shiftId).length;
        const shortage = targetCount - currentAssignedInShift;

        if (shortage <= 0) continue;

        const availableCandidates = users
          .filter(u => canAssignStaffToShift(u, need.shiftId))
          .sort((a, b) => {
            const aHasRegToday = registrations.some(r => r.date === dateStr && matchUserId(r.userId, a.id)) ? 0 : 1;
            const bHasRegToday = registrations.some(r => r.date === dateStr && matchUserId(r.userId, b.id)) ? 0 : 1;
            if (aHasRegToday !== bHasRegToday) return aHasRegToday - bHasRegToday;

            const aBelowMin = (weeklyShiftCount[a.id] || 0) < MIN_SHIFTS_PER_WEEK ? 0 : 1;
            const bBelowMin = (weeklyShiftCount[b.id] || 0) < MIN_SHIFTS_PER_WEEK ? 0 : 1;
            if (aBelowMin !== bBelowMin) return aBelowMin - bBelowMin;

            const countDiff = (weeklyShiftCount[a.id] || 0) - (weeklyShiftCount[b.id] || 0);
            if (Math.abs(countDiff) > 1) return countDiff;

            const rotA = ((Number(a.id.replace(/\D/g, '')) || 1) * 19 + currentSeed * 23 + dayIdx * 11) % 97;
            const rotB = ((Number(b.id.replace(/\D/g, '')) || 2) * 19 + currentSeed * 23 + dayIdx * 11) % 97;
            return rotA - rotB;
          });

        const selectedFillers = availableCandidates.slice(0, shortage);

        selectedFillers.forEach((staff, idx) => {
          assignedShiftByDay[dateStr][staff.id] = need.shiftId;
          weeklyShiftCount[staff.id] = (weeklyShiftCount[staff.id] || 0) + 1;
          if (isWeekend || need.shiftId === 'shift-3') {
            nightWeekendCount[staff.id] = (nightWeekendCount[staff.id] || 0) + 1;
          }

          const loc = getDefaultLocationForStaff(staff, currentSeed + dayIdx + idx);
          const hadOtherReg = registrations.some(r => r.date === dateStr && matchUserId(r.userId, staff.id));

          generatedSchedules.push({
            id: `sch-${Date.now()}-${dateStr}-${staff.id}-${idx}`,
            userId: staff.id,
            userName: staff.name,
            userAvatar: staff.avatar,
            staffCode: staff.phone || staff.staffCode,
            department: staff.department,
            date: dateStr,
            shiftId: need.shiftId,
            shiftName: need.shiftName,
            location: loc as any,
            status: 'assigned',
            assignedBy: hadOtherReg
              ? `Điều chuyển ca (PA #${currentSeed})`
              : `Bù ca thiếu (PA #${currentSeed})`,
          });
        });
      }
    }

    const merged = mergeWorkSchedules(generatedSchedules, allDates);
    setSchedules(merged);

    allDates.forEach(d => {
      if (assignedShiftByDay[d]) {
        approveShiftRegistrationsForDate(d, assignedShiftByDay[d]);
      }
    });
    setRegistrations(prev =>
      prev.map(r => {
        if (!allDates.includes(r.date)) return r;
        const staff = users.find(u => matchUserId(u.id, r.userId));
        const assignedShift = staff ? assignedShiftByDay[r.date]?.[staff.id] : undefined;
        if (assignedShift && matchShiftId(assignedShift, r.shiftId)) {
          return { ...r, status: 'approved' };
        }
        return r;
      })
    );

    try {
      for (const dateStr of allDates) {
        const dayScheds = generatedSchedules.filter(s => s.date === dateStr);
        await publishWorkSchedules(dayScheds, dateStr, `AI Phân Ca (PA #${currentSeed})`);
      }
    } catch {}

    setIsAiLoading(false);
    showToast(
      'success',
      `Đã xếp lịch 7 ngày (Phương án #${currentSeed} — ${generatedSchedules.length} suất ca).`
    );
  };

  const handleRegeneratePlan = () => {
    seedRef.current += 1;
    handleRunSmartWeeklyScheduler(seedRef.current);
  };

  const startEdit = (userId: string, date: string, targetShiftId?: string) => {
    const dayScheds = schedules.filter(s => matchUserId(s.userId, userId) && s.date === date);
    const sch = targetShiftId
      ? dayScheds.find(s => matchShiftId(s.shiftId, targetShiftId))
      : undefined;
    const defaultFreeShift =
      FIXED_SHIFTS.find(n => !dayScheds.some(s => matchShiftId(s.shiftId, n.shiftId)))?.shiftId || 'shift-1';

    setEditingCell({ userId, date, shiftId: targetShiftId });
    setEditShiftId(sch?.shiftId || defaultFreeShift);
    setEditLocation(sch?.location || getDefaultLocationForStaff(users.find(u => matchUserId(u.id, userId))));
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditShiftId('');
    setEditLocation('');
  };

  const handleSaveManual = async (userId: string, date: string) => {
    setIsSavingEdit(true);
    const staff = users.find(u => matchUserId(u.id, userId));

    if (editShiftId === 'off') {
      await handleGiveOff(userId, date, staff?.name || 'Nhân viên', editingCell?.shiftId);
      cancelEdit();
      setIsSavingEdit(false);
      return;
    }

    const needInfo = FIXED_SHIFTS.find(n => matchShiftId(n.shiftId, editShiftId));
    const shiftObj = shifts.find(s => matchShiftId(s.id, editShiftId));
    const shiftName = needInfo?.shiftName || shiftObj?.name || editShiftId;

    const newItem: WorkSchedule = {
      id: `sch-${Date.now()}-${userId}-${date}-${editShiftId}`,
      userId: staff?.id || userId,
      userName: staff?.name || 'Nhân viên',
      userAvatar: staff?.avatar || '',
      staffCode: staff?.phone || staff?.staffCode || '',
      department: staff?.department || 'Box ticket',
      date,
      shiftId: editShiftId,
      shiftName,
      location: editLocation as any,
      status: 'assigned',
      assignedBy: 'Chỉnh thủ công',
    };

    try {
      await assignWorkSchedule({
        userId: String(userId).replace('usr-', ''),
        date,
        shiftId: String(editShiftId).replace('shift-', ''),
        location: editLocation,
      });
    } catch {}

    const updated = saveSingleWorkSchedule(newItem, editingCell?.shiftId);
    setSchedules(updated);
    cancelEdit();
    setIsSavingEdit(false);
    showToast('success', `Đã lưu: ${newItem.userName} → ${shiftName} (${date})`);
  };

  const handleGiveOff = async (userId: string, date: string, name: string, shiftId?: string) => {
    try {
      await deleteWorkScheduleApi({ userId: String(userId).replace('usr-', ''), date });
    } catch {}
    const updated = removeSingleWorkSchedule(userId, date, shiftId);
    setSchedules(updated);
    showToast('info', `Đã xóa ca trực của ${name} ngày ${date}`);
  };

  const weekDateSet = new Set(weekDays.map(d => d.date));
  const weekRegistrations = registrations.filter(r => weekDateSet.has(r.date));
  const pendingRegs = weekRegistrations.filter(r => r.status === 'pending');
  const weekSchedules = schedules.filter(s => weekDateSet.has(s.date));

  const totalSlotsNeededWeek = weekDays.reduce((sum, d) => {
    const isWe = d.dayLabel.includes('Thứ Bảy') || d.dayLabel.includes('Chủ Nhật');
    return sum + FIXED_SHIFTS.reduce((acc, n) => acc + (isWe ? n.neededWeekend : n.neededWeekday), 0);
  }, 0);

  const fillPct = totalSlotsNeededWeek > 0 ? Math.min(100, Math.round((weekSchedules.length / totalSlotsNeededWeek) * 100)) : 0;

  const staffUnderMinRegs = users.filter(u => {
    const count = weekRegistrations.filter(r => matchUserId(r.userId, u.id)).length;
    return count < MIN_SHIFTS_PER_WEEK;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-900">
          Quản Lý Phân Ca ({weekDays[0]?.dayNum} – {weekDays[6]?.dayNum})
        </h2>

        <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => {
              setWeekOffset(0);
              setViewDate(currentWeekDays[0]?.date || today);
              cancelEdit();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              weekOffset === 0
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần Này ({currentWeekDays[0]?.dayNum} – {currentWeekDays[6]?.dayNum})
          </button>
          <button
            onClick={() => {
              setWeekOffset(1);
              setViewDate(nextWeekDays[0]?.date || today);
              cancelEdit();
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              weekOffset === 1
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tuần Tiếp Theo ({nextWeekDays[0]?.dayNum} – {nextWeekDays[6]?.dayNum})
          </button>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center justify-between gap-2.5 p-3 rounded-xl text-xs font-semibold border shadow-sm ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          toast.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> :
             toast.type === 'info' ? <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" /> :
             <XCircle className="w-4 h-4 shrink-0 text-rose-600" />}
            <span>{toast.msg}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Ca Đã Xếp Trong Tuần"
          value={weekSchedules.length}
          unit="ca trực"
          color="emerald"
          icon={<BarChart3 className="w-4 h-4" />}
        />
        <StatCard
          label="Đơn Chờ Duyệt"
          value={pendingRegs.length}
          unit="đơn"
          color="amber"
          icon={<Inbox className="w-4 h-4" />}
        />
        <StatCard
          label="Đăng Ký Thiếu Ca"
          value={staffUnderMinRegs.length}
          unit={`/${users.length} người`}
          color={staffUnderMinRegs.length > 0 ? 'red' : 'emerald'}
          icon={<Bell className="w-4 h-4" />}
        />
        <StatCard
          label="Tổng Nhân Sự"
          value={users.length}
          unit="nhân viên"
          color="purple"
          icon={<ShieldCheck className="w-4 h-4" />}
        />
      </div>

      <div className="flex flex-wrap gap-1.5 bg-slate-200/70 p-1.5 rounded-2xl">
        {[
          { key: 'monthly', icon: <Sparkles className="w-4 h-4" />, label: 'Lịch Tháng Tự Động', badge: null },
          { key: 'published', icon: <LayoutGrid className="w-4 h-4" />, label: 'Bảng Lịch Cả Tuần (7 Ngày)', badge: weekSchedules.length },
          { key: 'registrations', icon: <ClipboardList className="w-4 h-4" />, label: 'Duyệt Đăng Ký Ca', badge: pendingRegs.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 min-w-[160px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== null && tab.badge > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'monthly' && (
        <MonthlyPlannerPanel
          staff={users}
          onPublished={count => {
            setSchedules(getWorkSchedules());
            showToast('success', `Đã xuất bản ${count} ca vào lịch chính thức.`);
            setActiveTab('published');
          }}
        />
      )}

      {activeTab === 'published' && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-[10px] min-w-[160px]">
                    Nhân Viên
                  </th>
                  {weekDays.map(d => (
                    <th key={d.date} className="px-2.5 py-3 text-center font-bold text-slate-600 uppercase text-[10px] min-w-[135px]">
                      <div>{d.shortLabel}</div>
                      <div className="font-mono text-slate-400">{d.dayNum}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center font-bold text-slate-600 uppercase text-[10px]">
                    Tổng Ca
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(staff => {
                  const userScheds = weekSchedules.filter(s => matchUserId(s.userId, staff.id));
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <img src={staff.avatar} alt={staff.name} className="w-7 h-7 rounded-lg object-cover shrink-0" />
                          <div>
                            <div className="font-bold text-slate-900">{staff.name}</div>
                            <div className="text-[10px] text-slate-500">{staff.department}</div>
                          </div>
                        </div>
                      </td>

                      {weekDays.map(d => {
                        const dayScheds = userScheds
                          .filter(s => s.date === d.date)
                          .sort((a, b) => a.shiftId.localeCompare(b.shiftId));
                        const isCellEditing = editingCell?.userId === staff.id && editingCell?.date === d.date;

                        return (
                          <td key={d.date} className="p-2 text-center align-top">
                            {isCellEditing ? (
                              <div className="p-2 bg-indigo-50 border border-indigo-300 rounded-xl space-y-1.5 text-left shadow-sm">
                                <select
                                  value={editShiftId}
                                  onChange={e => setEditShiftId(e.target.value)}
                                  className="w-full border border-indigo-300 rounded px-1.5 py-1 text-[11px] font-bold bg-white"
                                >
                                  {FIXED_SHIFTS.map(n => (
                                    <option key={n.shiftId} value={n.shiftId}>{n.shortName}</option>
                                  ))}
                                  {editingCell?.shiftId && <option value="off">Xóa ca này</option>}
                                </select>
                                {editShiftId !== 'off' && (
                                  <select
                                    value={editLocation}
                                    onChange={e => setEditLocation(e.target.value)}
                                    className="w-full border border-indigo-300 rounded px-1.5 py-1 text-[10px] bg-white"
                                  >
                                    {LOCATIONS.map(loc => (
                                      <option key={loc} value={loc}>{loc}</option>
                                    ))}
                                  </select>
                                )}
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleSaveManual(staff.id, d.date)}
                                    disabled={isSavingEdit}
                                    className="flex-1 py-1 bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                  >Lưu</button>
                                  <button
                                    onClick={cancelEdit}
                                    className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px] font-bold cursor-pointer"
                                  >Đóng</button>
                                </div>
                              </div>
                            ) : dayScheds.length > 0 ? (
                              <div className="space-y-1.5">
                                {dayScheds.map(sch => (
                                  <button
                                    key={sch.id}
                                    onClick={() => startEdit(staff.id, d.date, sch.shiftId)}
                                    className={`w-full p-2 rounded-xl border text-left transition cursor-pointer hover:ring-2 hover:ring-indigo-400 ${
                                      matchShiftId(sch.shiftId, 'shift-1')
                                        ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                                        : matchShiftId(sch.shiftId, 'shift-2')
                                        ? 'bg-purple-50/90 border-purple-200 text-purple-950'
                                        : 'bg-slate-800 border-slate-700 text-white'
                                    }`}
                                  >
                                    <div className="font-bold text-[11px] flex items-center justify-between">
                                      <span>{matchShiftId(sch.shiftId, 'shift-1') ? 'Ca Sáng' : matchShiftId(sch.shiftId, 'shift-2') ? 'Ca Chiều' : 'Ca Đêm'}</span>
                                      <Edit3 className="w-3 h-3 opacity-60" />
                                    </div>
                                    <div className={`text-[10px] truncate mt-0.5 ${matchShiftId(sch.shiftId, 'shift-3') ? 'text-slate-300' : 'text-slate-500'}`}>
                                      {sch.location.replace('Cụm Rạp 1 - ', '')}
                                    </div>
                                  </button>
                                ))}
                                {dayScheds.length < 3 && (
                                  <button
                                    onClick={() => startEdit(staff.id, d.date)}
                                    className="w-full py-1 rounded-lg border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 text-[10px] font-semibold transition cursor-pointer flex items-center justify-center gap-0.5"
                                  >
                                    <UserPlus className="w-2.5 h-2.5" />
                                    <span>Thêm ca</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => startEdit(staff.id, d.date)}
                                className="w-full py-3 rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-400 hover:text-indigo-600 text-[11px] font-medium transition cursor-pointer flex items-center justify-center gap-1"
                              >
                                <UserPlus className="w-3 h-3" />
                                <span>Nghỉ</span>
                              </button>
                            )}
                          </td>
                        );
                      })}

                      <td className="px-3 py-3 text-center">
                        <span className={`font-black text-xs px-2.5 py-1 rounded-lg ${
                          userScheds.length >= MIN_SHIFTS_PER_WEEK && userScheds.length <= MAX_SHIFTS_PER_WEEK
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {userScheds.length} ca
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'registrations' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {staffUnderMinRegs.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-xl">
                  Đăng ký thiếu ca ({staffUnderMinRegs.length}):
                </span>
                {staffUnderMinRegs.map(u => {
                  const cnt = weekRegistrations.filter(r => matchUserId(r.userId, u.id)).length;
                  const isReminded = reminders.some(r => matchUserId(r.userId, u.id) && !r.isRead);
                  return (
                    <span key={u.id} className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-900 inline-flex items-center gap-1.5">
                      <span>{u.name} ({cnt}/{MIN_SHIFTS_PER_WEEK})</span>
                      {isReminded && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700">
                          Đã nhắc
                        </span>
                      )}
                    </span>
                  );
                })}
                <button
                  onClick={() => {
                    const payload = staffUnderMinRegs.map(u => {
                      const cnt = weekRegistrations.filter(r => matchUserId(r.userId, u.id)).length;
                      return {
                        userId: u.id,
                        userName: u.name,
                        registeredCount: cnt,
                        requiredCount: MIN_SHIFTS_PER_WEEK,
                        message: `Quản lý nhắc nhở: Bạn mới đăng ký ${cnt}/${MIN_SHIFTS_PER_WEEK} ca làm việc trong tuần này. Vui lòng đăng ký bổ sung đủ tối thiểu ${MIN_SHIFTS_PER_WEEK} ca!`
                      };
                    });
                    const updated = sendShiftReminders(payload);
                    setReminders(updated);
                    showToast('success', `Đã gửi thông báo nhắc đăng ký ca trực tiếp đến tài khoản của ${staffUnderMinRegs.length} nhân viên!`);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Gửi Nhắc Nhở
                </button>
              </div>
            ) : <div />}

            {pendingRegs.length > 0 && (
              <button
                onClick={handleApproveAll}
                disabled={isPublishing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Duyệt Tất Cả ({pendingRegs.length})</span>
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600 uppercase text-[10px]">Nhân Viên</th>
                    {weekDays.map(d => (
                      <th key={d.date} className="px-3 py-3 text-center font-bold text-slate-600 uppercase text-[10px]">
                        <div>{d.shortLabel}</div>
                        <div className="font-mono text-slate-400">{d.dayNum}</div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-bold text-slate-600 uppercase text-[10px]">Tổng ĐK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(staff => {
                    const myRegs = weekRegistrations.filter(r => matchUserId(r.userId, staff.id));
                    return (
                      <tr key={staff.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={staff.avatar} alt={staff.name} className="w-7 h-7 rounded-lg object-cover" />
                            <div>
                              <div className="font-bold text-slate-900">{staff.name}</div>
                              <div className="text-[10px] text-slate-500">{staff.department}</div>
                            </div>
                          </div>
                        </td>
                        {weekDays.map(d => {
                          const dayRegs = myRegs
                            .filter(r => r.date === d.date)
                            .sort((a, b) => a.shiftId.localeCompare(b.shiftId));
                          return (
                            <td key={d.date} className="px-2 py-2.5 text-center align-top">
                              {dayRegs.length > 0 ? (
                                <div className="flex flex-col items-center gap-1.5">
                                  {dayRegs.map(reg => (
                                    <div key={reg.id} className="inline-flex flex-col items-center gap-1 bg-slate-50/80 p-1.5 rounded-lg border border-slate-100 w-full">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                        reg.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                                        reg.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                        'bg-amber-100 text-amber-900'
                                      }`}>
                                        {matchShiftId(reg.shiftId, 'shift-1') ? 'Ca Sáng' : matchShiftId(reg.shiftId, 'shift-2') ? 'Ca Chiều' : 'Ca Đêm'}
                                      </span>
                                      {reg.status === 'pending' && (
                                        <div className="flex items-center gap-1">
                                          <button
                                            onClick={() => handleApproveSingle(reg)}
                                            disabled={processingId === reg.id}
                                            className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold cursor-pointer"
                                          >Duyệt</button>
                                          <button
                                            onClick={() => handleRejectSingle(reg)}
                                            disabled={processingId === reg.id}
                                            className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 text-[9px] font-bold cursor-pointer"
                                          >Hủy</button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-center">
                          <span className={`font-black text-xs px-2 py-1 rounded-lg ${
                            myRegs.length >= MIN_SHIFTS_PER_WEEK
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {myRegs.length}/{MIN_SHIFTS_PER_WEEK}
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
    </div>
  );
};

function StatCard({ label, value, unit, color, icon }: {
  label: string; value: string | number; unit: string; color: string; icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    amber: 'text-amber-600 border-amber-200',
    emerald: 'text-emerald-600 border-emerald-200',
    red: 'text-rose-600 border-rose-200',
    purple: 'text-purple-600 border-purple-200',
  };
  const cls = colorMap[color] || 'text-slate-700 border-slate-200';
  return (
    <div className={`bg-white border rounded-2xl p-3.5 shadow-sm ${cls.split(' ')[1]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className={cls.split(' ')[0]}>{icon}</span>
      </div>
      <div className={`text-xl font-black ${cls.split(' ')[0]} flex items-baseline gap-1`}>
        <span>{value}</span>
        {unit && <span className="text-xs font-normal text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}
