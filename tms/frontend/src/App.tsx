import { useState, useEffect, FormEvent, useRef } from 'react';
import * as XLSX from 'xlsx';
import AccountManagementPage from './components/AccountManagementPage';
import {
  User, Lock, Eye, EyeOff, ChevronDown, Clapperboard,
  ShieldCheck, TrendingUp, Users, LogOut, Bell, BarChart3,
  Building2, CalendarDays, Film, Home, Menu, Package,
  Receipt, Settings, Tag, Ticket, UserRound, X, FileText,
  CheckCircle2, XCircle, AlertTriangle, Check,
  Plus, Edit, Trash2, DollarSign, Thermometer, Volume2,
  ShieldAlert, UserCheck, Monitor, ScrollText, CreditCard, Search, RefreshCw,
  Tv, Clapperboard as ShowtimeIcon, MapPin, Clock, Target,
  Layers, Send, CalendarCheck, Sparkles, Filter, Globe, CirclePause,
  Play, WalletCards, KeyRound, CircleDollarSign, Phone, Activity, History, Printer
} from 'lucide-react';

// ============================================================
// TYPES & ROLE DEFINITIONS
// ============================================================
export type TMSRole = 'super_admin' | 'cinema_admin' | 'supervisor' | 'accounting';

interface RoleConfig {
  code: TMSRole; name: string; badge: string; emoji: string;
  color: string; bg: string; borderColor: string;
  tagline: string; description: string;
}

type ScreenReadinessForm = {
  content_playback_checked: boolean;
  projector_checked: boolean;
  sound_checked: boolean;
  auditorium_checked: boolean;
  safety_checked: boolean;
};

const EMPTY_SCREEN_READINESS: ScreenReadinessForm = {
  content_playback_checked: false,
  projector_checked: false,
  sound_checked: false,
  auditorium_checked: false,
  safety_checked: false,
};

const screenReadinessFromRecord = (screen: any): ScreenReadinessForm => ({
  content_playback_checked: Number(screen?.content_playback_checked || 0) === 1,
  projector_checked: Number(screen?.projector_checked || 0) === 1,
  sound_checked: Number(screen?.sound_checked || 0) === 1,
  auditorium_checked: Number(screen?.auditorium_checked || 0) === 1,
  safety_checked: Number(screen?.safety_checked || 0) === 1,
});

export const ROLE_CONFIGS: Record<TMSRole, RoleConfig> = {
  super_admin: {
    code: 'super_admin', name: 'Admin Tổng', badge: 'Admin Tổng', emoji: '👑',
    color: '#d97706', bg: '#fef3c7', borderColor: '#f59e0b',
    tagline: 'Toàn quyền điều hành chuỗi rạp & phân quyền',
    description: 'Quản lý ở cấp toàn hệ thống, quản lý dữ liệu và kế hoạch chung cho tất cả các rạp.',
  },
  cinema_admin: {
    code: 'cinema_admin', name: 'Admin Rạp', badge: 'Admin Rạp', emoji: '🏢',
    color: '#2563eb', bg: '#dbeafe', borderColor: '#3b82f6',
    tagline: 'Quản lý hoạt động một rạp, triển khai kế hoạch được phân bổ',
    description: 'Quản lý hoạt động của một rạp cụ thể, triển khai những kế hoạch được Admin Tổng phân bổ.',
  },
  supervisor: {
    code: 'supervisor', name: 'Supervisor', badge: 'Supervisor', emoji: '🛡️',
    color: '#059669', bg: '#d1fae5', borderColor: '#10b981',
    tagline: 'Giám sát vận hành tại rạp & phê duyệt nghiệp vụ',
    description: 'Giám sát hoạt động vận hành tại rạp và xử lý các nghiệp vụ cần quyền phê duyệt.',
  },
  accounting: {
    code: 'accounting', name: 'Kế Toán', badge: 'Kế Toán', emoji: '📊',
    color: '#7c3aed', bg: '#ede9fe', borderColor: '#8b5cf6',
    tagline: 'Quản lý & đối soát dữ liệu tài chính',
    description: 'Quản lý, kiểm tra và đối soát các dữ liệu tài chính phát sinh từ hoạt động bán vé và bán hàng.',
  }
};

// Demo accounts table shown on login
const DEMO_ACCOUNTS: Array<{ role: TMSRole; label: string; user: string; pass: string }> = [];


// ============================================================
// ROLE-SPECIFIC NAVIGATION (maps exactly to Use Cases)
// ============================================================
type NavItem = { id: string; name: string; icon: React.ElementType; children?: string[] };

// Never expose implementation keys (accounts, catalog, pos_devices, …) in the
// interface. These are route identifiers only; users always see business names.
const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Tổng quan hệ thống', accounts: 'Tài khoản & Phân quyền', cinemas: 'Hệ thống rạp', movies: 'Quản lý phim',
  movie_plan: 'Kế hoạch phim', schedules: 'Lịch chiếu', screens: 'Quản lý phòng chiếu', pricing: 'Chính sách giá',
  catalog: 'Danh mục dùng chung', promotions: 'Khuyến mãi & Ưu đãi', products: 'Quản lý hàng hóa', staff: 'Nhân viên & Ca làm việc',
  reports: 'Báo cáo vận hành', pos_devices: 'Thiết bị POS', audit_log: 'Nhật ký hệ thống', settings: 'Cấu hình hệ thống',
  transactions: 'Giao dịch', refunds: 'Hoàn tiền', showtimes: 'Lịch chiếu', shifts: 'Phiên làm việc'
};

function pageTitleFor(active: string, role?: TMSRole) {
  if (active === 'dashboard') return role === 'accounting' ? 'Tổng quan tài chính' : role === 'supervisor' ? 'Tổng quan vận hành' : role === 'cinema_admin' ? 'Tổng quan rạp' : 'Tổng quan hệ thống';
  return PAGE_TITLES[active] || active;
}

function screenDisplayName(name: string | undefined, id?: number) {
  const match = String(name || '').match(/phòng\s*0*(\d+)/i);
  if (match) return `Phòng ${String(Number(match[1])).padStart(2, '0')}`;
  return id ? `Phòng ${String(id).padStart(2, '0')}` : 'Phòng chiếu';
}

function getRoleNavItems(role: TMSRole): NavItem[] {
  switch (role) {
    case 'super_admin':
      return [
        { id: 'dashboard', name: 'Tổng quan', icon: Home },
        { id: 'accounts', name: 'Tài khoản & Phân quyền', icon: Users, children: ['Danh sách tài khoản', 'Ma trận phân quyền'] },
        { id: 'cinemas', name: 'Hệ thống rạp', icon: Building2 },
        { id: 'movies', name: 'Quản lý phim', icon: Film, children: ['Danh sách phim', 'Kế hoạch phim', 'Phân bổ phim cho rạp'] },
        { id: 'schedules', name: 'Lịch chiếu', icon: CalendarDays },
        { id: 'pricing', name: 'Chính sách giá chung', icon: Tag },
        { id: 'catalog', name: 'Danh mục dùng chung', icon: Package },
        { id: 'promotions', name: 'CTKM & Khuyến mãi', icon: Ticket, children: ['Duyệt kế hoạch CTKM', 'Quản lý CTKM hệ thống'] },
        { id: 'reports', name: 'Báo cáo tổng hợp', icon: BarChart3 },
        { id: 'pos_devices', name: 'Thiết bị POS', icon: Monitor, children: ['Quản lý POS', 'Phê duyệt POS'] },
        { id: 'audit_log', name: 'Audit Log', icon: ScrollText },
        { id: 'settings', name: 'Cấu hình hệ thống', icon: Settings },
      ];
    case 'cinema_admin':
      return [
        { id: 'dashboard', name: 'Tổng quan', icon: Home },
        { id: 'movie_plan', name: 'Kế hoạch phim', icon: Film, children: ['Xem kế hoạch phim', 'Xác nhận kế hoạch', 'Triển khai phim tại rạp'] },
        { id: 'schedules', name: 'Lịch chiếu', icon: CalendarDays },
        { id: 'screens', name: 'Phòng chiếu', icon: Building2 },
        { id: 'pricing', name: 'Áp dụng giá vé', icon: Tag },
        { id: 'promotions', name: 'Voucher / CTKM', icon: Ticket, children: ['Voucher tại rạp', 'Tiếp nhận CTKM', 'Triển khai CTKM', 'Đề xuất điều chỉnh'] },
        { id: 'products', name: 'Hàng hóa', icon: Package },
        { id: 'staff', name: 'Nhân viên & Phiên', icon: Users, children: ['NV bán hàng', 'Phiên bán hàng'] },
        { id: 'reports', name: 'Báo cáo rạp', icon: BarChart3 },
      ];
    case 'supervisor':
      return [
        { id: 'dashboard', name: 'Tổng quan', icon: Home },
        { id: 'showtimes', name: 'Theo dõi suất chiếu', icon: CalendarDays },
        { id: 'screens', name: 'Theo dõi phòng chiếu', icon: Building2 },
        { id: 'staff', name: 'Nhân viên', icon: Users },
        { id: 'shifts', name: 'Phiên làm việc', icon: UserCheck },
        { id: 'pos_txns', name: 'Giao dịch POS', icon: Receipt },
        { id: 'approvals', name: 'Phê duyệt', icon: ShieldCheck, children: ['Hủy giao dịch', 'Hoàn tiền', 'Nghiệp vụ ngoại lệ'] },
        { id: 'reports', name: 'Báo cáo vận hành', icon: BarChart3 },
      ];
    case 'accounting':
      return [
        { id: 'dashboard', name: 'Tổng quan tài chính', icon: Home },
        { id: 'transactions', name: 'Giao dịch', icon: Receipt, children: ['Xem giao dịch', 'Lịch sử thanh toán'] },
        { id: 'invoices', name: 'Hóa đơn', icon: FileText },
        { id: 'reconciliation', name: 'Đối soát', icon: CheckCircle2, children: ['Đối soát giao dịch', 'Đối soát thanh toán'] },
        { id: 'refunds', name: 'Hoàn tiền', icon: DollarSign },
        { id: 'reports', name: 'Báo cáo', icon: BarChart3, children: ['Báo cáo doanh thu', 'Báo cáo bán vé', 'Báo cáo bán hàng', 'Báo cáo phương thức TT'] },
      ];
  }
}

// ============================================================
// DATA TYPES
// ============================================================
interface TMSUser { id?: number; username: string; full_name: string; role: TMSRole; phone?: string; email?: string; theater_id?: number; theater_name?: string; status?: string; last_login?: string | null; membership_level?: string; points?: number; booking_count?: number; total_spent?: number; oauth_providers?: string | null; created_at?: string; account_type?: 'internal' | 'customer'; }
type PermissionLevel = 'full' | 'manage' | 'view' | 'none';
interface RbacGrant { level: PermissionLevel; note: string; updated_at?: string; }
interface RbacModule { key: string; module: string; sort_order: number; permissions: Record<TMSRole, RbacGrant>; }
function formatLastLogin(value?: string | null) {
  if (!value) return '—';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (!match) return '—';
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    (year === 1970 && month === 1 && day === 1 && hour === 0 && minute === 0 && second === 0)
  ) return '—';
  return `${hourText}:${minuteText}:${secondText} ${dayText}/${monthText}/${yearText}`;
}
const TMS_VIEW_PARAM = 'view';
const tmsViewStorageKey = (user: Pick<TMSUser, 'id' | 'username'>) => `aurora_tms_active_view:${user.id || user.username}`;
const allowedTmsViews = (role: TMSRole) => {
  const allowed = new Set<string>(['dashboard']);
  getRoleNavItems(role).forEach(item => {
    allowed.add(item.id);
    (item.children || []).forEach(child => allowed.add(child));
  });
  const operationalViews: Record<TMSRole, string[]> = {
    super_admin: ['screens', 'transactions', 'movies'],
    cinema_admin: ['screens', 'movie_plan', 'schedules'],
    supervisor: ['screens', 'showtimes', 'transactions', 'refunds'],
    accounting: ['transactions', 'refunds'],
  };
  operationalViews[role].forEach(view => allowed.add(view));
  return allowed;
};
const restoredTmsView = (user: Pick<TMSUser, 'id' | 'username' | 'role'>) => {
  const urlView = new URLSearchParams(window.location.search).get(TMS_VIEW_PARAM);
  const storedView = window.sessionStorage.getItem(tmsViewStorageKey(user));
  const candidate = urlView || storedView || 'dashboard';
  return allowedTmsViews(user.role).has(candidate) ? candidate : 'dashboard';
};
const replaceTmsViewInUrl = (view?: string) => {
  const url = new URL(window.location.href);
  if (view && view !== 'dashboard') url.searchParams.set(TMS_VIEW_PARAM, view);
  else url.searchParams.delete(TMS_VIEW_PARAM);
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
};
interface ScreenData { id: number; theater_id?: number; screen_code: string; name: string; screen_type: string; total_seats: number; projector_status: 'online'|'standby'|'maintenance'|'error'; sound_system_status: 'online'|'standby'|'error'; hvac_temperature: number; lamp_hours: number; status: 'active'|'paused'|'cleaning'|'closed'; }
interface RoomShowtime { id: number; movie_id: number; movie_title: string; duration_minutes: number; age_rating: string; poster_url?: string; starts_at: string; ends_at: string; status: string; booked_seats: number; locked_seats: number; }
interface RoomSeat { id: number; seat_row: string; seat_number: number; seat_type: 'STANDARD'|'VIP'|'COUPLE'; seat_status: 'available'|'booked'|'locked'|'held'; lock_reason?: string; locked_by?: string; }
interface RoomSeatMapData {
  date: string;
  screen: ScreenData & { theater_name: string; theater_address?: string };
  showtimes: RoomShowtime[];
  selected_showtime?: RoomShowtime;
  seats: RoomSeat[];
  summary: { available: number; booked: number; locked: number; held: number };
}
interface CinemaSystemTheater extends TheaterItem { phone?: string; status: string; total_screens: number; active_screens: number; total_seats: number; admin_name: string; showtimes: number; running_showtimes: number; booked_seats: number; locked_seats: number; }
interface CinemaSystemScreen extends ScreenData { showtimes: number; booked_seats: number; first_showtime?: string; first_movie: string; }
interface CinemaSystemOverview { date: string; selected_theater_id: number; summary: { theaters:number; screens:number; active_screens:number; seats:number; showtimes:number; booked_seats:number; locked_seats:number }; theaters:CinemaSystemTheater[]; screens:CinemaSystemScreen[]; }
interface RefundItem { id: number; transaction_code: string; customer_name: string; reason: string; amount: number; payment_method: string; status: 'pending'|'approved'|'rejected'|'completed'; created_at?: string; requested_by?: string; }
interface TxnItem { id: number; transaction_code: string; customer_name?: string; customer_phone?: string; channel: 'pos'|'website'|'ota'; amount: number; payment_method: string; status: 'paid'|'pending'|'cancelled'|'refunded'; created_at?: string; cancel_requested?: boolean; }
interface StaffShift { id: number; name: string; position: string; shift: string; time: string; status: 'on_duty'|'checked_in'|'absent'; checkin: string; }
interface PosStaffItem {
  id: number; employee_code: string; username: string; full_name: string; phone: string;
  role: 'cashier'|'supervisor'; status: 'active'|'inactive'|'locked'; theater_id: number; theater_name: string;
  last_login_at?: string | null; open_shift_id: number; shift_status?: 'active'|'paused'|null;
  today_orders: number; today_revenue: number;
  issued_by_tms_user_id?: number|null; issued_by_name?: string|null;
  updated_by_tms_user_id?: number|null; updated_by_name?: string|null; created_at?: string|null; updated_at?: string|null;
}
interface PosSessionItem {
  id: number; user_id: number; employee_code: string; full_name: string; username: string; role: string;
  theater_id: number; theater_name: string; counter: string; initial_cash: number; cash_at_close: number|null;
  expected_cash: number; cash_difference: number|null; status: 'active'|'paused'|'closed'; opened_at: string;
  closed_at?: string|null; notes?: string; close_note?: string; closed_by?: string; order_count: number;
  total_revenue: number; cash_revenue: number; non_cash_revenue: number;
  authorized_by_tms_user_id?:number|null; authorized_by_name?:string|null; authorized_by_role?:string|null;
  sales_areas?: string[];
}
interface PosWorkScheduleItem {
  id: number; theater_id: number; theater_name: string; user_id: number; employee_code: string; full_name: string; username: string;
  role: string; user_status: string; work_date: string; start_time: string; end_time: string; sales_areas: string[];
  counter: string; initial_cash: number; status: 'scheduled'|'confirmed'|'active'|'completed'|'cancelled';
  linked_shift_id: number|null; shift_status?: string|null; notes?: string; created_by_name?: string; updated_by_name?: string;
}
const POS_SALES_AREAS = [
  { value:'box_ticket', label:'Box Ticket', description:'Bán vé, chọn ghế và tra cứu vé', icon:Ticket },
  { value:'concession', label:'Concession', description:'Bắp nước, combo và đồ uống', icon:Package },
  { value:'merchandise', label:'Merchandise', description:'Quà tặng và sản phẩm phim', icon:Tag },
];
interface PosCounterItem { id:number; theater_id:number; counter_code:string; counter_name:string; counter_role_code:string; status:string; sort_order:number; open_shift_id:number; }
interface PosStaffDetail {
  staff: PosStaffItem & { created_at?:string; updated_at?:string; theater_address?:string };
  performance_30_days: { order_count:number; revenue:number; average_order:number; cancelled_orders:number; selling_days:number };
  payment_methods: Array<{ method:string; order_count:number; revenue:number }>;
  recent_shifts: Array<{ id:number; counter:string; status:'active'|'paused'|'closed'; opened_at:string; closed_at?:string|null; initial_cash:number; cash_at_close:number|null; expected_cash:number; cash_difference:number|null; order_count:number; total_revenue:number; cash_revenue:number }>;
  login_events: Array<{ id:number; event_type:string; is_success:number; ip_address?:string; created_at:string }>;
  management_events: Array<{ id:number; actor_name:string; action_name:string; detail:string; created_at:string }>;
}
interface TicketType { id: number; name: string; code: string; price: number; status?: string; description?: string; matrix?: Record<string, Record<string, number>>; }
interface ScheduleItem { id: number; screen_id: number; movie_id: number; theater_id?: number; theater_name?: string; theater_city?: string; movie_title: string; screen_name: string; show_date: string; start_time: string; end_time: string; booked_seats: number; total_seats: number; ticket_price?: number; ticket_type_ids?: string; operational_note?: string; status: 'scheduled'|'running'|'finished'|'cancelled'; customer_showtime_id?: number; can_delete?: number|string|boolean; delete_block_reason?: string; }
type ScheduleView = 'active' | 'upcoming' | 'history' | 'all';
interface ScheduleMeta { page: number; per_page: number; total: number; total_pages: number; view: ScheduleView; theater_id?: number; summary: { scheduled: number; running: number; finished: number; active_rooms: number; booked_seats: number; theaters: number; }; }
interface ScheduleDeleteError extends Error { blockedIds?: number[]; }
interface ScheduleSlotAvailability { occupied: Array<{ source:'saved'|'draft'; id:number; start:string; end:string }>; suggestions: Array<{ start:string; end:string }>; suggested?: { start:string; end:string } | null; duration_minutes?: number; turnaround_minutes?: number; }
const canDeleteSchedule = (schedule: ScheduleItem) => Number(schedule.can_delete) === 1;
const scheduleDeleteBlockLabel = (schedule: ScheduleItem) => schedule.delete_block_reason === 'has_booking_history'
  ? 'Suất chiếu đã có lịch sử đặt vé'
  : schedule.delete_block_reason === 'started' ? 'Suất chiếu đã bắt đầu' : 'Suất chiếu không thể xóa';
interface MovieImportRow extends Omit<MovieForm, 'id'> {
  raw: Record<string, string>;
  fieldHeaders: Record<string, string>;
}
interface MovieImportError { row: number; field?: string; message: string; suggestion?: string; }
interface MovieImportSummary { total: number; valid: number; errors: number; added?: number; }
interface MovieForm {
  id: number;
  movie_code: string;
  title: string;
  original_title: string;
  genre: string;
  duration_minutes: number;
  age_rating: string;
  director: string;
  cast: string;
  writer: string;
  producer: string;
  production_country: string;
  production_year: number | '';
  description: string;
  plot_details: string;
  original_language: string;
  localization_versions: string;
  format: string;
  release_date: string;
  expected_end_date: string;
  distributor: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  status: string;
}

const MOVIE_GENRES = ['Hành động', 'Khoa học viễn tưởng', 'Tâm lý', 'Hài hước', 'Kinh dị', 'Hoạt hình', 'Phiêu lưu', 'Thần thoại', 'Gia đình', 'Tình cảm', 'Hành động - Hài', 'Chiến tranh', 'Võ thuật', 'Trinh thám'];
const MOVIE_COUNTRIES = ['Việt Nam', 'Hoa Kỳ', 'Hàn Quốc', 'Nhật Bản', 'Trung Quốc', 'Thái Lan', 'Hong Kong', 'Anh', 'Pháp', 'Đức', 'Canada', 'Úc', 'Ấn Độ'];
const MOVIE_LANGUAGES = ['Tiếng Anh', 'Tiếng Việt', 'Tiếng Nhật', 'Tiếng Hàn', 'Tiếng Trung', 'Tiếng Thái', 'Tiếng Pháp', 'Tiếng Tây Ban Nha', 'Tiếng Nga'];
const MOVIE_LOCALIZATION_OPTIONS = ['Phụ đề Việt / Lồng tiếng Việt', 'Phụ đề Việt / Lồng tiếng Anh', 'Phụ đề Việt', 'Lồng tiếng Việt', 'Phụ đề Anh / Lồng tiếng Việt', 'Phụ đề Việt / Lồng tiếng Hàn'];
const MOVIE_FORMAT_OPTIONS = ['2D Digital', '3D Digital', 'IMAX 2D', 'IMAX 3D', '4DX', 'Dolby Atmos', 'VIP', 'ScreenX'];
const AGE_RATING_META: Record<string, { label: string; color: string; background: string }> = {
  P: { label: 'P · Phổ biến mọi lứa tuổi', color: '#047857', background: '#d1fae5' },
  K: { label: 'K · Trẻ dưới 13 tuổi xem cùng cha mẹ/người giám hộ', color: '#1d4ed8', background: '#dbeafe' },
  T13: { label: 'T13 · Từ 13 tuổi trở lên', color: '#a16207', background: '#fef3c7' },
  T16: { label: 'T16 · Từ 16 tuổi trở lên', color: '#c2410c', background: '#ffedd5' },
  T18: { label: 'T18 · Từ 18 tuổi trở lên', color: '#be123c', background: '#ffe4e6' }
};
const getAgeRating = (value: string) => {
  const normalized = String(value || '').toUpperCase();
  const code = ['T18', 'T16', 'T13', 'K', 'P'].find(item => normalized === item || normalized.startsWith(`${item} `) || normalized.startsWith(`${item}-`) || normalized.startsWith(`${item} -`)) || normalized;
  return { code: code || '—', ...(AGE_RATING_META[code] || { label: String(value || 'Chưa phân loại'), color: '#64748b', background: '#f1f5f9' }) };
};
type MovieStatus = 'coming_soon' | 'now_showing' | 'special_showing' | 'ended';
const MOVIE_STATUS_META: Record<MovieStatus, { label: string; color: string; background: string }> = {
  coming_soon: { label: 'Sắp chiếu', color: '#1d4ed8', background: '#dbeafe' },
  now_showing: { label: 'Đang chiếu', color: '#047857', background: '#d1fae5' },
  special_showing: { label: 'Đặc biệt', color: '#a16207', background: '#fef3c7' },
  ended: { label: 'Đã kết thúc', color: '#64748b', background: '#eef2f6' },
};
const normalizeMovieStatus = (value: unknown): MovieStatus | null => {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized in MOVIE_STATUS_META ? normalized as MovieStatus : null;
};
const getMovieStatus = (value: unknown) => {
  const normalized = normalizeMovieStatus(value);
  return normalized ? { code: normalized, ...MOVIE_STATUS_META[normalized] } : { code: 'unknown', label: 'Chưa xác định', color: '#64748b', background: '#f1f5f9' };
};
const MOVIE_IMPORT_REQUIRED_FIELDS: Record<string, string> = {
  title: 'Tên phim', original_title: 'Tên phim gốc', genre: 'Thể loại', duration_minutes: 'Thời lượng', age_rating: 'Độ tuổi',
  director: 'Đạo diễn', cast: 'Diễn viên', writer: 'Biên kịch', producer: 'Nhà sản xuất', production_country: 'Quốc gia sản xuất', production_year: 'Năm sản xuất',
  description: 'Tóm tắt phim', plot_details: 'Nội dung chi tiết', original_language: 'Ngôn ngữ gốc', localization_versions: 'Phiên bản phát hành', format: 'Định dạng',
  release_date: 'Ngày khởi chiếu', expected_end_date: 'Ngày kết thúc dự kiến', distributor: 'Nhà phát hành', poster_url: 'Poster URL', banner_url: 'Banner URL', trailer_url: 'Trailer URL', status: 'Trạng thái'
};

const movieImportSuggestion = (field?: string) => {
  const suggestions: Record<string, string> = {
    movie_code: 'Điền mã phim duy nhất, ví dụ AUR-2026-001.', title: 'Điền tên phim hiển thị trên hệ thống.', original_title: 'Điền tên phim gốc, không để trống.', genre: 'Điền thể loại phim, có thể dùng nhiều thể loại phân cách bằng dấu phẩy.',
    duration_minutes: 'Nhập số nguyên từ 1 đến 600 (đơn vị phút).', age_rating: 'Nhập nhãn độ tuổi như T13, T16 hoặc T18.', director: 'Điền tên đạo diễn.', cast: 'Điền danh sách diễn viên.', writer: 'Điền biên kịch.', producer: 'Điền nhà sản xuất.', production_country: 'Điền quốc gia sản xuất.', production_year: 'Nhập năm từ 1888 đến 2100.',
    description: 'Điền tóm tắt ngắn của phim.', plot_details: 'Điền nội dung chi tiết của phim.', original_language: 'Điền ngôn ngữ gốc.', localization_versions: 'Điền phiên bản phát hành.', format: 'Điền định dạng chiếu như 2D Digital hoặc IMAX 2D.',
    release_date: 'Dùng định dạng YYYY-MM-DD, ví dụ 2026-10-01.', expected_end_date: 'Dùng định dạng YYYY-MM-DD và không trước ngày khởi chiếu.', distributor: 'Điền nhà phát hành.', poster_url: 'Điền URL poster hợp lệ.', banner_url: 'Điền URL banner hợp lệ.', trailer_url: 'Điền URL trailer hợp lệ.', status: 'Dùng một trong: COMING_SOON, NOW_SHOWING, SPECIAL_SHOWING, ENDED.'
  };
  return suggestions[field || ''] || 'Kiểm tra lại giá trị theo tên cột và điền dữ liệu hợp lệ.';
};

const EMPTY_MOVIE_FORM: MovieForm = {
  id: 0,
  movie_code: '',
  title: '',
  original_title: '',
  genre: '',
  duration_minutes: 120,
  age_rating: 'T13',
  director: '',
  cast: '',
  writer: '',
  producer: '',
  production_country: '',
  production_year: '',
  description: '',
  plot_details: '',
  original_language: '',
  localization_versions: '',
  format: '2D Digital',
  release_date: '',
  expected_end_date: '',
  distributor: '',
  poster_url: '',
  banner_url: '',
  trailer_url: '',
  status: 'coming_soon'
};

export interface MoviePlan {
  id: number;
  plan_code?: string;
  plan_name: string;
  plan_month: number;
  plan_year: number;
  movie_id: number;
  movie_title: string;
  format: string;
  expected_start_date: string;
  expected_end_date: string;
  target_revenue: number;
  target_screenings_per_day: number;
  priority_level: 'blockbuster' | 'high' | 'medium' | 'low';
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  note?: string;
  created_by?: string;
  created_at?: string;
  approved_by?: string;
  approved_at?: string;
  updated_by?: string;
  updated_at?: string;
  allocations?: MovieAllocation[];
  allocated_count?: number;
  total_theaters?: number;
  confirmed_count?: number;
}

export interface MovieAllocation {
  id: number;
  plan_id: number;
  movie_id: number;
  movie_title: string;
  theater_id: number;
  theater_name: string;
  min_screenings_per_day: number;
  preferred_screen_types: string;
  allocated_start_date: string;
  allocated_end_date: string;
  status: 'pending' | 'confirmed' | 'deploying' | 'completed';
  confirmed_by?: string;
  confirmed_at?: string;
  note?: string;
}

export interface MovieItem {
  id: number;
  movie_code: string;
  title: string;
  original_title: string;
  genre: string;
  duration_minutes: number;
  age_rating: string;
  director: string;
  cast: string;
  writer: string;
  producer: string;
  production_country: string;
  production_year?: number | null;
  description: string;
  plot_details: string;
  original_language: string;
  localization_versions: string;
  format: string;
  release_date: string;
  expected_end_date: string;
  distributor: string;
  poster_url: string;
  banner_url: string;
  trailer_url: string;
  status: string;
}

interface ScheduleMovieItem extends MovieItem {
  allocation_id: number;
  theater_id: number;
  theater_name: string;
  allocated_start_date: string;
  allocated_end_date: string;
  min_screenings_per_day: number;
  preferred_screen_types: string;
  allocation_status: 'confirmed' | 'deploying';
  plan_id: number;
  plan_code: string;
  plan_name: string;
  plan_status: 'published' | 'in_progress';
  schedule_count?: number;
  active_schedule_count?: number;
  active_screen_count?: number;
  next_showtime_at?: string | null;
}

export interface TheaterItem {
  id: number;
  name: string;
  address: string;
  city: string;
}

interface DashboardData {
  date: string;
  revenue_source: 'orders' | 'transactions' | 'revenue_logs';
  theater?: { id: number; name: string; address: string; city: string } | null;
  revenue: { total_revenue: number; total_tickets: number; occupancy_rate: number };
  previous_day_revenue: number;
  transaction_count: number;
  channels: Array<{ code: 'pos' | 'website' | 'ota'; name: string; amount: number }>;
  active_theaters: number;
  active_users: number;
  active_screens: number;
  showtimes: number;
  booked_seats: number;
  staff_on_duty: number;
  pending_refunds: number;
  revenue_7_days: Array<{ date: string; total_revenue: number }>;
  top_movies: Array<{ id: number; title: string; booked_seats: number; showtimes: number }>;
  recent_transactions: Array<{ id: number; transaction_code: string; customer_name?: string; amount: number; channel: string; status: string; created_at: string }>;
  screens_status: ScreenData[];
}

function localIsoDate(offsetDays = 0) {
  const value = new Date();
  value.setHours(12, 0, 0, 0);
  value.setDate(value.getDate() + offsetDays);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftLocalIsoDate(isoDate: string, offsetDays: number) {
  const [year, month, day] = String(isoDate).split('-').map(Number);
  if (!year || !month || !day) return localIsoDate(offsetDays);
  const value = new Date(year, month - 1, day, 12, 0, 0, 0);
  value.setDate(value.getDate() + offsetDays);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

function formatVietnameseDate(value: string) {
  const parts = String(value || '').split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : 'Chưa chọn ngày';
}

function parseVietnameseDate(value: string) {
  const match = String(value || '').trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText), month = Number(monthText), year = Number(yearText);
  const candidate = new Date(year, month - 1, day, 12, 0, 0);
  if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) return null;
  return `${yearText}-${monthText}-${dayText}`;
}

/** Date fields must not inherit the browser's MM/DD/YYYY locale. */
function VietnameseDateInput({ value, onChange, className = '', disabled = false, required = false, ariaLabel }: { value:string; onChange:(value:string)=>void; className?:string; disabled?:boolean; required?:boolean; ariaLabel?:string }) {
  const normalized = value ? formatVietnameseDate(value) : '';
  const [draft, setDraft] = useState(normalized);
  useEffect(() => setDraft(normalized), [normalized]);
  const commit = () => {
    if (!draft) { if (value) onChange(''); return; }
    const parsed = parseVietnameseDate(draft);
    if (parsed) onChange(parsed);
    else setDraft(normalized);
  };
  return <input type="text" className={className} value={draft} disabled={disabled} required={required} inputMode="numeric" autoComplete="off" placeholder="dd/MM/yyyy" aria-label={ariaLabel} onChange={event=>setDraft(event.target.value.replace(/[^0-9/]/g,''))} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/>;
}

const formatMoney = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const formatPosDateTime = (value?: string|null) => {
  if (!value) return '—';
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
};

// ============================================================
// APP COMPONENT
// ============================================================
export default function App() {
  // AUTH STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<TMSUser | null>(null);

  // NAVIGATION
  const [active, setActive] = useState('dashboard');
  const [expanded, setExpanded] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 760);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [period, setPeriod] = useState('Hôm nay');
  const [reportDate, setReportDate] = useState(() => localIsoDate());
  const reportDateInputRef = useRef<HTMLInputElement>(null);

  // DATA
  const [tmsUsers, setTmsUsers] = useState<TMSUser[]>([]);
  const [customerUsers, setCustomerUsers] = useState<TMSUser[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountSummary, setAccountSummary] = useState({ total:0, active:0, locked:0, internal_total:0, internal_active:0, customer_total:0, customer_active:0, customer_points:0, admins:0 });
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState('');
  const dashboardLoadSequence = useRef(0);
  const [cinemaScheduleBoard, setCinemaScheduleBoard] = useState<any>(null);
  const [cinemaScheduleBoardLoading, setCinemaScheduleBoardLoading] = useState(false);
  const [cinemaScheduleBoardError, setCinemaScheduleBoardError] = useState('');
  const cinemaBoardLoadSequence = useRef(0);
  // Never use demo rooms here. Room visibility must come exclusively from
  // the scoped API response for the signed-in cinema administrator.
  const [screensList, setScreensList] = useState<ScreenData[]>([]);
  const [roomScreenId, setRoomScreenId] = useState(0);
  const [roomScheduleDate, setRoomScheduleDate] = useState(localIsoDate());
  const [roomShowtimeId, setRoomShowtimeId] = useState(0);
  const [roomSeatMap, setRoomSeatMap] = useState<RoomSeatMapData | null>(null);
  const [roomSeatMapLoading, setRoomSeatMapLoading] = useState(false);
  const [selectedRoomSeatIds, setSelectedRoomSeatIds] = useState<number[]>([]);
  const [seatLockReason, setSeatLockReason] = useState('');
  const [seatLockSaving, setSeatLockSaving] = useState(false);
  const [cinemaSystemDate, setCinemaSystemDate] = useState(localIsoDate());
  const [selectedCinemaId, setSelectedCinemaId] = useState(0);
  const [cinemaSystemData, setCinemaSystemData] = useState<CinemaSystemOverview | null>(null);
  const [cinemaSystemLoading, setCinemaSystemLoading] = useState(false);
  const [cinemaSystemError, setCinemaSystemError] = useState('');
  const [screenPreparation, setScreenPreparation] = useState<any | null>(null);
  const [screenPreparationLoading, setScreenPreparationLoading] = useState(false);
  const [screenPreparationSaving, setScreenPreparationSaving] = useState(false);
  const [screenPreparationNote, setScreenPreparationNote] = useState('');
  const [screenReadinessForm, setScreenReadinessForm] = useState<ScreenReadinessForm>({ ...EMPTY_SCREEN_READINESS });
  const [refundsList, setRefundsList] = useState<RefundItem[]>([
    { id: 1, transaction_code: 'TXN-260901', customer_name: 'Trần Văn Nam', reason: 'Khách đổi giờ chiếu bận đột xuất', amount: 190000, payment_method: 'VNPAY QR', status: 'pending', created_at: '27/09 14:20', requested_by: 'Lê POS (Nhân viên POS)' },
    { id: 2, transaction_code: 'TXN-260892', customer_name: 'Lê Thu Thủy', reason: 'Máy chiếu phòng 2 gián đoạn 10 phút', amount: 240000, payment_method: 'Thẻ NH', status: 'approved', created_at: '27/09 11:15', requested_by: 'Supervisor' },
    { id: 3, transaction_code: 'TXN-260870', customer_name: 'Nguyễn Văn Phát', reason: 'Hủy vé trước 2 tiếng theo quy định', amount: 160000, payment_method: 'Tiền mặt', status: 'completed', created_at: '26/09 18:30', requested_by: 'Supervisor' },
  ]);
  const [txnsList, setTxnsList] = useState<TxnItem[]>([
    { id: 101, transaction_code: 'TXN-260905', customer_name: 'Nguyễn Trần Thái Bảo', customer_phone: '0328754062', channel: 'pos', amount: 280000, payment_method: 'Tiền mặt', status: 'paid', created_at: '19:45', cancel_requested: false },
    { id: 102, transaction_code: 'TXN-260904', customer_name: 'Võ Hoàng Yến', customer_phone: '0908123456', channel: 'website', amount: 190000, payment_method: 'VNPAY QR', status: 'paid', created_at: '19:32', cancel_requested: true },
    { id: 103, transaction_code: 'TXN-260903', customer_name: 'Lê Minh Quân', customer_phone: '0912888999', channel: 'ota', amount: 420000, payment_method: 'Thẻ NH', status: 'paid', created_at: '19:10', cancel_requested: false },
    { id: 104, transaction_code: 'TXN-260902', customer_name: 'Đặng Mai Phương', customer_phone: '0933777888', channel: 'pos', amount: 160000, payment_method: 'Tiền mặt', status: 'paid', created_at: '18:55', cancel_requested: true },
    { id: 105, transaction_code: 'TXN-260898', customer_name: 'Phạm Quốc Hùng', customer_phone: '0944111222', channel: 'pos', amount: 95000, payment_method: 'Tiền mặt', status: 'paid', created_at: '18:20', cancel_requested: false },
  ]);
  const [staffShifts, setStaffShifts] = useState<StaffShift[]>([
    { id: 1, name: 'Nguyễn Văn Hùng', position: 'Nhân viên POS', shift: 'Ca Sáng', time: '08:00 - 16:00', status: 'on_duty', checkin: '07:58' },
    { id: 2, name: 'Trần Thị Lan', position: 'Nhân viên Soát vé', shift: 'Ca Sáng', time: '08:00 - 16:00', status: 'on_duty', checkin: '08:02' },
    { id: 3, name: 'Lê Văn Hưng', position: 'Kỹ thuật viên', shift: 'Ca Sáng', time: '08:30 - 16:30', status: 'on_duty', checkin: '08:28' },
    { id: 4, name: 'Đặng Minh Khoa', position: 'Vận hành 4DX', shift: 'Ca Chiều', time: '15:00 - 23:00', status: 'checked_in', checkin: '14:55' },
    { id: 5, name: 'Phạm Thị Nhung', position: 'Thu ngân quầy', shift: 'Ca Chiều', time: '15:00 - 23:00', status: 'absent', checkin: '—' },
  ]);
  const [posStaff, setPosStaff] = useState<PosStaffItem[]>([]);
  const [posStaffSummary, setPosStaffSummary] = useState({ total:0, active:0, working:0, locked:0, inactive:0, cashiers:0, supervisors:0, today_orders:0, today_revenue:0 });
  const [posStaffLoading, setPosStaffLoading] = useState(false);
  const [posStaffSearch, setPosStaffSearch] = useState('');
  const [posStaffStatus, setPosStaffStatus] = useState('all');
  const [selectedPosStaffId, setSelectedPosStaffId] = useState(0);
  const [posStaffDetail, setPosStaffDetail] = useState<PosStaffDetail|null>(null);
  const [posStaffDetailLoading, setPosStaffDetailLoading] = useState(false);
  const [showPosStaffDetail, setShowPosStaffDetail] = useState(false);
  const [showPosStaffModal, setShowPosStaffModal] = useState(false);
  const [posStaffSaving, setPosStaffSaving] = useState(false);
  const [posStaffForm, setPosStaffForm] = useState({ id:0, theater_id:0, full_name:'', phone:'', role:'cashier' as 'cashier'|'supervisor', status:'active' as 'active'|'inactive'|'locked', password:'' });
  const [showPosStaffPassword, setShowPosStaffPassword] = useState(false);
  const [posSessions, setPosSessions] = useState<PosSessionItem[]>([]);
  const [posCounters, setPosCounters] = useState<PosCounterItem[]>([]);
  const [posSessionSummary, setPosSessionSummary] = useState({ total:0, active:0, paused:0, closed:0, order_count:0, total_revenue:0, cash_difference:0 });
  const [posSessionsLoading, setPosSessionsLoading] = useState(false);
  const [posReportSession, setPosReportSession] = useState<PosSessionItem|null>(null);
  const [posSessionReport, setPosSessionReport] = useState<any>(null);
  const [posSessionReportLoading, setPosSessionReportLoading] = useState(false);
  const [posSessionDate, setPosSessionDate] = useState(localIsoDate());
  const [posSessionStatus, setPosSessionStatus] = useState('all');
  const [posSessionView, setPosSessionView] = useState<'today'|'history'>('today');
  const [posWorkSchedules, setPosWorkSchedules] = useState<PosWorkScheduleItem[]>([]);
  const [posWorkScheduleSummary, setPosWorkScheduleSummary] = useState({ total:0, scheduled:0, confirmed:0, active:0, completed:0, cancelled:0 });
  const [posWorkScheduleLoading, setPosWorkScheduleLoading] = useState(false);
  const [posWorkScheduleStatus, setPosWorkScheduleStatus] = useState('all');
  const [showPosWorkScheduleModal, setShowPosWorkScheduleModal] = useState(false);
  const [posWorkScheduleSaving, setPosWorkScheduleSaving] = useState(false);
  const [posWorkScheduleForm, setPosWorkScheduleForm] = useState({ id:0, user_id:0, theater_id:0, work_date:localIsoDate(), start_time:'08:00', end_time:'16:00', sales_areas:['box_ticket'] as string[], counter:'QUAY-01', initial_cash:500000, notes:'' });
  const [showPosSessionModal, setShowPosSessionModal] = useState(false);
  const [posSessionSaving, setPosSessionSaving] = useState(false);
  const [posSessionForm, setPosSessionForm] = useState({ work_schedule_id:0, user_id:0, theater_id:0, initial_cash:500000, counter:'', sales_areas:['box_ticket'] as string[], notes:'' });
  const [closingPosSession, setClosingPosSession] = useState<PosSessionItem|null>(null);
  const [posCloseForm, setPosCloseForm] = useState({ cash_at_close:0, close_note:'' });

  // MOVIE PLANNING & ALLOCATION DATA (MYSQL AURORA_DB)
  const [moviePlans, setMoviePlans] = useState<MoviePlan[]>([]);
  const [movieAllocations, setMovieAllocations] = useState<MovieAllocation[]>([]);
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [scheduleMoviesList, setScheduleMoviesList] = useState<ScheduleMovieItem[]>([]);
  const [theatersList, setTheatersList] = useState<TheaterItem[]>([]);
  const [theatersLoading, setTheatersLoading] = useState(false);
  const [theatersError, setTheatersError] = useState('');
  const [planMonth, setPlanMonth] = useState<number>(10);
  const [planYear, setPlanYear] = useState<number>(2026);
  const [planSearch, setPlanSearch] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState('all');
  const [selectedTheaterFilter, setSelectedTheaterFilter] = useState<number>(0);
  const [systemNotice, setSystemNotice] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [systemConfirm, setSystemConfirm] = useState<{ title?: string; message: string; actionLabel: string; onConfirm: () => void | Promise<void> } | null>(null);

  // MODALS
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ id: 0, username: '', full_name: '', phone: '', email: '', theater_id: 0, role: 'cinema_admin' as TMSRole, password: '', status: 'active' });
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountRoleFilter, setAccountRoleFilter] = useState<'all' | TMSRole>('all');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'locked'>('all');
  const [rbacMatrix, setRbacMatrix] = useState<RbacModule[]>([]);
  const [rbacLoading, setRbacLoading] = useState(false);
  const [rbacSaving, setRbacSaving] = useState(false);
  const [rbacEditing, setRbacEditing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ transaction_code: '', customer_name: '', amount: 190000, reason: '', payment_method: 'cash' });

  // MOVIE PLAN MODAL
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: 0,
    plan_code: '',
    plan_name: 'Kế hoạch Phim Tháng 10/2026 - Mùa Halloween & Bom Tấn Cuối Năm',
    plan_month: 10,
    plan_year: 2026,
    movie_id: 11,
    movie_title: 'Venom: Kèo Cuối (The Last Dance)',
    format: 'IMAX 3D / 2D Digital',
    expected_start_date: '2026-10-01',
    expected_end_date: '2026-10-31',
    target_revenue: 950000000,
    target_screenings_per_day: 8,
    priority_level: 'blockbuster' as 'blockbuster' | 'high' | 'medium' | 'low',
    status: 'draft' as 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled',
    note: '',
    created_by: '',
    created_at: '',
    approved_by: '',
    approved_at: '',
    updated_by: '',
    updated_at: '',
    selected_theaters: [1, 2, 3, 4, 5] as number[]
  });

  // ALLOCATION MODAL
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTargetPlan, setAllocationTargetPlan] = useState<MoviePlan | null>(null);
  const [allocSelectedTheaters, setAllocSelectedTheaters] = useState<number[]>([]);
  const [allocMinScreenings, setAllocMinScreenings] = useState(6);

  // MOVIE MODAL
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [movieForm, setMovieForm] = useState<MovieForm>({ ...EMPTY_MOVIE_FORM });
  const [movieFiles, setMovieFiles] = useState<{ poster: File | null; banner: File | null; trailer: File | null }>({ poster: null, banner: null, trailer: null });
  const [movieMediaPreviews, setMovieMediaPreviews] = useState<{ poster: string; banner: string; trailer: string }>({ poster: '', banner: '', trailer: '' });
  const movieImportRef = useRef<HTMLInputElement>(null);
  const [showMovieImportModal, setShowMovieImportModal] = useState(false);
  const [movieImportFileName, setMovieImportFileName] = useState('');
  const [movieImportRows, setMovieImportRows] = useState<MovieImportRow[]>([]);
  const [movieImportColumns, setMovieImportColumns] = useState<string[]>([]);
  const [movieImportErrors, setMovieImportErrors] = useState<MovieImportError[]>([]);
  const [movieImportSummary, setMovieImportSummary] = useState<MovieImportSummary>({ total: 0, valid: 0, errors: 0 });
  const [movieImportStatus, setMovieImportStatus] = useState<'preview' | 'validated' | 'errors' | 'importing' | 'completed'>('preview');
  const [movieImportInfoCell, setMovieImportInfoCell] = useState<string | null>(null);
  const [movieFormError, setMovieFormError] = useState('');
  const [schedulesList, setSchedulesList] = useState<ScheduleItem[]>([]);
  const [ticketTypesList, setTicketTypesList] = useState<TicketType[]>([]);
  const [pricingTypes, setPricingTypes] = useState<TicketType[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingEditor, setPricingEditor] = useState<TicketType | null>(null);
  const [pricingDraft, setPricingDraft] = useState<Record<string, Record<string, number>>>({});
  const [pricingSaving, setPricingSaving] = useState(false);
  const [showPricingCreate, setShowPricingCreate] = useState(false);
  const [pricingCreateError, setPricingCreateError] = useState('');
  const [pricingCreateForm, setPricingCreateForm] = useState({ name:'', code:'TICKET_', description:'', category:'standard', eligibility_note:'', purchase_limit:'', prices:{ weekday:{morning:0,standard:0,evening:0}, weekend:{morning:0,standard:0,evening:0}, holiday:{morning:0,standard:0,evening:0} } });
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'all' | ScheduleItem['status']>('all');
  const [scheduleTheaterFilter, setScheduleTheaterFilter] = useState(0);
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleMovieId, setScheduleMovieId] = useState(0);
  const [scheduleView, setScheduleView] = useState<ScheduleView>('active');
  const [schedulePage, setSchedulePage] = useState(1);
  const [scheduleMeta, setScheduleMeta] = useState<ScheduleMeta>({ page:1, per_page:20, total:0, total_pages:1, view:'active', theater_id:0, summary:{ scheduled:0, running:0, finished:0, active_rooms:0, booked_seats:0, theaters:0 } });
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<number[]>([]);
  const [scheduleBulkDeleting, setScheduleBulkDeleting] = useState(false);
  const [scheduleSlotAvailability, setScheduleSlotAvailability] = useState<Record<string, ScheduleSlotAvailability>>({});
  // Records the room for which a slot's time was explicitly accepted/edited.
  // Availability can refresh freely without resetting an operator's choice.
  const scheduleSlotTimeLockedForRoom = useRef<Record<string, number>>({});
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const scheduleLoadSequence = useRef(0);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ id: 0, movie_id: 0, screen_ids: [] as number[], ticket_type_ids: [] as number[], show_date: localIsoDate(1), start_time: '09:00', end_time: '11:00', time_slots: [{ key: 'slot-1', screen_id: 0, start_time: '09:00', end_time: '11:00' }], ticket_price: 0, operational_note: '', status: 'scheduled' });
  const [showDeploymentDetailModal, setShowDeploymentDetailModal] = useState(false);
  const [deploymentDetail, setDeploymentDetail] = useState<any>(null);
  const [deploymentDetailLoading, setDeploymentDetailLoading] = useState(false);

  const API_BASE = 'http://localhost/AURORA%20CINEMA/tms/backend/public/api.php';

  const toTmsRole = (role: string): TMSRole => (
    role === 'director' || role === 'super_admin' ? 'super_admin'
      : role === 'supervisor' || role === 'technician' ? 'supervisor'
        : role === 'accounting' ? 'accounting' : 'cinema_admin'
  );

  const generateMovieCode = () => {
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `AUR-${new Date().getFullYear()}-${random}`;
  };

  const toggleMovieMultiValue = (field: 'genre' | 'format', value: string) => {
    const selected = movieForm[field].split(',').map(item => item.trim()).filter(Boolean);
    const next = selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value];
    setMovieForm({ ...movieForm, [field]: next.join(', ') });
  };

  const clearMovieMedia = () => {
    setMovieFiles({ poster: null, banner: null, trailer: null });
    setMovieMediaPreviews(previous => {
      Object.values(previous).filter(Boolean).forEach(url => URL.revokeObjectURL(url));
      return { poster: '', banner: '', trailer: '' };
    });
  };

  // React state is cleared by F5; restore the valid PHP session before
  // deciding whether to render the login screen.
  useEffect(() => {
    let isMounted = true;
    const restoreSession = async () => {
      try {
        const response = await fetch(`${API_BASE}?action=me`, { credentials: 'include' });
        const result = await response.json();
        const user = result?.data;
        if (isMounted && response.ok && result.success && user?.username) {
          // The PHP session is the single source of truth after a refresh.
          // Do not turn a recoverable session mismatch into an automatic
          // logout; the account returned by the authenticated API is restored.
          window.sessionStorage.setItem('aurora_tms_username', user.username);
          const restoredUser = { id: user.id, username: user.username, full_name: user.full_name, role: toTmsRole(user.role), phone: user.phone, theater_id: Number(user.theater_id || 0), theater_name: user.theater_name, status: user.status } as TMSUser;
          setCurrentUser(restoredUser);
          setActive(restoredTmsView(restoredUser));
          setIsLoggedIn(true);
        }
      } catch {
        // No valid session: show the login form below.
      } finally {
        if (isMounted) setIsRestoringSession(false);
      }
    };
    restoreSession();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const allowed = allowedTmsViews(currentUser.role);
    if (!allowed.has(active)) {
      setActive('dashboard');
      return;
    }
    window.sessionStorage.setItem(tmsViewStorageKey(currentUser), active);
    replaceTmsViewInUrl(active);
    const parent = getRoleNavItems(currentUser.role).find(item => item.children?.includes(active));
    if (parent) setExpanded(parent.id);
  }, [active, isLoggedIn, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!isLoggedIn || !currentUser) return;
    const handleHistoryNavigation = () => {
      const requested = new URLSearchParams(window.location.search).get(TMS_VIEW_PARAM) || 'dashboard';
      setActive(allowedTmsViews(currentUser.role).has(requested) ? requested : 'dashboard');
    };
    window.addEventListener('popstate', handleHistoryNavigation);
    return () => window.removeEventListener('popstate', handleHistoryNavigation);
  }, [isLoggedIn, currentUser?.id, currentUser?.role]);

  const showSystemNotice = (message: string) => {
    const text = String(message || 'Đã hoàn tất thao tác.');
    const type = /lỗi|không thể|không có quyền|vui lòng|thất bại|từ chối/i.test(text) ? 'error' : /chưa|chờ|cảnh báo/i.test(text) ? 'warning' : 'success';
    setSystemNotice({ message: text, type });
  };

  const requestSystemConfirmation = (message: string, onConfirm: () => void | Promise<void>, actionLabel = 'Xác nhận', title = 'Bạn muốn tiếp tục?') => {
    setSystemConfirm({ title, message, onConfirm, actionLabel });
  };

  // Chuyển mọi alert cũ sang thông báo nội bộ Aurora trong khi TMS đang mở.
  useEffect(() => {
    const nativeAlert = window.alert;
    window.alert = (message?: any) => showSystemNotice(String(message || ''));
    return () => { window.alert = nativeAlert; };
  }, []);

  useEffect(() => {
    if (!systemNotice || systemNotice.type !== 'success') return;
    const timer = window.setTimeout(() => setSystemNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [systemNotice]);

  // -------- DATA LOADERS (DIRECT MYSQL PERSISTENCE) --------
  const loadUsers = async () => {
    // Danh sách tài khoản (đặc biệt là customer) chỉ thuộc không gian
    // quản trị của Admin Tổng. Không gửi request trái quyền từ các màn hình
    // vận hành rạp để tránh tạo cảnh báo 403 không liên quan.
    if (currentUser?.role !== 'super_admin') {
      setTmsUsers([]);
      setCustomerUsers([]);
      setAccountsLoading(false);
      return;
    }

    setAccountsLoading(true);
    try {
      const [internalResponse, customerResponse] = await Promise.all([
        fetch(`${API_BASE}?action=users&account_type=internal`, { credentials: 'include', cache: 'no-store' }),
        fetch(`${API_BASE}?action=users&account_type=customer`, { credentials: 'include', cache: 'no-store' })
      ]);
      const [internalData, customerData] = await Promise.all([internalResponse.json(), customerResponse.json()]);
      if (!internalResponse.ok || !internalData.success || !Array.isArray(internalData.data)) throw new Error(internalData.message || 'Không thể tải tài khoản nội bộ.');
      if (!customerResponse.ok || !customerData.success || !Array.isArray(customerData.data)) throw new Error(customerData.message || 'Không thể tải tài khoản customer.');
      setTmsUsers(internalData.data);
      setCustomerUsers(customerData.data);
      setAccountSummary(internalData.summary || customerData.summary || accountSummary);
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể kết nối Aurora DB để tải tài khoản.', type: 'error' }); }
    finally { setAccountsLoading(false); }
  };

  const loadRbacMatrix = async () => {
    if (currentUser?.role !== 'super_admin') return;
    setRbacLoading(true);
    try {
      const response = await fetch(`${API_BASE}?action=permissions`, { credentials: 'include', cache: 'no-store' });
      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Không thể tải ma trận phân quyền từ Aurora DB.');
      setRbacMatrix(data.data);
    } catch (error) {
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể tải ma trận phân quyền từ Aurora DB.', type: 'error' });
    } finally { setRbacLoading(false); }
  };

  const updateRbacGrant = (moduleKey: string, roleCode: TMSRole, patch: Partial<RbacGrant>) => {
    setRbacMatrix(previous => previous.map(item => item.key !== moduleKey ? item : {
      ...item, permissions: { ...item.permissions, [roleCode]: { ...(item.permissions[roleCode] || { level:'none', note:'' }), ...patch } }
    }));
  };

  const saveRbacMatrix = async () => {
    if (currentUser?.role !== 'super_admin') return;
    setRbacSaving(true);
    try {
      const response = await fetch(`${API_BASE}?action=permissions`, { method:'PUT', credentials:'include', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ items: rbacMatrix }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || 'Không thể lưu ma trận phân quyền.');
      setRbacEditing(false);
      showSystemNotice(data.message || 'Đã lưu chính sách RBAC vào Aurora DB.');
      await loadRbacMatrix();
    } catch (error) { setSystemNotice({ message:error instanceof Error ? error.message : 'Không thể lưu ma trận phân quyền.', type:'error' }); }
    finally { setRbacSaving(false); }
  };

  const loadDashboard = async (date = reportDate) => {
    const requestId = ++dashboardLoadSequence.current;
    setDashboardLoading(true);
    setDashboardError('');
    try {
      const res = await fetch(`${API_BASE}?action=dashboard&date=${encodeURIComponent(date)}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !data.data) throw new Error(data.message || 'Không thể tải dữ liệu tổng quan.');
      if (requestId !== dashboardLoadSequence.current) return;
      setDashboardData(data.data as DashboardData);
    } catch (error) {
      if (requestId !== dashboardLoadSequence.current) return;
      console.error('Không thể tải dữ liệu dashboard:', error);
      setDashboardData(null);
      setDashboardError(error instanceof Error ? error.message : 'Không thể kết nối Aurora DB.');
    } finally {
      if (requestId === dashboardLoadSequence.current) setDashboardLoading(false);
    }
  };

  const loadCinemaScheduleBoard = async (date = reportDate) => {
    const requestId = ++cinemaBoardLoadSequence.current;
    setCinemaScheduleBoardLoading(true);
    setCinemaScheduleBoardError('');
    try {
      const response = await fetch(`${API_BASE}?action=cinema-schedule-board&date=${encodeURIComponent(date)}`, { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải bảng điều phối lịch chiếu.');
      if (requestId !== cinemaBoardLoadSequence.current) return;
      setCinemaScheduleBoard(result.data);
    } catch (error) {
      if (requestId !== cinemaBoardLoadSequence.current) return;
      console.error('Không thể tải bảng điều phối lịch chiếu:', error);
      setCinemaScheduleBoard(null);
      setCinemaScheduleBoardError(error instanceof Error ? error.message : 'Không thể tải bảng điều phối lịch chiếu.');
    } finally {
      if (requestId === cinemaBoardLoadSequence.current) setCinemaScheduleBoardLoading(false);
    }
  };

  const loadMoviePlans = async (m = planMonth, y = planYear) => {
    try {
      const res = await fetch(`${API_BASE}?action=movie-plans&month=${m}&year=${y}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Không thể tải kế hoạch phim từ Aurora DB.');
      setMoviePlans(data.data);
    } catch (e) {
      console.error('Error loading movie plans:', e);
    }
  };

  const loadMovieAllocations = async (theaterId = 0) => {
    try {
      const url = theaterId > 0 ? `${API_BASE}?action=movie-allocations&theater_id=${theaterId}` : `${API_BASE}?action=movie-allocations`;
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Không thể tải dữ liệu phân bổ từ Aurora DB.');
      setMovieAllocations(data.data);
    } catch (e) {
      console.error('Error loading allocations:', e);
    }
  };

  const loadMovies = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=movies`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMoviesList(data.data.map((movie: MovieItem) => ({
          ...movie,
          id: Number(movie.id),
          duration_minutes: Number(movie.duration_minutes || 0),
          status: normalizeMovieStatus(movie.status) || String(movie.status || '').toLowerCase()
        })));
      }
    } catch (e) {
      console.error('Error loading movies:', e);
    }
  };

  const loadScheduleMovies = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=schedule-movies`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể tải phim đã phân bổ.');
      setScheduleMoviesList(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      setScheduleMoviesList([]);
      console.error('Error loading allocated schedule movies:', error);
    }
  };

  const loadSchedules = async (options: { showError?: boolean; page?: number } = {}) => {
    const requestId = ++scheduleLoadSequence.current;
    setSchedulesLoading(true);
    try {
      const params = new URLSearchParams({ action:'schedules', view:scheduleView, page:String(options.page || schedulePage), per_page:'20' });
      if (scheduleSearch.trim()) params.set('q', scheduleSearch.trim());
      if (scheduleDateFilter) params.set('date', scheduleDateFilter);
      if (scheduleStatusFilter !== 'all') params.set('status', scheduleStatusFilter);
      if (scheduleMovieId > 0) params.set('movie_id', String(scheduleMovieId));
      if (currentUser?.role === 'super_admin' && scheduleTheaterFilter > 0) params.set('theater_id', String(scheduleTheaterFilter));
      const res = await fetch(`${API_BASE}?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Không thể tải lịch chiếu.');
      if (requestId !== scheduleLoadSequence.current) return false;
      const schedules = data.data as ScheduleItem[];
      setSchedulesList(schedules);
      if (data.meta) {
        const summary = data.meta.summary || {};
        setScheduleMeta({
          page:Number(data.meta.page || 1), per_page:Number(data.meta.per_page || 20), total:Number(data.meta.total || 0), total_pages:Number(data.meta.total_pages || 1),
          view:(data.meta.view || scheduleView) as ScheduleView,
          theater_id:Number(data.meta.theater_id || 0),
          summary:{ scheduled:Number(summary.scheduled || 0), running:Number(summary.running || 0), finished:Number(summary.finished || 0), active_rooms:Number(summary.active_rooms || 0), booked_seats:Number(summary.booked_seats || 0), theaters:Number(summary.theaters || 0) }
        });
        setSchedulePage(Number(data.meta.page || 1));
      }
      // A reload can move rows outside the active filters after another admin
      // edits them. Clearing selection prevents an invisible row from being
      // included in a later destructive request.
      setSelectedScheduleIds([]);
      return true;
    } catch (e) {
      if (requestId === scheduleLoadSequence.current) {
        console.error('Error loading schedules:', e);
        if (options.showError !== false) showSystemNotice(e instanceof Error ? e.message : 'Không thể tải lịch chiếu từ Aurora DB.');
      }
      return false;
    } finally {
      if (requestId === scheduleLoadSequence.current) setSchedulesLoading(false);
    }
  };

  const loadTicketTypes = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=ticket-pricing-policies`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.types)) setTicketTypesList(data.data.types.filter((item: TicketType) => !item.status || item.status === 'active'));
    } catch (e) { console.error('Error loading ticket types:', e); setTicketTypesList([]); }
  };

  const loadPricingPolicies = async () => {
    setPricingLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=ticket-pricing-policies`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể tải chính sách giá.');
      const types = Array.isArray(data.data?.types) ? data.data.types : [];
      setPricingTypes(types); setTicketTypesList(types.filter((item: TicketType) => !item.status || item.status === 'active'));
    } catch (error) { setPricingTypes([]); setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể tải chính sách giá từ Aurora DB.', type: 'error' }); }
    finally { setPricingLoading(false); }
  };

  const openPricingEditor = (ticket: TicketType) => {
    const days = ['weekday', 'weekend', 'holiday']; const slots = ['morning', 'standard', 'evening'];
    const draft: Record<string, Record<string, number>> = {};
    days.forEach(day => { draft[day] = {}; slots.forEach(slot => { draft[day][slot] = Number(ticket.matrix?.[day]?.[slot] ?? 0); }); });
    setPricingDraft(draft); setPricingEditor(ticket);
  };

  const getEffectiveTicketPrice = (ticket: TicketType, showDate: string, startTime: string) => {
    const selectedDate = new Date(`${showDate}T00:00:00`);
    const day = selectedDate.getDay();
    const holidayDates = ['2026-01-01', '2026-04-30', '2026-05-01', '2026-09-02'];
    const dayType = holidayDates.includes(showDate) ? 'holiday' : day === 0 || day === 6 ? 'weekend' : 'weekday';
    const hour = Number(String(startTime || '00:00').slice(0, 2));
    const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'standard' : 'evening';
    return Number(ticket.matrix?.[dayType]?.[timeSlot] ?? ticket.price ?? 0);
  };

  const isTicketAvailableForSchedule = (ticket: TicketType, showDate: string, startTime: string) => getEffectiveTicketPrice(ticket, showDate, startTime) >= 0;
  const isStaffTicket = (ticket: TicketType | null) => ticket?.code === 'TICKET_STAFF_A' || ticket?.code === 'TICKET_STAFF_B';
  const isPricingCellUnavailable = (ticket: TicketType | null, day: string) => ticket?.code === 'TICKET_STAFF_A' ? day === 'holiday' : ticket?.code === 'TICKET_STAFF_B' ? day !== 'weekday' : false;

  const savePricingPolicy = async () => {
    if (!pricingEditor) return;
    setPricingSaving(true);
    try {
      const res = await fetch(`${API_BASE}?action=ticket-pricing-policies`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket_type_id: pricingEditor.id, prices: pricingDraft }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể lưu chính sách giá.');
      showSystemNotice(data.message || 'Đã ban hành bảng giá mới.'); setPricingEditor(null); await loadPricingPolicies(); await loadTicketTypes();
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể lưu chính sách giá.', type: 'error' }); }
    finally { setPricingSaving(false); }
  };

  const openPricingCreate = () => {
    setPricingCreateForm({ name:'', code:'TICKET_', description:'', category:'standard', eligibility_note:'', purchase_limit:'', prices:{ weekday:{morning:0,standard:0,evening:0}, weekend:{morning:0,standard:0,evening:0}, holiday:{morning:0,standard:0,evening:0} } });
    setPricingCreateError('');
    setShowPricingCreate(true);
  };

  const saveNewTicketType = async () => {
    const name = pricingCreateForm.name.trim();
    const code = pricingCreateForm.code.trim();
    if (name.length < 3) { setPricingCreateError('Tên loại vé cần có ít nhất 3 ký tự.'); return; }
    if (!/^TICKET_[A-Z0-9_]{3,32}$/.test(code)) { setPricingCreateError('Mã vé phải có dạng TICKET_TEN_VE và có ít nhất 3 ký tự sau tiền tố.'); return; }
    if (pricingCreateForm.purchase_limit && (Number(pricingCreateForm.purchase_limit) < 1 || Number(pricingCreateForm.purchase_limit) > 99)) { setPricingCreateError('Giới hạn mua phải nằm trong khoảng từ 1 đến 99 vé.'); return; }
    setPricingCreateError('');
    setPricingSaving(true);
    try {
      const res = await fetch(`${API_BASE}?action=ticket-pricing-policies`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ mode:'create', ...pricingCreateForm }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể tạo loại vé.');
      showSystemNotice(data.message || 'Đã tạo loại vé mới.'); setShowPricingCreate(false); await loadPricingPolicies(); await loadTicketTypes();
    } catch (error) { const message=error instanceof Error ? error.message : 'Không thể tạo loại vé.'; setPricingCreateError(message); setSystemNotice({ message, type:'error' }); }
    finally { setPricingSaving(false); }
  };

  const loadScreens = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=screens`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setScreensList(data.data);
      else setScreensList([]);
    } catch (e) {
      console.error('Error loading screens:', e);
      setScreensList([]);
    }
  };

  const loadPosStaff = async (search = posStaffSearch, status = posStaffStatus) => {
    if (!['cinema_admin','super_admin'].includes(currentUser?.role || '')) return;
    setPosStaffLoading(true);
    try {
      const params = new URLSearchParams({ action:'pos-staff' });
      if (search.trim()) params.set('q', search.trim());
      if (status !== 'all') params.set('status', status);
      const response = await fetch(`${API_BASE}?${params.toString()}`, { credentials:'include', cache:'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải nhân viên bán hàng.');
      const rows=Array.isArray(result.data) ? result.data : [];
      setPosStaff(rows);
      setPosStaffSummary(result.summary || { total:0, active:0, working:0, locked:0, inactive:0, cashiers:0, supervisors:0, today_orders:0, today_revenue:0 });
      if (!rows.some((item:PosStaffItem)=>Number(item.id)===Number(selectedPosStaffId))) setSelectedPosStaffId(Number(rows[0]?.id||0));
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể tải nhân viên bán hàng từ Aurora DB.', type:'error' }); }
    finally { setPosStaffLoading(false); }
  };

  const loadPosStaffDetail = async (staffId:number) => {
    if (!staffId) { setPosStaffDetail(null); return; }
    setPosStaffDetailLoading(true);
    try {
      const response=await fetch(`${API_BASE}?action=pos-staff-detail&id=${staffId}`,{credentials:'include',cache:'no-store'});
      const result=await response.json();
      if(!response.ok||!result.success||!result.data)throw new Error(result.message||'Không thể tải hồ sơ nhân viên.');
      setPosStaffDetail(result.data as PosStaffDetail);
    } catch(error){setPosStaffDetail(null);setSystemNotice({message:error instanceof Error?error.message:'Không thể tải hồ sơ nhân viên từ Aurora DB.',type:'error'});}
    finally{setPosStaffDetailLoading(false);}
  };

  const openPosStaffProfile=(staffId:number)=>{
    setSelectedPosStaffId(staffId); setShowPosStaffDetail(true); void loadPosStaffDetail(staffId);
  };

  const openPosStaffEditor = (staff?: PosStaffItem) => {
    setPosStaffForm(staff ? { id:staff.id, theater_id:staff.theater_id, full_name:staff.full_name, phone:staff.phone||'', role:staff.role, status:staff.status, password:'' } : { id:0, theater_id:Number(currentUser?.theater_id||0), full_name:'', phone:'', role:'cashier', status:'active', password:'88888888' });
    setShowPosStaffPassword(false);
    setShowPosStaffModal(true);
  };

  const savePosStaff = async (event: FormEvent) => {
    event.preventDefault(); setPosStaffSaving(true);
    try {
      const employeeCode=posStaffForm.phone.trim();
      const response = await fetch(`${API_BASE}?action=pos-staff`, { method:posStaffForm.id?'PUT':'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...posStaffForm,employee_code:employeeCode,username:employeeCode}) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu nhân viên bán hàng.');
      setShowPosStaffModal(false); showSystemNotice(result.message); await loadPosStaff(); if(posStaffForm.id)await loadPosStaffDetail(posStaffForm.id);
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể lưu nhân viên bán hàng.', type:'error' }); }
    finally { setPosStaffSaving(false); }
  };

  const deactivatePosStaff = (staff: PosStaffItem) => requestSystemConfirmation(
    `Ngưng tài khoản POS của ${staff.full_name}? Lịch sử phiên và đơn hàng vẫn được giữ lại.`,
    async () => {
      try {
        const response = await fetch(`${API_BASE}?action=pos-staff&id=${staff.id}&theater_id=${staff.theater_id}`, { method:'DELETE', credentials:'include' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể ngưng nhân viên.');
        showSystemNotice(result.message); await loadPosStaff(); if(selectedPosStaffId===staff.id)setPosStaffDetail(null);
      } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể ngưng nhân viên.', type:'error' }); }
    }, 'Ngưng tài khoản', 'Xác nhận ngưng nhân viên'
  );

  const changePosStaffStatus=async(staff:PosStaffItem,status:'active'|'locked')=>{
    try{
      const response = await fetch(`${API_BASE}?action=pos-staff`,{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({...staff,status,password:'',employee_code:staff.phone,username:staff.phone})});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Không thể cập nhật trạng thái tài khoản.');
      showSystemNotice(status==='active'?'Đã mở khóa tài khoản POS.':'Đã khóa quyền đăng nhập POS.');
      await loadPosStaff(); await loadPosStaffDetail(staff.id);
    }catch(error){setSystemNotice({message:error instanceof Error?error.message:'Không thể cập nhật trạng thái tài khoản.',type:'error'});}
  };

  const loadPosSessions = async (date = posSessionDate, status = posSessionStatus, view = posSessionView) => {
    if (!['cinema_admin','super_admin','supervisor'].includes(currentUser?.role || '')) return;
    setPosSessionsLoading(true);
    try {
      const params = new URLSearchParams({ action:'pos-sessions', date, view });
      if (status !== 'all') params.set('status',status);
      const response = await fetch(`${API_BASE}?${params.toString()}`, { credentials:'include', cache:'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải phiên bán hàng.');
      setPosSessions(Array.isArray(result.data)?result.data:[]);
      // The session endpoint is the authoritative availability list: it is
      // already scoped to the selected cinema and excludes nothing incorrectly.
      if(Array.isArray(result.available_staff)) setPosStaff(result.available_staff);
      setPosSessionSummary(result.summary || { total:0,active:0,paused:0,closed:0,order_count:0,total_revenue:0,cash_difference:0 });
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể tải phiên bán hàng từ Aurora DB.', type:'error' }); }
    finally { setPosSessionsLoading(false); }
  };

  const openPosSessionReport = async (session: PosSessionItem) => {
    setPosReportSession(session); setPosSessionReport(null); setPosSessionReportLoading(true);
    try {
      const params = new URLSearchParams({ action:'pos-session-report', id:String(session.id), theater_id:String(session.theater_id) });
      const response = await fetch(`${API_BASE}?${params.toString()}`, { credentials:'include', cache:'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lập báo cáo doanh thu phiên.');
      setPosSessionReport(result.data);
    } catch (error) {
      setSystemNotice({ message:error instanceof Error?error.message:'Không thể tải báo cáo doanh thu từ Aurora DB.', type:'error' });
      setPosReportSession(null);
    } finally { setPosSessionReportLoading(false); }
  };

  const exportPosSessionReportPdf = () => {
    if (!posSessionReport || !posReportSession) return;
    const escape = (value: unknown) => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char] || char));
    const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
    const report = posSessionReport;
    const groupRows = Object.values(report.groups || {}) as any[];
    const lineRows = groupRows.flatMap(group => (group.items || []).map((item: any) => `<tr><td>${escape(group.label)}</td><td><b>${escape(item.name)}</b><br><small>${escape(item.code)}</small></td><td class="right">${item.quantity}</td><td class="right">${money(item.unit_price)}</td><td class="right"><b>${money(item.revenue)}</b></td></tr>`)).join('') || '<tr><td colspan="5" class="empty">Chưa phát sinh chi tiết bán hàng.</td></tr>';
    const orderRows = (report.orders || []).map((order: any) => `<tr><td><b>${escape(order.order_code)}</b><br><small>${escape(formatPosDateTime(order.created_at))}</small></td><td>${escape(order.item_summary || '—')}</td><td class="right">${order.item_quantity}</td><td>${escape(order.payment_method)}</td><td class="right">${money(order.discount_amount)}</td><td class="right"><b>${money(order.total_amount)}</b></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Chưa phát sinh đơn hàng.</td></tr>';
    const paymentRows = (report.payments || []).map((payment: any) => `<tr><td>${escape(payment.method==='CASH'?'Tiền mặt':payment.method==='CARD'?'Thẻ':'Chuyển khoản')}</td><td class="right">${payment.order_count}</td><td class="right"><b>${money(payment.revenue)}</b></td></tr>`).join('') || '<tr><td colspan="3" class="empty">Chưa có thanh toán.</td></tr>';
    const groupCards = groupRows.map(group => `<div class="metric"><small>${escape(group.label)}</small><b>${group.quantity}</b><span>${money(group.revenue)}</span></div>`).join('');
    const fileTitle = `Bao-cao-doanh-thu-PS-${String(posReportSession.id).padStart(5,'0')}`;
    const popup = window.open('', '_blank', 'noopener,noreferrer');
    if (!popup) { setSystemNotice({ message:'Trình duyệt đang chặn cửa sổ xuất PDF. Hãy cho phép pop-up và thử lại.', type:'error' }); return; }
    popup.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${fileTitle}</title><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,'Segoe UI',sans-serif;color:#1b2f49;font-size:11px;margin:0}.head{padding:18px 20px;color:#fff;background:linear-gradient(120deg,#102e55,#286fc1)}.head h1{margin:4px 0;font-size:23px}.head p{margin:0;color:#d8e9ff}.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:13px 0}.meta div,.metric{padding:10px;border:1px solid #d9e4ef;border-radius:7px;background:#f8fbff}.meta small,.metric small{display:block;color:#71839a;text-transform:uppercase;font-size:8px;font-weight:bold}.meta b{display:block;margin-top:4px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0}.metric b{display:block;margin:5px 0 2px;color:#165295;font-size:18px}.metric span{color:#57708e;font-weight:bold}h2{margin:15px 0 7px;color:#1d4e85;font-size:14px;border-bottom:2px solid #e2ad32;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin-bottom:11px}th{padding:7px;background:#173e70;color:#fff;font-size:9px;text-align:left}td{padding:7px;border-bottom:1px solid #dfe7ef;vertical-align:top}small{color:#718196}.right{text-align:right}.split{display:grid;grid-template-columns:1fr 1fr;gap:14px}.note{margin-top:12px;padding-top:7px;border-top:1px solid #dce5ee;color:#73849a;font-size:9px}.empty{text-align:center;color:#8c9aab;padding:14px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.no-print{display:none}}</style></head><body><section class="head"><small>AURORA CINEMA · AURORA_DB</small><h1>BÁO CÁO DOANH THU PHIÊN ${escape(`PS-${String(posReportSession.id).padStart(5,'0')}`)}</h1><p>Ngày xuất: ${escape(formatPosDateTime(report.generated_at))}</p></section><section class="meta"><div><small>Nhân viên</small><b>${escape(report.shift.full_name)}</b></div><div><small>Rạp / quầy</small><b>${escape(report.shift.theater_name)} · ${escape(report.shift.counter)}</b></div><div><small>Mở phiên</small><b>${escape(formatPosDateTime(report.shift.opened_at))}</b></div><div><small>Đóng phiên</small><b>${escape(formatPosDateTime(report.shift.closed_at))}</b></div></section><section class="metrics"><div class="metric"><small>Doanh thu gộp</small><b>${money(report.summary.gross_revenue)}</b><span>${report.summary.total_quantity} sản phẩm</span></div><div class="metric"><small>Giảm giá / CTKM</small><b>${money(report.summary.promotion_discount)}</b><span>${report.promotion.order_count} đơn áp dụng</span></div><div class="metric"><small>Doanh thu thuần</small><b>${money(report.summary.total_revenue)}</b><span>${report.summary.order_count} đơn thanh toán</span></div><div class="metric"><small>Đối soát tiền mặt</small><b>${money(report.reconciliation.cash_at_close ?? 0)}</b><span>Dự kiến ${money(report.reconciliation.expected_cash)}</span></div></section><h2>1. Doanh thu theo nhóm hàng</h2><section class="metrics">${groupCards}</section><h2>2. Chi tiết vé, combo, F&B và hàng hóa</h2><table><thead><tr><th>Nhóm</th><th>Sản phẩm / vé</th><th class="right">SL</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead><tbody>${lineRows}</tbody></table><section class="split"><div><h2>3. Phương thức thanh toán</h2><table><thead><tr><th>Phương thức</th><th class="right">Số đơn</th><th class="right">Doanh thu</th></tr></thead><tbody>${paymentRows}</tbody></table></div><div><h2>4. Đối soát phiên</h2><table><tbody><tr><td>Tiền đầu phiên</td><td class="right"><b>${money(report.reconciliation.initial_cash)}</b></td></tr><tr><td>Thu tiền mặt</td><td class="right"><b>${money(report.reconciliation.cash_revenue)}</b></td></tr><tr><td>Quỹ dự kiến</td><td class="right"><b>${money(report.reconciliation.expected_cash)}</b></td></tr><tr><td>Tiền thực tế</td><td class="right"><b>${report.reconciliation.cash_at_close===null?'Chưa chốt':money(report.reconciliation.cash_at_close)}</b></td></tr><tr><td>Chênh lệch</td><td class="right"><b>${report.reconciliation.cash_difference===null?'—':money(report.reconciliation.cash_difference)}</b></td></tr></tbody></table></div></section><h2>5. Danh sách đơn hàng</h2><table><thead><tr><th>Mã đơn / thời gian</th><th>Nội dung bán</th><th class="right">SL</th><th>Thanh toán</th><th class="right">Giảm giá</th><th class="right">Tổng tiền</th></tr></thead><tbody>${orderRows}</tbody></table><p class="note">Báo cáo được tổng hợp trực tiếp từ đơn hàng và chi tiết đơn trong Aurora DB. Dữ liệu chỉ bao gồm các đơn đã thanh toán thuộc phiên này.</p><script>window.onload=()=>window.print();</script></body></html>`);
    popup.document.close();
  };

  const loadPosCounters = async (theaterId: number) => {
    if (!theaterId) { setPosCounters([]); return; }
    try {
      const response = await fetch(`${API_BASE}?action=pos-counters&theater_id=${theaterId}`, { credentials:'include', cache:'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải quầy bán của rạp.');
      const counters = Array.isArray(result.data) ? result.data as PosCounterItem[] : [];
      setPosCounters(counters);
      setPosSessionForm(current => current.theater_id === theaterId && !current.counter
        ? { ...current, counter: counters.find(counter => counter.status === 'active' && !counter.open_shift_id)?.counter_code || '' }
        : current);
    } catch (error) { setPosCounters([]); setSystemNotice({ message:error instanceof Error ? error.message : 'Không thể tải quầy bán từ Aurora DB.', type:'error' }); }
  };

  const loadPosWorkSchedules = async (date = posSessionDate, status = posWorkScheduleStatus) => {
    if (!['cinema_admin','super_admin'].includes(currentUser?.role || '')) return;
    setPosWorkScheduleLoading(true);
    try {
      const params=new URLSearchParams({action:'pos-work-schedules',date});
      if(status!=='all')params.set('status',status);
      const response=await fetch(`${API_BASE}?${params.toString()}`,{credentials:'include',cache:'no-store'});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Không thể tải kế hoạch ca làm việc.');
      setPosWorkSchedules(Array.isArray(result.data)?result.data:[]);
      setPosWorkScheduleSummary(result.summary||{total:0,scheduled:0,confirmed:0,active:0,completed:0,cancelled:0});
    }catch(error){setSystemNotice({message:error instanceof Error?error.message:'Không thể tải kế hoạch ca từ Aurora DB.',type:'error'});}
    finally{setPosWorkScheduleLoading(false);}
  };

  const openPosWorkScheduleEditor=(schedule?:PosWorkScheduleItem)=>{
    const first=posStaff.find(item=>item.status==='active');
    setPosWorkScheduleForm(schedule?{
      id:schedule.id,user_id:schedule.user_id,theater_id:schedule.theater_id,work_date:schedule.work_date,
      start_time:schedule.start_time.slice(0,5),end_time:schedule.end_time.slice(0,5),sales_areas:schedule.sales_areas,
      counter:schedule.counter,initial_cash:Number(schedule.initial_cash),notes:schedule.notes||''
    }:{id:0,user_id:first?.id||0,theater_id:first?.theater_id||Number(currentUser?.theater_id||0),work_date:posSessionDate,start_time:'08:00',end_time:'16:00',sales_areas:['box_ticket'],counter:'QUAY-01',initial_cash:500000,notes:''});
    setShowPosWorkScheduleModal(true);
  };

  const savePosWorkSchedule=async(event:FormEvent)=>{
    event.preventDefault();setPosWorkScheduleSaving(true);
    try{
      const response=await fetch(`${API_BASE}?action=pos-work-schedules`,{method:posWorkScheduleForm.id?'PUT':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(posWorkScheduleForm)});
      const result=await response.json();
      if(!response.ok||!result.success)throw new Error(result.message||'Không thể lưu ca làm việc.');
      setShowPosWorkScheduleModal(false);showSystemNotice(result.message);await loadPosWorkSchedules(posSessionDate,posWorkScheduleStatus);
    }catch(error){setSystemNotice({message:error instanceof Error?error.message:'Không thể lưu ca làm việc.',type:'error'});}
    finally{setPosWorkScheduleSaving(false);}
  };

  const cancelPosWorkSchedule=(schedule:PosWorkScheduleItem)=>requestSystemConfirmation(`Hủy ca ${schedule.start_time.slice(0,5)}–${schedule.end_time.slice(0,5)} của ${schedule.full_name}? Lịch sử phân công vẫn được giữ trong Aurora DB.`,async()=>{
    try{
      const response=await fetch(`${API_BASE}?action=pos-work-schedules&id=${schedule.id}`,{method:'DELETE',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:schedule.id,theater_id:schedule.theater_id})});
      const result=await response.json();if(!response.ok||!result.success)throw new Error(result.message||'Không thể hủy ca làm việc.');
      showSystemNotice(result.message);await loadPosWorkSchedules(posSessionDate,posWorkScheduleStatus);
    }catch(error){setSystemNotice({message:error instanceof Error?error.message:'Không thể hủy ca làm việc.',type:'error'});}
  },'Hủy ca','Xác nhận hủy ca làm việc');

  const openSessionFromSchedule=(schedule:PosWorkScheduleItem)=>{
    setPosSessionForm({work_schedule_id:schedule.id,user_id:schedule.user_id,theater_id:schedule.theater_id,initial_cash:Number(schedule.initial_cash),counter:schedule.counter,sales_areas:schedule.sales_areas,notes:schedule.notes||''});
    setShowPosSessionModal(true);
  };

  const savePosSession = async (event: FormEvent) => {
    event.preventDefault(); setPosSessionSaving(true);
    try {
      const response = await fetch(`${API_BASE}?action=pos-sessions`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ operation:'open', ...posSessionForm }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể mở phiên bán hàng.');
      setShowPosSessionModal(false); showSystemNotice(result.message); await Promise.all([loadPosSessions(),loadPosStaff(),loadPosWorkSchedules()]);
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể mở phiên bán hàng.', type:'error' }); }
    finally { setPosSessionSaving(false); }
  };

  const updatePosSession = async (session: PosSessionItem, operation: 'pause'|'resume') => {
    try {
      const response = await fetch(`${API_BASE}?action=pos-sessions`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:session.id, theater_id:session.theater_id, operation }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật phiên.');
      showSystemNotice(result.message); await Promise.all([loadPosSessions(),loadPosStaff(),loadPosWorkSchedules()]);
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể cập nhật phiên bán hàng.', type:'error' }); }
  };

  const openClosePosSession = (session: PosSessionItem) => {
    setClosingPosSession(session); setPosCloseForm({ cash_at_close:Number(session.expected_cash||0), close_note:'' });
  };

  const closePosSession = async (event: FormEvent) => {
    event.preventDefault(); if (!closingPosSession) return; setPosSessionSaving(true);
    try {
      const response = await fetch(`${API_BASE}?action=pos-sessions`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:closingPosSession.id, theater_id:closingPosSession.theater_id, operation:'close', ...posCloseForm }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể đóng phiên.');
      setClosingPosSession(null); showSystemNotice(`${result.message} Chênh lệch: ${formatMoney(Number(result.data?.cash_difference||0))}.`); await Promise.all([loadPosSessions(),loadPosStaff(),loadPosWorkSchedules()]);
    } catch (error) { setSystemNotice({ message:error instanceof Error?error.message:'Không thể đóng phiên bán hàng.', type:'error' }); }
    finally { setPosSessionSaving(false); }
  };

  const loadRoomSeatMap = async (screenId: number, date = roomScheduleDate, showtimeId = 0) => {
    if (screenId <= 0) return;
    setRoomSeatMapLoading(true);
    try {
      const params = new URLSearchParams({ action: 'screen-seat-map', screen_id: String(screenId), date });
      if (showtimeId > 0) params.set('showtime_id', String(showtimeId));
      const response = await fetch(`${API_BASE}?${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Không thể tải sơ đồ ghế.');
      const data = result.data as RoomSeatMapData;
      setRoomSeatMap(data);
      setRoomShowtimeId(Number(data.selected_showtime?.id || 0));
      setSelectedRoomSeatIds([]);
    } catch (error) {
      setRoomSeatMap(null);
      setRoomShowtimeId(0);
      setSelectedRoomSeatIds([]);
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể tải dữ liệu phòng chiếu từ Aurora DB.', type: 'error' });
    } finally {
      setRoomSeatMapLoading(false);
    }
  };

  const selectRoomForSeatMap = (screenId: number) => {
    const preparationScreen = screenPreparation?.screens?.find((screen: any) => Number(screen.id) === Number(screenId));
    setRoomScreenId(screenId);
    setRoomShowtimeId(0);
    setSelectedRoomSeatIds([]);
    setScreenReadinessForm(preparationScreen ? screenReadinessFromRecord(preparationScreen) : { ...EMPTY_SCREEN_READINESS });
    setScreenPreparationNote(preparationScreen?.note || '');
    void loadRoomSeatMap(screenId, roomScheduleDate);
  };

  const selectRoomShowtime = (showtimeId: number) => {
    setRoomShowtimeId(showtimeId);
    setSelectedRoomSeatIds([]);
    void loadRoomSeatMap(roomScreenId, roomScheduleDate, showtimeId);
  };

  const toggleRoomSeat = (seat: RoomSeat) => {
    if (seat.seat_status === 'booked' || seat.seat_status === 'held') return;
    let selectionGroup: RoomSeat[] = [seat];
    if (seat.seat_type === 'COUPLE') {
      const coupleRow = (roomSeatMap?.seats || [])
        .filter(item => item.seat_type === 'COUPLE' && item.seat_row === seat.seat_row)
        .sort((left,right)=>Number(left.seat_number)-Number(right.seat_number));
      const seatIndex = coupleRow.findIndex(item=>Number(item.id)===Number(seat.id));
      const pairStart = Math.floor(Math.max(0,seatIndex)/2)*2;
      selectionGroup = coupleRow.slice(pairStart,pairStart+2);
    }
    if (selectionGroup.some(item => item.seat_status === 'booked' || item.seat_status === 'held')) {
      setSystemNotice({ message: 'Không thể chọn ghế đôi vì một vị trí trong cặp đã được đặt hoặc đang được khách giữ.', type: 'warning' });
      return;
    }
    const selectedSeats = (roomSeatMap?.seats || []).filter(item => selectedRoomSeatIds.includes(Number(item.id)));
    const groupIds = selectionGroup.map(item=>Number(item.id));
    if (selectedSeats.length && selectedSeats[0].seat_status !== selectionGroup[0].seat_status && !groupIds.some(id=>selectedRoomSeatIds.includes(id))) {
      setSystemNotice({ message: 'Hãy xử lý riêng nhóm ghế đang khóa và nhóm ghế còn trống.', type: 'warning' });
      return;
    }
    setSelectedRoomSeatIds(current => groupIds.some(id=>current.includes(id)) ? current.filter(id=>!groupIds.includes(id)) : Array.from(new Set([...current,...groupIds])));
  };

  const saveRoomSeatLocks = async (mode: 'lock'|'unlock') => {
    if (!roomShowtimeId || !selectedRoomSeatIds.length) return;
    setSeatLockSaving(true);
    try {
      const response = await fetch(`${API_BASE}?action=screen-seat-map`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || '' },
        body: JSON.stringify({ showtime_id: roomShowtimeId, seat_ids: selectedRoomSeatIds, mode, reason: seatLockReason.trim() })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật trạng thái ghế.');
      setSystemNotice({ message: result.message, type: 'success' });
      setSeatLockReason('');
      await loadRoomSeatMap(roomScreenId, roomScheduleDate, roomShowtimeId);
    } catch (error) {
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể ghi trạng thái ghế vào Aurora DB.', type: 'error' });
    } finally {
      setSeatLockSaving(false);
    }
  };

  const loadScreenPreparation = async (allocationId: number) => {
    setScreenPreparationLoading(true);
    try {
      const response = await fetch(`${API_BASE}?action=movie-plan-screen-preparation&allocation_id=${allocationId}`, { credentials: 'include', headers: { 'X-TMS-User': currentUser?.username || 'admin_rap' } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải dữ liệu chuẩn bị phòng chiếu.');
      setScreenPreparation(result.data);
      const activeScreen = result.data?.screens?.find((screen: any) => Number(screen.id) === Number(roomScreenId));
      if (activeScreen) {
        setScreenReadinessForm(screenReadinessFromRecord(activeScreen));
        setScreenPreparationNote(activeScreen.note || '');
      }
    } catch (error) { setScreenPreparation(null); setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể tải dữ liệu chuẩn bị phòng.', type: 'error' }); }
    finally { setScreenPreparationLoading(false); }
  };

  const prepareScreenForAllocation = async (screenId: number) => {
    if (!screenPreparation?.allocation?.id) return;
    setScreenPreparationSaving(true);
    try {
      const response = await fetch(`${API_BASE}?action=movie-plan-screen-preparation`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' }, body: JSON.stringify({ allocation_id: screenPreparation.allocation.id, screen_id: screenId, note: screenPreparationNote, ...screenReadinessForm }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu biên bản kiểm tra phòng.');
      showSystemNotice(result.message); await loadScreenPreparation(screenPreparation.allocation.id);
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể cập nhật kiểm tra kỹ thuật phòng.', type: 'error' }); }
    finally { setScreenPreparationSaving(false); }
  };

  const loadTheaters = async (notifyOnError = false): Promise<TheaterItem[]> => {
    setTheatersLoading(true);
    setTheatersError('');
    try {
      const res = await fetch(`${API_BASE}?action=theaters`, { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.data)) throw new Error(data.message || 'Không thể tải danh sách cụm rạp từ Aurora DB.');
      const theaters = data.data.map((theater: TheaterItem) => ({ ...theater, id: Number(theater.id) }));
      setTheatersList(theaters);
      return theaters;
    } catch (e) {
      console.error('Error loading theaters:', e);
      const message = e instanceof Error ? e.message : 'Không thể kết nối Aurora DB để tải danh sách cụm rạp.';
      setTheatersList([]);
      setTheatersError(message);
      if (notifyOnError) setSystemNotice({ message, type: 'error' });
      return [];
    } finally {
      setTheatersLoading(false);
    }
  };

  const loadCinemaSystemOverview = async (theaterId = selectedCinemaId, date = cinemaSystemDate) => {
    setCinemaSystemLoading(true);
    setCinemaSystemError('');
    try {
      const params = new URLSearchParams({ action:'cinema-system-overview', date });
      if (theaterId > 0) params.set('theater_id', String(theaterId));
      const response = await fetch(`${API_BASE}?${params.toString()}`, { credentials:'include', cache:'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Không thể tải dữ liệu hệ thống rạp.');
      setCinemaSystemData(result.data as CinemaSystemOverview);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tải dữ liệu hệ thống rạp từ Aurora DB.';
      setCinemaSystemError(message);
      setCinemaSystemData(null);
    } finally { setCinemaSystemLoading(false); }
  };

  const selectCinemaSystemTheater = (theaterId: number) => {
    setSelectedCinemaId(theaterId);
    setRoomScreenId(0); setRoomShowtimeId(0); setRoomSeatMap(null); setSelectedRoomSeatIds([]);
    void loadCinemaSystemOverview(theaterId, cinemaSystemDate);
  };

  const openAllocationModal = async (plan: MoviePlan) => {
    setAllocationTargetPlan(plan);
    setAllocMinScreenings(plan.target_screenings_per_day);
    setShowAllocationModal(true);
    const allocatedIds = new Set((plan.allocations || []).map(allocation => Number(allocation.theater_id)));
    setAllocSelectedTheaters(theatersList.map(theater => Number(theater.id)).filter(id => !allocatedIds.has(id)));
    const theaters = await loadTheaters(true);
    setAllocSelectedTheaters(theaters.map(theater => Number(theater.id)).filter(id => !allocatedIds.has(id)));
  };

  useEffect(() => {
    if (isLoggedIn && currentUser) {
      if (currentUser.role === 'super_admin') { void loadUsers(); void loadRbacMatrix(); }
      loadMoviePlans();
      loadMovieAllocations();
      loadMovies();
      loadScheduleMovies();
      loadTheaters();
      loadTicketTypes();
      loadPricingPolicies();
      loadScreens();
    }
  }, [isLoggedIn, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!isLoggedIn || !['cinema_admin','super_admin'].includes(currentUser?.role || '') || !['staff','NV bán hàng','Nhân viên rạp'].includes(active)) return;
    const timer=window.setTimeout(()=>{ void loadPosStaff(posStaffSearch,posStaffStatus); },posStaffSearch?250:0);
    return()=>window.clearTimeout(timer);
  },[isLoggedIn,currentUser?.id,currentUser?.role,active,posStaffSearch,posStaffStatus]);

  useEffect(() => {
    if (!isLoggedIn || !['cinema_admin','super_admin','supervisor'].includes(currentUser?.role || '') || !['Phiên bán hàng','Phiên làm việc','shifts'].includes(active)) return;
    void loadPosSessions(posSessionDate,posSessionStatus,posSessionView);
    if(currentUser?.role!=='supervisor')void loadPosWorkSchedules(posSessionDate,posWorkScheduleStatus);
    if (currentUser?.role!=='supervisor'&&!posStaff.length) void loadPosStaff('','active');
  },[isLoggedIn,currentUser?.id,currentUser?.role,active,posSessionDate,posSessionStatus,posSessionView,posWorkScheduleStatus]);

  useEffect(() => {
    if (isLoggedIn && currentUser?.role === 'super_admin' && (active === 'cinemas' || active === 'Hệ thống rạp')) {
      void loadCinemaSystemOverview(selectedCinemaId, cinemaSystemDate);
    }
  }, [active, isLoggedIn, currentUser?.id]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const timer = window.setTimeout(() => { void loadSchedules(); }, scheduleSearch ? 280 : 0);
    return () => window.clearTimeout(timer);
  }, [isLoggedIn, currentUser?.id, currentUser?.role, scheduleView, schedulePage, scheduleDateFilter, scheduleStatusFilter, scheduleTheaterFilter, scheduleSearch, scheduleMovieId]);

  useEffect(() => {
    if (isLoggedIn) {
      loadDashboard(reportDate);
      if (currentUser?.role === 'cinema_admin') loadCinemaScheduleBoard(reportDate);
    }
  }, [isLoggedIn, reportDate, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (isLoggedIn && active === 'dashboard') setReportDate(localIsoDate());
  }, [isLoggedIn, active, currentUser?.id]);

  useEffect(() => {
    setSelectedScheduleIds([]);
  }, [active, currentUser?.id]);

  // Handle plan month change
  const handleSelectPlanMonth = (m: number) => {
    setPlanMonth(m);
    loadMoviePlans(m, planYear);
  };

  // CRUD FOR MOVIE PLANS (Admin Tổng)
  const handleSavePlan = async (e: FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') {
      alert('Chỉ Admin Tổng mới có đặc quyền lập kế hoạch phim!');
      return;
    }
    if (planForm.status === 'published' && planForm.selected_theaters.length === 0) {
      alert('Vui lòng chọn ít nhất một rạp trước khi ban hành kế hoạch.');
      return;
    }
    try {
      const url = planForm.id > 0 ? `${API_BASE}?action=movie-plans&id=${planForm.id}` : `${API_BASE}?action=movie-plans`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify({
          ...planForm,
          theaters: planForm.selected_theaters
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(planForm.status === 'published'
          ? (planForm.id > 0 ? 'Đã cập nhật và ban hành kế hoạch phim!' : 'Đã ban hành kế hoạch phim và gửi đến các rạp đã chọn!')
          : (planForm.id > 0 ? 'Đã cập nhật bản nháp kế hoạch phim!' : 'Đã lưu bản nháp kế hoạch phim!'));
        setShowPlanModal(false);
        loadMoviePlans(planForm.plan_month, planForm.plan_year);
        loadMovieAllocations();
      } else {
        alert(data.message || 'Lỗi khi lưu kế hoạch phim');
      }
    } catch (err) {
      alert('Lỗi kết nối cơ sở dữ liệu.');
    }
  };

  const handleDeletePlan = async (id: number) => {
    if (currentUser?.role !== 'super_admin') {
      alert('Chỉ Admin Tổng mới có quyền xóa kế hoạch phim!');
      return;
    }
    requestSystemConfirmation('Kế hoạch phim và các phân bổ rạp liên quan sẽ bị xóa. Hành động này không thể hoàn tác.', async () => {
      try {
      const res = await fetch(`${API_BASE}?action=movie-plans&id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' }
      });
      const data = await res.json();
      if (data.success) {
        alert('Đã xóa kế hoạch phim!');
        loadMoviePlans();
        loadMovieAllocations();
      } else {
        alert(data.message);
      }
      } catch {
        alert('Lỗi kết nối máy chủ.');
      }
    }, 'Xóa kế hoạch');
  };

  const handleUpdatePlanStatus = async (planId: number, newStatus: string) => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      const response = await fetch(`${API_BASE}?action=movie-plans&id=${planId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify({ status: newStatus })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật trạng thái kế hoạch.');
      loadMoviePlans();
      loadMovieAllocations();
    } catch (error) {
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái kế hoạch.', type: 'error' });
      loadMoviePlans();
    }
  };

  // ALLOCATION HANDLER (Admin Tổng phân bổ cho 5 rạp TPHCM)
  const handleExecuteAllocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!allocationTargetPlan) return;
    if (allocationTargetPlan.status !== 'published') {
      setSystemNotice({ message: 'Chỉ kế hoạch đã ban hành mới được phân bổ cho Admin Rạp.', type: 'warning' });
      return;
    }
    if (!allocSelectedTheaters.length) {
      setSystemNotice({ message: 'Vui lòng chọn ít nhất một cụm rạp để phân bổ.', type: 'warning' });
      return;
    }
    const theaterIds = new Set(theatersList.map(theater => Number(theater.id)));
    const validSelectedTheaters = allocSelectedTheaters.filter(id => theaterIds.has(Number(id)));
    if (validSelectedTheaters.length !== allocSelectedTheaters.length) {
      setSystemNotice({ message: 'Danh sách cụm rạp đã thay đổi. Vui lòng tải lại và chọn lại rạp từ Aurora DB.', type: 'warning' });
      return;
    }
    try {
      for (const tId of validSelectedTheaters) {
        const theater = theatersList.find(t => Number(t.id) === Number(tId));
        if (!theater) throw new Error('Cụm rạp được chọn không còn tồn tại trong Aurora DB.');
        const response = await fetch(`${API_BASE}?action=movie-allocations`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
          body: JSON.stringify({
            plan_id: allocationTargetPlan.id,
            movie_id: allocationTargetPlan.movie_id,
            movie_title: allocationTargetPlan.movie_title,
            theater_id: tId,
            theater_name: theater.name,
            min_screenings_per_day: allocMinScreenings,
            preferred_screen_types: allocationTargetPlan.format || 'Standard / IMAX',
            allocated_start_date: allocationTargetPlan.expected_start_date,
            allocated_end_date: allocationTargetPlan.expected_end_date,
            status: 'pending'
          })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể ghi phân bổ vào Aurora DB.');
      }
      setSystemNotice({ message: `Đã gửi kế hoạch phim đến ${validSelectedTheaters.length} cụm rạp. Admin Rạp có thể tiếp nhận và triển khai lịch chiếu.`, type: 'success' });
      setShowAllocationModal(false);
      loadMoviePlans();
      loadMovieAllocations();
    } catch (error) {
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể phân bổ phim cho rạp.', type: 'error' });
    }
  };

  // CONFIRM ALLOCATION (Admin Rạp bấm xác nhận)
  const handleConfirmAllocation = async (allocationId: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=movie-allocations&id=${allocationId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Admin Rạp đã xác nhận tiếp nhận kế hoạch phim thành công!');
        loadMovieAllocations();
        loadMoviePlans();
        loadScheduleMovies();
      } else {
        alert(data.message);
      }
    } catch {
      alert('Lỗi xác nhận kế hoạch.');
    }
  };

  const handleViewDeploymentDetail = async (allocationId: number) => {
    setShowDeploymentDetailModal(true);
    setDeploymentDetail(null);
    setDeploymentDetailLoading(true);
    try {
      const response = await fetch(`${API_BASE}?action=movie-plan-detail&allocation_id=${allocationId}`, { credentials: 'include', headers: { 'X-TMS-User': currentUser?.username || 'admin_rap' } });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải chi tiết kế hoạch triển khai.');
      setDeploymentDetail(result.data);
    } catch (error) {
      setShowDeploymentDetailModal(false);
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể tải chi tiết kế hoạch triển khai.', type: 'error' });
    } finally {
      setDeploymentDetailLoading(false);
    }
  };

  const handleDeploymentTaskAction = async (task: any) => {
    if (!deploymentDetail?.plan) return;
    try {
      // The briefing is an actual operation: persist it before opening the
      // staff workspace. Every other task is re-evaluated from Aurora DB when
      // the related room/schedule workspace saves its data.
      if (task.task_key === 'brief_team') {
        const response = await fetch(`${API_BASE}?action=movie-plan-action`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' },
          body: JSON.stringify({ allocation_id: deploymentDetail.plan.id, task_key: 'brief_team' })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể gửi thông báo vận hành.');
        showSystemNotice(result.message);
      }
      if (task.action_view) {
        if (task.task_key === 'prepare_screens') await loadScreenPreparation(deploymentDetail.plan.id);
        setActive(task.action_view);
        setShowDeploymentDetailModal(false);
      } else {
        await handleViewDeploymentDetail(deploymentDetail.plan.id);
      }
    } catch (error) {
      setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể thực hiện công việc triển khai.', type: 'error' });
    }
  };

  const handleMovieMediaSelection = (key: 'poster' | 'banner' | 'trailer', file: File | null) => {
    if (!file) {
      setMovieFiles(prev => ({ ...prev, [key]: null }));
      setMovieMediaPreviews(prev => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return { ...prev, [key]: '' };
      });
      setMovieFormError('');
      return;
    }

    const maxSize = key === 'trailer' ? 250 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeLabel = key === 'trailer' ? '250MB' : '15MB';
      setMovieFormError(`Tệp ${key === 'poster' ? 'poster' : key === 'banner' ? 'banner' : 'trailer'} vượt quá kích thước cho phép (${sizeLabel}). Hãy chọn file nhỏ hơn ${sizeLabel}.`);
      setMovieFiles(prev => ({ ...prev, [key]: null }));
      setMovieMediaPreviews(prev => {
        if (prev[key]) URL.revokeObjectURL(prev[key]);
        return { ...prev, [key]: '' };
      });
      return;
    }

    setMovieFiles(prev => ({ ...prev, [key]: file }));
    setMovieMediaPreviews(prev => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      return { ...prev, [key]: URL.createObjectURL(file) };
    });
    setMovieFormError('');
  };

  const uploadMovieMediaInChunks = async (key: 'poster' | 'banner' | 'trailer', file: File) => {
    const chunkSize = 1024 * 1024;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = `movie_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    let uploadedUrl = '';
    for (let index = 0; index < totalChunks; index++) {
      const data = new FormData();
      data.append('kind', key);
      data.append('upload_id', uploadId);
      data.append('chunk_index', String(index));
      data.append('chunk_total', String(totalChunks));
      data.append('file_size', String(file.size));
      data.append('chunk', file.slice(index * chunkSize, Math.min((index + 1) * chunkSize, file.size)), file.name);
      const response = await fetch(`${API_BASE}?action=movie-media-chunk`, { method: 'POST', credentials: 'include', headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' }, body: data });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || `Không thể tải ${key} lên.`);
      if (result.data?.url) uploadedUrl = result.data.url;
      setMovieFormError(`Đang tải ${key === 'poster' ? 'poster' : key === 'banner' ? 'banner' : 'trailer'}: ${Math.round(((index + 1) / totalChunks) * 100)}%`);
    }
    if (!uploadedUrl) throw new Error(`Không thể hoàn tất tải ${key} lên.`);
    return uploadedUrl;
  };

  const handleMovieImport = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
      const cell = (row: Record<string, unknown>, keys: string[]) => { for (const key of keys) if (row[key] !== undefined && String(row[key]).trim() !== '') return row[key]; return ''; };
      const headerFor = (row: Record<string, unknown>, keys: string[]) => keys.find(key => row[key] !== undefined) || keys[0];
      const excelDate = (value: unknown) => { if (typeof value === 'number' && value > 20000) return XLSX.SSF.format('yyyy-mm-dd', value); const text = String(value || '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : (text || '1970-01-01'); };
      const fields: Record<string, string[]> = {
        movie_code: ['movie_code', 'Mã phim', 'Mã Phim'], title: ['title', 'Tên phim', 'Tên Phim', 'Tên phim*'], original_title: ['original_title', 'Tên phim gốc'],
        genre: ['genre', 'Thể loại'], duration_minutes: ['duration_minutes', 'Thời lượng', 'Thời lượng (phút)', 'Thời lượng phim', 'Duration'], age_rating: ['age_rating', 'Độ tuổi', 'Phân loại độ tuổi'],
        director: ['director', 'Đạo diễn'], cast: ['cast', 'Diễn viên'], writer: ['writer', 'Biên kịch'], producer: ['producer', 'Nhà sản xuất'], production_country: ['production_country', 'Quốc gia sản xuất'],
        production_year: ['production_year', 'Năm sản xuất'], description: ['description', 'Mô tả', 'Tóm tắt phim'], plot_details: ['plot_details', 'Nội dung chi tiết'], original_language: ['original_language', 'Ngôn ngữ gốc'],
        localization_versions: ['localization_versions', 'Phiên bản phát hành', 'Phiên bản bản địa hóa'], format: ['format', 'Định dạng', 'Định dạng chiếu'],
        release_date: ['release_date', 'Ngày khởi chiếu', 'Ngày chiếu', 'Release date'], expected_end_date: ['expected_end_date', 'Ngày kết thúc dự kiến'], distributor: ['distributor', 'Nhà phát hành'],
        poster_url: ['poster_url', 'Poster URL', 'Poster'], banner_url: ['banner_url', 'Banner URL', 'Banner'], trailer_url: ['trailer_url', 'Trailer URL', 'Trailer video'], status: ['status', 'Trạng thái']
      };
      const dateFields = ['release_date', 'expected_end_date'];
      const movies: MovieImportRow[] = rows.map(row => {
        const normalized: Record<string, string | number> = {};
        const fieldHeaders: Record<string, string> = {};
        Object.entries(fields).forEach(([field, aliases]) => {
          const value = cell(row, aliases);
          normalized[field] = field === 'movie_code' ? '' : dateFields.includes(field) ? excelDate(value) : field === 'age_rating' ? getAgeRating(String(value || '')).code : String(value || '').trim();
          fieldHeaders[field] = headerFor(row, aliases);
        });
        normalized.duration_minutes = Number(normalized.duration_minutes) || 0;
        normalized.production_year = normalized.production_year === '' ? '' : Number(normalized.production_year) || '';
        const raw: Record<string, string> = {};
        columns.forEach(column => { const value = row[column]; raw[column] = typeof value === 'number' && value > 20000 && /ngày|date/i.test(column) ? excelDate(value) : String(value ?? '').trim(); });
        return { ...(normalized as Omit<MovieForm, 'id'>), raw, fieldHeaders } as MovieImportRow;
      });
      if (!movies.length) throw new Error('File không có dòng dữ liệu phim.');
      const previewErrors: MovieImportError[] = [];
      movies.forEach((movie, index) => {
        Object.keys(MOVIE_IMPORT_REQUIRED_FIELDS).forEach(field => {
          const value = movie[field as keyof MovieImportRow];
          if (String(value ?? '').trim() === '' || (field === 'duration_minutes' && Number(value) <= 0)) {
            previewErrors.push({ row: index + 2, field, message: `Thiếu hoặc chưa hợp lệ: ${MOVIE_IMPORT_REQUIRED_FIELDS[field]}.`, suggestion: movieImportSuggestion(field) });
          }
        });
      });
      const requiredHeaders = Object.values(movies[0].fieldHeaders);
      const displayColumns = Array.from(new Set([...columns.filter(column => !fields.movie_code.includes(column)), ...requiredHeaders]));
      setMovieImportFileName(file.name); setMovieImportColumns(displayColumns); setMovieImportRows(movies); setMovieImportErrors(previewErrors); setMovieImportInfoCell(null); setMovieImportSummary({ total: movies.length, valid: movies.length - new Set(previewErrors.map(error => error.row)).size, errors: previewErrors.length }); setMovieImportStatus('preview'); setShowMovieImportModal(true);
    } catch (error) { alert(error instanceof Error ? error.message : 'Không thể đọc file Excel.'); }
    finally { if (movieImportRef.current) movieImportRef.current.value = ''; }
  };

  const validateMovieImport = async () => {
    setMovieImportStatus('importing');
    try {
      const response = await fetch(`${API_BASE}?action=movies-import`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || '' }, body: JSON.stringify({ mode: 'validate', movies: movieImportRows }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Không thể kiểm tra file.');
      const errors = result.data.errors || []; setMovieImportErrors(errors); setMovieImportSummary({ total: Number(result.data.total || movieImportRows.length), valid: Number(result.data.valid_count || 0), errors: errors.length }); setMovieImportStatus(errors.length ? 'errors' : 'validated');
    } catch (error) { const message = error instanceof Error ? error.message : 'Không thể kiểm tra file.'; setMovieImportErrors([{ row: 0, message }]); setMovieImportSummary({ total: movieImportRows.length, valid: 0, errors: 1 }); setMovieImportStatus('errors'); }
  };

  const confirmMovieImport = async () => {
    setMovieImportStatus('importing');
    try {
      const response = await fetch(`${API_BASE}?action=movies-import`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || '' }, body: JSON.stringify({ mode: 'import', movies: movieImportRows }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tạo phim.');
      await loadMovies(); setMovieImportSummary({ total: movieImportRows.length, valid: movieImportRows.length, errors: 0, added: Number(result.data?.added || 0) }); setMovieImportStatus('completed');
    } catch (error) { const message = error instanceof Error ? error.message : 'Không thể tạo phim.'; setMovieImportErrors([{ row: 0, message }]); setMovieImportSummary({ total: movieImportRows.length, valid: 0, errors: 1 }); setMovieImportStatus('errors'); }
  };

  // CRUD FOR MASTER MOVIE LIBRARY
  const handleSaveMovie = async (e: FormEvent) => {
    e.preventDefault();
    setMovieFormError('');

    if (!movieForm.genre.trim()) {
      setMovieFormError('Vui lòng chọn ít nhất một thể loại.');
      return;
    }

    if (!movieForm.format.trim()) {
      setMovieFormError('Vui lòng chọn ít nhất một định dạng chiếu.');
      return;
    }

    if (!movieForm.release_date) {
      setMovieFormError('Ngày khởi chiếu không được để trống.');
      return;
    }

    if (movieForm.expected_end_date && movieForm.expected_end_date < movieForm.release_date) {
      setMovieFormError('Ngày kết thúc dự kiến phải lớn hơn hoặc bằng ngày khởi chiếu.');
      return;
    }

    try {
      const moviePayload = { ...movieForm };
      const uploadFields = [
        { key: 'poster' as const, field: 'poster_url' as const },
        { key: 'banner' as const, field: 'banner_url' as const },
        { key: 'trailer' as const, field: 'trailer_url' as const }
      ];
      for (const { key, field } of uploadFields) {
        const file = movieFiles[key];
        if (!file) continue;
        moviePayload[field] = await uploadMovieMediaInChunks(key, file);
      }

      const url = movieForm.id > 0 ? `${API_BASE}?action=movies&id=${movieForm.id}` : `${API_BASE}?action=movies`;
      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify(moviePayload)
      });
      const data = await res.json();
      if (data.success) {
        await loadMovies();
        alert(movieForm.id > 0 ? 'Đã cập nhật phim!' : 'Đã thêm phim mới vào kho hệ thống!');
        setShowMovieModal(false);
        clearMovieMedia();
        setMovieFormError('');
      } else {
        const message = data.message || 'Lưu phim thất bại.';
        setMovieFormError(message);
        alert(message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi kết nối cơ sở dữ liệu.';
      setMovieFormError(message);
      alert(message);
    }
  };

  const handleDeleteMovie = async (id: number) => {
    requestSystemConfirmation('Phim này sẽ bị xóa khỏi kho hệ thống. Vui lòng kiểm tra rằng phim không còn được sử dụng trong kế hoạch hoặc lịch chiếu.', async () => {
      try {
      const res = await fetch(`${API_BASE}?action=movies&id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' }
      });
      const data = await res.json();
      if (data.success) {
        alert('Đã xóa phim khỏi kho!');
        loadMovies();
      } else {
        alert(data.message);
      }
      } catch {
        alert('Lỗi kết nối cơ sở dữ liệu.');
      }
    }, 'Xóa phim');
  };

  const calculateScheduleEndTime = (startTime: string, movieId: number) => {
    const movie = scheduleMoviesList.find(item => Number(item.id) === Number(movieId)) || moviesList.find(item => Number(item.id) === Number(movieId));
    const duration = Math.max(1, Number(movie?.duration_minutes || 120));
    const date = new Date(`2000-01-01T${startTime}:00`);
    date.setMinutes(date.getMinutes() + duration);
    return date.toTimeString().slice(0, 5);
  };

  const getScheduleMovieOptions = (showDate: string) => {
    const unique = new Map<number, ScheduleMovieItem>();
    scheduleMoviesList.forEach(movie => {
      if (!showDate || (showDate >= movie.allocated_start_date && showDate <= movie.allocated_end_date)) {
        if (!unique.has(Number(movie.id))) unique.set(Number(movie.id), movie);
      }
    });
    return Array.from(unique.values()).sort((left, right) => left.title.localeCompare(right.title, 'vi'));
  };

  const applyScheduleDate = (showDate: string) => {
    setScheduleForm(previous => {
      const options = getScheduleMovieOptions(showDate);
      const currentAllowed = options.some(movie => Number(movie.id) === Number(previous.movie_id));
      const movieId = currentAllowed ? previous.movie_id : Number(options[0]?.id || 0);
      const slots = previous.time_slots.map(slot => ({ ...slot, end_time: calculateScheduleEndTime(slot.start_time, movieId) }));
      return { ...previous, show_date: showDate, movie_id: movieId, time_slots: slots, start_time: slots[0]?.start_time || '09:00', end_time: slots[0]?.end_time || '11:00' };
    });
  };

  const updateScheduleDatePart = (part: 'day' | 'month' | 'year', rawValue: number) => {
    const values = scheduleForm.show_date.split('-').map(Number);
    let year = values[0] || Number(localIsoDate(1).slice(0, 4));
    let month = values[1] || 1;
    let day = values[2] || 1;
    if (part === 'year') year = rawValue;
    if (part === 'month') month = rawValue;
    if (part === 'day') day = rawValue;
    day = Math.min(day, new Date(year, month, 0).getDate());
    applyScheduleDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  const updateScheduleSlotStart = (slotKey: string, startTime: string) => {
    const currentSlot = scheduleForm.time_slots.find(item => item.key === slotKey);
    if (currentSlot?.screen_id) scheduleSlotTimeLockedForRoom.current[slotKey] = Number(currentSlot.screen_id);
    const slots = scheduleForm.time_slots.map(item => item.key === slotKey ? { ...item, start_time: startTime, end_time: calculateScheduleEndTime(startTime, scheduleForm.movie_id) } : item);
    setScheduleForm({ ...scheduleForm, time_slots: slots, start_time: slots[0].start_time, end_time: slots[0].end_time });
  };

  const suggestScheduleSlot = async (slotKey: string, screenId: number, showDate = scheduleForm.show_date, movieId = scheduleForm.movie_id) => {
    if (!slotKey || !screenId || !movieId || !showDate) return;
    try {
      const response = await fetch(`${API_BASE}?action=schedule-availability`, {
        method:'POST', credentials:'include', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ movie_id:movieId, screen_id:screenId, show_date:showDate, exclude_showtime_id:scheduleForm.id || 0, slot_key:slotKey, draft_slots:scheduleForm.time_slots })
      });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) return;
      const availability = result.data as ScheduleSlotAvailability;
      setScheduleSlotAvailability(current => ({ ...current, [slotKey]:availability }));
      if (!availability.suggested) return;
      setScheduleForm(current => {
        if (current.show_date !== showDate || Number(current.movie_id) !== Number(movieId)) return current;
        // Do not overwrite a manual selection. A fresh slot (or a changed room)
        // receives one suggestion only; subsequent availability reloads are read-only.
        if (scheduleSlotTimeLockedForRoom.current[slotKey] === Number(screenId)) return current;
        const slots = current.time_slots.map(slot => slot.key === slotKey && Number(slot.screen_id) === Number(screenId)
          ? { ...slot, start_time:availability.suggested!.start, end_time:availability.suggested!.end }
          : slot);
        if (!slots.some(slot => slot.key === slotKey && Number(slot.screen_id) === Number(screenId))) return current;
        scheduleSlotTimeLockedForRoom.current[slotKey] = Number(screenId);
        return { ...current, time_slots:slots, start_time:slots[0]?.start_time || current.start_time, end_time:slots[0]?.end_time || current.end_time };
      });
    } catch { /* saveSchedule remains the server-side guard if the check is temporarily unavailable */ }
  };

  const scheduleSlotSignature = scheduleForm.time_slots.map(slot => `${slot.key}:${slot.screen_id}`).join('|');
  useEffect(() => {
    if (!showScheduleModal) scheduleSlotTimeLockedForRoom.current = {};
  }, [showScheduleModal]);
  useEffect(() => {
    if (!showScheduleModal || scheduleForm.id || !scheduleForm.movie_id || !scheduleForm.show_date) return;
    setScheduleSlotAvailability({});
    scheduleForm.time_slots.filter(slot => Number(slot.screen_id) > 0).forEach(slot => { void suggestScheduleSlot(slot.key, Number(slot.screen_id), scheduleForm.show_date, scheduleForm.movie_id); });
  }, [showScheduleModal, scheduleForm.id, scheduleForm.movie_id, scheduleForm.show_date, scheduleSlotSignature]);

  const openNewSchedule = (preferredMovieId = 0) => {
    let scheduleDate = localIsoDate(1);
    const preferredMovie = preferredMovieId ? scheduleMoviesList.find(movie => Number(movie.id) === Number(preferredMovieId)) : undefined;
    if (preferredMovie?.allocated_start_date && scheduleDate < preferredMovie.allocated_start_date) scheduleDate = preferredMovie.allocated_start_date;
    if (preferredMovie?.allocated_end_date && scheduleDate > preferredMovie.allocated_end_date) {
      setSystemNotice({ message:`Phim “${preferredMovie.title}” đã hết thời gian phân bổ cho rạp vào ${formatVietnameseDate(preferredMovie.allocated_end_date)}.`, type:'warning' });
      return;
    }
    const availableMovies = getScheduleMovieOptions(scheduleDate);
    if (!screensList.length) {
      alert('Chưa có phòng chiếu thuộc rạp của bạn trong aurora_db.');
      return;
    }
    if (!availableMovies.length) {
      alert(`Không có phim đã xác nhận phân bổ cho rạp vào ngày ưu tiên ${formatVietnameseDate(scheduleDate)}. Hãy kiểm tra kế hoạch phim trong aurora_db.`);
      return;
    }
    const firstMovie = preferredMovieId ? availableMovies.find(movie => Number(movie.id) === Number(preferredMovieId)) : availableMovies[0];
    if (!firstMovie) {
      setSystemNotice({ message:'Phim đang xem không có phân bổ hợp lệ cho ngày tạo suất. Vui lòng kiểm tra kế hoạch phim trong aurora_db.', type:'warning' });
      return;
    }
    const defaultStart = '09:00';
    const endTime = calculateScheduleEndTime(defaultStart, firstMovie.id);
    const initialTicketIds = ticketTypesList.length ? [ticketTypesList[0].id] : [];
    setScheduleForm({ id: 0, movie_id: firstMovie.id, screen_ids: [screensList[0].id], ticket_type_ids: initialTicketIds, show_date: scheduleDate, start_time: defaultStart, end_time: endTime, time_slots: [{ key: 'slot-1', screen_id: screensList[0].id, start_time: defaultStart, end_time: endTime }], ticket_price: getEffectiveTicketPrice(ticketTypesList[0], scheduleDate, defaultStart), operational_note: '', status: 'scheduled' });
    setShowScheduleModal(true);
  };

  const openScheduleForAllocation = (allocation: MovieAllocation) => {
    const preferredDate = localIsoDate(1);
    const showDate = preferredDate < allocation.allocated_start_date
      ? allocation.allocated_start_date
      : preferredDate;

    setActive('schedules');
    setScheduleMovieId(Number(allocation.movie_id));
    setScheduleView('active');
    setSchedulePage(1);
    setScheduleDateFilter(showDate);
    setScheduleStatusFilter('all');
    setScheduleSearch('');

    if (showDate > allocation.allocated_end_date) {
      setSystemNotice({
        type: 'warning',
        message: `Phân bổ phim “${allocation.movie_title}” đã hết hạn ngày ${formatVietnameseDate(allocation.allocated_end_date)}. Vui lòng liên hệ Admin Tổng để gia hạn kế hoạch.`
      });
      return;
    }
    if (!screensList.length) {
      setSystemNotice({ type: 'warning', message: 'Rạp chưa có phòng chiếu hoạt động để lập lịch.' });
      return;
    }
    if (!ticketTypesList.length) {
      setSystemNotice({ type: 'warning', message: 'Chưa có loại vé hoạt động để áp dụng cho suất chiếu.' });
      return;
    }

    const movieId = Number(allocation.movie_id);
    const defaultStart = '09:00';
    const defaultScreenId = Number(screensList[0].id);
    const defaultTicket = ticketTypesList[0];
    const endTime = calculateScheduleEndTime(defaultStart, movieId);
    setScheduleForm({
      id: 0,
      movie_id: movieId,
      screen_ids: [defaultScreenId],
      ticket_type_ids: [Number(defaultTicket.id)],
      show_date: showDate,
      start_time: defaultStart,
      end_time: endTime,
      time_slots: [{ key: `slot-${allocation.id}-${Date.now()}`, screen_id: defaultScreenId, start_time: defaultStart, end_time: endTime }],
      ticket_price: getEffectiveTicketPrice(defaultTicket, showDate, defaultStart),
      operational_note: `Theo kế hoạch phân bổ #${allocation.id} · tối thiểu ${allocation.min_screenings_per_day} suất/ngày`,
      status: 'scheduled'
    });
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const endpoint = scheduleForm.id ? `${API_BASE}?action=schedules&id=${scheduleForm.id}` : `${API_BASE}?action=schedules`;
      const response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' },
        body: JSON.stringify(scheduleForm),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu suất chiếu.');
      setShowScheduleModal(false);
      await loadSchedules();
      alert('Đã lưu suất chiếu. Suất đã được đồng bộ sang website customer.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Lỗi kết nối cơ sở dữ liệu.');
    }
  };

  const deleteSchedules = async (ids: number[]) => {
    const response = await fetch(`${API_BASE}?action=schedules`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    const result = await response.json().catch(() => ({ success: false, message: 'Phản hồi máy chủ không hợp lệ.' }));
    if (!response.ok || !result.success) {
      const error = new Error(result.message || 'Không thể xóa suất chiếu.') as ScheduleDeleteError;
      error.blockedIds = Array.isArray(result.data?.blocked_ids) ? result.data.blocked_ids.map(Number) : [];
      throw error;
    }
    return result;
  };

  const reconcileDeletedSchedules = async (result: any, fallbackIds: number[]) => {
    const deletedIds = Array.isArray(result.data?.deleted_ids) ? result.data.deleted_ids.map(Number) : fallbackIds;
    const alreadyMissingIds = Array.isArray(result.data?.already_missing_ids) ? result.data.already_missing_ids.map(Number) : [];
    const deletedSet = new Set<number>([...deletedIds, ...alreadyMissingIds]);
    // Invalidate any GET that started before the delete response, then remove
    // the rows immediately so a temporary refresh error cannot show stale data.
    scheduleLoadSequence.current += 1;
    setSchedulesList(current => current.filter(schedule => !deletedSet.has(Number(schedule.id))));
    setSelectedScheduleIds(current => current.filter(id => !deletedSet.has(id)));
    const refreshed = await loadSchedules({ showError: false });
    if (refreshed) showSystemNotice(result.message);
    else setSystemNotice({ message: `${result.message} Danh sách đã được cập nhật cục bộ; hãy bấm Làm mới khi kết nối ổn định.`, type: 'warning' });
  };

  const handleScheduleDeleteError = async (error: unknown) => {
    const deleteError = error as ScheduleDeleteError;
    if (deleteError.blockedIds?.length) {
      const blockedSet = new Set(deleteError.blockedIds);
      const blockReason = error instanceof Error && /bắt đầu/i.test(error.message) ? 'started' : 'has_booking_history';
      setSelectedScheduleIds(current => current.filter(id => !blockedSet.has(id)));
      setSchedulesList(current => current.map(schedule => blockedSet.has(Number(schedule.id))
        ? { ...schedule, can_delete: 0, delete_block_reason: blockReason }
        : schedule));
      scheduleLoadSequence.current += 1;
      await loadSchedules({ showError: false });
    }
    setSystemNotice({ message: error instanceof Error ? error.message : 'Lỗi kết nối cơ sở dữ liệu.', type: deleteError.blockedIds?.length ? 'warning' : 'error' });
  };

  const handleDeleteSchedule = async (id: number) => {
    requestSystemConfirmation('Suất chiếu chưa bắt đầu sẽ bị xóa khỏi aurora_db và không còn hiển thị trên website khách hàng.', async () => {
      setScheduleBulkDeleting(true);
      try {
        const result = await deleteSchedules([id]);
        await reconcileDeletedSchedules(result, [id]);
      } catch (error) {
        await handleScheduleDeleteError(error);
      } finally {
        setScheduleBulkDeleting(false);
      }
    }, 'Xóa suất chiếu', 'Xác nhận xóa suất chiếu');
  };

  const handleDeleteSelectedSchedules = () => {
    const ids = [...selectedScheduleIds];
    if (!ids.length || scheduleBulkDeleting) return;
    requestSystemConfirmation(
      `Bạn đang chọn xóa ${ids.length} suất chiếu. Hệ thống sẽ không xóa bất kỳ suất nào nếu trong nhóm có suất đã bắt đầu hoặc đã phát sinh đặt vé.`,
      async () => {
        setScheduleBulkDeleting(true);
        try {
          const result = await deleteSchedules(ids);
          await reconcileDeletedSchedules(result, ids);
        } catch (error) {
          await handleScheduleDeleteError(error);
        } finally {
          setScheduleBulkDeleting(false);
        }
      },
      `Xóa ${ids.length} suất chiếu`,
      'Xác nhận xóa hàng loạt'
    );
  };

  // -------- LOGIN --------
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const u = username.trim();
    const p = password.trim();
    if (!u || !p) { setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.'); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}?action=login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const result = await res.json();
      if (result.success && result.data?.user) {
        const user = result.data.user;
        const role = toTmsRole(user.role);
        window.sessionStorage.setItem('aurora_tms_username', user.username);
        setCurrentUser({ id: user.id, username: user.username, full_name: user.full_name, role, phone: user.phone, theater_id: Number(user.theater_id || 0), theater_name: user.theater_name, status: user.status });
        setIsLoggedIn(true); setActive('dashboard');
      } else { setErrorMsg(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.'); }
    } catch {
      // Never create a client-only login. It would disappear on reload and
      // could expose a different stale server session instead.
      setErrorMsg('Không thể tạo phiên đăng nhập với máy chủ. Vui lòng kiểm tra kết nối aurora_db và thử lại.');
    } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}?action=logout`, { credentials: 'include' }); } catch { /* ignore */ }
    window.sessionStorage.removeItem('aurora_tms_username');
    if (currentUser) window.sessionStorage.removeItem(tmsViewStorageKey(currentUser));
    replaceTmsViewInUrl();
    scheduleLoadSequence.current += 1;
    setSchedulesLoading(false); setSelectedScheduleIds([]);
    setIsLoggedIn(false); setPassword(''); setCurrentUser(null); setUserDropdownOpen(false);
  };

  // -------- PERMISSIONS HANDLERS --------
  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') { alert('Chỉ Admin Tổng mới có quyền quản lý tài khoản!'); return; }
    if (!userForm.username.trim() || !userForm.full_name.trim() || !userForm.email.trim()) { setSystemNotice({ message: 'Vui lòng nhập đầy đủ tên đăng nhập, họ tên và email công việc.', type: 'warning' }); return; }
    if (!/^\S+@\S+\.\S+$/.test(userForm.email.trim())) { setSystemNotice({ message: 'Email công việc không đúng định dạng.', type: 'warning' }); return; }
    if (!userForm.id && userForm.password.length < 6) { setSystemNotice({ message: 'Mật khẩu khởi tạo cần có tối thiểu 6 ký tự.', type: 'warning' }); return; }
    if ((userForm.role === 'cinema_admin' || userForm.role === 'supervisor') && !Number(userForm.theater_id)) { setSystemNotice({ message: 'Vui lòng chọn rạp phụ trách cho tài khoản vận hành.', type: 'warning' }); return; }
    try {
      const res = await fetch(`${API_BASE}?action=users`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Không thể lưu tài khoản.');
      setShowUserModal(false); showSystemNotice(data.message || 'Đã lưu tài khoản vào Aurora DB.'); loadUsers();
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể lưu tài khoản vào Aurora DB.', type: 'error' }); }
  };

  const toggleUserStatus = async (u: TMSUser) => {
    if (currentUser?.role !== 'super_admin') { alert('Chỉ Admin Tổng mới có quyền này!'); return; }
    if (Number(currentUser?.id) === Number(u.id) && u.status === 'active') { setSystemNotice({ message: 'Bạn không thể tự khóa tài khoản đang đăng nhập.', type: 'warning' }); return; }
    try {
      const status = u.status === 'active' ? 'locked' : 'active';
      const response = await fetch(`${API_BASE}?action=users`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...u, status, password: '' }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật trạng thái tài khoản.');
      showSystemNotice(result.message); loadUsers();
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái tài khoản.', type: 'error' }); }
  };

  const toggleCustomerStatus = async (u: TMSUser) => {
    if (currentUser?.role !== 'super_admin') { setSystemNotice({ message: 'Chỉ Admin Tổng mới có quyền thay đổi trạng thái customer.', type: 'warning' }); return; }
    const status = u.status === 'active' ? 'locked' : 'active';
    try {
      const response = await fetch(`${API_BASE}?action=customer-account-status`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:u.id, status }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật trạng thái customer.');
      showSystemNotice(result.message); await loadUsers();
    } catch (error) { setSystemNotice({ message:error instanceof Error ? error.message : 'Không thể cập nhật trạng thái customer.', type:'error' }); }
  };

  const deleteUserAccount = (u: TMSUser) => {
    if (currentUser?.role !== 'super_admin') { setSystemNotice({ message: 'Chỉ Admin Tổng mới có quyền xóa tài khoản TMS.', type: 'warning' }); return; }
    if (Number(currentUser?.id) === Number(u.id)) { setSystemNotice({ message: 'Bạn không thể tự xóa tài khoản đang đăng nhập.', type: 'warning' }); return; }
    requestSystemConfirmation(
      `Tài khoản “${u.full_name}” (@${u.username}) sẽ bị xóa vĩnh viễn khỏi Aurora DB cùng các liên kết quản trị liên quan. Hành động này không thể hoàn tác.`,
      async () => {
        try {
          const response = await fetch(`${API_BASE}?action=users&id=${u.id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-TMS-User': currentUser?.username || 'admin_tong'
            }
          });
          const rawText = await response.text();
          let result: any = null;
          try {
            result = JSON.parse(rawText);
          } catch {
            const cleanMsg = rawText.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            throw new Error(cleanMsg || 'Máy chủ trả về phản hồi không hợp lệ.');
          }
          if (!response.ok || !result.success) throw new Error(result.message || 'Không thể xóa tài khoản khỏi Aurora DB.');
          showSystemNotice(result.message || 'Đã xóa tài khoản khỏi Aurora DB thành công.');
          await loadUsers();
        } catch (error) {
          setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể xóa tài khoản khỏi Aurora DB.', type: 'error' });
        }
      },
      'Xóa vĩnh viễn',
      'Xóa tài khoản khỏi Aurora?'
    );
  };

  const updateScreenOperation = async (id: number, changes: Record<string, string | number>) => {
    try {
      const response = await fetch(`${API_BASE}?action=screens&id=${id}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' }, body: JSON.stringify(changes) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể cập nhật phòng chiếu.');
      await loadScreens();
      if (screenPreparation?.allocation?.id) await loadScreenPreparation(screenPreparation.allocation.id);
      showSystemNotice(result.message || 'Đã cập nhật trạng thái phòng trong Aurora DB.');
    } catch (error) { setSystemNotice({ message: error instanceof Error ? error.message : 'Không thể cập nhật phòng chiếu.', type: 'error' }); }
  };

  const adjustTemp = (id: number, d: number) => {
    if (!['supervisor', 'cinema_admin', 'super_admin'].includes(currentUser?.role || '')) { alert('Không có quyền điều chỉnh nhiệt độ.'); return; }
    const screen = screensList.find(item => item.id === id);
    if (!screen) return;
    updateScreenOperation(id, { hvac_temperature: Math.max(18, Math.min(26, Math.round((screen.hvac_temperature + d) * 10) / 10)) });
  };

  const toggleProjector = (id: number) => {
    if (!['supervisor', 'cinema_admin', 'super_admin'].includes(currentUser?.role || '')) { alert('Không có quyền thay đổi trạng thái máy chiếu.'); return; }
    const screen = screensList.find(item => item.id === id);
    if (!screen) return;
    updateScreenOperation(id, { projector_status: screen.projector_status === 'online' ? 'standby' : 'online' });
  };

  const handleRefundApproval = (id: number, action: 'approved' | 'rejected' | 'completed') => {
    setRefundsList(prev => prev.map(r => r.id === id ? { ...r, status: action } : r));
    alert(action === 'approved' ? 'Đã phê duyệt hoàn tiền!' : action === 'completed' ? 'Đã hoàn tất chi trả!' : 'Đã từ chối yêu cầu hoàn tiền.');
  };

  const handleCancelTxn = (id: number, approve: boolean) => {
    if (currentUser?.role !== 'supervisor' && currentUser?.role !== 'super_admin') { alert('Chỉ Supervisor mới có quyền phê duyệt hủy giao dịch!'); return; }
    setTxnsList(prev => prev.map(t => t.id === id ? { ...t, status: approve ? 'cancelled' : 'paid', cancel_requested: false } : t));
    alert(approve ? 'Đã phê duyệt hủy giao dịch!' : 'Đã từ chối yêu cầu hủy.');
  };

  const handleCreateRefundRequest = (e: FormEvent) => {
    e.preventDefault();
    if (!refundForm.transaction_code || !refundForm.reason) { alert('Vui lòng nhập đầy đủ thông tin.'); return; }
    const rc = ROLE_CONFIGS[currentUser?.role || 'supervisor'];
    setRefundsList(prev => [{
      id: Date.now(), transaction_code: refundForm.transaction_code,
      customer_name: refundForm.customer_name || 'Khách vãng lai',
      reason: refundForm.reason, amount: refundForm.amount,
      payment_method: refundForm.payment_method, status: 'pending',
      created_at: 'Vừa xong', requested_by: `${currentUser?.full_name} (${rc.name})`
    }, ...prev]);
    setShowRefundModal(false);
    alert('Đã tạo phiếu yêu cầu hoàn tiền! Chờ phê duyệt từ Supervisor/Kế Toán.');
  };

  // ============================================================
  // DERIVED STATE
  // ============================================================
  const role = currentUser?.role;
  const rc = role ? ROLE_CONFIGS[role] : ROLE_CONFIGS.super_admin;
  const navItems = role ? getRoleNavItems(role) : [];
  const pendingRefunds = refundsList.filter(r => r.status === 'pending').length;
  const cancelRequests = txnsList.filter(t => t.cancel_requested).length;
  const totalNotif = pendingRefunds + cancelRequests;

  // ============================================================
  // LOGIN PAGE
  // ============================================================
  if (isRestoringSession) {
    return <div className="tms-page-container" aria-busy="true" />;
  }

  if (!isLoggedIn) {
    return (
      <div className="tms-page-container">
        <div className="tms-split-layout">

          {/* LEFT HERO */}
          <div className="tms-hero-panel">
            <div className="tms-hero-overlay" />
            <div className="tms-hero-content" style={{ justifyContent: 'center' }}>
              <div className="tms-brand-header">
                <div style={{ width: 72, height: 72, background: '#f0b52d', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(240,181,45,0.4)', marginBottom: 16 }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="#0b1220">
                    <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
                   </svg>
                </div>
                <h1 className="tms-brand-name">AURORA</h1>
                <div className="tms-brand-sub">C I N E M A</div>
                <div className="tms-system-divider">
                  <span className="tms-div-line" /><span className="tms-system-tag">TMS RBAC</span><span className="tms-div-line" />
                </div>
                <div className="tms-system-fullname">THEATER MANAGEMENT SYSTEM</div>
              </div>


            </div>
          </div>

          {/* RIGHT - FORM ONLY */}
          <div className="tms-form-panel">
            <div className="tms-form-container" style={{ maxWidth: 460 }}>
              <div className="tms-form-badge">
                <div className="tms-badge-circle"><Clapperboard size={26} color="#e5a93c" /></div>
              </div>

              <h2 className="tms-login-title">Đăng nhập TMS</h2>
              <p className="tms-login-subtitle">Vui lòng nhập tài khoản và mật khẩu được cấp để truy cập hệ thống</p>

              {errorMsg && <div className="tms-alert-error">{errorMsg}</div>}

              {DEMO_ACCOUNTS.length > 0 && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {DEMO_ACCOUNTS.map(a => {
                      const cfg = ROLE_CONFIGS[a.role];
                      return (
                        <div key={a.role} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#fff', border: `1px solid ${cfg.borderColor}30`, borderRadius: 8 }}>
                          <span style={{ fontSize: '1rem' }}>{cfg.emoji}</span>
                          <div>
                            <div style={{ fontSize: '0.73rem', fontWeight: 700, color: cfg.color }}>{a.label}</div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>{a.user}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LOGIN FORM - single form, no quick role selector */}
              <form onSubmit={handleLogin} className="tms-auth-form">
                <div className="tms-input-field">
                  <span className="tms-input-icon"><User size={19} /></span>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên đăng nhập (vd: admin_tong)" autoComplete="username" required />
                </div>
                <div className="tms-input-field">
                  <span className="tms-input-icon"><Lock size={19} /></span>
                  <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" autoComplete="current-password" required />
                  <button type="button" className="tms-toggle-pwd" onClick={() => setShowPassword(!showPassword)} aria-label="Ẩn/hiện mật khẩu">
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
                <button type="submit" className="tms-submit-btn" disabled={isLoading}>
                  {isLoading ? 'ĐANG XÁC THỰC...' : 'ĐĂNG NHẬP'}
                </button>
              </form>
            </div>
            <footer className="tms-footer">© 2026 Aurora Cinema • Hệ thống TMS phân quyền RBAC</footer>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN APP (after login)
  // ============================================================

  // -------- VIEWS --------
  const renderExecutiveDashboard = () => {
    const data = dashboardData;
    if (dashboardLoading && !data) {
      return <div className="dashboard-loading"><div className="dashboard-loading-mark" /><div><b>Đang đồng bộ dữ liệu vận hành</b><span>Đọc số liệu mới nhất từ Aurora DB…</span></div></div>;
    }
    if (!data) return <div className="dashboard-load-error"><span><AlertTriangle size={24}/></span><div><b>Không thể tải dashboard</b><p>{dashboardError || 'Aurora DB chưa trả về dữ liệu tổng quan.'}</p></div><button type="button" onClick={() => { void loadDashboard(reportDate); if (currentUser?.role === 'cinema_admin') void loadCinemaScheduleBoard(reportDate); }}><RefreshCw size={15}/>Thử lại</button></div>;

    const currency = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
    const compactCurrency = (value: number) => value >= 1000000 ? `${(value / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}M` : `${Math.round(value / 1000)}K`;
    const totalRevenue = Number(data.revenue.total_revenue || 0);
    const previousRevenue = Number(data.previous_day_revenue || 0);
    const trend = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : null;
    const chartRows = data.revenue_7_days.length ? data.revenue_7_days : [{ date: data.date, total_revenue: 0 }];
    const chartValues = chartRows.map(row => Number(row.total_revenue || 0));
    const chartMax = Math.max(...chartValues, 1);
    const chartPoints = chartValues.map((value, index) => ({ x: 5 + (index * 90) / Math.max(chartValues.length - 1, 1), y: 88 - (value / chartMax) * 70 }));
    const chartLine = chartPoints.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
    const chartArea = `${chartLine} L 95 96 L 5 96 Z`;
    const channelTotal = data.channels.reduce((sum, channel) => sum + Number(channel.amount || 0), 0);
    let accumulatedPercent = 0;
    const channelColors: Record<string, string> = { pos: '#5b7cfa', website: '#19b58d', ota: '#f59e0b' };
    const channelGradient = data.channels.map(channel => {
      const share = channelTotal ? (Number(channel.amount || 0) / channelTotal) * 100 : 0;
      const start = accumulatedPercent;
      accumulatedPercent += share;
      return `${channelColors[channel.code] || '#94a3b8'} ${start}% ${accumulatedPercent}%`;
    }).join(', ') || '#e2e8f0 0 100%';
    const issueScreens = data.screens_status.filter(screen => screen.projector_status !== 'online' || screen.sound_system_status !== 'online' || screen.status !== 'active');
    if (role === 'cinema_admin') {
      const board = cinemaScheduleBoard;
      const boardScreens = board?.screens || [];
      const boardShowtimes = board?.showtimes || [];
      const toMinutes = (value: string) => { const parts = String(value || '00:00').split(':'); return Number(parts[0]) * 60 + Number(parts[1] || 0); };
      const boardStartHour = 0;
      const boardEndHour = 24;
      const boardHours = Array.from({ length: boardEndHour - boardStartHour + 1 }, (_, index) => boardStartHour + index);
      const boardMinutes = (boardEndHour - boardStartHour) * 60;
      const formatBoardDate = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${reportDate}T00:00:00`));
      const changeBoardDate = (offset: number) => setReportDate(current => shiftLocalIsoDate(current, offset));
      const scheduledCount = boardShowtimes.filter((showtime: any) => showtime.status === 'scheduled').length;
      const runningCount = boardShowtimes.filter((showtime: any) => showtime.status === 'running').length;
      const boardSummary = board?.summary || { total_showtimes:boardShowtimes.length, scheduled:scheduledCount, running:runningCount, active_screens:boardScreens.length, booked_seats:0, total_capacity:0, occupancy_rate:0, paid_orders:0, revenue:0 };
      const upcomingShowtimes = boardShowtimes.filter((showtime: any) => showtime.status === 'scheduled').slice(0, 4);
      const healthyScreens = boardScreens.filter((screen: any) => screen.status === 'active' && screen.projector_status === 'online' && screen.sound_system_status === 'online').length;

      return <div className="cinema-operations-dashboard">
        <section className="cinema-board-kpis"><article><span className="cinema-kpi-icon blue"><CalendarDays size={20} /></span><div><small>Suất chiếu ngày chọn</small><b>{Number(boardSummary.total_showtimes || 0)}</b><span>{Number(boardSummary.scheduled || 0)} suất sắp chiếu</span></div></article><article><span className="cinema-kpi-icon green"><Monitor size={20} /></span><div><small>Phòng khả dụng</small><b>{Number(boardSummary.active_screens || 0)}</b><span>{Number(boardSummary.running || 0)} suất đang chiếu</span></div></article><article><span className="cinema-kpi-icon violet"><Users size={20} /></span><div><small>Ghế đã bán</small><b>{Number(boardSummary.booked_seats || 0).toLocaleString('vi-VN')}</b><span>{Number(boardSummary.total_capacity || 0).toLocaleString('vi-VN')} ghế cung ứng</span></div></article><article><span className="cinema-kpi-icon amber"><DollarSign size={20} /></span><div><small>Doanh thu trong ngày</small><b>{currency(Number(boardSummary.revenue || 0))}</b><span>{Number(boardSummary.paid_orders || 0)} đơn đã thanh toán</span></div></article></section>
        <section className="cinema-schedule-board-card">
          <header className="cinema-board-header"><div><div className="cinema-board-title"><CalendarCheck size={18} /><h3>Sơ đồ lịch chiếu theo phòng</h3></div><p>{formatBoardDate} · Nhấp vào suất chiếu để xem hoặc cập nhật lịch.</p></div><div className="cinema-board-actions"><button type="button" onClick={() => changeBoardDate(-1)}>‹ Ngày trước</button><button type="button" className={reportDate === localIsoDate() ? 'active' : ''} onClick={() => setReportDate(localIsoDate())}>Hôm nay</button><button type="button" onClick={() => changeBoardDate(1)}>Ngày sau ›</button></div></header>
          {cinemaScheduleBoardLoading ? <div className="cinema-board-loading"><div className="dashboard-loading-mark" /><span>Đang đồng bộ lịch chiếu từ Aurora DB…</span></div> : board ? <div className="cinema-board-scroll"><div className="cinema-board" style={{ minWidth: 1240 }}><div className="cinema-board-head"><div>PHÒNG CHIẾU</div><div className="cinema-board-hours">{boardHours.map(hour => <span key={hour}>{hour === 24 ? '00:00' : `${String(hour).padStart(2, '0')}:00`}</span>)}</div></div>{boardScreens.length ? boardScreens.map((screen: any) => { const screenShowtimes = boardShowtimes.filter((showtime: any) => Number(showtime.screen_id) === Number(screen.id)); return <div className="cinema-board-row" key={screen.id}><div className="cinema-board-screen"><b>{screen.name}</b><span>{screen.screen_type || 'Phòng chiếu'} · {screen.total_seats || 0} ghế</span><em className={screen.status === 'active' ? 'ready' : ''}>{screen.status === 'active' ? 'Sẵn sàng' : screen.status}</em></div><div className="cinema-board-lane">{boardHours.slice(0, -1).map(hour => <i key={hour} />)}{screenShowtimes.map((showtime: any) => { const start = toMinutes(showtime.start_time); const end = Math.max(toMinutes(showtime.end_time), start + 30); const left = Math.max(0, Math.min(100, ((start - boardStartHour * 60) / boardMinutes) * 100)); const width = Math.max(7, Math.min(100 - left, ((end - start) / boardMinutes) * 100)); const state = showtime.status === 'running' ? 'running' : showtime.status === 'finished' ? 'finished' : showtime.status === 'cancelled' ? 'cancelled' : 'scheduled'; return <button type="button" key={showtime.id} className={`cinema-showtime-block ${state}`} style={{ left: `${left}%`, width: `${width}%` }} title={`${showtime.movie_title} · ${String(showtime.start_time).slice(0, 5)}–${String(showtime.end_time).slice(0, 5)}`} onClick={() => { const startTime=String(showtime.start_time).slice(0,5), endTime=String(showtime.end_time).slice(0,5); setScheduleForm({ id: Number(showtime.id), movie_id:Number(showtime.movie_id), screen_ids:[Number(showtime.screen_id)], ticket_type_ids:String(showtime.ticket_type_ids || '').split(',').filter(Boolean).map(Number), show_date:showtime.show_date, start_time:startTime, end_time:endTime, time_slots:[{key:'slot-1',screen_id:Number(showtime.screen_id),start_time:startTime,end_time:endTime}], ticket_price:Number(showtime.ticket_price || 0), operational_note:String(showtime.operational_note || ''), status:showtime.status }); setShowScheduleModal(true); }}><b>{String(showtime.start_time).slice(0, 5)} · {showtime.movie_title || 'Phim đang cập nhật'}</b><span>{showtime.booked_seats}/{showtime.total_seats} ghế · {showtime.age_rating || 'P'}</span></button>; })}</div></div>; }) : <div className="cinema-board-empty"><Film size={28}/><b>Rạp chưa có phòng khả dụng</b><span>Kiểm tra cấu hình phòng chiếu trong Aurora DB.</span></div>}</div></div> : <div className="cinema-board-empty"><AlertTriangle size={28}/><b>Chưa tải được lịch chiếu</b><span>{cinemaScheduleBoardError || 'Vui lòng kiểm tra kết nối Aurora DB.'}</span><button type="button" onClick={() => void loadCinemaScheduleBoard(reportDate)}><RefreshCw size={14}/>Tải lại dữ liệu</button></div>}
          <footer className="cinema-board-legend"><span><i className="scheduled" /> Đã lên lịch</span><span><i className="running" /> Đang chiếu</span><span><i className="finished" /> Đã kết thúc</span><span><i className="cancelled" /> Đã hủy</span><b>Nhấp vào một suất chiếu để cập nhật thông tin.</b></footer>
        </section>
        <section className="cinema-dashboard-insights">
          <article className="cinema-insight-card performance"><header><div><small>HIỆU SUẤT NGÀY</small><h3>Công suất khai thác</h3></div><Target size={19}/></header><div className="cinema-occupancy-value"><b>{Number(boardSummary.occupancy_rate || 0).toLocaleString('vi-VN')}%</b><span>{Number(boardSummary.booked_seats || 0).toLocaleString('vi-VN')} / {Number(boardSummary.total_capacity || 0).toLocaleString('vi-VN')} ghế</span></div><div className="cinema-occupancy-track"><i style={{width:`${Math.min(100,Number(boardSummary.occupancy_rate || 0))}%`}}/></div><dl><div><dt>Đơn thanh toán</dt><dd>{Number(boardSummary.paid_orders || 0)}</dd></div><div><dt>Doanh thu</dt><dd>{currency(Number(boardSummary.revenue || 0))}</dd></div></dl></article>
          <article className="cinema-insight-card upcoming"><header><div><small>LỊCH SẮP TỚI</small><h3>Suất chiếu tiếp theo</h3></div><button type="button" onClick={() => setActive('schedules')}>Xem lịch</button></header><div className="cinema-upcoming-list">{upcomingShowtimes.length ? upcomingShowtimes.map((showtime:any)=><div key={showtime.id}><time>{String(showtime.start_time).slice(0,5)}</time><p><b>{showtime.movie_title}</b><span>{showtime.screen_name || boardScreens.find((screen:any)=>Number(screen.id)===Number(showtime.screen_id))?.name} · {showtime.booked_seats}/{showtime.total_seats} ghế</span></p><em>{showtime.age_rating || 'P'}</em></div>) : <div className="cinema-insight-empty">Không còn suất sắp chiếu trong ngày đã chọn.</div>}</div></article>
          <article className="cinema-insight-card health"><header><div><small>VẬN HÀNH THIẾT BỊ</small><h3>Sức khỏe phòng chiếu</h3></div><button type="button" onClick={() => setActive('screens')}>Quản lý phòng</button></header><div className="cinema-health-score"><span><CheckCircle2 size={20}/></span><div><b>{healthyScreens}/{boardScreens.length}</b><small>phòng hoạt động ổn định</small></div></div><div className="cinema-health-list"><span><i className="ok"/>Máy chiếu online <b>{boardScreens.filter((screen:any)=>screen.projector_status==='online').length}</b></span><span><i className="ok"/>Âm thanh online <b>{boardScreens.filter((screen:any)=>screen.sound_system_status==='online').length}</b></span><span><i className={healthyScreens===boardScreens.length?'ok':'warning'}/>Cần kiểm tra <b>{Math.max(0,boardScreens.length-healthyScreens)}</b></span></div></article>
        </section>
      </div>;
    }

    return <div className="executive-dashboard">
      <section className="dashboard-kpis">
        <article className="dashboard-kpi revenue"><div className="dashboard-kpi-icon"><DollarSign size={20} /></div><div><span>Doanh thu ngày đã chọn</span><strong>{currency(totalRevenue)}</strong><small className={trend !== null && trend < 0 ? 'negative' : ''}>{trend === null ? 'Chưa có dữ liệu ngày trước' : `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend).toFixed(1)}% so với ngày trước`}</small></div></article>
        <article className="dashboard-kpi violet"><div className="dashboard-kpi-icon"><Receipt size={20} /></div><div><span>Giao dịch đã thanh toán</span><strong>{Number(data.transaction_count || 0).toLocaleString('vi-VN')}</strong><small>{Number(data.revenue.total_tickets || 0).toLocaleString('vi-VN')} ghế đã được đặt</small></div></article>
        <article className="dashboard-kpi emerald"><div className="dashboard-kpi-icon"><Monitor size={20} /></div><div><span>Phòng chiếu sẵn sàng</span><strong>{data.active_screens} <em>/ {data.screens_status.length}</em></strong><small>{data.showtimes} suất chiếu ngày đã chọn</small></div></article>
        <article className="dashboard-kpi amber"><div className="dashboard-kpi-icon"><ShieldAlert size={20} /></div><div><span>Cần theo dõi</span><strong>{issueScreens.length + Number(data.pending_refunds || 0)}</strong><small>{issueScreens.length} phòng · {data.pending_refunds} hoàn tiền chờ xử lý</small></div></article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-chart-panel">
          <header className="dashboard-panel-header"><div><h3>Xu hướng doanh thu</h3><p>7 ngày gần nhất · {data.revenue_source === 'orders' ? 'Từ đơn hàng đã thanh toán' : data.revenue_source === 'transactions' ? 'Từ giao dịch đã thanh toán' : 'Từ sổ doanh thu hệ thống'}</p></div><strong>{compactCurrency(chartValues.reduce((sum, value) => sum + value, 0))}</strong></header>
          <div className="dashboard-chart"><div className="dashboard-chart-scale"><span>{compactCurrency(chartMax)}</span><span>{compactCurrency(chartMax / 2)}</span><span>0</span></div><div className="dashboard-chart-canvas"><div className="dashboard-chart-grid"><i /><i /><i /></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Biểu đồ doanh thu 7 ngày"><defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop stopColor="#5b7cfa" stopOpacity=".28" /><stop offset="1" stopColor="#5b7cfa" stopOpacity=".02" /></linearGradient></defs><path d={chartArea} fill="url(#revenue-fill)" /><path d={chartLine} fill="none" stroke="#5b7cfa" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" /></svg><div className="dashboard-chart-labels">{chartRows.map((row, index) => <span key={`${row.date}-${index}`}>{new Date(`${row.date}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>)}</div></div></div>
        </article>
        <article className="dashboard-panel dashboard-channel-panel">
          <header className="dashboard-panel-header"><div><h3>Kênh bán hàng</h3><p>Phân bổ doanh thu trong ngày</p></div></header>
          <div className="dashboard-channel-body"><div className="dashboard-donut" style={{ background: `conic-gradient(${channelGradient})` }}><div><strong>{currency(channelTotal)}</strong><span>Tổng doanh thu</span></div></div><div className="dashboard-channel-list">{data.channels.map(channel => { const amount = Number(channel.amount || 0); const share = channelTotal ? (amount / channelTotal) * 100 : 0; return <div key={channel.code}><span><i style={{ background: channelColors[channel.code] }} />{channel.name}</span><b>{share.toFixed(1)}%</b><small>{currency(amount)}</small></div>; })}</div></div>
        </article>
      </section>

      <section className="dashboard-detail-grid">
        <article className="dashboard-panel"><header className="dashboard-panel-header"><div><h3>Tín hiệu vận hành</h3><p>Trạng thái cần ưu tiên trong ca</p></div><button onClick={() => setActive('screens')}>Xem phòng chiếu</button></header><div className="dashboard-status-list">{issueScreens.length ? issueScreens.slice(0, 4).map(screen => <div key={screen.id}><span className="dashboard-status-icon warning"><AlertTriangle size={15} /></span><p><b>{screen.name}</b><small>{screen.projector_status !== 'online' ? `Máy chiếu: ${screen.projector_status}` : `Âm thanh: ${screen.sound_system_status}`}</small></p><em>Cần kiểm tra</em></div>) : <div><span className="dashboard-status-icon success"><CheckCircle2 size={15} /></span><p><b>Hệ thống phòng chiếu ổn định</b><small>{data.active_screens} phòng đang sẵn sàng phục vụ</small></p><em className="ok">Bình thường</em></div>}<div><span className="dashboard-status-icon info"><UserCheck size={15} /></span><p><b>Nhân sự đang trực</b><small>{data.staff_on_duty} nhân sự đã check-in hoặc trong ca</small></p><em className="ok">Đã cập nhật</em></div></div></article>
        <article className="dashboard-panel"><header className="dashboard-panel-header"><div><h3>Giao dịch mới nhất</h3><p>Các giao dịch ghi nhận gần đây</p></div><button onClick={() => setActive('transactions')}>Xem tất cả</button></header><div className="dashboard-transaction-list">{data.recent_transactions.length ? data.recent_transactions.map(transaction => <div key={transaction.id}><span className={`dashboard-channel-dot ${transaction.channel}`} /><p><b>{transaction.transaction_code}</b><small>{transaction.customer_name || 'Khách vãng lai'} · {transaction.channel.toUpperCase()}</small></p><strong>{currency(Number(transaction.amount || 0))}</strong></div>) : <div className="dashboard-empty">Chưa có giao dịch nào được ghi nhận hôm nay.</div>}</div></article>
        <article className="dashboard-panel"><header className="dashboard-panel-header"><div><h3>Phim được quan tâm</h3><p>Xếp theo số ghế đã đặt</p></div><button onClick={() => setActive('movies')}>Kho phim</button></header><ol className="dashboard-movie-list">{data.top_movies.length ? data.top_movies.slice(0, 4).map((movie, index) => <li key={movie.id}><span>{String(index + 1).padStart(2, '0')}</span><p><b>{movie.title}</b><small>{movie.showtimes} suất chiếu</small></p><strong>{Number(movie.booked_seats || 0).toLocaleString('vi-VN')} <small>ghế</small></strong></li>) : <li className="dashboard-empty">Chưa có dữ liệu suất chiếu.</li>}</ol></article>
      </section>
    </div>;
  };

  const renderDashboard = () => {
    return renderExecutiveDashboard();
    if (role === 'super_admin') return (
      <div>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><Ticket size={25} /></div><div><span>Doanh thu hôm nay</span><strong>45.250.000 đ</strong><small>+12.5% so với hôm qua</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><Building2 size={25} /></div><div><span>Rạp đang hoạt động</span><strong>3 Rạp / 19 Phòng</strong><small>14 phòng chiếu online</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Users size={25} /></div><div><span>Tài khoản TMS</span><strong>{tmsUsers.length} tài khoản</strong><small>4 vai trò phân quyền</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><Receipt size={25} /></div><div><span>Yêu cầu chờ duyệt</span><strong>{pendingRefunds} Hoàn tiền</strong><small>Toàn hệ thống</small></div></div>
        </section>
        <section className="charts-grid">
          <div className="card revenue-card">
            <div className="card-title"><div><h2>Doanh thu 7 ngày qua</h2><span>(Toàn chuỗi rạp)</span></div></div>
            <div className="line-chart">
              <div className="y-axis"><span>60M</span><span>45M</span><span>30M</span><span>15M</span><span>0</span></div>
              <div className="chart-body">
                <div className="grid-lines">{[1,2,3,4,5].map(l => <i key={l} />)}</div>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none"><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64 L650 180 L20 180Z" fill="#2774e926" /><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64" fill="none" stroke="#1d6beb" strokeWidth="2.5" /></svg>
                <div className="chart-points">{[28.5,32.7,30.1,42.8,38.6,40.2,45.2].map((v,i) => <div className="point" style={{ left:`${3+i*16.5}%`, top:`${66-(v-28)*3.1}%` }} key={v}><b>{v}M</b><i /><span>{['21','22','23','24','25','26','27'][i]}/09</span></div>)}</div>
              </div>
            </div>
          </div>
          <div className="card channel-card">
            <div className="card-title"><div><h2>Doanh thu theo kênh bán</h2><span>(Theo dõi toàn hệ thống)</span></div></div>
            <div className="channel-content">
              <div className="donut"><strong>45.250.000 đ</strong><span>Tổng doanh thu</span></div>
              <div className="channel-list">
                <div className="channel-row"><i className="bullet blue" /><span>Quầy vé (POS)</span><strong>52.1%<small>23.610.000 đ</small></strong></div>
                <div className="channel-row"><i className="bullet green" /><span>Website / App</span><strong>36.4%<small>16.480.000 đ</small></strong></div>
                <div className="channel-row"><i className="bullet orange" /><span>Đối tác (OTA)</span><strong>11.5%<small>5.160.000 đ</small></strong></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );

    if (role === 'cinema_admin') return (
      <div>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><Ticket size={25} /></div><div><span>Doanh thu rạp hôm nay</span><strong>15.800.000 đ</strong><small>+8.3% so với hôm qua</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><CalendarDays size={25} /></div><div><span>Suất chiếu hôm nay</span><strong>18 Suất</strong><small>6 phòng hoạt động</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><Film size={25} /></div><div><span>Phim được phân bổ</span><strong>4 Phim</strong><small>Đang chiếu tại rạp</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Users size={25} /></div><div><span>Nhân sự đang trực</span><strong>12 Nhân viên</strong><small>Ca sáng + Ca chiều</small></div></div>
        </section>
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#fff8ed', border: '1px solid #fed7aa', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.83rem', color: '#92400e' }}>
            <b>Lưu ý phân quyền:</b> Bạn chỉ triển khai phim từ danh sách đã được <b>Admin Tổng phân bổ</b>. Không thể tự ý thêm phim mới ngoài kế hoạch.
          </div>
        </div>
        <section className="charts-grid" style={{ marginTop: 20 }}>
          <div className="card revenue-card">
            <div className="card-title"><div><h2>Doanh thu rạp 7 ngày</h2><span>(Aurora Cinema Tân Bình)</span></div></div>
            <div className="line-chart">
              <div className="y-axis"><span>20M</span><span>15M</span><span>10M</span><span>5M</span><span>0</span></div>
              <div className="chart-body">
                <div className="grid-lines">{[1,2,3,4,5].map(l => <i key={l} />)}</div>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none"><path d="M20 140 L130 120 L230 130 L330 90 L430 105 L530 95 L650 75 L650 180 L20 180Z" fill="#3b82f626" /><path d="M20 140 L130 120 L230 130 L330 90 L430 105 L530 95 L650 75" fill="none" stroke="#2563eb" strokeWidth="2.5" /></svg>
                <div className="chart-points">{[9.5,12.1,10.8,14.2,13.6,14.8,15.8].map((v,i) => <div className="point" style={{ left:`${3+i*16.5}%`, top:`${70-(v-9)*4}%` }} key={v}><b>{v}M</b><i /><span>{['21','22','23','24','25','26','27'][i]}/09</span></div>)}</div>
              </div>
            </div>
          </div>
          <div className="card channel-card">
            <div className="card-title"><div><h2>Phim đang chiếu tại rạp</h2><span>(Được phân bổ từ Admin Tổng)</span></div></div>
            <div style={{ padding: '8px 16px' }}>
              {['Avatar: Dòng Chảy Của Nước','Dune: Hành Tinh Cát - Phần 2','Oppenheimer','Mai (Trấn Thành Film)'].map((m,i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m}</div>
                  <span style={{ fontSize: '0.72rem', background: '#d1fae5', color: '#065f46', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>✅ Phân bổ từ AT</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    );

    if (role === 'supervisor') return (
      <div>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon green"><Tv size={25} /></div><div><span>Phòng chiếu Online</span><strong>5 / 6 Phòng</strong><small>1 phòng Standby</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><ShowtimeIcon size={25} /></div><div><span>Suất đang chiếu</span><strong>4 Suất</strong><small>Đúng tiến độ lịch</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><Users size={25} /></div><div><span>Nhân sự ca trực</span><strong>5 Người</strong><small style={{ color: '#dc2626' }}>1 vắng mặt cần xử lý</small></div></div>
          <div className="stat-card"><div className="stat-icon red"><Receipt size={25} /></div><div><span>Chờ phê duyệt</span><strong style={{ color: totalNotif > 0 ? '#dc2626' : 'inherit' }}>{totalNotif} Yêu cầu</strong><small>{pendingRefunds} hoàn tiền · {cancelRequests} hủy GD</small></div></div>
        </section>

        {/* Pending approvals widget */}
        {totalNotif > 0 && (
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {cancelRequests > 0 && (
              <div className="tms-card-table" style={{ padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, color: '#92400e', background: '#fffbeb' }}>
                  <Receipt size={16} /> {cancelRequests} yêu cầu hủy giao dịch cần phê duyệt
                </div>
                {txnsList.filter(t => t.cancel_requested).map(t => (
                  <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{t.transaction_code}</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>KH: {t.customer_name} • {t.amount.toLocaleString('vi-VN')} đ</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="tms-btn tms-btn-success" style={{ padding: '4px 10px', fontSize: '0.73rem' }} onClick={() => handleCancelTxn(t.id, true)}><Check size={12} /> Duyệt hủy</button>
                      <button className="tms-btn tms-btn-danger" style={{ padding: '4px 10px', fontSize: '0.73rem' }} onClick={() => handleCancelTxn(t.id, false)}><X size={12} /> Từ chối</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pendingRefunds > 0 && (
              <div className="tms-card-table" style={{ padding: 0 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 8, color: '#065f46', background: '#f0fdf4' }}>
                  <DollarSign size={16} /> {pendingRefunds} yêu cầu hoàn tiền cần phê duyệt
                </div>
                {refundsList.filter(r => r.status === 'pending').map(r => (
                  <div key={r.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.84rem' }}>{r.transaction_code} — {r.amount.toLocaleString('vi-VN')} đ</div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{r.reason}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button className="tms-btn tms-btn-success" style={{ padding: '4px 10px', fontSize: '0.73rem' }} onClick={() => handleRefundApproval(r.id, 'approved')}><Check size={12} /> Duyệt</button>
                      <button className="tms-btn tms-btn-danger" style={{ padding: '4px 10px', fontSize: '0.73rem' }} onClick={() => handleRefundApproval(r.id, 'rejected')}><X size={12} /> Từ chối</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Screen monitor */}
        <div style={{ marginTop: 20 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 12 }}>Trạng thái phòng chiếu ca trực</h3>
          <div className="screens-grid">
            {screensList.slice(0, 3).map(s => (
              <div className="screen-monitor-card" key={s.id}>
                <div className="screen-card-header">
                  <span className="screen-code-pill">{s.screen_code}</span>
                  <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: s.projector_status === 'online' ? '#d1fae5' : '#fef3c7', color: s.projector_status === 'online' ? '#065f46' : '#92400e' }}>{s.projector_status.toUpperCase()}</span>
                </div>
                <div className="screen-name-title">{s.name}</div>
                <div className="screen-specs-row">
                  <div className="screen-spec-item"><span className="screen-spec-label">HVAC</span><span className="screen-spec-value"><Thermometer size={13} color="#059669" /> {s.hvac_temperature}°C</span></div>
                  <div className="screen-spec-item"><span className="screen-spec-label">Âm thanh</span><span className="screen-spec-value"><Volume2 size={13} /> {s.sound_system_status}</span></div>
                </div>
                <div className="screen-controls-row">
                  <div className="temp-control-box">
                    <span style={{ fontSize: '0.74rem', color: '#64748b' }}>HVAC:</span>
                    <button className="temp-btn" onClick={() => adjustTemp(s.id, -0.5)}>-</button>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>{s.hvac_temperature}°C</span>
                    <button className="temp-btn" onClick={() => adjustTemp(s.id, 0.5)}>+</button>
                  </div>
                  <button className="tms-btn tms-btn-outline" style={{ padding: '4px 10px', fontSize: '0.74rem' }} onClick={() => toggleProjector(s.id)}>Đổi máy chiếu</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

    // ACCOUNTING dashboard
    return (
      <div>
        <section className="stats-grid">
          <div className="stat-card"><div className="stat-icon blue"><DollarSign size={25} /></div><div><span>Doanh thu hôm nay</span><strong>45.250.000 đ</strong><small>Toàn kênh thanh toán</small></div></div>
          <div className="stat-card"><div className="stat-icon green"><Receipt size={25} /></div><div><span>Giao dịch hôm nay</span><strong>356 GD</strong><small>Đã đối soát 98%</small></div></div>
          <div className="stat-card"><div className="stat-icon orange"><CreditCard size={25} /></div><div><span>Thanh toán điện tử</span><strong>234 GD</strong><small>VNPAY + Thẻ ngân hàng</small></div></div>
          <div className="stat-card"><div className="stat-icon purple"><DollarSign size={25} /></div><div><span>Chờ hoàn tiền</span><strong>{pendingRefunds} Phiếu</strong><small>Tổng: {refundsList.filter(r=>r.status==='pending').reduce((a,r)=>a+r.amount,0).toLocaleString('vi-VN')} đ</small></div></div>
        </section>
        <section className="charts-grid" style={{ marginTop: 20 }}>
          <div className="card revenue-card">
            <div className="card-title"><div><h2>Doanh thu 7 ngày</h2><span>(Đối soát kế toán)</span></div></div>
            <div className="line-chart">
              <div className="y-axis"><span>60M</span><span>45M</span><span>30M</span><span>15M</span><span>0</span></div>
              <div className="chart-body">
                <div className="grid-lines">{[1,2,3,4,5].map(l=><i key={l}/>)}</div>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none"><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64 L650 180 L20 180Z" fill="#8b5cf626"/><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64" fill="none" stroke="#7c3aed" strokeWidth="2.5"/></svg>
                <div className="chart-points">{[28.5,32.7,30.1,42.8,38.6,40.2,45.2].map((v,i)=><div className="point" style={{left:`${3+i*16.5}%`,top:`${66-(v-28)*3.1}%`}} key={v}><b>{v}M</b><i/><span>{['21','22','23','24','25','26','27'][i]}/09</span></div>)}</div>
              </div>
            </div>
          </div>
          <div className="card channel-card">
            <div className="card-title"><div><h2>Đối soát kênh thanh toán</h2><span>(Hôm nay)</span></div></div>
            <div className="channel-content">
              <div className="donut"><strong>45.250.000 đ</strong><span>Tổng doanh thu</span></div>
              <div className="channel-list">
                <div className="channel-row"><i className="bullet blue"/><span>Quầy vé (POS)</span><strong>52.1%<small>23.610.000 đ</small></strong></div>
                <div className="channel-row"><i className="bullet green"/><span>Website / App</span><strong>36.4%<small>16.480.000 đ</small></strong></div>
                <div className="channel-row"><i className="bullet orange"/><span>Đối tác (OTA)</span><strong>11.5%<small>5.160.000 đ</small></strong></div>
              </div>
            </div>
          </div>
        </section>
        {/* Pending refunds for accounting */}
        {pendingRefunds > 0 && (
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize:'1rem', fontWeight:800, marginBottom:12 }}>Phiếu hoàn tiền chờ xử lý</h3>
            <div className="tms-card-table">
              <table className="tms-data-table">
                <thead><tr><th>Mã GD</th><th>Khách hàng</th><th>Lý do</th><th>Số tiền</th><th>Thao tác</th></tr></thead>
                <tbody>{refundsList.filter(r=>r.status==='pending').map(r=>(
                  <tr key={r.id}>
                    <td><code>{r.transaction_code}</code></td>
                    <td>{r.customer_name}</td>
                    <td style={{fontSize:'0.8rem',color:'#64748b'}}>{r.reason}</td>
                    <td style={{fontWeight:700,color:'#d97706'}}>{r.amount.toLocaleString('vi-VN')} đ</td>
                    <td>
                      <div style={{display:'flex',gap:4}}>
                        <button className="tms-btn tms-btn-success" style={{padding:'3px 8px',fontSize:'0.73rem'}} onClick={()=>handleRefundApproval(r.id,'approved')}><Check size={12}/> Duyệt</button>
                        <button className="tms-btn tms-btn-danger" style={{padding:'3px 8px',fontSize:'0.73rem'}} onClick={()=>handleRefundApproval(r.id,'rejected')}><X size={12}/> Từ chối</button>
                      </div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    const a = active;

    if (a === 'dashboard' || a === 'Tổng quan tài chính') return renderDashboard();

    // ACCOUNTS & PERMISSIONS (super_admin only)
    if (a === 'accounts' || a === 'Danh sách tài khoản' || a === 'Ma trận phân quyền') {
      const isMatrix = a === 'Ma trận phân quyền';
      const accountRows = tmsUsers.filter(user => {
        const text = `${user.full_name || ''} ${user.username || ''} ${user.phone || ''} ${user.theater_name || ''}`.toLocaleLowerCase();
        return (!accountSearch || text.includes(accountSearch.toLocaleLowerCase())) && (accountRoleFilter === 'all' || user.role === accountRoleFilter) && (accountStatusFilter === 'all' || user.status === accountStatusFilter);
      });
      const activeAccountCount = tmsUsers.filter(user => user.status === 'active').length;
      const lockedAccountCount = tmsUsers.filter(user => user.status === 'locked' || user.status === 'inactive').length;
      if (!isMatrix) return (
        <div>
          <div className="tms-tabs-bar account-root-tabs">
            <button className="tms-tab-btn active" onClick={() => setActive('Danh sách tài khoản')}><Users size={16}/><span>Trung tâm tài khoản</span></button>
            <button className="tms-tab-btn" onClick={() => setActive('Ma trận phân quyền')}><ShieldCheck size={16}/><span>Ma trận phân quyền nội bộ</span></button>
          </div>
          <AccountManagementPage
            internalUsers={tmsUsers as any}
            customerUsers={customerUsers as any}
            summary={accountSummary}
            loading={accountsLoading}
            formatLastLogin={formatLastLogin}
            onRefresh={loadUsers}
            onCreateInternal={() => { setUserForm({id:0,username:'',full_name:'',phone:'',email:'',theater_id:0,role:'cinema_admin',password:'',status:'active'}); setShowUserPassword(false); setShowUserModal(true); }}
            onEditInternal={(u:any) => { setUserForm({id:u.id||0,username:u.username,full_name:u.full_name,phone:u.phone||'',email:u.email||'',theater_id:Number(u.theater_id||0),role:u.role as TMSRole,password:'',status:u.status||'active'}); setShowUserPassword(false); setShowUserModal(true); }}
            onToggleInternal={(u:any) => toggleUserStatus(u as TMSUser)}
            onDeleteInternal={(u:any) => deleteUserAccount(u as TMSUser)}
            onToggleCustomer={(u:any) => toggleCustomerStatus(u as TMSUser)}
          />
        </div>
      );
      return (
        <div>
          <div className="tms-tabs-bar">
            <button className={`tms-tab-btn ${!isMatrix ? 'active' : ''}`} onClick={() => setActive('Danh sách tài khoản')}><Users size={16}/><span>Danh sách tài khoản ({tmsUsers.length})</span></button>
            <button className={`tms-tab-btn ${isMatrix ? 'active' : ''}`} onClick={() => setActive('Ma trận phân quyền')}><ShieldCheck size={16}/><span>Ma trận phân quyền RBAC</span></button>
          </div>
          {!isMatrix ? (
            <div className="account-admin-page">
              <section className="account-overview-grid">
                <article><span className="account-overview-icon blue"><Users size={20}/></span><div><small>Tổng tài khoản</small><b>{tmsUsers.length}</b><em>Đồng bộ từ Aurora DB</em></div></article>
                <article><span className="account-overview-icon green"><CheckCircle2 size={20}/></span><div><small>Đang hoạt động</small><b>{activeAccountCount}</b><em>Có thể đăng nhập hệ thống</em></div></article>
                <article><span className="account-overview-icon amber"><Lock size={20}/></span><div><small>Tạm khóa</small><b>{lockedAccountCount}</b><em>Đã hạn chế truy cập</em></div></article>
                <article><span className="account-overview-icon violet"><ShieldCheck size={20}/></span><div><small>Vai trò đang dùng</small><b>{new Set(tmsUsers.map(user => user.role)).size}/4</b><em>Phân quyền RBAC tập trung</em></div></article>
              </section>
              <div className="tms-card-table account-management-table">
              <div className="account-table-heading"><div><span>QUẢN TRỊ NGƯỜI DÙNG</span><h2>Tài khoản vận hành TMS</h2><p>Thêm, phân quyền và kiểm soát truy cập trực tiếp trên Aurora DB.</p></div><button type="button" className="account-create-button" onClick={() => { setUserForm({id:0,username:'',full_name:'',phone:'',email:'',theater_id:0,role:'cinema_admin',password:'',status:'active'}); setShowUserPassword(false); setShowUserModal(true); }}><Plus size={17}/><span>Thêm tài khoản</span></button></div>
              <div className="tms-table-toolbar account-toolbar">
                <div className="tms-search-input"><Search size={16} color="#94a3b8"/><input value={accountSearch} onChange={e => setAccountSearch(e.target.value)} placeholder="Tìm tên, rạp phụ trách, username hoặc SĐT..." /></div>
                <select value={accountRoleFilter} onChange={e => setAccountRoleFilter(e.target.value as 'all' | TMSRole)}><option value="all">Tất cả vai trò</option><option value="super_admin">Admin Tổng</option><option value="cinema_admin">Admin Rạp</option><option value="supervisor">Supervisor</option><option value="accounting">Kế toán</option></select>
                <select value={accountStatusFilter} onChange={e => setAccountStatusFilter(e.target.value as 'all' | 'active' | 'locked')}><option value="all">Mọi trạng thái</option><option value="active">Đang hoạt động</option><option value="locked">Tạm khóa</option></select>
                <button className="account-refresh-btn" type="button" onClick={loadUsers} title="Tải lại từ Aurora DB"><RefreshCw size={15}/> Làm mới</button>
              </div>
              <table className="tms-data-table">
                <thead><tr><th>ID</th><th>Họ và Tên</th><th>Rạp phụ trách</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th>Thao tác</th></tr></thead>
                <tbody>{accountRows.map(u => {
                  const ucfg = ROLE_CONFIGS[u.role as TMSRole] || ROLE_CONFIGS.cinema_admin;
                  const thName = u.theater_name || theatersList.find(t => Number(t.id) === Number(u.theater_id))?.name || (u.theater_id ? `Rạp #${u.theater_id}` : '');
                  return (
                    <tr key={u.id}>
                      <td style={{fontWeight:700,color:'#64748b'}}>#{u.id}</td>
                      <td>
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <div style={{width:32,height:32,borderRadius:8,background:ucfg.bg,color:ucfg.color,fontWeight:800,display:'grid',placeItems:'center',fontSize:'1rem'}}>{ucfg.emoji}</div>
                          <div>
                            <div style={{fontWeight:700}}>{u.full_name}</div>
                            <div style={{fontSize:'0.74rem',color:'#64748b'}}>{ucfg.tagline}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {(() => {
                          if (u.role === 'super_admin') {
                            return (
                              <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 9px',borderRadius:6,fontSize:'0.78rem',fontWeight:700,background:'#fffbeb',border:'1px solid #fef3c7',color:'#b45309'}}>
                                <Globe size={13} color="#d97706"/> Toàn hệ thống
                              </span>
                            );
                          }
                          if (!thName) {
                            if (u.role === 'accounting') {
                              return (
                                <span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 9px',borderRadius:6,fontSize:'0.78rem',fontWeight:600,background:'#f8fafc',border:'1px solid #e2e8f0',color:'#475569'}}>
                                  <Building2 size={13} color="#64748b"/> Toàn hệ thống
                                </span>
                              );
                            }
                            return (
                              <span style={{fontSize:'0.78rem',color:'#94a3b8',fontStyle:'italic',display:'inline-flex',alignItems:'center',gap:4}}>
                                Chưa phân rạp
                              </span>
                            );
                          }
                          return (
                            <div style={{display:'inline-flex',alignItems:'center',gap:6,fontWeight:600,fontSize:'0.82rem',color:'#0f172a'}}>
                              <Building2 size={15} color="#2563eb" style={{flexShrink:0}}/>
                              <span>{thName}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td>{u.phone || '—'}</td>
                      <td><span className={`role-badge-pill ${u.role}`}>{ucfg.name}</span></td>
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,fontSize:'0.74rem',fontWeight:700,background:u.status==='active'?'#ecfdf5':'#fee2e2',color:u.status==='active'?'#065f46':'#991b1b'}}>{u.status==='active'?<CheckCircle2 size={12}/>:<XCircle size={12}/>}{u.status==='active'?'Hoạt động':'Tạm khóa'}</span></td>
                      <td style={{fontSize:'0.8rem',color:'#64748b'}}>{formatLastLogin(u.last_login)}</td>
                      <td><div style={{display:'inline-flex',gap:6}}><button className="tms-btn tms-btn-outline" style={{padding:'5px 8px'}} onClick={()=>{setUserForm({id:u.id||0,username:u.username,full_name:u.full_name,phone:u.phone||'',email:u.email||'',theater_id:Number(u.theater_id||0),role:u.role,password:'',status:u.status||'active'});setShowUserPassword(false);setShowUserModal(true);}} title="Chỉnh sửa"><Edit size={14}/></button><button className="tms-btn tms-btn-outline" style={{padding:'5px 8px',color:u.status==='active'?'#dc2626':'#059669'}} onClick={()=>toggleUserStatus(u)} title={u.status==='active'?'Tạm khóa tài khoản':'Mở khóa tài khoản'}>{u.status==='active'?<Lock size={14}/>:<Check size={14}/>}</button><button className="tms-btn tms-btn-outline" style={{padding:'5px 8px',color:'#dc2626',borderColor:'#fecaca',background:'#fff5f5'}} onClick={()=>deleteUserAccount(u)} title="Xóa vĩnh viễn tài khoản"><Trash2 size={14}/></button></div></td>
                    </tr>
                  );
                })}{accountRows.length === 0 && <tr><td colSpan={8}><div className="account-empty-state"><Users size={25}/><b>Không tìm thấy tài khoản phù hợp</b><span>Thay đổi bộ lọc hoặc tạo tài khoản mới trong Aurora DB.</span></div></td></tr>}</tbody>
              </table>
              </div>
            </div>
          ) : (
            <div className="rbac-table-container">
              <div className="rbac-heading">
                <div><span>CHÍNH SÁCH TRUY CẬP · AURORA_DB</span><h3>Ma trận phân quyền RBAC</h3><p>Mỗi ô xác định quyền thao tác của một vai trò với một phân hệ. Chỉ Admin Tổng được sửa; mọi lần lưu đều có Audit Log.</p></div>
                <div className="rbac-actions">
                  {rbacEditing ? <><button type="button" className="tms-btn tms-btn-outline" disabled={rbacSaving} onClick={()=>{setRbacEditing(false); void loadRbacMatrix();}}>Hủy</button><button type="button" className="tms-btn tms-btn-primary" disabled={rbacSaving} onClick={saveRbacMatrix}>{rbacSaving ? 'Đang lưu…' : 'Lưu chính sách'}</button></> : <><button type="button" className="tms-btn tms-btn-outline" onClick={()=>void loadRbacMatrix()}><RefreshCw size={15}/> Đồng bộ</button><button type="button" className="tms-btn tms-btn-primary" onClick={()=>setRbacEditing(true)}><Edit size={15}/> Chỉnh sửa</button></>}
                </div>
              </div>
              <div className="rbac-legend"><span><i className="full"/>Toàn quyền</span><span><i className="manage"/>Quản lý</span><span><i className="view"/>Chỉ xem</span><span><i className="none"/>Không truy cập</span><em>Thay đổi áp dụng cho chính sách RBAC được công bố trong TMS; các phiên đã đăng nhập nên đăng nhập lại để nhận phạm vi mới.</em></div>
              {rbacLoading ? <div className="rbac-loading">Đang tải chính sách phân quyền từ aurora_db…</div> : <div className="rbac-table-scroll"><table className="rbac-matrix-table">
                <thead><tr>
                  <th style={{width:'24%'}}>Use Case / Phân hệ</th>
                  <th><div className="rbac-col-header" style={{color:'#d97706'}}>👑 Admin Tổng</div></th>
                  <th><div className="rbac-col-header" style={{color:'#2563eb'}}>🏢 Admin Rạp</div></th>
                  <th><div className="rbac-col-header" style={{color:'#059669'}}>🛡️ Supervisor</div></th>
                  <th><div className="rbac-col-header" style={{color:'#7c3aed'}}>📊 Kế Toán</div></th>
                </tr></thead>
                <tbody>
                  {rbacMatrix.map(row => (
                    <tr key={row.key}>
                      <td><b style={{fontSize:'0.84rem'}}>{row.module}</b><small className="rbac-module-key">{row.key}</small></td>
                      {(['super_admin','cinema_admin','supervisor','accounting'] as TMSRole[]).map(roleCode => { const grant=row.permissions[roleCode] || {level:'none' as PermissionLevel,note:''}; return <td key={roleCode}><div className={`rbac-grant ${grant.level}`}>{rbacEditing ? <><select aria-label={`Quyền ${roleCode} tại ${row.module}`} value={grant.level} onChange={event=>updateRbacGrant(row.key,roleCode,{level:event.target.value as PermissionLevel})}><option value="full">Toàn quyền</option><option value="manage">Quản lý</option><option value="view">Chỉ xem</option><option value="none">Không truy cập</option></select><input value={grant.note || ''} maxLength={255} onChange={event=>updateRbacGrant(row.key,roleCode,{note:event.target.value})} placeholder="Ghi chú phạm vi" /></> : <><b>{grant.level==='full'?'Toàn quyền':grant.level==='manage'?'Quản lý':grant.level==='view'?'Chỉ xem':'Không truy cập'}</b>{grant.note && <span>{grant.note}</span>}</>}</div></td>; })}
                    </tr>
                  ))}
                  {!rbacMatrix.length && <tr><td colSpan={5}><div className="rbac-loading">Chưa có chính sách RBAC trong aurora_db.</div></td></tr>}
                </tbody>
              </table></div>}
            </div>
          )}
        </div>
      );
    }

    // CINEMA SYSTEM — toàn bộ chuỗi rạp dành cho Admin Tổng
    if (a === 'cinemas' || a === 'Hệ thống rạp') {
      const overview = cinemaSystemData;
      const selectedCinema = overview?.theaters.find(theater=>Number(theater.id)===Number(selectedCinemaId));
      const systemSeatRows = Array.from(new Set((roomSeatMap?.seats || []).map(seat=>seat.seat_row)));
      const systemSelectedSeats = (roomSeatMap?.seats || []).filter(seat=>selectedRoomSeatIds.includes(Number(seat.id)));
      const systemSelectionMode = systemSelectedSeats[0]?.seat_status === 'locked' ? 'unlock' : 'lock';
      return <div className="cinema-system-page">
        <section className="cinema-system-toolbar"><label><CalendarDays size={17}/><span><small>Ngày vận hành</small><VietnameseDateInput value={cinemaSystemDate} onChange={date=>{setCinemaSystemDate(date);setRoomScheduleDate(date);setRoomScreenId(0);setRoomSeatMap(null);void loadCinemaSystemOverview(selectedCinemaId,date);}} ariaLabel="Ngày vận hành"/></span></label></section>

        {cinemaSystemLoading && !overview ? <div className="cinema-system-loading"><div className="dashboard-loading-mark"/>Đang tổng hợp dữ liệu toàn hệ thống…</div> : cinemaSystemError ? <div className="cinema-system-error"><AlertTriangle size={22}/><div><b>Không thể tải Hệ thống rạp</b><span>{cinemaSystemError}</span></div><button onClick={()=>void loadCinemaSystemOverview()}>Thử lại</button></div> : <>
          <section className="cinema-system-kpis">
            <article><span className="blue"><Building2 size={20}/></span><div><small>Cụm rạp</small><b>{overview?.summary.theaters || 0}</b><em>Đang quản lý tập trung</em></div></article>
            <article><span className="green"><Monitor size={20}/></span><div><small>Phòng chiếu</small><b>{overview?.summary.active_screens || 0}<i>/{overview?.summary.screens || 0}</i></b><em>Phòng đang hoạt động</em></div></article>
            <article><span className="violet"><Ticket size={20}/></span><div><small>Suất trong ngày</small><b>{overview?.summary.showtimes || 0}</b><em>{Number(overview?.summary.booked_seats || 0).toLocaleString('vi-VN')} ghế đã đặt</em></div></article>
            <article><span className="amber"><Users size={20}/></span><div><small>Tổng sức chứa</small><b>{Number(overview?.summary.seats || 0).toLocaleString('vi-VN')}</b><em>{overview?.summary.locked_seats || 0} ghế đang khóa</em></div></article>
          </section>

          <section className="cinema-network-panel">
            <header><div><small>MẠNG LƯỚI AURORA CINEMA</small><h3>{selectedCinema?'Rạp đang chọn':'Toàn bộ cụm rạp'}</h3><p>{selectedCinema?`${selectedCinema.name} · ${selectedCinema.address}`:`Dữ liệu ngày ${formatVietnameseDate(cinemaSystemDate)} từ aurora_db`}</p></div><div className="cinema-network-actions">{selectedCinemaId>0&&<button onClick={()=>selectCinemaSystemTheater(0)}><Globe size={15}/> Xem toàn hệ thống</button>}<button className="refresh" disabled={cinemaSystemLoading} onClick={()=>void loadCinemaSystemOverview()}><RefreshCw size={15}/> Làm mới</button></div></header>
            <div className="cinema-network-grid">{overview?.theaters.map(theater=><button type="button" key={theater.id} className={Number(theater.id)===Number(selectedCinemaId)?'active':''} onClick={()=>selectCinemaSystemTheater(Number(theater.id))}>
              <span className="cinema-network-icon"><Building2 size={21}/></span><span className="cinema-network-name"><small>{theater.city||'TP. Hồ Chí Minh'}</small><b>{theater.name}</b><em><MapPin size={12}/>{theater.address}</em></span>
              <span className="cinema-network-metrics"><i><b>{theater.total_screens}</b> phòng</i><i><b>{theater.showtimes}</b> suất</i><i><b>{theater.booked_seats}</b> ghế đặt</i></span>
              <span className="cinema-network-footer"><i className={theater.status==='active'?'online':''}/>{theater.status==='active'?'Đang hoạt động':'Tạm ngưng'}<em>{theater.admin_name}</em></span>
            </button>)}</div>
          </section>

          {selectedCinema && <section className="cinema-detail-panel">
            <header><div><span><Building2 size={18}/></span><div><small>CHI TIẾT CỤM RẠP</small><h3>{selectedCinema.name}</h3><p>{selectedCinema.admin_name} phụ trách · {selectedCinema.total_seats} ghế toàn rạp</p></div></div><em>{overview?.screens.length || 0} phòng chiếu</em></header>
            <div className="cinema-room-grid">{overview?.screens.map(screen=><button type="button" key={screen.id} className={Number(roomScreenId)===Number(screen.id)?'active':''} onClick={()=>{setRoomScreenId(Number(screen.id));setRoomScheduleDate(cinemaSystemDate);setRoomShowtimeId(0);setSelectedRoomSeatIds([]);void loadRoomSeatMap(Number(screen.id),cinemaSystemDate);}}>
              <span className="cinema-room-top"><i><Monitor size={17}/></i><em className={screen.status==='active'?'online':''}>{screen.status==='active'?'Sẵn sàng':'Tạm ngưng'}</em></span><b>{screenDisplayName(screen.name,screen.id)}</b><small>{screen.screen_code} · {screen.screen_type}</small>
              <span className="cinema-room-stats"><i><b>{screen.total_seats}</b> ghế</i><i><b>{screen.showtimes}</b> suất</i><i><b>{screen.booked_seats}</b> đã đặt</i></span><span className="cinema-room-next"><Clock size={13}/>{screen.first_showtime?`${String(screen.first_showtime).slice(11,16)} · ${screen.first_movie}`:'Chưa có lịch trong ngày'}</span>
            </button>)}</div>

            {roomScreenId>0 && <div className="cinema-room-workspace">
              <header><div><span>{roomSeatMap?.screen.screen_code}</span><h3>{roomSeatMap?.screen.name || 'Đang tải phòng chiếu…'}</h3><p>{formatVietnameseDate(cinemaSystemDate)} · {roomSeatMap?.screen.total_seats || 0} ghế</p></div><button disabled={roomSeatMapLoading} onClick={()=>void loadRoomSeatMap(roomScreenId,cinemaSystemDate,roomShowtimeId)}><RefreshCw size={14}/> Làm mới phòng</button></header>
              {roomSeatMapLoading ? <div className="room-seat-loading"><div className="dashboard-loading-mark"/>Đang tải lịch và sơ đồ ghế…</div> : roomSeatMap && <>
                <div className="cinema-room-showtimes"><div className="room-section-title"><div><Clock size={17}/><span><b>Lịch chiếu trong ngày</b><small>Chọn suất để xem tình trạng ghế</small></span></div><em>{roomSeatMap.showtimes.length} suất</em></div><div>{roomSeatMap.showtimes.length?roomSeatMap.showtimes.map(showtime=><button type="button" key={showtime.id} className={Number(roomShowtimeId)===Number(showtime.id)?'active':''} onClick={()=>{setRoomShowtimeId(Number(showtime.id));setSelectedRoomSeatIds([]);void loadRoomSeatMap(roomScreenId,cinemaSystemDate,Number(showtime.id));}}><time>{String(showtime.starts_at).slice(11,16)}</time><span><b>{showtime.movie_title}</b><small>{String(showtime.ends_at).slice(11,16)} · {showtime.booked_seats} ghế đặt</small></span></button>):<p><CalendarDays size={18}/> Phòng chưa có suất chiếu trong ngày này.</p>}</div></div>
                <div className="cinema-system-seat-layout"><div className="room-seat-map-card"><div className="room-section-title"><div><Ticket size={17}/><span><b>{roomSeatMap.selected_showtime?'Sơ đồ ghế theo suất':'Sơ đồ ghế phòng chiếu'}</b><small>{roomSeatMap.selected_showtime?`${roomSeatMap.selected_showtime.movie_title} · ${String(roomSeatMap.selected_showtime.starts_at).slice(11,16)}`:'Chọn suất chiếu để quản lý trạng thái ghế.'}</small></span></div><em>{roomSeatMap.seats.length} ghế</em></div><div className="cinema-screen-shape"><span>MÀN HÌNH</span></div><div className="room-seat-scroll"><div className="room-seat-rows">{systemSeatRows.map(row=><div className="room-seat-row" key={row}><b>{row}</b><div>{roomSeatMap.seats.filter(seat=>seat.seat_row===row).map(seat=><button type="button" key={seat.id} disabled={!roomSeatMap.selected_showtime||seat.seat_status==='booked'||seat.seat_status==='held'||seatLockSaving} className={`room-seat ${seat.seat_type.toLowerCase()} ${seat.seat_status} ${selectedRoomSeatIds.includes(Number(seat.id))?'selected':''}`} onClick={()=>toggleRoomSeat(seat)} title={seat.lock_reason||seat.seat_status}><span>{seat.seat_number}</span></button>)}</div><b>{row}</b></div>)}</div></div><div className="room-seat-legend"><span><i className="available"/>Còn trống</span><span><i className="selected"/>Đang chọn</span><span><i className="booked"/>Đã đặt</span><span><i className="held"/>Đang giữ</span><span><i className="locked"/>Rạp khóa</span><span><i className="vip"/>VIP</span><span><i className="couple"/>Ghế đôi</span></div></div>
                  <aside className="room-seat-control"><header><ShieldCheck size={20}/><span><small>QUẢN TRỊ TOÀN HỆ THỐNG</small><b>{roomSeatMap.selected_showtime?.movie_title||'Chưa chọn suất chiếu'}</b></span></header>{roomSeatMap.selected_showtime?<><div className="room-seat-summary"><span><small>Còn trống</small><b>{roomSeatMap.summary.available}</b></span><span><small>Đã đặt</small><b>{roomSeatMap.summary.booked}</b></span><span><small>Đang giữ</small><b>{roomSeatMap.summary.held}</b></span><span><small>Rạp khóa</small><b>{roomSeatMap.summary.locked}</b></span></div><div className="room-selection-summary"><small>GHẾ ĐANG CHỌN</small><b>{systemSelectedSeats.length?systemSelectedSeats.map(seat=>seat.seat_row+seat.seat_number).join(', '):'Chưa chọn ghế'}</b><p>Admin Tổng có thể khóa hoặc mở khóa ghế của đúng suất chiếu đang chọn.</p></div>{systemSelectionMode==='lock'&&<label className="room-lock-reason"><span>Lý do khóa ghế</span><textarea rows={3} maxLength={255} value={seatLockReason} onChange={event=>setSeatLockReason(event.target.value)} placeholder="Nhập lý do vận hành…"/></label>}<button type="button" className={`room-seat-action ${systemSelectionMode}`} disabled={!systemSelectedSeats.length||seatLockSaving} onClick={()=>void saveRoomSeatLocks(systemSelectionMode)}>{systemSelectionMode==='unlock'?<><Lock size={16}/> Mở khóa {systemSelectedSeats.length} ghế</>:<><ShieldAlert size={16}/> Khóa {systemSelectedSeats.length} ghế</>}</button></>:<div className="room-selection-summary"><small>HƯỚNG DẪN</small><b>Chọn một suất chiếu</b><p>Tình trạng ghế đặt, giữ và khóa được quản lý độc lập theo từng suất.</p></div>}<footer><span><i/> Đồng bộ Aurora DB</span><small>Phạm vi: {selectedCinema.name}</small></footer></aside>
                </div>
              </>}
            </div>}
          </section>}
        </>}
      </div>;
    }

    // ========================================================
    // KẾ HOẠCH PHIM THEO THÁNG (USE CASE 6 - ADMIN TỔNG)
    // ========================================================
    if (a === 'Kế hoạch phim') {
      const planningMonths = Array.from({ length: 12 }, (_, index) => index + 1);
      const monthLabel = (month: number) => `Tháng ${String(month).padStart(2, '0')}`;
      const monthPlans = moviePlans.filter(p => Number(p.plan_month) === planMonth && Number(p.plan_year) === planYear);
      const filteredPlans = monthPlans.filter(p => {
        const matchesQuery = !planSearch || p.movie_title.toLowerCase().includes(planSearch.toLowerCase()) || p.plan_name.toLowerCase().includes(planSearch.toLowerCase());
        const matchesStatus = planStatusFilter === 'all' || p.status === planStatusFilter;
        return matchesQuery && matchesStatus;
      });

      const totalTargetRev = monthPlans.reduce((sum, p) => sum + Number(p.target_revenue || 0), 0);
      const totalDailyScreenings = monthPlans.reduce((sum, p) => sum + Number(p.target_screenings_per_day || 0), 0);
      const fullyAllocatedCount = monthPlans.filter(p => (p.allocated_count || 0) >= (p.total_theaters || 5)).length;

      return (
        <div>
          {/* Month Switcher Tabs */}
          <div className="tms-tabs-bar tms-plan-month-tabs" style={{ marginBottom: 16 }} role="tablist" aria-label="Chọn tháng kế hoạch phim">
            {planningMonths.map(m => (
              <button
                key={m}
                className={`tms-tab-btn tms-plan-month-tab ${planMonth === m ? 'active' : ''}`}
                onClick={() => handleSelectPlanMonth(m)}
                role="tab"
                aria-selected={planMonth === m}
              >
                <span>{monthLabel(m)}</span>
              </button>
            ))}
          </div>

          {/* Month KPI Summary Cards */}
          <section className="stats-grid" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <div className="stat-icon blue"><Film size={24} /></div>
              <div>
                <span>Phim trong kế hoạch</span>
                <strong>{monthPlans.length} Phim</strong>
                <small>{monthLabel(planMonth)}</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><Target size={24} /></div>
              <div>
                <span>Mục tiêu doanh thu</span>
                <strong>{totalTargetRev.toLocaleString('vi-VN')} đ</strong>
                <small>Áp dụng cho 5 cụm rạp tại TP.HCM</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><CalendarCheck size={24} /></div>
              <div>
                <span>Chỉ tiêu suất chiếu/ngày</span>
                <strong>{totalDailyScreenings} Suất/ngày</strong>
                <small>Tổng cộng các phim</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon purple"><Building2 size={24} /></div>
              <div>
                <span>Phủ 5 rạp TP.HCM</span>
                <strong>{fullyAllocatedCount}/{monthPlans.length} Phim</strong>
                <small>Đã phân bổ đủ 5 cụm rạp</small>
              </div>
            </div>
          </section>

          {/* Main Plans Card Table */}
          <div className="tms-card-table">
            <div className="tms-table-toolbar" style={{ flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                <div className="tms-search-input" style={{ width: '100%', maxWidth: 320 }}>
                  <Film size={16} color="#94a3b8" />
                  <input
                    placeholder="Tìm tên phim trong kế hoạch..."
                    value={planSearch}
                    onChange={e => setPlanSearch(e.target.value)}
                  />
                </div>
                <select
                  className="tms-form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.82rem' }}
                  value={planStatusFilter}
                  onChange={e => setPlanStatusFilter(e.target.value)}
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="draft">Nháp</option>
                  <option value="published">Đã ban hành</option>
                  <option value="in_progress">Đang triển khai</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="tms-btn tms-btn-outline"
                  onClick={() => setActive('Phân bổ phim cho rạp')}
                >
                  <Building2 size={16} />
                  <span>Xem phân bổ cho rạp</span>
                </button>
                <button
                  className="tms-btn tms-btn-primary"
                  onClick={() => {
                    const defaultMovie = moviesList[0] || { id: 1, title: 'Avatar: Dòng Chảy Của Nước', format: '3D IMAX' };
                    setPlanForm({
                      id: 0,
                      plan_code: '',
                      plan_name: `Kế hoạch Phim Tháng ${planMonth < 10 ? `0${planMonth}` : planMonth}/${planYear}`,
                      plan_month: planMonth,
                      plan_year: planYear,
                      movie_id: defaultMovie.id,
                      movie_title: defaultMovie.title,
                      format: defaultMovie.format || '2D Digital',
                      expected_start_date: `${planYear}-${planMonth < 10 ? `0${planMonth}` : planMonth}-01`,
                      expected_end_date: `${planYear}-${planMonth < 10 ? `0${planMonth}` : planMonth}-28`,
                      target_revenue: 500000000,
                      target_screenings_per_day: 6,
                      priority_level: 'high',
                      status: 'draft',
                      note: '',
                      created_by: currentUser?.full_name || currentUser?.username || '',
                      created_at: '',
                      approved_by: '',
                      approved_at: '',
                      updated_by: '',
                      updated_at: '',
                      selected_theaters: [1, 2, 3, 4, 5]
                    });
                    setShowPlanModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Lập kế hoạch phim</span>
                </button>
              </div>
            </div>

            <table className="tms-data-table">
              <thead>
                <tr>
                  <th style={{ width: '22%' }}>Tên Phim & Định dạng</th>
                  <th>Thời gian chiếu dự kiến</th>
                  <th>Độ ưu tiên</th>
                  <th>Chỉ tiêu suất</th>
                  <th>Doanh thu mục tiêu</th>
                  <th>Trạng thái KH</th>
                  <th>Phân bổ 5 rạp TP.HCM</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                      <Film size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                      Chưa có kế hoạch phim cho {monthLabel(planMonth)}. Bấm "<b>+ Lập kế hoạch phim mới</b>" để thêm phim vào kế hoạch tháng!
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map(plan => {
                    const priorityCfg = {
                      blockbuster: { label: '🔥 Bom tấn', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
                      high: { label: '⭐ Ưu tiên cao', bg: '#ffedd5', color: '#c2410c', border: '#fdba74' },
                      medium: { label: '🔷 Tiêu chuẩn', bg: '#e0f2fe', color: '#0369a1', border: '#7dd3fc' },
                      low: { label: '⚪ Thường', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
                    }[plan.priority_level] || { label: plan.priority_level, bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };

                    const statusCfg = {
                      draft: { label: 'Nháp', bg: '#f1f5f9', color: '#475569' },
                      published: { label: 'Đã ban hành', bg: '#e0e7ff', color: '#4338ca' },
                      in_progress: { label: 'Đang triển khai', bg: '#dcfce7', color: '#15803d' },
                      completed: { label: 'Hoàn tất', bg: '#f3e8ff', color: '#7e22ce' },
                      cancelled: { label: 'Hủy', bg: '#fee2e2', color: '#b91c1c' }
                    }[plan.status] || { label: plan.status, bg: '#f1f5f9', color: '#475569' };

                    const allocCount = plan.allocated_count || (plan.allocations ? plan.allocations.length : 0);
                    const isFullyAllocated = allocCount >= 5;

                    return (
                      <tr key={plan.id}>
                        <td>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{plan.movie_title}</div>
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, alignItems: 'center' }}>
                            <span style={{ fontSize: '0.72rem', background: '#eff6ff', color: '#1d4ed8', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                              {plan.format}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{monthLabel(Number(plan.plan_month))}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                            {plan.expected_start_date}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>đến {plan.expected_end_date}</div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.73rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: priorityCfg.bg,
                            color: priorityCfg.color,
                            border: `1px solid ${priorityCfg.border}`,
                            whiteSpace: 'nowrap'
                          }}>
                            {priorityCfg.label}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>{plan.target_screenings_per_day}</span>
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}> suất/ngày</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 800, color: '#d97706', fontSize: '0.88rem' }}>
                            {Number(plan.target_revenue || 0).toLocaleString('vi-VN')} đ
                          </div>
                        </td>
                        <td>
                          <select
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: statusCfg.bg,
                              color: statusCfg.color,
                              border: 'none',
                              cursor: 'pointer'
                            }}
                            value={plan.status}
                            onChange={e => handleUpdatePlanStatus(plan.id, e.target.value)}
                          >
                            <option value={plan.status}>{statusCfg.label}</option>
                            {plan.status === 'draft' && <><option value="published">Đã ban hành</option><option value="cancelled">Hủy</option></>}
                            {plan.status === 'published' && <><option value="in_progress">Đang triển khai</option><option value="cancelled">Hủy</option></>}
                            {plan.status === 'in_progress' && <><option value="completed">Hoàn tất</option><option value="cancelled">Hủy</option></>}
                          </select>
                        </td>
                        <td>
                          {plan.status === 'draft' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>Chưa ban hành</span>
                              <span style={{ fontSize: '0.69rem', color: '#94a3b8' }}>Chưa phân bổ cho rạp</span>
                            </div>
                          ) : <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: isFullyAllocated ? '#ecfdf5' : '#fef3c7',
                              color: isFullyAllocated ? '#065f46' : '#92400e'
                            }}>
                              <Building2 size={12} />
                              {allocCount}/5 rạp TP.HCM
                            </span>
                            {plan.confirmed_count !== undefined && (
                              <span style={{ fontSize: '0.69rem', color: '#64748b' }}>
                                Đã xác nhận: {plan.confirmed_count}/{allocCount} rạp
                              </span>
                            )}
                          </div>}
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {plan.status === 'published' && <button
                              className="tms-btn tms-btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.73rem', color: '#2563eb' }}
                              title="Phân bổ cho các cụm rạp TP.HCM"
                              onClick={() => { void openAllocationModal(plan); }}
                            >
                              <Send size={13} />
                              <span>Phân bổ</span>
                            </button>}
                            <button
                              className="tms-btn tms-btn-outline"
                              style={{ padding: '4px 7px' }}
                              title="Sửa kế hoạch"
                              onClick={() => {
                                setPlanForm({
                                  id: plan.id,
                                  plan_code: plan.plan_code || `KH-${plan.plan_year}${String(plan.plan_month).padStart(2, '0')}-${plan.id}`,
                                  plan_name: plan.plan_name,
                                  plan_month: Number(plan.plan_month),
                                  plan_year: Number(plan.plan_year),
                                  movie_id: Number(plan.movie_id),
                                  movie_title: plan.movie_title,
                                  format: plan.format,
                                  expected_start_date: plan.expected_start_date,
                                  expected_end_date: plan.expected_end_date,
                                  target_revenue: Number(plan.target_revenue),
                                  target_screenings_per_day: Number(plan.target_screenings_per_day),
                                  priority_level: plan.priority_level,
                                  status: plan.status,
                                  note: plan.note || '',
                                  created_by: plan.created_by || '',
                                  created_at: plan.created_at || '',
                                  approved_by: plan.approved_by || '',
                                  approved_at: plan.approved_at || '',
                                  updated_by: plan.updated_by || '',
                                  updated_at: plan.updated_at || '',
                                  selected_theaters: plan.allocations ? plan.allocations.map(a => Number(a.theater_id)) : [1, 2, 3, 4, 5]
                                });
                                setShowPlanModal(true);
                              }}
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              className="tms-btn tms-btn-outline"
                              style={{ padding: '4px 7px', color: '#dc2626' }}
                              title="Xóa kế hoạch"
                              onClick={() => handleDeletePlan(plan.id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ========================================================
    // PHÂN BỔ PHIM CHO RẠP (USE CASE 7 - ADMIN TỔNG)
    // ========================================================
    if (a === 'Phân bổ phim cho rạp') {
      const pendingAllocationCount = movieAllocations.filter(al => al.status === 'pending').length;
      const filteredAllocations = movieAllocations.filter(al => {
        const matchesTheater = selectedTheaterFilter === 0 || Number(al.theater_id) === selectedTheaterFilter;
        return matchesTheater;
      });

      return (
        <div>
          <div style={{ padding: '12px 18px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <b style={{ color: '#166534', fontSize: '0.9rem' }}>📍 Phân bổ phim cho 5 cụm rạp tại TP. Hồ Chí Minh</b>
              <div style={{ fontSize: '0.8rem', color: '#15803d', marginTop: 2 }}>
                Chuỗi rạp Aurora Cinema hoạt động tập trung tại TP.HCM (Aurora Q1, Q7, Landmark 81, Thủ Đức, Tân Bình). Admin Rạp sẽ nhận thông báo và xác nhận triển khai.
              </div>
            </div>
            <button
              className="tms-btn tms-btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              onClick={() => setActive('Kế hoạch phim')}
            >
              <CalendarDays size={15} />
              <span>Xem kế hoạch theo tháng</span>
            </button>
          </div>

          <div className="tms-card-table">
            <div className="tms-table-toolbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#475569' }}>Lọc theo rạp:</span>
                <select
                  className="tms-form-select"
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '0.84rem' }}
                  value={selectedTheaterFilter}
                  onChange={e => setSelectedTheaterFilter(Number(e.target.value))}
                >
                  <option value={0}>Tất cả 5 cụm rạp TP.HCM ({movieAllocations.length} phân bổ)</option>
                  {theatersList.map(t => (
                    <option key={t.id} value={t.id}>{t.name} (TP.HCM)</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                  Tổng cộng: <b>{filteredAllocations.length}</b> phân bổ phim
                </div>
                <button
                  type="button"
                  className="tms-btn tms-btn-outline"
                  style={{ padding: '6px 11px', fontSize: '0.78rem', color: '#dc2626', borderColor: pendingAllocationCount ? '#fecaca' : '#e2e8f0' }}
                  disabled={pendingAllocationCount === 0}
                  title={pendingAllocationCount ? `Thu hồi ${pendingAllocationCount} phân bổ chưa được Admin Rạp tiếp nhận` : 'Không có phân bổ nào đang chờ tiếp nhận'}
                  onClick={() => requestSystemConfirmation(
                    `Bạn sắp thu hồi ${pendingAllocationCount} phân bổ chưa được Admin Rạp tiếp nhận. Dữ liệu này sẽ bị xóa khỏi Aurora DB; các phân bổ đã xác nhận sẽ không bị ảnh hưởng.`,
                    async () => {
                      const response = await fetch(`${API_BASE}?action=movie-allocations&bulk=pending`, {
                        method: 'DELETE',
                        credentials: 'include',
                        headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' }
                      });
                      const result = await response.json();
                      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể thu hồi các phân bổ chưa tiếp nhận.');
                      loadMovieAllocations();
                      loadMoviePlans();
                      showSystemNotice(result.message || 'Đã thu hồi các phân bổ chưa tiếp nhận.');
                    },
                    'Xác nhận thu hồi',
                    'Xác nhận thu hồi tất cả'
                  )}
                >
                  <Trash2 size={13} />
                  <span>Thu hồi tất cả chưa tiếp nhận ({pendingAllocationCount})</span>
                </button>
              </div>
            </div>

            <table className="tms-data-table">
              <thead>
                <tr>
                  <th>Cụm Rạp (TP.HCM)</th>
                  <th>Phim Được Phân Bổ</th>
                  <th>Suất Tối Thiểu</th>
                  <th>Phòng Chiếu Ưu Tiên</th>
                  <th>Thời Gian Phân Bổ</th>
                  <th>Trạng Thái Tiếp Nhận</th>
                  <th>Xác Nhận Bởi</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      Chưa có phân bổ phim nào cho cụm rạp này.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map(al => {
                    const statusCfg = {
                      pending: { label: 'Chờ rạp xác nhận', bg: '#fef3c7', color: '#92400e' },
                      confirmed: { label: 'Đã xác nhận', bg: '#ecfdf5', color: '#065f46' },
                      deploying: { label: 'Đang chiếu', bg: '#eff6ff', color: '#1d4ed8' },
                      completed: { label: 'Đã hoàn thành', bg: '#f1f5f9', color: '#475569' }
                    }[al.status] || { label: al.status, bg: '#f1f5f9', color: '#475569' };

                    return (
                      <tr key={al.id}>
                        <td>
                          <div style={{ fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building2 size={16} color="#2563eb" />
                            {al.theater_name}
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: 22 }}>TP. Hồ Chí Minh</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{al.movie_title}</div>
                        </td>
                        <td>
                          <b style={{ color: '#2563eb' }}>{al.min_screenings_per_day}</b> suất/ngày
                        </td>
                        <td>
                          <span style={{ fontSize: '0.74rem', background: '#f1f5f9', padding: '2px 7px', borderRadius: 4 }}>
                            {al.preferred_screen_types}
                          </span>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.78rem' }}>{al.allocated_start_date}</div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>đến {al.allocated_end_date}</div>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: statusCfg.bg,
                            color: statusCfg.color
                          }}>
                            {statusCfg.label}
                          </span>
                        </td>
                        <td>
                          {al.confirmed_by ? (
                            <div>
                              <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{al.confirmed_by}</div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{al.confirmed_at}</div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontStyle: 'italic' }}>Chưa tiếp nhận</span>
                          )}
                        </td>
                        <td>
                          <button
                            className="tms-btn tms-btn-outline"
                            style={{ padding: '3px 8px', fontSize: '0.73rem', color: '#dc2626' }}
                            onClick={() => requestSystemConfirmation('Phân bổ phim này sẽ bị thu hồi khỏi rạp đã chọn.', async () => {
                              await fetch(`${API_BASE}?action=movie-allocations&id=${al.id}`, { method: 'DELETE', credentials: 'include', headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' } });
                              loadMovieAllocations();
                              loadMoviePlans();
                              showSystemNotice('Đã thu hồi phân bổ phim khỏi rạp.');
                            }, 'Thu hồi phân bổ')}
                          >
                            <Trash2 size={12} />
                            <span>Thu hồi</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ========================================================
    // QUẢN LÝ DANH SÁCH PHIM (USE CASE 5 - ADMIN TỔNG)
    // ========================================================
    if (a === 'movies' || a === 'Danh sách phim') {
      return (
        <div className="tms-card-table">
          <div className="tms-table-toolbar">
            <div className="tms-search-input">
              <Film size={16} color="#94a3b8" />
              <input placeholder="Tìm phim trong kho hệ thống..." />
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input ref={movieImportRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => handleMovieImport(e.target.files?.[0])} />
              <button type="button" className="tms-btn tms-btn-outline" onClick={() => movieImportRef.current?.click()}>
                <FileText size={16} /><span>Nhập Excel</span>
              </button>
              <button
                className="tms-btn tms-btn-primary"
                onClick={() => {
                  setMovieForm({ ...EMPTY_MOVIE_FORM, movie_code: generateMovieCode() });
                  clearMovieMedia();
                  setShowMovieModal(true);
                }}
              >
                <Plus size={16} />
                <span>Thêm phim vào kho</span>
              </button>
            </div>
          </div>

          <table className="tms-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tên Phim</th>
                <th>Thời Lượng</th>
                <th>Độ Tuổi</th>
                <th>Định Dạng</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {moviesList.map(m => {
                const movieStatus = getMovieStatus(m.status);
                return <tr key={m.id}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>#{m.id}</td>
                  <td style={{ fontWeight: 700 }}>{m.title}</td>
                  <td>{m.duration_minutes} phút</td>
                  <td>
                    <span title={getAgeRating(m.age_rating).label} style={{ background: getAgeRating(m.age_rating).background, color: getAgeRating(m.age_rating).color, padding: '3px 7px', borderRadius: 5, fontWeight: 800, fontSize: '0.74rem', cursor: 'help' }}>
                      {getAgeRating(m.age_rating).code}
                    </span>
                  </td>
                  <td>{m.format}</td>
                  <td>
                    <span style={{
                      background: movieStatus.background,
                      color: movieStatus.color,
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontWeight: 700,
                      fontSize: '0.74rem'
                    }}>
                      {movieStatus.label}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="tms-btn tms-btn-outline"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          setMovieForm({
                            ...EMPTY_MOVIE_FORM,
                            ...m,
                            id: Number(m.id),
                            production_year: m.production_year ? Number(m.production_year) : '',
                            expected_end_date: m.expected_end_date || '',
                            status: String(m.status || 'coming_soon').toLowerCase()
                          });
                          clearMovieMedia();
                          setShowMovieModal(true);
                        }}
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        className="tms-btn tms-btn-outline"
                        style={{ padding: '4px 8px', color: '#dc2626' }}
                        onClick={() => handleDeleteMovie(m.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      );
    }

    // ========================================================
    // MOVIE PLAN VIEWS (ADMIN RẠP - USE CASES 2, 3, 4)
    // ========================================================
    if (a === 'movie_plan' || a === 'Xem kế hoạch phim' || a === 'Xác nhận kế hoạch' || a === 'Triển khai phim tại rạp') {
      const isConfirmOnly = a === 'Xác nhận kế hoạch';
      const isDeployOnly = a === 'Triển khai phim tại rạp';

      const myTheaterId = Number(currentUser?.theater_id || 0);
      const myTheater = theatersList.find(theater => Number(theater.id) === myTheaterId);
      const myTheaterName = myTheater?.name || currentUser?.theater_name || (myTheaterId > 0 ? `Rạp #${myTheaterId}` : 'Chưa được gán rạp');
      // API đã giới hạn theo phiên đăng nhập; bộ lọc chính xác này là lớp bảo vệ
      // bổ sung để dữ liệu rạp khác không thể xuất hiện do trạng thái giao diện cũ.
      const myAllocations = myTheaterId > 0 ? movieAllocations.filter(al => Number(al.theater_id) === myTheaterId) : [];
      const pendingAllocations = myAllocations.filter(al => al.status === 'pending');
      const confirmedAllocations = myAllocations.filter(al => al.status === 'confirmed' || al.status === 'deploying');

      return (
        <div>
          <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16, fontSize: '0.84rem', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b>🔒 Phân quyền Admin Rạp ({myTheaterName}):</b> Bạn chỉ có thể triển khai phim từ danh sách <b>Admin Tổng đã phân bổ</b> cho rạp. Không được tự ý thêm phim mới.
            </div>
            <span style={{ fontSize: '0.74rem', background: '#dbeafe', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
              Cụm rạp: {myTheaterName}
            </span>
          </div>

          {/* Sub tabs for cinema admin */}
          <div className="tms-tabs-bar" style={{ marginBottom: 16 }}>
            <button className={`tms-tab-btn ${a === 'Xem kế hoạch phim' || a === 'movie_plan' ? 'active' : ''}`} onClick={() => setActive('Xem kế hoạch phim')}>
              <Film size={16} /><span>Kế hoạch phim được phân bổ ({myAllocations.length})</span>
            </button>
            <button className={`tms-tab-btn ${a === 'Xác nhận kế hoạch' ? 'active' : ''}`} onClick={() => setActive('Xác nhận kế hoạch')}>
              <CheckCircle2 size={16} /><span>Xác nhận kế hoạch ({pendingAllocations.length} chờ duyệt)</span>
            </button>
            <button className={`tms-tab-btn ${a === 'Triển khai phim tại rạp' ? 'active' : ''}`} onClick={() => setActive('Triển khai phim tại rạp')}>
              <CalendarDays size={16} /><span>Triển khai phim tại rạp ({confirmedAllocations.length})</span>
            </button>
          </div>

          <div className="tms-card-table">
            <div className="tms-table-toolbar">
              <div style={{ fontWeight: 700 }}>
                {isConfirmOnly ? 'Phim cần Admin Rạp xác nhận tiếp nhận' : isDeployOnly ? 'Chọn phim đã xác nhận để lên lịch chiếu' : 'Danh sách phim được Admin Tổng phân bổ cho rạp'}
              </div>
            </div>

            <table className="tms-data-table">
              <thead>
                <tr>
                  <th>Tên Phim</th>
                  <th>Định Dạng</th>
                  <th>Chỉ Tiêu Suất</th>
                  <th>Phân Bổ Từ</th>
                  <th>Thời Gian Chiếu</th>
                  <th>Trạng Thái Tại Rạp</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {(isConfirmOnly ? pendingAllocations : isDeployOnly ? confirmedAllocations : myAllocations).map(al => (
                  <tr key={al.id}>
                    <td>
                      <b style={{ fontSize: '0.88rem' }}>{al.movie_title}</b>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Phòng ưu tiên: {al.preferred_screen_types}</div>
                    </td>
                    <td><span style={{ fontSize: '0.73rem', background: '#f1f5f9', padding: '2px 7px', borderRadius: 4 }}>{al.preferred_screen_types}</span></td>
                    <td><b style={{ color: '#2563eb' }}>{al.min_screenings_per_day}</b> suất/ngày</td>
                    <td>
                      <span style={{ fontSize: '0.73rem', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        👑 Admin Tổng
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.78rem' }}>{al.allocated_start_date}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>đến {al.allocated_end_date}</div>
                    </td>
                    <td>
                      <span style={{
                        fontSize: '0.73rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: 4,
                        background: al.status === 'confirmed' ? '#ecfdf5' : al.status === 'deploying' ? '#eff6ff' : '#fef3c7',
                        color: al.status === 'confirmed' ? '#065f46' : al.status === 'deploying' ? '#1d4ed8' : '#92400e'
                      }}>
                        {al.status === 'confirmed' ? 'Đã xác nhận' : al.status === 'deploying' ? 'Đang chiếu' : 'Chờ xác nhận'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="tms-btn tms-btn-outline"
                          style={{ padding: '4px 9px', fontSize: '0.74rem', color: '#1d4ed8' }}
                          onClick={() => handleViewDeploymentDetail(al.id)}
                        >
                          <FileText size={12} /> Xem chi tiết
                        </button>
                      {al.status === 'pending' ? (
                        <button
                          className="tms-btn tms-btn-success"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                          onClick={() => handleConfirmAllocation(al.id)}
                        >
                          <Check size={12} /> Xác nhận tiếp nhận
                        </button>
                      ) : (
                        <button
                          className="tms-btn tms-btn-primary"
                          style={{ padding: '4px 10px', fontSize: '0.74rem' }}
                          onClick={() => openScheduleForAllocation(al)}
                        >
                          <CalendarDays size={12} /> Lên lịch chiếu
                        </button>
                      )}</div>
                    </td>
                  </tr>
                ))}
                {(isConfirmOnly ? pendingAllocations : isDeployOnly ? confirmedAllocations : myAllocations).length === 0 && <tr><td colSpan={7}><div className="schedule-empty-state movie-plan-empty"><span className="movie-plan-empty-icon"><Film size={26}/></span><b>{isConfirmOnly ? 'Không có kế hoạch đang chờ xác nhận' : isDeployOnly ? 'Chưa có phim sẵn sàng triển khai' : 'Chưa có kế hoạch phim được phân bổ'}</b><span>{isConfirmOnly ? `${myTheaterName} đã xử lý toàn bộ kế hoạch được giao.` : isDeployOnly ? 'Kế hoạch sẽ xuất hiện tại đây sau khi rạp xác nhận tiếp nhận.' : `Admin Tổng chưa phân bổ kế hoạch phim mới cho ${myTheaterName}.`}</span><small>Dữ liệu sẽ tự động cập nhật khi có phân bổ mới.</small></div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // SCHEDULES
    if (a === 'schedules' || a === 'showtimes' || a === 'Lịch chiếu' || a === 'Theo dõi suất chiếu') {
      const canEdit = role === 'super_admin' || role === 'cinema_admin';
      const statusLabel: Record<ScheduleItem['status'], string> = { scheduled: 'Sắp chiếu · Mở bán', running: 'Đang chiếu', finished: 'Đã kết thúc', cancelled: 'Đã hủy' };
      const visibleSchedules = schedulesList;
      const visibleScheduleIds = visibleSchedules.filter(canDeleteSchedule).map(schedule => Number(schedule.id));
      const selectedVisibleCount = visibleScheduleIds.filter(id => selectedScheduleIds.includes(id)).length;
      const allVisibleSchedulesSelected = visibleScheduleIds.length > 0 && selectedVisibleCount === visibleScheduleIds.length;
      const toggleVisibleSchedules = () => setSelectedScheduleIds(current => allVisibleSchedulesSelected
        ? current.filter(id => !visibleScheduleIds.includes(id))
        : Array.from(new Set([...current, ...visibleScheduleIds])));
      const scheduleBusy = scheduleBulkDeleting || schedulesLoading;
      const summary = scheduleMeta.summary;
      const isSystemSchedule = role === 'super_admin';
      const selectedScheduleTheater = theatersList.find(theater => Number(theater.id) === scheduleTheaterFilter);
      const scheduleScopeName = selectedScheduleTheater?.name || 'Toàn bộ hệ thống Aurora';
      const pageStart = scheduleMeta.total ? (scheduleMeta.page - 1) * scheduleMeta.per_page + 1 : 0;
      const pageEnd = Math.min(scheduleMeta.page * scheduleMeta.per_page, scheduleMeta.total);
      const viewOptions: Array<{id:ScheduleView; label:string; count?:number}> = [
        { id:'active', label:'Đang vận hành', count:summary.scheduled + summary.running },
        { id:'upcoming', label:'Sắp tới', count:summary.scheduled },
        { id:'history', label:'Lịch sử', count:summary.finished },
        { id:'all', label:'Tất cả' },
      ];
      const formatScheduleDay = (value:string) => {
        const parts = value.split('-').map(Number);
        if (parts.length !== 3) return { date:value, weekday:'' };
        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        return { date:`${String(parts[2]).padStart(2,'0')}/${String(parts[1]).padStart(2,'0')}/${parts[0]}`, weekday:new Intl.DateTimeFormat('vi-VN',{weekday:'short'}).format(date) };
      };
      const movieCards = Array.from(scheduleMoviesList.reduce((map, movie) => {
        const existing = map.get(Number(movie.id));
        if (existing) {
          existing.schedule_count = Number(existing.schedule_count || 0) + Number(movie.schedule_count || 0);
          existing.active_schedule_count = Number(existing.active_schedule_count || 0) + Number(movie.active_schedule_count || 0);
          existing.active_screen_count = Number(existing.active_screen_count || 0) + Number(movie.active_screen_count || 0);
          if (!existing.next_showtime_at || (movie.next_showtime_at && movie.next_showtime_at < existing.next_showtime_at)) existing.next_showtime_at = movie.next_showtime_at;
        } else map.set(Number(movie.id), { ...movie });
        return map;
      }, new Map<number, ScheduleMovieItem>()).values());
      const selectedScheduleMovie = movieCards.find(movie => Number(movie.id) === Number(scheduleMovieId)) || moviesList.find(movie => Number(movie.id) === Number(scheduleMovieId));
      const chooseScheduleMovie = (movieId:number) => {
        setScheduleMovieId(movieId); setSchedulePage(1); setScheduleView('active'); setScheduleDateFilter(''); setScheduleStatusFilter('all'); setScheduleSearch(''); setSelectedScheduleIds([]);
      };
      if (!scheduleMovieId) return <div className="movie-schedule-hub">
        <section className="movie-schedule-hero">
          <div><span><Clapperboard size={16}/> ĐIỀU PHỐI LỊCH CHIẾU</span><h2>Chọn phim để quản lý suất chiếu</h2><p>Mỗi phim là một không gian vận hành riêng: theo dõi suất, phòng, ghế đặt và cập nhật lịch trực tiếp trong aurora_db.</p><div className="movie-schedule-hero-metrics"><b>{movieCards.length}<small>Phim được phân bổ</small></b><b>{scheduleMeta.total.toLocaleString('vi-VN')}<small>Suất trong hệ thống</small></b><b>{summary.active_rooms}<small>Phòng đang vận hành</small></b></div></div>
          <div className="movie-schedule-hero-actions"><button type="button" className="tms-btn tms-btn-outline" onClick={()=>void Promise.all([loadScheduleMovies(),loadSchedules({showError:false})])}><RefreshCw size={15}/> Đồng bộ</button>{canEdit&&<button type="button" className="tms-btn tms-btn-primary" onClick={()=>openNewSchedule()}><Plus size={16}/> Tạo suất mới</button>}</div>
        </section>
        <section className="movie-schedule-catalog-head"><div><span>THƯ VIỆN PHIM ĐƯỢC PHÂN BỔ</span><h3>Phim đang sẵn sàng lên lịch</h3><p>Nhấp vào thẻ phim để mở danh sách suất chiếu chi tiết.</p></div><label className="movie-catalog-search"><Search size={16}/><input value={scheduleSearch} onChange={event=>setScheduleSearch(event.target.value)} placeholder="Tìm phim, thể loại..."/></label></section>
        <section className="movie-schedule-card-grid">
          {movieCards.filter(movie => `${movie.title} ${movie.genre}`.toLocaleLowerCase().includes(scheduleSearch.toLocaleLowerCase())).map(movie => <button type="button" className="movie-schedule-card" key={movie.id} onClick={()=>chooseScheduleMovie(Number(movie.id))}>
            <div className="movie-schedule-poster">{movie.poster_url ? <img src={movie.poster_url} alt={`Poster ${movie.title}`}/> : <Film size={34}/>}<i>{movie.age_rating || 'P'}</i></div>
            <div className="movie-schedule-card-body"><div><small>{movie.genre || 'Đang cập nhật thể loại'}</small><h3>{movie.title}</h3><p>{movie.duration_minutes || '—'} phút · {movie.format || '2D'}</p></div><div className="movie-schedule-card-stats"><span><b>{Number(movie.active_schedule_count || 0)}</b> suất mở</span><span><b>{Number(movie.active_screen_count || 0)}</b> phòng</span></div><footer><span>{movie.next_showtime_at ? `Suất gần nhất · ${String(movie.next_showtime_at).slice(0,16).replace('T',' ')}` : 'Chưa có suất sắp tới'}</span><b>Xem lịch <ChevronDown size={15}/></b></footer></div>
          </button>)}
          {!movieCards.length && <div className="movie-schedule-empty"><Film size={32}/><b>Chưa có phim được phân bổ để lập lịch</b><p>Phim sẽ xuất hiện ở đây sau khi Admin Tổng công bố kế hoạch và phân bổ cho rạp.</p></div>}
        </section>
      </div>;
      return (
        <div className="schedule-operations-page">
          <section className="schedule-movie-detail-hero">
            <button type="button" onClick={()=>{setScheduleMovieId(0);setScheduleSearch('');setSchedulePage(1);}}><span>←</span> Tất cả phim</button>
            <div className="schedule-movie-detail-title"><div className="schedule-movie-detail-poster">{selectedScheduleMovie?.poster_url ? <img src={selectedScheduleMovie.poster_url} alt="Poster phim"/> : <Film size={24}/>}</div><div><small>LỊCH CHIẾU THEO PHIM</small><h2>{selectedScheduleMovie?.title || 'Phim đã chọn'}</h2><p>{selectedScheduleMovie?.genre || 'Thông tin phim'} · {selectedScheduleMovie?.duration_minutes || '—'} phút · {selectedScheduleMovie?.age_rating || 'P'}</p></div></div>
            {canEdit&&<button type="button" className="tms-btn tms-btn-primary" onClick={()=>openNewSchedule(Number(scheduleMovieId))}><Plus size={16}/> Thêm suất cho phim</button>}
          </section>
          {isSystemSchedule && <section className="schedule-system-scope">
            <div className="schedule-scope-intro"><span><Globe size={20}/></span><div><small>PHẠM VI ĐIỀU PHỐI</small><b>{scheduleScopeName}</b><p>{scheduleTheaterFilter ? `${selectedScheduleTheater?.address || selectedScheduleTheater?.city || 'Dữ liệu cụm rạp đã chọn'}` : `Tổng hợp lịch từ ${theatersList.length} cụm rạp trong aurora_db`}</p></div></div>
            <label className="schedule-theater-selector"><span>Chọn cụm rạp</span><div><Building2 size={16}/><select value={scheduleTheaterFilter} disabled={scheduleBusy} onChange={event => { setScheduleTheaterFilter(Number(event.target.value)); setSchedulePage(1); setSelectedScheduleIds([]); }}><option value={0}>Tất cả cụm rạp</option>{theatersList.map(theater=><option key={theater.id} value={theater.id}>{theater.name}{theater.city ? ` · ${theater.city}` : ''}</option>)}</select><ChevronDown size={15}/></div></label>
            <div className="schedule-scope-stats"><span><small>Rạp hiển thị</small><b>{scheduleTheaterFilter ? `1 / ${theatersList.length}` : `${theatersList.length} / ${theatersList.length}`}</b></span><span><small>Suất phù hợp</small><b>{scheduleMeta.total.toLocaleString('vi-VN')} suất</b></span><span className="live"><i/><small>Trạng thái dữ liệu</small><b>{schedulesLoading ? 'Đang cập nhật' : 'Đã đồng bộ'}</b></span></div>
          </section>}
          <section className="schedule-kpi-grid"><article><CalendarDays size={18}/><span>Suất sắp chiếu<b>{summary.scheduled.toLocaleString('vi-VN')}</b></span></article><article><ShowtimeIcon size={18}/><span>Đang chiếu<b>{summary.running.toLocaleString('vi-VN')}</b></span></article><article><Users size={18}/><span>Ghế đã đặt<b>{summary.booked_seats.toLocaleString('vi-VN')}</b></span></article><article><Building2 size={18}/><span>Phòng đang vận hành<b>{summary.active_rooms.toLocaleString('vi-VN')}</b></span></article></section>
          <div className="tms-card-table schedule-management-table">
          <div className="schedule-list-heading">
            <div><span>DANH SÁCH SUẤT CHIẾU</span><h3>{scheduleView === 'history' ? 'Lịch sử vận hành' : scheduleView === 'upcoming' ? 'Lịch sắp tới' : scheduleView === 'all' ? 'Toàn bộ lịch chiếu' : 'Lịch đang vận hành'}</h3><p>{scheduleMeta.total.toLocaleString('vi-VN')} suất phù hợp · {isSystemSchedule ? scheduleScopeName : 'dữ liệu trực tiếp từ aurora_db'}</p></div>
            <div className="schedule-view-tabs" role="tablist" aria-label="Phạm vi lịch chiếu">{viewOptions.map(option => <button key={option.id} type="button" role="tab" aria-selected={scheduleView===option.id} className={scheduleView===option.id?'active':''} onClick={() => { setScheduleView(option.id); setSchedulePage(1); setScheduleStatusFilter('all'); setSelectedScheduleIds([]); }}>{option.label}{typeof option.count==='number'&&<b>{option.count.toLocaleString('vi-VN')}</b>}</button>)}</div>
          </div>
          <div className="tms-table-toolbar schedule-toolbar">
            <div className="tms-search-input"><Search size={16} color="#94a3b8"/><input disabled={scheduleBulkDeleting} value={scheduleSearch} onChange={event => { setScheduleSearch(event.target.value); setSchedulePage(1); setSelectedScheduleIds([]); }} placeholder={isSystemSchedule ? 'Tìm theo phim, rạp hoặc phòng chiếu...' : 'Tìm theo tên phim hoặc phòng...'} /></div>
            <label className="schedule-filter-field"><span>Ngày chiếu</span><VietnameseDateInput disabled={scheduleBulkDeleting} value={scheduleDateFilter} onChange={date => { setScheduleDateFilter(date); setSchedulePage(1); setSelectedScheduleIds([]); }} ariaLabel="Lọc theo ngày" /></label>
            <label className="schedule-filter-field"><span>Trạng thái</span><select disabled={scheduleBulkDeleting} value={scheduleStatusFilter} onChange={event => { setScheduleStatusFilter(event.target.value as 'all' | ScheduleItem['status']); setSchedulePage(1); setSelectedScheduleIds([]); }}><option value="all">Tất cả trạng thái</option>{scheduleView!=='history'&&<option value="scheduled">Sắp chiếu · Mở bán</option>}{scheduleView!=='history'&&scheduleView!=='upcoming'&&<option value="running">Đang chiếu</option>}{(scheduleView==='history'||scheduleView==='all')&&<option value="finished">Đã kết thúc</option>}{(scheduleView==='history'||scheduleView==='all')&&<option value="cancelled">Đã hủy</option>}</select></label>
            <button type="button" className="account-refresh-btn" aria-busy={schedulesLoading} disabled={scheduleBusy} onClick={() => { void loadSchedules(); }}><RefreshCw size={15}/>{schedulesLoading ? 'Đang tải...' : 'Làm mới'}</button>
            {canEdit&&<button className="tms-btn tms-btn-primary" disabled={scheduleBusy} onClick={()=>openNewSchedule()}><Plus size={16}/><span>Tạo suất chiếu</span></button>}
          </div>
          {canEdit && selectedScheduleIds.length > 0 && <div className="schedule-selection-bar"><span><CheckCircle2 size={17}/><b>{selectedScheduleIds.length} suất đã chọn</b><small>Chỉ các suất chưa bắt đầu và chưa có đặt vé mới có thể xóa.</small></span><div><button type="button" className="schedule-clear-selection" disabled={scheduleBusy} onClick={() => setSelectedScheduleIds([])}>Bỏ chọn</button><button type="button" className="schedule-bulk-delete-btn" aria-busy={scheduleBulkDeleting} disabled={scheduleBusy} onClick={handleDeleteSelectedSchedules}><Trash2 size={15}/>{scheduleBulkDeleting ? 'Đang xóa...' : `Xóa ${selectedScheduleIds.length} suất`}</button></div></div>}
          <div className="schedule-table-scroll"><table className="tms-data-table" aria-busy={scheduleBusy}>
            <thead><tr>{canEdit && <th className="schedule-select-column"><input className="schedule-row-checkbox" type="checkbox" aria-label="Chọn tất cả suất chiếu có thể xóa trên trang" checked={allVisibleSchedulesSelected} disabled={!visibleScheduleIds.length || scheduleBusy} ref={node => { if (node) node.indeterminate = selectedVisibleCount > 0 && !allVisibleSchedulesSelected; }} onChange={toggleVisibleSchedules}/></th>}<th>Phim</th>{isSystemSchedule&&<th>Cụm rạp</th>}<th>Phòng chiếu</th><th>Ngày chiếu</th><th>Khung giờ</th><th>Ghế đặt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{visibleSchedules.length ? visibleSchedules.map(s => (
              <tr key={s.id} className={selectedScheduleIds.includes(Number(s.id)) ? 'schedule-row-selected' : ''}>
                {canEdit && <td className="schedule-select-column" title={canDeleteSchedule(s) ? 'Chọn để xóa' : scheduleDeleteBlockLabel(s)}><input className="schedule-row-checkbox" type="checkbox" aria-label={`${canDeleteSchedule(s) ? 'Chọn' : scheduleDeleteBlockLabel(s)}: ${s.movie_title}`} checked={selectedScheduleIds.includes(Number(s.id))} disabled={scheduleBusy || !canDeleteSchedule(s)} onChange={() => setSelectedScheduleIds(current => current.includes(Number(s.id)) ? current.filter(id => id !== Number(s.id)) : [...current, Number(s.id)])}/></td>}
                <td><div className="schedule-movie-cell"><span className={`schedule-status-dot ${s.status}`}/><span><b>{s.movie_title}</b><small>Mã suất #{s.id}</small></span></div></td>{isSystemSchedule&&<td><span className="schedule-theater-cell"><i><Building2 size={13}/></i><span><b>{s.theater_name || `Rạp #${s.theater_id}`}</b><small>{s.theater_city || 'Aurora Cinema'}</small></span></span></td>}<td><span className="schedule-room-pill"><Monitor size={13}/>{screenDisplayName(s.screen_name,s.screen_id)}</span></td><td>{(() => { const day=formatScheduleDay(s.show_date); return <span className="schedule-date-cell"><b>{day.date}</b><small>{day.weekday}</small></span>; })()}</td><td><span className="schedule-time-cell"><Clock size={14}/><b>{String(s.start_time).slice(0,5)}</b><i>→</i><b>{String(s.end_time).slice(0,5)}</b></span></td><td><span className="schedule-seat-cell"><b>{Number(s.booked_seats)}</b><small>/ {Number(s.total_seats)} ghế</small></span></td>
                <td><span className={`schedule-status-badge ${s.status}`}>{statusLabel[s.status]}</span></td>
                <td>{canEdit ? <div className="schedule-row-actions"><button className="tms-btn tms-btn-outline" aria-label={`Sửa suất chiếu ${s.movie_title}`} title="Chỉnh sửa" disabled={scheduleBusy || s.status==='finished'} onClick={() => { const startTime=String(s.start_time).slice(0,5), endTime=String(s.end_time).slice(0,5); setScheduleForm({ id:s.id, movie_id:Number(s.movie_id), screen_ids:[Number(s.screen_id)], ticket_type_ids:String(s.ticket_type_ids || '').split(',').filter(Boolean).map(Number), show_date:s.show_date, start_time:startTime, end_time:endTime, time_slots:[{key:'slot-1',screen_id:Number(s.screen_id),start_time:startTime,end_time:endTime}], ticket_price:Number(s.ticket_price || 0), operational_note:s.operational_note || '', status:s.status }); setShowScheduleModal(true); }}><Edit size={13}/></button><button className="tms-btn tms-btn-outline danger" aria-label={`Xóa suất chiếu ${s.movie_title}`} title={canDeleteSchedule(s) ? 'Xóa suất chiếu' : scheduleDeleteBlockLabel(s)} disabled={scheduleBusy || !canDeleteSchedule(s)} onClick={() => handleDeleteSchedule(s.id)}><Trash2 size={13}/></button></div> : <span className="schedule-readonly">Chỉ xem</span>}</td>
              </tr>
            )) : <tr><td colSpan={(canEdit ? 8 : 7) + (isSystemSchedule ? 1 : 0)}><div className="schedule-empty-state"><CalendarDays size={28}/><b>{schedulesLoading ? 'Đang tải lịch chiếu...' : scheduleView==='history' ? 'Chưa có lịch sử suất chiếu' : 'Chưa có suất chiếu phù hợp'}</b><span>{schedulesLoading ? 'Đang đồng bộ dữ liệu mới nhất từ aurora_db.' : (scheduleSearch || scheduleDateFilter || scheduleStatusFilter!=='all' || scheduleTheaterFilter>0) ? `Không tìm thấy kết quả trong phạm vi ${scheduleScopeName}. Hãy điều chỉnh bộ lọc.` : scheduleView==='history' ? 'Các suất đã kết thúc hoặc đã hủy sẽ được lưu tại đây.' : 'Tạo suất chiếu mới để bắt đầu mở bán và vận hành phòng.'}</span>{canEdit && !schedulesLoading && scheduleView!=='history' && !scheduleSearch && !scheduleDateFilter && scheduleStatusFilter==='all' && <button type="button" onClick={()=>openNewSchedule()}><Plus size={14}/> Tạo suất chiếu</button>}</div></td></tr>}</tbody>
          </table></div>
          <div className="schedule-pagination"><span>Hiển thị <b>{pageStart}–{pageEnd}</b> trong <b>{scheduleMeta.total.toLocaleString('vi-VN')}</b> suất</span><div><button type="button" aria-label="Trang trước" disabled={scheduleBusy || scheduleMeta.page<=1} onClick={() => { setSchedulePage(page => Math.max(1,page-1)); setSelectedScheduleIds([]); }}>‹</button><span>Trang <b>{scheduleMeta.page}</b> / {scheduleMeta.total_pages}</span><button type="button" aria-label="Trang sau" disabled={scheduleBusy || scheduleMeta.page>=scheduleMeta.total_pages} onClick={() => { setSchedulePage(page => Math.min(scheduleMeta.total_pages,page+1)); setSelectedScheduleIds([]); }}>›</button></div></div>
          </div>
        </div>
      );
    }

    // SCREENS
    if (a === 'screens' || a === 'Theo dõi phòng chiếu' || a === 'Danh sách phòng' || a === 'Sơ đồ ghế') {
      const canManageSeatLocks = role === 'cinema_admin' || role === 'super_admin';
      const operationalScreens = (screenPreparation?.screens || screensList).map((screen: any) => ({
        ...screen,
        screen_code: screen.screen_code || `PHÒNG-${screen.id}`,
        screen_type: screen.screen_type || 'Standard Digital',
        total_seats: Number(screen.total_seats || 0),
        status: screen.status || 'active'
      }));
      const selectedRoom = operationalScreens.find((screen: any) => Number(screen.id) === Number(roomScreenId));
      const seatRows = Array.from(new Set((roomSeatMap?.seats || []).map(seat => seat.seat_row)));
      const selectedSeats = (roomSeatMap?.seats || []).filter(seat => selectedRoomSeatIds.includes(Number(seat.id)));
      const selectionMode = selectedSeats[0]?.seat_status === 'locked' ? 'unlock' : 'lock';
      const readinessItems: Array<{ key: keyof ScreenReadinessForm; title: string; detail: string; icon: typeof Film }> = [
        { key: 'content_playback_checked', title: 'Đúng nội dung & phiên bản phim', detail: `Đã chạy thử nội dung, đúng phim và định dạng ${screenPreparation?.allocation?.movie_format || screenPreparation?.allocation?.preferred_screen_types || 'được phân bổ'}.`, icon: Clapperboard },
        { key: 'projector_checked', title: 'Hình ảnh và máy chiếu đạt', detail: 'Hình ảnh rõ, đúng tỷ lệ, không lệch khung hoặc lỗi màu.', icon: Tv },
        { key: 'sound_checked', title: 'Âm thanh các kênh đạt', detail: 'Âm lượng, lời thoại và loa trong phòng hoạt động bình thường.', icon: Volume2 },
        { key: 'auditorium_checked', title: 'Khán phòng sẵn sàng đón khách', detail: 'Ghế, lối đi, ánh sáng và vệ sinh khán phòng đã được kiểm tra.', icon: Sparkles },
        { key: 'safety_checked', title: 'An toàn & lối thoát hiểm đạt', detail: 'Lối thoát, đèn chỉ dẫn và thiết bị an toàn không bị che chắn.', icon: ShieldCheck },
      ];
      const readinessCompleted = readinessItems.filter(item => screenReadinessForm[item.key]).length;
      const allReadinessChecked = readinessCompleted === readinessItems.length;
      return (
        <div className="room-management-page">
          {screenPreparation && <section className="room-plan-context"><div><Film size={18}/><span><small>KIỂM TRA PHÒNG CHO KẾ HOẠCH</small><b>{screenPreparation.allocation?.movie_title}</b></span></div><p>Chọn một phòng, xác nhận đủ 5 tiêu chí kỹ thuật và lưu biên bản vào Aurora DB.</p><button type="button" className="tms-btn tms-btn-outline" onClick={() => { setScreenPreparation(null); setScreenPreparationNote(''); setScreenReadinessForm({ ...EMPTY_SCREEN_READINESS }); }}>Đóng kiểm tra</button></section>}

          <section className="room-directory">
            <header><div><h3>Danh sách phòng chiếu</h3><p>Nhấp vào phòng để mở không gian quản lý chi tiết.</p></div><label><CalendarDays size={15}/><span>Ngày xem</span><VietnameseDateInput value={roomScheduleDate} onChange={date => { setRoomScheduleDate(date); setSelectedRoomSeatIds([]); if (roomScreenId) void loadRoomSeatMap(roomScreenId,date); }} ariaLabel="Ngày xem phòng chiếu"/></label></header>
            {screenPreparationLoading ? <div className="room-loading"><RefreshCw size={17}/> Đang tải phòng chiếu…</div> : <div className="room-directory-grid">
              {operationalScreens.length === 0 ? <div className="screen-empty-state"><Building2 size={30}/><b>Chưa có phòng chiếu trong rạp phụ trách</b><span>Hãy kiểm tra phạm vi rạp và dữ liệu phòng trong Aurora DB.</span></div> : operationalScreens.map((screen: any) => <button type="button" key={screen.id} className={`room-directory-card ${Number(roomScreenId)===Number(screen.id)?'active':''}`} onClick={()=>selectRoomForSeatMap(Number(screen.id))}>
                <span className="room-directory-icon"><Monitor size={20}/></span>
                <span><small>{screen.screen_code}</small><b>{screenDisplayName(screen.name,screen.id)}</b><em>{screen.screen_type} · {screen.total_seats} ghế</em></span>
                {screen.is_ready ? <i className="ready"><CheckCircle2 size={13}/> Đạt kiểm tra</i> : screenPreparation ? <i className={Number(screen.system_ready)===1?'checking':'blocked'}>{Number(screen.system_ready)===1?`${Number(screen.checks_completed || 0)}/5 tiêu chí`:'Thiết bị chưa đạt'}</i> : <i>Xem phòng</i>}
              </button>)}
            </div>}
          </section>

          {screenPreparation && selectedRoom && <section className="screen-readiness-panel">
            <header><div><span><ShieldCheck size={20}/></span><div><small>BIÊN BẢN KIỂM TRA KỸ THUẬT</small><h3>{screenDisplayName(selectedRoom.name,selectedRoom.id)}</h3><p>{screenPreparation.allocation?.movie_title} · {readinessCompleted}/5 tiêu chí đã xác nhận</p></div></div><em className={Number(selectedRoom.system_ready)===1?'ready':'blocked'}>{Number(selectedRoom.system_ready)===1?'Thiết bị hệ thống đang online':'Cần xử lý trạng thái thiết bị'}</em></header>
            <div className="screen-system-status"><span className={selectedRoom.status==='active'?'ok':''}><i/>{selectedRoom.status==='active'?'Phòng đang hoạt động':'Phòng chưa hoạt động'}</span><span className={selectedRoom.projector_status==='online'?'ok':''}><i/>Máy chiếu: {selectedRoom.projector_status}</span><span className={selectedRoom.sound_system_status==='online'?'ok':''}><i/>Âm thanh: {selectedRoom.sound_system_status}</span><span className={Number(selectedRoom.total_seats)>0?'ok':''}><i/>{selectedRoom.total_seats} ghế đã cấu hình</span></div>
            <div className="screen-readiness-checks">{readinessItems.map(item => { const Icon=item.icon; return <label key={item.key} className={screenReadinessForm[item.key]?'checked':''}><input type="checkbox" checked={screenReadinessForm[item.key]} disabled={screenPreparationSaving} onChange={event=>setScreenReadinessForm(current=>({...current,[item.key]:event.target.checked}))}/><span><Icon size={17}/></span><div><b>{item.title}</b><small>{item.detail}</small></div><CheckCircle2 className="screen-readiness-checkmark" size={18}/></label>; })}</div>
            <label className="screen-readiness-note"><span>Ghi chú biên bản <small>(không bắt buộc)</small></span><textarea rows={3} maxLength={500} value={screenPreparationNote} disabled={screenPreparationSaving} onChange={event=>setScreenPreparationNote(event.target.value)} placeholder="Ví dụ: Đã cân chỉnh âm lượng, thay đèn chỉ dẫn hàng F…"/></label>
            <footer><span><b>Điều kiện lưu:</b> đủ 5 tiêu chí và phòng, máy chiếu, âm thanh đều đang hoạt động trong Aurora DB.</span><button type="button" disabled={!allReadinessChecked||Number(selectedRoom.system_ready)!==1||screenPreparationSaving} onClick={()=>void prepareScreenForAllocation(Number(selectedRoom.id))}><ShieldCheck size={16}/>{screenPreparationSaving?'Đang lưu biên bản…':selectedRoom.is_ready?'Cập nhật biên bản':'Xác nhận phòng đạt yêu cầu'}</button></footer>
          </section>}

          {!roomScreenId ? <section className="room-select-empty"><span><Building2 size={30}/></span><h3>Chọn một phòng chiếu để bắt đầu</h3><p>Lịch phim và sơ đồ ghế sẽ được tải trực tiếp từ Aurora DB theo ngày bạn chọn.</p></section> :
          <section className="room-seat-workspace">
            <header className="room-workspace-header">
              <div><span className="room-workspace-code">{roomSeatMap?.screen.screen_code || selectedRoom?.screen_code}</span><h3>{roomSeatMap?.screen.name || selectedRoom?.name}</h3><p>{roomSeatMap?.screen.theater_name || currentUser?.theater_name || 'Aurora Cinema'} · {roomSeatMap?.screen.screen_type || selectedRoom?.screen_type} · {roomSeatMap?.screen.total_seats || selectedRoom?.total_seats} ghế</p></div>
              <button type="button" className="account-refresh-btn" disabled={roomSeatMapLoading} onClick={()=>void loadRoomSeatMap(roomScreenId,roomScheduleDate,roomShowtimeId)}><RefreshCw size={15}/>{roomSeatMapLoading?'Đang tải…':'Làm mới dữ liệu'}</button>
            </header>

            {roomSeatMapLoading ? <div className="room-seat-loading"><div className="dashboard-loading-mark"/>Đang đồng bộ lịch chiếu và sơ đồ ghế…</div> : <>
              <div className="room-showtime-section">
                <div className="room-section-title"><div><Clock size={17}/><span><b>Lịch chiếu trong ngày</b><small>{formatVietnameseDate(roomScheduleDate)}</small></span></div><em>{roomSeatMap?.showtimes.length || 0} suất chiếu</em></div>
                <div className="room-showtime-list">{roomSeatMap?.showtimes.length ? roomSeatMap.showtimes.map(showtime => <button type="button" key={showtime.id} className={Number(roomShowtimeId)===Number(showtime.id)?'active':''} onClick={()=>selectRoomShowtime(Number(showtime.id))}>
                  <span className="room-showtime-time">{String(showtime.starts_at).slice(11,16)}<i>–</i>{String(showtime.ends_at).slice(11,16)}</span>
                  <span><b>{showtime.movie_title}</b><small>{showtime.duration_minutes} phút · {showtime.age_rating || 'P'}</small></span>
                  <em>{Number(showtime.booked_seats)} đã đặt · {Number(showtime.locked_seats)} khóa</em>
                </button>) : <div className="room-no-showtimes"><CalendarDays size={22}/><span><b>Phòng chưa có lịch chiếu trong ngày này</b><small>Chọn ngày khác hoặc tạo suất chiếu trong chức năng Lịch chiếu.</small></span></div>}</div>
              </div>

              {roomSeatMap?.seats.length ? <div className="room-seat-layout">
                <div className="room-seat-map-card">
                  <div className="room-section-title"><div><Ticket size={17}/><span><b>{roomSeatMap.selected_showtime?'Sơ đồ ghế theo suất':'Sơ đồ ghế phòng chiếu'}</b><small>{roomSeatMap.selected_showtime?`${roomSeatMap.selected_showtime.movie_title} · ${String(roomSeatMap.selected_showtime.starts_at).slice(11,16)}`:'Chọn một suất chiếu phía trên để xem tình trạng và quản lý khóa ghế.'}</small></span></div>{roomSeatMap.selected_showtime?<em>Đã chọn {selectedRoomSeatIds.length} ghế</em>:<em>{roomSeatMap.seats.length} ghế</em>}</div>
                  <div className="cinema-screen-shape"><span>MÀN HÌNH</span></div>
                  <div className="room-seat-scroll"><div className="room-seat-rows">{seatRows.map(row => <div className="room-seat-row" key={row}><b>{row}</b><div>{(roomSeatMap.seats || []).filter(seat=>seat.seat_row===row).map(seat => <button type="button" key={seat.id} disabled={!roomSeatMap.selected_showtime||seat.seat_status==='booked'||seat.seat_status==='held'||seatLockSaving} className={`room-seat ${seat.seat_type.toLowerCase()} ${seat.seat_status} ${selectedRoomSeatIds.includes(Number(seat.id))?'selected':''}`} title={!roomSeatMap.selected_showtime?'Chọn suất chiếu để quản lý ghế':seat.seat_status==='locked' ? (seat.lock_reason || 'Ghế đang khóa') : seat.seat_status==='booked' ? 'Ghế đã đặt' : seat.seat_status==='held' ? 'Khách đang giữ ghế' : 'Ghế còn trống'} onClick={()=>toggleRoomSeat(seat)}><span>{seat.seat_number}</span></button>)}</div><b>{row}</b></div>)}</div></div>
                  <div className="room-seat-legend"><span><i className="available"/>Còn trống</span><span><i className="selected"/>Đang chọn</span><span><i className="booked"/>Đã đặt</span><span><i className="held"/>Đang giữ</span><span><i className="locked"/>Rạp khóa</span><span><i className="vip"/>Ghế VIP</span><span><i className="couple"/>Ghế đôi</span></div>
                </div>

                {roomSeatMap.selected_showtime ? <aside className="room-seat-control">
                  <header><ShieldCheck size={20}/><span><small>QUẢN LÝ THEO SUẤT</small><b>{roomSeatMap.selected_showtime.movie_title}</b></span></header>
                  <div className="room-seat-summary"><span><small>Còn trống</small><b>{roomSeatMap.summary.available}</b></span><span><small>Đã đặt</small><b>{roomSeatMap.summary.booked}</b></span><span><small>Đang giữ</small><b>{roomSeatMap.summary.held}</b></span><span><small>Rạp khóa</small><b>{roomSeatMap.summary.locked}</b></span></div>
                  <div className="room-selection-summary"><small>GHẾ ĐANG CHỌN</small><b>{selectedSeats.length ? selectedSeats.map(seat=>seat.seat_row+seat.seat_number).join(', ') : 'Chưa chọn ghế'}</b><p>{selectedSeats.length ? (selectionMode==='unlock'?'Các ghế này sẽ được mở lại cho khách đặt.':'Các ghế này sẽ ngừng hiển thị là ghế khả dụng đối với khách.') : 'Chọn các ghế trống để khóa hoặc chọn các ghế đang khóa để mở khóa.'}</p></div>
                  {selectionMode==='lock' && <label className="room-lock-reason"><span>Lý do khóa ghế</span><textarea rows={3} maxLength={255} value={seatLockReason} onChange={event=>setSeatLockReason(event.target.value)} placeholder="Ví dụ: Ghế bảo trì, giữ cho sự kiện, yêu cầu vận hành…"/></label>}
                  <button type="button" className={`room-seat-action ${selectionMode}`} disabled={!canManageSeatLocks||!selectedRoomSeatIds.length||seatLockSaving} onClick={()=>void saveRoomSeatLocks(selectionMode)}>{selectionMode==='unlock'?<><Lock size={16}/> Mở khóa {selectedRoomSeatIds.length} ghế</>:<><ShieldAlert size={16}/> Khóa {selectedRoomSeatIds.length} ghế</>}</button>
                  {!canManageSeatLocks && <p className="room-readonly-note"><ShieldAlert size={14}/> Tài khoản hiện tại chỉ có quyền xem sơ đồ ghế.</p>}
                  <footer><span><i/> Đồng bộ Aurora DB</span><small>Mỗi thay đổi được lưu theo đúng phòng và suất chiếu.</small></footer>
                </aside> : <aside className="room-seat-control room-seat-control-empty"><header><CalendarDays size={20}/><span><small>CHƯA CHỌN SUẤT</small><b>Sơ đồ phòng {roomSeatMap.screen.name}</b></span></header><div className="room-selection-summary"><small>TRẠNG THÁI</small><b>{roomSeatMap.showtimes.length?'Chọn giờ chiếu để quản lý':'Chưa có lịch chiếu trong ngày'}</b><p>{roomSeatMap.showtimes.length?'Mỗi suất có trạng thái đặt, giữ và khóa ghế độc lập.':'Sơ đồ vật lý vẫn được hiển thị để kiểm tra bố trí phòng. Hãy tạo suất chiếu hoặc chọn một ngày khác để quản lý khóa ghế.'}</p></div><footer><span><i/> Dữ liệu Aurora DB</span><small>{roomSeatMap.seats.length} ghế thuộc phòng này.</small></footer></aside>}
              </div> : <div className="room-select-showtime"><Ticket size={25}/><b>Phòng chưa có dữ liệu sơ đồ ghế</b></div>}
            </>}
          </section>}
        </div>
      );
    }

    // STAFF & SHIFTS
    if (['cinema_admin','super_admin','supervisor'].includes(role || '') && ['staff','NV bán hàng','Nhân viên rạp','Phiên bán hàng','Phiên làm việc','shifts'].includes(a)) {
      const isSessionPage=['Phiên bán hàng','Phiên làm việc','shifts'].includes(a);
      // Always show active staff sourced from aurora_db. Staff with an open
      // session are visible (and labelled) instead of disappearing, while the
      // server remains responsible for preventing a duplicate session.
      const availableStaff=posStaff.filter(item=>item.status==='active');
      const staffReadyForNewSession=availableStaff.filter(item=>!item.open_shift_id);
      return <div className="pos-management-page">
        {role!=='supervisor'&&<div className="pos-management-tabs">
          <button type="button" className={!isSessionPage?'active':''} onClick={()=>setActive('NV bán hàng')}><Users size={17}/><span>NV bán hàng</span></button>
          <button type="button" className={isSessionPage?'active':''} onClick={()=>setActive('Phiên bán hàng')}><WalletCards size={17}/><span>Phiên bán hàng</span></button>
        </div>}

        {!isSessionPage ? <>
          <section className="pos-management-heading"><div><span>NHÂN SỰ QUẦY · AURORA DB</span><h2>Nhân viên bán hàng</h2><p>Quản lý tài khoản POS; quầy và khu vực bán hàng được chọn riêng khi mở phiên làm việc.</p></div><button type="button" onClick={()=>openPosStaffEditor()}><Plus size={17}/> Thêm nhân viên</button></section>
          <section className="pos-management-kpis">
            <article><span className="blue"><Users size={19}/></span><div><small>Tổng nhân viên</small><b>{posStaffSummary.total}</b><em>{posStaffSummary.active} đang hoạt động</em></div></article>
            <article><span className="green"><UserCheck size={19}/></span><div><small>Đang có phiên</small><b>{posStaffSummary.working}</b><em>Đang bán hoặc tạm nghỉ</em></div></article>
            <article><span className="violet"><Receipt size={19}/></span><div><small>Đơn POS hôm nay</small><b>{posStaffSummary.today_orders}</b><em>{formatMoney(posStaffSummary.today_revenue)}</em></div></article>
            <article><span className="amber"><KeyRound size={19}/></span><div><small>Cần xử lý</small><b>{posStaffSummary.locked}</b><em>Tài khoản đang khóa</em></div></article>
          </section>
          <div className="pos-staff-workspace">
            <section className="pos-management-card pos-staff-list-card">
              <header className="pos-list-header"><div><b>Danh sách nhân viên</b><span>{posStaffSummary.cashiers} thu ngân · {posStaffSummary.supervisors} trưởng ca</span></div><em>{posStaff.length} kết quả</em></header>
              <div className="pos-management-toolbar"><div className="pos-search"><Search size={16}/><input value={posStaffSearch} onChange={event=>setPosStaffSearch(event.target.value)} placeholder="Tên, số điện thoại, tài khoản…"/></div><select value={posStaffStatus} onChange={event=>setPosStaffStatus(event.target.value)}><option value="all">Mọi trạng thái</option><option value="active">Hoạt động</option><option value="locked">Đang khóa</option><option value="inactive">Đã ngưng</option></select><button type="button" className="icon" title="Làm mới dữ liệu" onClick={()=>void loadPosStaff()} disabled={posStaffLoading}><RefreshCw size={16}/></button></div>
              <div className="pos-table-scroll"><table className="pos-management-table pos-staff-table"><thead><tr><th>Nhân viên / tài khoản</th><th>Mã nhân viên / SĐT</th><th>Phiên hiện tại</th><th>Hôm nay</th><th>Trạng thái</th><th/></tr></thead><tbody>
                {posStaffLoading ? <tr><td colSpan={6} className="pos-empty">Đang đồng bộ nhân viên từ Aurora DB…</td></tr> : posStaff.length ? posStaff.map(staff=><tr key={staff.id} onClick={()=>openPosStaffProfile(staff.id)}>
                  <td><div className="pos-person"><span>{staff.full_name.trim().split(/\s+/).slice(-1)[0].slice(0,1).toUpperCase()}</span><p><b>{staff.full_name}</b><small>{staff.phone||staff.employee_code} · Đăng nhập: {staff.username}</small></p></div></td>
                  <td><b>{staff.phone||'Chưa cập nhật'}</b><small>Mã nhân viên</small></td>
                  <td>{staff.open_shift_id?<span className={`pos-status ${staff.shift_status}`}><i/>{staff.shift_status==='paused'?'Tạm nghỉ':'Đang bán'}</span>:<><span className="pos-muted">Chưa mở phiên</span><small>Đăng nhập: {formatPosDateTime(staff.last_login_at)}</small></>}</td>
                  <td><b>{staff.today_orders} đơn</b><small className="pos-revenue">{formatMoney(staff.today_revenue)}</small></td>
                  <td><span className={`pos-status ${staff.status}`}><i/>{staff.status==='active'?'Hoạt động':staff.status==='locked'?'Đang khóa':'Đã ngưng'}</span></td>
                  <td><div className="pos-row-actions"><button type="button" className="view" title="Xem hồ sơ" onClick={event=>{event.stopPropagation();openPosStaffProfile(staff.id);}}><Eye size={15}/></button><button type="button" title="Chỉnh sửa hồ sơ" onClick={event=>{event.stopPropagation();openPosStaffEditor(staff);}}><Edit size={15}/></button>{staff.status!=='inactive'&&<button type="button" className="danger" title="Ngưng tài khoản" onClick={event=>{event.stopPropagation();deactivatePosStaff(staff);}}><Trash2 size={15}/></button>}</div></td>
                </tr>) : <tr><td colSpan={6} className="pos-empty"><Users size={24}/><b>Không tìm thấy nhân viên</b><span>Thử đổi bộ lọc hoặc thêm nhân viên bán hàng mới.</span></td></tr>}
              </tbody></table></div>
              <footer className="pos-list-footer"><ShieldCheck size={14}/><span>Dữ liệu tài khoản, phiên và doanh thu được đồng bộ trực tiếp từ Aurora DB.</span></footer>
            </section>

            <aside className="pos-staff-profile">
              {posStaffDetailLoading?<div className="pos-profile-loading"><RefreshCw size={20}/><span>Đang tải hồ sơ…</span></div>:posStaffDetail?<>
                <header className="pos-profile-head"><div className="pos-profile-avatar">{posStaffDetail.staff.full_name.trim().split(/\s+/).slice(-1)[0].slice(0,1).toUpperCase()}</div><div><span>{posStaffDetail.staff.phone||posStaffDetail.staff.employee_code}</span><h3>{posStaffDetail.staff.full_name}</h3><p>{posStaffDetail.staff.theater_name}</p></div><span className={`pos-status ${posStaffDetail.staff.status}`}><i/>{posStaffDetail.staff.status==='active'?'Hoạt động':posStaffDetail.staff.status==='locked'?'Đang khóa':'Đã ngưng'}</span></header>
                <div className="pos-profile-actions"><button type="button" onClick={()=>openPosStaffEditor(posStaffDetail.staff)}><Edit size={14}/> Chỉnh sửa</button>{posStaffDetail.staff.status==='locked'?<button type="button" className="success" onClick={()=>void changePosStaffStatus(posStaffDetail.staff,'active')}><KeyRound size={14}/> Mở khóa</button>:posStaffDetail.staff.status==='active'&&<button type="button" className="warning" onClick={()=>void changePosStaffStatus(posStaffDetail.staff,'locked')}><Lock size={14}/> Khóa đăng nhập</button>}</div>
                <section className="pos-profile-section"><h4>Thông tin tài khoản</h4><dl><div><dt><User size={14}/> Họ và tên</dt><dd>{posStaffDetail.staff.full_name}</dd></div><div><dt><Phone size={14}/> Mã nhân viên / SĐT</dt><dd>{posStaffDetail.staff.phone||posStaffDetail.staff.employee_code}</dd></div><div><dt><KeyRound size={14}/> Tên đăng nhập</dt><dd>{posStaffDetail.staff.username}</dd></div><div><dt><ShieldCheck size={14}/> Người cấp</dt><dd>{posStaffDetail.staff.issued_by_name||'Tài khoản hệ thống'}</dd></div></dl></section>
                <section className="pos-profile-section performance"><div className="pos-profile-title"><h4>Hiệu suất 30 ngày</h4><span><Activity size={13}/> Dữ liệu đơn POS</span></div><div className="pos-profile-metrics"><article><small>Doanh thu</small><b>{formatMoney(posStaffDetail.performance_30_days.revenue)}</b></article><article><small>Đơn đã bán</small><b>{posStaffDetail.performance_30_days.order_count}</b></article><article><small>TB/đơn</small><b>{formatMoney(posStaffDetail.performance_30_days.average_order)}</b></article><article><small>Ngày bán</small><b>{posStaffDetail.performance_30_days.selling_days}</b></article></div>{posStaffDetail.payment_methods.length>0&&<div className="pos-payment-mix">{posStaffDetail.payment_methods.map(method=><span key={method.method}><i/><b>{method.method==='CASH'?'Tiền mặt':method.method==='CARD'?'Thẻ':'Chuyển khoản'}</b><em>{method.order_count} đơn · {formatMoney(method.revenue)}</em></span>)}</div>}</section>
                <section className="pos-profile-section"><div className="pos-profile-title"><h4>Phiên gần đây</h4><button type="button" onClick={()=>setActive('Phiên bán hàng')}>Xem tất cả</button></div><div className="pos-profile-timeline">{posStaffDetail.recent_shifts.length?posStaffDetail.recent_shifts.slice(0,4).map(shift=><div key={shift.id}><i className={shift.status}/><p><b>{shift.counter} · {shift.order_count} đơn</b><small>{formatPosDateTime(shift.opened_at)}</small></p><span>{formatMoney(shift.total_revenue)}</span></div>):<p className="empty">Chưa có phiên bán hàng nào.</p>}</div></section>
                <section className="pos-profile-section login"><div className="pos-profile-title"><h4>Hoạt động tài khoản</h4><span>{formatPosDateTime(posStaffDetail.staff.last_login_at)}</span></div>{posStaffDetail.login_events[0]?<p><i className={posStaffDetail.login_events[0].is_success?'ok':'failed'}/><span><b>{posStaffDetail.login_events[0].is_success?'Đăng nhập POS thành công':'Đăng nhập POS không thành công'}</b><small>{posStaffDetail.login_events[0].ip_address||'Không có địa chỉ IP'} · {formatPosDateTime(posStaffDetail.login_events[0].created_at)}</small></span></p>:<p className="empty">Chưa có lịch sử đăng nhập.</p>}{posStaffDetail.management_events?.[0]&&<p className="management-event"><i className="ok"/><span><b>{posStaffDetail.management_events[0].detail}</b><small>{posStaffDetail.management_events[0].actor_name} · {formatPosDateTime(posStaffDetail.management_events[0].created_at)}</small></span></p>}</section>
              </>:<div className="pos-profile-empty"><UserRound size={28}/><b>Chọn một nhân viên</b><span>Hồ sơ, hiệu suất và lịch sử phiên sẽ hiển thị tại đây.</span></div>}
            </aside>
          </div>
        </> : <>
          <section className="pos-management-heading"><div><span>CẤP QUYỀN PHIÊN · AURORA DB</span><h2>Phiên bán hàng</h2><p>Quầy và vai trò nghiệp vụ được chọn cho từng phiên; nhân viên chỉ đăng nhập khi có phiên được cấp.</p></div><button type="button" onClick={()=>{ const first=staffReadyForNewSession[0]; const theaterId=first?.theater_id||Number(currentUser?.theater_id||0); setPosSessionForm({work_schedule_id:0,user_id:first?.id||0,theater_id:theaterId,initial_cash:500000,counter:'',sales_areas:['box_ticket'],notes:''}); setShowPosSessionModal(true); void loadPosCounters(theaterId); }}><Plus size={17}/> Cấp & mở phiên</button></section>
          <section className="pos-management-kpis session">
            <article><span className="green">{posSessionView==='history'?<History size={19}/>:<Play size={19}/>}</span><div><small>{posSessionView==='history'?'Phiên lưu trữ':'Đang bán'}</small><b>{posSessionView==='history'?posSessionSummary.total:posSessionSummary.active}</b><em>{posSessionView==='history'?`Trước ${formatVietnameseDate(posSessionDate)}`:`${posSessionSummary.paused} phiên tạm nghỉ`}</em></div></article>
            <article><span className="blue"><Receipt size={19}/></span><div><small>{posSessionView==='history'?'Đã đóng':'Đơn trong phiên'}</small><b>{posSessionView==='history'?posSessionSummary.closed:posSessionSummary.order_count}</b><em>{posSessionView==='history'?'Phiên hoàn tất lưu trong Aurora DB':`Ngày ${formatVietnameseDate(posSessionDate)}`}</em></div></article>
            <article><span className="violet"><CircleDollarSign size={19}/></span><div><small>Doanh thu POS</small><b className="money">{formatMoney(posSessionSummary.total_revenue)}</b><em>Đơn đã thanh toán</em></div></article>
            <article><span className="amber"><WalletCards size={19}/></span><div><small>Chênh lệch đã chốt</small><b className={posSessionSummary.cash_difference<0?'negative':'money'}>{formatMoney(posSessionSummary.cash_difference)}</b><em>{posSessionSummary.closed} phiên đã đóng</em></div></article>
          </section>
          <section className="pos-management-card">
            <header className="pos-management-toolbar pos-session-toolbar">
              <div className="pos-session-view-switch" role="tablist" aria-label="Chế độ xem phiên bán hàng">
                <button type="button" role="tab" aria-selected={posSessionView==='today'} className={posSessionView==='today'?'active':''} onClick={()=>{setPosSessionView('today');setPosSessionStatus('all');}}><CalendarDays size={15}/> Phiên trong ngày</button>
                <button type="button" role="tab" aria-selected={posSessionView==='history'} className={posSessionView==='history'?'active':''} onClick={()=>{setPosSessionView('history');setPosSessionStatus('closed');}}><History size={15}/> Lịch sử phiên</button>
              </div>
              <div className="pos-session-toolbar-actions"><label className="pos-date-filter" title={posSessionView==='history'?'Hiển thị các phiên đã đóng trước ngày được chọn':'Hiển thị phiên phát sinh trong ngày được chọn'}><CalendarDays size={16}/><VietnameseDateInput ariaLabel={posSessionView==='history'?'Xem lịch sử trước ngày':'Ngày phiên bán hàng'} value={posSessionDate} onChange={setPosSessionDate}/></label>{posSessionView==='today'?<select value={posSessionStatus} onChange={event=>setPosSessionStatus(event.target.value)}><option value="all">Tất cả phiên</option><option value="active">Đang bán</option><option value="paused">Tạm nghỉ</option><option value="closed">Đã đóng</option></select>:<span className="pos-history-scope"><History size={14}/> Trước ngày đã chọn</span>}<button type="button" className="icon" onClick={()=>void loadPosSessions()} disabled={posSessionsLoading}><RefreshCw size={16}/></button></div>
            </header>
            <div className="pos-table-scroll"><table className="pos-management-table session-table"><thead><tr><th>Mã phiên / nhân viên</th><th>Quầy</th><th>Thời gian</th><th>Đối soát tiền mặt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
              {posSessionsLoading?<tr><td colSpan={6} className="pos-empty">Đang tổng hợp phiên và đơn hàng…</td></tr>:posSessions.length?posSessions.map(session=><tr key={session.id}>
                <td><b className="pos-session-code">PS-{String(session.id).padStart(5,'0')}</b><span className="pos-session-person">{session.full_name}</span><small>{session.employee_code||session.username}</small></td>
                <td><b>{session.counter}</b><small>{session.theater_name}</small></td>
                <td><b>{formatPosDateTime(session.opened_at)}</b></td>
                <td><b>{formatMoney(session.expected_cash)}</b><small>{session.cash_at_close===null?'—':formatMoney(session.cash_at_close)}</small></td>
                <td><span className={`pos-status ${session.status}`}><i/>{session.status==='active'?'Đang bán':session.status==='paused'?'Tạm nghỉ':'Đã đóng'}</span></td>
                <td><div className="pos-session-actions"><button type="button" className="view" onClick={()=>void openPosSessionReport(session)}><Eye size={14}/> Xem chi tiết</button>{session.status!=='closed'&&(session.status==='active'?<button type="button" onClick={()=>void updatePosSession(session,'pause')}><CirclePause size={14}/> Tạm nghỉ</button>:<button type="button" onClick={()=>void updatePosSession(session,'resume')}><Play size={14}/> Tiếp tục</button>)}{session.status!=='closed'&&<button type="button" className="close" onClick={()=>openClosePosSession(session)}><Check size={14}/> Kết phiên</button>}</div></td>
              </tr>):<tr><td colSpan={6} className="pos-empty"><WalletCards size={24}/><b>{posSessionView==='history'?'Chưa có lịch sử phiên':'Chưa có phiên bán hàng trong ngày'}</b><span>{posSessionView==='history'?'Các phiên đã đóng ở những ngày trước sẽ được lưu tại đây.':'Mở phiên khi bàn giao nhân viên, quầy và tiền đầu ca.'}</span></td></tr>}
            </tbody></table></div>
          </section>
        </>}

        {showPosStaffModal&&<div className="tms-modal-overlay pos-editor-overlay"><form className="tms-modal-box pos-editor-modal" onSubmit={savePosStaff} role="dialog" aria-modal="true" aria-labelledby="pos-editor-title">
          <header className="pos-editor-header"><div className="pos-editor-header-icon"><UserRound size={24}/></div><div><span className="pos-modal-kicker">QUẢN LÝ NHÂN SỰ POS</span><h2 id="pos-editor-title">{posStaffForm.id?'Cập nhật tài khoản bán hàng':'Cấp tài khoản bán hàng mới'}</h2><p>Thông tin đăng nhập dùng chung số điện thoại của nhân viên.</p></div><button type="button" className="pos-editor-close" aria-label="Đóng" onClick={()=>setShowPosStaffModal(false)}><X size={18}/></button></header>
          <div className="pos-editor-content">
            <section className="pos-editor-section"><header><span><UserRound size={17}/></span><div><h3>Thông tin nhân viên</h3><p>Mã nhân viên được đồng bộ trực tiếp từ số điện thoại.</p></div></header><div className="pos-editor-fields">
              {role==='super_admin'&&<label className="wide"><span>Rạp làm việc <em>*</em></span><select required value={posStaffForm.theater_id||''} onChange={e=>setPosStaffForm(f=>({...f,theater_id:Number(e.target.value)}))}><option value="">Chọn rạp làm việc</option>{theatersList.map(theater=><option key={theater.id} value={theater.id}>{theater.name} · {theater.city}</option>)}</select></label>}
              <label><span>Họ và tên <em>*</em></span><input required maxLength={120} autoFocus value={posStaffForm.full_name} placeholder="Ví dụ: Nguyễn Minh Anh" onChange={e=>setPosStaffForm(f=>({...f,full_name:e.target.value}))}/></label>
              <label className="wide"><span>Mã nhân viên / Số điện thoại <em>*</em></span><input required type="tel" inputMode="tel" autoComplete="tel" maxLength={16} pattern="\+?[0-9]{9,15}" placeholder="Ví dụ: 0901234567" value={posStaffForm.phone} onChange={e=>setPosStaffForm(f=>({...f,phone:e.target.value.replace(/[^0-9+]/g,'')}))}/><small>Mã nhân viên và số điện thoại là một thông tin duy nhất. Dùng 9–15 chữ số, có thể bắt đầu bằng +.</small></label>
            </div></section>
            <section className="pos-editor-section security"><header><span><KeyRound size={17}/></span><div><h3>Tài khoản & bảo mật</h3><p>Tên đăng nhập luôn trùng với mã nhân viên.</p></div></header><div className="pos-editor-fields single">
              <label><span>Tên đăng nhập</span><div className="pos-input-with-icon"><User size={16}/><input readOnly autoComplete="username" placeholder="Nhập số điện thoại ở cột thông tin nhân viên" value={posStaffForm.phone}/></div><small>Tự động lấy theo mã nhân viên / số điện thoại.</small></label>
              <label><span>{posStaffForm.id?'Mật khẩu mới':'Mật khẩu'} {!posStaffForm.id&&<em>*</em>}</span><div className="pos-input-with-icon"><Lock size={16}/><input type={showPosStaffPassword?'text':'password'} required={!posStaffForm.id} minLength={4} maxLength={128} autoComplete="new-password" placeholder={posStaffForm.id?'Để trống nếu giữ mật khẩu hiện tại':'Mặc định: 88888888'} value={posStaffForm.password} onChange={e=>setPosStaffForm(f=>({...f,password:e.target.value}))}/><button type="button" aria-label={showPosStaffPassword?'Ẩn mật khẩu':'Hiện mật khẩu'} onClick={()=>setShowPosStaffPassword(value=>!value)}>{showPosStaffPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div><small>{posStaffForm.id?'Nhập mật khẩu mới nếu muốn thay đổi.':'Mật khẩu mặc định là 88888888; có thể nhập mật khẩu khác.'}</small></label>
              {posStaffForm.id>0&&<label><span>Trạng thái tài khoản</span><select value={posStaffForm.status} onChange={e=>setPosStaffForm(f=>({...f,status:e.target.value as 'active'|'inactive'|'locked'}))}><option value="active">Đang hoạt động</option><option value="locked">Tạm khóa đăng nhập</option><option value="inactive">Ngưng hoạt động</option></select></label>}
              <div className="pos-account-policy"><ShieldCheck size={18}/><div><b>Cấu hình phiên làm việc riêng</b><p>Quầy bán và khu vực nghiệp vụ sẽ được chọn khi lập ca hoặc mở phiên, không gắn cố định vào tài khoản.</p></div></div>
            </div></section>
          </div>
          <div className="pos-access-summary"><span><Building2 size={16}/><small>Phạm vi</small><b>{theatersList.find(theater=>Number(theater.id)===Number(posStaffForm.theater_id))?.name||currentUser?.theater_name||'Rạp đang quản lý'}</b></span><span><ShieldCheck size={16}/><small>{posStaffForm.id?'Cập nhật bởi':'Cấp bởi'}</small><b>{currentUser?.full_name||'Quản trị TMS'}</b></span></div>
          <footer className="pos-editor-footer"><div><i/><span><b>Lưu trực tiếp vào aurora_db</b><small>{posStaffForm.id&&posStaff.find(staff=>staff.id===posStaffForm.id)?.issued_by_name?`Tài khoản được cấp bởi ${posStaff.find(staff=>staff.id===posStaffForm.id)?.issued_by_name}.`:'Thao tác được ghi nhận trong nhật ký quản trị.'}</small></span></div><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>setShowPosStaffModal(false)}>Hủy</button><button type="submit" className="tms-btn tms-btn-primary" disabled={posStaffSaving}><Check size={16}/>{posStaffSaving?'Đang lưu…':posStaffForm.id?'Lưu thay đổi':'Cấp tài khoản'}</button></div></footer>
        </form></div>}

        {showPosStaffDetail&&<div className="tms-modal-overlay pos-detail-overlay"><div className="tms-modal-box pos-detail-modal" role="dialog" aria-modal="true" aria-labelledby="pos-detail-title">
          {posStaffDetailLoading||!posStaffDetail?<div className="pos-detail-loading"><RefreshCw size={24}/><b>Đang tải hồ sơ nhân viên</b><span>Dữ liệu được tổng hợp trực tiếp từ Aurora DB…</span></div>:<>
            <header className="pos-detail-hero"><button type="button" className="pos-detail-close" aria-label="Đóng hồ sơ" onClick={()=>setShowPosStaffDetail(false)}><X size={18}/></button><div className="pos-detail-avatar">{posStaffDetail.staff.full_name.trim().split(/\s+/).slice(-1)[0].slice(0,1).toUpperCase()}</div><div className="pos-detail-identity"><span>{posStaffDetail.staff.phone||posStaffDetail.staff.employee_code}</span><h2 id="pos-detail-title">{posStaffDetail.staff.full_name}</h2><p>{posStaffDetail.staff.theater_name}</p></div><div className="pos-detail-state"><span className={`pos-status ${posStaffDetail.staff.status}`}><i/>{posStaffDetail.staff.status==='active'?'Đang hoạt động':posStaffDetail.staff.status==='locked'?'Đang khóa':'Đã ngưng'}</span><small>Cập nhật gần nhất<br/><b>{formatPosDateTime(posStaffDetail.staff.updated_at||posStaffDetail.staff.created_at)}</b></small></div></header>
            <div className="pos-detail-body">
              <section className="pos-detail-column profile"><div className="pos-detail-section-title"><span><UserRound size={17}/></span><div><h3>Thông tin tài khoản</h3><p>Thông tin đăng nhập của nhân viên bán hàng</p></div></div><dl className="pos-detail-info"><div><dt>Họ và tên</dt><dd>{posStaffDetail.staff.full_name}</dd></div><div><dt>Mã nhân viên / SĐT</dt><dd>{posStaffDetail.staff.phone||posStaffDetail.staff.employee_code}</dd></div><div><dt>Tên đăng nhập</dt><dd>{posStaffDetail.staff.username}</dd></div><div><dt>Người cấp tài khoản</dt><dd>{posStaffDetail.staff.issued_by_name||'Tài khoản hệ thống'}</dd></div><div><dt>Ngày cấp tài khoản</dt><dd>{formatPosDateTime(posStaffDetail.staff.created_at)}</dd></div></dl><div className="pos-detail-access"><ShieldCheck size={18}/><div><b>{posStaffDetail.staff.theater_name}</b><p>Quầy và khu vực bán hàng được cấp riêng theo từng phiên làm việc.</p></div></div></section>
              <section className="pos-detail-column performance"><div className="pos-detail-section-title"><span><TrendingUp size={17}/></span><div><h3>Hiệu suất 30 ngày</h3><p>Tổng hợp từ các đơn POS đã thanh toán</p></div></div><div className="pos-detail-performance"><article><small>Doanh thu</small><b>{formatMoney(posStaffDetail.performance_30_days.revenue)}</b><em>{posStaffDetail.performance_30_days.selling_days} ngày phát sinh bán hàng</em></article><article><small>Số đơn hoàn tất</small><b>{posStaffDetail.performance_30_days.order_count}</b><em>{posStaffDetail.performance_30_days.cancelled_orders} đơn đã hủy</em></article><article><small>Giá trị trung bình</small><b>{formatMoney(posStaffDetail.performance_30_days.average_order)}</b><em>Trung bình trên mỗi đơn</em></article><article><small>Hôm nay</small><b>{posStaffDetail.staff.today_orders} đơn</b><em>{formatMoney(posStaffDetail.staff.today_revenue)}</em></article></div><div className="pos-detail-payment"><h4>Phương thức thanh toán</h4>{posStaffDetail.payment_methods.length?posStaffDetail.payment_methods.map(method=>{const total=Math.max(1,posStaffDetail.performance_30_days.revenue);const percent=Math.round(Number(method.revenue)*100/total);return <div key={method.method}><span><b>{method.method==='CASH'?'Tiền mặt':method.method==='CARD'?'Thẻ ngân hàng':'Chuyển khoản'}</b><em>{method.order_count} đơn · {percent}%</em></span><i><u style={{width:`${percent}%`}}/></i><strong>{formatMoney(method.revenue)}</strong></div>}):<p className="pos-detail-empty">Chưa phát sinh giao dịch trong 30 ngày.</p>}</div></section>
              <section className="pos-detail-column activity"><div className="pos-detail-section-title"><span><Clock size={17}/></span><div><h3>Phiên & hoạt động</h3><p>Lịch sử vận hành gần nhất</p></div></div><div className="pos-detail-current"><small>PHIÊN HIỆN TẠI</small>{posStaffDetail.staff.open_shift_id?<><b>PS-{String(posStaffDetail.staff.open_shift_id).padStart(5,'0')}</b><span className={`pos-status ${posStaffDetail.staff.shift_status}`}><i/>{posStaffDetail.staff.shift_status==='paused'?'Đang tạm nghỉ':'Đang bán hàng'}</span></>:<><b>Chưa mở phiên</b><span>Lần đăng nhập: {formatPosDateTime(posStaffDetail.staff.last_login_at)}</span></>}</div><div className="pos-detail-timeline"><h4>Phiên gần đây</h4>{posStaffDetail.recent_shifts.length?posStaffDetail.recent_shifts.slice(0,4).map(shift=><div key={shift.id}><i className={shift.status}/><p><b>{shift.counter} · PS-{String(shift.id).padStart(5,'0')}</b><small>{formatPosDateTime(shift.opened_at)} · {shift.order_count} đơn</small></p><strong>{formatMoney(shift.total_revenue)}</strong></div>):<p className="pos-detail-empty">Chưa có phiên bán hàng.</p>}</div><div className="pos-detail-last-login"><Activity size={15}/><div><b>{posStaffDetail.login_events[0]?.is_success?'Đăng nhập POS thành công':'Chưa có đăng nhập thành công'}</b><span>{posStaffDetail.login_events[0]?`${posStaffDetail.login_events[0].ip_address||'Không có IP'} · ${formatPosDateTime(posStaffDetail.login_events[0].created_at)}`:'Chưa có dữ liệu truy cập'}</span></div></div></section>
            </div>
            <footer className="pos-detail-footer"><div><span><i/> Đồng bộ Aurora DB</span><p>Hồ sơ, phiên và doanh thu được cập nhật theo dữ liệu vận hành thực tế.</p></div><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>setShowPosStaffDetail(false)}>Đóng</button>{posStaffDetail.staff.status==='locked'?<button type="button" className="tms-btn pos-unlock-btn" onClick={()=>void changePosStaffStatus(posStaffDetail.staff,'active')}><KeyRound size={15}/> Mở khóa</button>:posStaffDetail.staff.status==='active'&&<button type="button" className="tms-btn pos-lock-btn" onClick={()=>void changePosStaffStatus(posStaffDetail.staff,'locked')}><Lock size={15}/> Khóa đăng nhập</button>}<button type="button" className="tms-btn tms-btn-primary" onClick={()=>{setShowPosStaffDetail(false);openPosStaffEditor(posStaffDetail.staff);}}><Edit size={15}/> Chỉnh sửa hồ sơ</button></div></footer>
          </>}
        </div></div>}

        {showPosSessionModal&&<div className="tms-modal-overlay"><form className="tms-modal-box pos-session-modal pos-session-authorize-modal" onSubmit={savePosSession}><header className="pos-session-modal-header"><div className="pos-session-modal-mark"><Play size={20}/></div><div><span className="pos-modal-kicker">CẤP QUYỀN POS · AURORA DB</span><h2>Mở phiên bán hàng</h2><p>Chọn đúng nhân sự, quầy thực tế và vai trò vận hành trước khi cấp quyền đăng nhập.</p></div><button type="button" className="temp-btn" aria-label="Đóng" onClick={()=>setShowPosSessionModal(false)}><X size={17}/></button></header><div className="pos-session-modal-body">
          <section className="pos-session-section"><header><span><UserRound size={17}/></span><div><b>Nhân sự & quầy vận hành</b><small>Dữ liệu nhân sự và quầy được đồng bộ theo rạp trong Aurora DB.</small></div></header><div className="pos-session-fields">
            <label className="wide"><span>Nhân viên nhận phiên <em>*</em></span><select required value={posSessionForm.user_id||''} onChange={e=>{const id=Number(e.target.value);const staff=availableStaff.find(item=>item.id===id);const theaterId=staff?.theater_id||posSessionForm.theater_id;setPosSessionForm(f=>({...f,user_id:id,theater_id:theaterId,counter:''}));void loadPosCounters(theaterId);}}><option value="">Chọn nhân viên chưa có phiên</option>{availableStaff.map(staff=><option key={staff.id} value={staff.id} disabled={!!staff.open_shift_id}>{role==='super_admin'?`${staff.theater_name} · `:''}{staff.employee_code} · {staff.full_name} · {staff.open_shift_id?'Đang có phiên':'Sẵn sàng'}</option>)}</select>{!availableStaff.length?<small className="warning">Chưa có nhân viên hoạt động thuộc rạp này trong Aurora DB.</small>:!staffReadyForNewSession.length?<small className="warning">Tất cả nhân viên đang có phiên mở. Hãy dùng tài khoản hiện có để đăng nhập POS hoặc kết phiên trước khi mở phiên mới.</small>:<small>Hiển thị {availableStaff.length} nhân viên hoạt động từ Aurora DB; nhân viên có phiên mở được đánh dấu trong danh sách.</small>}</label>
            <label><span>Quầy bán <em>*</em></span><select required value={posSessionForm.counter} disabled={!posCounters.length} onChange={e=>setPosSessionForm(f=>({...f,counter:e.target.value}))}><option value="">{posCounters.length?'Chọn quầy của rạp':'Đang tải quầy theo rạp…'}</option>{posCounters.filter(counter=>counter.status==='active'&&!counter.open_shift_id).map(counter=><option key={counter.id} value={counter.counter_code}>{counter.counter_code} · {counter.counter_name}</option>)}</select><small>{posCounters.filter(counter=>counter.status==='active'&&!counter.open_shift_id).length} quầy đang sẵn sàng tại rạp</small></label>
            <label><span>Tiền mặt đầu phiên <em>*</em></span><input required type="number" min={0} max={100000000} step={1000} value={posSessionForm.initial_cash} onChange={e=>setPosSessionForm(f=>({...f,initial_cash:Number(e.target.value)}))}/><small>Kiểm đếm và đối soát khi kết phiên.</small></label>
          </div></section>
          <section className="pos-session-section"><header><span><ShieldCheck size={17}/></span><div><b>Vai trò phiên làm việc <em>*</em></b><small>Chọn nghiệp vụ nhân viên được thực hiện trong phiên này.</small></div></header><div className="pos-session-role-grid">{POS_SALES_AREAS.map(area=>{const Icon=area.icon;const selected=posSessionForm.sales_areas.includes(area.value);return <label key={area.value} className={selected?'selected':''}><input type="checkbox" checked={selected} onChange={event=>setPosSessionForm(form=>({...form,sales_areas:event.target.checked?Array.from(new Set([...form.sales_areas,area.value])):form.sales_areas.filter(value=>value!==area.value)}))}/><span className="pos-session-role-icon"><Icon size={20}/></span><span><b>{area.label}</b><small>{area.description}</small></span><Check size={16}/></label>;})}</div></section>
          <label className="pos-session-notes"><span>Ghi chú bàn giao <small>Không bắt buộc</small></span><textarea rows={3} maxLength={1000} value={posSessionForm.notes} onChange={e=>setPosSessionForm(f=>({...f,notes:e.target.value}))} placeholder="Ví dụ: Nhận két tiền, máy in vé và máy quét mã hoạt động bình thường."/></label>
        </div><footer className="pos-session-modal-footer"><span><ShieldCheck size={15}/> Người cấp phiên, quầy bán và vai trò được lưu trong Aurora DB.</span><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>setShowPosSessionModal(false)}>Hủy</button><button type="submit" className="tms-btn tms-btn-primary" disabled={posSessionSaving||!posSessionForm.user_id||!posSessionForm.counter||!posSessionForm.sales_areas.length}><Play size={16}/>{posSessionSaving?'Đang cấp phiên…':'Cấp quyền & mở phiên'}</button></div></footer></form></div>}

        {posReportSession&&posSessionReport&&<button type="button" onClick={exportPosSessionReportPdf} style={{position:'fixed',top:'calc(50% - 284px)',right:'calc(50% - 505px)',zIndex:1005,display:'inline-flex',alignItems:'center',gap:7,minHeight:36,padding:'0 12px',border:'1px solid rgba(255,255,255,.34)',borderRadius:9,color:'#184f91',background:'#fff',fontSize:12,fontWeight:900,boxShadow:'0 8px 22px rgba(5,30,65,.2)',cursor:'pointer'}}><Printer size={16}/> Xuất PDF</button>}

        {posReportSession&&<div className="tms-modal-overlay pos-report-overlay"><div className="tms-modal-box pos-report-modal" role="dialog" aria-modal="true" aria-labelledby="pos-report-title"><header className="pos-report-header"><div><span>BÁO CÁO DOANH THU PHIÊN · AURORA DB</span><h2 id="pos-report-title">Chi tiết phiên PS-{String(posReportSession.id).padStart(5,'0')}</h2><p>{posReportSession.full_name} · {posReportSession.counter} · {formatPosDateTime(posReportSession.opened_at)}</p></div><button type="button" className="temp-btn" aria-label="Đóng báo cáo" onClick={()=>setPosReportSession(null)}><X size={18}/></button></header>{posSessionReportLoading?<div className="pos-report-loading"><RefreshCw size={25}/><b>Đang tổng hợp doanh thu</b><span>Đang đọc đơn hàng và chi tiết bán hàng từ Aurora DB…</span></div>:posSessionReport?<div className="pos-report-body"><section className="pos-report-summary"><article><small>Tổng doanh thu</small><b>{formatMoney(posSessionReport.summary.total_revenue)}</b><span>Sau giảm giá</span></article><article><small>Tổng đơn hàng</small><b>{posSessionReport.summary.order_count}</b><span>Đơn đã thanh toán</span></article><article><small>Tổng vé đã bán</small><b>{posSessionReport.groups?.tickets?.quantity||0}</b><span>{formatMoney(posSessionReport.groups?.tickets?.revenue||0)}</span></article><article><small>Giảm giá / CTKM</small><b>{formatMoney(posSessionReport.promotion.discount_amount)}</b><span>{posSessionReport.promotion.order_count||0} đơn áp dụng</span></article></section><section className="pos-report-section"><header><div><Receipt size={18}/><span><b>Doanh thu theo nhóm</b><small>Số lượng và giá trị bán thực tế của phiên</small></span></div></header><div className="pos-report-group-grid">{(Object.values(posSessionReport.groups||{}) as any[]).map(group=><article key={group.label}><div><span>{group.label}</span><b>{group.quantity} sản phẩm</b></div><strong>{formatMoney(group.revenue)}</strong></article>)}</div></section><section className="pos-report-section"><header><div><Ticket size={18}/><span><b>Chi tiết vé, combo và hàng hóa</b><small>Mỗi dòng được tổng hợp từ chi tiết đơn POS của phiên</small></span></div></header><div className="pos-report-lines">{(Object.values(posSessionReport.groups||{}) as any[]).map(group=>group.items?.length?<div key={group.label} className="pos-report-line-group"><h4>{group.label}<em>{formatMoney(group.revenue)}</em></h4>{group.items.map((item:any)=><div key={`${group.label}-${item.code}`}><span><b>{item.name}</b><small>{item.code}</small></span><strong>{item.quantity} × {formatMoney(item.unit_price)}</strong><em>{formatMoney(item.revenue)}</em></div>)}</div>:null)}</div></section><div className="pos-report-bottom-grid"><section className="pos-report-section"><header><div><CreditCard size={18}/><span><b>Phương thức thanh toán</b><small>Doanh thu thu được theo phương thức</small></span></div></header>{posSessionReport.payments?.length?<div className="pos-report-payments">{posSessionReport.payments.map((payment:any)=><div key={payment.method}><span>{payment.method==='CASH'?'Tiền mặt':payment.method==='CARD'?'Thẻ':'Chuyển khoản'}<small>{payment.order_count} đơn</small></span><b>{formatMoney(payment.revenue)}</b></div>)}</div>:<p className="pos-report-empty">Chưa có thanh toán phát sinh trong phiên.</p>}</section><section className="pos-report-section"><header><div><Tag size={18}/><span><b>CTKM / khuyến mãi</b><small>Đơn hàng có chiết khấu được ghi nhận</small></span></div></header><div className="pos-report-promotion"><b>{posSessionReport.promotion.order_count||0}</b><span>đơn áp dụng CTKM</span><strong>{formatMoney(posSessionReport.promotion.discount_amount||0)}</strong></div></section></div><section className="pos-report-section pos-report-orders"><header><div><FileText size={18}/><span><b>Đơn hàng trong phiên</b><small>Tối đa 100 đơn mới nhất</small></span></div></header><div className="pos-table-scroll"><table><thead><tr><th>Mã đơn</th><th>Thời gian</th><th>SL sản phẩm</th><th>Thanh toán</th><th>Giảm giá</th><th>Tổng tiền</th></tr></thead><tbody>{posSessionReport.orders?.length?posSessionReport.orders.map((order:any)=><tr key={order.order_code}><td>{order.order_code}</td><td>{formatPosDateTime(order.created_at)}</td><td>{order.item_quantity}</td><td>{order.payment_method}</td><td>{formatMoney(order.discount_amount)}</td><td>{formatMoney(order.total_amount)}</td></tr>):<tr><td colSpan={6} className="pos-report-empty">Chưa có đơn hàng trong phiên này.</td></tr>}</tbody></table></div></section></div>:null}<footer className="pos-report-footer"><span><ShieldCheck size={15}/> Báo cáo được tổng hợp trực tiếp từ dữ liệu giao dịch Aurora DB.</span><button type="button" className="tms-btn tms-btn-primary" onClick={()=>setPosReportSession(null)}>Đóng báo cáo</button></footer></div></div>}

        {closingPosSession&&<div className="tms-modal-overlay"><form className="tms-modal-box pos-session-modal" onSubmit={closePosSession}><header className="tms-modal-header"><div><span className="pos-modal-kicker">KIỂM ĐẾM & ĐỐI SOÁT</span><div className="tms-modal-title">Kết phiên PS-{String(closingPosSession.id).padStart(5,'0')}</div><p>{closingPosSession.full_name} · {closingPosSession.counter}</p></div><button type="button" className="temp-btn" onClick={()=>setClosingPosSession(null)}><X size={16}/></button></header><div className="tms-modal-body pos-editor-body"><div className="pos-close-summary"><span><small>Tiền đầu phiên</small><b>{formatMoney(closingPosSession.initial_cash)}</b></span><span><small>Thu tiền mặt</small><b>{formatMoney(closingPosSession.cash_revenue)}</b></span><span><small>Quỹ dự kiến</small><b>{formatMoney(closingPosSession.expected_cash)}</b></span></div><div className="pos-form-grid"><label className="full"><span>Tiền mặt kiểm đếm thực tế *</span><input required autoFocus type="number" min={0} max={1000000000} step={1000} value={posCloseForm.cash_at_close} onChange={e=>setPosCloseForm(f=>({...f,cash_at_close:Number(e.target.value)}))}/><small className={posCloseForm.cash_at_close-closingPosSession.expected_cash<0?'negative':''}>Chênh lệch: {formatMoney(posCloseForm.cash_at_close-closingPosSession.expected_cash)}</small></label><label className="full"><span>Ghi chú kết phiên</span><textarea rows={3} maxLength={1000} value={posCloseForm.close_note} onChange={e=>setPosCloseForm(f=>({...f,close_note:e.target.value}))} placeholder="Ghi rõ nguyên nhân nếu tiền thực tế lệch quỹ dự kiến."/></label></div></div><footer className="tms-modal-footer"><span><ShieldCheck size={15}/> Sau khi kết phiên, nhân viên mới có thể mở phiên tiếp theo.</span><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>setClosingPosSession(null)}>Hủy</button><button type="submit" className="tms-btn tms-btn-primary" disabled={posSessionSaving}><Check size={16}/>{posSessionSaving?'Đang đối soát…':'Xác nhận kết phiên'}</button></div></footer></form></div>}
      </div>;
    }

    if (a === 'staff' || a === 'shifts' || a === 'Nhân viên' || a === 'Nhân viên rạp' || a === 'Phiên làm việc') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar">
          <div style={{fontWeight:700}}>{role==='supervisor'?'Nhân viên ca trực hôm nay':'Danh sách nhân viên rạp'}</div>
          {role==='supervisor'&&staffShifts.filter(s=>s.status==='absent').length>0&&<div style={{fontSize:'0.8rem',background:'#fee2e2',color:'#991b1b',padding:'4px 12px',borderRadius:6,fontWeight:700}}>{staffShifts.filter(s=>s.status==='absent').length} nhân viên vắng mặt</div>}
        </div>
        <table className="tms-data-table">
          <thead><tr><th>Họ tên</th><th>Vị trí</th><th>Ca làm</th><th>Giờ làm</th><th>Check-in</th><th>Trạng thái</th>{role==='supervisor'&&<th>Thao tác</th>}</tr></thead>
          <tbody>{staffShifts.map(s=>(
            <tr key={s.id}>
              <td style={{fontWeight:700}}>{s.name}</td>
              <td style={{fontSize:'0.82rem',color:'#64748b'}}>{s.position}</td>
              <td>{s.shift}</td><td>{s.time}</td>
              <td><code style={{fontSize:'0.82rem'}}>{s.checkin}</code></td>
              <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 8px',borderRadius:4,background:s.status==='on_duty'?'#ecfdf5':s.status==='checked_in'?'#eff6ff':'#fee2e2',color:s.status==='on_duty'?'#065f46':s.status==='checked_in'?'#1e40af':'#991b1b'}}>{s.status==='on_duty'?'Đang trực':s.status==='checked_in'?'Đã check-in':'Vắng mặt'}</span></td>
              {role==='supervisor'&&<td>{s.status==='absent'?<button className="tms-btn tms-btn-outline" style={{padding:'4px 10px',fontSize:'0.73rem'}} onClick={()=>{setStaffShifts(prev=>prev.map(x=>x.id===s.id?{...x,status:'absent'}:x));alert('Đã ghi nhận vắng mặt và thông báo cấp trên.')}}>Ghi nhận vắng</button>:<button className="tms-btn tms-btn-outline" style={{padding:'4px 10px',fontSize:'0.73rem'}}>Điểm danh</button>}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // TRANSACTIONS (POS / accounting)
    if (a === 'transactions' || a === 'pos_txns' || a === 'Xem giao dịch' || a === 'Lịch sử thanh toán' || a === 'Giao dịch POS') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar">
          <div style={{fontWeight:700}}>{role==='supervisor'?'Giao dịch POS hôm nay':role==='accounting'?'Danh sách giao dịch':'Giao dịch'}</div>
          {role==='supervisor'&&cancelRequests>0&&<div style={{fontSize:'0.8rem',background:'#fef3c7',color:'#92400e',padding:'4px 12px',borderRadius:6,fontWeight:700}}>{cancelRequests} yêu cầu hủy chờ duyệt</div>}
        </div>
        <table className="tms-data-table">
          <thead><tr><th>Mã GD</th><th>Khách hàng</th><th>Kênh</th><th>Số tiền</th><th>Thanh toán</th><th>Trạng thái</th>{role==='supervisor'&&<th>Phê duyệt hủy</th>}</tr></thead>
          <tbody>{txnsList.map(t=>(
            <tr key={t.id} style={{background:t.cancel_requested?'#fffbeb':'transparent'}}>
              <td><code>{t.transaction_code}</code>{t.cancel_requested&&<span style={{marginLeft:6,fontSize:'0.7rem',background:'#fef3c7',color:'#92400e',padding:'1px 5px',borderRadius:3,fontWeight:700}}>Yêu cầu hủy</span>}</td>
              <td><div style={{fontWeight:600}}>{t.customer_name}</div><div style={{fontSize:'0.73rem',color:'#64748b'}}>{t.customer_phone}</div></td>
              <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 8px',borderRadius:4,background:t.channel==='pos'?'#dbeafe':t.channel==='website'?'#d1fae5':'#fde8d8',color:t.channel==='pos'?'#1e40af':t.channel==='website'?'#065f46':'#c2410c'}}>{t.channel.toUpperCase()}</span></td>
              <td style={{fontWeight:700,color:'#059669'}}>{t.amount.toLocaleString('vi-VN')} đ</td>
              <td>{t.payment_method}</td>
              <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:t.status==='paid'?'#ecfdf5':t.status==='cancelled'?'#fee2e2':'#fef3c7',color:t.status==='paid'?'#065f46':t.status==='cancelled'?'#991b1b':'#92400e'}}>{t.status==='paid'?'Đã TT':t.status==='cancelled'?'Đã hủy':'Chờ xử lý'}</span></td>
              {role==='supervisor'&&<td>{t.cancel_requested&&t.status==='paid'?<div style={{display:'flex',gap:4}}><button className="tms-btn tms-btn-success" style={{padding:'3px 8px',fontSize:'0.72rem'}} onClick={()=>handleCancelTxn(t.id,true)}><Check size={12}/> Duyệt</button><button className="tms-btn tms-btn-danger" style={{padding:'3px 8px',fontSize:'0.72rem'}} onClick={()=>handleCancelTxn(t.id,false)}><X size={12}/> Từ chối</button></div>:<span style={{color:'#94a3b8',fontSize:'0.75rem'}}>—</span>}</td>}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // REFUNDS / APPROVALS
    if (a === 'refunds' || a === 'approvals' || a === 'Hoàn tiền' || a === 'Hủy giao dịch' || a === 'Nghiệp vụ ngoại lệ') return (
      <div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <div>
            <h2 style={{margin:0,fontSize:'1.1rem',fontWeight:800}}>Phê duyệt hoàn tiền</h2>
            <p style={{margin:'4px 0 0',fontSize:'0.82rem',color:'#64748b'}}>{role==='supervisor'?'Phê duyệt/Từ chối yêu cầu từ nhân viên POS':'Theo dõi và đối soát hoàn tiền'}</p>
          </div>
          {role==='supervisor'&&<button className="tms-btn tms-btn-primary" onClick={()=>{setRefundForm({transaction_code:'',customer_name:'',amount:190000,reason:'',payment_method:'cash'});setShowRefundModal(true);}}><Plus size={16}/><span>Tạo phiếu hoàn tiền</span></button>}
        </div>
        {role==='supervisor'&&<div style={{padding:'12px 16px',background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:10,marginBottom:16,fontSize:'0.84rem',color:'#15803d'}}><b>Quy trình phê duyệt:</b> Nhân viên POS → Gửi yêu cầu hủy → <b>Supervisor kiểm tra → Phê duyệt/Từ chối</b> → Hệ thống cập nhật giao dịch</div>}
        <div className="tms-card-table">
          <table className="tms-data-table">
            <thead><tr><th>Mã GD</th><th>Khách hàng</th><th>Lý do</th><th>Số tiền</th><th>Yêu cầu bởi</th><th>Ngày</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{refundsList.map(r=>(
              <tr key={r.id}>
                <td><code>{r.transaction_code}</code></td>
                <td>{r.customer_name}</td>
                <td style={{fontSize:'0.8rem',color:'#64748b',maxWidth:160}}>{r.reason}</td>
                <td style={{fontWeight:700,color:'#d97706'}}>{r.amount.toLocaleString('vi-VN')} đ</td>
                <td style={{fontSize:'0.78rem',color:'#64748b'}}>{r.requested_by||'—'}</td>
                <td style={{fontSize:'0.78rem',color:'#64748b'}}>{r.created_at}</td>
                <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 8px',borderRadius:4,background:r.status==='pending'?'#fef3c7':r.status==='approved'?'#eff6ff':r.status==='completed'?'#ecfdf5':'#fee2e2',color:r.status==='pending'?'#92400e':r.status==='approved'?'#1e40af':r.status==='completed'?'#065f46':'#991b1b'}}>{r.status==='pending'?'Chờ duyệt':r.status==='approved'?'Đã duyệt':r.status==='completed'?'Hoàn tất':'Từ chối'}</span></td>
                <td>
                  {r.status==='pending'&&<div style={{display:'flex',gap:4}}><button className="tms-btn tms-btn-success" style={{padding:'3px 8px',fontSize:'0.72rem'}} onClick={()=>handleRefundApproval(r.id,'approved')}><Check size={12}/> Duyệt</button><button className="tms-btn tms-btn-danger" style={{padding:'3px 8px',fontSize:'0.72rem'}} onClick={()=>handleRefundApproval(r.id,'rejected')}><X size={12}/> Từ chối</button></div>}
                  {r.status==='approved'&&<button className="tms-btn tms-btn-primary" style={{padding:'3px 8px',fontSize:'0.72rem'}} onClick={()=>handleRefundApproval(r.id,'completed')}>Hoàn tất</button>}
                  {(r.status==='completed'||r.status==='rejected')&&<span style={{color:'#94a3b8',fontSize:'0.75rem'}}>—</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    );

    // PRICING
    if (a === 'pricing' || a === 'Chính sách giá chung' || a === 'Áp dụng giá vé') return (
      <div className="pricing-policy-page">
        <section className="pricing-guide"><span><Clock size={17}/></span><div><b>Khung giờ được áp dụng</b><p><strong>Sáng</strong> trước 12:00 · <strong>Tiêu chuẩn</strong> 12:00–17:59 · <strong>Buổi tối</strong> từ 18:00. Giá được hệ thống chọn theo ngày chiếu.</p></div><em>{role === 'super_admin' ? 'Bạn có quyền ban hành giá' : 'Bảng giá do Admin Tổng ban hành'}</em></section>
        <section className="pricing-policy-card">
          <div className="pricing-card-heading"><div><h3>Ma trận giá vé</h3><p>Mỗi số là giá cho 01 vé; riêng Vé ghế đôi là giá cho 01 cặp ghế.</p></div><div className="pricing-heading-tools"><div className="pricing-legends"><i className="weekday"/>Ngày thường<i className="weekend"/>Cuối tuần<i className="holiday"/>Ngày lễ</div>{role === 'super_admin' && <button type="button" className="tms-btn tms-btn-primary pricing-create-button" onClick={openPricingCreate}><Plus size={16}/> Tạo loại vé</button>}<button type="button" className="tms-btn tms-btn-outline" onClick={loadPricingPolicies}><RefreshCw size={15}/> Đồng bộ giá</button></div></div>
          {pricingLoading ? <div className="pricing-empty">Đang đồng bộ chính sách giá từ Aurora DB…</div> : pricingTypes.length ? <div className="pricing-table-scroll"><table className="pricing-policy-table"><thead><tr><th rowSpan={2}>Loại vé</th><th colSpan={3} className="weekday">Ngày thường</th><th colSpan={3} className="weekend">Cuối tuần</th><th colSpan={3} className="holiday">Ngày lễ</th><th rowSpan={2}>Thao tác</th></tr><tr>{['Sáng','Tiêu chuẩn','Tối','Sáng','Tiêu chuẩn','Tối','Sáng','Tiêu chuẩn','Tối'].map((label, index)=><th key={`${label}-${index}`}>{label}</th>)}</tr></thead><tbody>{pricingTypes.map(ticket => <tr key={ticket.id}><td><b>{ticket.name}</b><small>{ticket.code}{ticket.code === 'TICKET_COUPLE' ? ' · / cặp' : ''}</small></td>{(['weekday','weekend','holiday'] as const).flatMap(day => (['morning','standard','evening'] as const).map(slot => { const value = Number(ticket.matrix?.[day]?.[slot] ?? 0); return <td key={`${day}-${slot}`} className={value < 0 ? 'unavailable' : value === 0 ? 'free' : ''}>{value < 0 ? 'Không áp dụng' : value === 0 ? 'Miễn phí' : `${value.toLocaleString('vi-VN')} ₫`}</td>; }))}<td>{role==='super_admin'?<button type="button" className="pricing-edit-button" onClick={()=>openPricingEditor(ticket)}><Edit size={14}/>{isStaffTicket(ticket) ? 'Xem quy định' : 'Chỉnh giá'}</button>:<span className="pricing-readonly">Chỉ xem</span>}</td></tr>)}</tbody></table></div> : <div className="pricing-empty">Chưa có dữ liệu giá vé. Hãy đồng bộ lại Aurora DB.</div>}
        </section>
        <p className="pricing-footnote"><ShieldCheck size={15}/> Các thay đổi được ghi vào <b>aurora_db.tms_ticket_price_matrix</b> và lưu lịch sử ban hành để đối soát.</p>
      </div>
    );

    // PROMOTIONS & CTKM
    if (a === 'promotions' || a === 'Duyệt kế hoạch CTKM' || a === 'Quản lý CTKM hệ thống' || a === 'Voucher / CTKM' || a === 'Voucher tại rạp' || a === 'Tiếp nhận CTKM' || a === 'Triển khai CTKM' || a === 'Đề xuất điều chỉnh') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar">
          <div style={{fontWeight:700}}>{role==='super_admin'?'Quản lý CTKM cấp hệ thống':'Voucher & CTKM tại rạp'}</div>
          {(role==='super_admin'||role==='cinema_admin')&&<button className="tms-btn tms-btn-primary" onClick={()=>alert(role==='super_admin'?'Tạo CTKM hệ thống mới':'Tạo voucher tại rạp')}><Plus size={16}/><span>{role==='super_admin'?'Tạo CTKM hệ thống':'Tạo voucher'}</span></button>}
        </div>
        <table className="tms-data-table">
          <thead><tr><th>Mã</th><th>Tên CTKM</th><th>Loại</th><th>Giá trị</th><th>Hiệu lực</th><th>Cấp độ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{[
            {code:'AURORA10',name:'Giảm 10% cuối tuần',type:'%',val:'10%',valid:'01-30/09/2026',level:'Hệ thống',status:'Đang hoạt động'},
            {code:'HAPPY50K',name:'Giảm 50K vé IMAX',type:'Cố định',val:'50.000 đ',valid:'20-30/09/2026',level:'Hệ thống',status:'Đang hoạt động'},
            {code:'RAPVIP20',name:'VIP Rạp Tân Bình 20%',type:'%',val:'20%',valid:'01-30/09/2026',level:'Tại rạp',status:'Đang hoạt động'},
          ].map((v,i)=>(
            <tr key={i}>
              <td><code style={{fontWeight:700}}>{v.code}</code></td>
              <td style={{fontWeight:600}}>{v.name}</td><td>{v.type}</td>
              <td style={{fontWeight:700,color:'#d97706'}}>{v.val}</td><td style={{fontSize:'0.8rem'}}>{v.valid}</td>
              <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:v.level==='Hệ thống'?'#fef3c7':'#eff6ff',color:v.level==='Hệ thống'?'#92400e':'#1e40af'}}>{v.level==='Hệ thống'?'👑 Hệ thống':'🏢 Tại rạp'}</span></td>
              <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:'#ecfdf5',color:'#065f46'}}>{v.status}</span></td>
              <td>
                {a==='Duyệt kế hoạch CTKM'&&<button className="tms-btn tms-btn-success" style={{padding:'4px 10px',fontSize:'0.73rem'}}><Check size={12}/> Duyệt</button>}
                {a==='Triển khai CTKM'&&<button className="tms-btn tms-btn-primary" style={{padding:'4px 10px',fontSize:'0.73rem'}}>Triển khai</button>}
                {a==='Đề xuất điều chỉnh'&&<button className="tms-btn tms-btn-outline" style={{padding:'4px 10px',fontSize:'0.73rem'}}>Đề xuất</button>}
                {(a==='promotions'||a==='Quản lý CTKM hệ thống'||a==='Voucher tại rạp'||a==='Voucher / CTKM')&&<button className="tms-btn tms-btn-outline" style={{padding:'4px 8px'}}><Edit size={13}/></button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // PRODUCTS
    if (a === 'products' || a === 'Hàng hóa' || a === 'catalog' || a === 'Danh mục dùng chung') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div className="tms-search-input"><Package size={16} color="#94a3b8"/><input placeholder="Tìm hàng hóa..."/></div><button className="tms-btn tms-btn-primary" onClick={()=>alert('Thêm hàng hóa')}><Plus size={16}/><span>Thêm hàng hóa</span></button></div>
        <table className="tms-data-table">
          <thead><tr><th>SKU</th><th>Tên hàng hóa</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th></tr></thead>
          <tbody>{[
            {sku:'FNB_001',name:'Bắp rang bơ (Lớn)',cat:'F&B',price:65000,stock:120,ok:true},
            {sku:'FNB_002',name:'Coca-Cola 500ml',cat:'F&B',price:35000,stock:240,ok:true},
            {sku:'FNB_003',name:'Combo Bắp + 2 Nước',cat:'Combo',price:120000,stock:80,ok:true},
            {sku:'FNB_004',name:'Nước khoáng 500ml',cat:'F&B',price:20000,stock:15,ok:false},
          ].map(p=>(
            <tr key={p.sku}><td><code>{p.sku}</code></td><td style={{fontWeight:700}}>{p.name}</td><td>{p.cat}</td><td style={{fontWeight:800,color:'#059669'}}>{p.price.toLocaleString('vi-VN')} đ</td><td style={{fontWeight:600,color:p.stock<20?'#dc2626':'#0f172a'}}>{p.stock}</td><td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:p.ok?'#ecfdf5':'#fef3c7',color:p.ok?'#065f46':'#92400e'}}>{p.ok?'Còn hàng':'Sắp hết'}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    );

    // REPORTS
    if (a === 'reports' || a === 'Báo cáo tổng hợp' || a === 'Báo cáo rạp' || a === 'Báo cáo vận hành' || a === 'Báo cáo' || a === 'Báo cáo doanh thu' || a === 'Báo cáo bán vé' || a === 'Báo cáo bán hàng' || a === 'Báo cáo phương thức TT') return (
      <div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,marginBottom:20}}>
          {[{label:'Doanh thu tháng 9/2026',val:'1.235.640.000 đ',color:'#2563eb'},{label:'Số vé bán tháng 9',val:'45.820 vé',color:'#059669'},{label:'Doanh thu F&B',val:'185.320.000 đ',color:'#d97706'},{label:'Tỷ lệ lấp đầy',val:'78.3%',color:'#7c3aed'}].map((s,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:16,display:'flex',gap:14,alignItems:'center'}}>
              <div style={{background:s.color+'1a',color:s.color,padding:10,borderRadius:8,fontWeight:800,fontSize:'1.2rem'}}>📊</div>
              <div><div style={{fontSize:'0.82rem',color:'#64748b'}}>{s.label}</div><div style={{fontSize:'1.15rem',fontWeight:800,color:'#0f172a'}}>{s.val}</div></div>
            </div>
          ))}
        </div>
        <div className="card revenue-card">
          <div className="card-title"><div><h2>{role==='accounting'?'Báo cáo tài chính chuyên sâu':role==='supervisor'?'Báo cáo vận hành ca':'Báo cáo tổng hợp hệ thống'}</h2><span>Tháng 9/2026</span></div><button className="tms-btn tms-btn-outline" style={{fontSize:'0.78rem'}}>Xuất Excel</button></div>
          <div className="line-chart">
            <div className="y-axis"><span>60M</span><span>45M</span><span>30M</span><span>15M</span><span>0</span></div>
            <div className="chart-body">
              <div className="grid-lines">{[1,2,3,4,5].map(l=><i key={l}/>)}</div>
              <svg viewBox="0 0 700 180" preserveAspectRatio="none"><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64 L650 180 L20 180Z" fill="#2774e926"/><path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64" fill="none" stroke="#1d6beb" strokeWidth="2.5"/></svg>
              <div className="chart-points">{[28.5,32.7,30.1,42.8,38.6,40.2,45.2].map((v,i)=><div className="point" style={{left:`${3+i*16.5}%`,top:`${66-(v-28)*3.1}%`}} key={v}><b>{v}M</b><i/><span>{['21','22','23','24','25','26','27'][i]}/09</span></div>)}</div>
            </div>
          </div>
        </div>
      </div>
    );

    // INVOICES (accounting)
    if (a === 'invoices' || a === 'Hóa đơn') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div style={{fontWeight:700}}>Danh sách hóa đơn</div></div>
        <table className="tms-data-table">
          <thead><tr><th>Số hóa đơn</th><th>Ngày</th><th>Khách hàng</th><th>Tổng tiền</th><th>Loại</th><th>Trạng thái</th></tr></thead>
          <tbody>{[
            {inv:'INV-2609-001',date:'27/09/2026',cust:'Nguyễn Trần Thái Bảo',amt:280000,type:'Vé phim',status:'Đã xuất'},
            {inv:'INV-2609-002',date:'27/09/2026',cust:'Võ Hoàng Yến',amt:190000,type:'Vé phim',status:'Đã xuất'},
            {inv:'INV-2609-003',date:'27/09/2026',cust:'Lê Minh Quân',amt:420000,type:'Vé + F&B',status:'Đã xuất'},
          ].map((r,i)=>(
            <tr key={i}><td><code style={{fontWeight:700}}>{r.inv}</code></td><td>{r.date}</td><td>{r.cust}</td><td style={{fontWeight:800,color:'#059669'}}>{r.amt.toLocaleString('vi-VN')} đ</td><td>{r.type}</td><td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:'#ecfdf5',color:'#065f46'}}>{r.status}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    );

    // RECONCILIATION (accounting)
    if (a === 'reconciliation' || a === 'Đối soát' || a === 'Đối soát giao dịch' || a === 'Đối soát thanh toán') return (
      <div>
        <h2 style={{fontSize:'1rem',fontWeight:800,marginBottom:16}}>Đối soát kênh thanh toán hôm nay</h2>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
          {[
            {label:'POS Quầy vé',sys:'23.610.000',act:'23.610.000',diff:'0',ok:true},
            {label:'VNPAY / VietQR',sys:'12.340.000',act:'12.290.000',diff:'-50.000',ok:false},
            {label:'Thẻ ngân hàng',sys:'8.140.000',act:'8.140.000',diff:'0',ok:true},
          ].map((r,i)=>(
            <div key={i} style={{background:'#fff',border:`1px solid ${r.ok?'#bbf7d0':'#fca5a5'}`,borderRadius:12,padding:16}}>
              <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:10}}>{r.label}</div>
              <div style={{fontSize:'0.82rem',display:'flex',flexDirection:'column',gap:6}}>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#64748b'}}>Hệ thống:</span><b>{r.sys} đ</b></div>
                <div style={{display:'flex',justifyContent:'space-between'}}><span style={{color:'#64748b'}}>Thực tế:</span><b>{r.act} đ</b></div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:4,paddingTop:4,borderTop:'1px solid #e2e8f0'}}><span style={{fontWeight:700}}>Chênh lệch:</span><b style={{color:r.ok?'#059669':'#dc2626'}}>{r.diff} đ</b></div>
              </div>
              <div style={{marginTop:8,fontSize:'0.74rem',fontWeight:700,padding:'3px 8px',borderRadius:4,display:'inline-block',background:r.ok?'#ecfdf5':'#fee2e2',color:r.ok?'#065f46':'#991b1b'}}>{r.ok?'✅ Khớp số liệu':'⚠️ Lệch — Cần xem lại'}</div>
            </div>
          ))}
        </div>
      </div>
    );

    // POS DEVICES
    if (a === 'pos_devices' || a === 'Thiết bị POS' || a === 'Quản lý POS' || a === 'Phê duyệt POS') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div style={{fontWeight:700}}>Quản lý thiết bị POS toàn hệ thống</div><button className="tms-btn tms-btn-primary" onClick={()=>alert('Thêm thiết bị POS')}><Plus size={16}/><span>Thêm POS</span></button></div>
        <table className="tms-data-table">
          <thead><tr><th>Mã thiết bị</th><th>Tên</th><th>Rạp</th><th>IP</th><th>Phiên bản</th><th>Trạng thái</th><th>Phê duyệt</th></tr></thead>
          <tbody>{[
            {code:'POS-TB-001',name:'Quầy POS 1 - Tân Bình',cinema:'Aurora - Tân Bình',ip:'192.168.1.10',ver:'v4.2.1',ok:true,online:true},
            {code:'POS-TB-002',name:'Quầy POS 2 - Tân Bình',cinema:'Aurora - Tân Bình',ip:'192.168.1.11',ver:'v4.2.1',ok:true,online:true},
            {code:'POS-Q7-001',name:'Quầy POS 1 - Quận 7',cinema:'Aurora - Quận 7',ip:'10.10.1.10',ver:'v4.1.8',ok:false,online:false},
          ].map((p,i)=>(
            <tr key={i}><td><code>{p.code}</code></td><td style={{fontWeight:600}}>{p.name}</td><td>{p.cinema}</td><td style={{fontFamily:'monospace',fontSize:'0.82rem'}}>{p.ip}</td><td>{p.ver}</td>
            <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:p.online?'#ecfdf5':'#fee2e2',color:p.online?'#065f46':'#991b1b'}}>{p.online?'Online':'Offline'}</span></td>
            <td>{!p.ok?<button className="tms-btn tms-btn-success" style={{padding:'4px 10px',fontSize:'0.73rem'}} onClick={()=>alert(`Đã phê duyệt ${p.code}`)}><Check size={12}/> Phê duyệt</button>:<span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:'#ecfdf5',color:'#065f46'}}>✅ Đã duyệt</span>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // AUDIT LOG
    if (a === 'audit_log' || a === 'Audit Log') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div style={{fontWeight:700}}>Audit Log — Lịch sử hoạt động hệ thống</div></div>
        <table className="tms-data-table">
          <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Vai trò</th><th>Hành động</th><th>Đối tượng</th><th>IP</th></tr></thead>
          <tbody>{[
            {time:'27/09 00:15',user:'admin_tong',role:'super_admin',action:'LOGIN',target:'TMS System',ip:'192.168.1.1'},
            {time:'27/09 00:10',user:'admin_rap',role:'cinema_admin',action:'UPDATE_SCHEDULE',target:'Lịch chiếu #SC048',ip:'192.168.1.2'},
            {time:'27/09 00:08',user:'accounting',role:'accounting',action:'APPROVE_REFUND',target:'TXN-260892',ip:'192.168.1.3'},
            {time:'27/09 00:05',user:'supervisor',role:'supervisor',action:'CREATE_REFUND_REQUEST',target:'TXN-260901',ip:'192.168.1.4'},
            {time:'26/09 23:50',user:'admin_tong',role:'super_admin',action:'ALLOCATE_MOVIE',target:'Avatar → Rạp 1,2,3',ip:'192.168.1.1'},
            {time:'26/09 23:45',user:'admin_tong',role:'super_admin',action:'CREATE_USER',target:'@admin_rap2',ip:'192.168.1.1'},
          ].map((log,i)=>(
            <tr key={i}>
              <td style={{fontSize:'0.8rem',color:'#64748b'}}>{log.time}</td>
              <td><code>@{log.user}</code></td>
              <td><span className={`role-badge-pill ${log.role}`} style={{fontSize:'0.7rem'}}>{ROLE_CONFIGS[log.role as TMSRole]?.badge||log.role}</span></td>
              <td style={{fontWeight:700,fontSize:'0.82rem',fontFamily:'monospace',color:'#2563eb'}}>{log.action}</td>
              <td style={{fontSize:'0.82rem'}}>{log.target}</td>
              <td style={{fontSize:'0.78rem',color:'#94a3b8'}}>{log.ip}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // SETTINGS
    if (a === 'settings' || a === 'Cấu hình hệ thống') return (
      <div className="tms-card-table" style={{padding:24}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
          <div style={{background:'#fef3c7',color:'#d97706',padding:12,borderRadius:10}}><ShieldAlert size={28}/></div>
          <div><h3 style={{margin:0,fontSize:'1.1rem',fontWeight:800}}>Cấu hình hệ thống TMS (Admin Tổng)</h3><p style={{margin:'3px 0 0',fontSize:'0.84rem',color:'#64748b'}}>Thiết lập máy chủ, kết nối MySQL WAMP Server và cài đặt bảo mật RBAC.</p></div>
        </div>
        <div style={{background:'#f8fafc',border:'1px solid #e2e8f0',borderRadius:10,padding:16}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16,fontSize:'0.85rem'}}>
            <div><b>Cơ sở dữ liệu:</b> MySQL 5.0.51b / aurora_db (WAMP)</div>
            <div><b>Kết nối:</b> <span style={{color:'#059669',fontWeight:700}}>● Đang kết nối</span></div>
            <div><b>Phân quyền:</b> Multi-role RBAC (4 Vai trò)</div>
            <div><b>Mã hóa mật khẩu:</b> Bcrypt Hash an toàn</div>
            <div><b>Phiên bản TMS:</b> RBAC v2.0.0</div>
            <div><b>Web Server:</b> WAMP Apache 2.x</div>
          </div>
        </div>
      </div>
    );

    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'60px 24px',textAlign:'center',color:'#64748b'}}>
        <div style={{fontSize:48,marginBottom:16}}>📋</div>
        <div style={{fontWeight:700,fontSize:'1.1rem',color:'#0f172a',marginBottom:8}}>Nội dung đang được phát triển</div>
        <div style={{fontSize:'0.85rem'}}>Module này sẽ được cập nhật sớm.</div>
      </div>
    );
  };

  // ============================================================
  // RENDER MAIN APP
  // ============================================================
  const displayName = currentUser?.full_name || '';

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      {systemConfirm && (
        <div className="aurora-dialog-backdrop" role="presentation">
          <section className="aurora-dialog" role="alertdialog" aria-modal="true" aria-labelledby="aurora-dialog-title" aria-describedby="aurora-dialog-message">
            <button type="button" className="aurora-dialog-close" aria-label="Đóng" onClick={() => setSystemConfirm(null)}><X size={18} /></button>
            <div className="aurora-dialog-mark"><ShieldAlert size={28} /></div>
            <div className="aurora-dialog-eyebrow">AURORA CINEMA · XÁC NHẬN</div>
            <h2 id="aurora-dialog-title">{systemConfirm.title || 'Bạn muốn tiếp tục?'}</h2>
            <p id="aurora-dialog-message">{systemConfirm.message}</p>
            <div className="aurora-dialog-actions">
              <button type="button" className="aurora-dialog-cancel" onClick={() => setSystemConfirm(null)}>Quay lại</button>
              <button type="button" className="aurora-dialog-confirm" onClick={() => {
                const action = systemConfirm.onConfirm;
                setSystemConfirm(null);
                Promise.resolve(action()).catch(() => showSystemNotice('Không thể hoàn tất thao tác. Vui lòng thử lại.'));
              }}>{systemConfirm.actionLabel}</button>
            </div>
          </section>
        </div>
      )}
      {systemNotice && (
        <div className={`aurora-notice aurora-notice-${systemNotice.type}`} role="alert" aria-live="assertive">
          <div className="aurora-notice-icon">{systemNotice.type === 'success' ? <CheckCircle2 size={23} /> : systemNotice.type === 'error' ? <XCircle size={23} /> : <AlertTriangle size={23} />}</div>
          <div className="aurora-notice-content"><strong>{systemNotice.type === 'success' ? 'Thao tác thành công' : systemNotice.type === 'error' ? 'Cần xử lý' : 'Lưu ý hệ thống'}</strong><span>{systemNotice.message}</span></div>
          <button type="button" className="aurora-notice-close" aria-label="Đóng thông báo" onClick={() => setSystemNotice(null)}><X size={17} /></button>
        </div>
      )}
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-image" role="img" aria-label="Aurora Cinema" />
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>
        <div className="system-title"><b>TMS</b><span>Theater Management System</span></div>

        {/* Navigation */}
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            const hasChildren = !!item.children;
            const isExp = expanded === item.id;
            const isAct = active === item.id || (hasChildren && item.children!.some(c => c === active));
            return (
              <div className="nav-section" key={item.id}>
                <button className={isAct ? 'nav-active' : ''} title={item.name} aria-label={item.name} onClick={() => {
                  if (!hasChildren) { setActive(item.id); }
                  else { setExpanded(isExp ? '' : item.id); if (!isAct) setActive(item.id); }
                }}>
                  <Icon size={19} /><span>{item.name}</span>
                  {hasChildren && <ChevronDown className={`nav-chevron ${isExp ? 'rotated' : ''}`} size={15} />}
                </button>
                {hasChildren && isExp && (
                  <div className="subnav">
                    {item.children!.map(child => (
                      <button key={child} className={active === child ? 'sub-active' : ''} onClick={() => { setActive(child); }}>{child}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      {sidebarOpen && <button type="button" className="sidebar-backdrop" aria-label="Đóng menu điều hướng" onClick={() => setSidebarOpen(false)} />}

      {/* MAIN CONTENT */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button type="button" className="open-sidebar" onClick={() => setSidebarOpen(open => !open)} aria-label={sidebarOpen ? 'Thu gọn menu điều hướng' : 'Mở menu điều hướng'} title={sidebarOpen ? 'Thu gọn menu' : 'Mở menu'}><Menu size={23} /></button>
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            {/* Notifications */}
            <div className="notification">
              <button type="button" className={`notification-trigger ${noticeOpen ? 'active' : ''}`} onClick={() => { setNoticeOpen(open => !open); setUserDropdownOpen(false); }} aria-label="Mở thông báo hệ thống" aria-expanded={noticeOpen}>
                <Bell size={23} />
                {totalNotif > 0 && <b>{totalNotif}</b>}
              </button>
              {noticeOpen && (
                <div className="notification-pop" role="dialog" aria-label="Thông báo hệ thống">
                  <header><div><b>Thông báo</b><span>{totalNotif ? `${totalNotif} mục cần xử lý` : 'Bạn đã xem hết thông báo'}</span></div><button type="button" onClick={() => setNoticeOpen(false)} aria-label="Đóng thông báo"><X size={15} /></button></header>
                  <div className="notification-list">
                    {pendingRefunds > 0 && <button type="button" onClick={() => { setActive('refunds'); setNoticeOpen(false); }}><span className="notification-dot amber"><DollarSign size={14} /></span><p><b>{pendingRefunds} yêu cầu hoàn tiền</b><small>Cần kiểm tra và xử lý</small></p><ChevronDown size={15} /></button>}
                    {cancelRequests > 0 && <button type="button" onClick={() => { setActive('transactions'); setNoticeOpen(false); }}><span className="notification-dot red"><Receipt size={14} /></span><p><b>{cancelRequests} yêu cầu hủy giao dịch</b><small>Cần phê duyệt trước khi hoàn tất</small></p><ChevronDown size={15} /></button>}
                    {totalNotif === 0 && <div className="notification-empty"><CheckCircle2 size={21} /><b>Không có thông báo mới</b><span>Mọi tác vụ đang được cập nhật.</span></div>}
                  </div>
                </div>
              )}
            </div>

            {/* User info - NO ROLE SWITCHER */}
            <div className="topbar-user-wrap">
              <button type="button" className="topbar-user-btn" onClick={() => setUserDropdownOpen(!userDropdownOpen)}>
                <div className="hello"><span>Xin chào,</span><strong>{displayName}</strong></div>
                <span className={`role-badge-pill ${role}`}>{rc.badge}</span>
                <ChevronDown size={15} />
                <div className="user-icon"><UserRound size={20} /></div>
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu" style={{ width: 270 }}>
                  <div className="user-dropdown-header">
                    <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{rc.emoji}</div>
                    <b>{displayName}</b>
                    <div style={{ fontSize: '0.78rem', color: rc.color, fontWeight: 700, marginTop: 2 }}>{rc.name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: 1 }}>@{currentUser?.username}</div>
                  </div>

                  <button type="button" className="user-dropdown-item danger" onClick={handleLogout} style={{ marginTop: 4 }}>
                    <LogOut size={16} /><span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="content">
          {/* Page heading */}
          <div className="heading">
            <div>
              <h1>{pageTitleFor(active, role)}</h1>
              <div className="crumb">
                <span>TMS</span><b>›</b>
                <span className={`role-badge-pill ${role}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>{rc.name}</span>
                <b>›</b><strong>{active === 'dashboard' ? 'Dashboard' : pageTitleFor(active, role)}</strong>
              </div>
            </div>
            <div className="filters" aria-label="Bộ lọc thời gian báo cáo">
              <div className="date-filter-control">
                <button
                  type="button"
                  className="date-filter-trigger"
                  onClick={() => {
                    const input = reportDateInputRef.current;
                    if (!input) return;
                    if (typeof input.showPicker === 'function') input.showPicker();
                    else { input.focus(); input.click(); }
                  }}
                  aria-label="Chọn ngày báo cáo"
                >
                <span className="date-filter-icon"><CalendarDays size={17} /></span>
                <span className="date-filter-copy">
                  <strong>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${reportDate}T00:00:00`))}</strong>
                </span>
                </button>
                <input
                  ref={reportDateInputRef}
                  className="date-filter-native-input"
                  type="date"
                  value={reportDate}
                  onChange={e => setReportDate(e.target.value)}
                  tabIndex={-1}
                />
              </div>
              <label className="period-filter-control">
                <span className="period-filter-copy"><small>Phạm vi hiển thị</small><strong>{period}</strong></span>
                <ChevronDown size={16} aria-hidden="true" />
                <select value={period} onChange={e => setPeriod(e.target.value)} aria-label="Chọn phạm vi hiển thị">
                  <option>Hôm nay</option>
                  <option>7 ngày gần nhất</option>
                  <option>Tháng này</option>
                </select>
              </label>
            </div>
          </div>

          {renderContent()}

          <footer>© 2026 Aurora Cinema • Theater Management System (TMS)<span>RBAC v2.0.0</span></footer>
        </div>
      </main>

      {/* MODAL: ADD/EDIT USER (super_admin only) */}
      {showUserModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box user-account-modal" role="dialog" aria-modal="true" aria-labelledby="user-account-modal-title">
            <div className="tms-modal-header">
              <div><span className="user-modal-kicker">AURORA DB · QUẢN TRỊ TRUY CẬP</span><div id="user-account-modal-title" className="tms-modal-title">{userForm.id > 0 ? 'Cập nhật tài khoản vận hành' : 'Tạo tài khoản vận hành mới'}</div><p className="user-modal-subtitle">Hồ sơ, quyền truy cập và phạm vi làm việc được quản lý tập trung.</p></div>
              <button type="button" className="temp-btn" aria-label="Đóng modal" onClick={() => setShowUserModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="tms-modal-body user-account-modal-body">
                <section className="user-form-main">
                  <div className="user-form-section-title"><span><UserRound size={16}/></span><div><b>Thông tin tài khoản</b><small>Thông tin nhận diện và liên hệ của nhân sự.</small></div></div>
                  <div className="user-form-grid">
                    <div className="tms-form-group"><label className="tms-form-label">Tên đăng nhập <em>*</em></label><input className="tms-form-input" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value.replace(/\s/g, '')})} placeholder="vd: nguyen.a" required disabled={userForm.id > 0} /><small className="form-hint">3–60 ký tự, không gồm khoảng trắng.</small></div>
                    <div className="tms-form-group"><label className="tms-form-label">Họ và tên nhân sự <em>*</em></label><input className="tms-form-input" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} placeholder="vd: Nguyễn Văn An" required /></div>
                    <div className="tms-form-group"><label className="tms-form-label">Email công việc <em>*</em></label><input type="email" className="tms-form-input" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="nhan.su@auroracinema.vn" required /></div>
                    <div className="tms-form-group"><label className="tms-form-label">Số điện thoại</label><input type="tel" className="tms-form-input" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="vd: 0901 234 567" /></div>
                  </div>
                  <div className="user-form-section-title access"><span><ShieldCheck size={16}/></span><div><b>Phân quyền & phạm vi làm việc</b><small>Chỉ cấp đúng quyền cần thiết cho từng vị trí.</small></div></div>
                  <div className="user-form-grid">
                    <div className="tms-form-group"><label className="tms-form-label">Vai trò hệ thống <em>*</em></label><select className="tms-form-select" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as TMSRole, theater_id: (e.target.value === 'cinema_admin' || e.target.value === 'supervisor') ? userForm.theater_id : 0})}><option value="super_admin">👑 Admin Tổng — Toàn hệ thống</option><option value="cinema_admin">🏢 Admin Rạp — Quản lý một rạp</option><option value="supervisor">🛡️ Supervisor — Giám sát rạp</option><option value="accounting">📊 Kế Toán — Tài chính & đối soát</option></select></div>
                    <div className="tms-form-group"><label className="tms-form-label">Rạp phụ trách {(userForm.role === 'cinema_admin' || userForm.role === 'supervisor') && <em>*</em>}</label><select className="tms-form-select" value={userForm.theater_id} onChange={e => setUserForm({...userForm, theater_id:Number(e.target.value)})} disabled={userForm.role === 'super_admin' || userForm.role === 'accounting'}><option value={0}>{userForm.role === 'super_admin' || userForm.role === 'accounting' ? 'Phạm vi toàn hệ thống' : '— Chọn rạp phụ trách —'}</option>{theatersList.map(theater => <option key={theater.id} value={theater.id}>{theater.name}{theater.city ? ` · ${theater.city}` : ''}</option>)}</select></div>
                    <div className="tms-form-group"><label className="tms-form-label">{userForm.id > 0 ? 'Đặt mật khẩu mới' : 'Mật khẩu khởi tạo'} {!userForm.id && <em>*</em>}</label><div className="password-field-wrap"><input type={showUserPassword ? 'text' : 'password'} className="tms-form-input" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder={userForm.id > 0 ? 'Bỏ trống để giữ nguyên' : 'Ít nhất 6 ký tự'} required={!userForm.id} minLength={userForm.id ? undefined : 6}/><button type="button" aria-label={showUserPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowUserPassword(!showUserPassword)}>{showUserPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div><small className="form-hint">{userForm.id > 0 ? 'Chỉ nhập khi cần đổi mật khẩu.' : 'Không sử dụng mật khẩu mặc định hoặc dễ đoán.'}</small></div>
                    <div className="tms-form-group"><label className="tms-form-label">Trạng thái truy cập</label><select className="tms-form-select" value={userForm.status} onChange={e => setUserForm({...userForm, status: e.target.value})}><option value="active">Đang hoạt động — cho phép đăng nhập</option><option value="inactive">Ngừng hoạt động tạm thời</option><option value="locked">Tạm khóa truy cập</option></select></div>
                  </div>
                </section>
                <aside className="user-access-preview">
                  <div className="user-preview-kicker">BẢN XEM TRƯỚC QUYỀN</div>
                  <div className="user-role-preview" style={{background: ROLE_CONFIGS[userForm.role].bg, borderColor: ROLE_CONFIGS[userForm.role].borderColor}}><span>{ROLE_CONFIGS[userForm.role].emoji}</span><div><b style={{color: ROLE_CONFIGS[userForm.role].color}}>{ROLE_CONFIGS[userForm.role].name}</b><p>{ROLE_CONFIGS[userForm.role].tagline}</p></div></div>
                  <div className="user-preview-detail"><span>Phạm vi áp dụng</span><b>{userForm.theater_id ? (theatersList.find(theater => Number(theater.id) === Number(userForm.theater_id))?.name || `Rạp #${userForm.theater_id}`) : 'Toàn hệ thống'}</b></div>
                  <div className="user-preview-detail"><span>Trạng thái sau khi lưu</span><b className={userForm.status === 'active' ? 'is-active' : 'is-locked'}>{userForm.status === 'active' ? 'Sẵn sàng đăng nhập' : userForm.status === 'inactive' ? 'Đang ngừng hoạt động' : 'Đã tạm khóa'}</b></div>
                  <div className="user-security-note"><ShieldCheck size={17}/><p>Mọi thay đổi về hồ sơ, quyền và trạng thái đều được ghi nhận trong nhật ký quản trị Aurora DB.</p></div>
                </aside>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowUserModal(false)}>Hủy bỏ</button>
                <button type="submit" className="tms-btn tms-btn-primary">{userForm.id > 0 ? 'Lưu thay đổi' : 'Tạo & cấp quyền'}<Check size={16}/></button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE REFUND REQUEST (supervisor) */}
      {showRefundModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box">
            <div className="tms-modal-header">
              <div className="tms-modal-title">Lập phiếu yêu cầu hoàn tiền</div>
              <button className="temp-btn" onClick={() => setShowRefundModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreateRefundRequest}>
              <div className="tms-modal-body">
                <div className="tms-form-group"><label className="tms-form-label">Mã giao dịch (TXN Code) *</label><input className="tms-form-input" value={refundForm.transaction_code} onChange={e => setRefundForm({...refundForm, transaction_code: e.target.value})} placeholder="vd: TXN-260905" required /></div>
                <div className="tms-form-group"><label className="tms-form-label">Tên khách hàng</label><input className="tms-form-input" value={refundForm.customer_name} onChange={e => setRefundForm({...refundForm, customer_name: e.target.value})} placeholder="Tên khách hàng" /></div>
                <div className="tms-form-group"><label className="tms-form-label">Số tiền hoàn (VNĐ) *</label><input type="number" className="tms-form-input" value={refundForm.amount} onChange={e => setRefundForm({...refundForm, amount: Number(e.target.value)})} required /></div>
                <div className="tms-form-group"><label className="tms-form-label">Lý do hoàn tiền *</label><textarea className="tms-form-input" rows={3} value={refundForm.reason} onChange={e => setRefundForm({...refundForm, reason: e.target.value})} placeholder="Mô tả lý do hoàn tiền..." required /></div>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowRefundModal(false)}>Hủy</button>
                <button type="submit" className="tms-btn tms-btn-primary">Gửi yêu cầu hoàn tiền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LẬP KẾ HOẠCH PHIM THEO THÁNG (super_admin) */}
      {showPlanModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box tms-plan-modal">
            <div className="tms-modal-header tms-plan-modal-header">
              <div>
                <div className="tms-plan-modal-kicker">KẾ HOẠCH PHÁT HÀNH · AURORA DB</div>
                <div className="tms-modal-title">
                  {planForm.id > 0 ? 'Chỉnh sửa kế hoạch phim' : 'Lập kế hoạch phim'}
                </div>
                <p>Thiết lập chỉ tiêu và phân bổ phim cho hệ thống rạp.</p>
              </div>
              <span className="tms-plan-month-chip">Tháng {String(planForm.plan_month).padStart(2, '0')}</span>
              <button className="temp-btn" onClick={() => setShowPlanModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="tms-modal-body tms-plan-modal-body">
                <section className="tms-plan-form-section">
                  <div className="tms-plan-section-heading"><Film size={15} /> Thông tin phim</div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Chọn phim áp dụng <b>*</b></label>
                    <select
                      className="tms-form-select"
                      value={planForm.movie_id}
                      onChange={e => {
                        const movieId = Number(e.target.value);
                        const movie = moviesList.find(item => Number(item.id) === movieId);
                        if (!movie) return;
                        setPlanForm(previous => ({
                          ...previous,
                          movie_id: movieId,
                          movie_title: movie.title,
                          format: movie.format || '2D Digital'
                        }));
                      }}
                      required
                    >
                      {moviesList.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                  <div className="tms-plan-movie-summary">
                    <div><small>Mã phim</small><strong>{moviesList.find(m => Number(m.id) === Number(planForm.movie_id))?.movie_code || 'Tự động'}</strong></div>
                    <div><small>Thời lượng</small><strong>{moviesList.find(m => Number(m.id) === Number(planForm.movie_id))?.duration_minutes || '-'} phút</strong></div>
                    <div><small>Độ tuổi</small><strong>{moviesList.find(m => Number(m.id) === Number(planForm.movie_id))?.age_rating || '-'}</strong></div>
                    <div className="tms-plan-movie-wide"><small>Thể loại</small><strong>{moviesList.find(m => Number(m.id) === Number(planForm.movie_id))?.genre || 'Chưa cập nhật'}</strong></div>
                    <div className="tms-plan-movie-wide"><small>Định dạng</small><strong>{planForm.format || 'Chưa cập nhật'}</strong></div>
                  </div>
                </section>

                <section className="tms-plan-form-section">
                <div className="tms-plan-section-heading"><CalendarDays size={15} /> Thông tin kế hoạch</div>
                <div className="tms-form-group">
                  <label className="tms-form-label">Tên kế hoạch phát hành <b>*</b></label>
                  <input
                    className="tms-form-input"
                    value={planForm.plan_name}
                    onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })}
                    placeholder="Ví dụ: Kế hoạch phát hành phim tháng 10"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Tháng phát hành</label>
                    <select
                      className="tms-form-select"
                      value={planForm.plan_month}
                      onChange={e => setPlanForm({ ...planForm, plan_month: Number(e.target.value) })}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(m => (
                        <option key={m} value={m}>Tháng {String(m).padStart(2, '0')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Độ ưu tiên khai thác</label>
                    <select
                      className="tms-form-select"
                      value={planForm.priority_level}
                      onChange={e => setPlanForm({ ...planForm, priority_level: e.target.value as any })}
                    >
                      <option value="blockbuster">Bom tấn · ưu tiên tối đa</option>
                      <option value="high">Ưu tiên cao</option>
                      <option value="medium">Tiêu chuẩn</option>
                      <option value="low">Duy trì</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Ngày khởi chiếu dự kiến <b>*</b></label>
                    <VietnameseDateInput className="tms-form-input" value={planForm.expected_start_date} onChange={date => setPlanForm({ ...planForm, expected_start_date: date })} required ariaLabel="Ngày khởi chiếu dự kiến" />
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Ngày kết thúc dự kiến <b>*</b></label>
                    <VietnameseDateInput className="tms-form-input" value={planForm.expected_end_date} onChange={date => setPlanForm({ ...planForm, expected_end_date: date })} required ariaLabel="Ngày kết thúc dự kiến" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Mục tiêu doanh thu <span>VNĐ</span></label>
                    <input
                      type="number"
                      step={10000000}
                      className="tms-form-input"
                      value={planForm.target_revenue}
                      onChange={e => setPlanForm({ ...planForm, target_revenue: Number(e.target.value) })}
                    />
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Chỉ tiêu suất chiếu/ngày</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      className="tms-form-input"
                      value={planForm.target_screenings_per_day}
                      onChange={e => setPlanForm({ ...planForm, target_screenings_per_day: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Trạng thái kế hoạch</label>
                  <select
                    className="tms-form-select"
                    value={planForm.status}
                    onChange={e => setPlanForm({ ...planForm, status: e.target.value as any })}
                  >
                    <option value="draft">Nháp</option>
                    <option value="published">Đã ban hành</option>
                    {planForm.id > 0 && <><option value="in_progress">Đang triển khai</option><option value="completed">Hoàn tất</option><option value="cancelled">Hủy</option></>}
                  </select>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Rạp nhận triển khai</label>
                  {planForm.status === 'draft' && (
                    <small className="tms-allocation-field-hint">Bản nháp chưa được gửi đến Admin Rạp. Chọn rạp ở đây chỉ để chuẩn bị; phân bổ chỉ được tạo khi kế hoạch chuyển sang “Đã ban hành”.</small>
                  )}
                  <div className="tms-plan-theater-grid">
                    {theatersList.map(t => {
                      const isChecked = planForm.selected_theaters.includes(Number(t.id));
                      return (
                        <label key={t.id} className="tms-plan-theater-option">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const tId = Number(t.id);
                              if (e.target.checked) {
                                setPlanForm({ ...planForm, selected_theaters: [...planForm.selected_theaters, tId] });
                              } else {
                                setPlanForm({ ...planForm, selected_theaters: planForm.selected_theaters.filter(x => x !== tId) });
                              }
                            }}
                          />
                          <span>{t.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Ghi chú định hướng phát hành</label>
                  <textarea
                    className="tms-form-input"
                    rows={2}
                    value={planForm.note}
                    onChange={e => setPlanForm({ ...planForm, note: e.target.value })}
                    placeholder="vd: Ưu tiên phòng chiếu Laser IMAX và khung giờ vàng cuối tuần..."
                  />
                </div>

                </section>

                <section className="tms-plan-form-section tms-plan-audit-section">
                  <div className="tms-plan-section-heading">Thông tin quản trị</div>
                  <div className="tms-plan-audit-grid">
                    <div><small>Mã kế hoạch</small><strong>{planForm.plan_code || (planForm.id > 0 ? `KH-${planForm.plan_year}${String(planForm.plan_month).padStart(2, '0')}-${planForm.id}` : 'Tự động khi lưu')}</strong></div>
                    <div><small>Người lập kế hoạch</small><strong>{planForm.created_by || currentUser?.full_name || currentUser?.username || 'Tự động'}</strong></div>
                    <div><small>Ngày lập</small><strong>{planForm.created_at || 'Tự động khi lưu'}</strong></div>
                    <div><small>Người ban hành</small><strong>{planForm.approved_by || (planForm.status === 'published' ? currentUser?.full_name || currentUser?.username || 'Admin Tổng' : 'Chưa ban hành')}</strong></div>
                    <div><small>Ngày ban hành</small><strong>{planForm.approved_at || (planForm.status === 'published' ? 'Vừa cập nhật' : 'Chưa ban hành')}</strong></div>
                    <div><small>Người cập nhật / Ngày cập nhật</small><strong>{planForm.updated_by ? `${planForm.updated_by} / ${planForm.updated_at || '-'}` : 'Chưa cập nhật'}</strong></div>
                  </div>
                </section>
              </div>
              <div className="tms-modal-footer tms-plan-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowPlanModal(false)}>Hủy bỏ</button>
                <button type="submit" className="tms-btn tms-btn-primary">
                  {planForm.status === 'published' ? (planForm.id > 0 ? 'Cập nhật & ban hành' : 'Ban hành & gửi đến rạp') : (planForm.id > 0 ? 'Lưu bản nháp' : 'Lưu bản nháp')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PHÂN BỔ PHIM CHO 5 RẠP TP.HCM */}
      {showAllocationModal && allocationTargetPlan && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box tms-allocation-modal">
            <div className="tms-modal-header tms-allocation-modal-header">
              <div>
                <div className="tms-allocation-modal-kicker">ĐIỀU PHỐI PHIM · AURORA DB</div>
                <div className="tms-modal-title">Phân bổ phim cho cụm rạp</div>
                <p>Chọn rạp tiếp nhận và thiết lập chỉ tiêu khai thác tối thiểu.</p>
              </div>
              <button className="temp-btn" onClick={() => setShowAllocationModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleExecuteAllocation}>
              <div className="tms-modal-body tms-allocation-modal-body">
                <section className="tms-allocation-movie-card">
                  <div className="tms-allocation-card-eyebrow"><Film size={14} /> Phim được phân bổ</div>
                  <h3>{allocationTargetPlan.movie_title}</h3>
                  <div className="tms-allocation-movie-meta">
                    <span><b>Định dạng</b>{allocationTargetPlan.format || 'Chưa cập nhật'}</span>
                    <span><b>Thời gian</b>{allocationTargetPlan.expected_start_date} — {allocationTargetPlan.expected_end_date}</span>
                  </div>
                </section>

                <section className="tms-allocation-form-section">
                  <div className="tms-allocation-section-heading"><Building2 size={15} /> Cụm rạp tiếp nhận <span>{allocSelectedTheaters.length}/{theatersList.length} đã chọn</span></div>
                  <div className="tms-allocation-theater-list">
                    {theatersLoading && <div className="tms-allocation-theater-state"><RefreshCw size={17} /> Đang tải cụm rạp từ Aurora DB…</div>}
                    {!theatersLoading && theatersError && <div className="tms-allocation-theater-state error"><AlertTriangle size={17} /><span>{theatersError}</span><button type="button" onClick={() => { void openAllocationModal(allocationTargetPlan); }}>Thử lại</button></div>}
                    {!theatersLoading && !theatersError && theatersList.length === 0 && <div className="tms-allocation-theater-state"><Building2 size={17} /> Chưa có cụm rạp nào trong Aurora DB.</div>}
                    {theatersList.map(t => {
                      const isChecked = allocSelectedTheaters.includes(Number(t.id));
                      return (
                        <label key={t.id} className={`tms-allocation-theater-option${isChecked ? ' selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const tId = Number(t.id);
                              if (e.target.checked) setAllocSelectedTheaters([...allocSelectedTheaters, tId]);
                              else setAllocSelectedTheaters(allocSelectedTheaters.filter(x => x !== tId));
                            }}
                          />
                          <Building2 size={16} />
                          <span><b>{t.name}</b><small>{t.address || 'TP. Hồ Chí Minh'}</small></span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <section className="tms-allocation-form-section">
                  <div className="tms-allocation-section-heading"><Target size={15} /> Chỉ tiêu khai thác</div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Số suất chiếu tối thiểu mỗi ngày tại mỗi rạp <b>*</b></label>
                    <div className="tms-allocation-number-field"><input type="number" min={1} max={25} className="tms-form-input" value={allocMinScreenings} onChange={e => setAllocMinScreenings(Number(e.target.value))} required /><span>suất/ngày</span></div>
                    <small className="tms-allocation-field-hint">Chỉ tiêu này sẽ được lưu cùng từng phân bổ và gửi đến Admin Rạp để xác nhận.</small>
                  </div>
                </section>
              </div>
              <div className="tms-modal-footer tms-allocation-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowAllocationModal(false)}>Hủy</button>
                <button type="submit" disabled={theatersLoading || Boolean(theatersError) || allocSelectedTheaters.length === 0} className="tms-btn tms-btn-primary">
                  <Send size={15} />
                  <span>Ghi phân bổ cho {allocSelectedTheaters.length} cụm rạp</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPricingCreate && (
        <div className="tms-modal-overlay pricing-create-overlay" role="dialog" aria-modal="true" aria-labelledby="pricing-create-title">
          <form className="tms-modal-box pricing-create-modal" onSubmit={e=>{e.preventDefault(); saveNewTicketType();}}>
            <header className="tms-modal-header pricing-create-header">
              <div className="pricing-create-heading"><span className="pricing-create-header-icon"><Ticket size={22}/></span><div><span>CHÍNH SÁCH GIÁ · AURORA DB</span><div id="pricing-create-title" className="tms-modal-title">Tạo loại vé mới</div><p>Thiết lập thông tin bán vé, điều kiện áp dụng và bảng giá chính thức trên toàn hệ thống.</p></div></div>
              <button type="button" className="temp-btn" onClick={()=>{setShowPricingCreate(false);setPricingCreateError('');}} aria-label="Đóng"><X size={17}/></button>
            </header>
            <div className="pricing-create-steps" aria-label="Quy trình tạo loại vé"><span className="active"><i>1</i>Thông tin vé</span><b/><span className="active"><i>2</i>Thiết lập giá</span><b/><span><i>3</i>Ban hành</span></div>
            <div className="pricing-create-body">
              <main className="pricing-create-main">
                {pricingCreateError && <div className="pricing-create-error" role="alert"><AlertTriangle size={17}/><div><b>Chưa thể tạo loại vé</b><span>{pricingCreateError}</span></div></div>}
                <section className="pricing-create-section">
                  <header className="pricing-create-section-title"><span><Ticket size={17}/></span><div><b>Thông tin nhận diện</b><small>Dữ liệu này được dùng tại TMS, POS và các kênh bán vé.</small></div></header>
                  <div className="pricing-create-form-grid">
                    <label className="pricing-create-field"><span>Tên loại vé <em>*</em></span><input required autoFocus value={pricingCreateForm.name} maxLength={100} onChange={e=>{setPricingCreateError('');setPricingCreateForm({...pricingCreateForm,name:e.target.value});}} placeholder="Ví dụ: Vé người cao tuổi"/><small>Tên hiển thị cho nhân viên và khách hàng.</small></label>
                    <label className="pricing-create-field"><span>Mã vé <em>*</em></span><div className="pricing-code-input"><Tag size={15}/><input required value={pricingCreateForm.code} maxLength={40} onChange={e=>{setPricingCreateError('');setPricingCreateForm({...pricingCreateForm,code:e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g,'')});}} placeholder="TICKET_SENIOR"/></div><small>Chữ in hoa, số và dấu gạch dưới; không thể đổi sau khi tạo.</small></label>
                    <label className="pricing-create-field"><span>Nhóm vé <em>*</em></span><select value={pricingCreateForm.category} onChange={e=>setPricingCreateForm({...pricingCreateForm,category:e.target.value})}><option value="standard">Vé tiêu chuẩn</option><option value="discount">Vé ưu đãi</option><option value="member">Vé thành viên</option><option value="special">Vé đặc biệt</option></select></label>
                    <label className="pricing-create-field"><span>Giới hạn mỗi giao dịch</span><div className="pricing-limit-input"><input type="number" min="1" max="99" value={pricingCreateForm.purchase_limit} onChange={e=>setPricingCreateForm({...pricingCreateForm,purchase_limit:e.target.value})} placeholder="Không giới hạn"/><em>vé</em></div></label>
                    <label className="pricing-create-field full"><span>Điều kiện áp dụng</span><input maxLength={500} value={pricingCreateForm.eligibility_note} onChange={e=>setPricingCreateForm({...pricingCreateForm,eligibility_note:e.target.value})} placeholder="Ví dụ: Xuất trình giấy tờ xác minh hợp lệ tại quầy"/></label>
                    <label className="pricing-create-field full"><span>Mô tả nội bộ</span><textarea maxLength={255} rows={3} value={pricingCreateForm.description} onChange={e=>setPricingCreateForm({...pricingCreateForm,description:e.target.value})} placeholder="Mục đích sử dụng và lưu ý dành cho bộ phận vận hành."/><small>{pricingCreateForm.description.length}/255 ký tự</small></label>
                  </div>
                </section>
                <section className="pricing-create-section pricing-create-matrix">
                  <header className="pricing-create-section-title"><span><DollarSign size={17}/></span><div><b>Ma trận giá bán</b><small>Nhập giá VND cho 9 tổ hợp ngày và khung giờ. Giá 0 ₫ được hiểu là miễn phí.</small></div><em>Giá / 01 vé</em></header>
                  <div className="pricing-create-day-grid">{([{key:'weekday',label:'Ngày thường',hint:'Thứ Hai – Thứ Sáu'}, {key:'weekend',label:'Cuối tuần',hint:'Thứ Bảy – Chủ Nhật'}, {key:'holiday',label:'Ngày lễ',hint:'Theo lịch ngày lễ hệ thống'}] as const).map(day=><article key={day.key} className={`pricing-create-day-card ${day.key}`}><header><div><b>{day.label}</b><small>{day.hint}</small></div><span>{day.key==='weekday'?'T2–T6':day.key==='weekend'?'T7–CN':'Lễ/Tết'}</span></header><div>{([{key:'morning',label:'Buổi sáng',hint:'Trước 12:00'}, {key:'standard',label:'Tiêu chuẩn',hint:'12:00 – 17:59'}, {key:'evening',label:'Buổi tối',hint:'Từ 18:00'}] as const).map(slot=><label key={slot.key}><span><b>{slot.label}</b><small>{slot.hint}</small></span><div><input aria-label={`${day.label} - ${slot.label}`} type="number" min="0" max="3000000" step="1000" value={pricingCreateForm.prices[day.key][slot.key]} onChange={e=>setPricingCreateForm(prev=>({...prev,prices:{...prev.prices,[day.key]:{...prev.prices[day.key],[slot.key]:Math.min(3000000,Math.max(0,Number(e.target.value)))}}}))}/><em>₫</em></div></label>)}</div></article>)}</div>
                </section>
              </main>
              <aside className="pricing-create-sidebar">
                <section className="pricing-ticket-preview">
                  <header><span>VÉ AURORA</span><i>PHÁT HÀNH MỚI</i></header>
                  <div className="pricing-ticket-preview-icon"><Ticket size={29}/></div>
                  <small>LOẠI VÉ</small><h3>{pricingCreateForm.name.trim() || 'Tên loại vé'}</h3><code>{pricingCreateForm.code || 'TICKET_MOI'}</code>
                  <div className="pricing-ticket-divider"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div>
                  <dl><div><dt>Nhóm vé</dt><dd>{pricingCreateForm.category==='discount'?'Ưu đãi':pricingCreateForm.category==='member'?'Thành viên':pricingCreateForm.category==='special'?'Đặc biệt':'Tiêu chuẩn'}</dd></div><div><dt>Giới hạn</dt><dd>{pricingCreateForm.purchase_limit ? `${pricingCreateForm.purchase_limit} vé / GD` : 'Không giới hạn'}</dd></div></dl>
                  <p>{pricingCreateForm.eligibility_note.trim() || 'Không có điều kiện áp dụng riêng.'}</p><footer><CheckCircle2 size={14}/> Sẵn sàng áp dụng sau khi ban hành</footer>
                </section>
                <section className="pricing-create-db-note"><ShieldCheck size={18}/><div><b>Lưu an toàn vào Aurora DB</b><p>Thông tin vé, 9 mức giá và lịch sử ban hành được ghi trong cùng một giao dịch dữ liệu.</p></div></section>
              </aside>
            </div>
            <footer className="tms-modal-footer pricing-create-footer"><span><ShieldCheck size={15}/> Chỉ Admin Tổng có quyền tạo và ban hành loại vé.</span><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>{setShowPricingCreate(false);setPricingCreateError('');}}>Hủy</button><button type="submit" className="tms-btn tms-btn-primary" disabled={pricingSaving}><Plus size={16}/>{pricingSaving ? 'Đang ghi vào Aurora DB…' : 'Tạo & ban hành vé'}</button></div></footer>
          </form>
        </div>
      )}
      {pricingEditor && (
        <div className="tms-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pricing-editor-title">
          <div className="tms-modal-box pricing-editor-modal">
            <div className="tms-modal-header pricing-editor-header"><div><span>ĐIỀU CHỈNH GIÁ VÉ · AURORA DB</span><div id="pricing-editor-title" className="tms-modal-title">{pricingEditor.name}</div><p>{pricingEditor.description || 'Thiết lập mức giá theo từng ngày và khung giờ chiếu.'}</p></div><button type="button" className="temp-btn" aria-label="Đóng" onClick={()=>setPricingEditor(null)}><X size={16}/></button></div>
            <div className="pricing-editor-body"><div className="pricing-editor-notice"><DollarSign size={20}/><div><b>{isStaffTicket(pricingEditor) ? 'Quy định vé nội bộ' : 'Thiết lập giá bán chính thức'}</b><span>{pricingEditor.code === 'TICKET_STAFF_A' ? 'Vé Staff A miễn phí, áp dụng ngày thường và cuối tuần; không áp dụng ngày lễ.' : pricingEditor.code === 'TICKET_STAFF_B' ? 'Vé Staff B miễn phí, chỉ áp dụng từ Thứ Hai đến Thứ Sáu.' : 'Giá mới áp dụng cho TMS, POS và website sau khi bạn ban hành. Giá Vé ghế đôi là giá cho một cặp.'}</span></div></div><div className="pricing-edit-grid">{([{key:'weekday', label:'Ngày thường', hint:'Thứ Hai – Thứ Sáu'}, {key:'weekend', label:'Cuối tuần', hint:'Thứ Bảy – Chủ Nhật'}, {key:'holiday', label:'Ngày lễ', hint:'Ngày lễ/Tết cấu hình'}] as const).map(day => <section key={day.key} className={`price-day-card ${day.key}`}><header><b>{day.label}</b><small>{day.hint}</small></header>{([{key:'morning',label:'Buổi sáng',hint:'Trước 12:00'}, {key:'standard',label:'Tiêu chuẩn',hint:'12:00 – 17:59'}, {key:'evening',label:'Buổi tối',hint:'Từ 18:00'}] as const).map(slot => { const unavailable = isPricingCellUnavailable(pricingEditor, day.key); const staff = isStaffTicket(pricingEditor); return <label key={slot.key} className={unavailable ? 'unavailable' : ''}><span><b>{slot.label}</b><small>{slot.hint}</small></span>{unavailable ? <div className="pricing-rule-value unavailable">Không áp dụng</div> : staff ? <div className="pricing-rule-value free">Miễn phí</div> : <div><input type="number" min="0" max="3000000" step="1000" value={Math.max(0, pricingDraft?.[day.key]?.[slot.key] ?? 0)} onChange={e=>setPricingDraft(previous=>({...previous,[day.key]:{...previous[day.key],[slot.key]:Math.max(0,Number(e.target.value))}}))}/><em>₫</em></div>}</label>; })}</section>)}</div></div>
            <div className="tms-modal-footer pricing-editor-footer"><span><ShieldCheck size={15}/> Thao tác được ghi lịch sử ban hành để đối soát.</span><div><button type="button" className="tms-btn tms-btn-outline" onClick={()=>setPricingEditor(null)}>Hủy</button><button type="button" className="tms-btn tms-btn-primary" disabled={pricingSaving} onClick={savePricingPolicy}><Check size={16}/>{pricingSaving ? 'Đang lưu…' : 'Ban hành bảng giá'}</button></div></div>
          </div>
        </div>
      )}
      {showScheduleModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box schedule-editor-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-editor-title">
            <div className="tms-modal-header schedule-editor-header"><div><span className="schedule-modal-kicker">ĐIỀU PHỐI LỊCH CHIẾU · AURORA DB</span><div id="schedule-editor-title" className="tms-modal-title">{scheduleForm.id ? 'Cập nhật suất chiếu' : 'Tạo suất chiếu mới'}</div><p>{scheduleForm.id ? 'Điều chỉnh thông tin vận hành; hệ thống sẽ kiểm tra lại xung đột phòng.' : 'Thiết lập suất chiếu, giá bán và điều kiện mở bán cho khách hàng.'}</p></div><button type="button" className="temp-btn" aria-label="Đóng modal" onClick={() => setShowScheduleModal(false)}><X size={16}/></button></div>
            <form onSubmit={handleSaveSchedule}>
              <div className="tms-modal-body schedule-editor-body">
                <section className="schedule-editor-notice"><span><ShieldCheck size={18}/></span><div><b>Kiểm tra lịch an toàn trước khi lưu</b><p>Aurora DB chặn mọi suất chiếu trùng giờ trong cùng phòng và lưu lại lịch sử thao tác.</p></div></section>
                <div className="schedule-editor-layout">
                  <section className="schedule-editor-form-section">
                    <div className="schedule-section-heading"><Film size={16}/><div><b>Nội dung suất chiếu</b></div></div>
                    <div className="schedule-editor-grid">
                      <div className="tms-form-group full"><label className="tms-form-label">Phim đã phân bổ cho rạp <em>*</em></label><select required className="tms-form-select" value={scheduleForm.movie_id || 0} onChange={e => { const movieId = Number(e.target.value); const slots = scheduleForm.time_slots.map(slot => ({ ...slot, end_time: calculateScheduleEndTime(slot.start_time, movieId) })); setScheduleForm({...scheduleForm, movie_id:movieId, time_slots:slots, start_time:slots[0]?.start_time || '09:00', end_time:slots[0]?.end_time || '11:00'}); }}><option value={0} disabled>{getScheduleMovieOptions(scheduleForm.show_date).length ? 'Chọn phim đã được phân bổ' : 'Không có phim phù hợp ngày đã chọn'}</option>{getScheduleMovieOptions(scheduleForm.show_date).map(m => <option key={m.id} value={m.id}>{m.title} · {m.duration_minutes} phút · {m.plan_code}</option>)}</select>{!scheduleForm.id && Number(scheduleMovieId) === Number(scheduleForm.movie_id) && <small className="schedule-prefilled-movie"><CheckCircle2 size={13}/> Đã chọn sẵn theo phim bạn đang xem. Bạn vẫn có thể đổi sang phim được phân bổ khác.</small>}</div>
                      <div className="tms-form-group"><label className="tms-form-label">Trạng thái mở bán <em>*</em></label><select className="tms-form-select schedule-status-select" value={scheduleForm.status} onChange={e => setScheduleForm({...scheduleForm,status:e.target.value})}><option value="scheduled">Mở bán theo lịch (OPEN)</option><option value="running" disabled>Đang chiếu — tự động theo giờ</option><option value="finished" disabled>Đã kết thúc — tự động theo giờ</option>{scheduleForm.id > 0 && <option value="cancelled">Đã hủy — ngừng bán (CANCELLED)</option>}</select></div>
                    </div>
                    <div className="schedule-section-heading timing"><Clock size={16}/><div><b>Phòng & khung giờ vận hành</b><small>Mỗi dòng là một suất chiếu độc lập; hệ thống tự tính giờ kết thúc và bảo vệ thời gian chuyển ca.</small></div><span className="schedule-turnaround-policy"><ShieldCheck size={14}/> 10 phút dọn phòng bắt buộc</span></div>
                    <div className="schedule-date-card">
                      <div className="schedule-date-heading"><span><CalendarDays size={18}/></span><div><b>Ngày chiếu</b><small>Hiển thị theo chuẩn Việt Nam: ngày / tháng / năm</small></div><em>{formatVietnameseDate(scheduleForm.show_date)}</em></div>
                      <div className="schedule-date-selects">
                        <label><small>NGÀY</small><select aria-label="Ngày chiếu" value={Number(scheduleForm.show_date.split('-')[2])} onChange={event=>updateScheduleDatePart('day',Number(event.target.value))}>{Array.from({length:new Date(Number(scheduleForm.show_date.split('-')[0]),Number(scheduleForm.show_date.split('-')[1]),0).getDate()},(_,index)=>index+1).map(day=><option key={day} value={day}>{String(day).padStart(2,'0')}</option>)}</select></label>
                        <i>/</i>
                        <label><small>THÁNG</small><select aria-label="Tháng chiếu" value={Number(scheduleForm.show_date.split('-')[1])} onChange={event=>updateScheduleDatePart('month',Number(event.target.value))}>{Array.from({length:12},(_,index)=>index+1).map(month=><option key={month} value={month}>{String(month).padStart(2,'0')}</option>)}</select></label>
                        <i>/</i>
                        <label className="year"><small>NĂM</small><select aria-label="Năm chiếu" value={Number(scheduleForm.show_date.split('-')[0])} onChange={event=>updateScheduleDatePart('year',Number(event.target.value))}>{Array.from(new Set([Number(scheduleForm.show_date.split('-')[0]),Number(localIsoDate().slice(0,4)),Number(localIsoDate().slice(0,4))+1,Number(localIsoDate().slice(0,4))+2])).sort().map(year=><option key={year} value={year}>{year}</option>)}</select></label>
                      </div>
                      {!scheduleForm.id && <div className="schedule-date-quick"><span>Chọn nhanh</span><button type="button" className={scheduleForm.show_date===localIsoDate(1)?'active':''} onClick={()=>applyScheduleDate(localIsoDate(1))}>Ngày mai</button><button type="button" className={scheduleForm.show_date===localIsoDate(2)?'active':''} onClick={()=>applyScheduleDate(localIsoDate(2))}>Sau 2 ngày</button><button type="button" className={scheduleForm.show_date===localIsoDate(7)?'active':''} onClick={()=>applyScheduleDate(localIsoDate(7))}>Sau 7 ngày</button></div>}
                      <p><CheckCircle2 size={13}/> Suất mới ưu tiên ngày kế tiếp; backend kiểm tra thời gian phân bổ, xung đột và đệm dọn phòng 10 phút trong <b>aurora_db</b>.</p>
                    </div>
                    <div className="schedule-turnaround-notice"><span><ShieldCheck size={18}/></span><div><b>Khoảng chuyển ca được bảo vệ</b><p>Mỗi phòng cần tối thiểu <strong>10 phút</strong> sau khi phim kết thúc để nhân viên vệ sinh, kiểm tra thiết bị và chuẩn bị đón khách cho suất kế tiếp.</p></div><em>10 PHÚT</em></div>
                    <div className="schedule-time-slot-list">{scheduleForm.time_slots.map((slot, index) => { const availability=scheduleSlotAvailability[slot.key]; return <div className="schedule-time-slot-row" key={slot.key}><span className="schedule-time-slot-number">{index + 1}</span><div><label className="tms-form-label">Phòng chiếu <em>*</em></label><select required className="tms-form-select" value={slot.screen_id || 0} onChange={e => { const screenId=Number(e.target.value); const slots=scheduleForm.time_slots.map(item=>item.key===slot.key?{...item,screen_id:screenId}:item); setScheduleForm({...scheduleForm,time_slots:slots,screen_ids:Array.from(new Set(slots.map(item=>item.screen_id).filter(Boolean)))}); }}><option value={0} disabled>Chọn phòng</option>{screensList.map(s=><option key={s.id} value={s.id}>{screenDisplayName(s.name,s.id)} · {s.total_seats} ghế</option>)}</select><small>{screensList.find(s=>Number(s.id)===Number(slot.screen_id))?.screen_type || 'Phòng đang hoạt động'}</small>{availability?.suggested && <span className="schedule-free-slot"><CheckCircle2 size={12}/> Đã chọn khung trống {availability.suggested.start}–{availability.suggested.end}</span>}</div><div><label className="tms-form-label">Giờ bắt đầu <em>*</em></label><div className="schedule-clock-control"><select aria-label="Giờ bắt đầu" value={String(slot.start_time).slice(0,2)} onChange={event=>updateScheduleSlotStart(slot.key,`${event.target.value}:${String(slot.start_time).slice(3,5)}`)}>{Array.from({length:24},(_,hour)=>String(hour).padStart(2,'0')).map(hour=><option key={hour}>{hour}</option>)}</select><i>:</i><select aria-label="Phút bắt đầu" value={String(slot.start_time).slice(3,5)} onChange={event=>updateScheduleSlotStart(slot.key,`${String(slot.start_time).slice(0,2)}:${event.target.value}`)}>{Array.from(new Set([...Array.from({length:12},(_,minute)=>String(minute*5).padStart(2,'0')),String(slot.start_time).slice(3,5)])).sort().map(minute=><option key={minute}>{minute}</option>)}</select><b>24H</b></div><small>Định dạng 24 giờ</small>{availability?.occupied?.length ? <span className="schedule-busy-slots">Đã bận: {availability.occupied.filter(item=>item.source==='saved').map(item=>`${item.start}–${item.end}`).join(', ') || 'suất đang thêm'}</span> : <span className="schedule-busy-slots free">Phòng còn trống trong ngày</span>}</div><div><label className="tms-form-label">Giờ kết thúc tự động</label><output>{slot.end_time}</output><small>{(scheduleMoviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)) || moviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)))?.duration_minutes || 0} phút</small></div>{!scheduleForm.id && <button type="button" className="schedule-time-slot-remove" disabled={scheduleForm.time_slots.length === 1} aria-label="Xóa suất chiếu" onClick={() => { const slots = scheduleForm.time_slots.filter(item => item.key !== slot.key); setScheduleForm({...scheduleForm, time_slots:slots, screen_ids:Array.from(new Set(slots.map(item=>item.screen_id).filter(Boolean))), start_time:slots[0].start_time, end_time:slots[0].end_time}); }}><Trash2 size={15}/></button>}</div>; })}</div>
                    {!scheduleForm.id && <button type="button" className="schedule-time-slot-add" onClick={() => { const last = scheduleForm.time_slots[scheduleForm.time_slots.length - 1]; const date = new Date(`2000-01-01T${last.end_time}:00`); date.setMinutes(date.getMinutes() + 15); const start = date.toTimeString().slice(0,5); const slot = { key:`slot-${Date.now()}`, screen_id:last.screen_id || screensList[0]?.id || 0, start_time:start, end_time:calculateScheduleEndTime(start, scheduleForm.movie_id) }; const slots=[...scheduleForm.time_slots,slot]; setScheduleForm({...scheduleForm, time_slots:slots, screen_ids:Array.from(new Set(slots.map(item=>item.screen_id).filter(Boolean)))}); }}><Plus size={15}/> Thêm suất chiếu</button>}
                    <div className="schedule-section-heading pricing"><DollarSign size={16}/><div><b>Loại vé áp dụng & ghi chú</b><small>Chọn một hoặc nhiều loại vé đang có trong Aurora DB.</small></div></div>
                    <div className="schedule-editor-grid"><div className="tms-form-group ticket-type-picker"><label className="tms-form-label">Loại vé áp dụng <em>*</em></label><div className="ticket-type-select-list">{ticketTypesList.length ? ticketTypesList.map(ticketType => { const available = isTicketAvailableForSchedule(ticketType, scheduleForm.show_date, scheduleForm.start_time); const effectivePrice = getEffectiveTicketPrice(ticketType, scheduleForm.show_date, scheduleForm.start_time); return <label key={ticketType.id} className={`${scheduleForm.ticket_type_ids.includes(Number(ticketType.id)) ? 'selected' : ''} ${available ? '' : 'disabled'}`}><input type="checkbox" disabled={!available} checked={scheduleForm.ticket_type_ids.includes(Number(ticketType.id))} onChange={() => { const checked = scheduleForm.ticket_type_ids.includes(Number(ticketType.id)); const nextIds = checked ? scheduleForm.ticket_type_ids.filter(id => id !== Number(ticketType.id)) : [...scheduleForm.ticket_type_ids, Number(ticketType.id)]; const selectedPrices = ticketTypesList.filter(item => nextIds.includes(Number(item.id))).map(item => getEffectiveTicketPrice(item, scheduleForm.show_date, scheduleForm.start_time)); setScheduleForm({...scheduleForm, ticket_type_ids:nextIds, ticket_price:selectedPrices.length ? Math.min(...selectedPrices) : 0}); }}/><span><b>{ticketType.name}</b><small>{available ? ticketType.code : `${ticketType.code} · Không áp dụng`}</small></span><strong>{available ? effectivePrice === 0 ? 'Miễn phí' : `${effectivePrice.toLocaleString('vi-VN')} ₫` : '—'}</strong><Check size={15}/></label>; }) : <span className="ticket-type-loading">Chưa có loại vé hoạt động trong Aurora DB.</span>}</div></div><div className="tms-form-group"><label className="tms-form-label">Ghi chú vận hành</label><input maxLength={500} className="tms-form-input" value={scheduleForm.operational_note} onChange={e => setScheduleForm({...scheduleForm,operational_note:e.target.value})} placeholder="Ví dụ: Ưu tiên quầy vé 1, kiểm tra kính 3D"/></div></div>
                  </section>
                  <aside className="schedule-summary-panel" aria-label="Tóm tắt suất chiếu">
                    <header className="schedule-summary-header">
                      <div><span className="schedule-summary-kicker">TÓM TẮT VẬN HÀNH</span><b>Suất chiếu mới</b></div>
                      <span className="schedule-summary-db"><i /> AURORA DB</span>
                    </header>
                    <section className="schedule-summary-movie">
                      <span className="schedule-summary-movie-icon"><Film size={20}/></span>
                      <div><small>PHIM ĐANG CHỌN</small><b>{(scheduleMoviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)) || moviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)))?.title || 'Chưa chọn phim'}</b><p>{(scheduleMoviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)) || moviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)))?.duration_minutes || 0} phút <i /> {(scheduleMoviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)) || moviesList.find(movie => Number(movie.id) === Number(scheduleForm.movie_id)))?.age_rating || 'Chưa phân loại'}</p></div>
                    </section>
                    <section className="schedule-summary-primary">
                      <div><span><CalendarDays size={16}/></span><small>NGÀY CHIẾU</small><b>{formatVietnameseDate(scheduleForm.show_date)}</b></div>
                      <div><span><Clock size={16}/></span><small>KHUNG GIỜ</small><b>{scheduleForm.time_slots[0]?.start_time || '--:--'} – {scheduleForm.time_slots[scheduleForm.time_slots.length - 1]?.end_time || '--:--'}</b></div>
                    </section>
                    <section className="schedule-summary-metrics">
                      <div><span><Building2 size={14}/></span><small>Phòng phục vụ</small><b>{new Set(scheduleForm.time_slots.map(slot=>slot.screen_id).filter(Boolean)).size || 0}</b><em>phòng</em></div>
                      <div><span><ShowtimeIcon size={14}/></span><small>Tổng suất tạo</small><b>{scheduleForm.time_slots.length}</b><em>suất</em></div>
                      <div><span><Ticket size={14}/></span><small>Loại vé áp dụng</small><b>{scheduleForm.ticket_type_ids.length}</b><em>loại vé</em></div>
                    </section>
                    <section className="schedule-summary-room">
                      <small>PHÒNG ĐÃ CHỌN</small>
                      <b>{screensList.filter(screen => scheduleForm.time_slots.some(slot => Number(slot.screen_id) === Number(screen.id))).map(screen => screenDisplayName(screen.name, screen.id)).join(', ') || 'Chưa chọn phòng chiếu'}</b>
                    </section>
                    <div className={`schedule-sale-status ${scheduleForm.status}`}>
                      {scheduleForm.status === 'cancelled' ? <XCircle size={16}/> : <CheckCircle2 size={16}/>}<span><small>TRẠNG THÁI MỞ BÁN</small><b>{scheduleForm.status === 'scheduled' ? 'Sắp chiếu · Đang mở bán' : scheduleForm.status === 'running' ? 'Đang chiếu · Tự động' : scheduleForm.status === 'finished' ? 'Đã kết thúc · Tự động' : 'Đã hủy · Ngừng bán'}</b></span>
                    </div>
                    <footer className="schedule-summary-footer"><span className="schedule-summary-footer-icon"><ShieldCheck size={15}/></span><span><b>Lưu an toàn vào Aurora DB</b><small>Hệ thống tự kiểm tra lịch trùng trước khi tạo suất chiếu.</small></span></footer>
                  </aside>
                </div>
              </div>
              <div className="tms-modal-footer schedule-editor-footer"><span><ShieldCheck size={15}/> Máy chủ kiểm tra phân bổ phim và xung đột riêng cho từng phòng, khung giờ.</span><div><button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowScheduleModal(false)}>Hủy</button><button type="submit" className="tms-btn tms-btn-primary" disabled={!scheduleForm.movie_id || !scheduleForm.ticket_type_ids.length || !scheduleForm.time_slots.length || scheduleForm.time_slots.some(slot=>!slot.screen_id)}><CalendarCheck size={16}/>{scheduleForm.id ? 'Lưu thay đổi' : `Tạo ${scheduleForm.time_slots.length} suất chiếu`}</button></div></div>
            </form>
          </div>
        </div>
      )}

      {showMovieImportModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box movie-import-modal">
            <div className="tms-modal-header movie-import-header"><div><div className="movie-import-kicker">KHO PHIM DÙNG CHUNG</div><div className="tms-modal-title">Nhập danh sách phim</div></div><button type="button" className="temp-btn" onClick={() => setShowMovieImportModal(false)} disabled={movieImportStatus === 'importing'}><X size={16}/></button></div>
            <div className="movie-import-steps"><div className="active"><span>1</span><b>Đọc tệp</b></div><i /><div className={movieImportStatus === 'validated' || movieImportStatus === 'errors' || movieImportStatus === 'completed' ? 'active' : ''}><span>2</span><b>Kiểm tra</b></div><i /><div className={movieImportStatus === 'completed' ? 'active' : ''}><span>3</span><b>Nhập kho phim</b></div></div>
            <div className="tms-modal-body movie-import-body">
              {movieImportStatus === 'completed' ? <div className="movie-import-success"><span><CheckCircle2 size={28}/></span><h3>Đã nhập phim thành công</h3><p>{movieImportSummary.added || 0} phim đã được tạo trong kho phim dùng chung của Aurora.</p><small>Dữ liệu đã được ghi vào <b>aurora_db.movies</b>.</small></div> : <>
                <section className="movie-import-file-summary"><div className="movie-import-file-icon"><FileText size={21}/></div><div><b>{movieImportFileName}</b><span>{movieImportSummary.total} dòng dữ liệu · Excel được xử lý cục bộ trước khi gửi kiểm tra</span></div><button type="button" onClick={() => movieImportRef.current?.click()} disabled={movieImportStatus === 'importing'}>Đổi tệp</button></section>
                <section className="movie-import-metrics"><div><span>Tổng số dòng</span><strong>{movieImportSummary.total}</strong></div><div className="valid"><span>Hợp lệ</span><strong>{movieImportSummary.valid}</strong></div><div className={movieImportSummary.errors ? 'invalid' : ''}><span>Cần chỉnh sửa</span><strong>{movieImportSummary.errors}</strong></div></section>
                {movieImportStatus === 'preview' && <div className="movie-import-notice info"><ShieldCheck size={17}/><div><b>Sẵn sàng kiểm tra</b><span>Chưa có dữ liệu nào được tạo. Hệ thống sẽ rà soát đầy đủ định dạng, mã phim và dữ liệu trùng.</span></div></div>}
                {movieImportStatus === 'validated' && <div className="movie-import-notice success"><CheckCircle2 size={17}/><div><b>Tệp đạt yêu cầu nhập kho</b><span>{movieImportSummary.valid} phim hợp lệ, có thể xác nhận ghi vào Aurora DB.</span></div></div>}
                {movieImportStatus === 'errors' && <div className="movie-import-notice error"><AlertTriangle size={17}/><div><b>Phát hiện {movieImportSummary.errors} lỗi cần chỉnh sửa</b><span>Chưa có phim nào được ghi. Xem các lỗi theo dòng bên dưới rồi thay tệp đã chỉnh sửa.</span></div></div>}
                <section className="movie-import-preview movie-import-vertical-preview"><header><div><h3>Toàn bộ dữ liệu trong tệp</h3><p>Mỗi trường trong Excel được hiển thị đầy đủ theo chiều dọc. Dấu <b className="movie-import-required-mark">*</b> là trường bắt buộc; ô lỗi được tô đỏ.</p></div><span>{movieImportRows.length} dòng · {movieImportColumns.length} cột</span></header><div className="movie-import-visible-count">Đang hiển thị đầy đủ {movieImportRows.length} dòng và {movieImportColumns.length} cột từ tệp. Mã phim được Aurora tự sinh khi ghi vào cơ sở dữ liệu. Cuộn dọc vùng bên dưới để xem hết.</div><div className="movie-import-vertical-list">{movieImportRows.map((movie, index) => { const rowErrors = movieImportErrors.filter(error => error.row === index + 2); return <article key={`${movie.movie_code}-${index}`} className={`movie-import-record${rowErrors.length ? ' has-error' : ''}`}><header><div><b>Dòng Excel {index + 2}</b><span>{movie.title || movie.movie_code || 'Chưa xác định phim'}</span></div>{rowErrors.length ? <span className="movie-import-row-error"><AlertTriangle size={14}/>{rowErrors.length} lỗi</span> : <span className="movie-import-row-ok"><Check size={14}/> Hợp lệ</span>}</header><div className="movie-import-field-list">{movieImportColumns.map(column => { const field = Object.keys(movie.fieldHeaders).find(key => movie.fieldHeaders[key] === column); const required = Boolean(field && MOVIE_IMPORT_REQUIRED_FIELDS[field]); const cellErrors = rowErrors.filter(error => error.field === field || error.field === column); const cellKey = `${index}-${column}`; const value = movie.raw[column] ?? (field ? String(movie[field as keyof MovieImportRow] ?? '') : ''); const text = String(value).trim(); const infoOpen = movieImportInfoCell === cellKey; return <div key={column} className={`movie-import-field${cellErrors.length ? ' movie-import-cell-error' : ''}`}><b>{column}{required && <i className="movie-import-required-mark"> *</i>}</b><div className="movie-import-cell-content"><span>{text || '—'}</span></div>{cellErrors.length > 0 && <div className="movie-import-cell-error-tools"><button type="button" className="movie-import-info-button" aria-label="Xem chi tiết lỗi" onClick={() => setMovieImportInfoCell(infoOpen ? null : cellKey)}>i</button>{infoOpen && <div className="movie-import-cell-error-popover"><b>{cellErrors[0].message}</b><span>Gợi ý: {cellErrors[0].suggestion || movieImportSuggestion(cellErrors[0].field)}</span></div>}</div>}</div>; })}</div></article>; })}</div></section>
                {movieImportErrors.length > 0 && <section className="movie-import-errors"><header><div><AlertTriangle size={17}/><b>Danh sách cần chỉnh sửa</b></div><span>{movieImportErrors.length} lỗi</span></header><div>{movieImportErrors.slice(0, 40).map((error, index) => <p key={`${error.row}-${error.field || ''}-${index}`}><b>{error.row ? `Dòng ${error.row}` : 'Hệ thống'}</b><span>{error.field ? `${MOVIE_IMPORT_REQUIRED_FIELDS[error.field] || error.field}: ` : ''}{error.message}<small>Gợi ý: {error.suggestion || movieImportSuggestion(error.field)}</small></span></p>)}{movieImportErrors.length > 40 && <p className="movie-import-more">Còn {movieImportErrors.length - 40} lỗi khác trong tệp.</p>}</div></section>}
              </>}
            </div>
            <div className="tms-modal-footer movie-import-footer">
              {movieImportStatus === 'completed' ? <button type="button" className="tms-btn tms-btn-primary" onClick={() => setShowMovieImportModal(false)}><Check size={16}/> Hoàn tất</button> : <><button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowMovieImportModal(false)} disabled={movieImportStatus === 'importing'}>Hủy</button>{movieImportStatus === 'validated' ? <button type="button" className="tms-btn tms-btn-primary" onClick={confirmMovieImport}><Plus size={16}/> Tạo {movieImportSummary.valid} phim</button> : <button type="button" className="tms-btn tms-btn-primary" onClick={validateMovieImport} disabled={movieImportStatus === 'importing'}>{movieImportStatus === 'importing' ? 'Đang kiểm tra…' : <><ShieldCheck size={16}/> Kiểm tra dữ liệu</>}</button>}</>}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHI TIẾT KẾ HOẠCH TRIỂN KHAI TẠI RẠP */}
      {showDeploymentDetailModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box deployment-detail-modal">
            <div className="tms-modal-header deployment-detail-header">
              <div><div className="tms-movie-modal-kicker">KẾ HOẠCH TRIỂN KHAI · AURORA DB</div><div className="tms-modal-title">Chi tiết kế hoạch triển khai</div><p>Hồ sơ phim, chỉ tiêu bắt buộc và các đầu việc vận hành tại rạp.</p></div>
              <button type="button" className="temp-btn" onClick={() => setShowDeploymentDetailModal(false)} aria-label="Đóng chi tiết kế hoạch"><X size={16} /></button>
            </div>
            <div className="deployment-detail-body">
              {deploymentDetailLoading ? <div className="deployment-detail-loading"><div className="dashboard-loading-mark" /><b>Đang tải kế hoạch từ Aurora DB…</b></div> : deploymentDetail?.plan ? (() => {
                const plan = deploymentDetail.plan;
                const completedTasks = deploymentDetail.tasks.filter((task: any) => task.status === 'completed').length;
                const progress = deploymentDetail.tasks.length ? Math.round((completedTasks / deploymentDetail.tasks.length) * 100) : 0;
                const movieFacts = [
                  ['Thể loại', plan.genre], ['Thời lượng', plan.duration_minutes ? `${plan.duration_minutes} phút` : 'Đang cập nhật'], ['Phân loại', plan.age_rating], ['Đạo diễn', plan.director], ['Diễn viên', plan.cast], ['Nhà sản xuất', plan.producer], ['Quốc gia', plan.production_country], ['Ngôn ngữ', plan.original_language]
                ].filter((item: any) => item[1]);
                return <>
                  <section className="deployment-detail-hero">
                    <div className="deployment-detail-poster">{plan.poster_url ? <img src={plan.poster_url} alt={`Poster ${plan.movie_title}`} /> : <Film size={38} />}</div>
                    <div className="deployment-detail-summary"><span className="deployment-detail-eyebrow">{plan.plan_code || `PHÂN BỔ #${plan.id}`}</span><h2>{plan.movie_title}</h2><p>{plan.original_title || 'Thông tin phim được Admin Tổng phân bổ cho rạp.'}</p><div><span>{plan.plan_format || plan.preferred_screen_types}</span><span>{plan.age_rating || 'Chưa phân loại'}</span><span>{plan.duration_minutes ? `${plan.duration_minutes} phút` : 'Thời lượng đang cập nhật'}</span></div></div>
                    <div className="deployment-progress"><small>TIẾN ĐỘ CHUẨN BỊ</small><strong>{progress}%</strong><div><i style={{ width: `${progress}%` }} /></div><span>{completedTasks}/{deploymentDetail.tasks.length} đầu việc hoàn tất</span></div>
                  </section>

                  <section className="deployment-detail-grid">
                    <article className="deployment-detail-card plan"><header><CalendarCheck size={17} /><div><b>Kế hoạch cần triển khai</b><span>Chỉ tiêu do Admin Tổng ban hành</span></div></header><dl>
                      <div><dt>Rạp triển khai</dt><dd>{plan.theater_name}</dd></div><div><dt>Thời gian áp dụng</dt><dd>{plan.allocated_start_date} — {plan.allocated_end_date}</dd></div>
                      <div><dt>Chỉ tiêu suất chiếu</dt><dd className="accent">Tối thiểu {plan.min_screenings_per_day} suất/ngày</dd></div><div><dt>Phòng chiếu ưu tiên</dt><dd>{plan.preferred_screen_types}</dd></div>
                      <div><dt>Độ ưu tiên</dt><dd>{plan.priority_level === 'blockbuster' ? 'Bom tấn' : plan.priority_level === 'high' ? 'Ưu tiên cao' : plan.priority_level === 'medium' ? 'Tiêu chuẩn' : 'Thông thường'}</dd></div><div><dt>Trạng thái tiếp nhận</dt><dd className="success">{plan.status === 'confirmed' ? 'Đã xác nhận tiếp nhận' : plan.status === 'deploying' ? 'Đang triển khai' : 'Chờ xác nhận'}</dd></div>
                    </dl></article>
                    <article className="deployment-detail-card direction"><header><Target size={17} /><div><b>Định hướng phát hành</b><span>Ghi chú và yêu cầu từ kế hoạch</span></div></header><p>{plan.plan_note || 'Chưa có ghi chú bổ sung. Thực hiện theo chỉ tiêu suất chiếu, thời gian và phòng chiếu ưu tiên đã được phân bổ.'}</p><div className="deployment-detail-owner"><UserCheck size={15} /><span>Ban hành bởi <b>{plan.plan_created_by || 'Admin Tổng'}</b></span></div></article>
                  </section>

                  <section className="deployment-detail-card movie"><header><Film size={17} /><div><b>Thông tin phim</b><span>Hồ sơ sử dụng để vận hành và tư vấn khách hàng</span></div></header><p className="deployment-movie-description">{plan.description || plan.plot_details || 'Nội dung phim đang được cập nhật trong kho Aurora DB.'}</p><div className="deployment-movie-facts">{movieFacts.map((fact: any) => <div key={fact[0]}><small>{fact[0]}</small><b>{fact[1]}</b></div>)}</div></section>

                  <section className="deployment-detail-card checklist"><header><CheckCircle2 size={17} /><div><b>Điều kiện triển khai tại rạp</b><span>Mỗi trạng thái được đối chiếu trực tiếp từ dữ liệu vận hành trong Aurora DB.</span></div></header><div className="deployment-task-list">{deploymentDetail.tasks.map((task: any, index: number) => {
                    const completedActionLabels: Record<string,string> = { review_assets:'Xem hồ sơ', prepare_screens:'Xem biên bản', create_showtimes:'Xem lịch chiếu', brief_team:'Gửi lại phân công' };
                    const actionLabel = task.status === 'completed' ? completedActionLabels[task.task_key] : task.action_label;
                    return <div key={task.task_key} className={task.status === 'completed' ? 'done' : ''}><span className="deployment-task-status" aria-label={task.status === 'completed' ? 'Đã hoàn thành' : 'Chưa hoàn thành'}>{task.status === 'completed' ? <Check size={15} /> : <span>{index + 1}</span>}</span><p><b>{task.task_name}</b><span>{task.task_description}</span><em className={task.status === 'completed' ? '' : 'pending'}>{task.evidence}</em>{task.status === 'completed' && task.updated_at && <small className="deployment-task-meta">Đối chiếu gần nhất: {task.updated_at}</small>}</p>{actionLabel && <button type="button" className="deployment-task-action" onClick={() => handleDeploymentTaskAction(task)}>{actionLabel}</button>}</div>;
                  })}</div></section>
                </>;
              })() : <div className="deployment-detail-loading"><AlertTriangle size={26} /><b>Không có dữ liệu kế hoạch để hiển thị.</b></div>}
            </div>
            <div className="tms-modal-footer"><button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowDeploymentDetailModal(false)}>Đóng</button></div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA PHIM VÀO KHO HỆ THỐNG */}
      {showMovieModal && (
        <div className="tms-modal-overlay">
          <div className="tms-modal-box tms-movie-modal">
            <div className="tms-modal-header tms-movie-modal-header">
              <div><div className="tms-movie-modal-kicker">KHO PHIM · AURORA DB</div><div className="tms-modal-title">{movieForm.id > 0 ? 'Chỉnh sửa thông tin phim' : 'Thêm phim mới vào kho hệ thống'}</div><p>{movieForm.id > 0 ? 'Cập nhật dữ liệu phim và media dùng chung toàn hệ thống.' : 'Tạo hồ sơ phim mới; dữ liệu sẽ được lưu trực tiếp vào aurora_db.'}</p></div>
              <button type="button" className="temp-btn" onClick={() => setShowMovieModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveMovie}>
              {movieFormError && (
                <div className="tms-alert-error" style={{ margin: '12px 0 0', fontSize: '0.82rem' }}>{movieFormError}</div>
              )}
              <div className="tms-modal-body tms-movie-modal-body">
                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">1. Thông tin phim</h3>
                  <div className="tms-movie-form-grid">
                    <div className="tms-form-group">
                      <label className="tms-form-label">Mã phim tự động *</label>
                      <div className="tms-movie-code-field"><input className="tms-form-input" value={movieForm.movie_code} readOnly required /><button type="button" onClick={() => setMovieForm({ ...movieForm, movie_code: generateMovieCode() })}>Tạo mã mới</button></div>
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Tên phim *</label>
                      <input className="tms-form-input" value={movieForm.title} onChange={e => setMovieForm({ ...movieForm, title: e.target.value })} placeholder="Tên phát hành tại Việt Nam" required maxLength={180} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Tên phim gốc</label>
                      <input className="tms-form-input" value={movieForm.original_title} onChange={e => setMovieForm({ ...movieForm, original_title: e.target.value })} maxLength={180} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Thể loại *</label>
                      <div className="tms-movie-multi-select" role="group" aria-label="Chọn thể loại phim">{MOVIE_GENRES.map(item => { const selected = movieForm.genre.split(',').map(value => value.trim()).includes(item); return <button type="button" key={item} className={selected ? 'selected' : ''} onClick={() => toggleMovieMultiValue('genre', item)}>{selected && <Check size={12}/>} {item}</button>; })}</div>
                      <small className="tms-movie-selection-hint">Chọn một hoặc nhiều thể loại.</small>
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Thời lượng (phút) *</label>
                      <input type="number" min={1} max={600} className="tms-form-input" value={movieForm.duration_minutes} onChange={e => setMovieForm({ ...movieForm, duration_minutes: Number(e.target.value) })} required />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Độ tuổi *</label>
                      <select className="tms-form-select" value={movieForm.age_rating} onChange={e => setMovieForm({ ...movieForm, age_rating: e.target.value })} required>
                        <option value="P">P - Phổ biến mọi lứa tuổi</option>
                        <option value="K">K - Dưới 13 tuổi có bảo trợ</option>
                        <option value="T13">T13 - Từ 13 tuổi trở lên</option>
                        <option value="T16">T16 - Từ 16 tuổi trở lên</option>
                        <option value="T18">T18 - Từ 18 tuổi trở lên</option>
                      </select>
                    </div>
                  </div>
                </section>

                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">2. Thông tin sản xuất</h3>
                  <div className="tms-movie-form-grid">
                    <div className="tms-form-group">
                      <label className="tms-form-label">Đạo diễn *</label>
                      <input className="tms-form-input" value={movieForm.director} onChange={e => setMovieForm({ ...movieForm, director: e.target.value })} required maxLength={180} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Diễn viên *</label>
                      <input className="tms-form-input" value={movieForm.cast} onChange={e => setMovieForm({ ...movieForm, cast: e.target.value })} placeholder="Phân cách bằng dấu phẩy" required maxLength={1000} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Biên kịch</label>
                      <input className="tms-form-input" value={movieForm.writer} onChange={e => setMovieForm({ ...movieForm, writer: e.target.value })} maxLength={180} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Nhà sản xuất</label>
                      <input className="tms-form-input" value={movieForm.producer} onChange={e => setMovieForm({ ...movieForm, producer: e.target.value })} maxLength={180} />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Quốc gia sản xuất *</label>
                      <select className="tms-form-select" value={movieForm.production_country} onChange={e => setMovieForm({ ...movieForm, production_country: e.target.value })} required>
                        <option value="">-- Chọn quốc gia --</option>
                        {MOVIE_COUNTRIES.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Năm sản xuất</label>
                      <input type="number" min={1888} max={2100} className="tms-form-input" value={movieForm.production_year} onChange={e => setMovieForm({ ...movieForm, production_year: e.target.value ? Number(e.target.value) : '' })} />
                    </div>
                  </div>
                </section>

                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">3. Nội dung</h3>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Tóm tắt phim *</label>
                    <textarea className="tms-form-input" rows={3} value={movieForm.description} onChange={e => setMovieForm({ ...movieForm, description: e.target.value })} required />
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Nội dung chi tiết</label>
                    <textarea className="tms-form-input" rows={5} value={movieForm.plot_details} onChange={e => setMovieForm({ ...movieForm, plot_details: e.target.value })} />
                  </div>
                </section>

                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">4. Ngôn ngữ &amp; định dạng</h3>
                  <div className="tms-movie-form-grid">
                    <div className="tms-form-group">
                      <label className="tms-form-label">Ngôn ngữ gốc *</label>
                      <select className="tms-form-select" value={movieForm.original_language} onChange={e => setMovieForm({ ...movieForm, original_language: e.target.value })} required>
                        <option value="">-- Chọn ngôn ngữ --</option>
                        {MOVIE_LANGUAGES.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Phiên bản phụ đề / lồng tiếng</label>
                      <select className="tms-form-select" value={movieForm.localization_versions} onChange={e => setMovieForm({ ...movieForm, localization_versions: e.target.value })}>
                        <option value="">-- Chọn phiên bản --</option>
                        {MOVIE_LOCALIZATION_OPTIONS.map(item => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="tms-form-group tms-movie-form-full">
                      <label className="tms-form-label">Định dạng chiếu *</label>
                      <div className="tms-movie-multi-select tms-movie-format-select" role="group" aria-label="Chọn định dạng chiếu">{MOVIE_FORMAT_OPTIONS.map(item => { const selected = movieForm.format.split(',').map(value => value.trim()).includes(item); return <button type="button" key={item} className={selected ? 'selected' : ''} onClick={() => toggleMovieMultiValue('format', item)}>{selected && <Check size={12}/>} {item}</button>; })}</div>
                      <small className="tms-movie-selection-hint">Chọn một hoặc nhiều định dạng chiếu.</small>
                    </div>
                  </div>
                </section>

                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">5. Phát hành &amp; media</h3>
                  <div className="tms-movie-form-grid">
                    <div className="tms-form-group">
                      <label className="tms-form-label">Ngày khởi chiếu *</label>
                      <VietnameseDateInput className="tms-form-input" value={movieForm.release_date} onChange={date => setMovieForm({ ...movieForm, release_date: date })} required ariaLabel="Ngày khởi chiếu" />
                    </div>
                    <div className="tms-form-group">
                      <label className="tms-form-label">Ngày kết thúc dự kiến</label>
                      <VietnameseDateInput className="tms-form-input" value={movieForm.expected_end_date} onChange={date => setMovieForm({ ...movieForm, expected_end_date: date })} ariaLabel="Ngày kết thúc dự kiến" />
                    </div>
                    <div className="tms-form-group tms-movie-form-full">
                      <label className="tms-form-label">Nhà phát hành</label>
                      <input className="tms-form-input" value={movieForm.distributor} onChange={e => setMovieForm({ ...movieForm, distributor: e.target.value })} maxLength={180} />
                    </div>
                    <div className="tms-movie-media-grid tms-movie-form-full">
                      <label className="tms-movie-upload-card poster-card"><span>Poster <b>*</b></span><div className="tms-movie-upload-preview portrait">{movieMediaPreviews.poster || movieForm.poster_url ? <img src={movieMediaPreviews.poster || movieForm.poster_url} alt="Xem trước poster" /> : <FileText size={23}/>}</div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleMovieMediaSelection('poster', e.target.files?.[0] || null)} required={!movieForm.poster_url && !movieFiles.poster} /><small>{movieFiles.poster?.name || 'JPG, PNG hoặc WebP · tối đa 15 MB'}</small></label>
                      <label className="tms-movie-upload-card banner-card"><span>Banner</span><div className="tms-movie-upload-preview landscape">{movieMediaPreviews.banner || movieForm.banner_url ? <img src={movieMediaPreviews.banner || movieForm.banner_url} alt="Xem trước banner" /> : <FileText size={23}/>}</div><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => handleMovieMediaSelection('banner', e.target.files?.[0] || null)} /><small>{movieFiles.banner?.name || 'JPG, PNG hoặc WebP · tối đa 15 MB'}</small></label>
                      <label className="tms-movie-upload-card trailer-card"><span>Trailer video</span><div className="tms-movie-upload-preview video">{movieMediaPreviews.trailer || movieForm.trailer_url ? <video src={movieMediaPreviews.trailer || movieForm.trailer_url} muted controls preload="metadata" /> : <Clapperboard size={23}/>}</div><input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={e => handleMovieMediaSelection('trailer', e.target.files?.[0] || null)} /><small>{movieFiles.trailer?.name || 'MP4, WebM hoặc MOV · tối đa 250 MB'}</small></label>
                    </div>
                  </div>
                </section>

                <section className="tms-movie-form-section">
                  <h3 className="tms-movie-form-heading">6. Trạng thái</h3>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Trạng thái *</label>
                    <select className="tms-form-select" value={movieForm.status} onChange={e => setMovieForm({ ...movieForm, status: e.target.value })} required>
                      <option value="coming_soon">Sắp chiếu (Coming Soon)</option>
                      <option value="now_showing">Đang chiếu (Now Showing)</option>
                      <option value="special_showing">Suất chiếu đặc biệt (Sneak Show)</option>
                      <option value="ended">Đã kết thúc</option>
                    </select>
                  </div>
                </section>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowMovieModal(false)}>Hủy</button>
                <button type="submit" className="tms-btn tms-btn-primary">
                  {movieForm.id > 0 ? 'Cập nhật phim' : 'Lưu phim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
