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
  AlertCircle, ArrowLeft, Calendar, Check, ChevronLeft, ChevronRight,
  Clock, CreditCard, Film, Gift, Info, MapPin, QrCode,
  RefreshCw, ShieldCheck, Smartphone, Sparkles, Star, Tag, Ticket, User, X, Zap,
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
type Combo = { id: string; name: string; price: number; description: string };

const COMBOS: Combo[] = [
  { id: 'popcorn_cola', name: 'Combo Bắp nước', price: 79000, description: '1 bắp ngọt lớn + 1 Coca-Cola 22oz' },
  { id: 'cheese_pair', name: 'Combo Đôi', price: 129000, description: '1 bắp phô mai lớn + 2 nước 22oz' },
  { id: 'family_feast', name: 'Combo Gia đình', price: 189000, description: '1 bắp caramel lớn + 3 nước 22oz + 2 xúc xích' },
];

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
function StepBar({ step, lang, onGoStep }: { step: Step; lang: Lang; onGoStep?: (s: Step) => void }) {
  const steps = [
    { n: 1 as Step, label: t('Suất chiếu', 'Showtime', lang) },
    { n: 2 as Step, label: t('Chọn ghế', 'Seats', lang) },
    { n: 3 as Step, label: t('Thanh toán', 'Payment', lang) },
    { n: 4 as Step, label: t('Hoàn tất', 'Done', lang) },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '4px 8px' }}>
      {steps.map(({ n, label }, i) => {
        const done = step > n;
        const active = step === n;
        const clickable = done && onGoStep;

        return (
          <div key={n} style={{ display: 'flex', alignItems: 'center', flex: i < 3 ? 1 : 0 }}>
            <div
              onClick={() => clickable && onGoStep(n)}
              title={clickable ? t(`Nhấp để quay lại: ${label}`, `Click to return to: ${label}`, lang) : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                cursor: clickable ? 'pointer' : 'default',
                userSelect: 'none',
                position: 'relative',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: done
                  ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                  : active
                  ? 'linear-gradient(135deg, #0d1b2e, #1e3a5f)'
                  : '#f8fafc',
                color: done || active ? '#ffffff' : '#94a3b8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800,
                border: active
                  ? '2px solid #f4c04a'
                  : done
                  ? '2px solid #22c55e'
                  : '1.5px solid #cbd5e1',
                boxShadow: active
                  ? '0 0 0 4px rgba(244,192,74,0.25), 0 4px 14px rgba(13,27,46,0.25)'
                  : done
                  ? '0 2px 8px rgba(34,197,94,0.25)'
                  : 'none',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: active ? 'scale(1.06)' : 'scale(1)',
              }}>
                {done ? <Check size={16} strokeWidth={3} /> : n}
              </div>
              <span style={{
                fontSize: 11.5,
                fontWeight: active ? 800 : done ? 700 : 500,
                color: active ? '#0d1b2e' : done ? '#15803d' : '#94a3b8',
                whiteSpace: 'nowrap',
                transition: 'color 0.2s',
                display: 'flex', alignItems: 'center', gap: 3
              }}>
                {label}
                {clickable && <span style={{ fontSize: 9, opacity: 0.6 }}>↩</span>}
              </span>
            </div>
            {i < 3 && (
              <div style={{
                flex: 1, height: 3,
                background: done
                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : '#e2e8f0',
                margin: '0 10px', marginBottom: 22,
                borderRadius: 99,
                transition: 'background 0.3s ease',
              }} />
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
  discount, comboItems, comboTotal, totalAfterDiscount, timeLeft, step, lang, onContinue, continueLabel, continueDisabled,
}: {
  movie: any; showtime: any; theater: string; seats: Seat[]; selectedSeats: Seat[];
  vipSurcharge: number; discount: number; comboItems: { combo: Combo; quantity: number }[]; comboTotal: number; totalAfterDiscount: number;
  timeLeft: number; step: Step; lang: Lang;
  onContinue: () => void; continueLabel: string; continueDisabled: boolean;
}) {
  const ticketPrice = Number(showtime?.ticket_price || 0);
  const subtotal = selectedSeats.reduce((s, seat) => s + getSeatPrice(seat, ticketPrice), 0);
  const isDanger = timeLeft < 60;
  const isWarn = timeLeft < 180 && !isDanger;

  return (
    <aside className="booking-summary-panel" style={{
      width: 320, flexShrink: 0,
      background: '#ffffff',
      borderLeft: '1px solid #e2e8f0',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0,
      height: 'calc(100vh - 104px)',
      overflow: 'visible',
      boxShadow: '-4px 0 20px rgba(13, 27, 46, 0.03)',
      zIndex: 10,
    }}>
      {/* Poster header */}
      <div style={{ position: 'relative', background: '#0d1b2e', minHeight: 140, flexShrink: 0 }}>
        {movie.poster || movie.posterUrl ? (
          <img
            src={movie.poster || movie.posterUrl}
            alt={movie.title}
            style={{ width: '100%', height: 140, objectFit: 'cover', opacity: 0.55 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div style={{ width: '100%', height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Film size={44} color="#475569" />
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(13,27,46,0.2) 0%, rgba(13,27,46,0.95) 100%)' }} />

        <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16 }}>
          <div style={{ fontSize: 10, color: '#f4c04a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Sparkles size={11} /> AURORA CINEMA
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#ffffff', lineHeight: 1.3, marginBottom: 6 }}>
            {movie.title}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {(movie.format || 'Dolby Atmos 4K') && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: '#dce8f5', padding: '2px 8px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
                {movie.format || 'Dolby Atmos 4K'}
              </span>
            )}
            {(movie.ageRating || movie.rating) && (
              <span style={{ fontSize: 10, fontWeight: 800, background: ratingColor(movie.ageRating || movie.rating), color: '#ffffff', padding: '2px 8px', borderRadius: 4 }}>
                {movie.ageRating || movie.rating}
              </span>
            )}
            {(movie.duration || movie.durationMinutes) && (
              <span style={{ fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>
                {movie.duration || movie.durationMinutes} {t('phút', 'min', lang)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Timer (bước 2 & 3) */}
        {step >= 2 && step < 4 && (
          <div
            className={isDanger ? 'timer-warning' : undefined}
            style={{
              background: isDanger
                ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
                : isWarn
                ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                : 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
              borderRadius: 12,
              padding: '12px 14px',
              border: `1.5px solid ${isDanger ? '#f87171' : isWarn ? '#fcd34d' : '#e2e8f0'}`,
              boxShadow: isDanger ? '0 4px 14px rgba(239, 68, 68, 0.18)' : '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color={isDanger ? '#dc2626' : isWarn ? '#d97706' : '#0d1b2e'} />
                <span style={{ fontSize: 11, color: isDanger ? '#b91c1c' : '#475569', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {t('Thời gian giữ ghế', 'Hold time remaining', lang)}
                </span>
              </div>
              <span style={{
                fontSize: 20, fontWeight: 900,
                color: isDanger ? '#dc2626' : isWarn ? '#b45309' : '#0d1b2e',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: 0.5,
              }}>
                {fmtTimer(timeLeft)}
              </span>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 99, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 99,
                transition: 'width 1s linear, background 0.5s',
                width: `${Math.max(0, Math.min(100, (timeLeft / HOLD_SECONDS) * 100))}%`,
                background: isDanger
                  ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                  : isWarn
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'linear-gradient(90deg, #22c55e, #16a34a)',
              }} />
            </div>
            {isDanger && (
              <div style={{ marginTop: 6, fontSize: 10.5, color: '#dc2626', fontWeight: 700, textAlign: 'center' }}>
                ⚠️ {t('Ghế sắp được giải phóng, vui lòng hoàn tất!', 'Seats about to release, please complete!', lang)}
              </div>
            )}
          </div>
        )}

        {/* Showtime info */}
        {showtime && (
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { icon: <MapPin size={13} color="#f4c04a" />, val: theater || showtime.theater_name, bold: true },
              { icon: <Film size={13} color="#f4c04a" />, val: showtime.screen_name, bold: false },
              { icon: <Calendar size={13} color="#f4c04a" />, val: fmtDateFull(showtime.starts_at, lang), bold: false },
              { icon: <Clock size={13} color="#f4c04a" />, val: `${fmtTime(showtime.starts_at)} – ${fmtTime(showtime.ends_at || showtime.starts_at)}`, bold: false },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 12, color: '#1e293b' }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                <span style={{ lineHeight: 1.35, fontWeight: r.bold ? 700 : 500 }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Ghế đã chọn */}
        {selectedSeats.length > 0 && (
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('Ghế đã chọn', 'Selected seats', lang)}
              </span>
              <span style={{
                background: '#0d1b2e', color: '#f4c04a',
                padding: '1px 7px', borderRadius: 99,
                fontSize: 10.5, fontWeight: 800
              }}>
                {selectedSeats.length} {t('ghế', 'seats', lang)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {selectedSeats.map(seat => {
                const isCpl = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
                const isVip = seat.seat_type === 'VIP';
                return (
                  <span key={seat.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                    background: isVip ? '#fef3c7' : isCpl ? '#fce7f3' : '#e0e7ff',
                    color: isVip ? '#92400e' : isCpl ? '#9d174d' : '#3730a3',
                    border: `1px solid ${isVip ? '#f59e0b' : isCpl ? '#f472b6' : '#818cf8'}`,
                  }}>
                    {seat.seat_row}{seat.seat_number}
                    <small style={{ fontSize: 8.5, opacity: 0.85, fontWeight: 700 }}>
                      {isVip ? 'VIP' : isCpl ? 'ĐÔI' : 'STD'}
                    </small>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Bảng giá chi tiết */}
        {showtime && selectedSeats.length > 0 && (
          <div style={{ background: '#ffffff', borderRadius: 12, padding: '14px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('Bảng giá chi tiết', 'Pricing breakdown', lang)}
            </div>
            {selectedSeats.map(seat => {
              const price = getSeatPrice(seat, ticketPrice);
              const isCpl = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
              const isVip = seat.seat_type === 'VIP';
              const typeLabel = isVip ? 'VIP' : isCpl ? t('Đôi', 'Couple', lang) : t('Thường', 'Std', lang);
              return (
                <div key={seat.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#475569' }}>
                    {t('Vé', 'Ticket', lang)} {seat.seat_row}{seat.seat_number} ({typeLabel})
                  </span>
                  <span style={{ fontWeight: 600, color: '#0d1b2e' }}>{fmtMoney(price)}</span>
                </div>
              );
            })}
            {comboItems.map(({ combo, quantity }) => (
              <div key={combo.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#475569' }}>{combo.name} × {quantity}</span>
                <span style={{ fontWeight: 600, color: '#0d1b2e' }}>{fmtMoney(combo.price * quantity)}</span>
              </div>
            ))}

            <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>{t('Tạm tính', 'Subtotal', lang)}</span>
              <span style={{ fontWeight: 600, color: '#0d1b2e' }}>{fmtMoney(subtotal)}</span>
            </div>
            {comboTotal > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>{t('Combo bắp nước', 'Food & drinks', lang)}</span>
                <span style={{ fontWeight: 600, color: '#0d1b2e' }}>{fmtMoney(comboTotal)}</span>
              </div>
            )}
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#16a34a', fontWeight: 600 }}>🏷 {t('Giảm giá voucher', 'Voucher discount', lang)}</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>-{fmtMoney(discount)}</span>
              </div>
            )}

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 16, fontWeight: 900,
              color: '#0d1b2e',
              marginTop: 4,
              paddingTop: 8,
              borderTop: '2px dashed #e2e8f0'
            }}>
              <span>{t('Tổng cộng', 'Total', lang)}</span>
              <span style={{ color: '#b45309', fontSize: 18 }}>{fmtMoney(totalAfterDiscount)}</span>
            </div>
          </div>
        )}

        {/* Giá đặt nếu chưa chọn ghế */}
        {showtime && selectedSeats.length === 0 && (
          <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '1px solid #fde68a', fontSize: 12 }}>
            <div style={{ color: '#92400e', fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Info size={14} color="#d97706" /> {t('Bảng giá vé tham khảo', 'Reference ticket prices', lang)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>{t('Ghế thường', 'Standard', lang)}</span>
              <strong>{fmtMoney(ticketPrice)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: '#64748b' }}>Ghế VIP (+20k)</span>
              <strong style={{ color: '#92400e' }}>{fmtMoney(ticketPrice + 20000)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>{t('Ghế đôi (Couple)', 'Couple seat', lang)}</span>
              <strong style={{ color: '#9d174d' }}>{fmtMoney(ticketPrice * 2)}</strong>
            </div>
          </div>
        )}

        {/* CTA */}
        {step < 4 && (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onContinue}
              disabled={continueDisabled}
              style={{
                width: '100%',
                border: 0, borderRadius: 12, padding: '14px 18px',
                background: continueDisabled
                  ? '#e2e8f0'
                  : 'linear-gradient(135deg, #0d1b2e 0%, #1e3a5f 100%)',
                color: continueDisabled ? '#94a3b8' : '#f4c04a',
                fontWeight: 900, fontSize: 14,
                cursor: continueDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: continueDisabled ? 'none' : '0 6px 20px rgba(13,27,46,0.3)',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                letterSpacing: 0.5,
              }}
            >
              <Ticket size={17} /> {continueLabel}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: '#94a3b8' }}>
              <ShieldCheck size={13} color="#16a34a" /> {t('Bảo mật thanh toán 100% · Nhận vé tức thì', '100% Secure Payment · Instant E-Ticket', lang)}
            </div>
          </div>
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
  const [comboQuantities, setComboQuantities] = useState<Record<string, number>>({});
  const [payMethod, setPayMethod] = useState<PayMethod>('cash');
  const [bookingResult, setBookingResult] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(HOLD_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const loadedShowtimeIdRef = useRef<number | null>(null);

  const VIP_SURCHARGE = 20000;
  const selectedSeats = seats.filter(s => selectedSeatIds.includes(s.id));
  const ticketPrice = Number(selectedShowtime?.ticket_price || 0);
  const subtotal = selectedSeats.reduce((s, seat) => s + getSeatPrice(seat, ticketPrice), 0);
  const comboItems = COMBOS.flatMap(combo => comboQuantities[combo.id] ? [{ combo, quantity: comboQuantities[combo.id] }] : []);
  const comboTotal = comboItems.reduce((sum, item) => sum + item.combo.price * item.quantity, 0);
  const discount = voucherInfo?.discount || 0;
  const totalFinal = Math.max(0, subtotal + comboTotal - discount);

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

  /* ── Load ghế khi vào bước 2 (bảo toàn ghế đã chọn khi quay lại từ bước 3) ── */
  useEffect(() => {
    if (step !== 2 || !selectedShowtime) return;
    // Nếu sơ đồ ghế của suất chiếu này đã được nạp và người dùng quay lại từ bước 3, giữ nguyên ghế đã chọn
    if (loadedShowtimeIdRef.current === selectedShowtime.id && seats.length > 0) {
      return;
    }
    loadedShowtimeIdRef.current = selectedShowtime.id;
    setSeatsLoading(true);
    fetch(`${API}?action=showtime_seats&showtime_id=${selectedShowtime.id}`, { credentials:'include' })
      .then(r => r.json())
      .then(res => setSeats(res.seats || []))
      .catch(() => setError(t('Không thể tải sơ đồ ghế.','Failed to load seat map.',lang)))
      .finally(() => setSeatsLoading(false));
  }, [step, selectedShowtime]);

  /* ── Countdown khi vào bước 2 & 3 (liên tục, không bị reset về 600s khi đổi bước) ── */
  useEffect(() => {
    if (step < 2 || step === 4) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [step]);

  /* ── Helpers ── */
  const showtimesForDate = allShowtimes.filter(s => s.show_date === selectedDate);
  const theatersForDate = [...new Map(showtimesForDate.map(s => [s.theater_id, s])).values()];
  const showtimesForTheater = showtimesForDate.filter(s =>
    !selectedTheater || s.theater_name === selectedTheater
  );

  function pickShowtime(st: Showtime) {
    if (selectedShowtime?.id !== st.id) {
      setSelectedSeatIds([]);
      setSeats([]);
      loadedShowtimeIdRef.current = null;
      setTimeLeft(HOLD_SECONDS);
    }
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
        body: JSON.stringify({ code: voucherCode.trim(), total: subtotal + comboTotal }),
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
        body: JSON.stringify({ showtimeId: selectedShowtime.id, seatIds: selectedSeatIds, combos: comboItems.map(item => ({ id: item.combo.id, quantity: item.quantity })) }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || t('Đặt vé thất bại.','Booking failed.',lang)); return; }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setBookingResult(data.booking);
      setStep(4);
      window.scrollTo({ top:0, behavior:'smooth' });
    } catch { setError('Lỗi kết nối.'); }
    finally { setSubmitting(false); }
  }

  function handleGoBack() {
    if (step === 3) {
      setStep(2);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (step === 2) {
      if (initShowtime) {
        onClose();
      } else {
        setStep(1);
        setError('');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      onClose();
    }
  }

  function goStep(s: Step) {
    if (s < step) {
      setStep(s);
      setError('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'Montserrat','Segoe UI','Inter',sans-serif", display:'flex', flexDirection:'column' }}>

      {/* ── TOP HEADER ── */}
      <div style={{ background:'linear-gradient(90deg, #091322, #0d1b2e 50%, #15253c)', color:'#dce8f5', padding:'0 24px', height:56, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, borderBottom:'1px solid rgba(244,192,74,0.2)', boxShadow:'0 2px 10px rgba(0,0,0,0.15)' }}>
        <button
          onClick={handleGoBack}
          style={{
            display:'flex', alignItems:'center', gap:8,
            border:'1px solid rgba(255,255,255,0.15)',
            background:'rgba(255,255,255,0.06)',
            color:'#dce8f5', cursor:'pointer',
            fontSize:13, fontWeight:600,
            padding:'6px 14px', borderRadius:8,
            transition:'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)';
            (e.currentTarget as HTMLElement).style.color = '#f4c04a';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLElement).style.color = '#dce8f5';
          }}
        >
          <ArrowLeft size={16} />
          {step === 3
            ? t('Quay lại chọn ghế', 'Back to seats', lang)
            : step === 2 && !initShowtime
            ? t('Chọn suất chiếu', 'Change showtime', lang)
            : t('Quay lại', 'Back', lang)}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src="/aurora-logo.svg" alt="Aurora Cinema" style={{ height:32, objectFit:'contain' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
          <span style={{ fontSize:14, fontWeight:800, color:'#f4c04a', display:'flex', alignItems:'center', gap:6, letterSpacing:0.5 }}>
            <Ticket size={16} /> {t('ĐẶT VÉ XEM PHIM','MOVIE BOOKING',lang)}
          </span>
        </div>

        <div style={{ fontSize:12.5, color:'#94a3b8' }}>
          {user ? (
            <span style={{ color:'#f4c04a', fontWeight:600, display:'flex', alignItems:'center', gap:5, background:'rgba(244,192,74,0.12)', padding:'4px 10px', borderRadius:99, border:'1px solid rgba(244,192,74,0.25)' }}>
              👤 {user.fullName}
            </span>
          ) : (
            <span>{t('Chưa đăng nhập','Not signed in',lang)}</span>
          )}
        </div>
      </div>

      {/* ── BREADCRUMB + STEP BAR ── */}
      <div style={{ background:'#ffffff', borderBottom:'1px solid #e2e8f0', padding:'12px 24px', boxShadow:'0 1px 3px rgba(0,0,0,0.02)' }}>
        {/* Breadcrumb */}
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#94a3b8', marginBottom:12, flexWrap:'wrap' }}>
          <span onClick={onClose} style={{ cursor:'pointer', color:'#64748b', fontWeight:500 }}>{t('Trang chủ','Home',lang)}</span>
          <ChevronRight size={13} />
          <span onClick={() => goStep(1)} style={{ cursor: step > 1 ? 'pointer' : 'default', color: step === 1 ? '#0d1b2e' : '#64748b', fontWeight: step === 1 ? 700 : 500 }}>
            {t('Đặt vé','Booking',lang)}
          </span>
          <ChevronRight size={13} />
          <span style={{ color:'#475569', fontWeight:600 }}>{movie.title}</span>
          {step >= 2 && (
            <>
              <ChevronRight size={13} />
              <span onClick={() => goStep(2)} style={{ cursor: step > 2 ? 'pointer' : 'default', color: step === 2 ? '#0d1b2e' : '#15803d', fontWeight: step === 2 ? 800 : 600 }}>
                {t('Chọn ghế','Seats',lang)} {selectedSeats.length > 0 ? `(${selectedSeats.length})` : ''}
              </span>
            </>
          )}
          {step >= 3 && (
            <>
              <ChevronRight size={13} />
              <span style={{ color: step === 3 ? '#0d1b2e' : '#64748b', fontWeight: step === 3 ? 800 : 500 }}>
                {t('Thanh toán','Payment',lang)}
              </span>
            </>
          )}
          {step === 4 && (
            <>
              <ChevronRight size={13} />
              <span style={{ color:'#15803d', fontWeight:800 }}>{t('Hoàn tất','Done',lang)}</span>
            </>
          )}
        </div>
        {/* Step bar */}
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <StepBar step={step} lang={lang} onGoStep={goStep} />
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', maxWidth:'100%' }}>

        {/* LEFT: nội dung theo bước */}
        <main style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

          {/* ─── BƯỚC 4: THÀNH CÔNG ─── */}
          {step === 4 && bookingResult && (
            <SuccessStep booking={bookingResult} movie={movie} showtime={selectedShowtime!} theater={selectedTheater} selectedSeats={selectedSeats} comboItems={comboItems} totalFinal={totalFinal} lang={lang} onClose={onClose} />
          )}

          {/* ─── BƯỚC 3: THANH TOÁN ─── */}
          {step === 3 && (
            <PaymentStep
              lang={lang} movie={movie} showtime={selectedShowtime!} theater={selectedTheater}
              selectedSeats={selectedSeats} subtotal={subtotal} discount={discount} totalFinal={totalFinal}
              comboItems={comboItems} comboTotal={comboTotal} comboQuantities={comboQuantities}
              onChangeCombo={(id: string, delta: number) => setComboQuantities(current => ({ ...current, [id]: Math.max(0, Math.min(10, (current[id] || 0) + delta)) }))}
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
            vipSurcharge={VIP_SURCHARGE} discount={discount} comboItems={comboItems} comboTotal={comboTotal} totalAfterDiscount={totalFinal}
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
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Back button */}
      <button
        onClick={onBack}
        className="booking-btn-back"
        style={{ marginBottom: 18 }}
      >
        <ChevronLeft size={16} /> {t('Chọn suất chiếu khác', 'Change showtime', lang)}
      </button>

      {/* Movie + showtime summary */}
      <div className="aurora-booking-card" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', gap: 16, alignItems: 'center' }}>
        {(movie.poster || movie.posterUrl) && (
          <img
            src={movie.poster || movie.posterUrl}
            alt=""
            style={{ width: 52, height: 74, objectFit: 'cover', borderRadius: 8, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#0d1b2e' }}>{movie.title}</span>
            {(movie.format || 'Dolby Atmos 4K') && (
              <span style={{ fontSize: 10, fontWeight: 700, background: '#0d1b2e', color: '#f4c04a', padding: '2px 7px', borderRadius: 4 }}>
                {movie.format || 'Dolby Atmos 4K'}
              </span>
            )}
            {(movie.ageRating || movie.rating) && (
              <span style={{ fontSize: 10, fontWeight: 800, background: ratingColor(movie.ageRating || movie.rating), color: '#ffffff', padding: '2px 6px', borderRadius: 4 }}>
                {movie.ageRating || movie.rating}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12.5, color: '#64748b', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, color: '#334155' }}>
              <MapPin size={13} color="#f4c04a" />{theater || showtime.theater_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Film size={13} color="#f4c04a" />{showtime.screen_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={13} color="#f4c04a" />{fmtDateFull(showtime.starts_at, lang)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="aurora-booking-card" style={{ padding: '12px 18px', marginBottom: 24, display: 'flex', gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { bg: '#f8fafc', border: '#cbd5e1', color: '#475569', label: t('Ghế thường', 'Standard', lang) },
          { bg: '#fef3c7', border: '#f59e0b', color: '#92400e', label: `Ghế VIP (+${VIP_SURCHARGE.toLocaleString('vi-VN')}đ)` },
          { bg: '#fce7f3', border: '#f472b6', color: '#9d174d', label: t('Ghế đôi (Couple - x2)', 'Couple seat (x2)', lang) },
          { bg: '#1e3a5f', border: '#f4c04a', color: '#f4c04a', label: t('Đang chọn', 'Selected', lang) },
          { bg: '#e2e8f0', border: '#cbd5e1', color: '#94a3b8', label: t('Đã bán', 'Taken', lang) },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#475569', fontWeight: 600 }}>
            <div style={{ width: 22, height: 16, background: item.bg, border: `1.5px solid ${item.border}`, borderRadius: '4px 4px 6px 6px', flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      {/* Screen */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: '78%', maxWidth: 580, height: 16,
          background: 'linear-gradient(90deg, #94a3b8 0%, #cbd5e1 50%, #94a3b8 100%)',
          borderRadius: '50% 50% 0 0 / 100% 100% 0 0',
          margin: '0 auto 10px',
          boxShadow: '0 8px 24px rgba(13,27,46,0.12)',
        }} />
        <span style={{ fontSize: 11, letterSpacing: 4, color: '#94a3b8', fontWeight: 800 }}>
          {t('MÀN HÌNH CHIẾU', 'SCREEN', lang)}
        </span>
      </div>

      {/* Seat grid */}
      {seatsLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0' }}>
          <div style={{ width: 44, height: 44, border: '3px solid #e2e8f0', borderTop: '3px solid #0d1b2e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ color: '#64748b', marginTop: 14, fontSize: 13, fontWeight: 600 }}>{t('Đang tải sơ đồ ghế...', 'Loading seats...', lang)}</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 480, margin: '0 auto', width: 'fit-content' }}>
            {sortedRows.map((row: string) => (
              <div key={row} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span style={{ width: 22, fontSize: 11.5, fontWeight: 800, color: '#64748b', textAlign: 'center', flexShrink: 0 }}>{row}</span>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'nowrap' }}>
                  {(seatRows[row] as Seat[]).sort((a, b) => a.seat_number - b.seat_number).map(seat => {
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const c = seatColor(seat, isSelected);
                    const isDouble = seat.seat_type === 'COUPLE' || seat.seat_type === 'DOUBLE';
                    const price = getSeatPrice(seat, Number(showtime.ticket_price));
                    const typeName = seat.seat_type === 'VIP' ? 'VIP' : isDouble ? t('Ghế đôi', 'Couple', lang) : t('Ghế thường', 'Standard', lang);
                    return (
                      <button
                        key={seat.id}
                        disabled={!seat.is_available}
                        onClick={() => onToggleSeat(seat)}
                        title={`${seat.seat_row}${seat.seat_number} · ${typeName} · ${fmtMoney(price)}`}
                        style={{
                          width: isDouble ? 72 : 34, height: 28,
                          background: c.bg, border: `1.5px solid ${c.border}`, color: c.color,
                          borderRadius: '5px 5px 8px 8px', fontSize: isDouble ? 10 : 10, fontWeight: 800,
                          cursor: seat.is_available ? 'pointer' : 'not-allowed',
                          padding: 0, flexShrink: 0,
                          transform: isSelected ? 'scale(1.12)' : 'scale(1)',
                          boxShadow: isSelected
                            ? '0 3px 10px rgba(30,58,95,0.4), 0 0 0 2px #f4c04a'
                            : seat.is_available
                            ? '0 1px 2px rgba(0,0,0,0.05)'
                            : 'none',
                          transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                      >
                        {isDouble ? `ĐÔI ${seat.seat_number}` : seat.seat_number}
                      </button>
                    );
                  })}
                </div>
                <span style={{ width: 22, fontSize: 11.5, fontWeight: 800, color: '#64748b', textAlign: 'center', flexShrink: 0 }}>{row}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom info bar */}
      <div className="aurora-booking-card" style={{ marginTop: 24, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>
          {selectedSeatIds.length > 0 ? (
            <>
              {t('Đã chọn', 'Selected', lang)}:{' '}
              <strong style={{ color: '#0d1b2e' }}>
                {(seats as Seat[]).filter((s: Seat) => selectedSeatIds.includes(s.id)).map((s: Seat) => `${s.seat_row}${s.seat_number}`).join(', ')}
              </strong>{' '}
              <span style={{ background: '#0d1b2e', color: '#f4c04a', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800, marginLeft: 4 }}>
                {selectedSeatIds.length} {t('ghế', 'seats', lang)}
              </span>
            </>
          ) : (
            <span style={{ color: '#94a3b8' }}>{t('Vui lòng nhấp vào ghế để chọn chỗ ngồi của bạn', 'Please click on seats to select your spots', lang)}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          {t('Thường:', 'Standard:', lang)} <strong style={{ color: '#0d1b2e' }}>{fmtMoney(Number(showtime.ticket_price))}</strong>
          {' · '}VIP: <strong style={{ color: '#92400e' }}>{fmtMoney(Number(showtime.ticket_price) + VIP_SURCHARGE)}</strong>
          {' · '}{t('Đôi:', 'Couple:', lang)} <strong style={{ color: '#9d174d' }}>{fmtMoney(Number(showtime.ticket_price) * 2)}</strong>
        </div>
      </div>

      {error && <div style={errStyle}>{error}</div>}
    </div>
  );
}

/* ═══════════════════════════════ STEP 3: THANH TOÁN ═══════════════════════════════ */
function PaymentStep({
  lang, movie, showtime, theater, selectedSeats, subtotal, discount, totalFinal,
  comboItems, comboTotal, comboQuantities, onChangeCombo,
  voucherCode, setVoucherCode, voucherInfo, voucherError, voucherLoading,
  onApplyVoucher, onRemoveVoucher, payMethod, setPayMethod, user, error, onBack, VIP_SURCHARGE
}: any) {
  const ticketPrice = showtime.ticket_price;
  const PAY_METHODS = [
    {
      id: 'qr_vnpay',
      title: 'VNPay QR',
      desc: t('Quét mã qua 40+ ứng dụng ngân hàng & ví điện tử', 'Scan via 40+ banking apps & e-wallets', lang),
      badge: 'Khuyên dùng',
      icon: <QrCode size={20} color="#005baa" />,
    },
    {
      id: 'qr_momo',
      title: 'Ví MoMo',
      desc: t('Thanh toán tức thì qua ứng dụng MoMo', 'Instant payment with MoMo app', lang),
      badge: null,
      icon: <Smartphone size={20} color="#a50064" />,
    },
    {
      id: 'qr_zalopay',
      title: 'Ví ZaloPay',
      desc: t('Thanh toán tiện lợi qua ví ZaloPay', 'Convenient with ZaloPay', lang),
      badge: null,
      icon: <Zap size={20} color="#0068ff" />,
    },
    {
      id: 'card',
      title: t('Thẻ ATM / Visa / Mastercard', 'ATM / Visa / Mastercard', lang),
      desc: t('Thẻ nội địa NAPAS & thẻ quốc tế', 'Domestic NAPAS & International cards', lang),
      badge: null,
      icon: <CreditCard size={20} color="#0d1b2e" />,
    },
    {
      id: 'cash',
      title: t('Tiền mặt tại quầy', 'Cash at counter', lang),
      desc: t('Nhận vé và thanh toán tại quầy trước giờ chiếu 15 phút', 'Pay at cinema counter 15m before showtime', lang),
      badge: null,
      icon: <Ticket size={20} color="#d97706" />,
    },
  ];

  return (
    <div className="payment-step" style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Navigation & Seats Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          onClick={onBack}
          className="booking-btn-back"
          title={t('Quay lại sơ đồ chọn ghế', 'Back to seat selection', lang)}
        >
          <ChevronLeft size={18} />
          <span>{t('Quay lại chọn ghế', 'Back to seat selection', lang)}</span>
          {selectedSeats.length > 0 && (
            <span style={{
              marginLeft: 4, padding: '2px 9px', borderRadius: 99,
              fontSize: 11.5, fontWeight: 800,
              background: 'linear-gradient(135deg, #fef3c7, #fde68a)', color: '#92400e', border: '1px solid #f59e0b',
            }}>
              Đang giữ {selectedSeats.length} ghế
            </span>
          )}
        </button>

        <div style={{
          fontSize: 12, color: '#15803d',
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#f0fdf4', padding: '6px 14px', borderRadius: 99,
          border: '1px solid #bbf7d0', fontWeight: 600,
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <Check size={14} strokeWidth={2.5} />
          <span>{t('Ghế bạn đã chọn được giữ cố định trong phiên này', 'Selected seats are reserved for your session', lang)}</span>
        </div>
      </div>

      {/* TOP 2-COLUMN GRID */}
      <div className="payment-top-grid">
        {/* CARD 1: THÔNG TIN ĐẶT VÉ */}
        <div className="aurora-booking-card" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Ticket size={16} color="#f4c04a" /> {t('Thông tin đặt vé', 'Booking summary', lang)}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', background: '#f1f5f9', padding: '3px 9px', borderRadius: 99 }}>
              {selectedSeats.length} {t('ghế đã chọn', 'seats chosen', lang)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            {(movie.poster || movie.posterUrl) && (
              <img
                src={movie.poster || movie.posterUrl}
                alt=""
                style={{ width: 68, height: 96, objectFit: 'cover', borderRadius: 10, flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: '#0d1b2e', marginBottom: 6, lineHeight: 1.3 }}>
                {movie.title}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
                {(movie.format || 'Dolby Atmos 4K') && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: '#0d1b2e', color: '#f4c04a', padding: '2px 7px', borderRadius: 4 }}>
                    {movie.format || 'Dolby Atmos 4K'}
                  </span>
                )}
                {(movie.ageRating || movie.rating) && (
                  <span style={{ fontSize: 10, fontWeight: 800, background: ratingColor(movie.ageRating || movie.rating), color: '#ffffff', padding: '2px 6px', borderRadius: 4 }}>
                    {movie.ageRating || movie.rating}
                  </span>
                )}
              </div>
              {[
                { icon: <MapPin size={13} color="#f4c04a" />, v: theater || showtime.theater_name, bold: true },
                { icon: <Film size={13} color="#f4c04a" />, v: showtime.screen_name, bold: false },
                { icon: <Calendar size={13} color="#f4c04a" />, v: fmtDateFull(showtime.starts_at, lang), bold: false },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12.5, color: '#334155', marginBottom: 4, alignItems: 'center' }}>
                  <span style={{ flexShrink: 0 }}>{r.icon}</span>
                  <span style={{ fontWeight: r.bold ? 700 : 500 }}>{r.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Seats chips */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('Vị trí ghế đã chọn', 'Selected seats', lang)}
              </div>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {t('Bấm "Quay lại" để đổi vị trí', 'Click "Back" to adjust seats', lang)}
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {selectedSeats.map((s: Seat) => {
                const isCpl = s.seat_type === 'COUPLE' || s.seat_type === 'DOUBLE';
                const isVip = s.seat_type === 'VIP';
                const seatPrice = getSeatPrice(s, Number(ticketPrice));
                return (
                  <span key={s.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 8, fontSize: 12.5, fontWeight: 800,
                    background: isVip ? '#fef3c7' : isCpl ? '#fce7f3' : '#e0e7ff',
                    border: '1.5px solid',
                    borderColor: isVip ? '#f59e0b' : isCpl ? '#f472b6' : '#818cf8',
                    color: isVip ? '#92400e' : isCpl ? '#9d174d' : '#3730a3',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}>
                    <span>{s.seat_row}{s.seat_number}</span>
                    <span style={{ fontSize: 10, opacity: 0.8, fontWeight: 700 }}>
                      ({isVip ? 'VIP' : isCpl ? t('Đôi', 'Couple', lang) : t('Thường', 'Std', lang)})
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>
                      · {fmtMoney(seatPrice)}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* CARD 2: COMBO BẮP NƯỚC */}
        <div className="aurora-booking-card" style={{ padding: '22px 24px', background: 'linear-gradient(180deg, #fffdf8, #ffffff)', border: '1px solid #fde68a' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', margin: 0, display: 'flex', alignItems: 'center', gap: 7 }}>
              🍿 {t('Combo bắp nước', 'Popcorn & drinks', lang)}
            </h2>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#b45309', background: '#fef3c7', padding: '2px 9px', borderRadius: 99, border: '1px solid #fde68a' }}>
              {t('Ưu đãi tại quầy', 'Counter special', lang)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
            {t('Thêm món ăn nhẹ để nhận tại quầy bắp nước rạp chiếu phim.', 'Add snacks to pick up at the cinema concession counter.', lang)}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {COMBOS.map(combo => {
              const quantity = comboQuantities[combo.id] || 0;
              const hasQty = quantity > 0;
              return (
                <div
                  key={combo.id}
                  className="combo-option-card"
                  style={{
                    border: hasQty ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                    background: hasQty ? '#fffaf0' : '#ffffff',
                    boxShadow: hasQty ? '0 3px 12px rgba(245, 158, 11, 0.12)' : '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: hasQty ? '#fde68a' : '#f8fafc',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0, border: '1px solid #e2e8f0',
                  }}>
                    {combo.id.includes('cheese') ? '🧀' : combo.id.includes('family') ? '🎉' : '🍿'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1b2e' }}>{combo.name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{combo.description}</div>
                    <div style={{ fontSize: 13, color: '#b45309', fontWeight: 900, marginTop: 4 }}>{fmtMoney(combo.price)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => onChangeCombo(combo.id, -1)}
                      disabled={!quantity}
                      style={{
                        width: 30, height: 30, borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        background: '#ffffff',
                        color: quantity ? '#0d1b2e' : '#cbd5e1',
                        cursor: quantity ? 'pointer' : 'not-allowed',
                        fontSize: 16, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                    >
                      −
                    </button>
                    <strong style={{ minWidth: 20, textAlign: 'center', color: '#0d1b2e', fontSize: 14 }}>
                      {quantity}
                    </strong>
                    <button
                      type="button"
                      onClick={() => onChangeCombo(combo.id, 1)}
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: 0,
                        background: '#0d1b2e', color: '#f4c04a',
                        cursor: 'pointer', fontSize: 16, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(13,27,46,0.2)',
                        transition: 'all 0.15s',
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {comboTotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid #fde68a', fontSize: 13 }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>{t('Tạm tính combo', 'Combo subtotal', lang)}</span>
              <strong style={{ color: '#b45309' }}>{fmtMoney(comboTotal)}</strong>
            </div>
          )}
        </div>
      </div>

      {/* CARD 3: MÃ GIẢM GIÁ */}
      <div className="aurora-booking-card" style={{ padding: '20px 24px' }}>
        <h2 style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Gift size={16} color="#f4c04a" /> {t('Mã giảm giá', 'Promo code & Vouchers', lang)}
        </h2>

        {voucherInfo ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f0fdf4', borderRadius: 10, border: '1.5px solid #86efac' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Tag size={16} color="#16a34a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#15803d', letterSpacing: 0.5 }}>
                  {voucherCode.toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  {voucherInfo.desc} · Giảm {fmtMoney(voucherInfo.discount)}
                </div>
              </div>
            </div>
            <button
              onClick={onRemoveVoucher}
              title={t('Hủy áp dụng', 'Remove code', lang)}
              style={{ border: 0, background: '#ffffff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  value={voucherCode}
                  onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && onApplyVoucher()}
                  placeholder={t('Nhập mã voucher (vd: AURORA10, AURORA50K...)', 'Enter promo code (e.g. AURORA10)', lang)}
                  style={{
                    width: '100%', padding: '11px 16px',
                    border: '1.5px solid #e2e8f0', borderRadius: 10,
                    fontSize: 13.5, outline: 'none', fontFamily: 'inherit',
                    textTransform: 'uppercase', letterSpacing: 0.5,
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.target.style.borderColor = '#0d1b2e')}
                  onBlur={e => (e.target.style.borderColor = '#e2e8f0')}
                />
              </div>
              <button
                onClick={onApplyVoucher}
                disabled={voucherLoading || !voucherCode.trim()}
                style={{
                  padding: '0 22px',
                  background: 'linear-gradient(135deg, #0d1b2e, #1e3a5f)',
                  color: '#f4c04a',
                  border: 0, borderRadius: 10,
                  fontWeight: 800, fontSize: 13.5,
                  cursor: voucherLoading || !voucherCode.trim() ? 'not-allowed' : 'pointer',
                  opacity: voucherLoading || !voucherCode.trim() ? 0.6 : 1,
                  boxShadow: '0 2px 8px rgba(13,27,46,0.2)',
                  transition: 'all 0.2s',
                }}
              >
                {voucherLoading ? t('Đang kiểm tra...', 'Checking...', lang) : t('Áp dụng', 'Apply', lang)}
              </button>
            </div>

            {/* Quick coupon tags */}
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>💡 {t('Thử mã:', 'Try promo codes:', lang)}</span>
              {[
                { code: 'AURORA10', desc: 'Giảm 10%' },
                { code: 'AURORA50K', desc: '-50.000đ' },
                { code: 'WELCOME', desc: '-20.000đ' },
                { code: 'GOLD20', desc: 'VIP 20%' },
              ].map(p => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => setVoucherCode(p.code)}
                  style={{
                    background: '#f8fafc', border: '1px dashed #cbd5e1',
                    padding: '3px 9px', borderRadius: 6,
                    fontSize: 11, fontWeight: 700, color: '#0d1b2e',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#f59e0b';
                    (e.currentTarget as HTMLElement).style.background = '#fef3c7';
                    (e.currentTarget as HTMLElement).style.color = '#92400e';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '#cbd5e1';
                    (e.currentTarget as HTMLElement).style.background = '#f8fafc';
                    (e.currentTarget as HTMLElement).style.color = '#0d1b2e';
                  }}
                >
                  <span>{p.code}</span>
                  <span style={{ fontSize: 9.5, opacity: 0.75 }}>({p.desc})</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {voucherError && (
          <div style={{ marginTop: 10, fontSize: 12.5, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> {voucherError}
          </div>
        )}
      </div>

      {/* CARD 4: PHƯƠNG THỨC THANH TOÁN */}
      <div className="aurora-booking-card" style={{ padding: '22px 24px' }}>
        <h2 style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
          <CreditCard size={16} color="#f4c04a" /> {t('Phương thức thanh toán', 'Payment method', lang)}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PAY_METHODS.map(pm => {
            const isChecked = payMethod === pm.id;
            return (
              <label
                key={pm.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px', borderRadius: 12,
                  border: `1.5px solid ${isChecked ? '#0d1b2e' : '#e2e8f0'}`,
                  background: isChecked ? '#f8fafc' : '#ffffff',
                  cursor: 'pointer', transition: 'all 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isChecked ? '0 2px 8px rgba(13,27,46,0.08)' : 'none',
                }}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value={pm.id}
                  checked={isChecked}
                  onChange={() => setPayMethod(pm.id)}
                  style={{ accentColor: '#0d1b2e', width: 18, height: 18 }}
                />
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: '#ffffff', border: '1px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {pm.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: isChecked ? 800 : 600, color: '#0d1b2e' }}>
                      {pm.title}
                    </span>
                    {pm.badge && (
                      <span style={{ fontSize: 10, fontWeight: 800, background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: 4 }}>
                        {pm.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{pm.desc}</div>
                </div>
                {isChecked && (
                  <span style={{ color: '#0d1b2e', fontWeight: 800, fontSize: 16 }}>✓</span>
                )}
              </label>
            );
          })}
        </div>

        {/* QR simulator helper */}
        {payMethod.startsWith('qr_') && (
          <div style={{ marginTop: 16, padding: '20px', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 84, height: 84, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <QrCode size={56} color="#0d1b2e" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0d1b2e', marginBottom: 4 }}>
                {t('Quét mã QR để thanh toán', 'Scan QR code to pay', lang)}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                {t('Mã QR động tương ứng với tổng tiền sẽ được hiển thị ngay sau khi bấm xác nhận. Hỗ trợ quét bằng mọi app ngân hàng & ví điện tử.', 'Dynamic QR code will appear after confirmation. Supports all Vietnamese bank apps.', lang)}
              </p>
              <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ShieldCheck size={13} /> {t('Mã hóa SSL 256-bit', '256-bit SSL', lang)}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={13} /> {t('Xác nhận tức thì', 'Instant confirmation', lang)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CARD 5: THÔNG TIN NGƯỜI ĐẶT */}
      {user && (
        <div className="aurora-booking-card" style={{ padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <User size={16} color="#f4c04a" /> {t('Thông tin người đặt vé', 'Customer information', lang)}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {[
              { label: t('Họ và tên', 'Full Name', lang), val: user.fullName || 'Khách hàng Aurora' },
              { label: 'Email', val: user.email },
              { label: t('Số điện thoại', 'Phone', lang), val: user.phone || t('Đã liên kết', 'Linked', lang) },
            ].map(r => (
              <div key={r.label} style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{r.label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1b2e', marginTop: 2 }}>{r.val}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: '#64748b' }}>
            📧 {t('Vé điện tử và mã QR check-in vào phòng chiếu sẽ được gửi tới email trên.', 'E-tickets and QR codes will be sent to the email above.', lang)}
          </div>
        </div>
      )}

      {/* CARD 6: BẢNG TỔNG KẾT THANH TOÁN */}
      <div className="aurora-booking-card" style={{ padding: '20px 24px', background: '#f8fafc' }}>
        <div style={{ fontSize: 13.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0d1b2e', marginBottom: 14 }}>
          {t('Chi tiết thanh toán đơn hàng', 'Order payment breakdown', lang)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedSeats.map((s: Seat) => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#475569' }}>
                {t('Vé ghế', 'Seat ticket', lang)} {s.seat_row}{s.seat_number} ({s.seat_type === 'VIP' ? 'VIP' : s.seat_type === 'DOUBLE' ? t('Đôi', 'Double', lang) : t('Thường', 'Std', lang)})
              </span>
              <span style={{ fontWeight: 700, color: '#0d1b2e' }}>
                {fmtMoney(ticketPrice + (s.seat_type === 'VIP' ? VIP_SURCHARGE : 0))}
              </span>
            </div>
          ))}
          {comboItems.map(({ combo, quantity }: { combo: Combo; quantity: number }) => (
            <div key={combo.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#475569' }}>{combo.name} × {quantity}</span>
              <span style={{ fontWeight: 700, color: '#0d1b2e' }}>{fmtMoney(combo.price * quantity)}</span>
            </div>
          ))}
          {discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>🏷 {t('Giảm giá voucher', 'Voucher discount', lang)}</span>
              <span style={{ fontWeight: 800, color: '#16a34a' }}>-{fmtMoney(discount)}</span>
            </div>
          )}
          <div style={{ height: 1, background: '#cbd5e1', margin: '6px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#0d1b2e' }}>{t('TỔNG CỘNG THANH TOÁN', 'TOTAL AMOUNT', lang)}</span>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#b45309' }}>{fmtMoney(totalFinal)}</span>
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
