import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Check, ChevronDown, CircleDollarSign, Coffee,
  CreditCard, LoaderCircle, Package, Printer, QrCode, RotateCcw, Search, Ticket, UserCheck,
} from 'lucide-react';
import type { PosUser } from '../App';

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
type Combo = { code:string; name:string; price:number; category?:string; stock_quantity?:number };
type Receipt = { code: string; total: number; amount_received: number; change: number; payment_method: string };

const money = (value: number) => `${Math.round(value).toLocaleString('vi-VN')} đ`;
const time = (value: string) => new Date(value.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const dateLabel = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });

export default function PosSalesScreen({
  user,
  cinemaName = 'AURORA CINEMA',
  staffName = 'Nguyễn Trần Thái Bảo',
  counter = 'AURORA BOX 02',
  onBackToDashboard,
  onSessionExpired,
}: {
  user?: PosUser;
  cinemaName?: string;
  staffName?: string;
  counter?: string;
  onBackToDashboard: () => void;
  onSessionExpired: (message?: string) => void;
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
  const [workspace,setWorkspace]=useState<'tickets'|'products'|'redeem'>(user?.capabilities?.sell_tickets?'tickets':user?.capabilities?.redeem_online_booking?'redeem':'products');
  const [bookingCode,setBookingCode]=useState('');
  const [booking,setBooking]=useState<Record<string,unknown>|null>(null);

  async function readApiResponse(response: Response) {
    const result = await response.json();
    if (response.status === 401 || result.code === 'SHIFT_AUTHORIZATION_REQUIRED') onSessionExpired(result.message);
    return result;
  }

  async function loadCatalog(date = '') {
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API_URL}?action=sales_catalog${date ? `&date=${date}` : ''}`, { credentials: 'include' });
      const result = await readApiResponse(response);
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
      .then(async response => { const result = await readApiResponse(response); if (!response.ok || !result.success) throw new Error(result.message); return result.data.seats as Seat[]; })
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
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || 'Không thể hoàn tất giao dịch.');
      setReceipt(result.data); setSelectedSeats([]); setComboQuantities({}); setAmountReceived('');
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Không thể hoàn tất giao dịch.'); }
    finally { setSubmitting(false); }
  }

  async function submitProductOrder(){
    if(total<=0){setError('Vui lòng chọn ít nhất một sản phẩm.');return;}if(paymentMethod==='CASH'&&received<total){setError('Số tiền khách đưa chưa đủ.');return;}setSubmitting(true);setError('');
    try{const response=await fetch(`${API_URL}?action=product_order`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({items:Object.entries(comboQuantities).filter(([,q])=>q>0).map(([code,quantity])=>({code,quantity})),payment_method:paymentMethod,amount_received:received})});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setReceipt(result.data);setComboQuantities({});setAmountReceived('');await loadCatalog(selectedDate);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không thể hoàn tất đơn hàng.');}finally{setSubmitting(false);}
  }

  async function lookupBooking(){setSubmitting(true);setError('');setBooking(null);try{const response=await fetch(`${API_URL}?action=online_booking_lookup&code=${encodeURIComponent(bookingCode.trim())}`,{credentials:'include'});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setBooking(result.data);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không tìm thấy vé.');}finally{setSubmitting(false);}}
  async function redeemBooking(){setSubmitting(true);setError('');try{const response=await fetch(`${API_URL}?action=online_booking_redeem`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:bookingCode.trim()})});const result=await readApiResponse(response);if(!response.ok||!result.success)throw new Error(result.message);setBooking(current=>current?{...current,can_redeem:false,redeemed_at:result.data.redeemed_at}:current);}catch(requestError){setError(requestError instanceof Error?requestError.message:'Không thể đổi vé.');}finally{setSubmitting(false);}}

  if(!user?.capabilities?.sell_tickets || workspace!=='tickets') return <div className="pos-sales-layout role-workspace">
    <header className="pos-sales-header pos-sales-header-sales"><div className="pos-sales-header-left"><button type="button" className="pos-btn pos-btn-secondary btn-sm" onClick={onBackToDashboard}><ArrowLeft size={16}/> Ca làm việc</button><div><strong className="pos-sales-branch">{cinemaName} / {counter}</strong><span className="pos-sales-caption">{user?.counter_role_name||'Nhân viên POS'}</span></div></div><div className="pos-sales-header-right"><span className="pos-sales-user"><UserCheck size={16}/>{staffName}</span></div></header>
    <main className="role-workspace-main"><nav className="role-tabs">{user?.capabilities?.sell_tickets&&<button className={workspace==='tickets'?'active':''} onClick={()=>setWorkspace('tickets')}><Ticket size={17}/>Bán vé</button>}{(user?.capabilities?.sell_concessions||user?.capabilities?.sell_merchandise)&&<button className={workspace==='products'?'active':''} onClick={()=>setWorkspace('products')}><Package size={17}/>{user?.capabilities?.sell_merchandise?'Merchandise':'Bắp nước'}</button>}{user?.capabilities?.redeem_online_booking&&<button className={workspace==='redeem'?'active':''} onClick={()=>setWorkspace('redeem')}><QrCode size={17}/>Đổi vé online</button>}</nav>
      {workspace==='redeem'?<section className="redeem-panel"><div className="role-panel-title"><QrCode size={24}/><div><h1>Đổi vé online</h1><p>Tra cứu mã đặt vé đã thanh toán và xác nhận giao vé cho khách.</p></div></div><div className="booking-search"><input value={bookingCode} onChange={e=>setBookingCode(e.target.value.toUpperCase())} placeholder="Nhập mã đặt vé, ví dụ AUR-8F2K9M"/><button onClick={()=>void lookupBooking()} disabled={submitting||bookingCode.trim().length<5}><Search size={17}/>Tra cứu</button></div>{error&&<div className="pos-sales-error">{error}</div>}{booking&&<article className="booking-result"><header><span>{String(booking.booking_code)}</span><b>{booking.redeemed_at?'Đã đổi vé':'Sẵn sàng đổi vé'}</b></header><h2>{String(booking.movie_title)}</h2><dl><div><dt>Suất chiếu</dt><dd>{String(booking.starts_at)}</dd></div><div><dt>Phòng / ghế</dt><dd>{String(booking.screen_name)} · {String(booking.seats)}</dd></div><div><dt>Khách hàng</dt><dd>{String(booking.customer_name||'Khách online')}</dd></div><div><dt>Tổng tiền</dt><dd>{money(Number(booking.total_amount))}</dd></div></dl><button className="pos-pay-button" disabled={!booking.can_redeem||submitting} onClick={()=>void redeemBooking()}><Check size={18}/>{booking.redeemed_at?'VÉ ĐÃ ĐƯỢC XÁC NHẬN':'XÁC NHẬN ĐỔI VÉ'}</button></article>}</section>:<section className="product-workspace"><div className="product-catalog"><div className="role-panel-title"><Package size={24}/><div><h1>{user?.capabilities?.sell_merchandise?'Bán merchandise':'Bán bắp nước trực tiếp'}</h1><p>Sản phẩm và tồn kho được đồng bộ từ aurora_db.</p></div></div><div className="product-grid">{combos.map(product=><article key={product.code}><span>{product.category}</span><h3>{product.name}</h3><p>Còn {product.stock_quantity??0} sản phẩm</p><strong>{money(product.price)}</strong><div><button onClick={()=>setComboQuantities(q=>({...q,[product.code]:Math.max(0,(q[product.code]||0)-1)}))}>-</button><b>{comboQuantities[product.code]||0}</b><button onClick={()=>setComboQuantities(q=>({...q,[product.code]:Math.min(product.stock_quantity??20,(q[product.code]||0)+1)}))}>+</button></div></article>)}</div></div><aside className="product-checkout"><h2>Thanh toán</h2>{combos.filter(p=>comboQuantities[p.code]).map(p=><div className="pos-order-line" key={p.code}><span>{p.name} × {comboQuantities[p.code]}</span><strong>{money(p.price*comboQuantities[p.code])}</strong></div>)}<div className="pos-grand-total"><span>TỔNG CỘNG</span><strong>{money(total)}</strong></div><div className="pos-payment-methods">{(['CASH','CARD','TRANSFER'] as const).map(method=><button key={method} className={paymentMethod===method?'active':''} onClick={()=>setPaymentMethod(method)}>{method==='CASH'?'Tiền mặt':method==='CARD'?'Thẻ':'Chuyển khoản'}</button>)}</div>{paymentMethod==='CASH'&&<input className="product-cash" type="number" value={amountReceived} onChange={e=>setAmountReceived(e.target.value)} placeholder="Tiền khách đưa"/>}{error&&<div className="pos-sales-error">{error}</div>}{receipt?<div className="pos-receipt"><div className="pos-receipt-success"><Check size={20}/>Thanh toán thành công</div><strong>{receipt.code}</strong><button className="pos-btn pos-btn-primary" onClick={()=>setReceipt(null)}>Tạo đơn mới</button></div>:<button className="pos-pay-button" disabled={submitting||total<=0||(paymentMethod==='CASH'&&received<total)} onClick={()=>void submitProductOrder()}><Check size={18}/>THANH TOÁN</button>}</aside></section>}
    </main></div>;

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
