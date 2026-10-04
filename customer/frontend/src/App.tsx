import { useEffect, useRef, useState } from 'react';
import {
  MapPin, Search, Bell, Trophy, ChevronDown,
  PlayCircle, Gift, Ticket, Film, Send, ExternalLink, Smartphone, ChevronLeft, ChevronRight,
  CreditCard, Percent, Phone, Check
} from 'lucide-react';
import AuthModal from './components/customer/AuthModal';
import MovieDetailPage from './components/customer/MovieDetailPage';
import BookingPage from './components/customer/BookingPage';
import BookingConfirmationModal from './components/customer/BookingConfirmationModal';
import TrailerModal from './components/customer/TrailerModal';
import AccountPage from './components/customer/AccountPage';
import TheaterSchedulePage from './components/customer/TheaterSchedulePage';
import TheaterDetailPage from './components/customer/TheaterDetailPage';
import MoviesPage from './components/customer/MoviesPage';
import TicketPricingPage from './components/customer/TicketPricingPage';
import CustomerHome from './components/customer/CustomerHome';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

/* ─── DATA ──────────────────────────────────────────────────── */

const COPY = {
  vi: {
    greeting: 'Xin chào:', notLoggedIn: 'Bạn chưa đăng nhập', newAccount: 'Đăng ký tài khoản mới', accountLogin: 'Đăng nhập tài khoản', login: 'Đăng nhập', register: 'Đăng ký',
    member: 'Thành viên', points: 'điểm', nav: ['TRANG CHỦ', 'LỊCH CHIẾU THEO RẠP', 'PHIM', 'RẠP', 'GIÁ VÉ', 'ƯU ĐÃI', 'THÀNH VIÊN', 'HỖ TRỢ'],
  },
  en: {
    greeting: 'Welcome:', notLoggedIn: 'You are not signed in', newAccount: 'Create a new account', accountLogin: 'Sign in to your account', login: 'Sign in', register: 'Register',
    member: 'Member', points: 'points', nav: ['HOME', 'SHOWTIMES', 'MOVIES', 'CINEMAS', 'TICKETS', 'OFFERS', 'MEMBERSHIP', 'SUPPORT'],
  },
} as const;

type Language = keyof typeof COPY;

function LanguageSwitcher({ language, onChange }: { language: Language; onChange: (language: Language) => void }) {
  const [open, setOpen] = useState(false);

  return <div style={{ position: 'relative' }}>
    <button type="button" onClick={() => setOpen(value => !value)} aria-haspopup="menu" aria-expanded={open} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 2px', border: 0, background: 'transparent', color: '#dce8f5', cursor: 'pointer', fontSize: 12 }}>
      <span>{language === 'vi' ? 'VN' : 'EN'}</span><ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
    </button>
    {open && <div role="menu" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 120, minWidth: 132, padding: 5, border: '1px solid #253c59', borderRadius: 8, background: '#10233a', boxShadow: '0 10px 24px rgba(0,0,0,.28)' }}>
      {([{ key: 'vi', label: 'Tiếng Việt', code: 'VN' }, { key: 'en', label: 'English', code: 'EN' }] as const).map(option => <button key={option.key} type="button" role="menuitem" onClick={() => { onChange(option.key); setOpen(false); }} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: 0, borderRadius: 5, padding: '8px 9px', background: language === option.key ? '#1d3858' : 'transparent', color: language === option.key ? '#f4c04a' : '#dce8f5', cursor: 'pointer', fontSize: 12, textAlign: 'left' }}>
        <span>{option.label}</span><small style={{ color: '#8aa0b8' }}>{option.code}</small>
      </button>)}
    </div>}
  </div>;
}

const CHATBOT_ITEMS = {
  vi: ['Tư vấn phim phù hợp', 'Tìm suất chiếu', 'Tư vấn giá vé', 'Sơ đồ ghế & vị trí đẹp', 'Hỗ trợ đặt vé', 'Ưu đãi thành viên'],
  en: ['Find a suitable movie', 'Find showtimes', 'Ticket price advice', 'Seat map & best seats', 'Booking support', 'Member offers'],
};

const BOTTOM_FEATURES = {
  vi: [
    { icon: Ticket, label: 'Đặt vé nhanh chóng', sub: 'Chọn ghế tiện lợi' }, { icon: CreditCard, label: 'Nhiều phương thức thanh toán', sub: 'An toàn & tiện lợi' }, { icon: Percent, label: 'Ưu đãi mỗi ngày', sub: 'Dành riêng cho bạn' }, { icon: Gift, label: 'Tích điểm đổi quà', sub: 'Thành viên Aurora' }, { icon: Phone, label: 'Hỗ trợ 24/7', sub: 'Luôn sẵn sàng' },
  ],
  en: [
    { icon: Ticket, label: 'Quick booking', sub: 'Convenient seat selection' }, { icon: CreditCard, label: 'Flexible payments', sub: 'Safe & convenient' }, { icon: Percent, label: 'Daily offers', sub: 'Made for you' }, { icon: Gift, label: 'Earn points & rewards', sub: 'Aurora members' }, { icon: Phone, label: '24/7 support', sub: 'Always ready to help' },
  ],
};

function ratingBg(r: string) {
  if (r === 'P') return '#27ae60';
  if (r === 'K') return '#f39c12';
  if (r === 'T13') return '#e67e22';
  if (r === 'T16') return '#ea580c';
  if (r === 'T18') return '#e74c3c';
  if (r === '4DX') return '#8e44ad';
  return '#555';
}

function normalizeAgeRating(value: unknown) {
  const rating = String(value || '').trim().toUpperCase();
  const match = rating.match(/T(?:13|16|18)/);
  if (match) return match[0];
  if (rating.startsWith('K')) return 'K';
  if (rating.startsWith('P')) return 'P';
  return 'P';
}

function getVietnamDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function formatScheduleDate(date: string, language: Language) {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(`${date}T00:00:00+07:00`));
}

// URL media do WAMP trả về có thể chứa khoảng trắng trong đường dẫn dự án.
// Mã hóa URL trước khi dùng cho thẻ img, video hoặc CSS background-image.
function normalizeMediaUrl(value: unknown) {
  return value ? encodeURI(String(value).trim()) : '';
}

/* ─── COMPONENT ─────────────────────────────────────────────── */
export default function App() {
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [language, setLanguage] = useState<Language>(() => localStorage.getItem('aurora-language') === 'en' ? 'en' : 'vi');
  const [movieTab, setMovieTab] = useState<'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING'>('NOW_SHOWING');
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authUser, setAuthUser] = useState<{ fullName: string; email: string; membershipLevel?: string; points?: number } | null>(null);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [theatersList, setTheatersList] = useState<any[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<string>('Aurora Q1');
  const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);
  const [showtimesList, setShowtimesList] = useState<any[]>([]);
  const [detailMovie, setDetailMovie] = useState<any | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [booking, setBooking] = useState<{ movie: any; showtime: any } | null>(null);
  const [pendingBooking, setPendingBooking] = useState<{ movie: any; showtime: any; theater: string } | null>(null);
  const [trailerMovie, setTrailerMovie] = useState<any | null>(null);
  const scheduleDate = getVietnamDate();
  const [showTheaterMenu, setShowTheaterMenu] = useState<boolean>(false);
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showAccount, setShowAccount] = useState<boolean>(false);
  const [accountTab, setAccountTab] = useState('info');
  const [currentPage, setCurrentPage] = useState<'home' | 'schedule' | 'movies' | 'theaters' | 'ticket-prices'>('home');
  const [footerPage, setFooterPage] = useState<'faq' | 'booking-guide' | 'privacy' | 'terms' | null>(null);
  const copy = COPY[language];
  const t = (vi: string, en: string) => language === 'en' ? en : vi;

  function closeMovieSearch() {
    setIsSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
  }

  function mapApiMovie(movie: any) {
    return {
      id: movie.id, title: movie.title, description: movie.description,
      rating: normalizeAgeRating(movie.ageRating), ageRating: normalizeAgeRating(movie.ageRating),
      format: movie.format || '2D Digital', genre: movie.genre,
      poster: normalizeMediaUrl(movie.posterUrl), posterUrl: normalizeMediaUrl(movie.posterUrl),
      bannerUrl: normalizeMediaUrl(movie.bannerUrl), trailerUrl: normalizeMediaUrl(movie.trailerUrl),
      duration: movie.durationMinutes, durationMinutes: movie.durationMinutes,
      status: String(movie.status || 'NOW_SHOWING').toUpperCase(), releaseDate: movie.releaseDate,
      isHot: Boolean(movie.isHot), upcomingShowtimeCount: Number(movie.upcomingShowtimeCount || 0),
      nextShowtime: movie.nextShowtime || null, minTicketPrice: movie.minTicketPrice ?? null,
      theaterCount: Number(movie.theaterCount || 0)
    };
  }

  function selectSearchMovie(movie: any) {
    fetch(`${API_URL}?action=movie_search_event`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieId: movie.id, query: searchQuery.trim() })
    }).catch(() => {});
    setDetailMovie(mapApiMovie(movie));
    setCurrentPage('movies');
    closeMovieSearch();
    scrollContentToTop();
  }

  function scrollContentToTop() {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function changeLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    localStorage.setItem('aurora-language', nextLanguage);
  }

  function requestBooking(movie: any, showtime: any, theater = selectedTheater) {
    setPendingBooking({ movie, showtime, theater });
  }

  function confirmBooking() {
    if (!pendingBooking) return;
    setSelectedTheater(pendingBooking.theater);
    setSelectedTheaterId(pendingBooking.showtime.theater_id);
    setBooking({ movie: pendingBooking.movie, showtime: pendingBooking.showtime });
    setPendingBooking(null);
  }

  const featuredMovies = moviesList
    .filter((movie: any) => movie.status === 'NOW_SHOWING' || movie.status === 'COMING_SOON')
    .sort((a: any, b: any) => Number(Boolean(b.isHot)) - Number(Boolean(a.isHot)) || String(a.releaseDate || '').localeCompare(String(b.releaseDate || '')))
    .slice(0, 4);
  const heroSlides = [
    ...featuredMovies.map((movie: any) => ({
      type: 'movie' as const,
      label: movie.status === 'NOW_SHOWING' ? t('PHIM ĐANG CHIẾU', 'NOW SHOWING') : t('PHIM SẮP CHIẾU', 'COMING SOON'),
      title: movie.title,
      description: movie.description || t(`${movie.status === 'NOW_SHOWING' ? 'Khởi chiếu tại Aurora' : 'Sắp khởi chiếu'} • ${movie.format || '2D Digital'} • ${movie.duration || 0} phút`, `${movie.status === 'NOW_SHOWING' ? 'Now playing at Aurora' : 'Coming soon'} • ${movie.format || '2D Digital'} • ${movie.duration || 0} minutes`),
      poster: movie.posterUrl || movie.poster,
      banner: movie.bannerUrl || movie.posterUrl || movie.poster,
      movie,
      primaryLabel: movie.status === 'NOW_SHOWING' ? t('ĐẶT VÉ NGAY', 'BOOK NOW') : t('XEM THÔNG TIN', 'VIEW DETAILS'),
    })),
    ...promotionsList.map((promotion: any) => ({
      type: 'promotion' as const,
      label: t('ƯU ĐÃI AURORA', 'AURORA OFFER'),
      title: promotion.name,
      description: promotion.description || t(`Nhập mã ${promotion.code} để nhận ưu đãi khi đặt vé tại Aurora.`, `Use code ${promotion.code} to enjoy this Aurora offer.`),
      promotion,
      primaryLabel: t('KHÁM PHÁ ƯU ĐÃI', 'EXPLORE OFFERS'),
    })),
    promotionsList.length === 0 && {
      type: 'promotion' as const,
      label: t('ƯU ĐÃI AURORA', 'AURORA OFFER'),
      title: t('ĐẶT VÉ HÔM NAY, NHẬN ƯU ĐÃI NGAY', 'BOOK TODAY, ENJOY MORE'),
      description: t('Khám phá các chương trình khuyến mãi hấp dẫn và đặc quyền dành cho thành viên Aurora.', 'Discover exclusive promotions and Aurora member benefits.'),
      primaryLabel: t('KHÁM PHÁ ƯU ĐÃI', 'EXPLORE OFFERS'),
    },
  ].filter(Boolean) as Array<any>;

  useEffect(() => {
    if (heroSlides.length < 2 || heroPaused) return;
    const timer = window.setInterval(() => setHeroSlide(current => (current + 1) % heroSlides.length), 6000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length, heroPaused]);

  useEffect(() => {
    if (heroSlide >= heroSlides.length) setHeroSlide(0);
  }, [heroSlide, heroSlides.length]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const timeout = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timeout);
  }, [isSearchOpen]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!isSearchOpen || query.length < 2) {
      setSearchResults([]); setSearchLoading(false); setSearchError('');
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setSearchLoading(true); setSearchError('');
      fetch(`${API_URL}?action=movie_search&q=${encodeURIComponent(query)}`, { signal: controller.signal, credentials: 'include' })
        .then(response => response.ok ? response.json() : Promise.reject(new Error('search failed')))
        .then(result => setSearchResults(Array.isArray(result.movies) ? result.movies : []))
        .catch(error => { if (error.name !== 'AbortError') { setSearchResults([]); setSearchError(t('Không thể tải kết quả. Vui lòng thử lại.', 'Unable to load results. Please try again.')); } })
        .finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    }, 260);
    return () => { controller.abort(); window.clearTimeout(timeout); };
  }, [searchQuery, isSearchOpen, language]);

  useEffect(() => {
    fetch(`${API_URL}?action=me`, { credentials: 'include' })
      .then(response => response.json())
      .then(result => setAuthUser(result.user))
      .catch(() => setAuthUser(null));

    // Lấy dữ liệu phim trực tiếp từ MySQL Database aurora_db
    fetch(`${API_URL}?action=movies&_=${Date.now()}`, { cache: 'no-store' })
      .then(response => response.json())
      .then(result => {
        if (result && result.movies && result.movies.length > 0) {
          setMoviesList(result.movies.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            rating: normalizeAgeRating(m.ageRating),
            ageRating: normalizeAgeRating(m.ageRating),
            format: m.format || '2D Digital',
            genre: m.genre,
            poster: normalizeMediaUrl(m.posterUrl),
            posterUrl: normalizeMediaUrl(m.posterUrl),
            bannerUrl: normalizeMediaUrl(m.bannerUrl),
            trailerUrl: normalizeMediaUrl(m.trailerUrl),
            duration: m.durationMinutes,
            durationMinutes: m.durationMinutes,
            status: String(m.status || 'NOW_SHOWING').toUpperCase(),
            releaseDate: m.releaseDate,
            isHot: m.isHot !== undefined ? m.isHot : true,
            upcomingShowtimeCount: Number(m.upcomingShowtimeCount || 0),
            nextShowtime: m.nextShowtime || null,
            minTicketPrice: m.minTicketPrice ?? null,
            theaterCount: Number(m.theaterCount || 0)
          })));
        }
      })
      .catch(() => {});

    fetch(`${API_URL}?action=promotions`)
      .then(response => response.json())
      .then(result => setPromotionsList(result && result.promotions ? result.promotions : []))
      .catch(() => setPromotionsList([]));

    // Lấy dữ liệu cụm rạp trực tiếp từ MySQL Database aurora_db
    fetch(`${API_URL}?action=theaters`)
      .then(response => response.json())
      .then(result => {
        if (result && result.theaters && result.theaters.length > 0) {
          setTheatersList(result.theaters);
          const current = result.theaters.find((t: any) => t.name === selectedTheater) || result.theaters[0];
          setSelectedTheater(current.name);
          setSelectedTheaterId(current.id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = language === 'vi' ? 'vi' : 'en';
  }, [language]);

  useEffect(() => {
    if (selectedTheaterId === null) return;
    fetch(`${API_URL}?action=showtimes&theater_id=${selectedTheaterId}&date=${scheduleDate}`)
      .then(response => response.json())
      .then(result => setShowtimesList(result && result.showtimes ? result.showtimes : []))
      .catch(() => setShowtimesList([]));
  }, [selectedTheaterId]);

  async function handleLogout() {
    await fetch(`${API_URL}?action=logout`, { method: 'POST', credentials: 'include' });
    setAuthUser(null);
  }

  function handleGoHome() {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setShowTheaterMenu(false);
    setShowUserMenu(false);
    setCurrentPage('home');
    setFooterPage(null);
    scrollContentToTop();
  }

  function handleGoSchedule() {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setShowTheaterMenu(false);
    setShowUserMenu(false);
    setCurrentPage('schedule');
    setFooterPage(null);
    scrollContentToTop();
  }

  function handleGoMovies() {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setShowTheaterMenu(false);
    setShowUserMenu(false);
    setCurrentPage('movies');
    setFooterPage(null);
    scrollContentToTop();
  }

  function handleGoTheaters() {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setShowTheaterMenu(false);
    setShowUserMenu(false);
    setCurrentPage('theaters');
    setFooterPage(null);
    scrollContentToTop();
  }

  function handleGoTicketPrices() {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setShowTheaterMenu(false);
    setShowUserMenu(false);
    setCurrentPage('ticket-prices');
    setFooterPage(null);
    scrollContentToTop();
  }

  function openFooterPage(page: 'faq' | 'booking-guide' | 'privacy' | 'terms') {
    setAuthMode(null);
    setShowAccount(false);
    setDetailMovie(null);
    setCurrentPage('home');
    setFooterPage(page);
    scrollContentToTop();
  }

  function openAccountTab(tab: string) {
    setShowUserMenu(false);
    setAccountTab(tab);
    setShowAccount(true);
    setAuthMode(null);
    setDetailMovie(null);
    scrollContentToTop();
  }

  /* ── Trang đặt vé – render toàn trang, thay thế toàn bộ layout thông thường ── */
  if (booking) {
    return (
      <BookingPage
        movie={booking.movie}
        showtime={booking.showtime}
        theater={selectedTheater}
        user={authUser}
        language={language}
        onClose={() => {
          setBooking(null);
          scrollContentToTop();
        }}
        onRequireLogin={() => {
          setBooking(null);
          setAuthMode('login');
        }}
      />
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#eef0f4', fontFamily: "'Inter','Segoe UI',Arial,sans-serif", color: '#1a2332' }}>

      {/* TOP BAR */}
      <div style={{ flexShrink: 0, background: '#0d1b2e', color: '#c8d6e5' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, height: 32, boxSizing: 'border-box' }}>
          <span style={{ color: '#dce8f5' }}>
            {authMode === 'register'
              ? copy.newAccount
              : authMode === 'login'
              ? copy.accountLogin
              : <>{copy.greeting} <strong>{authUser ? authUser.fullName : copy.notLoggedIn}</strong></>}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {authMode ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: authMode === 'login' ? '#f4c04a' : '#cbd5e1',
                      fontWeight: authMode === 'login' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {copy.login}
                  </button>
                  <span style={{ color: '#475569' }}>|</span>
                  <button
                    type="button"
                    onClick={() => setAuthMode('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: authMode === 'register' ? '#f4c04a' : '#cbd5e1',
                      fontWeight: authMode === 'register' ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {copy.register}
                  </button>
                </div>
                <LanguageSwitcher language={language} onChange={changeLanguage} />
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={13} color="#f4c04a" />
                  <span>{copy.member} <strong style={{ color: '#f4c04a' }}>{authUser?.membershipLevel || 'STANDARD'}</strong></span>
                  <span style={{ color: '#8aa0b8' }}>|</span>
                  <strong style={{ color: '#f4c04a' }}>{Number(authUser?.points || 0).toLocaleString('vi-VN')} {copy.points}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', cursor: 'pointer' }}>
                    <Bell size={15} />
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#e74c3c', color: '#fff', borderRadius: 99, fontSize: 9, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontWeight: 700 }}>3</span>
                  </div>
                  <LanguageSwitcher language={language} onChange={changeLanguage} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header style={{ flexShrink: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #dde3ec', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20, height: 64 }}>
          <div onClick={handleGoHome} style={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer' }}>
            <img src="/aurora-logo.svg" alt="Aurora Cinema" style={{ width: 176, height: 48, objectFit: 'contain' }} />
          </div>
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setShowTheaterMenu(!showTheaterMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: showTheaterMenu ? '#e5edf7' : '#f3f6fa',
                border: '1px solid #d5dee9',
                borderRadius: 20,
                padding: '5px 12px',
                fontSize: 13,
                color: '#1a2332',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
                userSelect: 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <MapPin size={13} color="#f4c04a" />
              <span>{selectedTheater}</span>
              <ChevronDown size={13} color="#7a8fa6" style={{ transform: showTheaterMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </div>

            {showTheaterMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  background: '#fff',
                  borderRadius: 12,
                  boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
                  border: '1px solid #d5dee9',
                  width: 330,
                  zIndex: 100,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '10px 14px', background: '#0d1b2e', color: '#fff', fontSize: 12, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{t('HỆ THỐNG RẠP AURORA', 'AURORA CINEMAS')}</span>
                  <span style={{ fontSize: 10, background: '#f4c04a', color: '#0d1b2e', padding: '2px 7px', borderRadius: 4, fontWeight: 900 }}>
                    {theatersList.length} {t('RẠP', 'CINEMAS')}
                  </span>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {theatersList.map((t: any) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTheater(t.name);
                        setSelectedTheaterId(t.id);
                        setShowTheaterMenu(false);
                      }}
                      style={{
                        padding: '11px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: selectedTheater === t.name ? '#fff9e6' : '#fff',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: selectedTheater === t.name ? 900 : 700, color: selectedTheater === t.name ? '#b8860b' : '#0d1b2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <MapPin size={12} color={selectedTheater === t.name ? '#f4c04a' : '#94a3b8'} />
                          {t.name}
                        </div>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{t.city}</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4, paddingLeft: 18 }}>
                        {t.address}
                      </div>
                      {t.screens && t.screens.length > 0 && (
                        <div style={{ fontSize: 10.5, color: '#0284c7', marginTop: 4, paddingLeft: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Film size={10} /> {t.screens.length} phòng chiếu ({t.screens.map((s: any) => s.name.split(' - ')[1] || s.name).slice(0, 2).join(', ')}...)
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, justifyContent: 'center' }}>
            {copy.nav.map((item, i) => {
              const isSelected =
                (i === 0 && currentPage === 'home' && !authMode && !footerPage && !showAccount && !detailMovie) ||
                (i === 1 && currentPage === 'schedule' && !authMode && !footerPage && !showAccount && !detailMovie) ||
                (i === 2 && currentPage === 'movies' && !authMode && !footerPage && !showAccount && !detailMovie) ||
                (i === 3 && currentPage === 'theaters' && !authMode && !footerPage && !showAccount && !detailMovie) ||
                (i === 4 && currentPage === 'ticket-prices' && !authMode && !footerPage && !showAccount && !detailMovie);

              const handleClick =
                i === 0 ? handleGoHome :
                i === 1 ? handleGoSchedule :
                i === 2 ? handleGoMovies :
                i === 3 ? handleGoTheaters :
                i === 4 ? handleGoTicketPrices : undefined;

              return (
                <button
                  key={item}
                  onClick={handleClick}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: isSelected ? '#0d1b2e' : '#6b7f94',
                    background: 'none',
                    border: 'none',
                    padding: '4px 0',
                    cursor: handleClick ? 'pointer' : 'default',
                    borderBottom: isSelected ? '2px solid #f4c04a' : '2px solid transparent',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.15s ease, border-color 0.15s ease'
                  }}
                >
                  {item}
                </button>
              );
            })}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              aria-label={t('Tìm kiếm phim', 'Search movies')}
              title={t('Tìm kiếm phim', 'Search movies')}
              onClick={() => { setShowUserMenu(false); setIsSearchOpen(true); }}
              style={{ width: 36, height: 36, borderRadius: '50%', border: isSearchOpen ? '1px solid #e8a020' : '1px solid #d5dee9', background: isSearchOpen ? '#fff8e7' : '#f3f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isSearchOpen ? '0 0 0 3px rgba(244,192,74,.18)' : 'none', transition: 'all .18s ease' }}>
              <Search size={16} color="#4a637a" />
            </button>
            {authUser ? (
              <div style={{ position: 'relative' }}>
                {/* Trigger button */}
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: showUserMenu ? '#f1f5f9' : '#fff',
                    border: '1px solid #d5dee9',
                    borderRadius: 24, padding: '6px 14px 6px 8px',
                    cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: showUserMenu ? '0 0 0 3px rgba(244,192,74,0.2)' : 'none'
                  }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f4c04a 0%, #e8a020 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#0d1b2e', flexShrink: 0
                  }}>
                    {authUser.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a2332', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {authUser.fullName.split(' ').slice(-1)[0]}
                  </span>
                  <ChevronDown size={13} color="#7a8fa6" style={{ transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <>
                    {/* Overlay to close */}
                    <div
                      onClick={() => setShowUserMenu(false)}
                      style={{ position: 'fixed', inset: 0, zIndex: 98 }}
                    />
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                      width: 260, background: '#fff',
                      borderRadius: 14, zIndex: 99,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.10)',
                      border: '1px solid #e8edf4',
                      overflow: 'hidden',
                      animation: 'auroraDropIn 0.18s ease'
                    }}>
                      <style>{`
                        @keyframes auroraDropIn {
                          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
                          to   { opacity: 1; transform: translateY(0)  scale(1); }
                        }
                        .aurora-menu-item {
                          display: flex;
                          align-items: center;
                          gap: 12px;
                          padding: 13px 18px;
                          font-size: 13.5px;
                          font-weight: 500;
                          color: #1a2332;
                          cursor: pointer;
                          border: none;
                          background: transparent;
                          width: 100%;
                          text-align: left;
                          transition: background 0.15s ease;
                          border-bottom: 1px solid #f1f5f9;
                        }
                        .aurora-menu-item:hover {
                          background: #f8fafd;
                          color: #0d1b2e;
                        }
                        .aurora-menu-item:last-child {
                          border-bottom: none;
                        }
                        .aurora-menu-item .aurora-menu-icon {
                          width: 32px; height: 32px;
                          border-radius: 8px;
                          display: flex; align-items: center; justify-content: center;
                          flex-shrink: 0;
                          background: #f3f6fa;
                          transition: background 0.15s;
                        }
                        .aurora-menu-item:hover .aurora-menu-icon {
                          background: #e8edf6;
                        }
                        .aurora-menu-item.danger { color: #dc2626; }
                        .aurora-menu-item.danger:hover { background: #fff5f5; }
                        .aurora-menu-item.danger .aurora-menu-icon { background: #fee2e2; }
                        .aurora-menu-item.danger:hover .aurora-menu-icon { background: #fecaca; }
                      `}</style>

                      {/* Header section */}
                      <div style={{
                        padding: '16px 18px 14px',
                        background: 'linear-gradient(135deg, #0d1b2e 0%, #1a3050 100%)',
                        position: 'relative', overflow: 'hidden'
                      }}>
                        {/* Gold accent */}
                        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(244,192,74,0.12)' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 42, height: 42, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #f4c04a 0%, #e8a020 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 18, fontWeight: 800, color: '#0d1b2e',
                            border: '2px solid rgba(244,192,74,0.5)', flexShrink: 0
                          }}>
                            {authUser.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {authUser.fullName}
                            </div>
                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {authUser.email}
                            </div>
                            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                              <span style={{
                                fontSize: 10, fontWeight: 800, padding: '2px 8px',
                                borderRadius: 20, background: 'linear-gradient(135deg, #f4c04a, #e8a020)',
                                color: '#0d1b2e', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 4
                              }}>
                                ⭐ THÀNH VIÊN
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div>
                        <button className="aurora-menu-item" onClick={() => openAccountTab('info')}>
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4a637a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </span>
                          {t('Thông tin tài khoản', 'Account information')}
                        </button>

                        <button className="aurora-menu-item" onClick={() => openAccountTab('member')}>
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                          </span>
                          {t('Thẻ thành viên', 'Membership card')}
                          <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'linear-gradient(135deg,#f4c04a,#e8a020)', color: '#0d1b2e' }}>{authUser.membershipLevel || 'STANDARD'}</span>
                        </button>

                        <button className="aurora-menu-item" onClick={() => openAccountTab('history')}>
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                            </svg>
                          </span>
                          {t('Lịch sử đặt vé', 'Booking history')}
                        </button>


                        <button className="aurora-menu-item" onClick={() => openAccountTab('points')}>
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10"/>
                              <line x1="12" y1="8" x2="12" y2="12"/>
                              <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                          </span>
                          {t('Điểm thưởng Aurora', 'Aurora reward points')}
                          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>{Number(authUser.points || 0).toLocaleString('vi-VN')} {copy.points}</span>
                        </button>

                        <button className="aurora-menu-item" onClick={() => openAccountTab('voucher')}>
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"/>
                              <path d="M12 3L8 12h8l-4-9z"/>
                              <line x1="2" y1="12" x2="22" y2="12"/>
                            </svg>
                          </span>
                          {t('Voucher của tôi', 'My vouchers')}
                        </button>

                        <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                        <button
                          className="aurora-menu-item danger"
                          onClick={() => { setShowUserMenu(false); handleLogout(); }}
                        >
                          <span className="aurora-menu-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                              <polyline points="16 17 21 12 16 7"/>
                              <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                          </span>
                          {t('Đăng xuất', 'Sign out')}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <button onClick={() => setAuthMode('login')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #cdd7e2', background: authMode === 'login' ? '#f1f5f9' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1a2332' }}>{copy.login}</button>
                <button onClick={() => setAuthMode('register')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f4c04a', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#0d1b2e', boxShadow: '0 4px 12px rgba(244,192,74,0.35)' }}>{copy.register}</button>
              </>
            )}
          </div>
        </div>
      </header>

      {isSearchOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('Tìm kiếm phim', 'Movie search')}
          onMouseDown={event => { if (event.target === event.currentTarget) closeMovieSearch(); }}
          style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(8, 23, 42, .52)', backdropFilter: 'blur(5px)', padding: 'clamp(84px, 13vh, 132px) 18px 24px', overflowY: 'auto' }}
        >
          <section style={{ width: 'min(720px, 100%)', margin: '0 auto', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 28px 75px rgba(3,16,34,.32)', border: '1px solid rgba(255,255,255,.7)' }}>
            <div style={{ padding: '20px 22px 16px', background: 'linear-gradient(135deg, #0d1b2e 0%, #17355b 100%)', color: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 11, letterSpacing: 1.1, fontWeight: 800, color: '#f4c04a' }}>AURORA CINEMA</div>
                  <div style={{ fontSize: 20, fontWeight: 800, marginTop: 2 }}>{t('Tìm phim bạn muốn xem', 'Find your next movie')}</div>
                </div>
                <button type="button" onClick={closeMovieSearch} aria-label={t('Đóng', 'Close')} style={{ width: 32, height: 32, border: '1px solid rgba(255,255,255,.24)', borderRadius: 9, background: 'rgba(255,255,255,.1)', color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 13px', height: 48, borderRadius: 12, background: '#fff', boxShadow: '0 5px 16px rgba(0,0,0,.17)' }}>
                <Search size={19} color="#52708d" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Escape') closeMovieSearch(); if (event.key === 'Enter' && searchResults.length === 1) selectSearchMovie(searchResults[0]); }}
                  placeholder={t('Nhập tên phim, thể loại hoặc nội dung...', 'Type a movie title, genre, or keyword...')}
                  style={{ minWidth: 0, flex: 1, height: '100%', border: 'none', outline: 'none', color: '#10233e', fontSize: 14, background: 'transparent' }}
                />
                {searchLoading && <span style={{ color: '#e8a020', fontSize: 12, fontWeight: 700 }}>{t('Đang tìm...', 'Searching...')}</span>}
              </div>
            </div>
            <div style={{ minHeight: 210, maxHeight: 'min(55vh, 470px)', overflowY: 'auto', padding: 10, background: '#f7f9fc' }}>
              {searchQuery.trim().length < 2 ? (
                <div style={{ padding: '38px 22px 34px', textAlign: 'center', color: '#70849a' }}>
                  <div style={{ width: 52, height: 52, margin: '0 auto 13px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fff1c7, #ffe19a)', boxShadow: '0 8px 20px rgba(219,153,20,.16)' }}><Film size={25} color="#b97708" /></div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#193653' }}>{t('Bạn muốn xem phim gì hôm nay?', 'What would you like to watch today?')}</div>
                  <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.55 }}>{t('Nhập tên phim hoặc thể loại để xem suất chiếu phù hợp.', 'Search by movie title or genre to find a suitable showtime.')}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 7, marginTop: 17 }}>
                    {['Avatar', 'Hành động', 'Tình cảm'].map(keyword => <button key={keyword} type="button" onClick={() => setSearchQuery(keyword)} style={{ border: '1px solid #d8e2ec', borderRadius: 99, padding: '6px 11px', color: '#42627e', background: '#fff', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>{keyword}</button>)}
                  </div>
                </div>
              ) : searchError ? (
                <div style={{ padding: '52px 22px', textAlign: 'center', fontSize: 13, color: '#c2410c' }}>{searchError}</div>
              ) : !searchLoading && searchResults.length === 0 ? (
                <div style={{ padding: '52px 22px', textAlign: 'center', color: '#70849a' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#425a73' }}>{t('Chưa tìm thấy phim phù hợp', 'No matching movies found')}</div>
                  <div style={{ marginTop: 5, fontSize: 12 }}>{t('Thử thay đổi từ khóa hoặc tên phim.', 'Try another keyword or movie title.')}</div>
                </div>
              ) : searchResults.map(movie => (
                <button key={movie.id} type="button" onClick={() => selectSearchMovie(movie)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 14, padding: 12, border: '1px solid transparent', borderRadius: 12, background: '#fff', cursor: 'pointer', textAlign: 'left', marginBottom: 8, boxShadow: '0 1px 2px rgba(14,38,66,.05)', transition: 'border-color .15s, transform .15s' }}>
                  <div style={{ width: 48, height: 64, flexShrink: 0, borderRadius: 7, overflow: 'hidden', background: '#e7edf4' }}>
                    {movie.posterUrl ? <img src={normalizeMediaUrl(movie.posterUrl)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Film size={22} color="#7890a8" style={{ margin: '21px 13px' }} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#132a45', fontSize: 15, fontWeight: 800 }}>{movie.title}</span><span style={{ flexShrink: 0, padding: '2px 6px', borderRadius: 5, background: '#fff0c5', color: '#995d00', fontSize: 10, fontWeight: 800 }}>{normalizeAgeRating(movie.ageRating)}</span></div>
                    <div style={{ marginTop: 5, color: '#71859a', fontSize: 12 }}>{movie.genre || movie.format || '2D Digital'} · {movie.durationMinutes} {t('phút', 'min')}</div>
                    <div style={{ marginTop: 6, color: movie.upcomingShowtimeCount > 0 ? '#15803d' : '#8090a1', fontSize: 11, fontWeight: 700 }}>{movie.upcomingShowtimeCount > 0 ? `${movie.upcomingShowtimeCount} ${t('suất sắp chiếu', 'upcoming sessions')}` : t('Chưa có suất đang mở bán', 'No session currently on sale')}</div>
                  </div>
                  <span style={{ color: '#d38a0a', fontSize: 20, fontWeight: 400 }}>›</span>
                </button>
              ))}
            </div>
            <div style={{ padding: '11px 20px', background: '#fff', color: '#71859a', fontSize: 11.5, textAlign: 'center' }}>{t('Chọn phim để xem thông tin và đặt vé nhanh.', 'Select a movie to view details and book quickly.')}</div>
          </section>
        </div>
      )}

      <div ref={contentRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
      {/* CONTENT: AUTH, ACCOUNT, OR HOMEPAGE */}
      {footerPage ? (
        <FooterInfoPage page={footerPage} onBack={handleGoHome} />
      ) : authMode ? (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={newMode => setAuthMode(newMode)}
          onAuthenticated={account => {
            setAuthUser(account);
            setAuthMode(null);
          }}
        />
      ) : showAccount ? (
        <AccountPage
          authUser={authUser}
          onUserUpdate={user => setAuthUser(user)}
          initialTab={accountTab}
        />
      ) : detailMovie ? (
        <MovieDetailPage
          movie={detailMovie}
          theaters={theatersList}
          theater={selectedTheater}
          showtimes={showtimesList.filter((showtime: any) => showtime.movie_id === detailMovie.id)}
          date={scheduleDate}
          onBack={() => setDetailMovie(null)}
          onBook={(showtime, theaterName) => {
            requestBooking(detailMovie, showtime, theaterName);
          }}
        />
      ) : currentPage === 'schedule' ? (
        <TheaterSchedulePage
          theaters={theatersList}
          movies={moviesList}
          selectedTheaterId={selectedTheaterId}
          language={language}
          onSelectTheater={theater => { setSelectedTheater(theater.name); setSelectedTheaterId(theater.id); setShowTheaterMenu(false); }}
          onBook={(movie, showtime) => requestBooking(movie, showtime, theatersList.find(theater => theater.id === showtime.theater_id)?.name || selectedTheater)}
        />
      ) : currentPage === 'theaters' ? (
        <TheaterDetailPage
          theaters={theatersList}
          movies={moviesList}
          selectedTheaterId={selectedTheaterId}
          language={language}
          onSelectTheater={theater => { setSelectedTheater(theater.name); setSelectedTheaterId(theater.id); setShowTheaterMenu(false); }}
          onViewSchedule={handleGoSchedule}
          onBook={(movie, showtime, theaterName) => requestBooking(movie, showtime, theaterName)}
        />
      ) : currentPage === 'movies' ? (
        <MoviesPage
          movies={moviesList}
          theaters={theatersList}
          selectedTheater={selectedTheater}
          language={language}
          onSelectMovie={(movie) => {
            setDetailMovie(movie);
            scrollContentToTop();
          }}
          onBookMovie={(movie) => {
            setDetailMovie(movie);
            scrollContentToTop();
          }}
          onWatchTrailer={(movie) => {
            setTrailerMovie(movie);
          }}
        />
      ) : currentPage === 'home' ? (
        <CustomerHome
          language={language}
          user={authUser}
          movies={moviesList}
          promotions={promotionsList}
          theaters={theatersList}
          selectedTheaterId={selectedTheaterId}
          selectedTheaterName={selectedTheater}
          onSelectTheater={theater => { setSelectedTheater(theater.name); setSelectedTheaterId(theater.id); setShowTheaterMenu(false); }}
          onOpenMovie={movie => { setDetailMovie(movie); scrollContentToTop(); }}
          onWatchTrailer={movie => setTrailerMovie(movie)}
          onBook={(movie, showtime, theaterName) => requestBooking(movie, showtime, theaterName)}
          onOpenSchedule={handleGoSchedule}
          onOpenMovies={handleGoMovies}
          onOpenPrices={handleGoTicketPrices}
          onOpenAccount={() => openAccountTab('member')}
          onRegister={() => setAuthMode('register')}
        />
      ) : currentPage === 'ticket-prices' ? (
        <TicketPricingPage language={language} onViewSchedule={handleGoSchedule} />
      ) : (
        <main style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr 280px', gap: 14 }}>

              {/* LEFT SIDEBAR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '18px 16px', color: '#f0f4f9' }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#f4c04a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>{t('Đặc quyền thành viên', 'Member privileges')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(language === 'en' ? ['Earn points on every purchase', 'Redeem attractive rewards', 'Offers made for you', 'Multiple membership tiers'] : ['Tích điểm mỗi giao dịch', 'Đổi quà hấp dẫn', 'Ưu đãi dành riêng cho bạn', 'Nhiều hạng thành viên']).map(item => (
                      <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c8d8e8' }}>
                        <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#f4c04a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={10} color="#0d1b2e" strokeWidth={3} />
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setAuthMode('register')} style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12.5, color: '#0d1b2e', cursor: 'pointer', textTransform: 'uppercase' }}>
                    {t('ĐĂNG KÝ NGAY', 'REGISTER NOW')}
                  </button>
                </div>
                <div style={{ background: '#fff8e8', border: '1px solid #f0d990', borderRadius: 14, padding: '16px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>{t('Tải app Aurora', 'Get the Aurora app')}</h3>
                  <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#6b7f94' }}>{t('Đặt vé dễ dàng và nhận nhiều ưu đãi', 'Book easily and enjoy more offers')}</p>
                  <div style={{ width: 64, height: 64, background: '#0d1b2e', borderRadius: 8, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Ticket size={28} color="#f4c04a" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#0d1b2e', borderRadius: 8, padding: '7px 10px', marginBottom: 7, cursor: 'pointer' }}>
                    <Smartphone size={15} color="#f4c04a" />
                    <div><div style={{ fontSize: 9, color: '#aec3d4' }}>GET IT ON</div><div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Google Play</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
                    <Smartphone size={15} color="#0d1b2e" />
                    <div><div style={{ fontSize: 9, color: '#6b7f94' }}>DOWNLOAD ON</div><div style={{ fontSize: 13, fontWeight: 700, color: '#0d1b2e' }}>App Store</div></div>
                  </div>
                </div>
              </div>

              {/* CENTER */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Hero Banner */}
                {heroSlides.length > 0 && (() => {
                  const slide = heroSlides[heroSlide] || heroSlides[0];
                  const isMovie = slide.type === 'movie';
                  const openSlide = () => {
                    if (isMovie) {
                      setDetailMovie(slide.movie);
                    } else {
                      setCurrentPage('movies');
                      setMovieTab('NOW_SHOWING');
                      scrollContentToTop();
                    }
                  };
                  const goToSlide = (direction: number) => setHeroSlide(current => (current + direction + heroSlides.length) % heroSlides.length);
                  return <div onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)} style={{ boxSizing: 'border-box', height: 300, borderRadius: 16, overflow: 'hidden', background: slide.type === 'promotion' ? 'linear-gradient(110deg,#0f2742 0%,#71501b 62%,#d09016 100%)' : 'linear-gradient(110deg,#071628 0%,#0d2849 58%,#123455 100%)', position: 'relative', padding: '28px 32px', display: 'flex', alignItems: 'center', isolation: 'isolate' }}>
                    {slide.banner && <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(90deg, #071628 0%, rgba(7,22,40,.93) 43%, rgba(7,22,40,.35) 100%), url("${slide.banner}")`, backgroundSize: 'cover', backgroundPosition: 'center 28%', opacity: .92, zIndex: -1 }} />}
                    <div style={{ position: 'absolute', top: -50, right: '16%', width: 260, height: 260, background: 'radial-gradient(circle,rgba(244,192,74,.18) 0%,transparent 66%)', pointerEvents: 'none' }} />
                    <div style={{ zIndex: 1, flex: 1, maxWidth: '62%' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', marginBottom: 9, background: 'rgba(244,192,74,.15)', border: '1px solid rgba(244,192,74,.42)', borderRadius: 99, fontSize: 10.5, fontWeight: 900, letterSpacing: .5, color: '#f8cf6c' }}>
                        {slide.type === 'promotion' ? <Gift size={13} /> : <Film size={13} />}{slide.label}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', textTransform: 'uppercase', lineHeight: 1.14, marginBottom: 9, maxWidth: 480, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{slide.title}</div>
                      <div style={{ fontSize: 12.5, color: '#c2d5e7', marginBottom: 18, lineHeight: 1.65, maxWidth: 460, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>{slide.description}</div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={openSlide} style={{ padding: '9px 18px', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12, color: '#0d1b2e', cursor: 'pointer' }}>{slide.primaryLabel}</button>
                        {isMovie && <button type="button" onClick={() => slide.movie.trailerUrl ? setTrailerMovie(slide.movie) : setDetailMovie(slide.movie)} style={{ padding: '9px 16px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.28)', borderRadius: 9, fontWeight: 700, fontSize: 12, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <PlayCircle size={16} color="#f4c04a" />{t('XEM TRAILER', 'WATCH TRAILER')}
                        </button>}
                      </div>
                    </div>
                    <div style={{ position: 'absolute', right: 26, top: '50%', transform: 'translateY(-50%)', width: 132, height: 172, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(244,192,74,.75)', boxShadow: '0 16px 30px rgba(0,0,0,.42)', background: '#122b46' }}>
                      {slide.poster ? <img src={slide.poster} alt={slide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, textAlign: 'center', background: 'linear-gradient(160deg,#f4c04a,#bd7900)', color: '#0d1b2e' }}><Gift size={42} /><strong style={{ fontSize: 13 }}>{t('ƯU ĐÃI ĐẶC BIỆT', 'SPECIAL OFFER')}</strong></div>}
                    </div>
                    <div style={{ position: 'absolute', bottom: 13, left: 32, display: 'flex', gap: 7 }}>
                      {heroSlides.map((_: any, index: number) => <button key={index} type="button" aria-label={`${t('Xem quảng cáo', 'View slide')} ${index + 1}`} onClick={() => setHeroSlide(index)} style={{ width: index === heroSlide ? 22 : 7, height: 7, padding: 0, border: 'none', borderRadius: 99, background: index === heroSlide ? '#f4c04a' : 'rgba(255,255,255,.38)', cursor: 'pointer', transition: 'all .2s' }} />)}
                    </div>
                    {heroSlides.length > 1 && <div style={{ position: 'absolute', right: 15, bottom: 12, display: 'flex', gap: 6 }}>
                      <button type="button" aria-label={t('Quảng cáo trước', 'Previous slide')} onClick={() => goToSlide(-1)} style={{ width: 27, height: 27, padding: 0, border: '1px solid rgba(255,255,255,.3)', borderRadius: '50%', background: 'rgba(7,22,40,.48)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronLeft size={16} /></button>
                      <button type="button" aria-label={t('Quảng cáo tiếp theo', 'Next slide')} onClick={() => goToSlide(1)} style={{ width: 27, height: 27, padding: 0, border: '1px solid rgba(255,255,255,.3)', borderRadius: '50%', background: 'rgba(7,22,40,.48)', color: '#fff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}><ChevronRight size={16} /></button>
                    </div>}
                  </div>;
                })()}

                {/* Quick Booking */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>{t('ĐẶT VÉ NHANH', 'QUICK BOOKING')}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                    {[
                      { 
                        label: t('Chọn rạp', 'Choose cinema'), 
                        val: selectedTheater, 
                        icon: <ChevronDown size={13} color="#6b7f94" />,
                        action: () => setShowTheaterMenu(prev => !prev)
                      },
                      { label: t('Chọn phim', 'Choose movie'), val: t('Tất cả phim', 'All movies'), icon: <Film size={13} color="#6b7f94" />, action: undefined },
                      { label: t('Chọn ngày', 'Choose date'), val: t(`Hôm nay, ${formatScheduleDate(scheduleDate, language)}`, `Today, ${formatScheduleDate(scheduleDate, language)}`), icon: null, action: undefined },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#6b7f94', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                        <div 
                          onClick={f.action}
                          style={{ border: '1px solid #d5dee9', borderRadius: 8, padding: '8px 12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12.5, color: '#1a2332', fontWeight: f.action ? 700 : 500 }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.val}</span>{f.icon}
                        </div>
                      </div>
                    ))}
                    <button style={{ padding: '8px 14px', background: '#0d1b2e', border: 'none', borderRadius: 8, color: '#f4c04a', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, height: 37 }}>
                      <Search size={13} />{t('Tìm suất chiếu', 'Find showtimes')}
                    </button>
                  </div>
                </div>

                {/* Movie Tabs & Vertical Grid */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  {/* Tabs header với 3 mục rõ ràng */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #eef0f4', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[
                        { key: 'NOW_SHOWING', label: 'Phim đang chiếu' },
                        { key: 'COMING_SOON', label: 'Phim sắp chiếu' },
                        { key: 'SPECIAL_SHOWING', label: 'Suất chiếu đặc biệt' },
                      ].map((item) => {
                        const count = moviesList.filter((m: any) => m.status === item.key).length;
                        const isSelected = movieTab === item.key;
                        return (
                          <button
                            key={item.key}
                            onClick={() => setMovieTab(item.key as any)}
                            style={{
                              padding: '10px 18px',
                              background: isSelected ? '#0d1b2e' : '#f8fafc',
                              border: isSelected ? '1px solid #0d1b2e' : '1px solid #e2e8f0',
                              borderRadius: '8px 8px 0 0',
                              marginBottom: -2,
                              fontSize: 13,
                              fontWeight: isSelected ? 800 : 600,
                              color: isSelected ? '#f4c04a' : '#475569',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 7,
                              transition: 'all 0.2s ease',
                              boxShadow: isSelected ? '0 -2px 6px rgba(0,0,0,0.06)' : 'none'
                            }}
                          >
                            <span>{item.label}</span>
                            <span style={{
                              fontSize: 11,
                              fontWeight: 800,
                              background: isSelected ? '#f4c04a' : '#e2e8f0',
                              color: isSelected ? '#0d1b2e' : '#64748b',
                              padding: '1px 6px',
                              borderRadius: 99
                            }}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>
                      {movieTab === 'NOW_SHOWING' && '⚡ Các suất chiếu đang diễn ra trong ngày'}
                      {movieTab === 'COMING_SOON' && '🎬 Đặt vé sớm nhận ưu đãi combo độc quyền'}
                      {movieTab === 'SPECIAL_SHOWING' && '⭐ Suất chiếu sneak show & fan screening đặc biệt'}
                    </div>
                  </div>

                  {/* Danh sách phim dạng Grid dài xuống dưới - KHÔNG CÓ MŨI TÊN LƯỚT */}
                  {(() => {
                    // Catalogue phim luôn hiển thị theo trạng thái. Lịch chiếu theo rạp chỉ được kiểm tra
                    // ở bước đặt vé, không được dùng để ẩn phim Sắp chiếu/Suất đặc biệt khỏi trang chủ.
                    const displayList = moviesList.filter((m: any) => m.status === movieTab);

                    return (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: 16,
                      }}>
                        {displayList.map((m: any) => {
                          const isSpecial = m.status === 'SPECIAL_SHOWING';
                          const isComing = m.status === 'COMING_SOON';

                          return (
                            <div
                              key={m.id || m.title}
                              style={{
                                borderRadius: 12,
                                overflow: 'hidden',
                                border: isSpecial ? '1.5px solid #f4c04a' : '1px solid #eef0f4',
                                background: '#fff',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 3px 10px rgba(0,0,0,0.04)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                              }}
                            >
                              {/* Poster phim */}
                              <div style={{
                                position: 'relative',
                                background: m.poster ? `url("${m.poster}") center/cover no-repeat` : 'linear-gradient(160deg,#1e293b 0%,#0f172a 100%)',
                                height: 210,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }} onClick={() => setTrailerMovie(m)} role="button" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setTrailerMovie(m); }}>
                                {!m.poster && <Film size={36} color="#94a3b8" />}
                                
                                {/* Badge độ tuổi */}
                                <div style={{
                                  position: 'absolute',
                                  top: 8,
                                  left: 8,
                                  background: ratingBg(m.rating),
                                  color: '#fff',
                                  fontSize: 10,
                                  fontWeight: 900,
                                  padding: '2px 7px',
                                  borderRadius: 5,
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                }}>
                                  {m.rating}
                                </div>

                                {/* Badge loại danh mục */}
                                <div style={{
                                  position: 'absolute',
                                  top: 0,
                                  right: 0,
                                  background: isSpecial ? '#d97706' : (isComing ? '#2563eb' : '#dc2626'),
                                  color: '#fff',
                                  fontSize: 9.5,
                                  fontWeight: 800,
                                  padding: '4px 8px',
                                  borderRadius: '0 10px 0 8px',
                                  letterSpacing: '0.04em'
                                }}>
                                  {isSpecial ? 'ĐẶC BIỆT' : (isComing ? 'SẮP CHIẾU' : 'ĐANG CHIẾU')}
                                </div>

                                {/* Định dạng chiếu */}
                                {m.format && (
                                  <div style={{
                                    position: 'absolute',
                                    bottom: 8,
                                    left: 8,
                                    background: 'rgba(13, 27, 46, 0.88)',
                                    color: '#f4c04a',
                                    fontSize: 9,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 4,
                                    backdropFilter: 'blur(4px)'
                                  }}>
                                    {m.format}
                                  </div>
                                )}
                              </div>

                              {/* Thông tin phim */}
                              <div style={{ padding: '10px 10px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div
                                  onClick={() => setDetailMovie(m)}
                                  style={{
                                    fontSize: 12.5,
                                    fontWeight: 700,
                                    color: '#0f172a',
                                    lineHeight: 1.35,
                                    minHeight: 34,
                                    overflow: 'hidden',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical'
                                    ,cursor: 'pointer'
                                  }}
                                  title={m.title}
                                >
                                  {m.title}
                                </div>

                                <div style={{
                                  fontSize: 10.5,
                                  color: '#64748b',
                                  marginTop: 6,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5
                                }}>
                                  <span>⏱ {m.duration ? `${m.duration} phút` : 'Đang cập nhật'}</span>
                                </div>

                                {m.releaseDate && (
                                  <div style={{ fontSize: 9.5, color: '#94a3b8', marginTop: 3 }}>
                                    Khởi chiếu: {m.releaseDate}
                                  </div>
                                )}

                                <div style={{ marginTop: 8 }}>
                                  <div style={{ fontSize: 9.5, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: 5 }}>
                                    Suất chiếu tại {selectedTheater}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {showtimesList.filter((showtime: any) => showtime.movie_id === m.id).map((showtime: any) => (
                                      <span key={showtime.id} style={{ background: '#fff8e8', border: '1px solid #f4c04a', color: '#9a6700', borderRadius: 5, padding: '3px 5px', fontSize: 10, fontWeight: 800 }}>
                                        {new Date(showtime.starts_at.replace(' ', 'T')).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    ))}
                                    {showtimesList.filter((showtime: any) => showtime.movie_id === m.id).length === 0 && (
                                      <span style={{ fontSize: 10, color: '#94a3b8' }}>Chưa có suất hôm nay</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Nút hành động */}
                              <div style={{ display: 'flex', gap: 6, margin: '10px' }}>
                              <button
                                onClick={() => {
                                  const firstShowtime = showtimesList.find((showtime: any) => showtime.movie_id === m.id);
                                  if (firstShowtime) requestBooking(m, firstShowtime);
                                  else setDetailMovie(m);
                                }}
                                style={{
                                  flex: 1,
                                  margin: '10px',
                                  marginLeft: 0,
                                  marginRight: 0,
                                  padding: '8px 0',
                                  background: isSpecial ? '#d97706' : '#0d1b2e',
                                  border: 'none',
                                  borderRadius: 8,
                                  color: isSpecial ? '#fff' : '#f4c04a',
                                  fontWeight: 800,
                                  fontSize: 11.5,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 5,
                                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                }}
                              >
                                <Ticket size={13} />
                                <span>{isSpecial ? 'VÉ ĐẶC BIỆT' : (isComing ? 'ĐẶT TRƯỚC' : 'MUA VÉ')}</span>
                              </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT SIDEBAR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4c04a', textTransform: 'uppercase', marginBottom: 4 }}>{t('Ưu đãi hấp dẫn', 'Great offers')}</div>
                    <div style={{ fontSize: 11.5, color: '#9ab5cc', marginBottom: 10 }}>{t('Nhiều voucher và combo siêu hấp dẫn', 'Many exciting vouchers and combos')}</div>
                    <button style={{ padding: '7px 16px', background: '#f4c04a', border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 11.5, color: '#0d1b2e', cursor: 'pointer' }}>{t('XEM NGAY', 'VIEW NOW')}</button>
                  </div>
                  <div style={{ width: 48, height: 48, background: 'rgba(244,192,74,.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Gift size={24} color="#f4c04a" />
                  </div>
                </div>

                <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '14px 16px', color: '#f0f4f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4c04a', textTransform: 'uppercase' }}>Thành viên Aurora</div>
                    <Trophy size={17} color="#f4c04a" />
                  </div>
                  <div style={{ fontSize: 12, color: '#9ab5cc', marginBottom: 2 }}>Hạng <strong style={{ color: '#f4c04a' }}>GOLD</strong></div>
                  <div style={{ fontSize: 11.5, color: '#9ab5cc', marginBottom: 8 }}>1.250 / 2.000 điểm</div>
                  <div style={{ height: 7, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                    <div style={{ width: '62.5%', height: '100%', background: 'linear-gradient(90deg,#f4c04a,#e8a020)', borderRadius: 99 }} />
                  </div>
                  <button style={{ width: '100%', padding: '8px 0', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, color: '#f0f4f9', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    {t('XEM CHI TIẾT', 'VIEW DETAILS')}
                  </button>
                </div>

                <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '14px 16px', color: '#f0f4f9', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#1a2d45', border: '2px solid #f4c04a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Film size={15} color="#f4c04a" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800 }}>AURORA AI Chatbot</span>
                        <span style={{ fontSize: 9, fontWeight: 700, background: '#2563eb', color: '#fff', borderRadius: 4, padding: '1px 5px' }}>BETA</span>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ab5cc' }}>Xin chào! Tôi có thể hỗ trợ bạn:</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 12 }}>
                    {CHATBOT_ITEMS[language].map((item, i) => (
                      <div key={item} onClick={() => setChatMsg(item)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, color: '#c8d8e8' }}>
                        <div style={{ width: 15, height: 15, borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {i < 4 && <Check size={9} color="#f4c04a" strokeWidth={3} />}
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a2d45', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '8px 11px', marginBottom: 7 }}>
                    <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder={t('Nhập câu hỏi của bạn...', 'Type your question...')} style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#c8d8e8', fontSize: 12, fontFamily: 'inherit' }} />
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={14} color="#f4c04a" /></button>
                  </div>
                  <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', color: '#7a8fa6', fontSize: 11.5, cursor: 'pointer', padding: '2px 0' }}>
                    <ExternalLink size={12} />Mở chat đầy đủ
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM FEATURE BAR */}
            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
              {BOTTOM_FEATURES[language].map(({ icon: Icon, label, sub }) => (
                <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 6px rgba(0,0,0,.05)', border: '1px solid #eef0f4', cursor: 'pointer' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: '#f3f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color="#0d1b2e" />
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0d1b2e', lineHeight: 1.3 }}>{label}</div>
                    <div style={{ fontSize: 10.5, color: '#7a8fa6', marginTop: 2 }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </main>
      )}
      <SiteFooter language={language} onNavigate={openFooterPage} />
      </div>
      {pendingBooking && <BookingConfirmationModal
        movie={pendingBooking.movie}
        showtime={pendingBooking.showtime}
        theater={pendingBooking.theater}
        language={language}
        onClose={() => setPendingBooking(null)}
        onConfirm={confirmBooking}
      />}
      {trailerMovie && <TrailerModal movie={trailerMovie} onClose={() => setTrailerMovie(null)} />}
    </div>
  );
}

function SiteFooter({ language, onNavigate }: { language: Language; onNavigate: (page: 'faq' | 'booking-guide' | 'privacy' | 'terms') => void }) {
  const t = (vi: string, en: string) => language === 'en' ? en : vi;
  return (
    <footer style={{ background: '#071526', color: '#e2e8f0', borderTop: '3px solid #f4c04a', padding: '16px 20px 10px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.45fr .9fr 1.1fr .9fr', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 150, height: 40, display: 'flex', alignItems: 'center', padding: '4px 9px', boxSizing: 'border-box', borderRadius: 8, background: '#fff' }}>
              <img src="/aurora-logo.svg" alt="Aurora Cinema" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 10.5, lineHeight: 1.4 }}>{t('Trải nghiệm điện ảnh đỉnh cao cùng Aurora Cinema.', 'Enjoy the ultimate movie experience with Aurora Cinema.')}</p>
        </div>
        <div><h4 style={{ margin: '0 0 7px', fontSize: 10.5, color: '#fff' }}>{t('VỀ AURORA CINEMA', 'ABOUT AURORA CINEMA')}</h4><div style={{ display: 'grid', gap: 4, fontSize: 10.5, color: '#94a3b8' }}><span>{t('Giới thiệu', 'About us')}</span><span>{t('Tin tức', 'News')}</span><span>{t('Liên hệ', 'Contact')}</span></div></div>
        <div><h4 style={{ margin: '0 0 7px', fontSize: 10.5, color: '#fff' }}>{t('HỖ TRỢ KHÁCH HÀNG', 'CUSTOMER SUPPORT')}</h4><div style={{ display: 'grid', gap: 4, fontSize: 10.5, color: '#94a3b8' }}>
          <button onClick={() => onNavigate('faq')} style={footerLinkStyle}>{t('Câu hỏi thường gặp', 'Frequently asked questions')}</button>
          <button onClick={() => onNavigate('booking-guide')} style={footerLinkStyle}>{t('Hướng dẫn đặt vé', 'Booking guide')}</button>
          <button onClick={() => onNavigate('privacy')} style={footerLinkStyle}>{t('Chính sách bảo mật', 'Privacy policy')}</button>
          <button onClick={() => onNavigate('terms')} style={footerLinkStyle}>{t('Điều khoản sử dụng', 'Terms of use')}</button>
        </div></div>
        <div><h4 style={{ margin: '0 0 7px', fontSize: 10.5, color: '#fff' }}>{t('LIÊN HỆ', 'CONTACT')}</h4><div style={{ display: 'grid', gap: 4, fontSize: 10.5, color: '#94a3b8' }}><div>Hotline: <strong style={{ color: '#fff' }}>1900 1234</strong></div><div>Email: <strong style={{ color: '#fff' }}>support@auroracinema.vn</strong></div><div>{t('TP. Hồ Chí Minh', 'Ho Chi Minh City')}</div></div></div>
      </div>
      <div style={{ maxWidth: 1320, margin: '12px auto 0', borderTop: '1px solid rgba(255,255,255,.08)', paddingTop: 8, textAlign: 'center', color: '#64748b', fontSize: 10 }}>© 2026 Aurora Cinema. All rights reserved.</div>
    </footer>
  );
}

const footerLinkStyle: React.CSSProperties = {
  border: 0,
  padding: 0,
  background: 'transparent',
  color: '#94a3b8',
  textAlign: 'left',
  cursor: 'pointer',
  fontSize: 10.5,
};

function FooterInfoPage({ page, onBack }: { page: 'faq' | 'booking-guide' | 'privacy' | 'terms'; onBack: () => void }) {
  const content = {
    faq: {
      eyebrow: 'HỖ TRỢ KHÁCH HÀNG', title: 'Câu hỏi thường gặp', intro: 'Giải đáp nhanh những câu hỏi phổ biến khi sử dụng Aurora Cinema.', sections: [
        ['Làm thế nào để đặt vé?', 'Chọn phim, cụm rạp, ngày chiếu và suất chiếu. Sau đó chọn ghế, đăng nhập tài khoản và xác nhận đặt vé. Mã vé sẽ được lưu trong Lịch sử đặt vé.'],
        ['Tôi có thể đổi hoặc hủy vé không?', 'Vé đang ở trạng thái chờ xử lý có thể được hỗ trợ đổi theo chính sách từng suất chiếu. Vui lòng liên hệ hotline 1900 1234 trước giờ chiếu.'],
        ['Làm sao để nhận ưu đãi thành viên?', 'Đăng nhập tài khoản Aurora để tích điểm sau mỗi giao dịch và theo dõi hạng thành viên, voucher trong khu vực tài khoản.'],
      ]
    },
    'booking-guide': {
      eyebrow: 'HƯỚNG DẪN DỊCH VỤ', title: 'Hướng dẫn đặt vé', intro: 'Bốn bước đơn giản để hoàn tất một lần đặt vé tại Aurora Cinema.', sections: [
        ['01 · Chọn phim và rạp', 'Tại trang chủ hoặc Lịch chiếu theo rạp, chọn bộ phim và cụm rạp bạn muốn trải nghiệm.'],
        ['02 · Chọn ngày và suất chiếu', 'Lịch chiếu hiển thị theo từng ngày. Mỗi suất có phòng chiếu và giá vé riêng để bạn lựa chọn.'],
        ['03 · Chọn ghế', 'Sơ đồ ghế cập nhật theo thời gian thực. Ghế màu xám đã được đặt, ghế màu vàng là ghế VIP.'],
        ['04 · Xác nhận', 'Đăng nhập, chọn Tiếp tục và lưu lại mã vé. Hãy đến rạp trước giờ chiếu ít nhất 15 phút.'],
      ]
    },
    privacy: {
      eyebrow: 'AURORA CINEMA', title: 'Chính sách bảo mật', intro: 'Aurora Cinema tôn trọng và bảo vệ thông tin cá nhân của khách hàng.', sections: [
        ['Thông tin chúng tôi thu thập', 'Thông tin đăng ký, liên hệ, lịch sử đặt vé và dữ liệu sử dụng dịch vụ được lưu để vận hành tài khoản và hỗ trợ khách hàng.'],
        ['Mục đích sử dụng', 'Dữ liệu được dùng để xác thực tài khoản, xử lý đặt vé, cập nhật ưu đãi và cải thiện trải nghiệm. Aurora không bán thông tin cá nhân cho bên thứ ba.'],
        ['Bảo vệ tài khoản', 'Khách hàng cần giữ kín mật khẩu và thông báo ngay cho Aurora nếu phát hiện hoạt động bất thường.'],
      ]
    },
    terms: {
      eyebrow: 'AURORA CINEMA', title: 'Điều khoản sử dụng', intro: 'Các quy định chung khi khách hàng sử dụng website và dịch vụ Aurora Cinema.', sections: [
        ['Tài khoản thành viên', 'Mỗi khách hàng chịu trách nhiệm cung cấp thông tin chính xác và bảo mật thông tin đăng nhập của mình.'],
        ['Đặt vé và thanh toán', 'Thông tin suất chiếu, giá vé và tình trạng ghế được xác nhận tại thời điểm đặt. Mã vé chỉ có giá trị cho đúng suất chiếu đã chọn.'],
        ['Nội dung và dịch vụ', 'Aurora có thể cập nhật lịch chiếu, giá vé hoặc chương trình ưu đãi khi cần và sẽ cố gắng thông báo các thay đổi quan trọng.'],
      ]
    }
  }[page];

  return <main style={{ flex: 1, background: 'linear-gradient(180deg,#f3f6fa 0%,#eef0f4 100%)', padding: '34px 20px 58px' }}>
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <button onClick={onBack} style={{ border: 0, background: 'transparent', color: '#64748b', cursor: 'pointer', padding: 0, fontSize: 13, fontWeight: 700, marginBottom: 20 }}>← Về trang chủ</button>
      <div style={{ background: 'linear-gradient(135deg,#0d1b2e,#1d3a5c)', borderRadius: 20, padding: '34px 32px', color: '#fff', marginBottom: 18, boxShadow: '0 10px 30px rgba(13,27,46,.16)' }}>
        <div style={{ color: '#f4c04a', fontSize: 11, fontWeight: 900, letterSpacing: 1.5, marginBottom: 8 }}>{content.eyebrow}</div>
        <h1 style={{ margin: 0, fontSize: 30 }}>{content.title}</h1>
        <p style={{ margin: '10px 0 0', color: '#c8d6e5', lineHeight: 1.6, fontSize: 14 }}>{content.intro}</p>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>{content.sections.map(([title, text]) => <section key={title} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '20px 22px' }}><h2 style={{ margin: '0 0 8px', color: '#0d1b2e', fontSize: 16 }}>{title}</h2><p style={{ margin: 0, color: '#64748b', lineHeight: 1.7, fontSize: 13.5 }}>{text}</p></section>)}</div>
      <div style={{ marginTop: 20, padding: 18, borderRadius: 12, background: '#fff7dd', color: '#7c5a13', fontSize: 13 }}>Cần hỗ trợ thêm? Gọi hotline <strong>1900 1234</strong> hoặc email <strong>support@auroracinema.vn</strong>.</div>
    </div>
  </main>;
}
