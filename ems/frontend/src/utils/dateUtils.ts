/**
 * Tiện ích xử lý Ngày/Tháng/Năm động theo thời gian thực (Realtime Dynamic Date)
 * Tự động đồng bộ với ngày hiện tại (Hôm nay) và các ngày tiếp theo trong tuần
 */

export interface DayInfo {
  date: string;       // Định dạng 'YYYY-MM-DD', ví dụ: '2026-10-06'
  dayLabel: string;   // Ví dụ: 'Hôm Nay (Thứ Ba)' hoặc 'Thứ Tư'
  dayNum: string;     // Ví dụ: '06/10'
  shortLabel: string; // Ví dụ: 'Hôm nay' hoặc 'T3'
  fullLabel: string;  // Ví dụ: 'Thứ Ba (06/10/2026)'
  isToday: boolean;
  isTomorrow: boolean;
}

export function formatDateToYYYYMMDD(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Lấy chuỗi ngày hôm nay YYYY-MM-DD */
export function getTodayDateString(): string {
  return formatDateToYYYYMMDD(new Date());
}

/** Lấy chuỗi ngày mai YYYY-MM-DD */
export function getTomorrowDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateToYYYYMMDD(d);
}

/**
 * Tạo danh sách các ngày kế tiếp bắt đầu từ Hôm Nay
 * @param count Số lượng ngày cần lấy (mặc định 7 ngày cho 1 tuần)
 */
export function getUpcomingDays(count: number = 7): DayInfo[] {
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const result: DayInfo[] = [];
  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);

    const dateStr = formatDateToYYYYMMDD(d);
    const dayOfWeek = dayNames[d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const dayNum = `${dd}/${mm}`;

    let dayLabel = dayOfWeek;
    let shortLabel = dayOfWeek;
    if (i === 0) {
      dayLabel = `Hôm Nay (${dayOfWeek})`;
      shortLabel = 'Hôm nay';
    } else if (i === 1) {
      dayLabel = `Ngày Mai (${dayOfWeek})`;
      shortLabel = 'Ngày mai';
    }

    result.push({
      date: dateStr,
      dayLabel,
      dayNum,
      shortLabel,
      fullLabel: `${dayOfWeek} (${dayNum}/${yyyy})`,
      isToday: i === 0,
      isTomorrow: i === 1
    });
  }

  return result;
}

/**
 * Định dạng nhãn ngày thân thiện bằng tiếng Việt
 */
export function formatFriendlyDate(dateStr: string): string {
  const today = getTodayDateString();
  const tomorrow = getTomorrowDateString();

  if (dateStr === today) return `Hôm nay (${formatDateDMY(dateStr)})`;
  if (dateStr === tomorrow) return `Ngày mai (${formatDateDMY(dateStr)})`;

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return `${dayNames[d.getDay()]} (${parts[2]}/${parts[1]}/${parts[0]})`;
    }
  } catch (e) {}

  return formatDateDMY(dateStr);
}

/**
 * Định dạng ngày tháng năm theo chuẩn Việt Nam: Ngày trước tháng sau (DD/MM/YYYY)
 * Nhận vào chuỗi YYYY-MM-DD, ISO string, hoặc Date
 */
export function formatDateDMY(dateInput?: string | Date | null): string {
  if (!dateInput) return '--/--/----';
  
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return '--/--/----';
    const dd = String(dateInput.getDate()).padStart(2, '0');
    const mm = String(dateInput.getMonth() + 1).padStart(2, '0');
    const yyyy = dateInput.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const str = String(dateInput).trim();
  // Nếu đã ở dạng DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  // Xử lý chuỗi có chứa giờ hoặc khoảng trắng (ISO string hoặc YYYY-MM-DD HH:mm)
  const onlyDate = str.split('T')[0].split(' ')[0];
  
  // Dạng YYYY-MM-DD
  const ymdMatch = onlyDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    const [, yyyy, mm, dd] = ymdMatch;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }

  // Dạng MM/DD/YYYY (do browser US xuất ra)
  const mdyMatch = onlyDate.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  }

  return str;
}

/**
 * Định dạng Ngày giờ theo chuẩn Việt Nam: DD/MM/YYYY HH:mm
 */
export function formatDateTimeDMY(dateTimeInput?: string | Date | null): string {
  if (!dateTimeInput) return '--';
  try {
    const d = dateTimeInput instanceof Date ? dateTimeInput : new Date(dateTimeInput);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    }
  } catch {}

  return formatDateDMY(dateTimeInput);
}

/**
 * Thông tin trạng thái cổng đăng ký ca làm việc
 * Quy tắc nghiệp vụ: Nhân viên chỉ được phép đăng ký / chỉnh sửa lịch từ Thứ 3 đến Thứ 5 hàng tuần.
 * Sau Thứ 5 (tức từ Thứ 6 đến hết Thứ 2 tuần sau), cổng đăng ký sẽ khóa để Quản lý chốt và xếp lịch.
 */
export interface ShiftRegistrationWindowInfo {
  isOpen: boolean;
  currentDayName: string;
  dayOfWeek: number;
  deadlineText: string;
  nextOpenText: string;
  badgeLabel: string;
  message: string;
}

export function checkShiftRegistrationWindow(customDate?: Date): ShiftRegistrationWindowInfo {
  const now = customDate || new Date();
  const dayOfWeek = now.getDay(); // 0: CN, 1: T2, 2: T3, 3: T4, 4: T5, 5: T6, 6: T7
  const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const currentDayName = dayNames[dayOfWeek];

  // Chỉ mở vào Thứ 3 (2), Thứ 4 (3), Thứ 5 (4)
  const isOpen = dayOfWeek >= 2 && dayOfWeek <= 4;

  if (isOpen) {
    return {
      isOpen: true,
      currentDayName,
      dayOfWeek,
      deadlineText: 'Hạn chót: 23:59 Thứ Năm',
      nextOpenText: '',
      badgeLabel: 'Cổng Mở (Thứ 3 - Thứ 5)',
      message: `Cổng đăng ký ca đang MỞ (${currentDayName}). Nhân viên được phép đăng ký và điều chỉnh nguyện vọng ca làm việc đến hết 23:59 Thứ Năm.`
    };
  } else {
    return {
      isOpen: false,
      currentDayName,
      dayOfWeek,
      deadlineText: 'Đã hết hạn chốt lúc 23:59 Thứ Năm',
      nextOpenText: 'Mở lại vào Thứ Ba tuần tới',
      badgeLabel: 'Cổng Đã Khóa (Sau Thứ 5)',
      message: `Cổng đăng ký ca đã ĐÓNG (${currentDayName}). Hệ thống chỉ mở cho nhân viên đăng ký mỗi tuần từ Thứ 3 đến Thứ 5. Sau Thứ 5, nhân viên không thể thay đổi hay chỉnh sửa để Quản lý chốt lịch tuần.`
    };
  }
}
