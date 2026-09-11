import { Check, Clock, Film, MapPin, Star, Ticket, User, X, ChevronLeft } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';
const BOOKING_SECONDS = 600; // 10 phút

type Props = {
  movie: any;
  theater: string;
  showtime: any;
  user: any;
  language: 'vi' | 'en';
  onClose: () => void;
  onRequireLogin: () => void;
};

type Seat = {
  id: number;
  seat_row: string;
  seat_number: number;
  seat_type: 'STANDARD' | 'VIP' | 'DOUBLE';
  is_available: number;
};

type Step = 'seats' | 'confirm' | 'success';

export default function BookingModal({ movie, theater, showtime, user, language, onClose, onRequireLogin }: Props) {
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('seats');
  const [timeLeft, setTimeLeft] = useState(BOOKING_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'vnpay' | 'momo' | 'counter'>('counter');
  const [voucher, setVoucher] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (vi: string, en: string) => language === 'en' ? en : vi;

  // Tải sơ đồ ghế
  useEffect(() => {
    fetch(`${API_URL}?action=showtime_seats&showtime_id=${showtime.id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(result => setSeats(result.seats || []))
      .catch(() => setError(t('Không thể tải sơ đồ ghế.', 'Failed to load seat map.')))
      .finally(() => setLoading(false));
  }, [showtime.id]);

  // Countdown timer
  useEffect(() => {
    if (step === 'success') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [step]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const selectedSeats = seats.filter(s => selected.includes(s.id));
  const ticketPrice = Number(showtime.ticket_price) || 0;
  const vipSurcharge = 30000;
  const total = selectedSeats.reduce((sum, s) => sum + ticketPrice + (s.seat_type === 'VIP' ? vipSurcharge : 0), 0);

  // Nhóm ghế theo hàng
  const seatRows = seats.reduce<Record<string, Seat[]>>((acc, seat) => {
    (acc[seat.seat_row] ||= []).push(seat);
    return acc;
  }, {});
  const sortedRows = Object.keys(seatRows).sort();

  function toggleSeat(seat: Seat) {
    if (!seat.is_available) return;
    setSelected(prev => prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]);
  }

  async function submitBooking() {
    if (!user) { onRequireLogin(); return; }
    if (!selected.length) { setError(t('Vui lòng chọn ít nhất một ghế.', 'Please select at least one seat.')); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}?action=bookings`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showtimeId: showtime.id, seatIds: selected, paymentMethod, voucherCode: voucher.trim() || undefined })
      });
      const result = await res.json();
      if (!res.ok) { setError(result.message || t('Không thể đặt vé.', 'Booking failed.')); return; }
      setSuccess(result.booking);
      setStep('success');
      clearInterval(timerRef.current!);
    } finally {
      setSubmitting(false);
    }
  }

  const formatDatetime = (dt: string) => {
    try {
      const d = new Date(dt.replace(' ', 'T'));
      return d.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dt; }
  };

  // ────── SUCCESS ──────
  if (step === 'success' && success) {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
          <div style={styles.successWrap}>
            <div style={styles.successIcon}><Check size={44} strokeWidth={3} /></div>
            <div style={styles.successBadge}>AURORA CINEMA</div>
            <h2 style={styles.successTitle}>{t('ĐẶT VÉ THÀNH CÔNG!', 'BOOKING SUCCESSFUL!')}</h2>
            <p style={styles.successSub}>{t('Vé của bạn đã được xác nhận.', 'Your ticket has been confirmed.')}</p>

            <div style={styles.ticketCard}>
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Mã vé', 'Booking code')}</span>
                <span style={styles.ticketCode}>{success.code || success.id}</span>
              </div>
              <div style={styles.ticketDivider} />
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Phim', 'Movie')}</span>
                <span style={styles.ticketVal}>{movie.title}</span>
              </div>
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Rạp', 'Cinema')}</span>
                <span style={styles.ticketVal}>{theater}</span>
              </div>
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Phòng', 'Screen')}</span>
                <span style={styles.ticketVal}>{showtime.screen_name}</span>
              </div>
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Suất chiếu', 'Showtime')}</span>
                <span style={styles.ticketVal}>{formatDatetime(showtime.starts_at)}</span>
              </div>
              <div style={styles.ticketRow}>
                <span style={styles.ticketLabel}>{t('Ghế', 'Seats')}</span>
                <span style={{ ...styles.ticketVal, color: '#b8860b', fontWeight: 800 }}>
                  {selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')}
                </span>
              </div>
              <div style={styles.ticketDivider} />
              <div style={styles.ticketRow}>
                <span style={{ ...styles.ticketLabel, fontSize: 14, fontWeight: 700 }}>{t('Tổng tiền', 'Total')}</span>
                <span style={{ ...styles.ticketCode, fontSize: 20 }}>{total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <p style={{ color: '#64748b', fontSize: 12, marginTop: 16, lineHeight: 1.6, textAlign: 'center' }}>
              {t('Vui lòng xuất trình mã vé khi đến rạp. Vé không hoàn tiền sau khi thanh toán.', 'Please show this code at the cinema. Tickets are non-refundable after payment.')}
            </p>
            <button style={styles.primaryBtn} onClick={onClose}>
              <Ticket size={16} /> {t('HOÀN TẤT', 'DONE')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ────── CONFIRM ──────
  if (step === 'confirm') {
    return (
      <div style={styles.overlay}>
        <div style={{ ...styles.modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
          <button style={styles.closeBtn} onClick={onClose} aria-label="Đóng"><X size={18} /></button>
          <div style={styles.sectionBadge}><Ticket size={13} /> {t('XÁC NHẬN ĐẶT VÉ', 'CONFIRM BOOKING')}</div>
          <h2 style={styles.movieTitle}>{movie.title}</h2>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}><MapPin size={14} color="#f4c04a" /><span>{theater}</span></div>
            <div style={styles.infoItem}><Film size={14} color="#f4c04a" /><span>{showtime.screen_name}</span></div>
            <div style={styles.infoItem}><Clock size={14} color="#f4c04a" /><span>{formatDatetime(showtime.starts_at)}</span></div>
            <div style={styles.infoItem}><User size={14} color="#f4c04a" /><span>{user?.fullName || t('Khách', 'Guest')}</span></div>
          </div>

          <div style={styles.seatsConfirmBox}>
            <div style={styles.seatsConfirmTitle}>{t('Ghế đã chọn:', 'Selected seats:')}</div>
            <div style={styles.seatsConfirmList}>
              {selectedSeats.map(seat => (
                <span key={seat.id} style={{ ...styles.seatPill, background: seat.seat_type === 'VIP' ? '#fef9c3' : seat.seat_type === 'DOUBLE' ? '#fce7f3' : '#f0f4ff', color: seat.seat_type === 'VIP' ? '#92400e' : seat.seat_type === 'DOUBLE' ? '#9d174d' : '#1e40af', borderColor: seat.seat_type === 'VIP' ? '#fbbf24' : seat.seat_type === 'DOUBLE' ? '#f472b6' : '#93c5fd' }}>
                  {seat.seat_row}{seat.seat_number}
                  <small style={{ fontSize: 9, fontWeight: 600 }}>{seat.seat_type === 'VIP' ? ' VIP' : seat.seat_type === 'DOUBLE' ? ' ĐÔI' : ''}</small>
                </span>
              ))}
            </div>
          </div>

          <div style={styles.pricingBox}>
            {selectedSeats.map(seat => (
              <div key={seat.id} style={styles.priceRow}>
                <span style={{ color: '#64748b' }}>{t('Ghế', 'Seat')} {seat.seat_row}{seat.seat_number} ({seat.seat_type === 'VIP' ? 'VIP' : seat.seat_type === 'DOUBLE' ? t('Đôi', 'Double') : t('Thường', 'Standard')})</span>
                <span style={{ fontWeight: 600 }}>{(ticketPrice + (seat.seat_type === 'VIP' ? vipSurcharge : 0)).toLocaleString('vi-VN')}đ</span>
              </div>
            ))}
            <div style={{ ...styles.priceRow, borderTop: '1.5px solid #e2e8f0', paddingTop: 12, marginTop: 4 }}>
              <strong style={{ fontSize: 15 }}>{t('Tổng cộng', 'Total')}</strong>
              <strong style={{ fontSize: 20, color: '#0d1b2e' }}>{total.toLocaleString('vi-VN')}đ</strong>
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#334155', marginBottom: 8 }}>{t('Phương thức thanh toán', 'Payment method')}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {([
                ['vnpay', 'VNPay'], ['momo', 'MoMo'], ['counter', t('Tại quầy', 'At cinema')],
              ] as const).map(([method, label]) => <button key={method} type="button" onClick={() => setPaymentMethod(method)} style={{ border: paymentMethod === method ? '2px solid #f4c04a' : '1px solid #dbe3ec', borderRadius: 8, padding: '9px 6px', background: paymentMethod === method ? '#fff9e6' : '#fff', color: '#0d1b2e', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>{label}</button>)}
            </div>
            <input value={voucher} onChange={event => setVoucher(event.target.value)} placeholder={t('Mã voucher (nếu có)', 'Voucher code (optional)')} style={{ width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '10px 12px', border: '1px solid #dbe3ec', borderRadius: 8, outline: 'none', fontSize: 12 }} />
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button style={styles.secondaryBtn} onClick={() => setStep('seats')}>
              <ChevronLeft size={15} /> {t('Quay lại', 'Back')}
            </button>
            <button style={{ ...styles.primaryBtn, flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }} onClick={submitBooking} disabled={submitting}>
              <Ticket size={16} /> {submitting ? t('Đang xử lý...', 'Processing...') : t('XÁC NHẬN & ĐẶT VÉ', 'CONFIRM & BOOK')}
            </button>
          </div>

          <div style={styles.timerBar}>
            <Clock size={13} color="#f59e0b" />
            <span style={{ color: timeLeft < 60 ? '#dc2626' : '#64748b' }}>
              {t('Thời gian giữ ghế:', 'Hold time:')} <strong style={{ color: timeLeft < 60 ? '#dc2626' : '#0d1b2e', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</strong>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ────── SEATS (main) ──────
  const timerPercent = (timeLeft / BOOKING_SECONDS) * 100;

  return (
    <div style={styles.overlay}>
      <div style={styles.bigModal} onClick={e => e.stopPropagation()}>

        {/* Close */}
        <button style={styles.closeBtn} onClick={onClose} aria-label="Đóng"><X size={18} /></button>

        {/* Left: Seat Map */}
        <div style={styles.leftPane}>

          {/* Breadcrumb */}
          <div style={styles.breadcrumb}>
            <span style={styles.breadItem}>{t('Trang chủ', 'Home')}</span>
            <span style={styles.breadSep}>›</span>
            <span style={styles.breadItem}>{t('Đặt vé', 'Book')}</span>
            <span style={styles.breadSep}>›</span>
            <span style={{ ...styles.breadItem, color: '#0d1b2e', fontWeight: 700 }}>{movie.title}</span>
          </div>

          {/* Age notice */}
          {(movie.ageRating === 'T18' || movie.ageRating === 'T16') && (
            <div style={styles.ageNotice}>
              ⚠️ {t(`Theo quy định, phim ${movie.ageRating === 'T18' ? 'chỉ dành cho khán giả từ 18 tuổi trở lên.' : 'không dành cho khán giả dưới 16 tuổi.'}`, `This film is rated ${movie.ageRating}. Age restrictions apply.`)}
            </div>
          )}

          {/* Seat legend */}
          <div style={styles.legendRow}>
            <div style={styles.legendItem}><div style={{ ...styles.seatDemo, background: '#f1f5f9', borderColor: '#cbd5e1' }} /><span>{t('Ghế trống', 'Available')}</span></div>
            <div style={styles.legendItem}><div style={{ ...styles.seatDemo, background: '#1e3a5f', borderColor: '#1e3a5f' }} /><span>{t('Đang chọn', 'Selected')}</span></div>
            <div style={styles.legendItem}><div style={{ ...styles.seatDemo, background: '#cbd5e1', borderColor: '#94a3b8' }} /><span>{t('Đã đặt', 'Taken')}</span></div>
            <div style={styles.legendItem}><div style={{ ...styles.seatDemo, background: '#fef9c3', borderColor: '#fbbf24' }} /><span>VIP</span></div>
            <div style={styles.legendItem}><div style={{ ...styles.seatDemo, background: '#fce7f3', borderColor: '#f472b6', width: 52 }} /><span>{t('Ghế đôi', 'Double')}</span></div>
          </div>

          {/* Screen */}
          <div style={styles.screenWrap}>
            <div style={styles.screenCurve} />
            <div style={styles.screenLabel}>{t('MÀN HÌNH CHIẾU', 'SCREEN')}</div>
          </div>

          {/* Seat grid */}
          <div style={styles.seatGrid}>
            {loading ? (
              <div style={styles.loadingWrap}>
                <div style={styles.spinner} />
                <p style={{ color: '#64748b', marginTop: 12 }}>{t('Đang tải sơ đồ ghế...', 'Loading seat map...')}</p>
              </div>
            ) : (
              sortedRows.map(row => (
                <div key={row} style={styles.seatRow}>
                  <span style={styles.rowLabel}>{row}</span>
                  <div style={styles.rowSeats}>
                    {seatRows[row].sort((a, b) => a.seat_number - b.seat_number).map(seat => {
                      const isSelected = selected.includes(seat.id);
                      const taken = !seat.is_available;
                      const isVip = seat.seat_type === 'VIP';
                      const isDouble = seat.seat_type === 'DOUBLE';

                      return (
                        <button
                          key={seat.id}
                          disabled={taken}
                          onClick={() => toggleSeat(seat)}
                          title={`${seat.seat_row}${seat.seat_number} · ${seat.seat_type === 'VIP' ? 'VIP' : seat.seat_type === 'DOUBLE' ? t('Ghế đôi', 'Double') : t('Ghế thường', 'Standard')}`}
                          style={{
                            ...styles.seat,
                            width: isDouble ? 58 : 30,
                            background: taken ? '#cbd5e1' : isSelected ? '#1e3a5f' : isVip ? '#fef9c3' : isDouble ? '#fce7f3' : '#f1f5f9',
                            borderColor: taken ? '#94a3b8' : isSelected ? '#1e3a5f' : isVip ? '#fbbf24' : isDouble ? '#f472b6' : '#cbd5e1',
                            color: taken ? '#94a3b8' : isSelected ? '#f4c04a' : isVip ? '#92400e' : isDouble ? '#9d174d' : '#475569',
                            cursor: taken ? 'not-allowed' : 'pointer',
                            transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                            boxShadow: isSelected ? '0 2px 8px rgba(30,58,95,0.3)' : 'none',
                          }}
                        >
                          {seat.seat_number}
                        </button>
                      );
                    })}
                  </div>
                  <span style={styles.rowLabel}>{row}</span>
                </div>
              ))
            )}
          </div>

          {/* Seat type legend at bottom */}
          <div style={styles.bottomLegend}>
            <div style={styles.legendItem2}><div style={{ ...styles.seatDemo, background: '#f1f5f9', borderColor: '#cbd5e1', width: 22 }} /><span>{t('Ghế thường', 'Standard')}</span></div>
            <div style={styles.legendItem2}><div style={{ ...styles.seatDemo, background: '#fef9c3', borderColor: '#fbbf24', width: 22 }} /><span>{t('Ghế VIP', 'VIP')}</span></div>
            <div style={styles.legendItem2}><div style={{ ...styles.seatDemo, background: '#fce7f3', borderColor: '#f472b6', width: 44 }} /><span>{t('Ghế đôi', 'Double')}</span></div>
          </div>

          {/* Bottom bar */}
          <div style={styles.bottomBar}>
            <div style={styles.totalInfo}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 2 }}>
                {selected.length > 0
                  ? `${t('Ghế:', 'Seats:')} ${selectedSeats.map(s => `${s.seat_row}${s.seat_number}`).join(', ')}`
                  : t('Chưa chọn ghế', 'No seats selected')}
              </div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#0d1b2e' }}>
                {total > 0 ? `${total.toLocaleString('vi-VN')}đ` : '0đ'}
              </div>
            </div>
            <button
              style={{ ...styles.primaryBtn, opacity: selected.length ? 1 : 0.45 }}
              onClick={() => { if (!selected.length) { setError(t('Vui lòng chọn ghế.', 'Please select seats.')); return; } setError(''); setStep('confirm'); }}
            >
              <Ticket size={16} /> {t('TIẾP TỤC', 'CONTINUE')}
            </button>
          </div>
          {error && <div style={{ ...styles.errorBox, margin: '0 0 8px' }}>{error}</div>}
        </div>

        {/* Right: Movie Info */}
        <div style={styles.rightPane}>
          {/* Timer */}
          <div style={styles.timerBox}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{t('Thời gian giữ ghế', 'Hold time')}</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: timeLeft < 60 ? '#dc2626' : '#0d1b2e', fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
            </div>
            <div style={styles.timerTrack}>
              <div style={{ ...styles.timerFill, width: `${timerPercent}%`, background: timerPercent < 20 ? '#ef4444' : timerPercent < 40 ? '#f59e0b' : '#22c55e' }} />
            </div>
          </div>

          {/* Poster */}
          {movie.poster || movie.posterUrl ? (
            <img
              src={movie.poster || movie.posterUrl}
              alt={movie.title}
              style={styles.poster}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div style={styles.posterFallback}><Film size={36} color="#94a3b8" /></div>
          )}

          {/* Movie details */}
          <div style={styles.movieInfoBlock}>
            <h3 style={styles.movieInfoTitle}>{movie.title}</h3>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
              {movie.format || '2D Digital'}
              {movie.ageRating && <span style={{ ...styles.ratingBadge, background: ratingColor(movie.ageRating) }}>{movie.ageRating}</span>}
            </div>

            <div style={styles.detailList}>
              <div style={styles.detailRow}>
                <span style={styles.detailIcon}><Star size={12} /></span>
                <span style={styles.detailLabel}>{t('Thể loại', 'Genre')}</span>
                <span style={styles.detailValue}>{movie.genre || '—'}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailIcon}><Clock size={12} /></span>
                <span style={styles.detailLabel}>{t('Thời lượng', 'Duration')}</span>
                <span style={styles.detailValue}>{movie.duration || movie.durationMinutes || '—'} {t('phút', 'min')}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailIcon}><MapPin size={12} /></span>
                <span style={styles.detailLabel}>{t('Rạp chiếu', 'Cinema')}</span>
                <span style={styles.detailValue}>{theater}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailIcon}><Film size={12} /></span>
                <span style={styles.detailLabel}>{t('Phòng', 'Screen')}</span>
                <span style={styles.detailValue}>{showtime.screen_name}</span>
              </div>
              <div style={styles.detailRow}>
                <span style={styles.detailIcon}><Clock size={12} /></span>
                <span style={styles.detailLabel}>{t('Ngày chiếu', 'Date')}</span>
                <span style={styles.detailValue}>{formatDatetime(showtime.starts_at)}</span>
              </div>
            </div>

            {/* Price info */}
            <div style={styles.priceInfoBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{t('Ghế thường', 'Standard')}</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{ticketPrice.toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>VIP</span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{(ticketPrice + vipSurcharge).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            {/* Selected summary */}
            {selected.length > 0 && (
              <div style={styles.selectedSummary}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{t('Ghế đã chọn', 'Selected seats')}: <strong>{selected.length}</strong></div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#0d1b2e' }}>{total.toLocaleString('vi-VN')}đ</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ratingColor(r: string) {
  if (r === 'P') return '#16a34a';
  if (r === 'K') return '#d97706';
  if (r === 'T13') return '#ea580c';
  if (r === 'T16') return '#dc2626';
  if (r === 'T18') return '#991b1b';
  return '#64748b';
}

// ────── STYLES ──────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    width: '100%', minHeight: 'calc(100vh - 96px)',
    background: '#f3f6fa',
    display: 'flex', alignItems: 'stretch', justifyContent: 'center',
    padding: '28px 16px 44px', boxSizing: 'border-box',
  },
  bigModal: {
    width: 'min(1280px, 100%)',
    minHeight: 640,
    display: 'flex',
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(13,27,46,0.12)',
    position: 'relative',
  },
  modal: {
    width: 'min(720px, 100%)',
    minHeight: 520,
    overflowY: 'auto',
    background: '#fff',
    borderRadius: 16,
    padding: 28,
    position: 'relative',
    boxShadow: '0 12px 32px rgba(13,27,46,0.12)',
  },
  leftPane: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 20px 0',
    display: 'flex',
    flexDirection: 'column',
    background: '#f8fafc',
  },
  rightPane: {
    width: 240,
    flexShrink: 0,
    background: '#fff',
    borderLeft: '1px solid #e2e8f0',
    overflowY: 'auto',
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, zIndex: 10,
    border: 0, background: 'rgba(255,255,255,0.9)',
    borderRadius: '50%', width: 34, height: 34,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    color: '#475569',
  },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, fontSize: 12, color: '#64748b' },
  breadItem: { cursor: 'pointer', color: '#64748b' },
  breadSep: { color: '#94a3b8' },
  ageNotice: {
    background: '#fffbeb', border: '1px solid #fde68a',
    borderRadius: 8, padding: '8px 12px',
    fontSize: 11.5, color: '#92400e', marginBottom: 12, lineHeight: 1.5,
  },
  legendRow: {
    display: 'flex', flexWrap: 'wrap', gap: 14,
    marginBottom: 14, fontSize: 11, color: '#64748b',
    alignItems: 'center',
  },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5 },
  legendItem2: { display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748b' },
  seatDemo: {
    width: 18, height: 14,
    border: '1.5px solid', borderRadius: '4px 4px 6px 6px',
    flexShrink: 0,
  },
  screenWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 },
  screenCurve: {
    width: '88%', height: 14,
    background: 'linear-gradient(90deg, #b0bec5, #eceff1, #b0bec5)',
    borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
    boxShadow: '0 4px 14px rgba(13,27,46,0.12)',
    marginBottom: 6,
  },
  screenLabel: {
    fontSize: 10, letterSpacing: 3, color: '#94a3b8',
    fontWeight: 700, marginTop: 4,
  },
  seatGrid: {
    flex: 1, overflowX: 'auto',
    display: 'flex', flexDirection: 'column', gap: 5,
    paddingBottom: 8,
  },
  seatRow: {
    display: 'flex', alignItems: 'center',
    gap: 4, justifyContent: 'center', minWidth: 400,
  },
  rowLabel: {
    width: 18, fontSize: 10, fontWeight: 800,
    color: '#94a3b8', textAlign: 'center', flexShrink: 0,
  },
  rowSeats: { display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  seat: {
    height: 24, border: '1.5px solid',
    borderRadius: '5px 5px 8px 8px',
    fontSize: 8.5, cursor: 'pointer',
    padding: 0, fontWeight: 700,
    transition: 'all 0.12s ease',
    flexShrink: 0,
  },
  loadingWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '48px 0',
  },
  spinner: {
    width: 36, height: 36,
    border: '3px solid #e2e8f0',
    borderTop: '3px solid #0d1b2e',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  bottomLegend: {
    display: 'flex', gap: 18, justifyContent: 'center',
    marginTop: 12, marginBottom: 8,
  },
  bottomBar: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 12,
    borderTop: '1px solid #e2e8f0',
    padding: '12px 0', marginTop: 8,
    background: '#f8fafc',
  },
  totalInfo: { flex: 1 },
  primaryBtn: {
    border: 0, borderRadius: 10,
    padding: '12px 20px',
    background: 'linear-gradient(135deg, #0d1b2e 0%, #1e3a5f 100%)',
    color: '#f4c04a', fontWeight: 900, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 13, letterSpacing: 0.5,
    transition: 'transform 0.12s, box-shadow 0.12s',
    boxShadow: '0 4px 16px rgba(13,27,46,0.3)',
    flexShrink: 0,
  },
  secondaryBtn: {
    border: '1.5px solid #e2e8f0', borderRadius: 10,
    padding: '11px 16px',
    background: '#fff', color: '#0d1b2e',
    fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 13, flexShrink: 0,
  },
  errorBox: {
    marginTop: 8, color: '#b91c1c',
    background: '#fef2f2',
    padding: '9px 12px', borderRadius: 8,
    fontSize: 12, border: '1px solid #fecaca',
  },
  // Right pane
  timerBox: {
    background: '#f8fafc', borderRadius: 10,
    padding: '12px 14px', border: '1px solid #e2e8f0',
  },
  timerTrack: {
    height: 6, background: '#e2e8f0',
    borderRadius: 99, overflow: 'hidden',
  },
  timerFill: {
    height: '100%', borderRadius: 99,
    transition: 'width 1s linear, background 0.5s',
  },
  poster: {
    width: '100%', aspectRatio: '2/3',
    objectFit: 'cover', borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
  },
  posterFallback: {
    width: '100%', aspectRatio: '2/3',
    background: '#f1f5f9', borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  movieInfoBlock: { display: 'flex', flexDirection: 'column', gap: 0 },
  movieInfoTitle: {
    fontSize: 14, fontWeight: 900,
    color: '#0d1b2e', margin: '0 0 6px', lineHeight: 1.35,
  },
  ratingBadge: {
    display: 'inline-block',
    color: '#fff', fontSize: 9, fontWeight: 900,
    padding: '2px 5px', borderRadius: 4,
    marginLeft: 6, verticalAlign: 'middle',
  },
  detailList: { display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 },
  detailRow: { display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5 },
  detailIcon: { color: '#94a3b8', flexShrink: 0, marginTop: 1 },
  detailLabel: { color: '#94a3b8', width: 64, flexShrink: 0 },
  detailValue: { color: '#1a2332', fontWeight: 600, flex: 1, lineHeight: 1.4 },
  priceInfoBox: {
    marginTop: 14, background: '#f8fafc',
    borderRadius: 8, padding: '10px 12px',
    border: '1px solid #e2e8f0',
  },
  selectedSummary: {
    marginTop: 12, background: '#fff9e6',
    borderRadius: 8, padding: '10px 12px',
    border: '1px solid #fde68a',
  },
  // Confirm step
  sectionBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: '#fff9e6', color: '#b8860b',
    fontSize: 10, fontWeight: 900, letterSpacing: 1,
    padding: '4px 10px', borderRadius: 99,
    border: '1px solid #fde68a', marginBottom: 10,
  },
  movieTitle: { fontSize: 20, fontWeight: 900, color: '#0d1b2e', margin: '0 0 14px' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 },
  infoItem: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12.5, color: '#1a2332',
    background: '#f8fafc', borderRadius: 8, padding: '8px 12px',
    border: '1px solid #e2e8f0',
  },
  seatsConfirmBox: { marginBottom: 16 },
  seatsConfirmTitle: { fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 },
  seatsConfirmList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  seatPill: {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    padding: '5px 10px', borderRadius: 99,
    border: '1.5px solid', fontSize: 12, fontWeight: 700,
  },
  pricingBox: {
    background: '#f8fafc', borderRadius: 10,
    padding: '14px 16px', border: '1px solid #e2e8f0',
    display: 'flex', flexDirection: 'column', gap: 8,
    marginBottom: 4,
  },
  priceRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 },
  timerBar: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#64748b', marginTop: 12,
    justifyContent: 'center',
  },
  // Success
  successWrap: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', padding: '32px 12px 16px',
  },
  successIcon: {
    width: 80, height: 80, borderRadius: '50%',
    background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
    color: '#16a34a', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    boxShadow: '0 8px 24px rgba(22,163,74,0.25)',
  },
  successBadge: {
    fontSize: 10, fontWeight: 900, letterSpacing: 2,
    color: '#b8860b', marginBottom: 8,
  },
  successTitle: {
    fontSize: 22, fontWeight: 900, color: '#0d1b2e',
    margin: '0 0 8px', textAlign: 'center',
  },
  successSub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  ticketCard: {
    width: '100%', background: '#fff',
    border: '1.5px solid #e2e8f0', borderRadius: 14,
    overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  },
  ticketRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '10px 16px', gap: 12,
    borderBottom: '1px solid #f1f5f9',
  },
  ticketLabel: { fontSize: 12, color: '#94a3b8', fontWeight: 600, flexShrink: 0 },
  ticketCode: { fontSize: 15, fontWeight: 900, color: '#0d1b2e', letterSpacing: 1 },
  ticketVal: { fontSize: 13, color: '#1a2332', fontWeight: 600, textAlign: 'right' },
  ticketDivider: { height: 1, background: '#f1f5f9', margin: '4px 0' },
};
