import { useMemo, useState } from 'react';
import { CalendarClock, CalendarDays, Check, CheckCircle2, Clock3, FileText, Film, History, Search, ShieldCheck } from 'lucide-react';
import './CinemaMoviePlanWorkspace.css';

export type CinemaPlanView = 'overview' | 'confirm' | 'deploy' | 'history';

export interface CinemaMovieAllocation {
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
  status: 'pending' | 'confirmed' | 'deploying' | 'completed' | 'expired' | 'cancelled';
  lifecycle_status?: 'active' | 'upcoming' | 'history';
  remaining_days?: number;
  schedule_count?: number;
  server_date?: string;
}

interface Props {
  view: CinemaPlanView;
  theaterName: string;
  allocations: CinemaMovieAllocation[];
  onChangeView: (view: CinemaPlanView) => void;
  onViewDetail: (allocationId: number) => void;
  onConfirm: (allocationId: number) => void;
  onSchedule: (allocation: CinemaMovieAllocation) => void;
}

const formatDate = (value: string) => {
  const [year, month, day] = String(value || '').split('-');
  return year && month && day ? `${day}/${month}/${year}` : value || '—';
};

const isHistory = (item: CinemaMovieAllocation) => item.lifecycle_status === 'history'
  || ['expired', 'completed', 'cancelled'].includes(item.status);

export default function CinemaMoviePlanWorkspace({ view, theaterName, allocations, onChangeView, onViewDetail, onConfirm, onSchedule }: Props) {
  const [query, setQuery] = useState('');
  const activeItems = useMemo(() => allocations.filter(item => !isHistory(item)), [allocations]);
  const historyItems = useMemo(() => allocations.filter(isHistory), [allocations]);
  const pendingItems = activeItems.filter(item => item.status === 'pending');
  const deployItems = activeItems.filter(item => item.status === 'confirmed' || item.status === 'deploying');
  const upcomingItems = activeItems.filter(item => item.lifecycle_status === 'upcoming');
  const source = view === 'history' ? historyItems : view === 'confirm' ? pendingItems : view === 'deploy' ? deployItems : activeItems;
  const visibleItems = source.filter(item => `${item.movie_title} ${item.preferred_screen_types}`.toLocaleLowerCase('vi').includes(query.trim().toLocaleLowerCase('vi')));

  const copy = {
    overview: ['Kế hoạch đang hiệu lực', 'Theo dõi toàn bộ phim đang được phân bổ cho rạp. Việc lên lịch được thực hiện tại mục Triển khai.'],
    confirm: ['Kế hoạch chờ xác nhận', 'Kiểm tra thời gian, định dạng và chỉ tiêu trước khi tiếp nhận kế hoạch.'],
    deploy: ['Triển khai & lên lịch chiếu', 'Chỉ các kế hoạch còn hiệu lực và đã xác nhận mới có thể tạo suất chiếu.'],
    history: ['Lịch sử kế hoạch', 'Kho lưu trữ các kế hoạch đã hết hạn hoặc kết thúc, lấy trực tiếp từ aurora_db.'],
  }[view];

  const tabs: Array<{ id: CinemaPlanView; label: string; count: number; icon: typeof Film }> = [
    { id: 'overview', label: 'Đang hiệu lực', count: activeItems.length, icon: Film },
    { id: 'confirm', label: 'Chờ xác nhận', count: pendingItems.length, icon: CheckCircle2 },
    { id: 'deploy', label: 'Triển khai', count: deployItems.length, icon: CalendarDays },
    { id: 'history', label: 'Lịch sử kế hoạch', count: historyItems.length, icon: History },
  ];

  return <section className="cinema-plan-workspace">
    <header className="cinema-plan-hero">
      <div className="cinema-plan-hero-copy">
        <span className="cinema-plan-eyebrow"><ShieldCheck size={15}/> QUẢN TRỊ KẾ HOẠCH PHIM</span>
        <h2>{copy[0]}</h2>
        <p>{copy[1]}</p>
        <span className="cinema-plan-scope">Phạm vi dữ liệu: <b>{theaterName}</b></span>
      </div>
      <div className="cinema-plan-metrics">
        <span><b>{activeItems.length}</b><small>Còn hiệu lực</small></span>
        <span><b>{upcomingItems.length}</b><small>Sắp triển khai</small></span>
        <span><b>{pendingItems.length}</b><small>Chờ xác nhận</small></span>
        <span className="history"><b>{historyItems.length}</b><small>Đã lưu lịch sử</small></span>
      </div>
    </header>

    <nav className="cinema-plan-tabs" aria-label="Vòng đời kế hoạch phim">
      {tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} className={view === tab.id ? 'active' : ''} onClick={() => onChangeView(tab.id)}>
        <Icon size={17}/><span>{tab.label}</span><em>{tab.count}</em>
      </button>; })}
    </nav>

    <div className="cinema-plan-panel">
      <div className="cinema-plan-toolbar">
        <div><b>{copy[0]}</b><small>{source.length} kế hoạch trong phạm vi hiện tại</small></div>
        <label><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm tên phim, định dạng..." /></label>
      </div>
      <div className="cinema-plan-table-wrap">
        <table className="cinema-plan-table">
          <thead><tr><th>Phim & định dạng</th><th>Thời gian áp dụng</th><th>Chỉ tiêu</th><th>Trạng thái</th>{view === 'history' && <th>Kết quả</th>}<th>Thao tác</th></tr></thead>
          <tbody>
            {visibleItems.map(item => {
              const historical = isHistory(item);
              const status = historical ? 'Đã hết hạn' : item.lifecycle_status === 'upcoming' ? 'Sắp hiệu lực' : item.status === 'pending' ? 'Chờ xác nhận' : item.status === 'deploying' ? 'Đang triển khai' : 'Đã xác nhận';
              return <tr key={item.id}>
                <td><div className="cinema-plan-movie"><span><Film size={19}/></span><div><b>{item.movie_title}</b><small>{item.preferred_screen_types || 'Định dạng tiêu chuẩn'}</small></div></div></td>
                <td><div className="cinema-plan-period"><CalendarClock size={16}/><div><b>{formatDate(item.allocated_start_date)} – {formatDate(item.allocated_end_date)}</b><small>{historical ? `Kết thúc ${Math.abs(Number(item.remaining_days || 0))} ngày trước` : Number(item.remaining_days) >= 0 ? `Còn ${item.remaining_days} ngày` : 'Theo thời hạn phân bổ'}</small></div></div></td>
                <td><b className="cinema-plan-target">{item.min_screenings_per_day}</b> <small>suất/ngày</small></td>
                <td><span className={`cinema-plan-status ${historical ? 'expired' : item.lifecycle_status === 'upcoming' ? 'upcoming' : item.status}`}>{historical ? <History size={13}/> : item.status === 'pending' ? <Clock3 size={13}/> : <CheckCircle2 size={13}/>} {status}</span></td>
                {view === 'history' && <td><b>{Number(item.schedule_count || 0)}</b><small> suất đã lập</small></td>}
                <td><div className="cinema-plan-actions">
                  <button className="secondary" onClick={() => onViewDetail(item.id)}><FileText size={15}/> Chi tiết</button>
                  {view === 'confirm' && <button className="success" onClick={() => onConfirm(item.id)}><Check size={15}/> Xác nhận</button>}
                  {view === 'deploy' && <button className="primary" onClick={() => onSchedule(item)}><CalendarDays size={15}/> Lên lịch</button>}
                </div></td>
              </tr>;
            })}
            {!visibleItems.length && <tr><td colSpan={view === 'history' ? 6 : 5}><div className="cinema-plan-empty"><span><Film size={28}/></span><b>{query ? 'Không tìm thấy kế hoạch phù hợp' : view === 'history' ? 'Chưa có kế hoạch trong lịch sử' : 'Không có kế hoạch ở giai đoạn này'}</b><small>{view === 'history' ? 'Kế hoạch hết hạn sẽ tự động được chuyển vào đây, không bị xóa khỏi aurora_db.' : 'Dữ liệu sẽ cập nhật khi Admin Tổng phân bổ hoặc khi rạp xử lý kế hoạch.'}</small></div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </section>;
}
