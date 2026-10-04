import { ArrowLeft, Clock3, Film } from 'lucide-react';
import MovieSchedulePanel from './MovieSchedulePanel';

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
  const trailerUrl = String(movie.trailerUrl || '').trim();
  const trailerId = trailerUrl && (trailerUrl.match(/[?&]v=([^&]+)/) || trailerUrl.match(/youtu\.be\/([^?]+)/) || trailerUrl.match(/youtube\.com\/embed\/([^?&/]+)/));
  const isDirectTrailer = /\.(mp4|webm|mov)(?:[?#].*)?$/i.test(trailerUrl);

  return <main style={{ maxWidth: 1120, margin: '0 auto', padding: '22px 20px 54px' }}>
    <button onClick={onBack} style={backButton}><ArrowLeft size={16} /> VỀ TRANG CHỦ</button>
    <div style={{ color: '#64748b', fontSize: 12, margin: '18px 0 14px' }}>Trang chủ <span style={{ color: '#c08a13' }}>›</span> Chi tiết phim <span style={{ color: '#c08a13' }}>›</span> {movie.title}</div>
    <section style={hero}>
      <div style={{ width: 250, minHeight: 365, borderRadius: 14, background: movie.posterUrl ? `url("${movie.posterUrl}") center/cover` : 'linear-gradient(145deg,#142945,#071526)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

    <MovieSchedulePanel movie={movie} theaters={theaters} initialTheaterName={theater} initialDate={date} onBook={onBook} />

    {(trailerId || isDirectTrailer) && <section style={trailerCard}><div style={{ ...sectionTitle, color: '#fff' }}><Film size={18} color="#f4c04a" /> TRAILER PHIM</div><div style={trailerFrame}>{trailerId ? <iframe title={`Trailer ${movie.title}`} src={`https://www.youtube.com/embed/${trailerId[1]}`} style={videoFrame} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video src={trailerUrl} style={videoFrame} controls preload="metadata">Trình duyệt không hỗ trợ phát video này.</video>}</div></section>}
  </main>;
}

const backButton: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid #cbd5e1', background: '#fff', color: '#0d1b2e', borderRadius: 8, padding: '8px 12px', fontWeight: 800, fontSize: 11, cursor: 'pointer' };
const hero: React.CSSProperties = { display: 'flex', gap: 30, background: '#fff', borderRadius: 18, padding: 26, boxShadow: '0 5px 20px rgba(13,27,46,.07)', border: '1px solid #e7edf3' };
const eyebrow: React.CSSProperties = { color: '#b8860b', fontSize: 10, fontWeight: 900, letterSpacing: 1 };
const meta: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', color: '#64748b', fontSize: 12 };
const rating: React.CSSProperties = { background: '#f4c04a', color: '#0d1b2e', borderRadius: 5, padding: '4px 8px', fontWeight: 900 };
const description: React.CSSProperties = { color: '#475569', fontSize: 14, lineHeight: 1.75, margin: '20px 0' };
const facts: React.CSSProperties = { display: 'grid', gridTemplateColumns: '110px 1fr', gap: '9px 18px', fontSize: 13, color: '#475569', borderTop: '1px solid #eef2f6', paddingTop: 15 };
const sectionTitle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, color: '#0d1b2e', fontSize: 15, fontWeight: 900, letterSpacing: .3, marginBottom: 14 };
const trailerCard: React.CSSProperties = { background: '#071526', borderRadius: 18, padding: 24, marginTop: 18, color: '#fff' };
const trailerFrame: React.CSSProperties = { aspectRatio: '16 / 9', maxWidth: 850, margin: '0 auto', overflow: 'hidden', borderRadius: 12, background: '#000' };
const videoFrame: React.CSSProperties = { display: 'block', width: '100%', height: '100%', border: 0 };
