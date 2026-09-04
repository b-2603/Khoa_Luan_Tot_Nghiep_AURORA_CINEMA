import { Clock3, Film, MapPin, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Movie = {
  id: number;
  title: string;
  description?: string;
  duration?: number;
  durationMinutes?: number;
  rating?: string;
  ageRating?: string;
  format?: string;
  poster?: string;
  posterUrl?: string;
  trailerUrl?: string;
  releaseDate?: string;
  status?: string;
};

type Showtime = { id: number; movie_id: number; starts_at: string; screen_name?: string; ticket_price: number };

type Props = {
  movie: Movie;
  theater: string;
  showtimes: Showtime[];
  onClose: () => void;
  onBook: (showtime: Showtime) => void;
  theaters?: { id: number; name: string; city?: string }[];
  date?: string;
};

export default function MovieDetailModal({ movie, theater, showtimes, onClose, onBook, theaters = [], date = '2026-09-04' }: Props) {
  const initialTheater = theaters.find(item => item.name === theater) || theaters[0];
  const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(initialTheater ? initialTheater.id : null);
  const [currentShowtimes, setCurrentShowtimes] = useState<Showtime[]>(showtimes);
  const duration = movie.durationMinutes || movie.duration;
  const poster = movie.posterUrl || movie.poster;
  const trailerId = movie.trailerUrl && (movie.trailerUrl.match(/[?&]v=([^&]+)/) || movie.trailerUrl.match(/youtu\.be\/([^?]+)/));

  useEffect(() => {
    if (selectedTheaterId === null) return;
    fetch(`${API_URL}?action=showtimes&theater_id=${selectedTheaterId}&date=${date}`)
      .then(response => response.json())
      .then(result => setCurrentShowtimes((result.showtimes || []).filter((item: Showtime) => item.movie_id === movie.id)))
      .catch(() => setCurrentShowtimes([]));
  }, [selectedTheaterId, movie.id, date]);

  const selectedTheaterName = theaters.find(item => item.id === selectedTheaterId)?.name || theater;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <section style={modalStyle} onClick={event => event.stopPropagation()}>
        <button onClick={onClose} style={closeStyle} aria-label="Đóng"><X size={19} /></button>
        <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr', gap: 24 }}>
          <div style={{ borderRadius: 12, minHeight: 270, background: poster ? `url(${poster}) center/cover` : 'linear-gradient(145deg,#152b46,#071628)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!poster && <Film size={46} color="#f4c04a" />}
          </div>
          <div>
            <div style={eyebrow}>AURORA CINEMA · CHI TIẾT PHIM</div>
            <h2 style={{ margin: '7px 0 10px', color: '#0d1b2e', fontSize: 28 }}>{movie.title}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              <span style={pill}>{movie.ageRating || movie.rating || 'P'}</span>
              <span><Clock3 size={14} style={{ verticalAlign: 'middle' }} /> {duration || 'Đang cập nhật'} phút</span>
              <span><Film size={14} style={{ verticalAlign: 'middle' }} /> {movie.format || '2D Digital'}</span>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: 14, lineHeight: 1.65 }}>{movie.description || 'Thông tin phim đang được cập nhật.'}</p>
            {movie.releaseDate && <div style={{ marginTop: 14, color: '#64748b', fontSize: 12 }}>Khởi chiếu: {movie.releaseDate}</div>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 22, paddingTop: 16 }}>
          <div style={{ color: '#0d1b2e', fontWeight: 900, fontSize: 14, marginBottom: 11 }}>LỊCH CHIẾU THEO CỤM RẠP</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 15 }}>
            {theaters.map(item => <button key={item.id} onClick={() => setSelectedTheaterId(item.id)} style={{ border: selectedTheaterId === item.id ? '1px solid #0d1b2e' : '1px solid #dbe3ec', background: selectedTheaterId === item.id ? '#0d1b2e' : '#f8fafc', color: selectedTheaterId === item.id ? '#f4c04a' : '#475569', borderRadius: 7, padding: '7px 10px', fontWeight: 800, fontSize: 11, cursor: 'pointer' }}>{item.name}</button>)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#0d1b2e', fontWeight: 900, fontSize: 13, marginBottom: 11 }}>
            <MapPin size={15} color="#d99b17" /> {selectedTheaterName.toUpperCase()} · 04/09/2026
          </div>
          {currentShowtimes.length === 0 ? <div style={{ color: '#94a3b8', fontSize: 13 }}>Chưa có suất chiếu cho ngày đang chọn.</div> : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
              {currentShowtimes.map(showtime => <button key={showtime.id} onClick={() => onBook(showtime)} style={timeButton}>
                {new Date(showtime.starts_at.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                <small>{Number(showtime.ticket_price).toLocaleString('vi-VN')}đ</small>
              </button>)}
            </div>
          )}
        </div>
        <button onClick={() => currentShowtimes[0] && onBook(currentShowtimes[0])} disabled={!currentShowtimes.length} style={{ ...primaryButton, opacity: currentShowtimes.length ? 1 : .5 }}><Ticket size={15} /> ĐẶT VÉ NGAY</button>
        {trailerId && <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 24, paddingTop: 18 }}>
          <div style={{ color: '#0d1b2e', fontWeight: 900, fontSize: 14, marginBottom: 11 }}>TRAILER PHIM</div>
          <div style={{ aspectRatio: '16 / 9', background: '#071628', borderRadius: 12, overflow: 'hidden' }}>
            <iframe title={`Trailer ${movie.title}`} src={`https://www.youtube.com/embed/${trailerId[1]}`} style={{ width: '100%', height: '100%', border: 0 }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>}
      </section>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(4,13,25,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 };
const modalStyle: React.CSSProperties = { width: 'min(760px, 100%)', maxHeight: '92vh', overflowY: 'auto', background: '#fff', borderRadius: 18, padding: 26, position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,.3)' };
const closeStyle: React.CSSProperties = { position: 'absolute', right: 16, top: 14, border: 0, background: '#f1f5f9', color: '#475569', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const eyebrow: React.CSSProperties = { color: '#b8860b', fontSize: 10, fontWeight: 900, letterSpacing: 1 };
const pill: React.CSSProperties = { background: '#f4c04a', color: '#0d1b2e', borderRadius: 5, padding: '3px 7px', fontWeight: 900 };
const timeButton: React.CSSProperties = { border: '1px solid #f4c04a', background: '#fffaf0', color: '#855b00', borderRadius: 8, padding: '8px 11px', fontWeight: 900, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 3 };
const primaryButton: React.CSSProperties = { marginTop: 20, border: 0, borderRadius: 9, padding: '11px 18px', background: '#0d1b2e', color: '#f4c04a', fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 };
