import { useEffect, useMemo, useState } from 'react';
import {
  Armchair, Building2, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDollarSign, Clock3, CreditCard, Film, History, Mail, MapPin, Phone,
  Receipt, Search, SlidersHorizontal, Ticket, UserRound, X, XCircle,
} from 'lucide-react';
import './BookingHistoryWorkspace.css';

type Timeline = 'today' | 'upcoming' | 'past' | 'all';
type BookingStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
type SortKey = 'showtime_desc' | 'showtime_asc' | 'created_desc' | 'amount_desc';
type BookingRow = {
  id: number; booking_code: string; total_amount: number; status: BookingStatus; created_at: string;
  customer_id: number; customer_name: string; customer_email?: string; customer_phone?: string;
  starts_at: string; ends_at: string; movie_id: number; movie_title: string; movie_format?: string;
  age_rating?: string; screen_id: number; screen_name: string; theater_id: number; theater_name: string;
  seats?: string; ticket_count: number; issued_ticket_count: number; used_ticket_count: number;
  order_code?: string; channel?: string; payment_method?: string; redeemed_at?: string | null;
};
type Summary = {
  booking_count: number; ticket_count: number; revenue: number; average_paid_value: number;
  paid_count: number; pending_count: number; cancelled_count: number;
  issued_ticket_count: number; used_ticket_count: number;
};
type Filters = {
  movies: Array<{ id: number; title: string }>;
  screens: Array<{ id: number; name: string; theater_id: number; theater_name: string }>;
  theaters: Array<{ id: number; name: string; city?: string }>;
  channels: Array<{ value: string }>;
  payment_methods: Array<{ value: string }>;
};
type Pagination = { page: number; limit: number; total: number; pages: number };
type Detail = {
  booking: BookingRow & { customer_username: string; membership_level: string; points: number; duration_minutes: number; theater_address?: string };
  tickets: Array<{ booking_seat_id: number; price: number; seat_row: string; seat_number: string; seat_type: string; ticket_code?: string; ticket_status: string; checked_in_at?: string }>;
  order: any | null; items: any[]; concessions: any[]; redemption?: { redeemed_at: string; note?: string } | null;
};

const EMPTY_SUMMARY: Summary = { booking_count: 0, ticket_count: 0, revenue: 0, average_paid_value: 0, paid_count: 0, pending_count: 0, cancelled_count: 0, issued_ticket_count: 0, used_ticket_count: 0 };
const EMPTY_FILTERS: Filters = { movies: [], screens: [], theaters: [], channels: [], payment_methods: [] };
const money = (value: number) => `${Number(value || 0).toLocaleString('vi-VN')} đ`;
const parseDate = (value?: string) => value ? new Date(value.replace(' ', 'T')) : null;
const dateTime = (value?: string) => { const date = parseDate(value); return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : '—'; };
const time = (value?: string) => { const date = parseDate(value); return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date) : '—'; };
const day = (value?: string) => { const date = parseDate(value); return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date) : '—'; };
const statusLabel = (value?: string) => ({ PAID: 'Đã thanh toán', PENDING: 'Chờ thanh toán', CANCELLED: 'Đã hủy', EXPIRED: 'Hết hạn', VALID: 'Sẵn sàng', USED: 'Đã soát vé' }[String(value || '').toUpperCase()] || value || 'Không xác định');
const channelLabel = (value?: string) => ({ POS: 'Quầy POS', ONLINE: 'Website', WEB: 'Website', WEBSITE: 'Website', APP: 'Ứng dụng', OTA: 'Đối tác OTA' }[String(value || '').toUpperCase()] || value || 'Chưa xác định');
const paymentLabel = (value?: string) => ({ CASH: 'Tiền mặt', CARD: 'Thẻ ngân hàng', BANK: 'Chuyển khoản', BANK_TRANSFER: 'Chuyển khoản', VIETQR: 'VietQR (24/7)', QR_VNPAY: 'VNPAY-QR', VNPAY: 'VNPAY', MOMO: 'Ví MoMo' }[String(value || '').toUpperCase()] || value || 'Chưa ghi nhận');
const initials = (name: string) => name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'AU';

function BookingDetailDrawer({ apiBase, id, theaterId, onClose }: { apiBase: string; id: number; theaterId?: number; onClose: () => void }) {
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ action: 'cinema-booking-detail', id: String(id) });
    if (theaterId) params.set('theater_id', String(theaterId));
    fetch(`${apiBase}?${params}`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => { const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || 'Không thể tải chi tiết booking.'); setData(json.data); })
      .catch(reason => { if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiBase, id, theaterId]);

  useEffect(() => { const handleKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose(); window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey); }, [onClose]);
  const booking = data?.booking;
  const extras = data ? (data.items.some(item => String(item.item_type).toUpperCase() !== 'TICKET') ? data.items.filter(item => String(item.item_type).toUpperCase() !== 'TICKET') : data.concessions) : [];

  return <div className="booking-detail-backdrop" onMouseDown={event => event.currentTarget === event.target && onClose()}>
    <aside className="booking-detail-drawer" aria-label="Chi tiết booking">
      <button className="booking-detail-close" onClick={onClose} aria-label="Đóng"><X /></button>
      {loading && <div className="booking-detail-state"><i /><b>Đang đọc dữ liệu từ aurora_db…</b></div>}
      {error && <div className="booking-detail-state error"><XCircle /><b>Không thể mở booking</b><span>{error}</span><button onClick={onClose}>Đóng</button></div>}
      {data && booking && <>
        <header className="booking-detail-hero"><small>HỒ SƠ BOOKING · {booking.theater_name}</small><div><div><h2>{booking.booking_code}</h2><span className={`booking-status ${booking.status.toLowerCase()}`}>{statusLabel(booking.status)}</span></div><p>Tạo lúc {dateTime(booking.created_at)} · {channelLabel(booking.channel)}</p></div></header>
        <div className="booking-detail-scroll">
          <section className="booking-movie-card"><div className="booking-movie-mark"><Film /></div><div><small>{booking.age_rating || 'P'} · {booking.movie_format || '2D'} · {booking.duration_minutes || 0} phút</small><h3>{booking.movie_title}</h3><p><CalendarDays />{day(booking.starts_at)} <b>{time(booking.starts_at)}–{time(booking.ends_at)}</b></p><p><MapPin />{booking.screen_name} · {booking.theater_address || booking.theater_name}</p></div></section>
          <section className="booking-detail-grid">
            <article><header><UserRound />Khách hàng</header><div className="booking-customer"><span>{initials(booking.customer_name)}</span><div><b>{booking.customer_name}</b><small>@{booking.customer_username} · {booking.membership_level || 'Thành viên'}</small></div></div><dl><div><dt><Phone />Số điện thoại</dt><dd>{booking.customer_phone || '—'}</dd></div><div><dt><Mail />Email</dt><dd>{booking.customer_email || '—'}</dd></div></dl></article>
            <article><header><Receipt />Thanh toán</header>{data.order ? <dl><div><dt>Mã hóa đơn</dt><dd>{data.order.order_code}</dd></div><div><dt>Phương thức</dt><dd>{paymentLabel(data.order.payment_method)}</dd></div><div><dt>Tạm tính</dt><dd>{money(data.order.subtotal)}</dd></div><div><dt>Giảm giá</dt><dd>{money(data.order.discount_amount)}</dd></div><div className="total"><dt>Tổng thanh toán</dt><dd>{money(data.order.total_amount)}</dd></div></dl> : <div className="booking-no-order">Booking chưa có hóa đơn liên kết.</div>}</article>
          </section>
          <section className="booking-ticket-section"><header><div><Ticket /><span><b>Vé và ghế</b><small>{data.tickets.length} vé trong booking</small></span></div>{data.redemption && <span className="booking-redeemed"><CheckCircle2 />Đã đổi vé {dateTime(data.redemption.redeemed_at)}</span>}</header><div className="booking-ticket-grid">{data.tickets.map(ticket => <article key={ticket.booking_seat_id}><div className="ticket-seat"><Armchair /><span>GHẾ</span><b>{ticket.seat_row}{ticket.seat_number}</b></div><div><span className={`ticket-state ${String(ticket.ticket_status).toLowerCase()}`}>{statusLabel(ticket.ticket_status)}</span><small>{ticket.seat_type || 'STANDARD'}</small><code>{ticket.ticket_code || 'Chưa phát hành'}</code><b>{money(ticket.price)}</b>{ticket.checked_in_at && <em>Soát lúc {dateTime(ticket.checked_in_at)}</em>}</div></article>)}</div></section>
          {extras.length > 0 && <section className="booking-extras"><header><Receipt />Bắp nước và hàng hóa</header>{extras.map((item, index) => <div key={`${item.item_code}-${index}`}><span>{item.quantity}× {item.item_name}</span><b>{money(item.quantity * item.unit_price)}</b></div>)}</section>}
        </div>
        <footer className="booking-detail-foot"><span>Nguồn dữ liệu: <b>aurora_db</b></span><button onClick={onClose}>Đóng chi tiết</button></footer>
      </>}
    </aside>
  </div>;
}

export default function BookingHistoryWorkspace({ apiBase, role }: { apiBase: string; role?: string }) {
  const [timeline, setTimeline] = useState<Timeline>('all');
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [summary, setSummary] = useState<Summary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState<SortKey>('showtime_desc');
  const [theaterId, setTheaterId] = useState('all');
  const [query, setQuery] = useState('');
  const [queryApplied, setQueryApplied] = useState('');
  const [status, setStatus] = useState('all');
  const [channel, setChannel] = useState('all');
  const [paymentMethod, setPaymentMethod] = useState('all');
  const [movieId, setMovieId] = useState('all');
  const [screenId, setScreenId] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState<{ id: number; theaterId: number } | null>(null);

  useEffect(() => { const timer = window.setTimeout(() => { setPage(1); setQueryApplied(query.trim()); }, 350); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ action: 'cinema-booking-history', timeline, limit: String(limit), page: String(page), sort });
    if (theaterId !== 'all') params.set('theater_id', theaterId);
    if (queryApplied) params.set('q', queryApplied);
    if (status !== 'all') params.set('status', status);
    if (channel !== 'all') params.set('channel', channel);
    if (paymentMethod !== 'all') params.set('payment_method', paymentMethod);
    if (movieId !== 'all') params.set('movie_id', movieId);
    if (screenId !== 'all') params.set('screen_id', screenId);
    if (timeline === 'all' && from) params.set('from', from);
    if (timeline === 'all' && to) params.set('to', to);
    setLoading(true); setError('');
    fetch(`${apiBase}?${params}`, { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => { const json = await response.json(); if (!response.ok || !json.success) throw new Error(json.message || 'Không thể tải lịch sử đặt vé.'); const data = json.data || {}; setRows(data.bookings || []); setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) }); setPagination(data.pagination || { page: 1, limit, total: 0, pages: 1 }); setFilters({ ...EMPTY_FILTERS, ...(data.filters || {}) }); })
      .catch(reason => { if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message || 'Không thể tải dữ liệu.'); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [apiBase, timeline, theaterId, queryApplied, status, channel, paymentMethod, movieId, screenId, from, to, page, limit, sort, refresh]);

  const title = useMemo(() => ({ today: 'Lịch chiếu hôm nay', upcoming: 'Booking cho lịch chiếu sắp tới', past: 'Lịch sử suất chiếu đã qua', all: 'Toàn bộ lịch sử đặt vé' }[timeline]), [timeline]);
  const activeFilterCount = [queryApplied, status !== 'all', channel !== 'all', paymentMethod !== 'all', movieId !== 'all', screenId !== 'all', from, to].filter(Boolean).length;
  const ticketUseRate = summary.issued_ticket_count > 0 ? Math.round(summary.used_ticket_count * 100 / summary.issued_ticket_count) : 0;
  const paidRate = summary.booking_count > 0 ? Math.round(summary.paid_count * 100 / summary.booking_count) : 0;
  const change = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => { setPage(1); setter(event.target.value); };
  const chooseTimeline = (value: Timeline) => { setPage(1); setTimeline(value); setFrom(''); setTo(''); };
  const chooseTheater = (value: string) => { setPage(1); setTheaterId(value); setMovieId('all'); setScreenId('all'); setSelected(null); };
  const resetFilters = () => { setPage(1); setQuery(''); setQueryApplied(''); setStatus('all'); setChannel('all'); setPaymentMethod('all'); setMovieId('all'); setScreenId('all'); setFrom(''); setTo(''); };

  return <div className="booking-history">
    <section className="booking-overview">
      <article><span className="blue"><Receipt /></span><div><small>TỔNG BOOKING</small><b>{summary.booking_count.toLocaleString('vi-VN')}</b><em>{paidRate}% đã thanh toán</em></div></article>
      <article><span className="violet"><Ticket /></span><div><small>VÉ / GHẾ</small><b>{summary.ticket_count.toLocaleString('vi-VN')}</b><em>{summary.issued_ticket_count} vé đã phát hành</em></div></article>
      <article><span className="green"><CircleDollarSign /></span><div><small>DOANH THU ĐÃ THU</small><b>{money(summary.revenue)}</b><em>TB {money(summary.average_paid_value)} / booking</em></div></article>
      <article><span className="amber"><Clock3 /></span><div><small>CẦN THEO DÕI</small><b>{summary.pending_count}</b><em>{summary.cancelled_count} booking hủy / hết hạn</em></div></article>
      <article className="booking-kpi-wide"><span className="teal"><CheckCircle2 /></span><div><small>TỶ LỆ SOÁT VÉ</small><b>{ticketUseRate}%</b><em>{summary.used_ticket_count}/{summary.issued_ticket_count} vé đã sử dụng</em></div><div className="booking-progress"><i style={{ width: `${ticketUseRate}%` }} /></div></article>
    </section>
    <section className="booking-control-panel"><div className="booking-period-tabs">{([['today', CalendarDays, 'Hôm nay'], ['upcoming', Clock3, 'Sắp tới'], ['past', History, 'Đã qua'], ['all', Ticket, 'Tất cả']] as const).map(([value, Icon, label]) => <button key={value} className={timeline === value ? 'active' : ''} onClick={() => chooseTimeline(value)}><Icon />{label}</button>)}</div>{role === 'super_admin' && <label className="booking-scope-select"><Building2 /><span><small>PHẠM VI QUẢN LÝ</small><select value={theaterId} onChange={event => chooseTheater(event.target.value)}><option value="all">Toàn bộ hệ thống</option>{filters.theaters.map(theater => <option key={theater.id} value={theater.id}>{theater.name}{theater.city ? ` · ${theater.city}` : ''}</option>)}</select></span></label>}</section>
    <section className="booking-ledger">
      <header className="booking-ledger-title"><div><span>DANH SÁCH BOOKING</span><h2>{title}</h2><p>{pagination.total.toLocaleString('vi-VN')} kết quả trong phạm vi đang chọn</p></div><div><SlidersHorizontal /><span><b>Bộ lọc nghiệp vụ</b><small>{activeFilterCount ? `${activeFilterCount} điều kiện đang áp dụng` : 'Chưa áp dụng điều kiện bổ sung'}</small></span>{activeFilterCount > 0 && <button onClick={resetFilters}>Xóa tất cả</button>}</div></header>
      <div className="booking-filter-grid">
        <label className="booking-search"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm mã booking, hóa đơn, khách hàng, SĐT hoặc phim…" />{query && <button onClick={() => setQuery('')} aria-label="Xóa tìm kiếm"><X /></button>}</label>
        <label><span>Trạng thái</span><select value={status} onChange={change(setStatus)}><option value="all">Tất cả trạng thái</option><option value="PAID">Đã thanh toán</option><option value="PENDING">Chờ thanh toán</option><option value="CANCELLED">Đã hủy</option><option value="EXPIRED">Hết hạn</option></select></label>
        <label><span>Kênh bán</span><select value={channel} onChange={change(setChannel)}><option value="all">Tất cả kênh bán</option>{filters.channels.map(item => <option key={item.value} value={item.value}>{channelLabel(item.value)}</option>)}</select></label>
        <label><span>Thanh toán</span><select value={paymentMethod} onChange={change(setPaymentMethod)}><option value="all">Mọi phương thức</option>{filters.payment_methods.map(item => <option key={item.value} value={item.value}>{paymentLabel(item.value)}</option>)}</select></label>
        <label><span>Phim</span><select value={movieId} onChange={change(setMovieId)}><option value="all">Tất cả phim</option>{filters.movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
        <label><span>Phòng chiếu</span><select value={screenId} onChange={change(setScreenId)}><option value="all">Tất cả phòng</option>{filters.screens.map(screen => <option key={screen.id} value={screen.id}>{theaterId === 'all' ? `${screen.theater_name} · ` : ''}{screen.name}</option>)}</select></label>
        {timeline === 'all' && <><label><span>Từ ngày chiếu</span><input type="date" value={from} max={to || undefined} onChange={change(setFrom)} /></label><label><span>Đến ngày chiếu</span><input type="date" value={to} min={from || undefined} onChange={change(setTo)} /></label></>}
        <label><span>Sắp xếp</span><select value={sort} onChange={event => { setPage(1); setSort(event.target.value as SortKey); }}><option value="showtime_desc">Suất chiếu mới nhất</option><option value="showtime_asc">Suất chiếu gần nhất</option><option value="created_desc">Mới đặt gần đây</option><option value="amount_desc">Giá trị cao nhất</option></select></label>
      </div>
      {error ? <div className="booking-empty error"><XCircle /><b>Không thể tải lịch sử đặt vé</b><span>{error}</span><button onClick={() => setRefresh(value => value + 1)}>Thử tải lại</button></div> : loading ? <div className="booking-skeleton">{[1, 2, 3, 4, 5].map(item => <i key={item} />)}</div> : rows.length ? <>
        <div className="booking-table-wrap"><table><thead><tr><th>Booking & khách hàng</th><th>Phim & suất chiếu</th><th>Rạp / phòng / ghế</th><th>Kênh & thanh toán</th><th>Trạng thái</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id} onClick={() => setSelected({ id: row.id, theaterId: row.theater_id })}>
          <td><div className="booking-code"><span><Receipt /></span><div><b>{row.booking_code}</b><small>Đặt {dateTime(row.created_at)}</small></div></div><div className="booking-person"><b>{row.customer_name}</b><small>{row.customer_phone || row.customer_email || 'Chưa có liên hệ'}</small></div></td>
          <td><b className="booking-movie">{row.movie_title}</b><small>{row.age_rating || 'P'} · {row.movie_format || '2D'}</small><div className="booking-showtime"><CalendarDays />{day(row.starts_at)} <strong>{time(row.starts_at)}</strong></div></td>
          <td><b>{row.screen_name}</b><small className="booking-theater-name"><MapPin />{row.theater_name}</small><div className="booking-seats"><Armchair />{row.seats || '—'} <span>· {row.ticket_count} vé</span></div></td>
          <td><b className="booking-amount">{money(row.total_amount)}</b><small><CreditCard />{paymentLabel(row.payment_method)} · {channelLabel(row.channel)}</small>{row.order_code && <code>{row.order_code}</code>}</td>
          <td><span className={`booking-status ${row.status.toLowerCase()}`}>{statusLabel(row.status)}</span><small>{row.used_ticket_count > 0 ? `${row.used_ticket_count}/${row.ticket_count} vé đã soát` : row.issued_ticket_count > 0 ? `${row.issued_ticket_count} vé sẵn sàng` : 'Chưa phát hành vé'}</small></td>
          <td><button aria-label={`Xem ${row.booking_code}`}><ChevronRight /></button></td>
        </tr>)}</tbody></table></div>
        <footer className="booking-pagination"><div><span>Hiển thị</span><select value={limit} onChange={event => { setPage(1); setLimit(Number(event.target.value)); }}><option value={20}>20 dòng</option><option value={50}>50 dòng</option><option value={100}>100 dòng</option></select><span>{(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total}</span></div><nav><button disabled={pagination.page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft />Trước</button><b>Trang {pagination.page} / {pagination.pages}</b><button disabled={pagination.page >= pagination.pages} onClick={() => setPage(value => Math.min(pagination.pages, value + 1))}>Sau<ChevronRight /></button></nav></footer>
      </> : <div className="booking-empty"><Ticket /><b>Không tìm thấy booking phù hợp</b><span>Hãy điều chỉnh khoảng thời gian hoặc xóa bớt điều kiện lọc.</span>{activeFilterCount > 0 && <button onClick={resetFilters}>Xóa bộ lọc</button>}</div>}
    </section>
    {selected && <BookingDetailDrawer apiBase={apiBase} id={selected.id} theaterId={selected.theaterId} onClose={() => setSelected(null)} />}
  </div>;
}
