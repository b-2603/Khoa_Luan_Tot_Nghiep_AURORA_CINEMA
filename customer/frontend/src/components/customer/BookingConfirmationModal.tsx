import { CalendarDays, Clock3, MapPin, X } from 'lucide-react';

type Props = {
  movie: any;
  showtime: any;
  theater: string;
  language: 'vi' | 'en';
  onClose: () => void;
  onConfirm: () => void;
};

function formatShowtime(value?: string) {
  const date = value ? new Date(value.replace(' ', 'T')) : null;
  if (!date || Number.isNaN(date.getTime())) return { date: 'Đang cập nhật', time: 'Đang cập nhật' };

  return {
    date: date.toLocaleDateString('vi-VN'),
    time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function BookingConfirmationModal({ movie, showtime, theater, language, onClose, onConfirm }: Props) {
  const schedule = formatShowtime(showtime.starts_at);
  const t = (vi: string, en: string) => language === 'en' ? en : vi;

  return (
    <div style={overlay} onClick={onClose} role="presentation">
      <section style={modal} onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="booking-confirmation-title">
        <button type="button" onClick={onClose} style={closeButton} aria-label="Đóng cửa sổ xác nhận"><X size={24} /></button>
        <div style={eyebrow}>AURORA CINEMA · {t('XÁC NHẬN ĐẶT VÉ', 'BOOKING CONFIRMATION')}</div>
        <h2 id="booking-confirmation-title" style={heading}>{t('BẠN ĐANG ĐẶT VÉ XEM PHIM', 'YOU ARE BOOKING A MOVIE')}</h2>
        <div style={divider} />

        <div style={movieTitle}>{movie.title}</div>
        <div style={details}>
          <div style={detailLabel}><MapPin size={16} /> {t('Rạp chiếu', 'Cinema')}</div>
          <div style={detailLabel}><CalendarDays size={16} /> {t('Ngày chiếu', 'Date')}</div>
          <div style={detailLabel}><Clock3 size={16} /> {t('Giờ chiếu', 'Time')}</div>
          <div style={detailValue}>{theater}</div>
          <div style={detailValue}>{schedule.date}</div>
          <div style={detailValue}>{schedule.time}</div>
        </div>

        <div style={footer}>
          <button type="button" onClick={onClose} style={cancelButton}>{t('QUAY LẠI', 'GO BACK')}</button>
          <button type="button" onClick={onConfirm} style={confirmButton}>{t('ĐỒNG Ý', 'CONFIRM')}</button>
        </div>
      </section>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 205, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(4, 13, 25, .76)' };
const modal: React.CSSProperties = { position: 'relative', width: 'min(760px, 100%)', background: '#fff', borderRadius: 16, padding: '38px 36px 30px', boxShadow: '0 24px 70px rgba(0,0,0,.35)' };
const closeButton: React.CSSProperties = { position: 'absolute', top: 18, right: 18, display: 'grid', placeItems: 'center', width: 38, height: 38, border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer' };
const eyebrow: React.CSSProperties = { color: '#b8860b', fontSize: 10, fontWeight: 900, letterSpacing: 1.2, marginBottom: 8 };
const heading: React.CSSProperties = { margin: 0, color: '#0d1b2e', fontSize: 22, fontWeight: 900, letterSpacing: .2 };
const divider: React.CSSProperties = { height: 1, background: '#e2e8f0', margin: '28px 0 26px' };
const movieTitle: React.CSSProperties = { paddingBottom: 18, color: '#b7791f', textAlign: 'center', fontSize: 30, fontWeight: 900, lineHeight: 1.2, borderBottom: '1px solid #edf1f5' };
const details: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 0 };
const detailLabel: React.CSSProperties = { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '20px 10px 14px', color: '#334155', fontSize: 14, fontWeight: 800, textAlign: 'center' };
const detailValue: React.CSSProperties = { padding: '18px 12px', background: '#f6f8fb', color: '#0d1b2e', fontSize: 17, fontWeight: 800, textAlign: 'center' };
const footer: React.CSSProperties = { display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, paddingTop: 22, borderTop: '1px solid #e2e8f0' };
const cancelButton: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '12px 24px', background: '#fff', color: '#475569', fontSize: 13, fontWeight: 900, cursor: 'pointer' };
const confirmButton: React.CSSProperties = { border: 0, borderRadius: 9, padding: '12px 34px', background: '#0d1b2e', color: '#f4c04a', fontSize: 13, fontWeight: 900, cursor: 'pointer', boxShadow: '0 5px 13px rgba(13,27,46,.22)' };
