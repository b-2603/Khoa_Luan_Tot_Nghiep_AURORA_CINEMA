import { useState, useEffect, FormEvent } from 'react';
import {
  User, Lock, Eye, EyeOff, ChevronDown, Clapperboard,
  ShieldCheck, TrendingUp, Users, LogOut, Bell, BarChart3,
  Building2, CalendarDays, Film, Home, Menu, Package,
  Receipt, Settings, Tag, Ticket, UserRound, X, FileText,
  CheckCircle2, XCircle, AlertTriangle, Check,
  Plus, Edit, Trash2, DollarSign, Thermometer, Volume2,
  ShieldAlert, UserCheck, Monitor, ScrollText, CreditCard,
  Tv, Clapperboard as ShowtimeIcon, MapPin, Clock, Target,
  Layers, Send, CalendarCheck, Sparkles, Filter
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
const DEMO_ACCOUNTS = [
  { role: 'super_admin' as TMSRole, label: 'Admin Tổng', user: 'admin_tong', pass: '8888' },
  { role: 'cinema_admin' as TMSRole, label: 'Admin Rạp', user: 'admin_rap', pass: '8888' },
  { role: 'supervisor' as TMSRole, label: 'Supervisor', user: 'supervisor', pass: '8888' },
  { role: 'accounting' as TMSRole, label: 'Kế Toán', user: 'accounting', pass: '8888' },
];

// ============================================================
// ROLE-SPECIFIC NAVIGATION (maps exactly to Use Cases)
// ============================================================
type NavItem = { id: string; name: string; icon: React.ElementType; children?: string[] };

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
        { id: 'screens', name: 'Phòng chiếu', icon: Building2, children: ['Danh sách phòng', 'Sơ đồ ghế'] },
        { id: 'pricing', name: 'Áp dụng giá vé', icon: Tag },
        { id: 'promotions', name: 'Voucher / CTKM', icon: Ticket, children: ['Voucher tại rạp', 'Tiếp nhận CTKM', 'Triển khai CTKM', 'Đề xuất điều chỉnh'] },
        { id: 'products', name: 'Hàng hóa', icon: Package },
        { id: 'staff', name: 'Nhân viên & Ca', icon: Users, children: ['Nhân viên rạp', 'Phiên làm việc'] },
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
interface TMSUser { id?: number; username: string; full_name: string; role: TMSRole; phone?: string; status?: string; last_login?: string; }
interface ScreenData { id: number; screen_code: string; name: string; screen_type: string; total_seats: number; projector_status: 'online'|'standby'|'maintenance'|'error'; sound_system_status: 'online'|'standby'|'error'; hvac_temperature: number; lamp_hours: number; status: 'active'|'paused'|'cleaning'|'closed'; }
interface RefundItem { id: number; transaction_code: string; customer_name: string; reason: string; amount: number; payment_method: string; status: 'pending'|'approved'|'rejected'|'completed'; created_at?: string; requested_by?: string; }
interface TxnItem { id: number; transaction_code: string; customer_name?: string; customer_phone?: string; channel: 'pos'|'website'|'ota'; amount: number; payment_method: string; status: 'paid'|'pending'|'cancelled'|'refunded'; created_at?: string; cancel_requested?: boolean; }
interface StaffShift { id: number; name: string; position: string; shift: string; time: string; status: 'on_duty'|'checked_in'|'absent'; checkin: string; }

export interface MoviePlan {
  id: number;
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
  status: 'draft' | 'approved' | 'in_progress' | 'completed';
  note?: string;
  created_by?: string;
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
  title: string;
  duration_minutes: number;
  age_rating: string;
  format: string;
  status: string;
}

export interface TheaterItem {
  id: number;
  name: string;
  address: string;
  city: string;
}

// ============================================================
// APP COMPONENT
// ============================================================
export default function App() {
  // AUTH STATE
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<TMSUser | null>(null);

  // NAVIGATION
  const [active, setActive] = useState('dashboard');
  const [expanded, setExpanded] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [period, setPeriod] = useState('Hôm nay');

  // DATA
  const [tmsUsers, setTmsUsers] = useState<TMSUser[]>([]);
  const [screensList, setScreensList] = useState<ScreenData[]>([
    { id: 1, screen_code: 'SCREEN_01', name: 'Phòng 01 - Laser IMAX', screen_type: 'IMAX', total_seats: 280, projector_status: 'online', sound_system_status: 'online', hvac_temperature: 22.0, lamp_hours: 850, status: 'active' },
    { id: 2, screen_code: 'SCREEN_02', name: 'Phòng 02 - Dolby Atmos 3D', screen_type: '3D_DOLBY', total_seats: 180, projector_status: 'online', sound_system_status: 'online', hvac_temperature: 22.5, lamp_hours: 1240, status: 'active' },
    { id: 3, screen_code: 'SCREEN_03', name: 'Phòng 03 - VIP Starium Sofa', screen_type: 'VIP', total_seats: 64, projector_status: 'online', sound_system_status: 'online', hvac_temperature: 21.8, lamp_hours: 620, status: 'active' },
    { id: 4, screen_code: 'SCREEN_04', name: 'Phòng 04 - 4DX Dynamic', screen_type: '4DX', total_seats: 110, projector_status: 'online', sound_system_status: 'online', hvac_temperature: 22.0, lamp_hours: 930, status: 'active' },
    { id: 5, screen_code: 'SCREEN_05', name: 'Phòng 05 - Tiêu chuẩn Digital', screen_type: 'STANDARD', total_seats: 140, projector_status: 'online', sound_system_status: 'online', hvac_temperature: 23.0, lamp_hours: 1500, status: 'active' },
    { id: 6, screen_code: 'SCREEN_06', name: 'Phòng 06 - Tiêu chuẩn Digital', screen_type: 'STANDARD', total_seats: 140, projector_status: 'standby', sound_system_status: 'online', hvac_temperature: 23.5, lamp_hours: 1720, status: 'active' },
  ]);
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

  // MOVIE PLANNING & ALLOCATION DATA (MYSQL AURORA_DB)
  const [moviePlans, setMoviePlans] = useState<MoviePlan[]>([]);
  const [movieAllocations, setMovieAllocations] = useState<MovieAllocation[]>([]);
  const [moviesList, setMoviesList] = useState<MovieItem[]>([]);
  const [theatersList, setTheatersList] = useState<TheaterItem[]>([]);
  const [planMonth, setPlanMonth] = useState<number>(10);
  const [planYear, setPlanYear] = useState<number>(2026);
  const [planSearch, setPlanSearch] = useState('');
  const [planStatusFilter, setPlanStatusFilter] = useState('all');
  const [selectedTheaterFilter, setSelectedTheaterFilter] = useState<number>(0);

  // MODALS
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ id: 0, username: '', full_name: '', phone: '', role: 'cinema_admin' as TMSRole, password: '', status: 'active' });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundForm, setRefundForm] = useState({ transaction_code: '', customer_name: '', amount: 190000, reason: '', payment_method: 'cash' });

  // MOVIE PLAN MODAL
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    id: 0,
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
    status: 'approved' as 'draft' | 'approved' | 'in_progress' | 'completed',
    note: '',
    selected_theaters: [1, 2, 3, 4, 5] as number[]
  });

  // ALLOCATION MODAL
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [allocationTargetPlan, setAllocationTargetPlan] = useState<MoviePlan | null>(null);
  const [allocSelectedTheaters, setAllocSelectedTheaters] = useState<number[]>([1, 2, 3, 4, 5]);
  const [allocMinScreenings, setAllocMinScreenings] = useState(6);

  // MOVIE MODAL
  const [showMovieModal, setShowMovieModal] = useState(false);
  const [movieForm, setMovieForm] = useState({
    id: 0,
    title: '',
    duration_minutes: 120,
    age_rating: 'T13',
    format: '2D Digital / 3D',
    status: 'now_showing'
  });

  const API_BASE = 'http://localhost/AURORA%20CINEMA/tms/backend/public/api.php';

  // -------- DATA LOADERS (DIRECT MYSQL PERSISTENCE) --------
  const loadUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=users`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setTmsUsers(data.data);
    } catch {
      setTmsUsers([
        { id: 1, username: 'admin_tong', full_name: 'Nguyễn Trần Thái Bảo', phone: '0328754062', role: 'super_admin', status: 'active', last_login: '27/09/2026 00:15' },
        { id: 2, username: 'admin_rap', full_name: 'Lê Hoàng Nam', phone: '0901234567', role: 'cinema_admin', status: 'active', last_login: '27/09/2026 00:10' },
        { id: 3, username: 'supervisor', full_name: 'Trần Thị Mai', phone: '0912345678', role: 'supervisor', status: 'active', last_login: '27/09/2026 00:12' },
        { id: 4, username: 'accounting', full_name: 'Phạm Minh Trang', phone: '0923456789', role: 'accounting', status: 'active', last_login: '27/09/2026 00:08' },
      ]);
    }
  };

  const loadMoviePlans = async (m = planMonth, y = planYear) => {
    try {
      const res = await fetch(`${API_BASE}?action=movie-plans&month=${m}&year=${y}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMoviePlans(data.data);
      }
    } catch (e) {
      console.error('Error loading movie plans:', e);
    }
  };

  const loadMovieAllocations = async (theaterId = 0) => {
    try {
      const url = theaterId > 0 ? `${API_BASE}?action=movie-allocations&theater_id=${theaterId}` : `${API_BASE}?action=movie-allocations`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMovieAllocations(data.data);
      }
    } catch (e) {
      console.error('Error loading allocations:', e);
    }
  };

  const loadMovies = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=movies`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setMoviesList(data.data);
      }
    } catch (e) {
      console.error('Error loading movies:', e);
    }
  };

  const loadTheaters = async () => {
    try {
      const res = await fetch(`${API_BASE}?action=theaters`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTheatersList(data.data);
      }
    } catch (e) {
      console.error('Error loading theaters:', e);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadUsers();
      loadMoviePlans();
      loadMovieAllocations();
      loadMovies();
      loadTheaters();
    }
  }, [isLoggedIn]);

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
    try {
      const url = planForm.id > 0 ? `${API_BASE}?action=movie-plans&id=${planForm.id}` : `${API_BASE}?action=movie-plans`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify({
          ...planForm,
          theaters: planForm.selected_theaters
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(planForm.id > 0 ? 'Đã cập nhật kế hoạch phim thành công!' : 'Đã lập kế hoạch phim và phân bổ cho chuỗi rạp thành công!');
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
    if (!window.confirm('Bạn có chắc chắn muốn xóa kế hoạch phim này và các phân bổ rạp liên quan?')) return;
    try {
      const res = await fetch(`${API_BASE}?action=movie-plans&id=${id}`, {
        method: 'DELETE',
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
  };

  const handleUpdatePlanStatus = async (planId: number, newStatus: string) => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      await fetch(`${API_BASE}?action=movie-plans&id=${planId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify({ status: newStatus })
      });
      loadMoviePlans();
    } catch (e) {
      console.error(e);
    }
  };

  // ALLOCATION HANDLER (Admin Tổng phân bổ cho 5 rạp TPHCM)
  const handleExecuteAllocation = async (e: FormEvent) => {
    e.preventDefault();
    if (!allocationTargetPlan) return;
    try {
      for (const tId of allocSelectedTheaters) {
        const theater = theatersList.find(t => t.id === tId);
        const tName = theater ? theater.name : `Rạp #${tId}`;
        await fetch(`${API_BASE}?action=movie-allocations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
          body: JSON.stringify({
            plan_id: allocationTargetPlan.id,
            movie_id: allocationTargetPlan.movie_id,
            movie_title: allocationTargetPlan.movie_title,
            theater_id: tId,
            theater_name: tName,
            min_screenings_per_day: allocMinScreenings,
            preferred_screen_types: allocationTargetPlan.format || 'Standard / IMAX',
            allocated_start_date: allocationTargetPlan.expected_start_date,
            allocated_end_date: allocationTargetPlan.expected_end_date,
            status: 'pending'
          })
        });
      }
      alert(`Đã phân bổ "${allocationTargetPlan.movie_title}" cho ${allocSelectedTheaters.length} cụm rạp TP.HCM thành công!`);
      setShowAllocationModal(false);
      loadMoviePlans();
      loadMovieAllocations();
    } catch {
      alert('Lỗi phân bổ phim cho rạp.');
    }
  };

  // CONFIRM ALLOCATION (Admin Rạp bấm xác nhận)
  const handleConfirmAllocation = async (allocationId: number) => {
    try {
      const res = await fetch(`${API_BASE}?action=movie-allocations&id=${allocationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_rap' },
        body: JSON.stringify({ status: 'confirmed' })
      });
      const data = await res.json();
      if (data.success) {
        alert('Admin Rạp đã xác nhận tiếp nhận kế hoạch phim thành công!');
        loadMovieAllocations();
        loadMoviePlans();
      } else {
        alert(data.message);
      }
    } catch {
      alert('Lỗi xác nhận kế hoạch.');
    }
  };

  // CRUD FOR MASTER MOVIE LIBRARY
  const handleSaveMovie = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const url = movieForm.id > 0 ? `${API_BASE}?action=movies&id=${movieForm.id}` : `${API_BASE}?action=movies`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-TMS-User': currentUser?.username || 'admin_tong' },
        body: JSON.stringify(movieForm)
      });
      const data = await res.json();
      if (data.success) {
        alert(movieForm.id > 0 ? 'Đã cập nhật phim!' : 'Đã thêm phim mới vào kho hệ thống!');
        setShowMovieModal(false);
        loadMovies();
      } else {
        alert(data.message);
      }
    } catch {
      alert('Lỗi kết nối cơ sở dữ liệu.');
    }
  };

  const handleDeleteMovie = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa phim này khỏi kho hệ thống?')) return;
    try {
      const res = await fetch(`${API_BASE}?action=movies&id=${id}`, {
        method: 'DELETE',
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
      const res = await fetch(`${API_BASE}?action=login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }) });
      const result = await res.json();
      if (result.success && result.data?.user) {
        const user = result.data.user;
        const role: TMSRole = user.role === 'director' || user.role === 'super_admin' ? 'super_admin' : user.role === 'supervisor' || user.role === 'technician' ? 'supervisor' : user.role === 'accounting' ? 'accounting' : 'cinema_admin';
        setCurrentUser({ id: user.id, username: user.username, full_name: user.full_name, role, phone: user.phone, status: user.status });
        setIsLoggedIn(true); setActive('dashboard');
      } else { setErrorMsg(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.'); }
    } catch {
      // Offline fallback - validate credentials strictly
      const VALID: Record<string, { role: TMSRole; full_name: string }> = {
        'admin_tong': { role: 'super_admin', full_name: 'Nguyễn Trần Thái Bảo' },
        '0328754062': { role: 'super_admin', full_name: 'Nguyễn Trần Thái Bảo' },
        'admin_rap': { role: 'cinema_admin', full_name: 'Lê Hoàng Nam' },
        'admin': { role: 'cinema_admin', full_name: 'Lê Hoàng Nam' },
        'supervisor': { role: 'supervisor', full_name: 'Trần Thị Mai' },
        'accounting': { role: 'accounting', full_name: 'Phạm Minh Trang' },
        'ketoan': { role: 'accounting', full_name: 'Phạm Minh Trang' },
      };
      if (VALID[u] && ['8888', 'admin123'].includes(p)) {
        const v = VALID[u];
        setCurrentUser({ id: v.role === 'super_admin' ? 1 : v.role === 'cinema_admin' ? 2 : v.role === 'supervisor' ? 3 : 4, username: u, full_name: v.full_name, role: v.role, status: 'active' });
        setIsLoggedIn(true); setActive('dashboard');
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    try { await fetch(`${API_BASE}?action=logout`); } catch { /* ignore */ }
    setIsLoggedIn(false); setPassword(''); setCurrentUser(null); setUserDropdownOpen(false);
  };

  // -------- PERMISSIONS HANDLERS --------
  const handleSaveUser = async (e: FormEvent) => {
    e.preventDefault();
    if (currentUser?.role !== 'super_admin') { alert('Chỉ Admin Tổng mới có quyền quản lý tài khoản!'); return; }
    try {
      const res = await fetch(`${API_BASE}?action=users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userForm) });
      const data = await res.json();
      if (data.success) { alert(data.message || 'Thành công!'); setShowUserModal(false); loadUsers(); }
      else alert(data.message);
    } catch {
      if (userForm.id > 0) setTmsUsers(prev => prev.map(item => item.id === userForm.id ? { ...item, full_name: userForm.full_name, phone: userForm.phone, role: userForm.role, status: userForm.status } : item));
      else setTmsUsers(prev => [...prev, { id: Date.now(), username: userForm.username, full_name: userForm.full_name, phone: userForm.phone, role: userForm.role, status: userForm.status, last_login: 'Chưa đăng nhập' }]);
      setShowUserModal(false);
    }
  };

  const toggleUserStatus = (u: TMSUser) => {
    if (currentUser?.role !== 'super_admin') { alert('Chỉ Admin Tổng mới có quyền này!'); return; }
    setTmsUsers(prev => prev.map(item => item.id === u.id ? { ...item, status: item.status === 'active' ? 'locked' : 'active' } : item));
  };

  const adjustTemp = (id: number, d: number) => {
    if (!['supervisor', 'cinema_admin', 'super_admin'].includes(currentUser?.role || '')) { alert('Không có quyền điều chỉnh nhiệt độ.'); return; }
    setScreensList(prev => prev.map(s => s.id === id ? { ...s, hvac_temperature: Math.max(18, Math.min(26, Math.round((s.hvac_temperature + d) * 10) / 10)) } : s));
  };

  const toggleProjector = (id: number) => {
    if (!['supervisor', 'cinema_admin', 'super_admin'].includes(currentUser?.role || '')) { alert('Không có quyền thay đổi trạng thái máy chiếu.'); return; }
    setScreensList(prev => prev.map(s => s.id === id ? { ...s, projector_status: s.projector_status === 'online' ? 'standby' : 'online' } : s));
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

              {/* Demo credentials info box */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                  Tài khoản demo (mật khẩu: 8888)
                </div>
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
  const renderDashboard = () => {
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
      return (
        <div>
          <div className="tms-tabs-bar">
            <button className={`tms-tab-btn ${!isMatrix ? 'active' : ''}`} onClick={() => setActive('Danh sách tài khoản')}><Users size={16}/><span>Danh sách tài khoản ({tmsUsers.length})</span></button>
            <button className={`tms-tab-btn ${isMatrix ? 'active' : ''}`} onClick={() => setActive('Ma trận phân quyền')}><ShieldCheck size={16}/><span>Ma trận phân quyền RBAC</span></button>
          </div>
          {!isMatrix ? (
            <div className="tms-card-table">
              <div className="tms-table-toolbar">
                <div className="tms-search-input"><Users size={16} color="#94a3b8"/><input placeholder="Tìm tên, username..." /></div>
                <button className="tms-btn tms-btn-primary" onClick={() => { setUserForm({id:0,username:'',full_name:'',phone:'',role:'cinema_admin',password:'',status:'active'}); setShowUserModal(true); }}><Plus size={16}/><span>Thêm tài khoản</span></button>
              </div>
              <table className="tms-data-table">
                <thead><tr><th>ID</th><th>Họ và Tên</th><th>Username</th><th>SĐT</th><th>Vai trò</th><th>Trạng thái</th><th>Đăng nhập cuối</th><th>Thao tác</th></tr></thead>
                <tbody>{tmsUsers.map(u => {
                  const ucfg = ROLE_CONFIGS[u.role as TMSRole] || ROLE_CONFIGS.cinema_admin;
                  return (
                    <tr key={u.id}>
                      <td style={{fontWeight:700,color:'#64748b'}}>#{u.id}</td>
                      <td><div style={{display:'flex',alignItems:'center',gap:10}}><div style={{width:32,height:32,borderRadius:8,background:ucfg.bg,color:ucfg.color,fontWeight:800,display:'grid',placeItems:'center',fontSize:'1rem'}}>{ucfg.emoji}</div><div><div style={{fontWeight:700}}>{u.full_name}</div><div style={{fontSize:'0.74rem',color:'#64748b'}}>{ucfg.tagline}</div></div></div></td>
                      <td><code style={{background:'#f1f5f9',padding:'3px 7px',borderRadius:4}}>@{u.username}</code></td>
                      <td>{u.phone}</td>
                      <td><span className={`role-badge-pill ${u.role}`}>{ucfg.name}</span></td>
                      <td><span style={{display:'inline-flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:6,fontSize:'0.74rem',fontWeight:700,background:u.status==='active'?'#ecfdf5':'#fee2e2',color:u.status==='active'?'#065f46':'#991b1b'}}>{u.status==='active'?<CheckCircle2 size={12}/>:<XCircle size={12}/>}{u.status==='active'?'Hoạt động':'Tạm khóa'}</span></td>
                      <td style={{fontSize:'0.8rem',color:'#64748b'}}>{u.last_login||'—'}</td>
                      <td><div style={{display:'inline-flex',gap:6}}><button className="tms-btn tms-btn-outline" style={{padding:'5px 8px'}} onClick={()=>{setUserForm({id:u.id||0,username:u.username,full_name:u.full_name,phone:u.phone||'',role:u.role,password:'',status:u.status||'active'});setShowUserModal(true);}}><Edit size={14}/></button><button className="tms-btn tms-btn-outline" style={{padding:'5px 8px',color:u.status==='active'?'#dc2626':'#059669'}} onClick={()=>toggleUserStatus(u)}>{u.status==='active'?<Lock size={14}/>:<Check size={14}/>}</button></div></td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          ) : (
            <div className="rbac-table-container">
              <div style={{padding:'16px 20px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc'}}>
                <h3 style={{margin:0,fontSize:'1rem',fontWeight:800}}>Ma Trận Phân Quyền RBAC — 4 Vai Trò × Use Cases</h3>
                <p style={{margin:'4px 0 0',fontSize:'0.82rem',color:'#64748b'}}>Quy định thẩm quyền cụ thể của từng vai trò trên toàn bộ phân hệ hệ thống TMS.</p>
              </div>
              <table className="rbac-matrix-table">
                <thead><tr>
                  <th style={{width:'24%'}}>Use Case / Phân hệ</th>
                  <th><div className="rbac-col-header" style={{color:'#d97706'}}>👑 Admin Tổng</div></th>
                  <th><div className="rbac-col-header" style={{color:'#2563eb'}}>🏢 Admin Rạp</div></th>
                  <th><div className="rbac-col-header" style={{color:'#059669'}}>🛡️ Supervisor</div></th>
                  <th><div className="rbac-col-header" style={{color:'#7c3aed'}}>📊 Kế Toán</div></th>
                </tr></thead>
                <tbody>
                  {[
                    {uc:'Đăng nhập', sa:'✅',ca:'✅',sv:'✅',ac:'✅'},
                    {uc:'Quản lý tài khoản & Phân quyền', sa:'✅ Đặc quyền tuyệt đối',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Quản lý hệ thống rạp', sa:'✅ Toàn chuỗi',ca:'👁️ Xem rạp phụ trách',sv:'❌',ac:'❌'},
                    {uc:'Quản lý danh sách phim', sa:'✅ Toàn quyền CRUD',ca:'❌ Không tự thêm phim',sv:'👁️ Xem',ac:'👁️ Xem'},
                    {uc:'Lập kế hoạch phim theo tháng', sa:'✅ Đặc quyền lập kế hoạch',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Phân bổ phim cho rạp', sa:'✅ Đặc quyền phân bổ',ca:'❌ Chỉ nhận phân bổ',sv:'❌',ac:'❌'},
                    {uc:'Xem/Xác nhận kế hoạch phim', sa:'✅',ca:'✅ Xem + Xác nhận + Triển khai',sv:'👁️',ac:'❌'},
                    {uc:'Lịch chiếu / Suất chiếu', sa:'✅ Toàn quyền',ca:'✅ Lập lịch tại rạp',sv:'✅ Theo dõi + Cập nhật TT',ac:'👁️ Xem đối soát'},
                    {uc:'Phòng chiếu & Sơ đồ ghế', sa:'✅ Cấu hình toàn bộ',ca:'✅ Quản lý phòng rạp',sv:'✅ Điều khiển HVAC, máy chiếu',ac:'❌'},
                    {uc:'Chính sách giá chung', sa:'✅ Ban hành chính sách',ca:'👁️ Áp dụng giá được cấp',sv:'👁️ Xem hỗ trợ',ac:'👁️ Xem đối soát'},
                    {uc:'Danh mục dùng chung', sa:'✅ Toàn quyền',ca:'👁️ Xem',sv:'👁️ Xem',ac:'❌'},
                    {uc:'Duyệt kế hoạch CTKM', sa:'✅ Phê duyệt',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Quản lý/Triển khai CTKM', sa:'✅ Hệ thống',ca:'✅ Tại rạp + Đề xuất điều chỉnh',sv:'👁️ Xác thực voucher',ac:'👁️ Kiểm soát ngân sách'},
                    {uc:'Quản lý hàng hóa (F&B)', sa:'✅ Toàn quyền',ca:'✅ Kho hàng rạp',sv:'✅ Kiểm kê ca trực',ac:'👁️ Xem xuất nhập tồn'},
                    {uc:'Nhân viên & Ca làm việc', sa:'✅ Toàn chuỗi',ca:'✅ Quản lý nhân viên rạp',sv:'✅ Điểm danh, check-in',ac:'👁️ Xem hạch toán lương'},
                    {uc:'Giao dịch POS', sa:'✅ Toàn hệ thống',ca:'👁️ Theo dõi bán hàng',sv:'✅ Theo dõi + Phê duyệt hủy',ac:'✅ Xem + Đối soát'},
                    {uc:'Phê duyệt hủy giao dịch', sa:'✅',ca:'❌',sv:'✅ Phê duyệt / Từ chối',ac:'❌'},
                    {uc:'Phê duyệt hoàn tiền', sa:'✅',ca:'✅ Tại rạp',sv:'✅ Phê duyệt / Từ chối',ac:'✅ Theo dõi + Đối soát'},
                    {uc:'Xử lý nghiệp vụ ngoại lệ', sa:'✅',ca:'❌',sv:'✅',ac:'❌'},
                    {uc:'Theo dõi hoạt động toàn hệ thống', sa:'✅',ca:'👁️ Chỉ rạp phụ trách',sv:'👁️ Chỉ ca trực',ac:'👁️ Dữ liệu tài chính'},
                    {uc:'Xem giao dịch & Lịch sử TT', sa:'✅',ca:'👁️',sv:'👁️ POS hôm nay',ac:'✅ Toàn bộ'},
                    {uc:'Kiểm tra hóa đơn', sa:'✅',ca:'❌',sv:'❌',ac:'✅'},
                    {uc:'Đối soát giao dịch & Thanh toán', sa:'✅',ca:'❌',sv:'❌',ac:'✅ Đặc quyền'},
                    {uc:'Báo cáo doanh thu / Bán vé / Bán hàng', sa:'✅ Tổng hợp',ca:'✅ Tại rạp',sv:'✅ Vận hành ca',ac:'✅ Tài chính chuyên sâu'},
                    {uc:'Quản lý thiết bị POS', sa:'✅ Toàn quyền',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Phê duyệt thiết bị POS', sa:'✅ Đặc quyền',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Xem Audit Log', sa:'✅ Đặc quyền',ca:'❌',sv:'❌',ac:'❌'},
                    {uc:'Cấu hình hệ thống', sa:'✅ Đặc quyền tuyệt đối',ca:'❌',sv:'❌',ac:'❌'},
                  ].map((row,i) => (
                    <tr key={i}>
                      <td><b style={{fontSize:'0.84rem'}}>{row.uc}</b></td>
                      <td style={{fontSize:'0.8rem'}}>{row.sa}</td>
                      <td style={{fontSize:'0.8rem'}}>{row.ca}</td>
                      <td style={{fontSize:'0.8rem'}}>{row.sv}</td>
                      <td style={{fontSize:'0.8rem'}}>{row.ac}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    // CINEMAS
    if (a === 'cinemas' || a === 'Hệ thống rạp') return (
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div style={{fontWeight:700}}>Hệ thống rạp Aurora Cinema</div><button className="tms-btn tms-btn-primary" onClick={()=>alert('Thêm rạp mới')}><Plus size={16}/><span>Thêm rạp</span></button></div>
        <table className="tms-data-table">
          <thead><tr><th>Tên rạp</th><th>Địa chỉ</th><th>Phòng chiếu</th><th>Admin Rạp</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{[
            {name:'Aurora Cinema - Tân Bình',addr:'200 Hoàng Văn Thụ, Q.Tân Bình, TP.HCM',rooms:6,admin:'Lê Hoàng Nam',status:'Hoạt động'},
            {name:'Aurora Cinema - Quận 7',addr:'15 Nguyễn Thị Thập, Q.7, TP.HCM',rooms:8,admin:'Phạm Văn Tư',status:'Hoạt động'},
            {name:'Aurora Cinema - Bình Dương',addr:'Aeon Mall Canary, Bình Dương',rooms:5,admin:'Trần Quốc Hùng',status:'Hoạt động'},
          ].map((c,i)=>(
            <tr key={i}>
              <td style={{fontWeight:700}}>{c.name}</td>
              <td style={{fontSize:'0.82rem',color:'#64748b'}}>{c.addr}</td>
              <td style={{fontWeight:700,color:'#2563eb'}}>{c.rooms} phòng</td>
              <td>{c.admin}</td>
              <td><span style={{fontSize:'0.74rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:'#ecfdf5',color:'#065f46'}}>{c.status}</span></td>
              <td><button className="tms-btn tms-btn-outline" style={{padding:'4px 8px'}}><Edit size={13}/></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    // ========================================================
    // KẾ HOẠCH PHIM THEO THÁNG (USE CASE 6 - ADMIN TỔNG)
    // ========================================================
    if (a === 'Kế hoạch phim') {
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
          <div className="tms-tabs-bar" style={{ marginBottom: 16 }}>
            {[9, 10, 11, 12].map(m => (
              <button
                key={m}
                className={`tms-tab-btn ${planMonth === m ? 'active' : ''}`}
                onClick={() => handleSelectPlanMonth(m)}
              >
                <CalendarDays size={16} />
                <span>Tháng {m < 10 ? `0${m}` : m}/2026 {m === 10 ? '🎃 (Mùa Halloween & Bom Tấn)' : m === 9 ? '🍂 (Thu)' : '🎄 (Lễ Hội)'}</span>
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
                <small>Tháng {planMonth}/2026</small>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon orange"><Target size={24} /></div>
              <div>
                <span>Mục tiêu doanh thu</span>
                <strong>{totalTargetRev.toLocaleString('vi-VN')} đ</strong>
                <small>Toàn chuỗi 5 rạp TP.HCM</small>
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
                  <option value="approved">Đã duyệt</option>
                  <option value="in_progress">Đang thực hiện</option>
                  <option value="draft">Dự thảo</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="tms-btn tms-btn-outline"
                  onClick={() => setActive('Phân bổ phim cho rạp')}
                >
                  <Building2 size={16} />
                  <span>Xem phân bổ 5 rạp</span>
                </button>
                <button
                  className="tms-btn tms-btn-primary"
                  onClick={() => {
                    const defaultMovie = moviesList[0] || { id: 1, title: 'Avatar: Dòng Chảy Của Nước', format: '3D IMAX' };
                    setPlanForm({
                      id: 0,
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
                      status: 'approved',
                      note: '',
                      selected_theaters: [1, 2, 3, 4, 5]
                    });
                    setShowPlanModal(true);
                  }}
                >
                  <Plus size={16} />
                  <span>+ Lập kế hoạch phim mới</span>
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
                      Chưa có kế hoạch phim cho Tháng {planMonth}/{planYear}. Bấm "<b>+ Lập kế hoạch phim mới</b>" để thêm phim vào kế hoạch tháng!
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
                      draft: { label: 'Dự thảo', bg: '#f1f5f9', color: '#475569' },
                      approved: { label: 'Đã duyệt', bg: '#dbeafe', color: '#1d4ed8' },
                      in_progress: { label: 'Đang chiếu', bg: '#dcfce7', color: '#15803d' },
                      completed: { label: 'Hoàn thành', bg: '#f3e8ff', color: '#7e22ce' }
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
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tháng {plan.plan_month}/{plan.plan_year}</span>
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
                            <option value="draft">Dự thảo</option>
                            <option value="approved">Đã duyệt</option>
                            <option value="in_progress">Đang chiếu</option>
                            <option value="completed">Hoàn thành</option>
                          </select>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="tms-btn tms-btn-outline"
                              style={{ padding: '4px 8px', fontSize: '0.73rem', color: '#2563eb' }}
                              title="Phân bổ cho các cụm rạp TP.HCM"
                              onClick={() => {
                                setAllocationTargetPlan(plan);
                                setAllocMinScreenings(plan.target_screenings_per_day);
                                setShowAllocationModal(true);
                              }}
                            >
                              <Send size={13} />
                              <span>Phân bổ</span>
                            </button>
                            <button
                              className="tms-btn tms-btn-outline"
                              style={{ padding: '4px 7px' }}
                              title="Sửa kế hoạch"
                              onClick={() => {
                                setPlanForm({
                                  id: plan.id,
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
              <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                Tổng cộng: <b>{filteredAllocations.length}</b> phân bổ phim
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
                            onClick={async () => {
                              if (!window.confirm('Thu hồi phân bổ phim này khỏi rạp?')) return;
                              await fetch(`${API_BASE}?action=movie-allocations&id=${al.id}`, { method: 'DELETE', headers: { 'X-TMS-User': currentUser?.username || 'admin_tong' } });
                              loadMovieAllocations();
                              loadMoviePlans();
                            }}
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
            <button
              className="tms-btn tms-btn-primary"
              onClick={() => {
                setMovieForm({ id: 0, title: '', duration_minutes: 120, age_rating: 'T13', format: '2D Digital / 3D', status: 'now_showing' });
                setShowMovieModal(true);
              }}
            >
              <Plus size={16} />
              <span>+ Thêm phim vào kho hệ thống</span>
            </button>
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
              {moviesList.map(m => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 700, color: '#64748b' }}>#{m.id}</td>
                  <td style={{ fontWeight: 700 }}>{m.title}</td>
                  <td>{m.duration_minutes} phút</td>
                  <td>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: '0.74rem' }}>
                      {m.age_rating}
                    </span>
                  </td>
                  <td>{m.format}</td>
                  <td>
                    <span style={{
                      background: m.status === 'now_showing' ? '#ecfdf5' : '#fef3c7',
                      color: m.status === 'now_showing' ? '#065f46' : '#92400e',
                      padding: '2px 7px',
                      borderRadius: 4,
                      fontWeight: 700,
                      fontSize: '0.74rem'
                    }}>
                      {m.status === 'now_showing' ? 'Đang chiếu' : m.status === 'coming_soon' ? 'Sắp chiếu' : 'Đặc biệt'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        className="tms-btn tms-btn-outline"
                        style={{ padding: '4px 8px' }}
                        onClick={() => {
                          setMovieForm({ id: m.id, title: m.title, duration_minutes: m.duration_minutes, age_rating: m.age_rating, format: m.format, status: m.status });
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
                </tr>
              ))}
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

      // Load allocations for current cinema (defaults to Aurora Q1 or first theater)
      const myTheaterId = 1; // Default theater assigned to admin_rap
      const myAllocations = movieAllocations.filter(al => Number(al.theater_id) === myTheaterId || al.theater_name.includes('Q1'));
      const pendingAllocations = myAllocations.filter(al => al.status === 'pending');
      const confirmedAllocations = myAllocations.filter(al => al.status === 'confirmed' || al.status === 'deploying');

      return (
        <div>
          <div style={{ padding: '12px 16px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, marginBottom: 16, fontSize: '0.84rem', color: '#1e40af', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <b>🔒 Phân quyền Admin Rạp (Aurora Q1):</b> Bạn chỉ có thể triển khai phim từ danh sách <b>Admin Tổng đã phân bổ</b> cho rạp. Không được tự ý thêm phim mới.
            </div>
            <span style={{ fontSize: '0.74rem', background: '#dbeafe', padding: '3px 8px', borderRadius: 4, fontWeight: 700 }}>
              Cụm rạp: Aurora Cinema Q1
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
                          onClick={() => {
                            setActive('Lịch chiếu');
                            alert(`Chuyển sang phân hệ Lịch chiếu để sắp xếp suất chiếu cho "${al.movie_title}"!`);
                          }}
                        >
                          <CalendarDays size={12} /> Lên lịch chiếu
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // SCHEDULES
    if (a === 'schedules' || a === 'showtimes' || a === 'Lịch chiếu' || a === 'Theo dõi suất chiếu') {
      const canEdit = role === 'super_admin' || role === 'cinema_admin';
      return (
        <div className="tms-card-table">
          <div className="tms-table-toolbar">
            <div style={{fontWeight:700}}>{role==='supervisor'?'Suất chiếu đang diễn ra hôm nay':'Lịch chiếu'}</div>
            {canEdit&&<button className="tms-btn tms-btn-primary" onClick={()=>alert('Tạo suất chiếu mới')}><Plus size={16}/><span>Tạo suất chiếu</span></button>}
          </div>
          <table className="tms-data-table">
            <thead><tr><th>Phim</th><th>Phòng chiếu</th><th>Ngày</th><th>Giờ chiếu</th><th>Ghế đặt</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{[
              {movie:'Avatar: Dòng Chảy Của Nước',room:'Phòng 01 - IMAX',date:'27/09/2026',time:'09:00',booked:'240/280',status:'Đang chiếu'},
              {movie:'Dune: Hành Tinh Cát 2',room:'Phòng 02 - Dolby',date:'27/09/2026',time:'11:30',booked:'156/180',status:'Sắp chiếu'},
              {movie:'Oppenheimer',room:'Phòng 05 - Standard',date:'27/09/2026',time:'14:00',booked:'98/140',status:'Sắp chiếu'},
              {movie:'Mai (Trấn Thành)',room:'Phòng 06 - Standard',date:'27/09/2026',time:'16:30',booked:'120/140',status:'Sắp chiếu'},
              {movie:'Avatar: Dòng Chảy Của Nước',room:'Phòng 01 - IMAX',date:'27/09/2026',time:'19:30',booked:'280/280',status:'Hết vé'},
            ].map((s,i)=>(
              <tr key={i}>
                <td style={{fontWeight:700,fontSize:'0.85rem'}}>{s.movie}</td>
                <td style={{fontSize:'0.82rem'}}>{s.room}</td>
                <td>{s.date}</td>
                <td style={{fontWeight:700,color:'#2563eb'}}>{s.time}</td>
                <td>{s.booked}</td>
                <td><span style={{fontSize:'0.73rem',fontWeight:700,padding:'2px 7px',borderRadius:4,background:s.status==='Đang chiếu'?'#d1fae5':s.status==='Hết vé'?'#fee2e2':'#eff6ff',color:s.status==='Đang chiếu'?'#065f46':s.status==='Hết vé'?'#991b1b':'#1e40af'}}>{s.status}</span></td>
                <td>{role==='supervisor'?<button className="tms-btn tms-btn-outline" style={{padding:'4px 10px',fontSize:'0.73rem'}}>Cập nhật TT</button>:canEdit?<div style={{display:'flex',gap:4}}><button className="tms-btn tms-btn-outline" style={{padding:'4px 8px'}}><Edit size={13}/></button><button className="tms-btn tms-btn-outline" style={{padding:'4px 8px',color:'#dc2626'}}><Trash2 size={13}/></button></div>:<span style={{color:'#94a3b8',fontSize:'0.75rem'}}>Chỉ xem</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
    }

    // SCREENS
    if (a === 'screens' || a === 'Theo dõi phòng chiếu' || a === 'Danh sách phòng' || a === 'Sơ đồ ghế') {
      const canCtrl = ['supervisor','cinema_admin','super_admin'].includes(role||'');
      return (
        <div>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
            <div><h2 style={{margin:0,fontSize:'1.1rem',fontWeight:800}}>{role==='supervisor'?'Theo dõi phòng chiếu ca trực':'Quản lý phòng chiếu & Thiết bị'}</h2><p style={{margin:'4px 0 0',fontSize:'0.82rem',color:'#64748b'}}>Nhiệt độ HVAC, máy chiếu, âm thanh, sức chứa</p></div>
          </div>
          <div className="screens-grid">
            {screensList.map(s=>(
              <div className="screen-monitor-card" key={s.id}>
                <div className="screen-card-header">
                  <span className="screen-code-pill">{s.screen_code}</span>
                  <span style={{fontSize:'0.73rem',fontWeight:700,padding:'3px 9px',borderRadius:5,background:s.projector_status==='online'?'#d1fae5':'#fef3c7',color:s.projector_status==='online'?'#065f46':'#92400e'}}>{s.projector_status.toUpperCase()}</span>
                </div>
                <div className="screen-name-title">{s.name}</div>
                <div className="screen-specs-row">
                  <div className="screen-spec-item"><span className="screen-spec-label">Loại</span><span className="screen-spec-value">{s.screen_type}</span></div>
                  <div className="screen-spec-item"><span className="screen-spec-label">Sức chứa</span><span className="screen-spec-value">{s.total_seats} ghế</span></div>
                  <div className="screen-spec-item"><span className="screen-spec-label">HVAC</span><span className="screen-spec-value" style={{color:'#059669'}}><Thermometer size={13}/>{s.hvac_temperature}°C</span></div>
                  <div className="screen-spec-item"><span className="screen-spec-label">Âm thanh</span><span className="screen-spec-value"><Volume2 size={13}/>{s.sound_system_status}</span></div>
                </div>
                {canCtrl&&<div className="screen-controls-row">
                  <div className="temp-control-box">
                    <span style={{fontSize:'0.74rem',color:'#64748b',fontWeight:600}}>Nhiệt độ:</span>
                    <button className="temp-btn" onClick={()=>adjustTemp(s.id,-0.5)}>-</button>
                    <span style={{fontSize:'0.85rem',fontWeight:700}}>{s.hvac_temperature}°C</span>
                    <button className="temp-btn" onClick={()=>adjustTemp(s.id,0.5)}>+</button>
                  </div>
                  <button className="tms-btn tms-btn-outline" style={{padding:'5px 10px',fontSize:'0.74rem'}} onClick={()=>toggleProjector(s.id)}>Đổi trạng thái</button>
                </div>}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // STAFF & SHIFTS
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
      <div className="tms-card-table">
        <div className="tms-table-toolbar"><div><h3 style={{margin:0,fontWeight:800}}>Bảng giá vé Aurora Cinema</h3><span style={{fontSize:'0.78rem',color:'#64748b'}}>{role==='super_admin'?'★ Admin Tổng: Có quyền ban hành và điều chỉnh chính sách giá toàn hệ thống':'★ Áp dụng bảng giá từ Admin Tổng tại rạp (chỉ xem)'}</span></div></div>
        <table className="tms-data-table">
          <thead><tr><th>Mã vé</th><th>Tên loại vé</th><th>Giá ngày thường</th><th>Phụ thu cuối tuần</th><th>Thao tác</th></tr></thead>
          <tbody>{[
            {code:'TICKET_STD',name:'Vé Tiêu Chuẩn (2D)',price:95000,sur:15000},
            {code:'TICKET_VIP',name:'Vé VIP Sofa Starium',price:145000,sur:20000},
            {code:'TICKET_IMAX',name:'Vé Laser IMAX',price:190000,sur:30000},
            {code:'TICKET_4DX',name:'Vé 4DX Dynamic',price:210000,sur:35000},
            {code:'TICKET_SWEET',name:'Vé Sweetbox Đôi',price:230000,sur:30000},
          ].map(t=>(
            <tr key={t.code}><td><code>{t.code}</code></td><td style={{fontWeight:700}}>{t.name}</td><td style={{fontWeight:800,color:'#059669'}}>{t.price.toLocaleString('vi-VN')} đ</td><td style={{color:'#d97706',fontWeight:600}}>+{t.sur.toLocaleString('vi-VN')} đ</td>
            <td>{role==='super_admin'?<button className="tms-btn tms-btn-outline" style={{padding:'4px 10px',fontSize:'0.74rem'}}><Edit size={13}/><span>Chỉnh giá</span></button>:<span style={{fontSize:'0.75rem',color:'#94a3b8'}}>Admin Tổng ban hành</span>}</td></tr>
          ))}</tbody>
        </table>
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
    <div className="app-shell">
      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-image" role="img" aria-label="Aurora Cinema" />
          <button className="close-sidebar" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>
        <div className="system-title"><b>TMS</b><span>Theater Management System</span></div>

        {/* Role indicator in sidebar */}
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ background: rc.bg, border: `1px solid ${rc.borderColor}`, borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '1.1rem' }}>{rc.emoji}</span>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: rc.color, textTransform: 'uppercase' }}>{rc.badge}</div>
              <div style={{ fontSize: '0.75rem', color: '#334155', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{displayName}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav>
          {navItems.map(item => {
            const Icon = item.icon;
            const hasChildren = !!item.children;
            const isExp = expanded === item.id;
            const isAct = active === item.id || (hasChildren && item.children!.some(c => c === active));
            return (
              <div className="nav-section" key={item.id}>
                <button className={isAct ? 'nav-active' : ''} onClick={() => {
                  if (!hasChildren) { setActive(item.id); setSidebarOpen(false); }
                  else { setExpanded(isExp ? '' : item.id); if (!isAct) setActive(item.id); }
                }}>
                  <Icon size={19} /><span>{item.name}</span>
                  {hasChildren && <ChevronDown className={`nav-chevron ${isExp ? 'rotated' : ''}`} size={15} />}
                </button>
                {hasChildren && isExp && (
                  <div className="subnav">
                    {item.children!.map(child => (
                      <button key={child} className={active === child ? 'sub-active' : ''} onClick={() => { setActive(child); setSidebarOpen(false); }}>{child}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <button className="open-sidebar" onClick={() => setSidebarOpen(true)}><Menu size={23} /></button>
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            {/* Notifications */}
            <div className="notification">
              <button onClick={() => setNoticeOpen(!noticeOpen)}>
                <Bell size={23} />
                {totalNotif > 0 && <b>{totalNotif}</b>}
              </button>
              {noticeOpen && (
                <div className="notification-pop">
                  <div><b>Thông báo hệ thống:</b></div>
                  <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#475569' }}>
                    {pendingRefunds > 0 && <div>• {pendingRefunds} yêu cầu hoàn tiền chờ duyệt</div>}
                    {cancelRequests > 0 && <div>• {cancelRequests} yêu cầu hủy giao dịch chờ duyệt</div>}
                    {totalNotif === 0 && <div>Không có thông báo mới</div>}
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

                  {/* Role description - read only, no switcher */}
                  <div style={{ margin: '8px 12px', padding: '10px 12px', background: rc.bg, border: `1px solid ${rc.borderColor}40`, borderRadius: 8 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: rc.color, textTransform: 'uppercase', marginBottom: 4 }}>Phạm vi quyền hạn</div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.5 }}>{rc.description}</div>
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
              <h1>{active === 'dashboard' ? (role === 'accounting' ? 'Tổng quan tài chính' : role === 'supervisor' ? 'Tổng quan vận hành' : role === 'cinema_admin' ? 'Tổng quan rạp' : 'Tổng quan hệ thống') : active}</h1>
              <div className="crumb">
                <span>TMS</span><b>›</b>
                <span className={`role-badge-pill ${role}`} style={{ padding: '2px 8px', fontSize: '0.72rem' }}>{rc.name}</span>
                <b>›</b><strong>{active === 'dashboard' ? 'Dashboard' : active}</strong>
              </div>
            </div>
            <div className="filters">
              <button><CalendarDays size={17} />27/09/2026</button>
              <button onClick={() => setPeriod(p => p === 'Hôm nay' ? 'Tuần này' : 'Hôm nay')}>{period}<ChevronDown size={15} /></button>
            </div>
          </div>

          {/* Role welcome banner */}
          <div className="role-welcome-banner" style={{ borderLeft: `5px solid ${rc.color}` }}>
            <div className="role-banner-left">
              <div className="role-banner-icon" style={{ background: rc.bg, color: rc.color, fontSize: '1.4rem', minWidth: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>{rc.emoji}</div>
              <div>
                <div className="role-banner-title">Vai trò: <strong>{rc.name}</strong></div>
                <div className="role-banner-desc">{rc.description}</div>
              </div>
            </div>
          </div>

          {renderContent()}

          <footer>© 2026 Aurora Cinema • Theater Management System (TMS)<span>RBAC v2.0.0</span></footer>
        </div>
      </main>

      {/* MODAL: ADD/EDIT USER (super_admin only) */}
      {showUserModal && (
        <div className="tms-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="tms-modal-box" onClick={e => e.stopPropagation()}>
            <div className="tms-modal-header">
              <div className="tms-modal-title">{userForm.id > 0 ? 'Chỉnh sửa tài khoản & phân quyền' : 'Tạo tài khoản TMS mới'}</div>
              <button className="temp-btn" onClick={() => setShowUserModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="tms-modal-body">
                <div className="tms-form-group"><label className="tms-form-label">Tên đăng nhập *</label><input className="tms-form-input" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} placeholder="vd: nguyen_a" required disabled={userForm.id > 0} /></div>
                <div className="tms-form-group"><label className="tms-form-label">Họ và tên nhân sự *</label><input className="tms-form-input" value={userForm.full_name} onChange={e => setUserForm({...userForm, full_name: e.target.value})} placeholder="vd: Nguyễn Văn A" required /></div>
                <div className="tms-form-group"><label className="tms-form-label">Số điện thoại</label><input className="tms-form-input" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} placeholder="vd: 0901234567" /></div>
                <div className="tms-form-group">
                  <label className="tms-form-label">Vai trò phân quyền *</label>
                  <select className="tms-form-select" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as TMSRole})}>
                    <option value="super_admin">👑 Admin Tổng — Toàn quyền hệ thống</option>
                    <option value="cinema_admin">🏢 Admin Rạp — Quản lý một rạp cụ thể</option>
                    <option value="supervisor">🛡️ Supervisor — Giám sát & phê duyệt nghiệp vụ</option>
                    <option value="accounting">📊 Kế Toán — Tài chính & đối soát</option>
                  </select>
                </div>
                <div className="tms-form-group"><label className="tms-form-label">{userForm.id > 0 ? 'Mật khẩu mới (bỏ trống = giữ nguyên)' : 'Mật khẩu (mặc định: 8888)'}</label><input type="password" className="tms-form-input" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} placeholder="Nhập mật khẩu" /></div>
                <div className="tms-form-group">
                  <label className="tms-form-label">Trạng thái tài khoản</label>
                  <select className="tms-form-select" value={userForm.status} onChange={e => setUserForm({...userForm, status: e.target.value})}>
                    <option value="active">Đang hoạt động (Active)</option>
                    <option value="locked">Tạm khóa (Locked)</option>
                  </select>
                </div>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowUserModal(false)}>Hủy bỏ</button>
                <button type="submit" className="tms-btn tms-btn-primary">{userForm.id > 0 ? 'Cập nhật phân quyền' : 'Tạo tài khoản'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE REFUND REQUEST (supervisor) */}
      {showRefundModal && (
        <div className="tms-modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="tms-modal-box" onClick={e => e.stopPropagation()}>
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
        <div className="tms-modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="tms-modal-box" style={{ maxWidth: 580 }} onClick={e => e.stopPropagation()}>
            <div className="tms-modal-header">
              <div className="tms-modal-title">
                {planForm.id > 0 ? 'Chỉnh sửa kế hoạch phim' : `Lập kế hoạch phim Tháng ${planForm.plan_month}/${planForm.plan_year}`}
              </div>
              <button className="temp-btn" onClick={() => setShowPlanModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSavePlan}>
              <div className="tms-modal-body">
                <div className="tms-form-group">
                  <label className="tms-form-label">Chọn phim từ kho hệ thống *</label>
                  <select
                    className="tms-form-select"
                    value={planForm.movie_id}
                    onChange={e => {
                      const mId = Number(e.target.value);
                      const m = moviesList.find(item => item.id === mId);
                      if (m) {
                        setPlanForm({
                          ...planForm,
                          movie_id: m.id,
                          movie_title: m.title,
                          format: m.format
                        });
                      }
                    }}
                    required
                  >
                    {moviesList.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.duration_minutes}p • {m.age_rating} • {m.format})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Tên kế hoạch phát hành *</label>
                  <input
                    className="tms-form-input"
                    value={planForm.plan_name}
                    onChange={e => setPlanForm({ ...planForm, plan_name: e.target.value })}
                    placeholder="vd: Kế hoạch Phim Tháng 10/2026 - Bom Tấn Cuối Năm"
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
                      {[9, 10, 11, 12].map(m => (
                        <option key={m} value={m}>Tháng {m < 10 ? `0${m}` : m}/2026</option>
                      ))}
                    </select>
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Độ ưu tiên</label>
                    <select
                      className="tms-form-select"
                      value={planForm.priority_level}
                      onChange={e => setPlanForm({ ...planForm, priority_level: e.target.value as any })}
                    >
                      <option value="blockbuster">🔥 Bom tấn (Chiếu rộng khắp, giờ vàng)</option>
                      <option value="high">⭐ Ưu tiên cao</option>
                      <option value="medium">🔷 Tiêu chuẩn</option>
                      <option value="low">⚪ Phim duy trì</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Ngày khởi chiếu dự kiến *</label>
                    <input
                      type="date"
                      className="tms-form-input"
                      value={planForm.expected_start_date}
                      onChange={e => setPlanForm({ ...planForm, expected_start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Ngày kết thúc dự kiến *</label>
                    <input
                      type="date"
                      className="tms-form-input"
                      value={planForm.expected_end_date}
                      onChange={e => setPlanForm({ ...planForm, expected_end_date: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Mục tiêu doanh thu (VNĐ)</label>
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
                    <option value="approved">Đã duyệt (Chính thức ban hành)</option>
                    <option value="in_progress">Đang chiếu tại cụm rạp</option>
                    <option value="draft">Dự thảo (Lưu tạm)</option>
                    <option value="completed">Đã kết thúc</option>
                  </select>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Phân bổ ngay cho 5 cụm rạp tại TP.HCM:</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8fafc', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {theatersList.map(t => {
                      const isChecked = planForm.selected_theaters.includes(Number(t.id));
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', cursor: 'pointer' }}>
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
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowPlanModal(false)}>Hủy bỏ</button>
                <button type="submit" className="tms-btn tms-btn-primary">
                  {planForm.id > 0 ? 'Cập nhật kế hoạch' : 'Lưu & Phân bổ chuỗi rạp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PHÂN BỔ PHIM CHO 5 RẠP TP.HCM */}
      {showAllocationModal && allocationTargetPlan && (
        <div className="tms-modal-overlay" onClick={() => setShowAllocationModal(false)}>
          <div className="tms-modal-box" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="tms-modal-header">
              <div className="tms-modal-title">Phân bổ phim cho các cụm rạp TP.HCM</div>
              <button className="temp-btn" onClick={() => setShowAllocationModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleExecuteAllocation}>
              <div className="tms-modal-body">
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 8, marginBottom: 14 }}>
                  <div style={{ fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 700 }}>PHIM ĐƯỢC CHỌN:</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{allocationTargetPlan.movie_title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                    Định dạng: {allocationTargetPlan.format} • Thời gian: {allocationTargetPlan.expected_start_date} đến {allocationTargetPlan.expected_end_date}
                  </div>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Chọn các cụm rạp tại TP.HCM tiếp nhận:</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    {theatersList.map(t => {
                      const isChecked = allocSelectedTheaters.includes(Number(t.id));
                      return (
                        <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.84rem', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => {
                              const tId = Number(t.id);
                              if (e.target.checked) setAllocSelectedTheaters([...allocSelectedTheaters, tId]);
                              else setAllocSelectedTheaters(allocSelectedTheaters.filter(x => x !== tId));
                            }}
                          />
                          <Building2 size={16} color="#2563eb" />
                          <b>{t.name}</b>
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({t.address})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="tms-form-group">
                  <label className="tms-form-label">Chỉ tiêu suất chiếu tối thiểu mỗi ngày tại rạp</label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    className="tms-form-input"
                    value={allocMinScreenings}
                    onChange={e => setAllocMinScreenings(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowAllocationModal(false)}>Hủy</button>
                <button type="submit" className="tms-btn tms-btn-primary">
                  <Send size={15} />
                  <span>Xác nhận phân bổ cho {allocSelectedTheaters.length} rạp TP.HCM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: THÊM / SỬA PHIM VÀO KHO HỆ THỐNG */}
      {showMovieModal && (
        <div className="tms-modal-overlay" onClick={() => setShowMovieModal(false)}>
          <div className="tms-modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="tms-modal-header">
              <div className="tms-modal-title">{movieForm.id > 0 ? 'Chỉnh sửa phim' : 'Thêm phim mới vào kho hệ thống'}</div>
              <button className="temp-btn" onClick={() => setShowMovieModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveMovie}>
              <div className="tms-modal-body">
                <div className="tms-form-group">
                  <label className="tms-form-label">Tên phim *</label>
                  <input
                    className="tms-form-input"
                    value={movieForm.title}
                    onChange={e => setMovieForm({ ...movieForm, title: e.target.value })}
                    placeholder="vd: Avatar 3: Lửa và Tro Tàn"
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Thời lượng (phút) *</label>
                    <input
                      type="number"
                      className="tms-form-input"
                      value={movieForm.duration_minutes}
                      onChange={e => setMovieForm({ ...movieForm, duration_minutes: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="tms-form-group">
                    <label className="tms-form-label">Độ tuổi</label>
                    <select
                      className="tms-form-select"
                      value={movieForm.age_rating}
                      onChange={e => setMovieForm({ ...movieForm, age_rating: e.target.value })}
                    >
                      <option value="P">P - Phổ biến mọi lứa tuổi</option>
                      <option value="K">K - Dưới 13 tuổi có bảo trợ</option>
                      <option value="T13">T13 - Từ 13 tuổi trở lên</option>
                      <option value="T16">T16 - Từ 16 tuổi trở lên</option>
                      <option value="T18">T18 - Từ 18 tuổi trở lên</option>
                    </select>
                  </div>
                </div>
                <div className="tms-form-group">
                  <label className="tms-form-label">Định dạng chiếu</label>
                  <input
                    className="tms-form-input"
                    value={movieForm.format}
                    onChange={e => setMovieForm({ ...movieForm, format: e.target.value })}
                    placeholder="vd: 2D Digital / 3D IMAX / Dolby Atmos"
                    required
                  />
                </div>
                <div className="tms-form-group">
                  <label className="tms-form-label">Trạng thái kho</label>
                  <select
                    className="tms-form-select"
                    value={movieForm.status}
                    onChange={e => setMovieForm({ ...movieForm, status: e.target.value })}
                  >
                    <option value="now_showing">Đang chiếu (Now Showing)</option>
                    <option value="coming_soon">Sắp chiếu (Coming Soon)</option>
                    <option value="special_showing">Suất chiếu đặc biệt (Sneak Show)</option>
                  </select>
                </div>
              </div>
              <div className="tms-modal-footer">
                <button type="button" className="tms-btn tms-btn-outline" onClick={() => setShowMovieModal(false)}>Hủy</button>
                <button type="submit" className="tms-btn tms-btn-primary">
                  {movieForm.id > 0 ? 'Cập nhật phim' : 'Lưu vào kho hệ thống'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
