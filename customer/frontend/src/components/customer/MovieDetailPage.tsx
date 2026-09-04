import { ArrowLeft, CalendarDays, Clock3, Film, MapPin, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  movie: any;
  theaters: any[];
  theater: string;
  showtimes: any[];
  date: string;
  onBack: () => void;
  onBook: (showtime: any, theater: string) => void;
};

export default function MovieDetailPage({ movie, theaters, theater, showtimes, date, onBack, onBook }: Props) {
  const firstTheater = theaters.find(item => item.name === theater) || theaters[0];
  const [theaterId, setTheaterId] = useState<number | null>(firstTheater ? firstTheater.id : null);
  const [currentShowtimes, setCurrentShowtimes] = useState<any[]>(showtimes);
  const selectedTheater = theaters.find(item => item.id === theaterId);
  const trailerId = movie.trailerUrl && (movie.trailerUrl.match(/[?&]v=([^&]+)/) || movie.trailerUrl.match(/youtu\.be\/([^?]+)/));

  useEffect(() => {
    if (theaterId === null) return;
    fetch(`${API_URL}?action=showtimes&theater_id=${theaterId}&date=${date}`)
      .then(response => response.json())
      .then(result => setCurrentShowtimes((result.showtimes || []).filter((item: any) => item.movie_id === movie.id)))
      .catch(() => setCurrentShowtimes([]));
  }, [theaterId, movie.id, date]);

  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 20px 54px' }}>
    <button onClick={onBack} style={backButton}><ArrowLeft size={16} /> VỀ TRANG CHỦ</button>
    <div style={{ color: '#64748b', fontSize: 12, margin: '18px 0 14px' }}>Trang chủ <span style={{ color: '#c08a13' }}>›</span> Chi tiết phim <span style={{ color: '#c08a13' }}>›</span> {movie.title}</div>
    <section style={hero}>
      <div style={{ width: 250, minHeight: 365, borderRadius: 14, background: movie.posterUrl ? `url(${movie.posterUrl}) center/cover` : 'linear-gradient(145deg,#142945,#071526)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {!movie.posterUrl && <Film size={54} color="#f4c04a" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={eyebrow}>AURORA CINEMA · MOVIE PROFILE</div>
        <h1 style={{ fontSize: 34, color: '#0d1b2e', margin: '8px 0 15px', lineHeight: 1.15 }}>{movie.title}</h1>
        <div style={meta}><span style={rating}>{movie.ageRating || movie.rating || 'P'}</span><span><Clock3 size={15} /> {movie.durationMinutes || movie.duration || 'Đang cập nhật'} phút</span><span><Film size={15} /> {movie.format || '2D Digital'}</span></div>
        <p style={description}>{movie.description || 'Thông tin phim đang được cập nhật.'}</p>
        <div style={facts}><strong>Trạng thái</strong><span>{movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : movie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Suất chiếu đặc biệt'}</span><strong>Khởi chiếu</strong><span>{movie.releaseDate || 'Đang cập nhật'}</span></div>
      </div>
    </section>

    <section style={scheduleCard}>
      <div style={sectionTitle}><CalendarDays size={18} color="#d59a17" /> LỊCH CHIẾU THEO CỤM RẠP</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>{theaters.map(item => <button key={item.id} onClick={() => setTheaterId(item.id)} style={{ ...theaterButton, ...(theaterId === item.id ? activeTheaterButton : {}) }}><MapPin size={13} /> {item.name}</button>)}</div>
      <div style={{ background: '#f5f7fa', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, color: '#0d1b2e', fontWeight: 900, fontSize: 13, marginBottom: 15 }}>{selectedTheater?.name || theater} <span style={{ color: '#94a3b8', fontWeight: 500 }}>· Suất chiếu ngày 04/09/2026</span></div>
      {currentShowtimes.length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{currentShowtimes.map(item => <button key={item.id} onClick={() => onBook(item, selectedTheater?.name || theater)} style={showtimeButton}><strong>{new Date(item.starts_at.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong><small>{item.screen_name || 'Phòng chiếu'} · {Number(item.ticket_price).toLocaleString('vi-VN')}đ</small></button>)}</div> : <div style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có suất chiếu trong database cho cụm rạp và ngày này.</div>}
    </section>

    {trailerId && <section style={trailerCard}><div style={sectionTitle}>TRAILER PHIM</div><div style={trailerFrame}><iframe title={`Trailer ${movie.title}`} src={`https://www.youtube.com/embed/${trailerId[1]}`} style={videoFrame} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div></section>}
  </main>;
}

const backButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#0d1b2e', borderRadius: 8, padding: '8px 12px', fontWeight: 800, fontSize: 11, cursor: 'pointer' };
const hero: React.CSSProperties = { display: 'flex', gap: 30, background: '#fff', borderRadius: 18, padding: 26, boxShadow: '0 5px 20px rgba(13,27,46,.07)', border: '1px solid #e7edf3' };
const eyebrow: React.CSSProperties = { color: '#b8860b', fontSize: 10, fontWeight: 900, letterSpacing: 1 };
const meta: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', color: '#64748b', fontSize: 12 };
const rating: React.CSSProperties = { background: '#f4c04a', color: '#0d1b2e', borderRadius: 5, padding: '4px 8px', fontWeight: 900 };
const description: React.CSSProperties = { color: '#475569', fontSize: 14, lineHeight: 1.75, margin: '20px 0' };
const facts: React.CSSProperties = { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '9px 18px', fontSize: 13, color: '#475569', borderTop: '1px solid #eef2f6', paddingTop: 15 };
const scheduleCard: React.CSSProperties = { background: '#fff', borderRadius: 18, padding: 24, marginTop: 18, boxShadow: '0 5px 20px rgba(13,27,46,.07)', border: '1px solid #e7edf3' };
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: '#0d1b2e', fontSize: 15, fontWeight: 900, letterSpacing: .3, marginBottom: 14 };
const theaterButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #dbe3ec', background: '#f8fafc', color: '#475569', borderRadius: 7, padding: '8px 10px', fontSize: 11, fontWeight: 800, cursor: 'pointer' };
const activeTheaterButton: React.CSSProperties = { background: '#0d1b2e', borderColor: '#0d1b2e', color: '#f4c04a' };
const showtimeButton: React.CSSProperties = { border: '1px solid #f0c454', background: '#fffaf0', color: '#855b00', borderRadius: 9, padding: '10px 14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 };
const trailerCard: React.CSSProperties = { background: '#071526', borderRadius: 18, padding: 24, marginTop: 18, color: '#fff' };
const trailerFrame: React.CSSProperties = { aspectRatio: '16 / 9', maxWidth: 850, margin: '0 auto', overflow: 'hidden', borderRadius: 12, background: '#000' };
const videoFrame: React.CSSProperties = { display: 'block', width: '100%', height: '100%', border: 0 };
