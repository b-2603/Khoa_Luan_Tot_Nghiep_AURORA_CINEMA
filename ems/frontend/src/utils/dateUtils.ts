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

  if (dateStr === today) return `Hôm nay (${dateStr})`;
  if (dateStr === tomorrow) return `Ngày mai (${dateStr})`;

  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      return `${dayNames[d.getDay()]} (${parts[2]}/${parts[1]}/${parts[0]})`;
    }
  } catch (e) {}

  return dateStr;
}
