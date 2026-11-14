/**
 * PAYROLL & ATTENDANCE PENALTY SERVICE (QUẢN LÝ TIỀN LƯƠNG & XỬ LÝ PHẠT ĐI MUỘN)
 * Tính toán lương ca làm việc, hệ số ngày Lễ x3 theo Luật Lao Động,
 * thang trừ tiền phạt đi muộn theo số phút và tổng hợp bảng lương cuối tháng cho Cụm Rạp Aurora Cinema.
 */

import { Attendance, User, WorkSchedule, Shift } from '../types';

export const BASE_HOURLY_RATE = 25000; // 25.000 VNĐ / giờ làm việc chuẩn cụm rạp
export const STANDARD_SHIFT_HOURS = 8; // Ca làm việc tiêu chuẩn 8 tiếng (~200.000đ/ngày thường)

export interface HolidayInfo {
  isHoliday: boolean;
  name?: string;
  holidayName?: string;
  multiplier: number; // 3.0 cho ngày lễ, 1.0 cho ngày thường
}

// Danh mục Ngày Lễ Quốc Gia được nhân 3 lương (x300%) theo Luật Lao Động
export const VIETNAM_FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': 'Tết Dương Lịch',
  '04-30': 'Giải Phóng Miền Nam (30/4)',
  '05-01': 'Quốc Tế Lao Động (1/5)',
  '05-02': 'Nghỉ Bù Lễ 1/5',
  '09-02': 'Quốc Khánh Việt Nam (2/9)',
  '09-03': 'Nghỉ Lễ Quốc Khánh (3/9)',
};

// Các ngày lễ Âm Lịch (Tết Nguyên Đán & Giỗ Tổ Hùng Vương) quy đổi năm 2026
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

/**
 * Kiểm tra xem một ngày có phải là Ngày Lễ hưởng lương x3 không
 */
export function checkIsHoliday(dateStr?: string): HolidayInfo {
  if (!dateStr) return { isHoliday: false, multiplier: 1.0 };
  
  // 1. Kiểm tra ngày đặc biệt năm 2026
  if (SPECIAL_HOLIDAYS_2026[dateStr]) {
    return {
      isHoliday: true,
      name: SPECIAL_HOLIDAYS_2026[dateStr],
      holidayName: SPECIAL_HOLIDAYS_2026[dateStr],
      multiplier: 3.0,
    };
  }

  // 2. Kiểm tra ngày lễ cố định hàng năm (MM-DD)
  const mmdd = dateStr.slice(5); // "MM-DD"
  if (VIETNAM_FIXED_HOLIDAYS[mmdd]) {
    return {
      isHoliday: true,
      name: VIETNAM_FIXED_HOLIDAYS[mmdd],
      holidayName: VIETNAM_FIXED_HOLIDAYS[mmdd],
      multiplier: 3.0,
    };
  }

  return { isHoliday: false, multiplier: 1.0 };
}

/**
 * Định dạng thời gian trễ thân thiện: ví dụ "25 phút" hoặc "6h31p (391 phút)"
 */
export function formatLateDuration(minutes: number): string {
  if (minutes <= 0) return '0 phút';
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (hours > 0) {
    return remainingMins > 0 ? `${hours}h${remainingMins}p (${minutes} phút)` : `${hours} giờ (${minutes} phút)`;
  }
  return `${minutes} phút`;
}

/**
 * Tính số giờ tiêu chuẩn của một ca làm việc từ khung giờ startTime và endTime
 */
export function calculateShiftHours(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 8;
  const [sH, sM] = startTime.split(':').map(Number);
  const [eH, eM] = endTime.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 8;

  let startMin = sH * 60 + sM;
  let endMin = eH * 60 + eM;
  if (endMin <= startMin) {
    endMin += 1440; // Ca qua đêm (VD: 22:00 - 02:00)
  }
  const hours = (endMin - startMin) / 60;
  return Math.round(hours * 10) / 10;
}

/**
 * Tính số phút đi muộn dựa trên giờ vào ca thực tế và giờ bắt đầu ca chuẩn (hỗ trợ cả ca đêm qua 00:00)
 */
export function calculateLateMinutes(
  checkInTime?: string, 
  shiftStartTime?: string,
  shiftEndTime?: string
): number {
  if (!checkInTime || !shiftStartTime) return 0;
  
  const [ciH, ciM] = checkInTime.split(':').map(Number);
  const [ssH, ssM] = shiftStartTime.split(':').map(Number);
  
  if (isNaN(ciH) || isNaN(ciM) || isNaN(ssH) || isNaN(ssM)) return 0;

  let checkInMinutes = ciH * 60 + ciM;
  let startMinutes = ssH * 60 + ssM;

  // Xử lý ca qua đêm (Overnight shift - ví dụ 22:00 đến 02:00)
  let isOvernight = false;
  if (shiftEndTime) {
    const [seH, seM] = shiftEndTime.split(':').map(Number);
    if (!isNaN(seH) && !isNaN(seM)) {
      isOvernight = (seH * 60 + seM) <= startMinutes;
    }
  } else {
    isOvernight = startMinutes >= 20 * 60; // Ca bắt đầu sau 20h tối
  }

  if (isOvernight) {
    // Nếu điểm danh vào sáng sớm hôm sau (từ 00:00 đến 12:00 trưa), cộng 24h (1440 phút)
    if (checkInMinutes < 12 * 60) {
      checkInMinutes += 1440;
    }
  }

  const diff = checkInMinutes - startMinutes;
  return Math.max(0, diff);
}

export type LateSeverityTier = 'on_time' | 'minor' | 'moderate' | 'severe' | 'critical';

export interface LatePenaltyResult {
  lateMinutes: number;
  tier: LateSeverityTier;
  level?: LateSeverityTier; // Alias for tier
  label: string;
  penaltyAmount: number; // Tiền phạt trừ lương (VNĐ)
  description: string;
  badgeClass: string;
  isExcessiveLate: boolean; // Trễ quá lâu (> 60 phút)
  isExcused?: boolean;
}

/**
 * Quy định thang phạt trừ tiền khi đi muộn tại cụm rạp:
 * - 0 đến 5 phút: Đúng giờ / du di cho phép (0 VNĐ)
 * - 6 đến 15 phút: Trễ nhẹ (Phạt 20.000 VNĐ)
 * - 16 đến 30 phút: Trễ vừa (Phạt 50.000 VNĐ)
 * - 31 đến 60 phút: Trễ nặng (Phạt 100.000 VNĐ)
 * - Trên 60 phút: Trễ quá lâu / Vi phạm nghiêm trọng (Phạt 150.000 VNĐ, cảnh báo vi phạm ca trực)
 */
export function evaluateLatePenalty(lateMinutes: number, isExcused = false): LatePenaltyResult {
  if (isExcused) {
    return {
      lateMinutes,
      tier: 'on_time',
      level: 'on_time',
      label: 'Đã miễn trừ phạt',
      penaltyAmount: 0,
      description: 'Quản lý đã phê duyệt đơn miễn trừ',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300',
      isExcessiveLate: false,
      isExcused: true,
    };
  }

  if (lateMinutes <= 5) {
    return {
      lateMinutes,
      tier: 'on_time',
      level: 'on_time',
      label: lateMinutes === 0 ? 'Đúng giờ chuẩn' : `Trễ ${lateMinutes}p (Cho phép)`,
      penaltyAmount: 0,
      description: 'Trong hạn mức du di cho phép đầu ca',
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
      label: `Trễ ${lateMinutes} phút (Nhẹ)`,
      penaltyAmount: 20000,
      description: 'Trừ 20.000đ do đi muộn dưới 15 phút',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  if (lateMinutes <= 30) {
    return {
      lateMinutes,
      tier: 'moderate',
      level: 'moderate',
      label: `Trễ ${lateMinutes} phút (Vừa)`,
      penaltyAmount: 50000,
      description: 'Trừ 50.000đ do đi muộn 16 - 30 phút',
      badgeClass: 'bg-orange-50 text-orange-800 border-orange-300',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  if (lateMinutes <= 60) {
    return {
      lateMinutes,
      tier: 'severe',
      level: 'severe',
      label: `Trễ ${lateMinutes} phút (Nặng)`,
      penaltyAmount: 100000,
      description: 'Trừ 100.000đ do đi muộn 31 - 60 phút',
      badgeClass: 'bg-rose-50 text-rose-800 border-rose-300',
      isExcessiveLate: false,
      isExcused: false,
    };
  }

  // Trên 60 phút: Đi muộn quá lâu
  const lateFormatted = formatLateDuration(lateMinutes);
  return {
    lateMinutes,
    tier: 'critical',
    level: 'critical',
    label: `Trễ ${lateFormatted} (Quá lâu!)`,
    penaltyAmount: 150000,
    description: `Trừ 150.000đ - Trễ ${lateFormatted}, vi phạm nghiêm trọng giờ ca trực rạp`,
    badgeClass: 'bg-rose-100 text-rose-900 border-rose-400 font-black animate-pulse',
    isExcessiveLate: true,
    isExcused: false,
  };
}

export interface ShiftWageDetail {
  hoursWorked: number;
  hourlyRate: number;
  isHoliday: boolean;
  holidayName?: string;
  multiplier: number;
  rawShiftWage: number;   // Lương nguyên ca trước phạt (Giờ làm * Đơn giá * Hệ số)
  penaltyAmount: number;  // Tiền phạt trễ
  netShiftWage: number;   // Thực nhận ca đó (Lương nguyên ca - Phạt)
  lateMinutes: number;
  lateInfo: LatePenaltyResult;
}

/**
 * Tính toán lương chi tiết cho một ca làm việc (Shift Wage)
 */
export function calculateShiftWage(params: {
  date: string;
  checkIn?: string;
  checkOut?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  hoursWorked?: number;
  isExcused?: boolean;
  hourlyRate?: number;
}): ShiftWageDetail {
  const {
    date,
    checkIn,
    shiftStartTime = '08:00',
    shiftEndTime = '16:00',
    isExcused = false,
    hourlyRate = BASE_HOURLY_RATE,
  } = params;

  // Tính số giờ chuẩn của ca (nếu chưa checkout thì lấy theo giờ tiêu chuẩn)
  const plannedHours = calculateShiftHours(shiftStartTime, shiftEndTime);
  const hoursWorked = params.hoursWorked !== undefined && params.hoursWorked > 0 
    ? params.hoursWorked 
    : plannedHours;

  // 1. Kiểm tra ngày lễ x3
  const holiday = checkIsHoliday(date);
  const multiplier = holiday.multiplier;

  // 2. Tính số phút trễ và tiền phạt (truyền đầy đủ shiftEndTime để xử lý ca đêm qua ngày)
  const lateMinutes = checkIn ? calculateLateMinutes(checkIn, shiftStartTime, shiftEndTime) : 0;
  const lateInfo = evaluateLatePenalty(lateMinutes, isExcused);

  // 3. Tính tiền lương
  const rawShiftWage = Math.round(hoursWorked * hourlyRate * multiplier);
  const netShiftWage = Math.max(0, rawShiftWage - lateInfo.penaltyAmount);

  return {
    hoursWorked,
    hourlyRate,
    isHoliday: holiday.isHoliday,
    holidayName: holiday.name,
    multiplier,
    rawShiftWage,
    penaltyAmount: lateInfo.penaltyAmount,
    netShiftWage,
    lateMinutes,
    lateInfo,
  };
}

export interface EmployeeMonthlyPayroll {
  userId: string;
  userName: string;
  staffCode: string;
  department: string;
  avatar?: string;
  totalShifts: number;
  normalShifts: number;
  holidayShifts: number;
  totalHours: number;
  totalRawWage: number;
  totalLateCount: number;
  totalExcessiveLateCount: number;
  totalLateMinutes: number;
  totalPenalties: number;
  totalNetWage: number;
  status: 'draft' | 'approved' | 'paid';
}

export interface MonthlyPayrollSummary {
  month: string; // YYYY-MM
  monthName: string;
  totalEmployees: number;
  totalShiftsAll: number;
  totalHoursAll: number;
  totalGrossWageAll: number;
  totalPenaltiesAll: number;
  totalNetWageAll: number;
  holidayShiftCountAll: number;
  employees: EmployeeMonthlyPayroll[];
}

/**
 * Tổng hợp toàn bộ bảng lương và công theo Tháng cho Quản lý rạp
 */
export function generateMonthlyPayroll(
  monthStr: string, // YYYY-MM (vd: '2026-11')
  users: User[],
  attendances: Attendance[],
  shifts: Shift[] = []
): MonthlyPayrollSummary {
  const cleanId = (id?: string) => String(id || '').replace('usr-', '').trim();
  const shiftMap = new Map<string, Shift>();
  shifts.forEach(s => {
    shiftMap.set(s.id, s);
    shiftMap.set(s.id.replace('shift-', ''), s);
  });

  const staffUsers = users.filter(u => u.role !== 'manager');

  const employeePayrolls: EmployeeMonthlyPayroll[] = staffUsers.map(user => {
    const userAtts = attendances.filter(a => {
      const matchU = cleanId(a.userId) === cleanId(user.id) ||
        (a.userName && user.name && a.userName.toLowerCase().trim() === user.name.toLowerCase().trim());
      return matchU && a.date.startsWith(monthStr) && Boolean(a.checkIn);
    });

    let totalHours = 0;
    let normalShifts = 0;
    let holidayShifts = 0;
    let totalRawWage = 0;
    let totalLateCount = 0;
    let totalExcessiveLateCount = 0;
    let totalLateMinutes = 0;
    let totalPenalties = 0;

    userAtts.forEach(att => {
      const shiftObj = att.shiftId ? shiftMap.get(att.shiftId) : undefined;
      const startTime = shiftObj?.startTime || (att.shiftId === 'shift-2' ? '15:30' : att.shiftId === 'shift-3' ? '22:00' : '08:00');
      const hours = att.hoursWorked > 0 ? att.hoursWorked : STANDARD_SHIFT_HOURS;
      
      const isExcused = Boolean(att.note?.includes('đã duyệt') || att.note?.includes('miễn phạt'));

      const wageDetail = calculateShiftWage({
        date: att.date,
        checkIn: att.checkIn,
        checkOut: att.checkOut,
        shiftStartTime: startTime,
        hoursWorked: hours,
        isExcused,
      });

      totalHours += wageDetail.hoursWorked;
      if (wageDetail.isHoliday) holidayShifts += 1;
      else normalShifts += 1;

      totalRawWage += wageDetail.rawShiftWage;
      totalPenalties += wageDetail.penaltyAmount;

      if (wageDetail.lateInfo.lateMinutes > 5 && !isExcused) {
        totalLateCount += 1;
        totalLateMinutes += wageDetail.lateInfo.lateMinutes;
        if (wageDetail.lateInfo.isExcessiveLate) {
          totalExcessiveLateCount += 1;
        }
      }
    });

    const totalNetWage = Math.max(0, totalRawWage - totalPenalties);

    return {
      userId: user.id,
      userName: user.name,
      staffCode: user.phone || user.staffCode || cleanId(user.id),
      department: user.department || 'Nhân viên rạp',
      avatar: user.avatar,
      totalShifts: userAtts.length,
      normalShifts,
      holidayShifts,
      totalHours: Math.round(totalHours * 10) / 10,
      totalRawWage,
      totalLateCount,
      totalExcessiveLateCount,
      totalLateMinutes,
      totalPenalties,
      totalNetWage,
      status: 'draft',
    };
  });

  const totalShiftsAll = employeePayrolls.reduce((sum, e) => sum + e.totalShifts, 0);
  const totalHoursAll = Math.round(employeePayrolls.reduce((sum, e) => sum + e.totalHours, 0) * 10) / 10;
  const totalGrossWageAll = employeePayrolls.reduce((sum, e) => sum + e.totalRawWage, 0);
  const totalPenaltiesAll = employeePayrolls.reduce((sum, e) => sum + e.totalPenalties, 0);
  const totalNetWageAll = employeePayrolls.reduce((sum, e) => sum + e.totalNetWage, 0);
  const holidayShiftCountAll = employeePayrolls.reduce((sum, e) => sum + e.holidayShifts, 0);

  const [y, m] = monthStr.split('-');
  const monthName = `Tháng ${Number(m)}/${y}`;

  return {
    month: monthStr,
    monthName,
    totalEmployees: staffUsers.length,
    totalShiftsAll,
    totalHoursAll,
    totalGrossWageAll,
    totalPenaltiesAll,
    totalNetWageAll,
    holidayShiftCountAll,
    employees: employeePayrolls,
  };
}

/**
 * Định dạng số tiền VNĐ dễ đọc (ví dụ: 1.250.000 ₫)
 */
export function formatCurrencyVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * Xuất dữ liệu bảng lương ra file CSV mở được ngay bằng Excel
 */
export function exportPayrollCSV(summary: MonthlyPayrollSummary): void {
  const headers = [
    'STT',
    'Mã Nhân Viên',
    'Họ và Tên',
    'Bộ Phận',
    'Tổng Số Ca',
    'Ca Ngày Thường',
    'Ca Ngày Lễ (x3)',
    'Tổng Giờ Làm (h)',
    'Lương Ca Gốc (VNĐ)',
    'Số Lần Đi Muộn',
    'Tổng Phút Trễ',
    'Tiền Phạt Trừ Trễ (VNĐ)',
    'Lương Thực Nhận (VNĐ)',
  ];

  const rows = summary.employees.map((e, idx) => [
    idx + 1,
    `"${e.staffCode}"`,
    `"${e.userName}"`,
    `"${e.department}"`,
    e.totalShifts,
    e.normalShifts,
    e.holidayShifts,
    e.totalHours,
    e.totalRawWage,
    e.totalLateCount,
    e.totalLateMinutes,
    e.totalPenalties,
    e.totalNetWage,
  ]);

  const csvContent = '\uFEFF' + [
    `BẢNG TỔNG HỢP LƯƠNG & CHẤM CÔNG CỤM RẠP AURORA CINEMA - ${summary.monthName.toUpperCase()}`,
    `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`,
    `Đơn giá chuẩn: ${formatCurrencyVND(BASE_HOURLY_RATE)}/giờ (Ngày lễ x3)`,
    '',
    headers.join(','),
    ...rows.map(r => r.join(',')),
    '',
    `TỔNG CỘNG,,,"${summary.totalEmployees} nhân sự",${summary.totalShiftsAll},,${summary.holidayShiftCountAll},${summary.totalHoursAll},${summary.totalGrossWageAll},,,${summary.totalPenaltiesAll},${summary.totalNetWageAll}`,
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Bang_Luong_Aurora_Cinema_${summary.month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
