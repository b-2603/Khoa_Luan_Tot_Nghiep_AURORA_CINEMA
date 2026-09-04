import { Check, ChevronLeft, Clock3, MapPin, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = { movie: any; theater: string; showtime: any; user: any; onClose: () => void; onRequireLogin: () => void };

export default function BookingModal({ movie, theater, showtime, user, onClose, onRequireLogin }: Props) {
  const [seats, setSeats] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}?action=showtime_seats&showtime_id=${showtime.id}`, { credentials: 'include' })
      .then(response => response.json())
      .then(result => setSeats(result.seats || []))
      .catch(() => setError('Không thể tải sơ đồ ghế.'))
      .finally(() => setLoading(false));
  }, [showtime.id]);

  const selectedSeats = seats.filter(seat => selected.includes(seat.id));
  const total = selectedSeats.reduce((sum, seat) => sum + Number(showtime.ticket_price), 0);
  const seatRows = seats.reduce<Record<string, any[]>>((rows, seat) => { (rows[seat.seat_row] ||= []).push(seat); return rows; }, {});

  async function submitBooking() {
    if (!user) { onRequireLogin(); return; }
    if (!selected.length) { setError('Vui lòng chọn ít nhất một ghế.'); return; }
    setError('');
    const response = await fetch(`${API_URL}?action=bookings`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ showtimeId: showtime.id, seatIds: selected }) });
    const result = await response.json();
    if (!response.ok) { setError(result.message || 'Không thể tạo booking.'); return; }
    setSuccess(result.booking);
  }

  return <div style={overlay} onClick={onClose}><section style={modal} onClick={event => event.stopPropagation()}>
    <button onClick={onClose} style={close} aria-label="Đóng"><X size={18} /></button>
    {success ? <div style={{ textAlign: 'center', padding: '32px 12px' }}>
      <div style={{ width: 58, height: 58, borderRadius: '50%', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Check size={30} /></div>
      <div style={label}>AURORA CINEMA · ĐẶT VÉ THÀNH CÔNG</div><h2 style={{ color: '#0d1b2e' }}>Mã vé {success.code}</h2>
      <p style={{ color: '#64748b', lineHeight: 1.6 }}>Vé đã được lưu vào hệ thống. Bạn có thể dùng mã vé này khi đến rạp.</p>
      <button onClick={onClose} style={primary}>HOÀN TẤT</button>
    </div> : <>
      <div style={label}>AURORA CINEMA · ĐẶT VÉ XEM PHIM</div><h2 style={{ margin: '7px 0 14px', color: '#0d1b2e' }}>{movie.title}</h2>
      <div style={summary}><span><MapPin size={14} /> {theater}</span><span><Clock3 size={14} /> {new Date(showtime.starts_at.replace(' ', 'T')).toLocaleString('vi-VN')}</span><span>Phòng: {showtime.screen_name}</span></div>
      <div style={{ marginTop: 20, background: 'linear-gradient(90deg,#cbd5e1,#fff,#cbd5e1)', height: 7, borderRadius: 99, boxShadow: '0 5px 12px rgba(13,27,46,.15)' }} /><div style={{ textAlign: 'center', color: '#64748b', fontSize: 11, margin: '7px 0 18px', letterSpacing: 2 }}>MÀN HÌNH CHIẾU</div>
      {loading ? <p>Đang tải sơ đồ ghế...</p> : <div style={{ overflowX: 'auto' }}>{Object.entries(seatRows).map(([row, rowSeats]) => <div key={row} style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 6, minWidth: 430 }}><span style={rowLabel}>{row}</span>{rowSeats.map(seat => { const available = Number(seat.is_available) === 1; const active = selected.includes(seat.id); return <button key={seat.id} disabled={!available} onClick={() => setSelected(current => active ? current.filter(id => id !== seat.id) : [...current, seat.id])} style={{ ...seatStyle, background: !available ? '#e2e8f0' : active ? '#0d1b2e' : seat.seat_type === 'VIP' ? '#fff0c2' : '#f8fafc', color: !available ? '#94a3b8' : active ? '#f4c04a' : '#475569', borderColor: active ? '#0d1b2e' : seat.seat_type === 'VIP' ? '#f4c04a' : '#cbd5e1' }}>{seat.seat_row}{seat.seat_number}</button>; })}</div>)}</div>}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, color: '#64748b', fontSize: 11, marginTop: 16 }}><span>□ Ghế thường</span><span style={{ color: '#9a6700' }}>□ Ghế VIP</span><span style={{ color: '#0d1b2e' }}>■ Đang chọn</span></div>
      {error && <div style={errorStyle}>{error}</div>}
      <div style={footer}><div><div style={{ fontSize: 11, color: '#64748b' }}>Ghế đã chọn: {selected.length ? selectedSeats.map(seat => `${seat.seat_row}${seat.seat_number}`).join(', ') : 'Chưa chọn'}</div><strong style={{ color: '#0d1b2e', fontSize: 18 }}>{total.toLocaleString('vi-VN')}đ</strong></div><button onClick={submitBooking} style={primary}><Ticket size={15} /> TIẾP TỤC</button></div>
    </>}
  </section></div>;
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(4,13,25,.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modal: React.CSSProperties = { width: 'min(680px,100%)', maxHeight: '94vh', overflowY: 'auto', background: '#fff', borderRadius: 18, padding: 26, position: 'relative' };
const close: React.CSSProperties = { position: 'absolute', top: 14, right: 14, border: 0, background: '#f1f5f9', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' };
const label: React.CSSProperties = { color: '#b8860b', fontSize: 10, fontWeight: 900, letterSpacing: 1 };
const summary: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 12, color: '#64748b', fontSize: 12 };
const rowLabel: React.CSSProperties = { width: 20, color: '#94a3b8', fontWeight: 800, fontSize: 11, paddingTop: 7 };
const seatStyle: React.CSSProperties = { width: 36, height: 28, border: '1px solid', borderRadius: '7px 7px 10px 10px', fontSize: 9, cursor: 'pointer', padding: 0 };
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #e2e8f0', marginTop: 18, paddingTop: 15 };
const primary: React.CSSProperties = { border: 0, borderRadius: 9, padding: '11px 17px', background: '#0d1b2e', color: '#f4c04a', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 };
const errorStyle: React.CSSProperties = { marginTop: 12, color: '#b91c1c', background: '#fef2f2', padding: 9, borderRadius: 7, fontSize: 12 };
