import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3,
  Film, Gift, MapPin, Play, Search, ShieldCheck, Smartphone, Sparkles,
  Ticket, Trophy, Users,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Language = 'vi' | 'en';

type CustomerHomeProps = {
  language: Language;
  user: { fullName: string; email: string; membershipLevel?: string; points?: number } | null;
  movies: any[];
  promotions: any[];
  theaters: any[];
  selectedTheaterId: number | null;
  selectedTheaterName: string;
  onSelectTheater: (theater: any) => void;
  onOpenMovie: (movie: any) => void;
  onWatchTrailer: (movie: any) => void;
  onBook: (movie: any, showtime: any, theaterName: string) => void;
  onOpenSchedule: () => void;
  onOpenMovies: () => void;
  onOpenPrices: () => void;
  onOpenOffers: () => void;
  onOpenAccount: () => void;
  onRegister: () => void;
};

function vietnamToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function dateRange() {
  const base = new Date(`${vietnamToday()}T00:00:00+07:00`);
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(base.getTime() + offset * 86400000);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  });
}

function timeLabel(value: string) {
  return String(value || '').slice(11, 16);
}

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function ratingClass(value: unknown) {
  return `rating-${String(value || 'P').toLowerCase()}`;
}

export default function CustomerHome({
  language, user, movies, promotions, theaters, selectedTheaterId, selectedTheaterName,
  onSelectTheater, onOpenMovie, onWatchTrailer, onBook, onOpenSchedule, onOpenMovies,
  onOpenPrices, onOpenAccount, onRegister,
  onOpenOffers,
}: CustomerHomeProps) {
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const dates = useMemo(dateRange, []);
  const [activeMovieTab, setActiveMovieTab] = useState<'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING'>('NOW_SHOWING');
  const [heroIndex, setHeroIndex] = useState(0);
  const [quickTheaterId, setQuickTheaterId] = useState<number>(selectedTheaterId || 0);
  const [quickMovieId, setQuickMovieId] = useState<number>(0);
  const [quickDate, setQuickDate] = useState(dates[0]);
  const [quickShowtimes, setQuickShowtimes] = useState<any[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [quickSearched, setQuickSearched] = useState(false);

  useEffect(() => {
    if (selectedTheaterId) setQuickTheaterId(selectedTheaterId);
  }, [selectedTheaterId]);

  const featuredMovies = useMemo(() => movies
    .filter(movie => movie.status === 'NOW_SHOWING')
    .sort((a, b) => Number(Boolean(b.isHot)) - Number(Boolean(a.isHot)))
    .slice(0, 4), [movies]);
  const heroMovie = featuredMovies[heroIndex] || featuredMovies[0];
  const visibleMovies = movies.filter(movie => movie.status === activeMovieTab).slice(0, 8);
  const memberPoints = Number(user?.points || 0);
  const nextTarget = memberPoints < 500 ? 500 : memberPoints < 2000 ? 2000 : memberPoints < 5000 ? 5000 : 10000;
  const memberProgress = Math.min(100, Math.round(memberPoints * 100 / nextTarget));

  function recordEvent(eventType: string, entityType = '', entityId = 0, metadata: Record<string, unknown> = {}) {
    fetch(`${API_URL}?action=home_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventType, entityType, entityId, metadata }),
    }).catch(() => {});
  }

  async function searchShowtimes() {
    if (!quickTheaterId) {
      setQuickError(t('Vui lòng chọn cụm rạp.', 'Please choose a cinema.'));
      return;
    }
    setQuickLoading(true); setQuickError(''); setQuickSearched(true);
    const params = new URLSearchParams({ theater_id: String(quickTheaterId), date: quickDate });
    if (quickMovieId) params.set('movie_id', String(quickMovieId));
    try {
      const response = await fetch(`${API_URL}?action=showtimes&${params.toString()}`, { credentials: 'include', cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || t('Không thể tải suất chiếu.', 'Unable to load showtimes.'));
      setQuickShowtimes(Array.isArray(result.showtimes) ? result.showtimes : []);
      recordEvent('QUICK_SEARCH', 'theater', quickTheaterId, { movieId: quickMovieId || null, date: quickDate, resultCount: result.showtimes?.length || 0 });
    } catch (error) {
      setQuickShowtimes([]);
      setQuickError(error instanceof Error ? error.message : t('Không thể tải suất chiếu.', 'Unable to load showtimes.'));
    } finally {
      setQuickLoading(false);
    }
  }

  function chooseShowtime(showtime: any) {
    const movie = movies.find(item => Number(item.id) === Number(showtime.movie_id));
    const theater = theaters.find(item => Number(item.id) === Number(showtime.theater_id));
    if (!movie) return;
    recordEvent('SELECT_SHOWTIME', 'showtime', Number(showtime.id), { movieId: movie.id, theaterId: showtime.theater_id });
    onBook(movie, showtime, theater?.name || selectedTheaterName);
  }

  return <main className="home-v2">
    <section className="home-v2-hero-grid" aria-label={t('Nội dung nổi bật', 'Featured content')}>
      <article className="home-v2-hero">
        {heroMovie?.bannerUrl || heroMovie?.posterUrl || heroMovie?.poster ? <img className="home-v2-hero-backdrop" src={heroMovie.bannerUrl || heroMovie.posterUrl || heroMovie.poster} alt="" /> : null}
        <div className="home-v2-hero-overlay" />
        <div className="home-v2-hero-content">
          <span className="home-v2-eyebrow"><Sparkles size={14}/>{t('Trải nghiệm điện ảnh Aurora', 'The Aurora cinema experience')}</span>
          <h1>{heroMovie?.title || t('Chạm vào từng khoảnh khắc điện ảnh', 'Experience every cinematic moment')}</h1>
          <p>{heroMovie?.description || t('Khám phá phim mới, chọn suất chiếu phù hợp và đặt ghế chỉ trong vài phút.', 'Discover new movies, find the right showtime and reserve your seats in minutes.')}</p>
          <div className="home-v2-hero-meta">
            {heroMovie && <><span className={`home-v2-rating ${ratingClass(heroMovie.ageRating || heroMovie.rating)}`}>{heroMovie.ageRating || heroMovie.rating}</span><span><Clock3 size={15}/>{heroMovie.duration || heroMovie.durationMinutes} {t('phút', 'min')}</span><span><Film size={15}/>{heroMovie.format || '2D Digital'}</span></>}
          </div>
          <div className="home-v2-actions">
            <button className="home-v2-primary" onClick={() => heroMovie && onOpenMovie(heroMovie)}><Ticket size={17}/>{t('Đặt vé ngay', 'Book now')}</button>
            {heroMovie && <button className="home-v2-secondary" onClick={() => onWatchTrailer(heroMovie)}><Play size={16}/>{t('Xem trailer', 'Watch trailer')}</button>}
          </div>
        </div>
        {featuredMovies.length > 1 && <div className="home-v2-hero-nav">
          <button aria-label={t('Phim trước', 'Previous movie')} onClick={() => setHeroIndex(index => (index - 1 + featuredMovies.length) % featuredMovies.length)}><ChevronLeft size={18}/></button>
          <span>{String(heroIndex + 1).padStart(2, '0')} / {String(featuredMovies.length).padStart(2, '0')}</span>
          <button aria-label={t('Phim tiếp theo', 'Next movie')} onClick={() => setHeroIndex(index => (index + 1) % featuredMovies.length)}><ChevronRight size={18}/></button>
        </div>}
      </article>

      <aside className="home-v2-rail">
        <article className="home-v2-member-card">
          <div className="home-v2-card-heading"><span><Trophy size={18}/>{t('Aurora Rewards', 'Aurora Rewards')}</span><small>{user ? user.membershipLevel || 'STANDARD' : t('KHÁCH', 'GUEST')}</small></div>
          {user ? <>
            <h2>{t('Xin chào,', 'Welcome,')} {user.fullName.split(' ').slice(-2).join(' ')}</h2>
            <p>{memberPoints.toLocaleString('vi-VN')} / {nextTarget.toLocaleString('vi-VN')} {t('điểm', 'points')}</p>
            <div className="home-v2-progress"><i style={{ width: `${memberProgress}%` }}/></div>
            <button onClick={onOpenAccount}>{t('Xem quyền lợi thành viên', 'View member benefits')}<ArrowRight size={15}/></button>
          </> : <>
            <h2>{t('Mỗi bộ phim, thêm một đặc quyền', 'Every movie unlocks more rewards')}</h2>
            <p>{t('Tích điểm, nhận voucher và ưu đãi dành riêng cho thành viên.', 'Earn points, vouchers and exclusive member offers.')}</p>
            <button onClick={onRegister}>{t('Tham gia Aurora', 'Join Aurora')}<ArrowRight size={15}/></button>
          </>}
        </article>

        <article className="home-v2-offer-card">
          <div className="home-v2-offer-icon"><Gift size={22}/></div>
          <div><span>{t('Ưu đãi nổi bật', 'Featured offer')}</span><h3>{promotions[0]?.name || t('Ưu đãi dành cho bạn', 'Offers made for you')}</h3><p>{promotions[0]?.description || t('Khám phá voucher và combo mới nhất từ Aurora.', 'Discover Aurora’s latest vouchers and combos.')}</p></div>
          <button onClick={() => { if (promotions[0]) recordEvent('VIEW_PROMOTION', 'promotion', Number(promotions[0].id)); onOpenOffers(); }}>{t('Khám phá', 'Explore')}<ArrowRight size={14}/></button>
        </article>

        <article className="home-v2-trust-card">
          <ShieldCheck size={22}/><div><b>{t('Đặt vé an tâm', 'Book with confidence')}</b><span>{t('Giữ ghế theo thời gian thực · Thanh toán bảo mật', 'Real-time seat holds · Secure checkout')}</span></div>
        </article>
      </aside>
    </section>

    <section className="home-v2-quick" aria-labelledby="quick-booking-title">
      <div className="home-v2-section-heading compact"><div><span>{t('Nhanh chóng & chính xác', 'Fast and precise')}</span><h2 id="quick-booking-title">{t('Tìm suất chiếu phù hợp', 'Find your perfect showtime')}</h2></div><button onClick={onOpenSchedule}>{t('Xem toàn bộ lịch chiếu', 'View full schedule')}<ArrowRight size={15}/></button></div>
      <div className="home-v2-quick-form">
        <label><span><MapPin size={14}/>{t('Cụm rạp', 'Cinema')}</span><select value={quickTheaterId} onChange={event => { const id = Number(event.target.value); setQuickTheaterId(id); const theater = theaters.find(item => Number(item.id) === id); if (theater) onSelectTheater(theater); }}><option value={0}>{t('Chọn cụm rạp', 'Choose a cinema')}</option>{theaters.map(theater => <option key={theater.id} value={theater.id}>{theater.name}</option>)}</select></label>
        <label><span><Film size={14}/>{t('Phim', 'Movie')}</span><select value={quickMovieId} onChange={event => setQuickMovieId(Number(event.target.value))}><option value={0}>{t('Tất cả phim', 'All movies')}</option>{movies.filter(movie => movie.status === 'NOW_SHOWING' || movie.status === 'SPECIAL_SHOWING').map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}</select></label>
        <label><span><CalendarDays size={14}/>{t('Ngày chiếu', 'Date')}</span><select value={quickDate} onChange={event => setQuickDate(event.target.value)}>{dates.map((date, index) => <option key={date} value={date}>{index === 0 ? t('Hôm nay · ', 'Today · ') : ''}{new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${date}T00:00:00+07:00`))}</option>)}</select></label>
        <button className="home-v2-search" onClick={searchShowtimes} disabled={quickLoading}><Search size={17}/>{quickLoading ? t('Đang tìm...', 'Searching...') : t('Tìm suất chiếu', 'Find showtimes')}</button>
      </div>
      {quickError && <p className="home-v2-quick-error">{quickError}</p>}
      {quickSearched && !quickLoading && !quickError && <div className="home-v2-quick-results">
        {quickShowtimes.length ? quickShowtimes.slice(0, 8).map(showtime => <button key={showtime.id} onClick={() => chooseShowtime(showtime)}><span><b>{timeLabel(showtime.starts_at)}</b><small>{showtime.movie_title}</small></span><em>{showtime.screen_name} · {money(showtime.ticket_price)}</em></button>) : <div className="home-v2-empty"><CalendarDays size={20}/>{t('Không còn suất chiếu phù hợp trong ngày đã chọn.', 'No suitable showtimes remain on the selected date.')}</div>}
      </div>}
    </section>

    <section className="home-v2-catalogue">
      <div className="home-v2-section-heading"><div><span>{t('Đang có tại Aurora', 'Now at Aurora')}</span><h2>{t('Khám phá điện ảnh', 'Discover cinema')}</h2></div><button onClick={onOpenMovies}>{t('Xem tất cả phim', 'View all movies')}<ArrowRight size={15}/></button></div>
      <div className="home-v2-tabs" role="tablist">
        {([
          ['NOW_SHOWING', t('Đang chiếu', 'Now showing')],
          ['COMING_SOON', t('Sắp chiếu', 'Coming soon')],
          ['SPECIAL_SHOWING', t('Suất đặc biệt', 'Special screenings')],
        ] as const).map(([key, label]) => <button key={key} role="tab" aria-selected={activeMovieTab === key} className={activeMovieTab === key ? 'active' : ''} onClick={() => setActiveMovieTab(key)}>{label}<span>{movies.filter(movie => movie.status === key).length}</span></button>)}
      </div>
      {visibleMovies.length ? <div className="home-v2-movie-grid">
        {visibleMovies.map(movie => <article className="home-v2-movie-card" key={movie.id}>
          <button className="home-v2-poster" onClick={() => onOpenMovie(movie)} aria-label={`${t('Xem chi tiết', 'View details')} ${movie.title}`}>
            {movie.posterUrl || movie.poster ? <img src={movie.posterUrl || movie.poster} alt={movie.title}/> : <Film size={40}/>}<span className={`home-v2-rating ${ratingClass(movie.ageRating || movie.rating)}`}>{movie.ageRating || movie.rating || 'P'}</span>{movie.isHot && <em><Sparkles size={11}/>{t('Nổi bật', 'Featured')}</em>}
          </button>
          <div className="home-v2-movie-copy"><h3 title={movie.title}>{movie.title}</h3><p><span><Clock3 size={13}/>{movie.duration || movie.durationMinutes || 0} {t('phút', 'min')}</span><span>{movie.format || '2D Digital'}</span></p></div>
          <div className="home-v2-movie-actions"><button onClick={() => onOpenMovie(movie)}>{activeMovieTab === 'COMING_SOON' ? t('Xem chi tiết', 'View details') : t('Chọn suất chiếu', 'Choose showtime')}</button><button aria-label={t('Xem trailer', 'Watch trailer')} onClick={() => onWatchTrailer(movie)}><Play size={15}/></button></div>
        </article>)}
      </div> : <div className="home-v2-empty catalogue"><Film size={24}/>{t('Danh mục này đang được cập nhật từ Aurora DB.', 'This catalogue is being updated from Aurora DB.')}</div>}
    </section>

    <section className="home-v2-benefits">
      <div><Ticket/><b>{t('Đặt vé linh hoạt', 'Flexible booking')}</b><span>{t('Chọn rạp, suất và ghế theo thời gian thực', 'Choose cinema, showtime and seats in real time')}</span></div>
      <div><Users/><b>{t('Đặc quyền thành viên', 'Member privileges')}</b><span>{t('Tích điểm minh bạch sau mỗi giao dịch', 'Transparent points after every purchase')}</span></div>
      <div><Smartphone/><b>{t('Trải nghiệm liền mạch', 'Seamless experience')}</b><span>{t('Thông tin đồng bộ trên toàn hệ thống Aurora', 'Information synced across Aurora')}</span></div>
      <div><Check/><b>{t('Dữ liệu chính xác', 'Accurate data')}</b><span>{t('Phim và suất chiếu trực tiếp từ aurora_db', 'Movies and showtimes live from aurora_db')}</span></div>
    </section>
  </main>;
}
