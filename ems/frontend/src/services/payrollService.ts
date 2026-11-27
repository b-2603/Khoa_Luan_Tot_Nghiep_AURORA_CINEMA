/**
 * PAYROLL & ATTENDANCE ENGINE (HỆ THỐNG TÍNH LƯƠNG TỰ ĐỘNG CHUẨN AURORA CINEMA)
 * Tuân thủ Bộ Luật Lao Động 2019 (Điều 98):
 * - Đơn giá giờ chuẩn linh hoạt theo bộ phận (cấu hình được)
 * - Tự động nhận diện Ngày Lễ (x3.0), Cuối tuần (x1.2), Giờ làm đêm 22:00-06:00 (+30%), Tăng ca OT (x1.5)
 * - Tự động tính phụ cấp cơm ca/gửi xe & thưởng chuyên cần theo điều kiện ca làm việc
 * - Đồng bộ tự động đơn giải trình / miễn trừ phạt đã duyệt (AttendanceException)
 * - Hỗ trợ điều chỉnh thưởng/khấu trừ thủ công, duyệt & chốt trạng thái chi trả theo tháng
 */

import { Attendance, AttendanceException, User, Shift } from '../types';

export const BASE_HOURLY_RATE = 25000;
export const STANDARD_SHIFT_HOURS = 8;

const PAYROLL_CONFIG_KEY = 'aurora_ems_payroll_config_v2';
const PAYROLL_ADJUSTMENTS_KEY = 'aurora_ems_payroll_adjustments_v2';
const PAYROLL_STATUS_KEY = 'aurora_ems_payroll_status_v2';

// =========================================================================
// PAYROLL CONFIGURATION (CẤU HÌNH CHÍNH SÁCH LƯƠNG)
// =========================================================================
export interface PayrollConfig {
  defaultHourlyRate: number;
  departmentRates: Record<string, number>;
  weekendMultiplier: number;       // Hệ số cuối tuần (T7, CN), VD: 1.2
  holidayMultiplier: number;       // Hệ số ngày lễ/Tết (BLLĐ: 3.0)
  nightShiftBonusRate: number;     // Phụ cấp làm đêm 22:00-06:00 (BLLĐ: 0.3 = +30%)
  overtimeMultiplier: number;      // Hệ số giờ tăng ca vượt chuẩn ca (BLLĐ: 1.5)
  mealAllowancePerShift: number;   // Phụ cấp cơm ca & gửi xe (VNĐ / ca >= 4h)
  attendanceBonusAmount: number;   // Thưởng chuyên cần tháng (0 lần trễ bị phạt)
  attendanceBonusMinShifts: number;// Số ca tối thiểu để hưởng thưởng chuyên cần
  graceMinutes: number;            // Số phút du di đầu ca không phạt
  latePenalties: {
    minor: number;    // 6 - 15 phút
    moderate: number; // 16 - 30 phút
    severe: number;   // 31 - 60 phút
    critical: number; // > 60 phút
  };
}

export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  defaultHourlyRate: 25000,
  departmentRates: {
    'Box ticket': 26000,
    'Concession': 25000,
    'Usher': 25000,
    'Processing': 28000,
  },
  weekendMultiplier: 1.2,
  holidayMultiplier: 3.0,
  nightShiftBonusRate: 0.3,
  overtimeMultiplier: 1.5,
  mealAllowancePerShift: 25000,
  attendanceBonusAmount: 300000,
  attendanceBonusMinShifts: 12,
  graceMinutes: 5,
  latePenalties: {
    minor: 20000,
    moderate: 50000,
    severe: 100000,
    critical: 150000,
  },
};

export function getPayrollConfig(): PayrollConfig {
  try {
    const raw = localStorage.getItem(PAYROLL_CONFIG_KEY);
    if (!raw) return DEFAULT_PAYROLL_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PAYROLL_CONFIG,
      ...parsed,
      departmentRates: {
        ...DEFAULT_PAYROLL_CONFIG.departmentRates,
        ...(parsed.departmentRates || {}),
      },
      latePenalties: {
        ...DEFAULT_PAYROLL_CONFIG.latePenalties,
        ...(parsed.latePenalties || {}),
      },
    };
  } catch {
    return DEFAULT_PAYROLL_CONFIG;
  }
}

export function savePayrollConfig(config: PayrollConfig): void {
  localStorage.setItem(PAYROLL_CONFIG_KEY, JSON.stringify(config));
}

export function resetPayrollConfig(): PayrollConfig {
  localStorage.removeItem(PAYROLL_CONFIG_KEY);
  return DEFAULT_PAYROLL_CONFIG;
}

export function resolveHourlyRate(department?: string, config: PayrollConfig = getPayrollConfig()): number {
  if (!department) return config.defaultHourlyRate;
  if (config.departmentRates[department] !== undefined) {
    return config.departmentRates[department];
  }
  const lower = department.toLowerCase();
  if (lower.includes('box') || lower.includes('vé')) return config.departmentRates['Box ticket'] ?? config.defaultHourlyRate;
  if (lower.includes('concession') || lower.includes('bắp')) return config.departmentRates['Concession'] ?? config.defaultHourlyRate;
  if (lower.includes('usher') || lower.includes('soát')) return config.departmentRates['Usher'] ?? config.defaultHourlyRate;
  if (lower.includes('processing') || lower.includes('kỹ thuật') || lower.includes('chế biến')) {
    return config.departmentRates['Processing'] ?? config.defaultHourlyRate;
  }
  return config.defaultHourlyRate;
}

// =========================================================================
// MANUAL ADJUSTMENTS & PAYROLL STATUS STORAGE (PER MONTH)
// =========================================================================
export interface PayrollAdjustment {
  bonus: number;
  bonusNote?: string;
  deduction: number;
  deductionNote?: string;
}

export type PayrollStatus = 'draft' | 'approved' | 'paid';

export function getMonthlyAdjustments(monthStr: string): Record<string, PayrollAdjustment> {
  try {
    const all = JSON.parse(localStorage.getItem(PAYROLL_ADJUSTMENTS_KEY) || '{}');
    return all[monthStr] || {};
  } catch {
    return {};
  }
}

export function saveEmployeeAdjustment(monthStr: string, userId: string, adj: PayrollAdjustment): void {
  try {
    const all = JSON.parse(localStorage.getItem(PAYROLL_ADJUSTMENTS_KEY) || '{}');
    if (!all[monthStr]) all[monthStr] = {};
    all[monthStr][userId] = adj;
    localStorage.setItem(PAYROLL_ADJUSTMENTS_KEY, JSON.stringify(all));
  } catch {
    // ignore storage quota errors
  }
}

export function getMonthlyStatuses(monthStr: string): Record<string, PayrollStatus> {
  try {
    const all = JSON.parse(localStorage.getItem(PAYROLL_STATUS_KEY) || '{}');
    return all[monthStr] || {};
  } catch {
    return {};
  }
}

export function saveEmployeePayrollStatus(monthStr: string, userId: string, status: PayrollStatus): void {
  try {
    const all = JSON.parse(localStorage.getItem(PAYROLL_STATUS_KEY) || '{}');
    if (!all[monthStr]) all[monthStr] = {};
    all[monthStr][userId] = status;
    localStorage.setItem(PAYROLL_STATUS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function saveAllEmployeePayrollStatuses(monthStr: string, userIds: string[], status: PayrollStatus): void {
  try {
    const all = JSON.parse(localStorage.getItem(PAYROLL_STATUS_KEY) || '{}');
    if (!all[monthStr]) all[monthStr] = {};
    userIds.forEach(id => {
      all[monthStr][id] = status;
    });
    localStorage.setItem(PAYROLL_STATUS_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

// =========================================================================
// HOLIDAY & WEEKEND DETECTION
// =========================================================================
export interface HolidayInfo {
  isHoliday: boolean;
  isWeekend?: boolean;
  dayType?: 'normal' | 'weekend' | 'holiday';
  name?: string;
  holidayName?: string;
  multiplier: number;
}

export const VIETNAM_FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Tết Dương Lịch',
  '04-30': 'Giải Phóng Miền Nam (30/4)',
  '05-01': 'Quốc Tế Lao Động (1/5)',
  '05-02': 'Nghỉ Bù Lễ 1/5',
  '09-02': 'Quốc Khánh Việt Nam (2/9)',
  '09-03': 'Nghỉ Lễ Quốc Khánh (3/9)',
};

export const SPECIAL_HOLIDAYS_2026: Record<string, string> = {
  '2026-02-15': '28 Tết Nguyên Đán Bính Ngọ',
  '2026-02-16': '29 Tết Nguyên Đán Bính Ngọ',
  '2026-02-17': 'Giao Thừa - 30 Tết Bính Ngọ',
  '2026-02-18': 'Mùng 1 Tết Nguyên Đán',
  '2026-02-19': 'Mùng 2 Tết Nguyên Đán',
  '2026-02-20': 'Mùng 3 Tết Nguyên Đán',
  '2026-02-21': 'Mùng 4 Tết Nguyên Đán',
  '2026-02-22': 'Mùng 5 Tết Nguyên Đán',
  '2026-04-26': 'Giỗ Tổ Hùng Vương (10/3 ÂL)',
  '2026-04-30': 'Giải Phóng Miền Nam (30/4)',
  '2026-05-01': 'Quốc Tế Lao Động (1/5)',
  '2026-09-02': 'Quốc Khánh (2/9)',
  '2026-09-03': 'Nghỉ Lễ Quốc Khánh',
};

export function checkIsWeekend(dateStr?: string): boolean {
  if (!dateStr) return false;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return false;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay();
  return day === 0 || day === 6; // CN hoặc T7
}

export function checkIsHoliday(dateStr?: string, config?: PayrollConfig): HolidayInfo {
  if (!dateStr) return { isHoliday: false, isWeekend: false, dayType: 'normal', multiplier: 1.0 };

  const cfg = config || getPayrollConfig();

  if (SPECIAL_HOLIDAYS_2026[dateStr]) {
    return {
      isHoliday: true,
      isWeekend: checkIsWeekend(dateStr),
      dayType: 'holiday',
      name: SPECIAL_HOLIDAYS_2026[dateStr],
      holidayName: SPECIAL_HOLIDAYS_2026[dateStr],
      multiplier: cfg.holidayMultiplier,
    };
  }

  const mmdd = dateStr.slice(5);
  if (VIETNAM_FIXED_HOLIDAYS[mmdd]) {
    return {
      isHoliday: true,
      isWeekend: checkIsWeekend(dateStr),
      dayType: 'holiday',
      name: VIETNAM_FIXED_HOLIDAYS[mmdd],
      holidayName: VIETNAM_FIXED_HOLIDAYS[mmdd],
      multiplier: cfg.holidayMultiplier,
    };
  }

  if (checkIsWeekend(dateStr)) {
    return {
      isHoliday: false,
      isWeekend: true,
      dayType: 'weekend',
      name: 'Cuối tuần (T7/CN)',
      multiplier: cfg.weekendMultiplier,
    };
  }

  return { isHoliday: false, isWeekend: false, dayType: 'normal', multiplier: 1.0 };
}

// =========================================================================
// TIME & DURATION CALCULATIONS
// =========================================================================
export function formatLateDuration(minutes: number): string {
  if (minutes <= 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0) {
    return remainingMins > 0 ? `${hours}h${remainingMins}p (${minutes} phút)` : `${hours} giờ (${minutes} phút)`;
  }
  return `${minutes} phút`;
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

export function calculateShiftHours(startTime?: string, endTime?: string): number {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s === null || e === null) return STANDARD_SHIFT_HOURS;
  let endMin = e;
  if (endMin <= s) endMin += 1440;
  return Math.round(((endMin - s) / 60) * 10) / 10;
}

/**
 * Tính số giờ làm việc nằm trong khung giờ Đêm (22:00 - 06:00) theo Điều 106 BLLĐ 2019
 */
export function calculateNightHours(startTime?: string, endTime?: string): number {
  const s = parseTimeToMinutes(startTime);
  const e = parseTimeToMinutes(endTime);
  if (s === null || e === null) return 0;

  let endMin = e;
  if (endMin <= s) endMin += 1440;

  // Khung giờ đêm trong 48h: [0, 360] (00:00-06:00), [1320, 1800] (22:00-06:00 hôm sau), [2760, 2880]
  const nightWindows: [number, number][] = [
    [0, 360],
    [1320, 1800],
    [2760, 2880],
  ];

  let nightMinutes = 0;
  for (const [wStart, wEnd] of nightWindows) {
    const overlap = Math.max(0, Math.min(endMin, wEnd) - Math.max(s, wStart));
    nightMinutes += overlap;
  }
  return Math.round((nightMinutes / 60) * 10) / 10;
}

export function calculateLateMinutes(
  checkInTime?: string,
  shiftStartTime?: string,
  shiftEndTime?: string
): number {
  const ci = parseTimeToMinutes(checkInTime);
  const ss = parseTimeToMinutes(shiftStartTime);
  if (ci === null || ss === null) return 0;

  let checkInMinutes = ci;
  const startMinutes = ss;

  let isOvernight = false;
  const se = parseTimeToMinutes(shiftEndTime);
  if (se !== null) {
    isOvernight = se <= startMinutes;
  } else {
    isOvernight = startMinutes >= 20 * 60;
  }

  if (isOvernight && checkInMinutes < 12 * 60) {
    checkInMinutes += 1440;
  }

  return Math.max(0, checkInMinutes - startMinutes);
}

// =========================================================================
// LATE PENALTY EVALUATION
// =========================================================================
export type LateSeverityTier = 'on_time' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface LatePenaltyResult {
  lateMinutes: number;
  tier: LateSeverityTier;
  level?: LateSeverityTier;
  label: string;
  penaltyAmount: number;
  description: string;
  badgeClass: string;
  isExcessiveLate: boolean;
  isExcused?: boolean;
}

export function evaluateLatePenalty(
  lateMinutes: number,
  isExcused = false,
  config: PayrollConfig = getPayrollConfig()
): LatePenaltyResult {
  if (isExcused) {
    return {
      lateMinutes,
      tier: 'on_time',
      level: 'on_time',
      label: 'Đã miễn trừ phạt',
      penaltyAmount: 0,
      description: 'Quản lý đã phê duyệt đơn giải trình / miễn trừ',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isExcessiveLate: false,
      isExcused: true,
    };
  }

  if (lateMinutes <= config.graceMinutes) {
    return {
      lateMinutes,
      tier: 'on_time',
      level: 'on_time',
      label: lateMinutes === 0 ? 'Đúng giờ chuẩn' : `Trễ ${lateMinutes}p (Du di)`,
      penaltyAmount: 0,
      description: `Trong hạn mức du di ${config.graceMinutes} phút đầu ca`,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  if (lateMinutes <= 15) {
    return {
      lateMinutes,
      tier: 'minor',
      level: 'minor',
      label: `Trễ ${lateMinutes}p (Nhẹ)`,
      penaltyAmount: config.latePenalties.minor,
      description: `Trừ ${formatCurrencyVND(config.latePenalties.minor)} do đi muộn 6 – 15 phút`,
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  if (lateMinutes <= 30) {
    return {
      lateMinutes,
      tier: 'moderate',
      level: 'moderate',
      label: `Trễ ${lateMinutes}p (Vừa)`,
      penaltyAmount: config.latePenalties.moderate,
      description: `Trừ ${formatCurrencyVND(config.latePenalties.moderate)} do đi muộn 16 – 30 phút`,
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  if (lateMinutes <= 60) {
    return {
      lateMinutes,
      tier: 'severe',
      level: 'severe',
      label: `Trễ ${lateMinutes}p (Nặng)`,
      penaltyAmount: config.latePenalties.severe,
      description: `Trừ ${formatCurrencyVND(config.latePenalties.severe)} do đi muộn 31 – 60 phút`,
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  const lateFormatted = formatLateDuration(lateMinutes);
  return {
    lateMinutes,
    tier: 'critical',
    level: 'critical',
    label: `Trễ ${lateFormatted} (>60p)`,
    penaltyAmount: config.latePenalties.critical,
    description: `Trừ ${formatCurrencyVND(config.latePenalties.critical)} – Trễ quá 60 phút, vi phạm ca trực`,
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    isExcessiveLate: true,
    isExcused: false,
  };
}

// =========================================================================
// SHIFT WAGE CALCULATION (CHI TIẾT TỪNG CA)
// =========================================================================
export interface ShiftWageDetail {
  hoursWorked: number;
  standardHours: number;
  overtimeHours: number;
  nightHours: number;
  hourlyRate: number;
  isHoliday: boolean;
  isWeekend: boolean;
  dayType: 'normal' | 'weekend' | 'holiday';
  holidayName?: string;
  multiplier: number;
  baseWage: number;           // Lương giờ chuẩn (standardHours * hourlyRate)
  dayTypePremium: number;     // Phụ trội Cuối tuần / Ngày Lễ
  overtimeWage: number;       // Tiền giờ tăng ca (overtimeHours * hourlyRate * multiplier * otMultiplier)
  nightAllowance: number;     // Phụ cấp làm đêm (+30% trên giờ đêm)
  mealAllowance: number;      // Phụ cấp cơm ca & gửi xe
  rawShiftWage: number;       // Tổng lương công ca (base + dayTypePremium + OT + nightAllowance)
  penaltyAmount: number;      // Tiền phạt đi muộn
  netShiftWage: number;       // Thực nhận ca (rawShiftWage + mealAllowance - penalty)
  lateMinutes: number;
  lateInfo: LatePenaltyResult;
  isInProgress?: boolean;     // Đang trong ca (chưa check-out, đang tích lũy lương theo giờ thực tế)
}

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeString(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Tính số phút thực tế đã trôi qua từ checkIn đến mốc kết thúc (now hoặc shiftEndTime).
 * Giới hạn không vượt quá giờ kết thúc ca đối với ca đang diễn ra chưa check-out.
 */
function calculateElapsedShiftHours(
  checkIn: string,
  nowTime: string,
  shiftStartTime: string,
  shiftEndTime: string
): { hours: number; effectiveEndTime: string } {
  const ci = parseTimeToMinutes(checkIn);
  const nowM = parseTimeToMinutes(nowTime);
  const ss = parseTimeToMinutes(shiftStartTime);
  const se = parseTimeToMinutes(shiftEndTime);
  if (ci === null || nowM === null) return { hours: 0, effectiveEndTime: checkIn };

  const isOvernight = ss !== null && se !== null && se <= ss;
  let ciAdj = ci;
  let nowAdj = nowM;
  let endAdj = se !== null ? se : ci + STANDARD_SHIFT_HOURS * 60;

  if (isOvernight) {
    if (endAdj <= (ss ?? 0)) endAdj += 1440;
    if (ciAdj < 12 * 60) ciAdj += 1440;
    if (nowAdj < 12 * 60) nowAdj += 1440;
  }

  const cappedEnd = Math.min(nowAdj, endAdj);
  const diffMins = Math.max(0, cappedEnd - ciAdj);
  const hours = Math.round((diffMins / 60) * 10) / 10;
  const effMod = ((cappedEnd % 1440) + 1440) % 1440;
  const effectiveEndTime = `${String(Math.floor(effMod / 60)).padStart(2, '0')}:${String(effMod % 60).padStart(2, '0')}`;
  return { hours, effectiveEndTime };
}

export function calculateShiftWage(params: {
  date: string;
  checkIn?: string;
  checkOut?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hoursWorked?: number;
  isExcused?: boolean;
  hourlyRate?: number;
  department?: string;
  config?: PayrollConfig;
}): ShiftWageDetail {
  const cfg = params.config || getPayrollConfig();
  const {
    date,
    checkIn,
    checkOut,
    shiftStartTime = '08:00',
    shiftEndTime = '16:00',
    isExcused = false,
  } = params;

  const hourlyRate = params.hourlyRate ?? resolveHourlyRate(params.department, cfg);
  const plannedHours = calculateShiftHours(shiftStartTime, shiftEndTime);

  // Xác định số giờ làm thực tế theo thời gian làm việc thực (tích lũy từng giờ đến hết ca)
  let hoursWorked = 0;
  let isInProgress = false;
  let actualStart = checkIn || shiftStartTime;
  let actualEnd = checkOut || shiftEndTime;

  if (params.hoursWorked !== undefined && params.hoursWorked > 0) {
    hoursWorked = Math.round(params.hoursWorked * 10) / 10;
  } else if (checkIn && checkOut) {
    hoursWorked = calculateShiftHours(checkIn, checkOut);
  } else if (checkIn && !checkOut) {
    const todayStr = getTodayDateString();
    if (date === todayStr) {
      // Đang trong ca hôm nay: tính đúng số giờ thực tế đã làm từ lúc check-in đến hiện tại (tối đa đến hết ca)
      const elapsed = calculateElapsedShiftHours(checkIn, getCurrentTimeString(), shiftStartTime, shiftEndTime);
      hoursWorked = elapsed.hours;
      actualEnd = elapsed.effectiveEndTime;
      isInProgress = true;
    } else if (date < todayStr) {
      // Ca quá khứ có check-in nhưng chưa có check-out: tính từ lúc check-in thực tế đến hết ca
      hoursWorked = calculateShiftHours(checkIn, shiftEndTime);
      actualEnd = shiftEndTime;
    } else {
      hoursWorked = 0;
    }
  } else {
    hoursWorked = 0;
  }

  // Tách Giờ tiêu chuẩn vs Giờ tăng ca (OT)
  const standardHours = Math.round(Math.min(hoursWorked, plannedHours) * 10) / 10;
  const overtimeHours = Math.round(Math.max(0, hoursWorked - plannedHours) * 10) / 10;

  // Giờ làm đêm (22:00 - 06:00)
  const rawNightHours = hoursWorked > 0 ? calculateNightHours(actualStart, actualEnd) : 0;
  const nightHours = Math.min(hoursWorked, rawNightHours);

  // Kiểm tra Ngày thường / Cuối tuần / Lễ
  const dayInfo = checkIsHoliday(date, cfg);
  const multiplier = dayInfo.multiplier;
  const dayType = dayInfo.dayType || 'normal';

  // Tính đi muộn & tiền phạt
  const lateMinutes = checkIn ? calculateLateMinutes(checkIn, shiftStartTime, shiftEndTime) : 0;
  const lateInfo = evaluateLatePenalty(lateMinutes, isExcused, cfg);

  // Tính chi tiết từng cấu phần lương
  const baseWage = Math.round(standardHours * hourlyRate);
  const dayTypePremium = Math.round(standardHours * hourlyRate * (multiplier - 1));
  const effectiveOtMultiplier = dayInfo.isHoliday
    ? cfg.holidayMultiplier
    : Math.max(cfg.overtimeMultiplier, multiplier * cfg.overtimeMultiplier);
  const overtimeWage = Math.round(overtimeHours * hourlyRate * effectiveOtMultiplier);
  const nightAllowance = Math.round(nightHours * hourlyRate * cfg.nightShiftBonusRate);
  const mealAllowance = hoursWorked >= 4 ? cfg.mealAllowancePerShift : 0;

  const rawShiftWage = baseWage + dayTypePremium + overtimeWage + nightAllowance;
  const netShiftWage = Math.max(0, rawShiftWage + mealAllowance - lateInfo.penaltyAmount);

  return {
    hoursWorked,
    standardHours,
    overtimeHours,
    nightHours,
    hourlyRate,
    isHoliday: dayInfo.isHoliday,
    isWeekend: Boolean(dayInfo.isWeekend),
    dayType,
    holidayName: dayInfo.name,
    multiplier,
    baseWage,
    dayTypePremium,
    overtimeWage,
    nightAllowance,
    mealAllowance,
    rawShiftWage,
    penaltyAmount: lateInfo.penaltyAmount,
    netShiftWage,
    lateMinutes,
    lateInfo,
    isInProgress,
  };
}

// =========================================================================
// MONTHLY PAYROLL AGGREGATION (TỔNG HỢP BẢNG LƯƠNG THÁNG)
// =========================================================================
export interface EmployeeShiftLine {
  attendance: Attendance;
  shiftStartTime: string;
  shiftEndTime: string;
  isExcused: boolean;
  excuseSource?: string;
  wage: ShiftWageDetail;
}

export interface EmployeeMonthlyPayroll {
  userId: string;
  userName: string;
  staffCode: string;
  department: string;
  avatar?: string;
  hourlyRate: number;
  totalShifts: number;
  normalShifts: number;
  weekendShifts: number;
  holidayShifts: number;
  totalHours: number;
  totalStandardHours: number;
  totalOvertimeHours: number;
  totalNightHours: number;
  // Earnings breakdown
  baseWageTotal: number;
  dayTypePremiumTotal: number;
  overtimeWageTotal: number;
  nightAllowanceTotal: number;
  totalRawWage: number;       // Tổng lương công (base + premium + OT + night)
  mealAllowanceTotal: number; // Phụ cấp cơm ca & gửi xe
  attendanceBonus: number;    // Thưởng chuyên cần tự động
  attendanceBonusEligible: boolean;
  attendanceBonusReason: string;
  manualBonus: number;
  manualBonusNote?: string;
  totalAllowancesAndBonuses: number;
  totalGrossIncome: number;   // Tổng thu nhập trước khấu trừ
  // Deductions breakdown
  totalLateCount: number;
  totalExcusedCount: number;
  totalExcessiveLateCount: number;
  totalLateMinutes: number;
  totalPenalties: number;     // Phạt đi muộn
  manualDeduction: number;
  manualDeductionNote?: string;
  totalDeductions: number;
  // Net Pay
  totalNetWage: number;
  status: PayrollStatus;
  shiftLines: EmployeeShiftLine[];
}

export interface MonthlyPayrollSummary {
  month: string;
  monthName: string;
  config: PayrollConfig;
  totalEmployees: number;
  activeEmployees: number;
  totalShiftsAll: number;
  totalHoursAll: number;
  totalOvertimeHoursAll: number;
  totalNightHoursAll: number;
  totalGrossWageAll: number;
  totalAllowancesAll: number;
  totalPenaltiesAll: number;
  totalDeductionsAll: number;
  totalNetWageAll: number;
  holidayShiftCountAll: number;
  weekendShiftCountAll: number;
  excusedCountAll: number;
  approvedCount: number;
  paidCount: number;
  employees: EmployeeMonthlyPayroll[];
}

function resolveShiftWindow(att: Attendance, shiftMap: Map<string, Shift>): { startTime: string; endTime: string } {
  const shiftObj = att.shiftId ? shiftMap.get(att.shiftId) : undefined;
  if (shiftObj) {
    return { startTime: shiftObj.startTime, endTime: shiftObj.endTime };
  }
  if (att.shiftId === 'shift-2' || att.shiftName?.includes('Chiều')) {
    return { startTime: '15:30', endTime: '23:00' };
  }
  if (att.shiftId === 'shift-3' || att.shiftName?.includes('Đêm')) {
    return { startTime: '22:00', endTime: '02:00' };
  }
  return { startTime: '08:00', endTime: '16:00' };
}

export function generateMonthlyPayroll(
  monthStr: string,
  users: User[],
  attendances: Attendance[],
  shifts: Shift[] = [],
  exceptions: AttendanceException[] = [],
  configOverride?: PayrollConfig
): MonthlyPayrollSummary {
  const cfg = configOverride || getPayrollConfig();
  const adjustments = getMonthlyAdjustments(monthStr);
  const statuses = getMonthlyStatuses(monthStr);

  const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();
  const shiftMap = new Map<string, Shift>();
  shifts.forEach(s => {
    shiftMap.set(s.id, s);
    shiftMap.set(s.id.replace('shift-', ''), s);
  });

  const approvedExceptions = exceptions.filter(e => e.status === 'approved');
  const staffUsers = users.filter(u => u.role !== 'manager');

  const employeePayrolls: EmployeeMonthlyPayroll[] = staffUsers.map(user => {
    const userRate = resolveHourlyRate(user.department, cfg);

    const userAtts = attendances
      .filter(a => {
        const matchU =
          cleanId(a.userId) === cleanId(user.id) ||
          (a.userName && user.name && a.userName.toLowerCase().trim() === user.name.toLowerCase().trim());
        return matchU && a.date.startsWith(monthStr) && Boolean(a.checkIn);
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    let totalHours = 0;
    let totalStandardHours = 0;
    let totalOvertimeHours = 0;
    let totalNightHours = 0;
    let normalShifts = 0;
    let weekendShifts = 0;
    let holidayShifts = 0;

    let baseWageTotal = 0;
    let dayTypePremiumTotal = 0;
    let overtimeWageTotal = 0;
    let nightAllowanceTotal = 0;
    let totalRawWage = 0;
    let mealAllowanceTotal = 0;

    let totalLateCount = 0;
    let totalExcusedCount = 0;
    let totalExcessiveLateCount = 0;
    let totalLateMinutes = 0;
    let totalPenalties = 0;

    const shiftLines: EmployeeShiftLine[] = userAtts.map(att => {
      const { startTime, endTime } = resolveShiftWindow(att, shiftMap);

      // Đồng bộ tự động với Đơn ngoại lệ đã duyệt (AttendanceException)
      const matchedExc = approvedExceptions.find(e => {
        const sameUser =
          cleanId(e.userId) === cleanId(user.id) ||
          (e.staffCode && (e.staffCode === user.phone || e.staffCode === user.staffCode)) ||
          (e.userName && e.userName.toLowerCase().trim() === user.name.toLowerCase().trim());
        return sameUser && e.targetDate === att.date;
      });

      const noteExcused = Boolean(
        att.note?.toLowerCase().includes('đã duyệt') || att.note?.toLowerCase().includes('miễn phạt')
      );
      const isExcused = Boolean(matchedExc) || noteExcused;
      const excuseSource = matchedExc
        ? `Đơn "${matchedExc.typeTitle}" đã duyệt`
        : noteExcused
        ? 'Miễn phạt theo ghi chú quản lý'
        : undefined;

      const wage = calculateShiftWage({
        date: att.date,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        shiftStartTime: startTime,
        shiftEndTime: endTime,
        hoursWorked: att.hoursWorked > 0 ? att.hoursWorked : undefined,
        isExcused,
        hourlyRate: userRate,
        config: cfg,
      });

      totalHours += wage.hoursWorked;
      totalStandardHours += wage.standardHours;
      totalOvertimeHours += wage.overtimeHours;
      totalNightHours += wage.nightHours;

      if (wage.isHoliday) holidayShifts += 1;
      else if (wage.isWeekend) weekendShifts += 1;
      else normalShifts += 1;

      baseWageTotal += wage.baseWage;
      dayTypePremiumTotal += wage.dayTypePremium;
      overtimeWageTotal += wage.overtimeWage;
      nightAllowanceTotal += wage.nightAllowance;
      totalRawWage += wage.rawShiftWage;
      mealAllowanceTotal += wage.mealAllowance;
      totalPenalties += wage.penaltyAmount;

      if (wage.lateMinutes > cfg.graceMinutes) {
        if (isExcused) {
          totalExcusedCount += 1;
        } else {
          totalLateCount += 1;
          totalLateMinutes += wage.lateMinutes;
          if (wage.lateInfo.isExcessiveLate) {
            totalExcessiveLateCount += 1;
          }
        }
      }

      return {
        attendance: att,
        shiftStartTime: startTime,
        shiftEndTime: endTime,
        isExcused,
        excuseSource,
        wage,
      };
    });

    // Thưởng chuyên cần tự động
    const totalShifts = userAtts.length;
    const attendanceBonusEligible =
      cfg.attendanceBonusAmount > 0 &&
      totalShifts >= cfg.attendanceBonusMinShifts &&
      totalLateCount === 0;

    const attendanceBonus = attendanceBonusEligible ? cfg.attendanceBonusAmount : 0;
    const attendanceBonusReason =
      cfg.attendanceBonusAmount <= 0
        ? 'Chính sách thưởng chuyên cần đang tắt'
        : attendanceBonusEligible
        ? `Đạt chuẩn (${totalShifts}/${cfg.attendanceBonusMinShifts} ca, 0 lần trễ)`
        : totalShifts < cfg.attendanceBonusMinShifts
        ? `Chưa đủ số ca tối thiểu (${totalShifts}/${cfg.attendanceBonusMinShifts} ca)`
        : `Có ${totalLateCount} lần đi muộn bị phạt`;

    // Điều chỉnh thưởng / khấu trừ thủ công
    const adj = adjustments[user.id] || { bonus: 0, deduction: 0 };
    const manualBonus = Math.max(0, Number(adj.bonus) || 0);
    const manualDeduction = Math.max(0, Number(adj.deduction) || 0);

    const totalAllowancesAndBonuses = mealAllowanceTotal + attendanceBonus + manualBonus;
    const totalGrossIncome = totalRawWage + totalAllowancesAndBonuses;
    const totalDeductions = totalPenalties + manualDeduction;
    const totalNetWage = Math.max(0, totalGrossIncome - totalDeductions);

    return {
      userId: user.id,
      userName: user.name,
      staffCode: user.phone || user.staffCode || cleanId(user.id),
      department: user.department || 'Nhân viên rạp',
      avatar: user.avatar,
      hourlyRate: userRate,
      totalShifts,
      normalShifts,
      weekendShifts,
      holidayShifts,
      totalHours: Math.round(totalHours * 10) / 10,
      totalStandardHours: Math.round(totalStandardHours * 10) / 10,
      totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
      totalNightHours: Math.round(totalNightHours * 10) / 10,
      baseWageTotal,
      dayTypePremiumTotal,
      overtimeWageTotal,
      nightAllowanceTotal,
      totalRawWage,
      mealAllowanceTotal,
      attendanceBonus,
      attendanceBonusEligible,
      attendanceBonusReason,
      manualBonus,
      manualBonusNote: adj.bonusNote,
      totalAllowancesAndBonuses,
      totalGrossIncome,
      totalLateCount,
      totalExcusedCount,
      totalExcessiveLateCount,
      totalLateMinutes,
      totalPenalties,
      manualDeduction,
      manualDeductionNote: adj.deductionNote,
      totalDeductions,
      totalNetWage,
      status: statuses[user.id] || 'draft',
      shiftLines,
    };
  });

  const [y, m] = monthStr.split('-');
  const monthName = `Tháng ${Number(m)}/${y}`;

  return {
    month: monthStr,
    monthName,
    config: cfg,
    totalEmployees: staffUsers.length,
    activeEmployees: employeePayrolls.filter(e => e.totalShifts > 0).length,
    totalShiftsAll: employeePayrolls.reduce((s, e) => s + e.totalShifts, 0),
    totalHoursAll: Math.round(employeePayrolls.reduce((s, e) => s + e.totalHours, 0) * 10) / 10,
    totalOvertimeHoursAll: Math.round(employeePayrolls.reduce((s, e) => s + e.totalOvertimeHours, 0) * 10) / 10,
    totalNightHoursAll: Math.round(employeePayrolls.reduce((s, e) => s + e.totalNightHours, 0) * 10) / 10,
    totalGrossWageAll: employeePayrolls.reduce((s, e) => s + e.totalRawWage, 0),
    totalAllowancesAll: employeePayrolls.reduce((s, e) => s + e.totalAllowancesAndBonuses, 0),
    totalPenaltiesAll: employeePayrolls.reduce((s, e) => s + e.totalPenalties, 0),
    totalDeductionsAll: employeePayrolls.reduce((s, e) => s + e.totalDeductions, 0),
    totalNetWageAll: employeePayrolls.reduce((s, e) => s + e.totalNetWage, 0),
    holidayShiftCountAll: employeePayrolls.reduce((s, e) => s + e.holidayShifts, 0),
    weekendShiftCountAll: employeePayrolls.reduce((s, e) => s + e.weekendShifts, 0),
    excusedCountAll: employeePayrolls.reduce((s, e) => s + e.totalExcusedCount, 0),
    approvedCount: employeePayrolls.filter(e => e.status === 'approved').length,
    paidCount: employeePayrolls.filter(e => e.status === 'paid').length,
    employees: employeePayrolls,
  };
}

// =========================================================================
// FORMATTING & EXPORTS (EXCEL CSV + PRINTABLE PAYSLIP)
// =========================================================================
export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(amount));
}

export function exportPayrollCSV(summary: MonthlyPayrollSummary): void {
  const headers = [
    'STT',
    'Mã NV',
    'Họ và Tên',
    'Bộ Phận',
    'Đơn Giá (VNĐ/h)',
    'Tổng Ca',
    'Ca Thường',
    'Ca Cuối Tuần',
    'Ca Lễ (x3)',
    'Tổng Giờ (h)',
    'Giờ OT (h)',
    'Giờ Đêm (h)',
    'Lương Cơ Bản',
    'Phụ Trội Lễ/Cuối Tuần',
    'Lương OT',
    'Phụ Cấp Ca Đêm',
    'Phụ Cấp Cơm/Xe',
    'Thưởng Chuyên Cần',
    'Thưởng Khác',
    'Lần Đi Muộn',
    'Phạt Đi Muộn',
    'Khấu Trừ Khác',
    'Thực Lĩnh (VNĐ)',
    'Trạng Thái',
  ];

  const statusLabel = (s: PayrollStatus) =>
    s === 'paid' ? 'Đã chi trả' : s === 'approved' ? 'Đã chốt' : 'Bản nháp';

  const rows = summary.employees.map((e, idx) => [
    idx + 1,
    `"${e.staffCode}"`,
    `"${e.userName}"`,
    `"${e.department}"`,
    e.hourlyRate,
    e.totalShifts,
    e.normalShifts,
    e.weekendShifts,
    e.holidayShifts,
    e.totalHours,
    e.totalOvertimeHours,
    e.totalNightHours,
    e.baseWageTotal,
    e.dayTypePremiumTotal,
    e.overtimeWageTotal,
    e.nightAllowanceTotal,
    e.mealAllowanceTotal,
    e.attendanceBonus,
    e.manualBonus,
    e.totalLateCount,
    e.totalPenalties,
    e.manualDeduction,
    e.totalNetWage,
    `"${statusLabel(e.status)}"`,
  ]);

  const csvContent =
    '\uFEFF' +
    [
      `BẢNG LƯƠNG TỔNG HỢP CHI TIẾT - AURORA CINEMA - ${summary.monthName.toUpperCase()}`,
      `Ngày xuất: ${new Date().toLocaleDateString('vi-VN')} | Hệ số: Cuối tuần x${summary.config.weekendMultiplier} | Lễ x${summary.config.holidayMultiplier} | Ca đêm +${Math.round(summary.config.nightShiftBonusRate * 100)}% | OT x${summary.config.overtimeMultiplier}`,
      '',
      headers.join(','),
      ...rows.map(r => r.join(',')),
      '',
      `TỔNG CỘNG,,,"${summary.totalEmployees} nhân sự",,${summary.totalShiftsAll},,${summary.weekendShiftCountAll},${summary.holidayShiftCountAll},${summary.totalHoursAll},${summary.totalOvertimeHoursAll},${summary.totalNightHoursAll},,,,,,"${summary.totalAllowancesAll}",,,,"${summary.totalDeductionsAll}",${summary.totalNetWageAll},`,
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bang_Luong_Chi_Tiet_Aurora_${summary.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function printEmployeePayslip(emp: EmployeeMonthlyPayroll, monthName: string): void {
  const win = window.open('', '_blank', 'width=840,height=920');
  if (!win) return;

  const esc = (s?: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  const shiftRows = emp.shiftLines
    .map(
      line => `
      <tr>
        <td>${esc(line.attendance.date)}</td>
        <td>${esc(line.attendance.shiftName || 'Ca trực')}${
          line.wage.isHoliday ? ' <span class="tag tag-purple">Lễ x' + line.wage.multiplier + '</span>' :
          line.wage.isWeekend ? ' <span class="tag tag-amber">Cuối tuần</span>' : ''
        }</td>
        <td>${esc(line.attendance.checkIn || '--')} - ${esc(line.attendance.checkOut || '--')}</td>
        <td style="text-align:right">${line.wage.hoursWorked}h${line.wage.overtimeHours > 0 ? ` (+${line.wage.overtimeHours}h OT)` : ''}</td>
        <td style="text-align:right">${formatCurrencyVND(line.wage.rawShiftWage + line.wage.mealAllowance)}</td>
        <td style="text-align:right;color:${line.wage.penaltyAmount > 0 ? '#be123c' : '#64748b'}">${line.wage.penaltyAmount > 0 ? '-' + formatCurrencyVND(line.wage.penaltyAmount) : '0 ₫'}</td>
        <td style="text-align:right;font-weight:700">${formatCurrencyVND(line.wage.netShiftWage)}</td>
      </tr>`
    )
    .join('');

  win.document.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Phiếu Lương ${esc(emp.userName)} - ${esc(monthName)}</title>
  <style>
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #0f172a; margin: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
    .brand { font-size: 18px; font-weight: 800; letter-spacing: 0.5px; }
    .sub { color: #64748b; font-size: 12px; margin-top: 2px; }
    .title { text-align: right; }
    .title h1 { margin: 0; font-size: 20px; text-transform: uppercase; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 14px 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
    .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
    .card h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; color: #475569; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
    .row.total { border-top: 1px dashed #cbd5e1; margin-top: 6px; padding-top: 8px; font-weight: 700; }
    .net-box { background: #0f172a; color: #fff; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .net-amount { font-size: 22px; font-weight: 800; color: #fbbf24; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; color: #475569; }
    .tag { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 700; }
    .tag-purple { background: #f3e8ff; color: #6b21a8; }
    .tag-amber { background: #fef3c7; color: #92400e; }
    .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 36px; text-align: center; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">AURORA CINEMAS EMS</div>
      <div class="sub">Hệ thống Quản lý Nhân sự & Tiền lương Cụm Rạp</div>
    </div>
    <div class="title">
      <h1>PHIẾU LƯƠNG NHÂN VIÊN</h1>
      <div class="sub">Kỳ lương: ${esc(monthName)} • Ngày in: ${new Date().toLocaleDateString('vi-VN')}</div>
    </div>
  </div>

  <div class="meta">
    <div><strong>Họ và tên:</strong> ${esc(emp.userName)}</div>
    <div><strong>Mã nhân viên:</strong> ${esc(emp.staffCode)}</div>
    <div><strong>Bộ phận:</strong> ${esc(emp.department)}</div>
    <div><strong>Đơn giá chuẩn:</strong> ${formatCurrencyVND(emp.hourlyRate)}/giờ • <strong>Tổng công:</strong> ${emp.totalShifts} ca (${emp.totalHours}h)</div>
  </div>

  <div class="grid">
    <div class="card">
      <h3>Khoản Thu Nhập (Earnings)</h3>
      <div class="row"><span>Lương giờ chuẩn (${emp.totalStandardHours}h)</span><span>${formatCurrencyVND(emp.baseWageTotal)}</span></div>
      <div class="row"><span>Phụ trội Cuối tuần / Lễ</span><span>${formatCurrencyVND(emp.dayTypePremiumTotal)}</span></div>
      <div class="row"><span>Lương tăng ca OT (${emp.totalOvertimeHours}h)</span><span>${formatCurrencyVND(emp.overtimeWageTotal)}</span></div>
      <div class="row"><span>Phụ cấp làm đêm (${emp.totalNightHours}h)</span><span>${formatCurrencyVND(emp.nightAllowanceTotal)}</span></div>
      <div class="row"><span>Phụ cấp cơm ca & gửi xe</span><span>${formatCurrencyVND(emp.mealAllowanceTotal)}</span></div>
      <div class="row"><span>Thưởng chuyên cần</span><span>${formatCurrencyVND(emp.attendanceBonus)}</span></div>
      ${emp.manualBonus > 0 ? `<div class="row"><span>Thưởng khác (${esc(emp.manualBonusNote || 'Điều chỉnh')})</span><span>${formatCurrencyVND(emp.manualBonus)}</span></div>` : ''}
      <div class="row total"><span>Tổng thu nhập (Gross)</span><span>${formatCurrencyVND(emp.totalGrossIncome)}</span></div>
    </div>

    <div class="card">
      <h3>Khoản Khấu Trừ (Deductions)</h3>
      <div class="row"><span>Phạt đi muộn (${emp.totalLateCount} lần / ${emp.totalLateMinutes}p)</span><span style="color:#be123c">-${formatCurrencyVND(emp.totalPenalties)}</span></div>
      ${emp.totalExcusedCount > 0 ? `<div class="row"><span style="color:#047857">Số lần đã duyệt miễn trừ</span><span style="color:#047857">${emp.totalExcusedCount} lần (0 ₫)</span></div>` : ''}
      ${emp.manualDeduction > 0 ? `<div class="row"><span>Khấu trừ / Ứng lương (${esc(emp.manualDeductionNote || 'Điều chỉnh')})</span><span style="color:#be123c">-${formatCurrencyVND(emp.manualDeduction)}</span></div>` : ''}
      <div class="row total"><span>Tổng khấu trừ</span><span style="color:#be123c">-${formatCurrencyVND(emp.totalDeductions)}</span></div>
    </div>
  </div>

  <div class="net-box">
    <div>
      <div style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.6px">Lương Thực Lĩnh (Net Pay)</div>
      <div style="font-size:12px;color:#cbd5e1;margin-top:2px">Chuyển khoản / Tiền mặt kỳ ${esc(monthName)}</div>
    </div>
    <div class="net-amount">${formatCurrencyVND(emp.totalNetWage)}</div>
  </div>

  <h3 style="margin-bottom:8px;font-size:13px;text-transform:uppercase;color:#475569">Bảng Kê Chi Tiết Từng Ca Làm Việc (${emp.shiftLines.length} ca)</h3>
  <table>
    <thead>
      <tr>
        <th>Ngày</th>
        <th>Ca trực</th>
        <th>Vào - Ra</th>
        <th style="text-align:right">Giờ công</th>
        <th style="text-align:right">Lương + PC</th>
        <th style="text-align:right">Phạt trễ</th>
        <th style="text-align:right">Thực nhận</th>
      </tr>
    </thead>
    <tbody>
      ${shiftRows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8">Chưa có ca làm việc</td></tr>'}
    </tbody>
  </table>

  <div class="sign">
    <div><strong>Người Lập Biểu / Quản Lý Rạp</strong><div class="sub">(Ký và ghi rõ họ tên)</div></div>
    <div><strong>Nhân Viên Xác Nhận</strong><div class="sub">(Ký và ghi rõ họ tên)</div></div>
  </div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

// =========================================================================
// EXCEL EXPORT (SpreadsheetML - mở thẳng bằng Excel, đúng cột, không dính chữ)
// =========================================================================
export function exportPayrollExcel(summary: MonthlyPayrollSummary): void {
  const x = (s: string | number) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const statusLabel = (s: PayrollStatus) =>
    s === 'paid' ? 'Đã chi trả' : s === 'approved' ? 'Đã chốt' : 'Bản nháp';

  type Col = { h: string; w: number; money?: boolean; sum?: boolean; get: (e: EmployeeMonthlyPayroll, i: number) => string | number };
  const cols: Col[] = [
    { h: 'STT', w: 40, get: (_e, i) => i + 1 },
    { h: 'Mã NV', w: 95, get: e => e.staffCode },
    { h: 'Họ và Tên', w: 160, get: e => e.userName },
    { h: 'Bộ Phận', w: 95, get: e => e.department },
    { h: 'Đơn giá (đ/giờ)', w: 95, money: true, get: e => e.hourlyRate },
    { h: 'Tổng ca', w: 60, sum: true, get: e => e.totalShifts },
    { h: 'Ca thường', w: 65, sum: true, get: e => e.normalShifts },
    { h: 'Ca cuối tuần', w: 75, sum: true, get: e => e.weekendShifts },
    { h: 'Ca lễ', w: 55, sum: true, get: e => e.holidayShifts },
    { h: 'Tổng giờ', w: 65, sum: true, get: e => e.totalHours },
    { h: 'Giờ OT', w: 60, sum: true, get: e => e.totalOvertimeHours },
    { h: 'Giờ đêm', w: 65, sum: true, get: e => e.totalNightHours },
    { h: 'Lương cơ bản', w: 100, money: true, sum: true, get: e => e.baseWageTotal },
    { h: 'Phụ trội lễ/cuối tuần', w: 115, money: true, sum: true, get: e => e.dayTypePremiumTotal },
    { h: 'Lương OT', w: 90, money: true, sum: true, get: e => e.overtimeWageTotal },
    { h: 'Phụ cấp ca đêm', w: 100, money: true, sum: true, get: e => e.nightAllowanceTotal },
    { h: 'Phụ cấp cơm/xe', w: 100, money: true, sum: true, get: e => e.mealAllowanceTotal },
    { h: 'Thưởng chuyên cần', w: 110, money: true, sum: true, get: e => e.attendanceBonus },
    { h: 'Thưởng khác', w: 90, money: true, sum: true, get: e => e.manualBonus },
    { h: 'Số lần đi muộn', w: 85, sum: true, get: e => e.totalLateCount },
    { h: 'Phạt đi muộn', w: 95, money: true, sum: true, get: e => e.totalPenalties },
    { h: 'Khấu trừ khác', w: 95, money: true, sum: true, get: e => e.manualDeduction },
    { h: 'THỰC LĨNH', w: 120, money: true, sum: true, get: e => e.totalNetWage },
    { h: 'Trạng thái', w: 85, get: e => statusLabel(e.status) },
  ];

  const cell = (v: string | number, style: string) =>
    typeof v === 'number'
      ? `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${v}</Data></Cell>`
      : `<Cell ss:StyleID="${style}"><Data ss:Type="String">${x(v)}</Data></Cell>`;

  const lastCol = cols.length;
  const rows = summary.employees
    .map((e, i) => {
      const cells = cols
        .map(c => {
          const v = c.get(e, i);
          return cell(v, c.money ? 'money' : typeof v === 'number' ? 'num' : 'text');
        })
        .join('');
      return `<Row>${cells}</Row>`;
    })
    .join('');

  const totalCells = cols
    .map((c, i) => {
      if (i === 2) return cell(`TỔNG CỘNG (${summary.totalEmployees} nhân sự)`, 'total');
      if (c.sum) {
        const total = summary.employees.reduce((s, e, idx) => s + Number(c.get(e, idx)), 0);
        return cell(Math.round(total * 10) / 10, c.money ? 'totalMoney' : 'total');
      }
      return cell('', 'total');
    })
    .join('');

  const subtitle =
    'Ngày xuất: ' + new Date().toLocaleDateString('vi-VN') +
    ' | Cuối tuần x' + summary.config.weekendMultiplier +
    ' | Lễ x' + summary.config.holidayMultiplier +
    ' | Ca đêm +' + Math.round(summary.config.nightShiftBonusRate * 100) + '%' +
    ' | OT x' + summary.config.overtimeMultiplier;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles>
<Style ss:ID="Default"><Font ss:FontName="Calibri" ss:Size="11"/><Alignment ss:Vertical="Center"/></Style>
<Style ss:ID="title"><Font ss:Bold="1" ss:Size="15" ss:Color="#0F172A"/></Style>
<Style ss:ID="sub"><Font ss:Italic="1" ss:Color="#64748B"/></Style>
<Style ss:ID="head"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F172A" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/></Style>
<Style ss:ID="text"><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
<Style ss:ID="num"><Alignment ss:Horizontal="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
<Style ss:ID="money"><NumberFormat ss:Format="#,##0"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/></Borders></Style>
<Style ss:ID="total"><Font ss:Bold="1"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center"/></Style>
<Style ss:ID="totalMoney"><Font ss:Bold="1"/><NumberFormat ss:Format="#,##0"/><Interior ss:Color="#FEF3C7" ss:Pattern="Solid"/></Style>
</Styles>
<Worksheet ss:Name="Bang Luong">
<Table>
${cols.map(c => `<Column ss:Width="${c.w}"/>`).join('')}
<Row ss:Height="24"><Cell ss:StyleID="title" ss:MergeAcross="${lastCol - 1}"><Data ss:Type="String">${x('BẢNG LƯƠNG TỔNG HỢP - AURORA CINEMA - ' + summary.monthName.toUpperCase())}</Data></Cell></Row>
<Row><Cell ss:StyleID="sub" ss:MergeAcross="${lastCol - 1}"><Data ss:Type="String">${x(subtitle)}</Data></Cell></Row>
<Row ss:Height="8"/>
<Row ss:Height="36">${cols.map(c => cell(c.h, 'head')).join('')}</Row>
${rows}
<Row>${totalCells}</Row>
</Table>
<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>4</SplitHorizontal><TopRowBottomPane>4</TopRowBottomPane><SplitVertical>3</SplitVertical><LeftColumnRightPane>3</LeftColumnRightPane></WorksheetOptions>
</Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bang_Luong_Aurora_${summary.month}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
