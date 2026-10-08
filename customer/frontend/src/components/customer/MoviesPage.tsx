import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronRight, Clock3, Film, MapPin, Play, Search,
  SlidersHorizontal, Sparkles, Ticket, Users, X,
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

export type Movie = {
  id: number;
  title: string;
  description?: string;
  durationMinutes: number;
  duration?: number;
  ageRating: string;
  rating?: string;
  format: string;
  genre?: string;
  posterUrl: string;
  poster?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  status: 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING' | 'ENDED';
  releaseDate?: string;
  isHot?: boolean;
  upcomingShowtimeCount?: number;
  nextShowtime?: string | null;
  minTicketPrice?: number | null;
  theaterCount?: number;
};

type Props = {
  movies: Movie[];
  theaters?: any[];
  selectedTheater?: string;
  language?: 'vi' | 'en';
  onSelectMovie: (movie: Movie) => void;
  onBookMovie: (movie: Movie) => void;
  onWatchTrailer?: (movie: Movie) => void;
  initialTab?: 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING';
};

type MovieTab = 'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING';
type SortMode = 'featured' | 'title' | 'release';

function ratingClass(value: unknown) {
  return `rating-${String(value || 'P').toLowerCase()}`;
}

function timeLabel(value?: string | null) {
  return value ? value.slice(11, 16) : '—';
}

function dateLabel(value: string | undefined, locale: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(`${value}T00:00:00+07:00`));
}

function money(value?: number | null) {
  return value == null ? '—' : `${Number(value).toLocaleString('vi-VN')}đ`;
}

export default function MoviesPage({
  movies, selectedTheater, language = 'vi', onSelectMovie, onBookMovie,
  onWatchTrailer, initialTab = 'NOW_SHOWING',
}: Props) {
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  const locale = language === 'en' ? 'en-GB' : 'vi-VN';
  const [activeTab, setActiveTab] = useState<MovieTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('featured');

  const tabMovies = useMemo(() => movies.filter(movie => movie.status === activeTab), [movies, activeTab]);
  const genres = useMemo(() => {
    const values = new Set<string>();
    tabMovies.forEach(movie => String(movie.genre || '').split(',').forEach(genre => {
      const normalized = genre.trim();
      if (normalized) values.add(normalized);
    }));
    return Array.from(values).sort((a, b) => a.localeCompare(b, locale));
  }, [tabMovies, locale]);

  const visibleMovies = useMemo(() => {
    const keyword = searchQuery.trim().toLocaleLowerCase(locale);
    return tabMovies.filter(movie => {
      const genre = String(movie.genre || '');
      const matchesSearch = !keyword || movie.title.toLocaleLowerCase(locale).includes(keyword) || genre.toLocaleLowerCase(locale).includes(keyword);
      const matchesGenre = selectedGenre === 'ALL' || genre.split(',').map(item => item.trim()).includes(selectedGenre);
      return matchesSearch && matchesGenre;
    }).sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title, locale);
      if (sortMode === 'release') return String(b.releaseDate || '').localeCompare(String(a.releaseDate || ''));
      return Number(Boolean(b.isHot)) - Number(Boolean(a.isHot)) || Number(b.upcomingShowtimeCount || 0) - Number(a.upcomingShowtimeCount || 0);
    });
  }, [tabMovies, searchQuery, selectedGenre, sortMode, locale]);

  const highlightedMovie = tabMovies.find(movie => movie.isHot) || tabMovies[0];
  const totalUpcomingShows = tabMovies.reduce((total, movie) => total + Number(movie.upcomingShowtimeCount || 0), 0);

  function recordEvent(eventType: string, movieId = 0, overrides: Partial<{ statusFilter: MovieTab; genreFilter: string; searchQuery: string }> = {}) {
    fetch(`${API_URL}?action=movie_catalog_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType, movieId,
        statusFilter: overrides.statusFilter || activeTab,
        genreFilter: overrides.genreFilter ?? (selectedGenre === 'ALL' ? '' : selectedGenre),
        searchQuery: overrides.searchQuery ?? searchQuery.trim(),
      }),
    }).catch(() => {});
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return;
    const timer = window.setTimeout(() => recordEvent('SEARCH', 0, { searchQuery: query }), 700);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  function changeTab(tab: MovieTab) {
    setActiveTab(tab); setSelectedGenre('ALL'); setSearchQuery('');
    recordEvent('CHANGE_TAB', 0, { statusFilter: tab, genreFilter: '', searchQuery: '' });
  }

  function changeGenre(genre: string) {
    setSelectedGenre(genre);
    recordEvent('FILTER_GENRE', 0, { genreFilter: genre === 'ALL' ? '' : genre });
  }

  function viewMovie(movie: Movie) {
    recordEvent('VIEW_MOVIE', movie.id);
    onSelectMovie(movie);
  }

  function watchTrailer(movie: Movie) {
    recordEvent('PLAY_TRAILER', movie.id);
    if (onWatchTrailer) onWatchTrailer(movie); else onSelectMovie(movie);
  }

  function startBooking(movie: Movie) {
    recordEvent('START_BOOKING', movie.id);
    if (movie.status === 'COMING_SOON' || !movie.upcomingShowtimeCount) onSelectMovie(movie);
    else onBookMovie(movie);
  }

  const tabs: Array<{ key: MovieTab; label: string; hint: string }> = [
    { key: 'NOW_SHOWING', label: t('Đang chiếu', 'Now showing'), hint: t('Đặt vé ngay', 'Book now') },
    { key: 'COMING_SOON', label: t('Sắp chiếu', 'Coming soon'), hint: t('Khám phá sớm', 'Discover early') },
    { key: 'SPECIAL_SHOWING', label: t('Suất đặc biệt', 'Special screenings'), hint: t('Trải nghiệm giới hạn', 'Limited experience') },
  ];

  return <main className="movie-catalog-v2">
    <div className="movie-catalog-shell">
      <header className="movie-catalog-hero">
        {highlightedMovie?.bannerUrl || highlightedMovie?.posterUrl || highlightedMovie?.poster ? <img src={highlightedMovie.bannerUrl || highlightedMovie.posterUrl || highlightedMovie.poster} alt=""/> : null}
        <div className="movie-catalog-hero-shade"/>
        <div className="movie-catalog-hero-copy">
          <span><Sparkles size={14}/>{t('Danh mục phim Aurora', 'Aurora movie catalogue')}</span>
          <h1>{t('Mỗi bộ phim, một thế giới mới', 'Every movie opens a new world')}</h1>
          <p>{t('Khám phá các tác phẩm đang mở bán, phim sắp khởi chiếu và những suất chiếu giới hạn tại Aurora Cinema.', 'Discover movies on sale, upcoming releases and limited screenings at Aurora Cinema.')}</p>
          <div><button onClick={() => highlightedMovie && viewMovie(highlightedMovie)}>{t('Khám phá phim nổi bật', 'Explore featured movie')}<ChevronRight size={16}/></button><small><MapPin size={13}/>{selectedTheater || t('Tất cả cụm rạp Aurora', 'All Aurora cinemas')}</small></div>
        </div>
        <div className="movie-catalog-hero-stats"><div><b>{tabMovies.length}</b><span>{t('phim trong danh mục', 'movies in category')}</span></div><div><b>{totalUpcomingShows}</b><span>{t('suất đang mở', 'open sessions')}</span></div></div>
      </header>

      <section className="movie-catalog-tabs" role="tablist" aria-label={t('Danh mục phim', 'Movie categories')}>
        {tabs.map(tab => {
          const count = movies.filter(movie => movie.status === tab.key).length;
          return <button key={tab.key} role="tab" aria-selected={activeTab === tab.key} className={activeTab === tab.key ? 'active' : ''} onClick={() => changeTab(tab.key)}><span>{tab.label}<small>{tab.hint}</small></span><b>{count}</b></button>;
        })}
      </section>

      <section className="movie-catalog-controls" aria-label={t('Tìm và lọc phim', 'Search and filter movies')}>
        <div className="movie-catalog-filter-title"><SlidersHorizontal size={16}/><span><b>{t('Bộ lọc phim', 'Movie filters')}</b><small>{visibleMovies.length} {t('kết quả', 'results')}</small></span></div>
        <label className="movie-catalog-search"><Search size={16}/><input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={t('Tìm theo tên phim hoặc thể loại...', 'Search by title or genre...')}/>{searchQuery && <button onClick={() => setSearchQuery('')} aria-label={t('Xóa tìm kiếm', 'Clear search')}><X size={14}/></button>}</label>
        <label className="movie-catalog-sort"><span>{t('Sắp xếp', 'Sort')}</span><select value={sortMode} onChange={event => setSortMode(event.target.value as SortMode)}><option value="featured">{t('Nổi bật', 'Featured')}</option><option value="release">{t('Ngày khởi chiếu', 'Release date')}</option><option value="title">{t('Tên phim A–Z', 'Title A–Z')}</option></select></label>
        <div className="movie-catalog-genres"><button className={selectedGenre === 'ALL' ? 'active' : ''} onClick={() => changeGenre('ALL')}>{t('Tất cả thể loại', 'All genres')}</button>{genres.map(genre => <button key={genre} className={selectedGenre === genre ? 'active' : ''} onClick={() => changeGenre(genre)}>{genre}</button>)}</div>
      </section>

      {visibleMovies.length ? <section className="movie-catalog-grid" aria-live="polite">
        {visibleMovies.map(movie => {
          const poster = movie.posterUrl || movie.poster;
          const duration = movie.durationMinutes || movie.duration || 0;
          const hasShows = Number(movie.upcomingShowtimeCount || 0) > 0;
          return <article className="movie-catalog-card" key={movie.id}>
            <button className="movie-catalog-poster" onClick={() => viewMovie(movie)} aria-label={`${t('Xem chi tiết', 'View details')} ${movie.title}`}>
              {poster ? <img src={poster} alt={movie.title}/> : <span><Film size={42}/><b>Aurora Cinema</b></span>}
              <i className={`home-v2-rating ${ratingClass(movie.ageRating || movie.rating)}`}>{movie.ageRating || movie.rating || 'P'}</i>
              {movie.isHot && <em><Sparkles size={11}/>{t('Nổi bật', 'Featured')}</em>}
              <div className="movie-catalog-poster-overlay"><span>{t('Xem chi tiết phim', 'View movie details')}<ChevronRight size={15}/></span></div>
            </button>
            <div className="movie-catalog-card-body">
              <div className="movie-catalog-card-format"><span>{movie.format || '2D Digital'}</span><small>{movie.status === 'COMING_SOON' ? dateLabel(movie.releaseDate, locale) : `${movie.theaterCount || 0} ${t('cụm rạp', 'cinemas')}`}</small></div>
              <h2 onClick={() => viewMovie(movie)}>{movie.title}</h2>
              <p className="movie-catalog-genre">{movie.genre || t('Đang cập nhật thể loại', 'Genre being updated')}</p>
              <div className="movie-catalog-facts"><span><Clock3 size={13}/>{duration} {t('phút', 'min')}</span>{movie.status === 'COMING_SOON' ? <span><CalendarDays size={13}/>{dateLabel(movie.releaseDate, locale)}</span> : <span><Ticket size={13}/>{movie.upcomingShowtimeCount || 0} {t('suất', 'sessions')}</span>}</div>
              {movie.status !== 'COMING_SOON' && <div className={`movie-catalog-availability ${hasShows ? '' : 'empty'}`}><span><i/>{hasShows ? `${t('Suất gần nhất', 'Next session')} ${timeLabel(movie.nextShowtime)}` : t('Chưa có suất đang mở bán', 'No session currently on sale')}</span><b>{hasShows ? `${t('Từ', 'From')} ${money(movie.minTicketPrice)}` : '—'}</b></div>}
              <div className="movie-catalog-actions"><button onClick={() => startBooking(movie)}><Ticket size={15}/>{movie.status === 'COMING_SOON' || !hasShows ? t('Xem chi tiết', 'View details') : t('Chọn suất chiếu', 'Choose showtime')}</button><button onClick={() => watchTrailer(movie)} aria-label={`${t('Xem trailer', 'Watch trailer')} ${movie.title}`}><Play size={15}/></button></div>
            </div>
          </article>;
        })}
      </section> : <section className="movie-catalog-empty"><div><Film size={34}/></div><h2>{t('Không tìm thấy phim phù hợp', 'No matching movies found')}</h2><p>{t('Hãy thử thay đổi từ khóa, thể loại hoặc danh mục phim.', 'Try changing the keyword, genre or movie category.')}</p><button onClick={() => { setSearchQuery(''); setSelectedGenre('ALL'); }}>{t('Đặt lại bộ lọc', 'Reset filters')}</button></section>}

      <footer className="movie-catalog-note"><span><Users size={15}/>{t('Thông tin phim và số suất được đồng bộ trực tiếp từ aurora_db.', 'Movie information and session counts are synchronized directly from aurora_db.')}</span><small>{t('Dữ liệu thời gian thực', 'Real-time data')}</small></footer>
    </div>
  </main>;
}
