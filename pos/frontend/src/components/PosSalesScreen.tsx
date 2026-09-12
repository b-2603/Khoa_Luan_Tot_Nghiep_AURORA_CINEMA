import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronDown, CircleDollarSign, Coffee,
  CreditCard, LoaderCircle, Printer, RotateCcw, Search, Ticket, UserCheck,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/pos/backend/public/api.php';

type Showtime = {
  id: number;
  movie_title: string;
  age_rating: string;
  format: string;
  screen_name: string;
  theater_name: string;
  starts_at: string;
  ticket_price: number;
};

type Seat = { id: number; row: string; number: number; type: string; available: boolean };
type Combo = { code: string; name: string; price: number };
type Receipt = { code: string; total: number; amount_received: number; change: number; payment_method: string };

const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;
const time = (value: string) => new Date(value.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

export default function PosSalesScreen({
  cinemaName = 'AURORA CINEMA',
  staffName = 'Nguyễn Trần Thái Bảo',
  counter = 'AURORA BOX 02',
  onBackToDashboard,
}: {
  cinemaName?: string;
  staffName?: string;
  counter?: string;
  onBackToDashboard: () => void;
}) {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [showtimes, setShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(null);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  async function loadCatalog(date = '') {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}?action=sales_catalog${date ? `&date=${date}` : ''}`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải dữ liệu bán hàng.');
      const data = result.data;
      setDates(data.dates || []); setSelectedDate(data.selected_date || date || ''); setShowtimes(data.showtimes || []); setCombos(data.combos || []);
      setSelectedShowtime(current => current && (data.showtimes || []).some((item: Showtime) => item.id === current.id) ? current : null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Không thể tải dữ liệu bán hàng.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadCatalog(); }, []);

  useEffect(() => {
    if (!selectedShowtime) { setSeats([]); setSelectedSeats([]); return; }
    setLoadingSeats(true); setSelectedSeats([]); setError('');
    fetch(`${API_URL}?action=sales_seats&showtime_id=${selectedShowtime.id}`, { credentials: 'include' })
      .then(async response => { const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message); return result.data.seats as Seat[]; })
      .then(setSeats)
      .catch(requestError => setError(requestError instanceof Error ? requestError.message : 'Không thể tải sơ đồ ghế.'))
      .finally(() => setLoadingSeats(false));
  }, [selectedShowtime]);

  const visibleShowtimes = useMemo(() => showtimes.filter(item => item.movie_title.toLowerCase().includes(search.toLowerCase())), [search, showtimes]);
  const selectedSeatObjects = seats.filter(seat => selectedSeats.includes(seat.id));
  const ticketTotal = selectedSeatObjects.reduce((sum, seat) => sum + (selectedShowtime?.ticket_price || 0) + (seat.type === 'VIP' ? 20000 : seat.type === 'COUPLE' ? (selectedShowtime?.ticket_price || 0) : 0), 0);
  const comboTotal = combos.reduce((sum, combo) => sum + combo.price * (comboQuantities[combo.code] || 0), 0);
  const total = ticketTotal + comboTotal;
  const received = paymentMethod === 'CASH' ? Number(amountReceived || 0) : total;
  const change = Math.max(0, received - total);

  function toggleSeat(seat: Seat) {
    if (!seat.available) return;
    setSelectedSeats(current => current.includes(seat.id) ? current.filter(id => id !== seat.id) : current.length >= 12 ? current : [...current, seat.id]);
  }

  function clearOrder() { setSelectedSeats([]); setComboQuantities({}); setAmountReceived(''); setReceipt(null); setError(''); }

  async function submitOrder() {
    if (!selectedShowtime || selectedSeats.length === 0) { setError('Vui lòng chọn suất chiếu và ít nhất một ghế.'); return; }
    if (paymentMethod === 'CASH' && received < total) { setError('Số tiền khách đưa chưa đủ.'); return; }
    setSubmitting(true); setError('');
    try {
      const response = await fetch(`${API_URL}?action=sales_order`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showtime_id: selectedShowtime.id, seat_ids: selectedSeats, combos: Object.entries(comboQuantities).filter(([, quantity]) => quantity > 0).map(([code, quantity]) => ({ code, quantity })), payment_method: paymentMethod, amount_received: received }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn tất giao dịch.');
      setReceipt(result.data); setSelectedSeats([]); setComboQuantities({}); setAmountReceived('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Không thể hoàn tất giao dịch.'); }
    finally { setSubmitting(false); }
  }

  return <div className="pos-sales-layout">
    <header className="pos-sales-header pos-sales-header-sales">
      <div className="pos-sales-header-left"><button type="button" className="pos-btn pos-btn-secondary btn-sm" onClick={onBackToDashboard}><ArrowLeft size={16} /> Ca làm việc</button><div><strong className="pos-sales-branch">{cinemaName} / {counter}</strong><span className="pos-sales-caption">Bán vé & dịch vụ tại quầy</span></div></div>
      <div className="pos-sales-header-right"><span className="pos-sales-user"><UserCheck size={16} /> {staffName}</span><button type="button" className="pos-icon-btn" title="Xóa giao dịch" onClick={clearOrder}><RotateCcw size={17} /></button></div>
    </header>

    <main className="pos-sales-workspace">
      <section className="pos-sales-catalog">
        <div className="pos-sales-section-head"><div><span className="pos-eyebrow">BƯỚC 01</span><h1>Chọn suất chiếu</h1></div><label className="pos-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên phim..." /></label></div>
        <div className="pos-date-tabs">{dates.map(date => <button type="button" className={selectedDate === date ? 'active' : ''} key={date} onClick={() => { setSelectedDate(date); void loadCatalog(date); }}>{dateLabel(date)}</button>)}</div>
        {loading ? <div className="pos-empty-state"><LoaderCircle className="spin-icon" /> Đang tải suất chiếu...</div> : visibleShowtimes.length === 0 ? <div className="pos-empty-state">Không có suất chiếu phù hợp.</div> : <div className="pos-showtime-list">{visibleShowtimes.map(showtime => <button type="button" className={`pos-showtime-card ${selectedShowtime?.id === showtime.id ? 'active' : ''}`} key={showtime.id} onClick={() => setSelectedShowtime(showtime)}><span className="pos-showtime-time">{time(showtime.starts_at)}</span><span className="pos-showtime-info"><strong>{showtime.movie_title}</strong><small>{showtime.age_rating} · {showtime.format} · {showtime.screen_name}</small></span><span className="pos-showtime-price">{money(showtime.ticket_price)}</span><ChevronDown size={16} /></button>)}</div>}

        <div className="pos-sales-section-head pos-seat-head"><div><span className="pos-eyebrow">BƯỚC 02</span><h2>{selectedShowtime ? `Sơ đồ ghế / ${selectedShowtime.movie_title}` : 'Chọn suất để xem sơ đồ ghế'}</h2></div>{selectedShowtime && <span className="pos-screen-label">MÀN HÌNH</span>}</div>
        {loadingSeats ? <div className="pos-empty-state"><LoaderCircle className="spin-icon" /> Đang tải sơ đồ ghế...</div> : selectedShowtime && <div className="pos-seat-map"><div className="pos-screen-line">MÀN HÌNH</div><div className="pos-seat-grid">{seats.map(seat => <button type="button" key={seat.id} disabled={!seat.available} className={`pos-seat pos-seat-${seat.type.toLowerCase()} ${selectedSeats.includes(seat.id) ? 'selected' : ''}`} onClick={() => toggleSeat(seat)} title={`${seat.row}${seat.number} - ${seat.type}`}>{seat.row}{seat.number}</button>)}</div><div className="pos-seat-legend"><span><i className="available" /> Trống</span><span><i className="selected" /> Đang chọn</span><span><i className="occupied" /> Đã bán</span></div></div>}
      </section>

      <aside className="pos-sales-order"><div className="pos-order-title"><div><span className="pos-eyebrow">ĐƠN HÀNG HIỆN TẠI</span><h2>Thanh toán</h2></div><span className="pos-order-counter">{selectedSeats.length} vé</span></div><div className="pos-order-summary">{selectedShowtime && <div className="pos-order-movie"><Ticket size={18} /><div><strong>{selectedShowtime.movie_title}</strong><small>{time(selectedShowtime.starts_at)} · {selectedShowtime.screen_name}</small></div></div>}{selectedSeatObjects.map(seat => <div className="pos-order-line" key={seat.id}><span>Ghế {seat.row}{seat.number} <small>{seat.type}</small></span><strong>{money((selectedShowtime?.ticket_price || 0) + (seat.type === 'VIP' ? 20000 : seat.type === 'COUPLE' ? (selectedShowtime?.ticket_price || 0) : 0))}</strong></div>)}{selectedSeats.length === 0 && <p className="pos-order-placeholder">Chọn ghế để bắt đầu đơn hàng</p>}</div>
        <div className="pos-combo-box"><div className="pos-order-subtitle"><span><Coffee size={16} /> Combo bắp nước</span></div>{combos.map(combo => <div className="pos-combo-line" key={combo.code}><span>{combo.name}<small>{money(combo.price)}</small></span><div><button type="button" onClick={() => setComboQuantities(current => ({ ...current, [combo.code]: Math.max(0, (current[combo.code] || 0) - 1) }))}>-</button><b>{comboQuantities[combo.code] || 0}</b><button type="button" onClick={() => setComboQuantities(current => ({ ...current, [combo.code]: Math.min(10, (current[combo.code] || 0) + 1) }))}>+</button></div></div>)}</div>
        <div className="pos-total-box"><div><span>Tiền vé</span><strong>{money(ticketTotal)}</strong></div><div><span>Combo</span><strong>{money(comboTotal)}</strong></div><div className="pos-grand-total"><span>TỔNG CỘNG</span><strong>{money(total)}</strong></div></div>
        <div className="pos-payment-box"><div className="pos-order-subtitle"><span><CircleDollarSign size={16} /> Phương thức thanh toán</span></div><div className="pos-payment-methods">{([['CASH', 'Tiền mặt', CircleDollarSign], ['CARD', 'Thẻ', CreditCard], ['TRANSFER', 'Chuyển khoản', CreditCard]] as const).map(([method, label, Icon]) => <button type="button" className={paymentMethod === method ? 'active' : ''} key={method} onClick={() => setPaymentMethod(method)}><Icon size={17} />{label}</button>)}</div>{paymentMethod === 'CASH' && <label className="pos-cash-input">Tiền khách đưa<input type="number" min="0" value={amountReceived} onChange={event => setAmountReceived(event.target.value)} placeholder="Nhập số tiền" /></label>}{paymentMethod === 'CASH' && <div className="pos-change-row"><span>Tiền thừa</span><strong className={change >= 0 && received >= total ? 'ready' : ''}>{money(change)}</strong></div>}</div>
        {error && <div className="pos-sales-error">{error}</div>}{receipt ? <div className="pos-receipt"><div className="pos-receipt-success"><Check size={20} /> Thanh toán thành công</div><strong>{receipt.code}</strong><span>Tiền thừa: {money(receipt.change)}</span><button type="button" className="pos-btn pos-btn-primary" onClick={() => setReceipt(null)}><Printer size={16} /> Giao dịch mới</button></div> : <button type="button" className="pos-pay-button" disabled={submitting || !selectedShowtime || selectedSeats.length === 0 || (paymentMethod === 'CASH' && received < total)} onClick={() => void submitOrder}>{submitting ? <LoaderCircle className="spin-icon" /> : <Check size={18} />} {submitting ? 'ĐANG XỬ LÝ...' : 'THANH TOÁN & IN VÉ'}</button>}
      </aside>
    </main>
  </div>;
}
