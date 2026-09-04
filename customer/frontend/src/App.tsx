import { useEffect, useState } from 'react';
import {
  Star, MapPin, Search, Bell, Trophy, ChevronDown, ChevronLeft, ChevronRight,
  PlayCircle, Gift, Ticket, Film, Send, ExternalLink, Smartphone,
  CreditCard, Percent, Phone, Check, Clock3, Sparkles, Facebook, Instagram, Youtube
} from 'lucide-react';
import AuthModal from './components/customer/AuthModal';
import MovieDetailPage from './components/customer/MovieDetailPage';
import BookingModal from './components/customer/BookingModal';
import TrailerModal from './components/customer/TrailerModal';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

/* ─── DATA ──────────────────────────────────────────────────── */

const NAV = ['TRANG CHỦ', 'LỊCH CHIẾU THEO RẠP', 'PHIM', 'RẠP', 'GIÁ VÉ', 'ƯU ĐÃI', 'THÀNH VIÊN', 'HỖ TRỢ'];

const MOVIES = [
  { title: 'Quý Tử Vượt Giàu', rating: 'T13' },
  { title: 'Nghỉ Hè Sợ Nghỉ Hưu', rating: 'P' },
  { title: 'Chiikawa: Bí Mật Đảo Nước', rating: 'K' },
  { title: 'Hộ Linh Tráng Sĩ - Bí Ẩn', rating: 'T18' },
  { title: 'Quái Vật 4DX Huyền Thoại', rating: '4DX' },
];

const CHATBOT_ITEMS = [
  'Tư vấn phim phù hợp',
  'Tìm suất chiếu',
  'Tư vấn giá vé',
  'Sơ đồ ghế & vị trí đẹp',
  'Hỗ trợ đặt vé',
  'Ưu đãi thành viên',
];

const BOTTOM_FEATURES = [
  { icon: Ticket, label: 'Đặt vé nhanh chóng', sub: 'Chọn ghế tiện lợi' },
  { icon: CreditCard, label: 'Nhiều phương thức thanh toán', sub: 'An toàn & tiện lợi' },
  { icon: Percent, label: 'Ưu đãi mỗi ngày', sub: 'Dành riêng cho bạn' },
  { icon: Gift, label: 'Tích điểm đổi quà', sub: 'Thành viên Aurora' },
  { icon: Phone, label: 'Hỗ trợ 24/7', sub: 'Luôn sẵn sàng' },
];

function ratingBg(r: string) {
  if (r === 'P') return '#27ae60';
  if (r === 'K') return '#f39c12';
  if (r === 'T13') return '#e67e22';
  if (r === 'T18') return '#e74c3c';
  if (r === '4DX') return '#8e44ad';
  return '#555';
}

/* ─── COMPONENT ─────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab] = useState(0);
  const [movieTab, setMovieTab] = useState<'NOW_SHOWING' | 'COMING_SOON' | 'SPECIAL_SHOWING'>('NOW_SHOWING');
  const [chatMsg, setChatMsg] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authUser, setAuthUser] = useState<{ fullName: string; email: string } | null>(null);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [theatersList, setTheatersList] = useState<any[]>([]);
  const [selectedTheater, setSelectedTheater] = useState<string>('Aurora Q1');
  const [selectedTheaterId, setSelectedTheaterId] = useState<number | null>(null);
  const [showtimesList, setShowtimesList] = useState<any[]>([]);
  const [detailMovie, setDetailMovie] = useState<any | null>(null);
  const [booking, setBooking] = useState<{ movie: any; showtime: any } | null>(null);
  const [trailerMovie, setTrailerMovie] = useState<any | null>(null);
  const scheduleDate = '2026-09-04';
  const [showTheaterMenu, setShowTheaterMenu] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${API_URL}?action=me`, { credentials: 'include' })
      .then(response => response.json())
      .then(result => setAuthUser(result.user))
      .catch(() => setAuthUser(null));

    // Lấy dữ liệu phim trực tiếp từ MySQL Database aurora_db
    fetch(`${API_URL}?action=movies`)
      .then(response => response.json())
      .then(result => {
        if (result && result.movies && result.movies.length > 0) {
          setMoviesList(result.movies.map((m: any) => ({
            id: m.id,
            title: m.title,
            description: m.description,
            rating: m.ageRating || 'T13',
            ageRating: m.ageRating,
            format: m.format || '2D Digital',
            poster: m.posterUrl,
            posterUrl: m.posterUrl,
            trailerUrl: m.trailerUrl,
            duration: m.durationMinutes,
            status: m.status || 'NOW_SHOWING',
            releaseDate: m.releaseDate
          })));
        }
      })
      .catch(() => {});

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

  return (
    <div style={{ minHeight: '100vh', background: '#eef0f4', fontFamily: "'Segoe UI','Inter',sans-serif", color: '#1a2332' }}>

      {/* TOP BAR */}
      <div style={{ background: '#0d1b2e', color: '#c8d6e5' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, height: 32, boxSizing: 'border-box' }}>
          <span style={{ color: '#dce8f5' }}>
            {authMode === 'register'
              ? 'Đăng ký tài khoản mới'
              : authMode === 'login'
              ? 'Đăng nhập tài khoản'
              : <>Xin chào: <strong>{authUser ? authUser.fullName : 'Bạn chưa đăng nhập'}</strong></>}
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
                    Đăng nhập
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
                    Đăng ký
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <span>VN</span><ChevronDown size={12} />
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trophy size={13} color="#f4c04a" />
                  <span>Thành viên <strong style={{ color: '#f4c04a' }}>GOLD</strong></span>
                  <span style={{ color: '#8aa0b8' }}>|</span>
                  <strong style={{ color: '#f4c04a' }}>1.250 điểm</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ position: 'relative', cursor: 'pointer' }}>
                    <Bell size={15} />
                    <span style={{ position: 'absolute', top: -5, right: -5, background: '#e74c3c', color: '#fff', borderRadius: 99, fontSize: 9, minWidth: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', fontWeight: 700 }}>3</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <span>VN</span><ChevronDown size={12} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: '#fff', borderBottom: '1px solid #dde3ec', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20, height: 64 }}>
          <div onClick={() => setAuthMode(null)} style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, cursor: 'pointer' }}>
            <div style={{ width: 38, height: 38, background: '#f4c04a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(244,192,74,0.4)' }}>
              <Star size={20} fill="#0d1b2e" color="#0d1b2e" />
            </div>
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 1, color: '#0d1b2e' }}>AURORA</div>
              <div style={{ fontSize: 8.5, letterSpacing: 4, color: '#7a8fa6', fontWeight: 600 }}>CINEMA</div>
            </div>
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
                  <span>HỆ THỐNG CỤM RẠP AURORA</span>
                  <span style={{ fontSize: 10, background: '#f4c04a', color: '#0d1b2e', padding: '2px 7px', borderRadius: 4, fontWeight: 900 }}>
                    {theatersList.length} CỤM RẠP
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
            {NAV.map((item, i) => (
              <button
                key={item}
                onClick={i === 0 ? () => { setAuthMode(null); setDetailMovie(null); } : undefined}
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: (i === 0 && !authMode) ? '#0d1b2e' : '#6b7f94',
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  cursor: 'pointer',
                  borderBottom: (i === 0 && !authMode) ? '2px solid #f4c04a' : '2px solid transparent',
                  whiteSpace: 'nowrap'
                }}
              >
                {item}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #d5dee9', background: '#f3f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Search size={16} color="#4a637a" />
            </button>
            {authUser ? (
              <button onClick={handleLogout} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #cdd7e2', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1a2332' }}>Đăng xuất</button>
            ) : (
              <>
                <button onClick={() => setAuthMode('login')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #cdd7e2', background: authMode === 'login' ? '#f1f5f9' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1a2332' }}>Đăng nhập</button>
                <button onClick={() => setAuthMode('register')} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f4c04a', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#0d1b2e', boxShadow: '0 4px 12px rgba(244,192,74,0.35)' }}>Đăng ký</button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT: AUTH OR HOMEPAGE */}
      {authMode ? (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthMode(null)}
          onSwitchMode={newMode => setAuthMode(newMode)}
          onAuthenticated={account => {
            setAuthUser(account);
            setAuthMode(null);
          }}
        />
      ) : (
        <>
          {detailMovie ? (
            <MovieDetailPage
              movie={detailMovie}
              theaters={theatersList}
              theater={selectedTheater}
              showtimes={showtimesList.filter((showtime: any) => showtime.movie_id === detailMovie.id)}
              date={scheduleDate}
              onBack={() => setDetailMovie(null)}
              onBook={(showtime, theaterName) => {
                setSelectedTheater(theaterName);
                setSelectedTheaterId(showtime.theater_id);
                setBooking({ movie: detailMovie, showtime });
              }}
            />
          ) : (
            <>
          <main style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 16px 20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr 280px', gap: 14 }}>

              {/* LEFT SIDEBAR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '18px 16px', color: '#f0f4f9' }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#f4c04a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>Đặc quyền thành viên</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {['Tích điểm mỗi giao dịch', 'Đổi quà hấp dẫn', 'Ưu đãi dành riêng cho bạn', 'Nhiều hạng thành viên'].map(t => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c8d8e8' }}>
                        <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#f4c04a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={10} color="#0d1b2e" strokeWidth={3} />
                        </div>
                        {t}
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setAuthMode('register')} style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12.5, color: '#0d1b2e', cursor: 'pointer', textTransform: 'uppercase' }}>
                    ĐĂNG KÝ NGAY
                  </button>
                </div>
                <div style={{ background: '#fff8e8', border: '1px solid #f0d990', borderRadius: 14, padding: '16px' }}>
                  <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>Tải app Aurora</h3>
                  <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#6b7f94' }}>Đặt vé dễ dàng và nhận nhiều ưu đãi</p>
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
                <div style={{ borderRadius: 16, overflow: 'hidden', background: 'linear-gradient(135deg,#071628 0%,#0e2341 50%,#0a1f3a 100%)', position: 'relative', minHeight: 200, padding: '30px 32px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ position: 'absolute', top: '15%', left: '35%', width: 180, height: 180, background: 'radial-gradient(circle,rgba(255,220,80,.13) 0%,transparent 65%)', pointerEvents: 'none' }} />
                  <div style={{ position: 'absolute', top: 0, right: '8%', width: 150, height: 150, background: 'radial-gradient(circle,rgba(100,160,255,.12) 0%,transparent 65%)', pointerEvents: 'none' }} />
                  <div style={{ zIndex: 1, flex: 1, maxWidth: '55%' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: 2 }}>TRẢI NGHIỆM ĐIỆN ẢNH</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#f4c04a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>ĐỈNH CAO</div>
                    <div style={{ fontSize: 12.5, color: '#9ab5cc', marginBottom: 18, lineHeight: 1.7 }}>
                      Đặt vé nhanh chóng – Thanh toán tiện lợi<br />Ưu đãi hấp dẫn dành riêng cho bạn
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button style={{ padding: '9px 20px', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12.5, color: '#0d1b2e', cursor: 'pointer' }}>ĐẶT VÉ NGAY</button>
                      <button style={{ padding: '9px 18px', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 9, fontWeight: 700, fontSize: 12.5, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <PlayCircle size={16} color="#f4c04a" />XEM TRAILER
                      </button>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'flex-end', gap: 8, zIndex: 1 }}>
                    <div style={{ position: 'relative', width: 65, height: 50 }}>
                      <div style={{ width: 65, height: 50, background: '#1a2d45', borderRadius: 6, border: '2px solid #2c3d52', transform: 'rotate(-8deg)', overflow: 'hidden' }}>
                        <div style={{ height: 12, background: 'repeating-linear-gradient(90deg,#f4c04a 0,#f4c04a 9px,#0d1b2e 9px,#0d1b2e 18px)' }} />
                      </div>
                      <div style={{ position: 'absolute', top: -8, left: -2, width: 65, height: 12, background: '#f4c04a', borderRadius: 3, transform: 'rotate(-8deg)' }} />
                    </div>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', border: '5px solid #e0d8cc', background: '#cec4b6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '3px solid #9a8e80', background: '#bdb0a2' }} />
                    </div>
                    <div style={{ width: 44, height: 54, position: 'relative' }}>
                      <div style={{ position: 'absolute', bottom: 0, width: '100%', height: 34, background: 'linear-gradient(180deg,#f4c04a,#d4900a)', clipPath: 'polygon(8% 0,92% 0,100% 100%,0 100%)' }} />
                      <div style={{ position: 'absolute', bottom: 30, left: -3, right: -3, top: 0, background: '#ffe8b0', borderRadius: 5, border: '2px solid #f4c04a' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 3, padding: 4 }}>
                          {Array(9).fill(0).map((_, i) => <div key={i} style={{ height: 5, borderRadius: 99, background: i % 2 === 0 ? '#fff9e0' : '#f4c04a' }} />)}
                        </div>
                      </div>
                    </div>
                    <div style={{ width: 50, height: 74, background: '#f4c04a', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, boxShadow: '2px 4px 12px rgba(0,0,0,.3)', transform: 'rotate(8deg)', flexShrink: 0, padding: 6 }}>
                      <div style={{ width: 32, height: 3, background: '#0d1b2e', borderRadius: 99, opacity: 0.6 }} />
                      <div style={{ width: 24, height: 3, background: '#0d1b2e', borderRadius: 99, opacity: 0.4 }} />
                      <div style={{ fontSize: 8, fontWeight: 900, color: '#0d1b2e', marginTop: 3 }}>XKIY</div>
                      <div style={{ width: 34, height: 20, background: '#0d1b2e', borderRadius: 4, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2 }}>
                          {Array(10).fill(0).map((_, i) => <div key={i} style={{ width: 3, height: 6, background: '#f4c04a', borderRadius: 1 }} />)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                    {[0, 1, 2, 3].map(i => (<div key={i} style={{ width: i === 0 ? 20 : 7, height: 7, borderRadius: 99, background: i === 0 ? '#f4c04a' : 'rgba(255,255,255,.3)' }} />))}
                  </div>
                </div>

                {/* Quick Booking */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>ĐẶT VÉ NHANH</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                    {[
                      { 
                        label: 'Chọn rạp', 
                        val: selectedTheater, 
                        icon: <ChevronDown size={13} color="#6b7f94" />,
                        action: () => setShowTheaterMenu(prev => !prev)
                      },
                      { label: 'Chọn phim', val: 'Tất cả phim', icon: <Film size={13} color="#6b7f94" />, action: undefined },
                      { label: 'Chọn ngày', val: 'Hôm nay, 04/09/2026', icon: null, action: undefined },
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
                      <Search size={13} />Tìm suất chiếu
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
                    const theaterMovieIds = new Set(showtimesList.map((showtime: any) => showtime.movie_id));
                    // Keep the movie catalogue visible while a theater has no schedule yet.
                    const theaterMovies = showtimesList.length > 0
                      ? moviesList.filter((m: any) => theaterMovieIds.has(m.id))
                      : moviesList.filter((m: any) => m.status === 'NOW_SHOWING');
                    const filteredMovies = theaterMovies.filter((m: any) => m.status === movieTab);
                    const displayList = filteredMovies.length > 0
                      ? filteredMovies
                      : (movieTab === 'NOW_SHOWING' ? theaterMovies.filter((m: any) => m.status === 'NOW_SHOWING') : []);

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
                                background: m.poster ? `url(${m.poster}) center/cover no-repeat` : 'linear-gradient(160deg,#1e293b 0%,#0f172a 100%)',
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
                                  if (firstShowtime) setBooking({ movie: m, showtime: firstShowtime });
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
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4c04a', textTransform: 'uppercase', marginBottom: 4 }}>Ưu đãi hấp dẫn</div>
                    <div style={{ fontSize: 11.5, color: '#9ab5cc', marginBottom: 10 }}>Nhiều voucher và combo siêu hấp dẫn</div>
                    <button style={{ padding: '7px 16px', background: '#f4c04a', border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 11.5, color: '#0d1b2e', cursor: 'pointer' }}>XEM NGAY</button>
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
                    XEM CHI TIẾT
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
                    {CHATBOT_ITEMS.map((item, i) => (
                      <div key={item} onClick={() => setChatMsg(item)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, cursor: 'pointer', fontSize: 11.5, color: '#c8d8e8' }}>
                        <div style={{ width: 15, height: 15, borderRadius: 4, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {i < 4 && <Check size={9} color="#f4c04a" strokeWidth={3} />}
                        </div>
                        {item}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#1a2d45', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '8px 11px', marginBottom: 7 }}>
                    <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Nhập câu hỏi của bạn..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#c8d8e8', fontSize: 12, fontFamily: 'inherit' }} />
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
              {BOTTOM_FEATURES.map(({ icon: Icon, label, sub }) => (
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
            </>
          )}

          {/* FOOTER */}
          <footer style={{ background: '#071526', color: '#e2e8f0', marginTop: '24px', borderTop: '4px solid #f4c04a', padding: '36px 20px 20px' }}>
            <div
              style={{
                maxWidth: 1320,
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 1fr 1.3fr',
                gap: 28,
                marginBottom: 28
              }}
            >
              {/* Column 1: Logo & Socials */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      background: 'linear-gradient(135deg, #f5d061 0%, #e5a826 100%)',
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Star size={20} fill="#071526" color="#071526" />
                  </div>
                  <div style={{ lineHeight: 1.1 }}>
                    <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: 1.2, color: '#ffffff' }}>AURORA</div>
                    <div style={{ fontSize: 8.5, letterSpacing: 3.5, color: '#94a3b8', fontWeight: 600 }}>CINEMA</div>
                  </div>
                </div>
                <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6, margin: '0 0 16px 0' }}>
                  Trải nghiệm điện ảnh đỉnh cao
                </p>
                {/* Social Icons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href="#"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Facebook size={15} />
                  </a>
                  <a
                    href="#"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Instagram size={15} />
                  </a>
                  <a
                    href="#"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff'
                    }}
                  >
                    <Youtube size={15} />
                  </a>
                  <a
                    href="#"
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 800
                    }}
                  >
                    ♪
                  </a>
                </div>
              </div>

              {/* Column 2: VỀ AURORA CINEMA */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  VỀ AURORA CINEMA
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                  <a href="#" style={{ color: 'inherit' }}>Giới thiệu</a>
                  <a href="#" style={{ color: 'inherit' }}>Tuyển dụng</a>
                  <a href="#" style={{ color: 'inherit' }}>Tin tức</a>
                  <a href="#" style={{ color: 'inherit' }}>Liên hệ</a>
                </div>
              </div>

              {/* Column 3: HỖ TRỢ KHÁCH HÀNG */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  HỖ TRỢ KHÁCH HÀNG
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12, color: '#94a3b8' }}>
                  <a href="#" style={{ color: 'inherit' }}>Câu hỏi thường gặp</a>
                  <a href="#" style={{ color: 'inherit' }}>Hướng dẫn đặt vé</a>
                  <a href="#" style={{ color: 'inherit' }}>Chính sách bảo mật</a>
                  <a href="#" style={{ color: 'inherit' }}>Điều khoản sử dụng</a>
                </div>
              </div>

              {/* Column 4: TẢI ỨNG DỤNG */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  TẢI ỨNG DỤNG
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* App Store Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#000000',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    <span style={{ fontSize: 16 }}></span>
                    <div>
                      <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1 }}>Download on the</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>App Store</div>
                    </div>
                  </div>

                  {/* Google Play Badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#000000',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 6,
                      padding: '6px 10px',
                      cursor: 'pointer',
                      width: 'fit-content'
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#38bdf8' }}>▶</span>
                    <div>
                      <div style={{ fontSize: 8, color: '#94a3b8', lineHeight: 1 }}>GET IT ON</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>Google Play</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 5: LIÊN HỆ */}
              <div>
                <h4 style={{ fontSize: 12.5, fontWeight: 800, color: '#ffffff', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 0.5 }}>
                  LIÊN HỆ
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: '#94a3b8' }}>
                  <div>Hotline: <strong style={{ color: '#ffffff' }}>1900 1234</strong></div>
                  <div>Email: <strong style={{ color: '#ffffff' }}>support@auroracinema.vn</strong></div>
                  <div style={{ lineHeight: 1.5 }}>
                    Địa chỉ: 123 Điện Biên Phủ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div
              style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 16,
                textAlign: 'center',
                fontSize: 12,
                color: '#64748b'
              }}
            >
              © 2025 Aurora Cinema. All rights reserved.
            </div>
          </footer>
        </>
      )}
      {booking && <BookingModal
        movie={booking.movie}
        theater={selectedTheater}
        showtime={booking.showtime}
        user={authUser}
        onClose={() => setBooking(null)}
        onRequireLogin={() => {
          setBooking(null);
          setAuthMode('login');
        }}
      />}
      {trailerMovie && <TrailerModal movie={trailerMovie} onClose={() => setTrailerMovie(null)} />}
    </div>
  );
}
