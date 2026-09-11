/**
 * BookingPage.tsx – Trang đặt vé hoàn chỉnh (không phải modal)
 * Aurora Cinema Customer Frontend
 *
 * Luồng 4 bước:
 *   1. Chọn suất chiếu (ngày + rạp + giờ chiếu)
 *   2. Chọn ghế (sơ đồ phòng chiếu)
 *   3. Thanh toán (voucher + phương thức thanh toán)
 *   4. Thành công (ticket card + QR code)
 */

import {
  ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight,
  Clock, CreditCard, Film, Gift, MapPin, QrCode,
  Smartphone, Star, Tag, Ticket, User, X, Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const API = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';
const HOLD_SECONDS = 600; // 10 phút giữ ghế

/* ─────────────────────────────── Types ─────────────────────────────── */
type Lang = 'vi' | 'en';
type Step = 1 | 2 | 3 | 4;
type Seat = { id: number; seat_row: string; seat_number: number; seat_type: 'STANDARD' | 'VIP' | 'COUPLE' | 'DOUBLE'; is_available: number };
type Showtime = {
  id: number; screen_id: number; screen_name: string; total_seats: number; seats_left: number;
  theater_id: number; theater_name: string; theater_address: string; city: string;
  starts_at: string; ends_at: string; ticket_price: number; status: string; show_date: string;
};
type PayMethod = 'cash' | 'qr_vnpay' | 'qr_momo' | 'qr_zalopay' | 'card';

type Props = {
  movie: any;
  showtime?: any;      // nếu truyền vào sẵn → bỏ qua bước 1
  theater?: string;
  user: any;
  language: Lang;
  onClose: () => void;
  onRequireLogin: () => void;
};

/* ─────────────────────────────── Helpers ─────────────────────────────── */
function t(vi: string, en: string, lang: Lang) { return lang === 'en' ? en : vi; }

function fmtDate(d: string, lang: Lang) {
  try {
    const date = new Date(d);
    if (lang === 'vi') {
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      return `${days[date.getDay()]}, ${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}`;
    }
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: '2-digit' });
  } catch { return d; }
}
function fmtTime(dt: string) {
  try { return new Date(dt.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }); }
  catch { return dt.slice(11, 16); }
}
function fmtDateFull(dt: string, lang: Lang) {
  try {
    const d = new Date(dt.replace(' ', 'T'));
    return d.toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return dt; }
}
function fmtMoney(n: number) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
function fmtTimer(s: number) { return `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`; }
function ratingColor(r: string) {
  const m: Record<string,string> = { P:'#16a34a', K:'#d97706', T13:'#ea580c', T16:'#dc2626', T18:'#7f1d1d' };
  return m[r] || '#64748b';
}
function getSeatPrice(seat: Seat, basePrice: number): number {
  const numBase = Number(basePrice || 0);
  if (seat.seat_type === 'VIP') return numBase + 20000;
  if (seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE') return numBase * 2;
  return numBase;
}
function seatColor(seat: Seat, selected: boolean): { bg: string; border: string; color: string } {
  if (!seat.is_available) return { bg: '#e2e8f0', border: '#cbd5e1', color: '#94a3b8' };
  if (selected) return { bg: '#1e3a5f', border: '#1e3a5f', color: '#f4c04a' };
  if (seat.seat_type === 'VIP')    return { bg: '#fef9c3', border: '#fbbf24', color: '#92400e' };
  if (seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE') return { bg: '#fce7f3', border: '#f472b6', color: '#9d174d' };
  return { bg: '#f8fafc', border: '#cbd5e1', color: '#475569' };
}

/* ─────────────────────────────── Sub-Components ─────────────────────────────── */

/** Progress bar bước */
function StepBar({ step, lang }: { step: Step; lang: Lang }) {
  const steps = [
    t('Suất chiếu','Showtime', lang),
    t('Chọn ghế','Seats', lang),
    t('Thanh toán','Payment', lang),
    t('Hoàn tất','Done', lang),
  ];
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, padding:'0 4px' }}>
      {steps.map((label, i) => {
        const n = (i + 1) as Step;
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} style={{ display:'flex', alignItems:'center', flex: i < 3 ? 1 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done ? '#22c55e' : active ? '#0d1b2e' : '#e2e8f0',
                color: done || active ? '#fff' : '#94a3b8',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize: 13, fontWeight: 900,
                boxShadow: active ? '0 0 0 4px rgba(13,27,46,0.15)' : 'none',
                transition: 'all 0.3s ease',
              }}>
                {done ? <Check size={16} strokeWidth={3} /> : n}
              </div>
              <span style={{ fontSize: 10.5, fontWeight: active ? 800 : 500, color: active ? '#0d1b2e' : '#94a3b8', whiteSpace:'nowrap' }}>
                {label}
              </span>
            </div>
            {i < 3 && (
              <div style={{ flex:1, height:2, background: done ? '#22c55e' : '#e2e8f0', margin:'0 8px', marginBottom:18, transition:'background 0.3s' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Panel thông tin bên phải */
function SummaryPanel({
  movie, showtime, theater, seats, selectedSeats, vipSurcharge,
  discount, totalAfterDiscount, timeLeft, step, lang, onContinue, continueLabel, continueDisabled,
}: {
  movie: any; showtime: any; theater: string; seats: Seat[]; selectedSeats: Seat[];
  vipSurcharge: number; discount: number; totalAfterDiscount: number;
  timeLeft: number; step: Step; lang: Lang;
  onContinue: () => void; continueLabel: string; continueDisabled: boolean;
}) {
  const ticketPrice = Number(showtime?.ticket_price || 0);
  const subtotal = selectedSeats.reduce((s, seat) => s + getSeatPrice(seat, ticketPrice), 0);

  return (
    <aside style={{
      width: 280, flexShrink: 0,
      background: '#fff',
      borderLeft: '1px solid #e2e8f0',
      display: 'flex', flexDirection:'column',
      overflowY:'auto',
    }}>
      {/* Poster */}
      <div style={{ position:'relative', background:'#0d1b2e' }}>
        {movie.poster || movie.posterUrl ? (
          <img src={movie.poster || movie.posterUrl} alt={movie.title}
            style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', opacity:0.75 }}
            onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
        ) : (
          <div style={{ width:'100%', aspectRatio:'16/9', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Film size={40} color="#475569" />
          </div>
        )}
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 30%, rgba(13,27,46,0.85))' }} />
        <div style={{ position:'absolute', bottom:12, left:14, right:14 }}>
          <div style={{ fontSize:14, fontWeight:900, color:'#fff', lineHeight:1.3, marginBottom:4 }}>{movie.title}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            {movie.format && <span style={{ fontSize:10, fontWeight:700, background:'rgba(255,255,255,0.15)', color:'#dce8f5', padding:'2px 7px', borderRadius:4 }}>{movie.format}</span>}
            {(movie.ageRating || movie.rating) && <span style={{ fontSize:10, fontWeight:700, background: ratingColor(movie.ageRating||movie.rating), color:'#fff', padding:'2px 7px', borderRadius:4 }}>{movie.ageRating||movie.rating}</span>}
          </div>
        </div>
      </div>

      <div style={{ flex:1, padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Timer (bước 2+) */}
        {step >= 2 && step < 4 && (
          <div style={{ background: timeLeft < 60 ? '#fef2f2' : '#f8fafc', borderRadius:10, padding:'10px 13px', border: `1px solid ${timeLeft < 60 ? '#fecaca' : '#e2e8f0'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:11, color:'#64748b', fontWeight:600 }}>{t('Thời gian giữ ghế','Hold time',lang)}</span>
              <span style={{ fontSize:22, fontWeight:900, color: timeLeft < 60 ? '#dc2626' : '#0d1b2e', fontVariantNumeric:'tabular-nums' }}>{fmtTimer(timeLeft)}</span>
            </div>
            <div style={{ height:5, background:'#e2e8f0', borderRadius:99, overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:99, transition:'width 1s linear, background 0.5s',
                width:`${(timeLeft/HOLD_SECONDS)*100}%`,
                background: timeLeft < 60 ? '#ef4444' : timeLeft < 180 ? '#f59e0b' : '#22c55e' }} />
            </div>
          </div>
        )}

        {/* Showtime info */}
        {showtime && (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[
              { icon: <MapPin size={13} color="#f4c04a" />, val: theater || showtime.theater_name },
              { icon: <Film size={13} color="#f4c04a" />, val: showtime.screen_name },
              { icon: <Calendar size={13} color="#f4c04a" />, val: fmtDateFull(showtime.starts_at, lang) },
              { icon: <Clock size={13} color="#f4c04a" />, val: `${fmtTime(showtime.starts_at)} – ${fmtTime(showtime.ends_at||showtime.starts_at)}` },
            ].map((r, i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12, color:'#1a2332' }}>
                <span style={{ flexShrink:0, marginTop:1 }}>{r.icon}</span>
                <span style={{ lineHeight:1.4 }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ghế đã chọn */}
        {selectedSeats.length > 0 && (
          <div style={{ background:'#f8fafc', borderRadius:9, padding:'10px 12px', border:'1px solid #e2e8f0' }}>
            <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{t('Ghế đã chọn','Selected seats',lang)} ({selectedSeats.length})</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
              {selectedSeats.map(seat => {
                const isCpl = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
                const isVip = seat.seat_type === 'VIP';
                return (
                  <span key={seat.id} style={{
                    display:'inline-block', padding:'3px 8px', borderRadius:99, fontSize:11, fontWeight:700,
                    background: isVip ? '#fef9c3' : isCpl ? '#fce7f3' : '#e0e7ff',
                    color: isVip ? '#92400e' : isCpl ? '#9d174d' : '#3730a3',
                    border: `1px solid ${isVip ? '#fbbf24' : isCpl ? '#f472b6' : '#a5b4fc'}`,
                  }}>
                    {seat.seat_row}{seat.seat_number}
                    <small style={{ marginLeft:3, fontSize:9 }}>{isVip ? 'VIP' : isCpl ? 'ĐÔI' : 'THƯỜNG'}</small>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bảng giá */}
        {showtime && selectedSeats.length > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div style={{ fontSize:10.5, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>{t('Bảng giá chi tiết','Pricing breakdown',lang)}</div>
            {selectedSeats.map(seat => {
              const price = getSeatPrice(seat, ticketPrice);
              const isCpl = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
              const isVip = seat.seat_type === 'VIP';
              const typeLabel = isVip ? 'VIP' : isCpl ? t('Đôi','Couple',lang) : t('Thường','Std',lang);
              return (
                <div key={seat.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'#64748b' }}>{seat.seat_row}{seat.seat_number} ({typeLabel})</span>
                  <span style={{ fontWeight:600 }}>{fmtMoney(price)}</span>
                </div>
              );
            })}
            <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
              <span style={{ color:'#64748b' }}>{t('Tạm tính','Subtotal',lang)}</span>
              <span style={{ fontWeight:600 }}>{fmtMoney(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12 }}>
                <span style={{ color:'#16a34a' }}>🏷 {t('Giảm giá','Discount',lang)}</span>
                <span style={{ fontWeight:700, color:'#16a34a' }}>-{fmtMoney(discount)}</span>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:15, fontWeight:900, color:'#0d1b2e', marginTop:2 }}>
              <span>{t('Tổng cộng','Total',lang)}</span>
              <span>{fmtMoney(totalAfterDiscount)}</span>
            </div>
          </div>
        )}

        {/* Giá đặt nếu chưa chọn ghế */}
        {showtime && selectedSeats.length === 0 && (
          <div style={{ background:'#fff9e6', borderRadius:9, padding:'10px 12px', border:'1px solid #fde68a', fontSize:12 }}>
            <div style={{ color:'#92400e', fontWeight:700, marginBottom:6 }}>{t('Bảng giá vé tham khảo','Reference ticket prices',lang)}</div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#64748b' }}>{t('Ghế thường','Standard',lang)}</span>
              <strong>{fmtMoney(ticketPrice)}</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ color:'#64748b' }}>Ghế VIP (+20k)</span>
              <strong style={{ color:'#92400e' }}>{fmtMoney(ticketPrice + 20000)}</strong>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'#64748b' }}>{t('Ghế đôi (Couple)','Couple seat',lang)}</span>
              <strong style={{ color:'#9d174d' }}>{fmtMoney(ticketPrice * 2)}</strong>
            </div>
          </div>
        )}

        {/* CTA */}
        {step < 4 && (
          <button
            onClick={onContinue}
            disabled={continueDisabled}
            style={{
              border:0, borderRadius:10, padding:'13px 16px',
              background: continueDisabled ? '#e2e8f0' : 'linear-gradient(135deg,#0d1b2e,#1e3a5f)',
              color: continueDisabled ? '#94a3b8' : '#f4c04a',
              fontWeight:900, fontSize:14, cursor: continueDisabled ? 'not-allowed' : 'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow: continueDisabled ? 'none' : '0 4px 16px rgba(13,27,46,0.3)',
              transition:'all 0.2s',
              marginTop:'auto',
            }}
          >
            <Ticket size={16} /> {continueLabel}
          </button>
        )}
      </div>
    </aside>
  );
}

/* ─────────────────────────────── Main Component ─────────────────────────────── */
export default function BookingPage({ movie, showtime: initShowtime, theater: initTheater, user, language: lang, onClose, onRequireLogin }: Props) {
  /* ── State ── */
  const [step, setStep] = useState<Step>(initShowtime ? 2 : 1);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [allShowtimes, setAllShowtimes] = useState<Showtime[]>([]);
  const [selectedShowtime, setSelectedShowtime] = useState<Showtime | null>(initShowtime || null);
  const [selectedTheater, setSelectedTheater] = useState(initTheater || initShowtime?.theater_name || '');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);
  const [seatsLoading, setSeatsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherInfo, setVoucherInfo] = useState<{ desc: string; discount: number } | null>(null);
  const [voucherError, setVoucherError] = useState('');
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const VIP_SURCHARGE = 20000;
  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  const ticketPrice = Number(selectedShowtime?.ticket_price || 0);
  const subtotal = selectedSeats.reduce((s, seat) => s + getSeatPrice(seat, ticketPrice), 0);
  const discount = voucherInfo?.discount || 0;
  const totalFinal = Math.max(0, subtotal - discount);

  /* ── Load suất chiếu theo phim ── */
  useEffect(() => {
    if (initShowtime) return;
    fetch(`${API}?action=movie_showtimes&movie_id=${movie.id}`)
      .then(r => r.json())
      .then(res => {
        if (res.available_dates?.length) {
          setAvailableDates(res.available_dates);
          setSelectedDate(res.available_dates[0]);
        }
        setAllShowtimes(res.showtimes || []);
      })
      .catch(() => {});
  }, [movie.id]);

  /* ── Load ghế khi vào bước 2 ── */
  useEffect(() => {
    if (step !== 2 || !selectedShowtime) return;
    setSeatsLoading(true);
    setSeats([]);
    setSelectedSeatIds([]);
    fetch(`${API}?action=showtime_seats&showtime_id=${selectedShowtime.id}`, { credentials:'include' })
      .then(r => r.json())
      .then(res => setSeats(res.seats || []))
      .catch(() => setError(t('Không thể tải sơ đồ ghế.','Failed to load seat map.',lang)))
      .finally(() => setSeatsLoading(false));
  }, [step, selectedShowtime]);

  /* ── Countdown khi vào bước 2 ── */
  useEffect(() => {
    if (step < 2 || step === 4) return;
    setTimeLeft(HOLD_SECONDS);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [step]);

  /* ── Helpers ── */
  const showtimesForDate = allShowtimes.filter(s => s.show_date === selectedDate);
  const theatersForDate = [...new Map(showtimesForDate.map(s => [s.theater_id, s])).values()];
  const showtimesForTheater = showtimesForDate.filter(s =>
    !selectedTheater || s.theater_name === selectedTheater
  );

  function pickShowtime(st: Showtime) {
    setSelectedShowtime(st);
    setSelectedTheater(st.theater_name);
    setError('');
    setStep(2);
    window.scrollTo({ top: 0, behavior:'smooth' });
  }

  function toggleSeat(seat: Seat) {
    if (!seat.is_available) return;
    setSelectedSeatIds(prev =>
      prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]
    );
    setError('');
  }

  async function applyVoucher() {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true); setVoucherError(''); setVoucherInfo(null);
    try {
      const res = await fetch(`${API}?action=apply_voucher`, {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ code: voucherCode.trim(), total: subtotal }),
      });
      const data = await res.json();
      if (!res.ok) { setVoucherError(data.message || 'Mã không hợp lệ.'); return; }
      setVoucherInfo({ desc: data.desc, discount: data.discount });
    } catch { setVoucherError('Không thể kết nối máy chủ.'); }
    finally { setVoucherLoading(false); }
  }

  async function submitBooking() {
    if (!user) { clearInterval(timerRef.current!); onRequireLogin(); return; }
    if (!selectedShowtime || selectedSeatIds.length === 0) { setError(t('Vui lòng chọn ghế trước.','Please select seats first.',lang)); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}?action=bookings`, {
        method:'POST', credentials:'include',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ showtimeId: selectedShowtime.id, seatIds: selectedSeatIds }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || t('Đặt vé thất bại.','Booking failed.',lang)); return; }
      clearInterval(timerRef.current!);
      setBookingResult(data.booking);
      setStep(4);
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch { setError('Lỗi kết nối.'); }
    finally { setSubmitting(false); }
  }

  function goStep(s: Step) {
    if (s < step) { setStep(s); setError(''); }
  }

  /* ── CTA label & disabled ── */
  const ctaLabel = step === 1
    ? t('Chọn suất chiếu','Select Showtime',lang)
    : step === 2
    ? t('TIẾP TỤC →','CONTINUE →',lang)
    : step === 3
    ? (submitting ? t('Đang xử lý...','Processing...',lang) : t('XÁC NHẬN ĐẶT VÉ','CONFIRM BOOKING',lang))
    : '';
  const ctaDisabled = step === 1
    ? !selectedShowtime
    : step === 2
    ? selectedSeatIds.length === 0
    : step === 3
    ? submitting
    : false;

  function handleCTA() {
    if (step === 1 && selectedShowtime) { setStep(2); window.scrollTo({top:0,behavior:'smooth'}); }
    else if (step === 2) {
      if (!selectedSeatIds.length) { setError(t('Vui lòng chọn ít nhất 1 ghế.','Select at least 1 seat.',lang)); return; }
      setError(''); setStep(3); window.scrollTo({top:0,behavior:'smooth'});
    }
    else if (step === 3) submitBooking();
  }

  /* ── Grouped seat rows ── */
  const seatRows = seats.reduce<Record<string, Seat[]>>((acc, s) => {
    (acc[s.seat_row] ||= []).push(s);
    return acc;
  }, {});
  const sortedRows = Object.keys(seatRows).sort();

  /* ═══════════════════════════════════════════════════════ RENDER ═══ */
  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', fontFamily:"'Segoe UI','Inter',sans-serif", display:'flex', flexDirection:'column' }}>

      {/* ── TOP HEADER ── */}
      <div style={{ background:'#0d1b2e', color:'#dce8f5', padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <button onClick={onClose} style={{ display:'flex', alignItems:'center', gap:8, border:0, background:'transparent', color:'#dce8f5', cursor:'pointer', fontSize:13, fontWeight:600 }}>
          <ArrowLeft size={16} /> {t('Quay lại','Back',lang)}
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/aurora-logo.svg" alt="Aurora Cinema" style={{ height:32, objectFit:'contain' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          <span style={{ fontSize:13, fontWeight:700, color:'#f4c04a', display:'flex', alignItems:'center', gap:5 }}>
            <Ticket size={14} /> {t('ĐẶT VÉ XEM PHIM','MOVIE BOOKING',lang)}
          </span>
        </div>
        <div style={{ fontSize:12, color:'#64748b' }}>{user ? <span style={{color:'#f4c04a'}}>👤 {user.fullName}</span> : t('Chưa đăng nhập','Not signed in',lang)}</div>
      </div>

      {/* ── BREADCRUMB + STEP BAR ── */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'10px 24px' }}>
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8', marginBottom:14 }}>
          <span onClick={onClose} style={{ cursor:'pointer', color:'#64748b' }}>{t('Trang chủ','Home',lang)}</span>
          <ChevronRight size={13} />
          <span style={{ cursor:'pointer', color:'#64748b' }}>{t('Đặt vé','Booking',lang)}</span>
          <ChevronRight size={13} />
          <span style={{ color:'#0d1b2e', fontWeight:700 }}>{movie.title}</span>
        </div>
        {/* Step bar */}
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <StepBar step={step} lang={lang} />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', maxWidth:'100%' }}>

        {/* LEFT: nội dung theo bước */}
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* ─── BƯỚC 4: THÀNH CÔNG ─── */}
          {step === 4 && bookingResult && (
            <SuccessStep booking={bookingResult} movie={movie} showtime={selectedShowtime!} theater={selectedTheater} selectedSeats={selectedSeats} totalFinal={totalFinal} lang={lang} onClose={onClose} />
          )}

          {/* ─── BƯỚC 3: THANH TOÁN ─── */}
          {step === 3 && (
            <PaymentStep
              lang={lang} movie={movie} showtime={selectedShowtime!} theater={selectedTheater}
              selectedSeats={selectedSeats} subtotal={subtotal} discount={discount} totalFinal={totalFinal}
              voucherCode={voucherCode} setVoucherCode={setVoucherCode}
              voucherInfo={voucherInfo} voucherError={voucherError} voucherLoading={voucherLoading}
              onApplyVoucher={applyVoucher} onRemoveVoucher={() => { setVoucherInfo(null); setVoucherCode(''); }}
              payMethod={payMethod} setPayMethod={setPayMethod}
              user={user} error={error} onBack={() => goStep(2)} VIP_SURCHARGE={VIP_SURCHARGE}
            />
          )}

          {/* ─── BƯỚC 2: CHỌN GHẾ ─── */}
          {step === 2 && (
            <SeatStep
              lang={lang} movie={movie} showtime={selectedShowtime!} theater={selectedTheater}
              seats={seats} seatsLoading={seatsLoading}
              seatRows={seatRows} sortedRows={sortedRows}
              selectedSeatIds={selectedSeatIds} onToggleSeat={toggleSeat}
              error={error} onBack={() => goStep(1)} VIP_SURCHARGE={VIP_SURCHARGE}
            />
          )}

          {/* ─── BƯỚC 1: CHỌN SUẤT CHIẾU ─── */}
          {step === 1 && (
            <ShowtimeStep
              lang={lang} movie={movie}
              availableDates={availableDates}
              selectedDate={selectedDate} setSelectedDate={setSelectedDate}
              allShowtimes={allShowtimes} showtimesForDate={showtimesForDate}
              theatersForDate={theatersForDate}
              selectedTheater={selectedTheater} setSelectedTheater={setSelectedTheater}
              showtimesForTheater={showtimesForTheater}
              selectedShowtime={selectedShowtime} onPickShowtime={pickShowtime}
              error={error}
            />
          )}
        </main>

        {/* RIGHT: Summary panel */}
        {step < 4 && (
          <SummaryPanel
            movie={movie} showtime={selectedShowtime} theater={selectedTheater}
            seats={seats} selectedSeats={selectedSeats}
            vipSurcharge={VIP_SURCHARGE} discount={discount} totalAfterDiscount={totalFinal}
            timeLeft={timeLeft} step={step} lang={lang}
            onContinue={handleCTA} continueLabel={ctaLabel} continueDisabled={ctaDisabled}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════ STEP 1 ═══════════════════════════════ */
function ShowtimeStep({ lang, movie, availableDates, selectedDate, setSelectedDate, allShowtimes, showtimesForDate, theatersForDate, selectedTheater, setSelectedTheater, showtimesForTheater, selectedShowtime, onPickShowtime, error }: any) {
  const noShowtimes = availableDates.length === 0 && allShowtimes.length === 0;

  return (
    <div style={{ maxWidth:860 }}>
      <h1 style={{ fontSize:22, fontWeight:900, color:'#0d1b2e', margin:'0 0 6px' }}>{movie.title}</h1>
      <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:24, flexWrap:'wrap' }}>
        {movie.genre && <span style={{ fontSize:12, color:'#64748b' }}>{movie.genre}</span>}
        {(movie.duration||movie.durationMinutes) && <span style={{ fontSize:12, color:'#94a3b8' }}>· {movie.duration||movie.durationMinutes} {t('phút','min',lang)}</span>}
        {(movie.ageRating||movie.rating) && (
          <span style={{ fontSize:11, fontWeight:800, background: ratingColor(movie.ageRating||movie.rating), color:'#fff', padding:'2px 8px', borderRadius:4 }}>
            {movie.ageRating||movie.rating}
          </span>
        )}
      </div>

      {noShowtimes ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:14 }}>
          <Film size={40} color="#cbd5e1" style={{ margin:'0 auto 12px' }} />
          <p style={{ color:'#94a3b8', fontSize:14 }}>{t('Hiện chưa có suất chiếu nào.','No showtimes available.',lang)}</p>
        </div>
      ) : (
        <>
          {/* Chọn ngày */}
          <section style={{ marginBottom:20 }}>
            <h2 style={{ fontSize:13, fontWeight:800, color:'#0d1b2e', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <Calendar size={15} color="#f4c04a" /> {t('Chọn ngày chiếu','Select date',lang)}
            </h2>
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {availableDates.length === 0 ? (
                /* Fallback: nếu không có available_dates, dùng ngày từ showtimes */
                ([...new Set(allShowtimes.map((s: Showtime) => s.show_date))] as string[]).map((d: string) => (
                  <DateCard key={d} date={d} active={selectedDate === d} lang={lang} onClick={() => setSelectedDate(d)} />
                ))
              ) : (
                availableDates.map((d: string) => (
                  <DateCard key={d} date={d} active={selectedDate === d} lang={lang} onClick={() => setSelectedDate(d)} />
                ))
              )}
            </div>
          </section>

          {/* Chọn rạp */}
          {theatersForDate.length > 1 && (
            <section style={{ marginBottom:20 }}>
              <h2 style={{ fontSize:13, fontWeight:800, color:'#0d1b2e', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
                <MapPin size={15} color="#f4c04a" /> {t('Chọn rạp','Select cinema',lang)}
              </h2>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button
                  onClick={() => setSelectedTheater('')}
                  style={{ padding:'7px 16px', borderRadius:20, border: !selectedTheater ? 'none' : '1px solid #e2e8f0', background: !selectedTheater ? '#0d1b2e' : '#fff', color: !selectedTheater ? '#f4c04a' : '#475569', fontSize:12, fontWeight:700, cursor:'pointer' }}
                >
                  {t('Tất cả rạp','All cinemas',lang)}
                </button>
                {theatersForDate.map((t: Showtime) => (
                  <button
                    key={t.theater_id}
                    onClick={() => setSelectedTheater(t.theater_name)}
                    style={{ padding:'7px 16px', borderRadius:20, border: selectedTheater===t.theater_name ? 'none' : '1px solid #e2e8f0', background: selectedTheater===t.theater_name ? '#0d1b2e' : '#fff', color: selectedTheater===t.theater_name ? '#f4c04a' : '#475569', fontSize:12, fontWeight:700, cursor:'pointer' }}
                  >
                    {t.theater_name}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Danh sách suất chiếu */}
          <section>
            <h2 style={{ fontSize:13, fontWeight:800, color:'#0d1b2e', textTransform:'uppercase', letterSpacing:0.5, marginBottom:12, display:'flex', alignItems:'center', gap:7 }}>
              <Clock size={15} color="#f4c04a" /> {t('Suất chiếu','Showtimes',lang)}
              <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8', textTransform:'none' }}>({showtimesForTheater.length} {t('suất','showtimes',lang)})</span>
            </h2>

            {/* Nhóm theo rạp */}
            {([...new Map(showtimesForTheater.map((s: Showtime) => [s.theater_id, s])).values()] as Showtime[]).map((theater: Showtime) => (
              <div key={theater.theater_id} style={{ marginBottom:20 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'10px 14px', background:'#f8fafc', borderRadius:10, border:'1px solid #e2e8f0' }}>
                  <MapPin size={14} color="#f4c04a" />
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:'#0d1b2e' }}>{theater.theater_name}</div>
                    <div style={{ fontSize:11, color:'#64748b' }}>{theater.theater_address}, {theater.city}</div>
                  </div>
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                  {showtimesForTheater.filter((s: Showtime) => s.theater_id === theater.theater_id).map((st: Showtime) => (
                    <ShowtimeCard key={st.id} st={st} selected={selectedShowtime?.id === st.id} lang={lang} onClick={() => onPickShowtime(st)} />
                  ))}
                </div>
              </div>
            ))}

            {showtimesForTheater.length === 0 && selectedDate && (
              <div style={{ textAlign:'center', padding:'40px', color:'#94a3b8' }}>
                {t('Không có suất chiếu nào vào ngày này.','No showtimes on this date.',lang)}
              </div>
            )}
          </section>
        </>
      )}
      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

function DateCard({ date, active, lang, onClick }: { date:string; active:boolean; lang:Lang; onClick:()=>void }) {
  const d = new Date(date);
  const days = ['CN','T2','T3','T4','T5','T6','T7'];
  const dayEn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return (
    <button onClick={onClick} style={{
      minWidth:68, padding:'10px 8px', borderRadius:10, border: active ? 'none' : '1px solid #e2e8f0',
      background: active ? '#0d1b2e' : '#fff', cursor:'pointer', textAlign:'center',
      boxShadow: active ? '0 4px 12px rgba(13,27,46,0.2)' : 'none', transition:'all 0.2s', flexShrink:0,
    }}>
      <div style={{ fontSize:10, fontWeight:600, color: active ? '#f4c04a' : '#94a3b8', marginBottom:4 }}>
        {lang === 'vi' ? days[d.getDay()] : dayEn[d.getDay()]}
      </div>
      <div style={{ fontSize:20, fontWeight:900, color: active ? '#fff' : '#0d1b2e', lineHeight:1 }}>
        {String(d.getDate()).padStart(2,'0')}
      </div>
      <div style={{ fontSize:10, color: active ? '#9ab5cc' : '#94a3b8', marginTop:3 }}>
        {String(d.getMonth()+1).padStart(2,'0')}/{d.getFullYear()}
      </div>
    </button>
  );
}

function ShowtimeCard({ st, selected, lang, onClick }: { st:Showtime; selected:boolean; lang:Lang; onClick:()=>void }) {
  const pct = st.total_seats > 0 ? (st.seats_left / st.total_seats) : 1;
  const almostFull = pct < 0.2 && st.seats_left > 0;
  const soldOut = st.seats_left === 0;

  return (
    <button
      onClick={onClick}
      disabled={soldOut}
      style={{
        width:160, padding:'12px 14px', borderRadius:12, textAlign:'left',
        border: selected ? '2px solid #0d1b2e' : '1px solid #e2e8f0',
        background: selected ? '#0d1b2e' : soldOut ? '#f8fafc' : '#fff',
        cursor: soldOut ? 'not-allowed' : 'pointer',
        boxShadow: selected ? '0 4px 16px rgba(13,27,46,0.2)' : '0 1px 4px rgba(0,0,0,0.05)',
        transition:'all 0.2s', opacity: soldOut ? 0.55 : 1,
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
        <span style={{ fontSize:20, fontWeight:900, color: selected ? '#f4c04a' : '#0d1b2e' }}>{fmtTime(st.starts_at)}</span>
        {almostFull && !soldOut && <span style={{ fontSize:9, fontWeight:800, background:'#fef2f2', color:'#dc2626', padding:'2px 5px', borderRadius:4, whiteSpace:'nowrap' }}>GẦN ĐẦY</span>}
        {soldOut && <span style={{ fontSize:9, fontWeight:800, background:'#f1f5f9', color:'#94a3b8', padding:'2px 5px', borderRadius:4 }}>HẾT VÉ</span>}
      </div>
      <div style={{ fontSize:11, color: selected ? '#9ab5cc' : '#64748b', marginBottom:4 }}>{st.screen_name}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, fontWeight:700, color: selected ? '#f4c04a' : '#0d1b2e' }}>{fmtMoney(st.ticket_price)}</span>
        <span style={{ fontSize:10, color: selected ? '#9ab5cc' : '#94a3b8' }}>{st.seats_left} {t('ghế','left',lang)}</span>
      </div>
      {/* Thanh ghế còn */}
      <div style={{ height:3, background: selected ? 'rgba(255,255,255,0.2)' : '#f1f5f9', borderRadius:99, marginTop:8, overflow:'hidden' }}>
        <div style={{ height:'100%', borderRadius:99, background: pct < 0.2 ? '#ef4444' : pct < 0.5 ? '#f59e0b' : '#22c55e', width:`${pct*100}%` }} />
      </div>
    </button>
  );
}

/* ═══════════════════════════════ STEP 2 ═══════════════════════════════ */
function SeatStep({ lang, movie, showtime, theater, seats, seatsLoading, seatRows, sortedRows, selectedSeatIds, onToggleSeat, error, onBack, VIP_SURCHARGE }: any) {
  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, border:0, background:'transparent', color:'#64748b', cursor:'pointer', fontSize:13, marginBottom:16, padding:0 }}>
        <ChevronLeft size={15} /> {t('Chọn suất chiếu khác','Change showtime',lang)}
      </button>

      {/* Movie + showtime summary */}
      <div style={{ display:'flex', gap:12, alignItems:'center', background:'#fff', borderRadius:14, padding:'14px 16px', marginBottom:20, border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        {(movie.poster||movie.posterUrl) && (
          <img src={movie.poster||movie.posterUrl} alt="" style={{ width:48, height:68, objectFit:'cover', borderRadius:6 }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
        )}
        <div>
          <div style={{ fontSize:15, fontWeight:900, color:'#0d1b2e', marginBottom:4 }}>{movie.title}</div>
          <div style={{ display:'flex', gap:12, fontSize:12, color:'#64748b', flexWrap:'wrap' }}>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><MapPin size={12} color="#f4c04a" />{theater || showtime.theater_name}</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><Film size={12} color="#f4c04a" />{showtime.screen_name}</span>
            <span style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={12} color="#f4c04a" />{fmtDateFull(showtime.starts_at, lang)}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', marginBottom:16, padding:'10px 14px', background:'#fff', borderRadius:10, border:'1px solid #e2e8f0' }}>
        {[
          { bg:'#f8fafc', border:'#cbd5e1', color:'#475569', label: t('Ghế thường','Standard',lang) },
          { bg:'#fef9c3', border:'#fbbf24', color:'#92400e', label: 'Ghế VIP (+20.000đ)' },
          { bg:'#fce7f3', border:'#f472b6', color:'#9d174d', label: t('Ghế đôi (Couple - x2)','Couple seat (x2)',lang) },
          { bg:'#1e3a5f', border:'#1e3a5f', color:'#f4c04a', label: t('Đang chọn','Selected',lang) },
          { bg:'#e2e8f0', border:'#cbd5e1', color:'#94a3b8', label: t('Đã bán','Taken',lang) },
        ].map(item => (
          <div key={item.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#64748b' }}>
            <div style={{ width:22, height:16, background:item.bg, border:`1.5px solid ${item.border}`, borderRadius:'4px 4px 6px 6px', flexShrink:0 }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Screen */}
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <div style={{ width:'80%', maxWidth:600, height:18, background:'linear-gradient(90deg,#94a3b8,#e2e8f0,#94a3b8)', borderRadius:'50% 50% 0 0 / 100% 100% 0 0', margin:'0 auto 8px', boxShadow:'0 6px 18px rgba(13,27,46,0.12)' }} />
        <span style={{ fontSize:10, letterSpacing:4, color:'#94a3b8', fontWeight:700 }}>{t('MÀN HÌNH CHIẾU','SCREEN',lang)}</span>
      </div>

      {/* Seat grid */}
      {seatsLoading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'48px 0' }}>
          <div style={{ width:40, height:40, border:'3px solid #e2e8f0', borderTop:'3px solid #0d1b2e', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          <p style={{ color:'#94a3b8', marginTop:12, fontSize:13 }}>{t('Đang tải sơ đồ ghế...','Loading seats...',lang)}</p>
        </div>
      ) : (
        <div style={{ overflowX:'auto', paddingBottom:8 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:460 }}>
            {sortedRows.map((row: string) => (
              <div key={row} style={{ display:'flex', alignItems:'center', gap:6, justifyContent:'center' }}>
                <span style={{ width:20, fontSize:11, fontWeight:800, color:'#64748b', textAlign:'center', flexShrink:0 }}>{row}</span>
                <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'nowrap' }}>
                  {(seatRows[row] as Seat[]).sort((a, b) => a.seat_number - b.seat_number).map(seat => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const c = seatColor(seat, isSelected);
                    const isDouble = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
                    const price = getSeatPrice(seat, Number(showtime.ticket_price));
                    const typeName = seat.seat_type === 'VIP' ? 'VIP' : isDouble ? t('Ghế đôi','Couple',lang) : t('Ghế thường','Standard',lang);
                    return (
                      <button
                        key={seat.id}
                        disabled={!seat.is_available}
                        onClick={() => onToggleSeat(seat)}
                        title={`${seat.seat_row}${seat.seat_number} · ${typeName} · ${fmtMoney(price)}`}
                        style={{
                          width: isDouble ? 68 : 32, height:26,
                          background:c.bg, border:`1.5px solid ${c.border}`, color:c.color,
                          borderRadius:'5px 5px 8px 8px', fontSize: isDouble ? 10 : 9.5, fontWeight:700,
                          cursor: seat.is_available ? 'pointer' : 'not-allowed',
                          padding:0, flexShrink:0,
                          transform: isSelected ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: isSelected ? '0 2px 8px rgba(30,58,95,0.35)' : 'none',
                          transition:'all 0.12s ease',
                        }}
                      >
                        {isDouble ? `ĐÔI ${seat.seat_number}` : seat.seat_number}
                      </button>
                    );
                  })}
                </div>
                <span style={{ width:20, fontSize:11, fontWeight:800, color:'#64748b', textAlign:'center', flexShrink:0 }}>{row}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div style={{ marginTop:20, padding:'12px 16px', background:'#fff', borderRadius:10, border:'1px solid #e2e8f0', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
        <div style={{ fontSize:12, color:'#64748b' }}>
          {selectedSeatIds.length > 0
            ? <>{t('Đã chọn','Selected',lang)}: <strong style={{ color:'#0d1b2e' }}>{(seats as Seat[]).filter((s: Seat) => selectedSeatIds.includes(s.id)).map((s: Seat) => `${s.seat_row}${s.seat_number}`).join(', ')}</strong> ({selectedSeatIds.length} {t('ghế','seats',lang)})</>
            : t('Chưa chọn ghế nào','No seats selected',lang)}
        </div>
        <div style={{ fontSize:12, color:'#64748b' }}>
          {t('Thường:','Standard:',lang)} <strong>{fmtMoney(Number(showtime.ticket_price))}</strong>
          {' · '}VIP: <strong>{fmtMoney(Number(showtime.ticket_price) + 20000)}</strong>
          {' · '}{t('Đôi:','Couple:',lang)} <strong>{fmtMoney(Number(showtime.ticket_price) * 2)}</strong>
        </div>
      </div>

      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

/* ═══════════════════════════════ STEP 3 ═══════════════════════════════ */
function PaymentStep({ lang, movie, showtime, theater, selectedSeats, subtotal, discount, totalFinal, voucherCode, setVoucherCode, voucherInfo, voucherError, voucherLoading, onApplyVoucher, onRemoveVoucher, payMethod, setPayMethod, user, error, onBack, VIP_SURCHARGE }: any) {
  const ticketPrice = showtime.ticket_price;
  const PAY_METHODS = [
    { id:'cash',       icon:<Ticket size={18}/>,      label:t('Tiền mặt tại quầy','Cash at counter',lang) },
    { id:'qr_vnpay',   icon:<QrCode size={18}/>,      label:'VNPay QR' },
    { id:'qr_momo',    icon:<Smartphone size={18}/>,  label:'MoMo' },
    { id:'qr_zalopay', icon:<Zap size={18}/>,         label:'ZaloPay' },
    { id:'card',       icon:<CreditCard size={18}/>,  label:t('Thẻ ngân hàng','Bank card',lang) },
  ];

  return (
    <div style={{ maxWidth:700 }}>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, border:0, background:'transparent', color:'#64748b', cursor:'pointer', fontSize:13, marginBottom:20, padding:0 }}>
        <ChevronLeft size={15} /> {t('Quay lại chọn ghế','Back to seat selection',lang)}
      </button>

      {/* Order summary */}
      <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e2e8f0', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#0d1b2e', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
          <Ticket size={14} color="#f4c04a" /> {t('Thông tin đặt vé','Booking summary',lang)}
        </h2>
        <div style={{ display:'flex', gap:14 }}>
          {(movie.poster||movie.posterUrl) && (
            <img src={movie.poster||movie.posterUrl} alt="" style={{ width:60, height:84, objectFit:'cover', borderRadius:8, flexShrink:0 }}
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          )}
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:900, color:'#0d1b2e', marginBottom:8 }}>{movie.title}</div>
            {[
              { icon:<MapPin size={13} color="#f4c04a"/>, v: theater||showtime.theater_name },
              { icon:<Film size={13} color="#f4c04a"/>, v: showtime.screen_name },
              { icon:<Calendar size={13} color="#f4c04a"/>, v: fmtDateFull(showtime.starts_at, lang) },
            ].map((r,i) => (
              <div key={i} style={{ display:'flex', gap:7, fontSize:12, color:'#475569', marginBottom:4 }}>
                {r.icon} <span>{r.v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Seats */}
        <div style={{ marginTop:14, padding:'12px 14px', background:'#f8fafc', borderRadius:9, border:'1px solid #e2e8f0' }}>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, marginBottom:8, textTransform:'uppercase' }}>{t('Ghế đã chọn','Selected seats',lang)}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {selectedSeats.map((s: Seat) => {
              const isCpl = s.seat_type === 'COUPLE' || s.seat_type === 'DOUBLE';
              const isVip = s.seat_type === 'VIP';
              return (
                <span key={s.id} style={{ padding:'4px 10px', borderRadius:99, fontSize:12, fontWeight:700, background: isVip ? '#fef9c3' : isCpl ? '#fce7f3' : '#e0e7ff', border:'1px solid', borderColor: isVip ? '#fbbf24' : isCpl ? '#f472b6' : '#a5b4fc', color: isVip ? '#92400e' : isCpl ? '#9d174d' : '#3730a3' }}>
                  {s.seat_row}{s.seat_number} {isVip ? ' (VIP)' : isCpl ? t(' (Đôi)',' (Couple)',lang) : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Voucher */}
      <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e2e8f0', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#0d1b2e', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
          <Gift size={14} color="#f4c04a" /> {t('Mã giảm giá','Promo code',lang)}
        </h2>
        {voucherInfo ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f0fdf4', borderRadius:8, border:'1px solid #86efac' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Tag size={14} color="#16a34a" />
              <div>
                <div style={{ fontSize:13, fontWeight:800, color:'#15803d' }}>{voucherCode.toUpperCase()}</div>
                <div style={{ fontSize:11, color:'#16a34a' }}>{voucherInfo.desc} · Giảm {fmtMoney(voucherInfo.discount)}</div>
              </div>
            </div>
            <button onClick={onRemoveVoucher} style={{ border:0, background:'transparent', cursor:'pointer', color:'#94a3b8' }}>
              <X size={16} />
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <input
              value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && onApplyVoucher()}
              placeholder={t('Nhập mã voucher (vd: AURORA10)','Enter promo code (e.g. AURORA10)',lang)}
              style={{ flex:1, padding:'10px 14px', border:'1px solid #e2e8f0', borderRadius:8, fontSize:13, outline:'none', fontFamily:'inherit' }}
            />
            <button onClick={onApplyVoucher} disabled={voucherLoading || !voucherCode.trim()} style={{ padding:'10px 18px', background:'#0d1b2e', color:'#f4c04a', border:0, borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', opacity: voucherLoading || !voucherCode.trim() ? 0.6 : 1 }}>
              {voucherLoading ? '...' : t('Áp dụng','Apply',lang)}
            </button>
          </div>
        )}
        {voucherError && <div style={{ marginTop:8, fontSize:12, color:'#dc2626' }}>{voucherError}</div>}
        <div style={{ marginTop:10, fontSize:11, color:'#94a3b8' }}>💡 {t('Thử: AURORA10, AURORA50K, WELCOME, GOLD20','Try: AURORA10, AURORA50K, WELCOME, GOLD20',lang)}</div>
      </div>

      {/* Payment method */}
      <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e2e8f0', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#0d1b2e', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
          <CreditCard size={14} color="#f4c04a" /> {t('Phương thức thanh toán','Payment method',lang)}
        </h2>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {PAY_METHODS.map(pm => (
            <label key={pm.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:10, border: `1.5px solid ${payMethod===pm.id ? '#0d1b2e' : '#e2e8f0'}`, background: payMethod===pm.id ? '#f8fafc' : '#fff', cursor:'pointer', transition:'all 0.15s' }}>
              <input type="radio" name="pay" value={pm.id} checked={payMethod===pm.id} onChange={() => setPayMethod(pm.id)} style={{ accentColor:'#0d1b2e' }} />
              <span style={{ color: payMethod===pm.id ? '#0d1b2e' : '#64748b' }}>{pm.icon}</span>
              <span style={{ fontSize:13, fontWeight: payMethod===pm.id ? 700 : 500, color: payMethod===pm.id ? '#0d1b2e' : '#475569' }}>{pm.label}</span>
              {payMethod===pm.id && pm.id !== 'cash' && (
                <span style={{ marginLeft:'auto', fontSize:10, fontWeight:700, color:'#64748b' }}>{t('(Demo)','(Demo)',lang)}</span>
              )}
            </label>
          ))}
        </div>

        {/* QR placeholder */}
        {payMethod.startsWith('qr_') && (
          <div style={{ marginTop:14, padding:'20px', background:'#f8fafc', borderRadius:10, border:'1px dashed #e2e8f0', textAlign:'center' }}>
            <QrCode size={80} color="#e2e8f0" style={{ margin:'0 auto 8px' }} />
            <p style={{ fontSize:12, color:'#94a3b8', margin:0 }}>{t('QR code sẽ hiển thị sau khi xác nhận đơn hàng.','QR code will appear after order confirmation.',lang)}</p>
          </div>
        )}
      </div>

      {/* User info */}
      {user && (
        <div style={{ background:'#fff', borderRadius:14, padding:'18px 20px', border:'1px solid #e2e8f0', marginBottom:20, boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize:13, fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, color:'#0d1b2e', margin:'0 0 14px', display:'flex', alignItems:'center', gap:6 }}>
            <User size={14} color="#f4c04a" /> {t('Thông tin người đặt','Customer info',lang)}
          </h2>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {[{ label:t('Họ tên','Name',lang), val:user.fullName }, { label:'Email', val:user.email }].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                <span style={{ color:'#64748b' }}>{r.label}</span>
                <strong style={{ color:'#0d1b2e' }}>{r.val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing summary */}
      <div style={{ background:'#f8fafc', borderRadius:14, padding:'16px 20px', border:'1px solid #e2e8f0' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {selectedSeats.map((s: Seat) => (
            <div key={s.id} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'#64748b' }}>{t('Ghế','Seat',lang)} {s.seat_row}{s.seat_number} ({s.seat_type==='VIP'?'VIP':s.seat_type==='DOUBLE'?t('Đôi','Double',lang):t('Thường','Std',lang)})</span>
              <span style={{ fontWeight:600 }}>{fmtMoney(ticketPrice + (s.seat_type==='VIP'?VIP_SURCHARGE:0))}</span>
            </div>
          ))}
          {discount > 0 && (
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
              <span style={{ color:'#16a34a' }}>🏷 {t('Giảm giá voucher','Voucher discount',lang)}</span>
              <span style={{ fontWeight:700, color:'#16a34a' }}>-{fmtMoney(discount)}</span>
            </div>
          )}
          <div style={{ height:1, background:'#e2e8f0', margin:'4px 0' }} />
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:17, fontWeight:900 }}>
            <span>{t('TỔNG CỘNG','TOTAL',lang)}</span>
            <span style={{ color:'#0d1b2e' }}>{fmtMoney(totalFinal)}</span>
          </div>
        </div>
      </div>

      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

/* ═══════════════════════════════ STEP 4 ═══════════════════════════════ */
function SuccessStep({ booking, movie, showtime, theater, selectedSeats, totalFinal, lang, onClose }: any) {
  // Tạo QR data string đơn giản
  const qrData = `AURORA:${booking.code}:${movie.title}:${showtime?.starts_at||''}`;

  return (
    <div style={{ maxWidth:640, margin:'0 auto' }}>
      {/* Header success */}
      <div style={{ textAlign:'center', marginBottom:28 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'linear-gradient(135deg,#dcfce7,#bbf7d0)', color:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(22,163,74,0.25)' }}>
          <Check size={40} strokeWidth={3} />
        </div>
        <div style={{ fontSize:10, fontWeight:900, letterSpacing:3, color:'#94a3b8', marginBottom:6 }}>AURORA CINEMA</div>
        <h1 style={{ fontSize:26, fontWeight:900, color:'#0d1b2e', margin:'0 0 8px' }}>
          {t('ĐẶT VÉ THÀNH CÔNG!','BOOKING CONFIRMED!',lang)}
        </h1>
        <p style={{ color:'#64748b', fontSize:14, margin:0 }}>
          {t('Vé của bạn đã được xác nhận. Vui lòng xuất trình mã vé khi đến rạp.','Your ticket is confirmed. Please show the code at the cinema.',lang)}
        </p>
      </div>

      {/* Ticket card */}
      <div style={{ background:'#fff', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.12)', marginBottom:24 }}>
        {/* Top: phim + mã */}
        <div style={{ background:'linear-gradient(135deg,#0d1b2e,#1e3a5f)', padding:'20px 24px', color:'#fff' }}>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            {(movie.poster||movie.posterUrl) && (
              <img src={movie.poster||movie.posterUrl} alt="" style={{ width:60, height:84, objectFit:'cover', borderRadius:8, flexShrink:0 }}
                onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
            )}
            <div>
              <div style={{ fontSize:10, color:'#9ab5cc', letterSpacing:1, marginBottom:4 }}>AURORA CINEMA · VÉ XEM PHIM</div>
              <div style={{ fontSize:18, fontWeight:900, marginBottom:6 }}>{movie.title}</div>
              <div style={{ fontSize:11, color:'#9ab5cc', display:'flex', gap:10 }}>
                {movie.format && <span>{movie.format}</span>}
                {(movie.ageRating||movie.rating) && <span style={{ background:ratingColor(movie.ageRating||movie.rating), color:'#fff', padding:'1px 6px', borderRadius:4 }}>{movie.ageRating||movie.rating}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Dashed divider */}
        <div style={{ position:'relative', height:0, background:'#fff' }}>
          <div style={{ position:'absolute', left:-16, width:32, height:32, borderRadius:'50%', background:'#f1f5f9', top:-16, zIndex:1 }} />
          <div style={{ position:'absolute', right:-16, width:32, height:32, borderRadius:'50%', background:'#f1f5f9', top:-16, zIndex:1 }} />
          <div style={{ borderTop:'2px dashed #e2e8f0', margin:'0 24px' }} />
        </div>

        {/* Body */}
        <div style={{ padding:'24px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px 24px' }}>
          {[
            { label:t('Mã vé','Booking code',lang), val: booking.code, big:true, gold:true },
            { label:t('Ghế','Seats',lang), val: selectedSeats.map((s: Seat) => `${s.seat_row}${s.seat_number}`).join(', '), big:false, gold:false },
            { label:t('Rạp','Cinema',lang), val: theater||showtime?.theater_name, big:false, gold:false },
            { label:t('Phòng','Screen',lang), val: showtime?.screen_name, big:false, gold:false },
            { label:t('Ngày','Date',lang), val: fmtDateFull(showtime?.starts_at||'', lang), big:false, gold:false },
            { label:t('Tổng tiền','Total',lang), val: fmtMoney(totalFinal), big:false, gold:true },
          ].map(r => (
            <div key={r.label}>
              <div style={{ fontSize:10, fontWeight:600, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{r.label}</div>
              <div style={{ fontSize: r.big ? 17 : 13, fontWeight: r.big ? 900 : 700, color: r.gold ? '#b8860b' : '#0d1b2e', letterSpacing: r.big ? 1 : 0 }}>{r.val}</div>
            </div>
          ))}
        </div>

        {/* QR code section */}
        <div style={{ padding:'16px 24px', background:'#f8fafc', borderTop:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:16 }}>
          {/* Simple QR visual placeholder */}
          <div style={{ width:80, height:80, background:'#fff', border:'2px solid #e2e8f0', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <QrCode size={52} color="#0d1b2e" />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#0d1b2e', marginBottom:4 }}>{t('Quét mã QR để vào rạp','Scan QR code at entrance',lang)}</div>
            <div style={{ fontSize:11, color:'#94a3b8', lineHeight:1.5 }}>
              {t('Hoặc xuất trình mã vé: ','Or show booking code: ',lang)}
              <strong style={{ color:'#b8860b', letterSpacing:1 }}>{booking.code}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
        <button onClick={onClose} style={{ flex:1, minWidth:160, padding:'13px 20px', border:0, borderRadius:10, background:'linear-gradient(135deg,#0d1b2e,#1e3a5f)', color:'#f4c04a', fontWeight:900, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 16px rgba(13,27,46,0.3)' }}>
          <Ticket size={16} /> {t('VỀ TRANG CHỦ','HOME',lang)}
        </button>
        <button onClick={onClose} style={{ flex:1, minWidth:160, padding:'13px 20px', border:'1.5px solid #e2e8f0', borderRadius:10, background:'#fff', color:'#0d1b2e', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <Film size={16} /> {t('ĐẶT VÉ KHÁC','BOOK AGAIN',lang)}
        </button>
      </div>
    </div>
  );
}

/* ─── Shared styles ─── */
const errStyle: React.CSSProperties = {
  marginTop:14, padding:'10px 14px',
  background:'#fef2f2', border:'1px solid #fecaca',
  borderRadius:8, fontSize:12.5, color:'#b91c1c',
};
