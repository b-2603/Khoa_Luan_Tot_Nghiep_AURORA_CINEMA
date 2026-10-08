import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CalendarDays, CheckCircle2, ChevronRight, Clock3, Film,
  MapPin, RefreshCw, Search, Sparkles, Ticket, Users,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Props = {
  theaters: any[];
  movies: any[];
  selectedTheaterId: number | null;
  language?: 'vi' | 'en';
  onSelectTheater: (theater: any) => void;
  onBook: (movie: any, showtime: any) => void;
};

function getVietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function nextSevenDays(today: string, locale: string) {
  const start = new Date(`${today}T00:00:00+07:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(start.getTime() + index * 86400000);
    const key = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
    return {
      key,
      weekday: index === 0 ? (locale === 'en-GB' ? 'Today' : 'Hôm nay') : new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(value),
      day: new Intl.DateTimeFormat(locale, { day: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(value),
      month: new Intl.DateTimeFormat(locale, { month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(value),
    };
  });
}

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(`${value}T00:00:00+07:00`));
}

function timeOf(value: string) {
  return String(value || '').slice(11, 16);
}

function ratingClass(value: unknown) {
  return `rating-${String(value || 'P').toLowerCase()}`;
}

export default function TheaterSchedulePage({ theaters, movies, selectedTheaterId, language = 'vi', onSelectTheater, onBook }: Props) {
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const [today, setToday] = useState(getVietnamToday);
  const dates = useMemo(() => nextSevenDays(today, locale), [today, locale]);
  const [date, setDate] = useState(getVietnamToday);
  const [showtimes, setShowtimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [serverTime, setServerTime] = useState('');
  const theater = theaters.find(item => Number(item.id) === Number(selectedTheaterId)) || theaters[0];

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentToday = getVietnamToday();
      setToday(previous => previous === currentToday ? previous : currentToday);
      setRefreshTick(value => value + 1);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setDate(current => dates.some(item => item.key === current) ? current : today);
  }, [dates, today]);

  useEffect(() => {
    if (!theater?.id || !date) return;
    const controller = new AbortController();
    setLoading(true); setError(''); setShowtimes([]); setServerTime('');
    fetch(`${API_URL}?action=showtimes&theater_id=${theater.id}&date=${date}`, {
      credentials: 'include', cache: 'no-store', signal: controller.signal,
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || t('Không thể tải lịch chiếu.', 'Unable to load the schedule.'));
        return data;
      })
      .then(data => { setShowtimes(Array.isArray(data.showtimes) ? data.showtimes : []); setServerTime(data.serverTime || ''); })
      .catch(cause => { if (cause.name !== 'AbortError') { setShowtimes([]); setError(cause.message || t('Không thể tải lịch chiếu.', 'Unable to load the schedule.')); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [theater?.id, date, refreshTick, language]);

  const scheduledMovies = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase(locale);
    const ids = new Set(showtimes.map(item => Number(item.movie_id)));
    return movies.filter(movie => ids.has(Number(movie.id)) && (!keyword || String(movie.title).toLocaleLowerCase(locale).includes(keyword) || String(movie.genre || '').toLocaleLowerCase(locale).includes(keyword)));
  }, [movies, showtimes, searchQuery, locale]);

  const totalSeatsLeft = showtimes.reduce((total, showtime) => total + Number(showtime.seats_left || 0), 0);
  const nextShowtime = showtimes[0];

  function recordEvent(eventType: string, showtimeId = 0, selectedDate = date, theaterId = Number(theater?.id || 0)) {
    if (!theaterId || !selectedDate) return;
    fetch(`${API_URL}?action=theater_schedule_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, theaterId, selectedDate, showtimeId }),
    }).catch(() => {});
  }

  function chooseTheater(item: any) {
    onSelectTheater(item);
    recordEvent('SELECT_THEATER', 0, date, Number(item.id));
  }

  function chooseDate(value: string) {
    setDate(value);
    recordEvent('SELECT_DATE', 0, value);
  }

  function chooseShowtime(movie: any, showtime: any) {
    recordEvent('SELECT_SHOWTIME', Number(showtime.id));
    onBook(movie, showtime);
  }

  return <main className="cinema-schedule-v2">
    <div className="cinema-schedule-shell">
      <header className="cinema-schedule-hero">
        <div>
          <span className="cinema-schedule-kicker"><Sparkles size={14}/>{t('Aurora Cinema · Lịch chiếu', 'Aurora Cinema · Showtimes')}</span>
          <h1>{t('Chọn rạp. Chọn phim. Tận hưởng.', 'Choose a cinema. Pick a movie. Enjoy.')}</h1>
          <p>{t('Toàn bộ suất chiếu được đồng bộ trực tiếp theo thời gian thực. Các suất đã bắt đầu sẽ tự động được ẩn.', 'Every showtime is synchronized in real time. Sessions that have started are automatically hidden.')}</p>
        </div>
        <div className="cinema-schedule-stats">
          <div><Film size={19}/><span><b>{scheduledMovies.length}</b>{t('phim đang mở bán', 'movies on sale')}</span></div>
          <div><Ticket size={19}/><span><b>{showtimes.length}</b>{t('suất còn hiệu lực', 'available sessions')}</span></div>
          <div><Clock3 size={19}/><span><b>{nextShowtime ? timeOf(nextShowtime.starts_at) : '—'}</b>{t('suất gần nhất', 'next session')}</span></div>
        </div>
      </header>

      <section className="cinema-schedule-controls" aria-label={t('Bộ lọc lịch chiếu', 'Schedule filters')}>
        <div className="cinema-theater-heading"><div><MapPin size={18}/><span><b>{t('Cụm rạp Aurora', 'Aurora cinemas')}</b><small>{t('Chọn địa điểm thuận tiện nhất cho bạn', 'Choose your most convenient location')}</small></span></div>{theater && <p><MapPin size={13}/>{theater.address}</p>}</div>
        <div className="cinema-theater-list">
          {theaters.map(item => {
            const active = Number(item.id) === Number(theater?.id);
            return <button key={item.id} className={active ? 'active' : ''} aria-pressed={active} onClick={() => chooseTheater(item)}><span>{item.name}</span><small>{item.screens?.length || 0} {t('phòng chiếu', 'screens')}</small>{active && <CheckCircle2 size={16}/>}</button>;
          })}
        </div>

        <div className="cinema-date-heading"><div><CalendarDays size={17}/><b>{t('Ngày xem phim', 'Movie date')}</b></div><span>{t('Hôm nay và 6 ngày tiếp theo', 'Today and the next 6 days')}</span></div>
        <div className="cinema-date-list">
          {dates.map(item => {
            const active = item.key === date;
            return <button key={item.key} className={active ? 'active' : ''} aria-pressed={active} onClick={() => chooseDate(item.key)}><small>{item.weekday}</small><span><b>{item.day}</b>/{item.month}</span>{active && <i/>}</button>;
          })}
        </div>
      </section>

      <section className="cinema-schedule-content">
        <div className="cinema-schedule-toolbar">
          <div><span>{theater?.name || t('Cụm rạp Aurora', 'Aurora cinema')}</span><h2>{formatDate(date, locale)}</h2><p>{showtimes.length} {t('suất chiếu còn mở', 'open showtimes')} · {totalSeatsLeft.toLocaleString('vi-VN')} {t('ghế còn lại', 'seats remaining')}</p></div>
          <label><Search size={16}/><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t('Tìm phim hoặc thể loại...', 'Search movies or genres...')} /></label>
        </div>

        {loading ? <div className="cinema-schedule-loading">{Array.from({ length: 3 }, (_, index) => <div key={index}><i/><span><b/><b/><b/></span></div>)}</div>
        : error ? <div className="cinema-schedule-state error"><AlertCircle size={34}/><b>{t('Không thể tải lịch chiếu', 'Unable to load the schedule')}</b><p>{error}</p><button onClick={() => setRefreshTick(value => value + 1)}><RefreshCw size={15}/>{t('Thử lại', 'Try again')}</button></div>
        : scheduledMovies.length === 0 ? <div className="cinema-schedule-state"><CalendarDays size={36}/><b>{searchQuery ? t('Không tìm thấy phim phù hợp', 'No matching movies found') : t('Không còn suất chiếu trong ngày', 'No showtimes remain today')}</b><p>{searchQuery ? t('Hãy thử một tên phim hoặc thể loại khác.', 'Try another movie title or genre.') : t('Chọn ngày khác để tiếp tục khám phá lịch chiếu tại Aurora.', 'Choose another date to keep exploring Aurora showtimes.')}</p>{searchQuery && <button onClick={() => setSearchQuery('')}>{t('Xóa tìm kiếm', 'Clear search')}</button>}</div>
        : <div className="cinema-movie-schedule-list">{scheduledMovies.map(movie => {
          const movieShowtimes = showtimes.filter(item => Number(item.movie_id) === Number(movie.id));
          return <article className="cinema-movie-schedule-card" key={movie.id}>
            <div className="cinema-movie-poster">{movie.posterUrl || movie.poster ? <img src={movie.posterUrl || movie.poster} alt={movie.title}/> : <Film size={32}/>}<span className={`home-v2-rating ${ratingClass(movie.ageRating || movie.rating)}`}>{movie.ageRating || movie.rating || 'P'}</span></div>
            <div className="cinema-movie-schedule-body">
              <div className="cinema-movie-title"><div><h3>{movie.title}</h3><p>{movie.genre || t('Điện ảnh', 'Cinema')} · {movie.duration || movie.durationMinutes || 0} {t('phút', 'min')}</p></div><span>{movie.format || '2D Digital'}</span></div>
              <div className="cinema-showtime-label"><span><Clock3 size={14}/>{t('Chọn suất chiếu', 'Choose a showtime')}</span><small>{t('Nhấn để tiếp tục chọn ghế', 'Select to continue to seats')}</small></div>
              <div className="cinema-showtime-grid">{movieShowtimes.map(showtime => {
                const availability = String(showtime.availability || 'AVAILABLE');
                return <button key={showtime.id} className={`cinema-showtime ${availability.toLowerCase()}`} disabled={availability === 'SOLD_OUT'} onClick={() => chooseShowtime(movie, showtime)}>
                  <span><b>{timeOf(showtime.starts_at)}</b><small>{timeOf(showtime.ends_at)}</small></span>
                  <em>{showtime.screen_name}</em>
                  <i><Users size={12}/>{availability === 'SOLD_OUT' ? t('Hết ghế', 'Sold out') : `${showtime.seats_left} ${t('ghế', 'seats')}`}</i>
                  {Number(showtime.ticket_price || 0) > 0 && <strong>{Number(showtime.ticket_price).toLocaleString('vi-VN')}đ</strong>}
                  <ChevronRight size={15}/>
                </button>;
              })}</div>
            </div>
          </article>;
        })}</div>}

        <footer className="cinema-schedule-note"><span><CheckCircle2 size={15}/>{t('Giờ chiếu và số ghế được cập nhật trực tiếp từ Aurora DB.', 'Showtimes and seat counts are updated directly from Aurora DB.')}</span><small>{serverTime ? `${t('Máy chủ cập nhật', 'Server updated')}: ${timeOf(serverTime)}` : ''}</small></footer>
      </section>
    </div>
  </main>;
}
