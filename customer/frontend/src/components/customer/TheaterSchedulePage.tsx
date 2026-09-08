import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Ticket } from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  theaters: any[];
  movies: any[];
  selectedTheaterId: number | null;
  onSelectTheater: (theater: any) => void;
  onBook: (movie: any, showtime: any) => void;
};

const toDateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dates = Array.from({ length: 7 }, (_, index) => {
  const date = new Date(2026, 8, 4 + index);
  return { key: toDateKey(date), day: String(date.getDate()).padStart(2, '0'), month: `/${String(date.getMonth() + 1).padStart(2, '0')}`, weekDay: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()] };
});

function timeOf(value: string) {
  return new Date(value.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export default function TheaterSchedulePage({ theaters, movies, selectedTheaterId, onSelectTheater, onBook }: Props) {
  const [date, setDate] = useState(dates[0].key);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const theater = theaters.find(item => item.id === selectedTheaterId) || theaters[0];

  useEffect(() => {
    if (!theater?.id) return;
    setLoading(true);
    fetch(`${API_URL}?action=showtimes&theater_id=${theater.id}&date=${date}`)
      .then(response => response.json())
      .then(data => setShowtimes(data.showtimes || []))
      .catch(() => setShowtimes([]))
      .finally(() => setLoading(false));
  }, [theater?.id, date]);

  const moviesWithShowtimes = useMemo(() => {
    const scheduledIds = new Set(showtimes.map(item => item.movie_id));
    return movies.filter(movie => scheduledIds.has(movie.id));
  }, [movies, showtimes]);

  return <main style={{ minHeight: 'calc(100vh - 96px)', background: '#f3f6fa', padding: '28px 16px 52px' }}>
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <div style={{ marginBottom: 22 }}>
        <div style={{ color: '#d99216', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 7 }}>AURORA CINEMA · SHOWTIMES</div>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0d1b2e', letterSpacing: -.5 }}>Lịch chiếu theo rạp</h1>
        <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 13.5 }}>Chọn rạp và ngày để xem các suất chiếu đang mở.</p>
      </div>

      <section style={{ borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 5px 18px rgba(15,23,42,.05)', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '16px 20px', background: '#0d1b2e', color: '#fff', display: 'flex', gap: 10, alignItems: 'center' }}><MapPin size={18} color="#f4c04a" /><b style={{ fontSize: 14 }}>Chọn cụm rạp Aurora</b></div>
        <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>{theaters.map(item => {
          const active = item.id === theater?.id;
          return <button key={item.id} onClick={() => onSelectTheater(item)} style={{ border: active ? '1px solid #d99216' : '1px solid #dbe4ee', background: active ? '#fff7dd' : '#fff', color: active ? '#9a6700' : '#334155', borderRadius: 9, padding: '9px 12px', cursor: 'pointer', fontSize: 12.5, fontWeight: active ? 800 : 650 }}>{item.name}</button>;
        })}</div>
        {theater && <div style={{ padding: '0 20px 17px', color: '#64748b', fontSize: 12.5, display: 'flex', gap: 7, alignItems: 'start' }}><MapPin size={14} color="#d99216" style={{ flexShrink: 0, marginTop: 1 }} />{theater.address}</div>}
      </section>

      <section style={{ borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
        <div style={{ padding: '14px 20px 0', display: 'flex', alignItems: 'center', gap: 8, color: '#0d1b2e', fontWeight: 800, fontSize: 14 }}><CalendarDays size={17} color="#d99216" /> Chọn ngày xem phim</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(80px, 1fr))', overflowX: 'auto', padding: '13px 15px 15px', gap: 7 }}>{dates.map(item => {
          const active = item.key === date;
          return <button key={item.key} onClick={() => setDate(item.key)} style={{ minWidth: 80, padding: '11px 6px', borderRadius: 10, border: active ? '2px solid #d99216' : '1px solid #e2e8f0', color: active ? '#9a6700' : '#475569', background: active ? '#fff7dd' : '#fff', cursor: 'pointer' }}><div style={{ fontSize: 10.5, fontWeight: 700 }}>{item.weekDay}</div><div style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 900 }}>{item.day}<span style={{ fontSize: 11 }}>{item.month}</span></div></button>;
        })}</div>
      </section>

      <section style={{ borderRadius: 16, background: '#fff', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '17px 20px', borderBottom: '1px solid #e8edf4', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}><div><b style={{ color: '#0d1b2e', fontSize: 16 }}>{theater?.name || 'Cụm rạp Aurora'}</b><div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{dates.find(item => item.key === date)?.day}{dates.find(item => item.key === date)?.month}/2026 · {moviesWithShowtimes.length} phim đang có suất chiếu</div></div><span style={{ color: '#9a6700', background: '#fff7dd', padding: '5px 9px', borderRadius: 20, fontSize: 11, fontWeight: 800 }}>SUẤT ĐANG MỞ</span></div>
        {loading ? <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}><Clock3 size={28} /><div style={{ marginTop: 8 }}>Đang tải lịch chiếu...</div></div> : moviesWithShowtimes.length === 0 ? <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}><div style={{ fontSize: 38 }}>🎬</div><b style={{ display: 'block', color: '#334155', margin: '10px 0 5px' }}>Chưa có lịch chiếu</b>Vui lòng chọn ngày hoặc cụm rạp khác.</div> : <div>{moviesWithShowtimes.map((movie, index) => {
          const movieShowtimes = showtimes.filter(item => item.movie_id === movie.id);
          return <article key={movie.id} style={{ display: 'grid', gridTemplateColumns: '118px 1fr', gap: 18, padding: 20, borderBottom: index < moviesWithShowtimes.length - 1 ? '1px solid #e8edf4' : 'none' }}>
            <img src={movie.posterUrl || movie.poster} alt={movie.title} style={{ width: 118, height: 166, borderRadius: 10, objectFit: 'cover', background: '#e2e8f0' }} />
            <div><div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}><h2 style={{ fontSize: 18, color: '#0d1b2e', margin: 0 }}>{movie.title}</h2><span style={{ background: '#d99216', color: '#fff', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 900 }}>{movie.ageRating || movie.rating}</span></div><div style={{ color: '#64748b', fontSize: 12.5, marginTop: 7 }}>{movie.format || '2D Digital'} · {movie.duration || '—'} phút</div><div style={{ color: '#475569', fontSize: 12, fontWeight: 800, marginTop: 21, marginBottom: 9 }}>CHỌN SUẤT CHIẾU</div><div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{movieShowtimes.map(showtime => <button key={showtime.id} onClick={() => onBook(movie, showtime)} title={`${showtime.screen_name} · ${Number(showtime.ticket_price).toLocaleString('vi-VN')}đ`} style={{ minWidth: 78, border: '1px solid #d99216', background: '#fffaf0', color: '#9a6700', borderRadius: 8, padding: '8px 9px', cursor: 'pointer', fontWeight: 900, fontSize: 13 }}><div>{timeOf(showtime.starts_at)}</div><div style={{ color: '#64748b', fontWeight: 600, fontSize: 9.5, marginTop: 3 }}>{showtime.screen_name.replace('Phòng ', 'P.')}</div></button>)}</div></div>
          </article>;
        })}</div>}
      </section>
    </div>
  </main>;
}
