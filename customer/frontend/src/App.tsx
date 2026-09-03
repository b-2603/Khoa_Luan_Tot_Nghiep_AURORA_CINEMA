import { useEffect, useState } from 'react';
import {
  Star, MapPin, Search, Bell, Trophy, ChevronDown, ChevronLeft, ChevronRight,
  PlayCircle, Gift, Ticket, Film, Send, ExternalLink, Smartphone,
  CreditCard, Percent, Phone, Check, Clock3, Sparkles, Facebook, Instagram, Youtube
} from 'lucide-react';
import AuthModal from './components/customer/AuthModal';

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
  const [activeTab, setActiveTab] = useState(1);
  const [chatMsg, setChatMsg] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authUser, setAuthUser] = useState<{ fullName: string; email: string } | null>(null);

  useEffect(() => {
    fetch(`${API_URL}?action=me`, { credentials: 'include' })
      .then(response => response.json())
      .then(result => setAuthUser(result.user))
      .catch(() => setAuthUser(null));
  }, []);

  async function handleLogout() {
    await fetch(`${API_URL}?action=logout`, { credentials: 'include' });
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#f3f6fa', border: '1px solid #d5dee9', borderRadius: 20, padding: '5px 12px', fontSize: 13, color: '#3d5166', cursor: 'pointer', flexShrink: 0 }}>
            <MapPin size={13} color="#f4c04a" /><span>Aurora Q1</span><ChevronDown size={13} color="#7a8fa6" />
          </div>
          <nav style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1, justifyContent: 'center' }}>
            {NAV.map((item, i) => (
              <button
                key={item}
                onClick={i === 0 ? () => setAuthMode(null) : undefined}
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
                      { label: 'Chọn rạp', val: 'Tất cả rạp', icon: <ChevronDown size={13} color="#6b7f94" /> },
                      { label: 'Chọn phim', val: 'Tất cả phim', icon: <Film size={13} color="#6b7f94" /> },
                      { label: 'Chọn ngày', val: 'Hôm nay, 29/05/2025', icon: null },
                    ].map(f => (
                      <div key={f.label}>
                        <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#6b7f94', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                        <div style={{ border: '1px solid #d5dee9', borderRadius: 8, padding: '8px 12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12.5, color: '#1a2332' }}>
                          <span>{f.val}</span>{f.icon}
                        </div>
                      </div>
                    ))}
                    <button style={{ padding: '8px 14px', background: '#0d1b2e', border: 'none', borderRadius: 8, color: '#f4c04a', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, height: 37 }}>
                      <Search size={13} />Tìm suất chiếu
                    </button>
                  </div>
                </div>

                {/* Movie Tabs */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', borderBottom: '2px solid #eef0f4', marginBottom: 16 }}>
                    {['Phim sắp chiếu', 'Phim đang chiếu', 'Suất chiếu đặc biệt'].map((tab, i) => (
                      <button key={tab} onClick={() => setActiveTab(i)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab === i ? '2px solid #f4c04a' : '2px solid transparent', marginBottom: -2, fontSize: 12.5, fontWeight: activeTab === i ? 800 : 600, color: activeTab === i ? '#0d1b2e' : '#6b7f94', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {tab}
                      </button>
                    ))}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <button style={{ position: 'absolute', left: -14, top: '42%', transform: 'translateY(-50%)', width: 27, height: 27, borderRadius: '50%', background: '#fff', border: '1px solid #d5dee9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,.08)' }}>
                      <ChevronLeft size={15} />
                    </button>
                    <button style={{ position: 'absolute', right: -14, top: '42%', transform: 'translateY(-50%)', width: 27, height: 27, borderRadius: '50%', background: '#fff', border: '1px solid #d5dee9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2, boxShadow: '0 2px 6px rgba(0,0,0,.08)' }}>
                      <ChevronRight size={15} />
                    </button>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                      {MOVIES.map(m => (
                        <div key={m.title} style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #eef0f4', background: '#f8fafc' }}>
                          <div style={{ position: 'relative', background: 'linear-gradient(160deg,#d0d7e4 0%,#b8c2d4 100%)', height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Film size={32} color="#8a97aa" />
                            <div style={{ position: 'absolute', top: 6, left: 6, background: ratingBg(m.rating), color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4 }}>{m.rating}</div>
                            <div style={{ position: 'absolute', top: 0, right: 0, background: '#e74c3c', color: '#fff', fontSize: 9, fontWeight: 800, padding: '3px 6px', borderRadius: '0 10px 0 8px' }}>HOT</div>
                          </div>
                          <div style={{ padding: '7px 8px 0' }}>
                            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1a2332', lineHeight: 1.3, height: 28, overflow: 'hidden' }}>{m.title}</div>
                            <div style={{ height: 7, background: '#e2e8f0', borderRadius: 99, margin: '5px 0 3px', width: '80%' }} />
                            <div style={{ height: 5, background: '#e2e8f0', borderRadius: 99, width: '55%' }} />
                          </div>
                          <button style={{ margin: '7px 7px 7px', width: 'calc(100% - 14px)', padding: '7px 0', background: '#0d1b2e', border: 'none', borderRadius: 7, color: '#f4c04a', fontWeight: 800, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                            <Ticket size={11} />MUA VÉ
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
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
    </div>
  );
}
