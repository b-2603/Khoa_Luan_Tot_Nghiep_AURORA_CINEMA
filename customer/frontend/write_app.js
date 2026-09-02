const fs = require('fs');

const content = `import { useState } from 'react';
import {
  Star, MapPin, Search, Bell, Trophy, ChevronDown, ChevronLeft, ChevronRight,
  PlayCircle, Gift, Ticket, Film, Send, ExternalLink, Smartphone,
  CreditCard, Percent, Phone, Check
} from 'lucide-react';

/* ─── DATA ──────────────────────────────────────────────────── */

const NAV = ['TRANG CH\\u1ee6', 'L\\u1ecaCH CHI\\u1edeU THEO R\\u1ea0P', 'PHIM', 'R\\u1ea0P', 'GI\\u00c1 V\\u00c9', '\\u01af\\u01af \\u0110\\u00c3I', 'TH\\u00c0NH VI\\u00caN', 'H\\u1ed6 TR\\u1ee2'];

const MOVIES = [
  { title: 'Qu\\u00fd T\\u1eed V\\u01b0\\u1ee3t Gi\\u00e0u',            rating: 'T13' },
  { title: 'Ngh\\u1ec9 H\\u00e8 S\\u1ee3 Ngh\\u1ec9 H\\u01b0u',         rating: 'P'   },
  { title: 'Chiikawa: B\\u00ed M\\u1eadt \\u0110\\u1ea3o N\\u01b0\\u1edbc', rating: 'K'   },
  { title: 'H\\u1ed9 Linh Tr\\u00e1ng S\\u0129 - B\\u00ed \\u1ea8n',     rating: 'T18' },
  { title: 'Qu\\u00e1i V\\u1eadt 4DX Huy\\u1ec1n Tho\\u1ea1i',         rating: '4DX' },
];

const CHATBOT_ITEMS = [
  'T\\u01b0 v\\u1ea5n phim ph\\u00f9 h\\u1ee3p',
  'T\\u00ecm su\\u1ea5t chi\\u1ebfu',
  'T\\u01b0 v\\u1ea5n gi\\u00e1 v\\u00e9',
  'S\\u01a1 \\u0111\\u1ed3 gh\\u1ebf & v\\u1ecb tr\\u00ed \\u0111\\u1eb9p',
  'H\\u1ed7 tr\\u1ee3 \\u0111\\u1eb7t v\\u00e9',
  '\\u01afu \\u0111\\u00e3i th\\u00e0nh vi\\u00ean',
];

const BOTTOM_FEATURES = [
  { icon: Ticket,     label: '\\u0110\\u1eb7t v\\u00e9 nhanh ch\\u00f3ng',           sub: 'Ch\\u1ecdn gh\\u1ebf ti\\u1ec7n l\\u1ee3i'    },
  { icon: CreditCard, label: 'Nhi\\u1ec1u ph\\u01b0\\u01a1ng th\\u1ee9c thanh to\\u00e1n', sub: 'An to\\u00e0n & ti\\u1ec7n l\\u1ee3i'  },
  { icon: Percent,    label: '\\u01afu \\u0111\\u00e3i m\\u1ed7i ng\\u00e0y',             sub: 'D\\u00e0nh ri\\u00eang cho b\\u1ea1n'  },
  { icon: Gift,       label: 'T\\u00edch \\u0111i\\u1ec3m \\u0111\\u1ed5i qu\\u00e0',      sub: 'Th\\u00e0nh vi\\u00ean Aurora'       },
  { icon: Phone,      label: 'H\\u1ed7 tr\\u1ee3 24/7',                   sub: 'Lu\\u00f4n s\\u1eb5n s\\u00e0ng'         },
];

function ratingBg(r: string) {
  if (r === 'P')   return '#27ae60';
  if (r === 'K')   return '#f39c12';
  if (r === 'T13') return '#e67e22';
  if (r === 'T18') return '#e74c3c';
  if (r === '4DX') return '#8e44ad';
  return '#555';
}

/* ─── COMPONENT ─────────────────────────────────────────────── */
export default function App() {
  const [activeTab, setActiveTab] = useState(1);
  const [chatMsg, setChatMsg] = useState('');

  return (
    <div style={{ minHeight: '100vh', background: '#eef0f4', fontFamily: "'Segoe UI','Inter',sans-serif", color: '#1a2332' }}>

      {/* TOP BAR */}
      <div style={{ background: '#0d1b2e', color: '#c8d6e5' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
          <span style={{ color: '#dce8f5' }}>Xin ch\\u00e0o: <strong>Nguy\\u1ec5n Tr\\u1ea7n Th\\u00e1i B\\u1ea3o</strong></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={13} color="#f4c04a" />
              <span>Th\\u00e0nh vi\\u00ean <strong style={{ color: '#f4c04a' }}>GOLD</strong></span>
              <span style={{ color: '#8aa0b8' }}>|</span>
              <strong style={{ color: '#f4c04a' }}>1.250 \\u0111i\\u1ec3m</strong>
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
          </div>
        </div>
      </div>

      {/* HEADER */}
      <header style={{ background: '#fff', borderBottom: '1px solid #dde3ec', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 20, height: 64 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
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
              <button key={item} style={{ fontSize: 11.5, fontWeight: 700, color: i === 0 ? '#0d1b2e' : '#6b7f94', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', borderBottom: i === 0 ? '2px solid #f4c04a' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                {item}
              </button>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #d5dee9', background: '#f3f6fa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Search size={16} color="#4a637a" />
            </button>
            <button style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #cdd7e2', background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#1a2332' }}>\\u0110\\u0103ng nh\\u1eadp</button>
            <button style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f4c04a', fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#0d1b2e', boxShadow: '0 4px 12px rgba(244,192,74,0.35)' }}>\\u0110\\u0103ng k\\u00fd</button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '14px 16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr 280px', gap: 14 }}>

          {/* LEFT SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '18px 16px', color: '#f0f4f9' }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#f4c04a', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>\\u0110\\u1eb7c quy\\u1ec1n th\\u00e0nh vi\\u00ean</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['T\\u00edch \\u0111i\\u1ec3m m\\u1ed7i giao d\\u1ecbch', '\\u0110\\u1ed5i qu\\u00e0 h\\u1ea5p d\\u1eabn', '\\u01afu \\u0111\\u00e3i d\\u00e0nh ri\\u00eang cho b\\u1ea1n', 'Nhi\\u1ec1u h\\u1ea1ng th\\u00e0nh vi\\u00ean'].map(t => (
                  <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c8d8e8' }}>
                    <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#f4c04a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={10} color="#0d1b2e" strokeWidth={3} />
                    </div>
                    {t}
                  </div>
                ))}
              </div>
              <button style={{ marginTop: 16, width: '100%', padding: '10px 0', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12.5, color: '#0d1b2e', cursor: 'pointer', textTransform: 'uppercase' }}>
                \\u0110\\u0102NG K\\u00dd NGAY
              </button>
            </div>
            <div style={{ background: '#fff8e8', border: '1px solid #f0d990', borderRadius: 14, padding: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>T\\u1ea3i app Aurora</h3>
              <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#6b7f94' }}>\\u0110\\u1eb7t v\\u00e9 d\\u1ec5 d\\u00e0ng v\\u00e0 nh\\u1eadn nhi\\u1ec1u \\u01b0u \\u0111\\u00e3i</p>
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
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', textTransform: 'uppercase', marginBottom: 2 }}>TR\\u1ea2I NGHI\\u1ec6M \\u0110I\\u1ec6N \\u1ea2NH</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: '#f4c04a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>\\u0110\\u1ec8NH CAO</div>
                <div style={{ fontSize: 12.5, color: '#9ab5cc', marginBottom: 18, lineHeight: 1.7 }}>
                  \\u0110\\u1eb7t v\\u00e9 nhanh ch\\u00f3ng \\u2013 Thanh to\\u00e1n ti\\u1ec7n l\\u1ee3i<br />\\u01afu \\u0111\\u00e3i h\\u1ea5p d\\u1eabn d\\u00e0nh ri\\u00eang cho b\\u1ea1n
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button style={{ padding: '9px 20px', background: '#f4c04a', border: 'none', borderRadius: 9, fontWeight: 800, fontSize: 12.5, color: '#0d1b2e', cursor: 'pointer' }}>\\u0110\\u1eb6T V\\u00c9 NGAY</button>
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
                      {Array(9).fill(0).map((_, i) => <div key={i} style={{ height: 5, borderRadius: 99, background: i%2===0?'#fff9e0':'#f4c04a' }} />)}
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
                {[0,1,2,3].map(i => (<div key={i} style={{ width: i===0?20:7, height: 7, borderRadius: 99, background: i===0?'#f4c04a':'rgba(255,255,255,.3)' }} />))}
              </div>
            </div>

            {/* Quick Booking */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 900, color: '#0d1b2e', textTransform: 'uppercase' }}>\\u0110\\u1eb6T V\\u00c9 NHANH</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'end' }}>
                {[
                  { label: 'Ch\\u1ecdn r\\u1ea1p', val: 'T\\u1ea5t c\\u1ea3 r\\u1ea1p', icon: <ChevronDown size={13} color="#6b7f94" /> },
                  { label: 'Ch\\u1ecdn phim', val: 'T\\u1ea5t c\\u1ea3 phim', icon: <Film size={13} color="#6b7f94" /> },
                  { label: 'Ch\\u1ecdn ng\\u00e0y', val: 'H\\u00f4m nay, 29/05/2025', icon: null },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: 'block', fontSize: 10.5, fontWeight: 700, color: '#6b7f94', marginBottom: 5, textTransform: 'uppercase' }}>{f.label}</label>
                    <div style={{ border: '1px solid #d5dee9', borderRadius: 8, padding: '8px 12px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 12.5, color: '#1a2332' }}>
                      <span>{f.val}</span>{f.icon}
                    </div>
                  </div>
                ))}
                <button style={{ padding: '8px 14px', background: '#0d1b2e', border: 'none', borderRadius: 8, color: '#f4c04a', fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, height: 37 }}>
                  <Search size={13} />T\\u00ecm su\\u1ea5t chi\\u1ebfu
                </button>
              </div>
            </div>

            {/* Movie Tabs */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', borderBottom: '2px solid #eef0f4', marginBottom: 16 }}>
                {['Phim s\\u1eafp chi\\u1ebfu','Phim \\u0111ang chi\\u1ebfu','Su\\u1ea5t chi\\u1ebfu \\u0111\\u1eb7c bi\\u1ec7t'].map((tab, i) => (
                  <button key={tab} onClick={() => setActiveTab(i)} style={{ padding: '8px 16px', background: 'none', border: 'none', borderBottom: activeTab===i?'2px solid #f4c04a':'2px solid transparent', marginBottom: -2, fontSize: 12.5, fontWeight: activeTab===i?800:600, color: activeTab===i?'#0d1b2e':'#6b7f94', cursor: 'pointer', whiteSpace: 'nowrap' }}>
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
                        <Ticket size={11} />MUA V\\u00c9
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
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4c04a', textTransform: 'uppercase', marginBottom: 4 }}>\\u01afu \\u0111\\u00e3i h\\u1ea5p d\\u1eabn</div>
                <div style={{ fontSize: 11.5, color: '#9ab5cc', marginBottom: 10 }}>Nhi\\u1ec1u voucher v\\u00e0 combo si\\u00eau h\\u1ea5p d\\u1eabn</div>
                <button style={{ padding: '7px 16px', background: '#f4c04a', border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 11.5, color: '#0d1b2e', cursor: 'pointer' }}>XEM NGAY</button>
              </div>
              <div style={{ width: 48, height: 48, background: 'rgba(244,192,74,.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Gift size={24} color="#f4c04a" />
              </div>
            </div>

            <div style={{ background: '#0d1b2e', borderRadius: 14, padding: '14px 16px', color: '#f0f4f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: '#f4c04a', textTransform: 'uppercase' }}>Th\\u00e0nh vi\\u00ean Aurora</div>
                <Trophy size={17} color="#f4c04a" />
              </div>
              <div style={{ fontSize: 12, color: '#9ab5cc', marginBottom: 2 }}>H\\u1ea1ng <strong style={{ color: '#f4c04a' }}>GOLD</strong></div>
              <div style={{ fontSize: 11.5, color: '#9ab5cc', marginBottom: 8 }}>1.250 / 2.000 \\u0111i\\u1ec3m</div>
              <div style={{ height: 7, background: 'rgba(255,255,255,.12)', borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: '62.5%', height: '100%', background: 'linear-gradient(90deg,#f4c04a,#e8a020)', borderRadius: 99 }} />
              </div>
              <button style={{ width: '100%', padding: '8px 0', background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 8, color: '#f0f4f9', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                XEM CHI TI\\u1ebeT
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
                  <div style={{ fontSize: 11, color: '#9ab5cc' }}>Xin ch\\u00e0o! T\\u00f4i c\\u00f3 th\\u1ec3 h\\u1ed7 tr\\u1ee3 b\\u1ea1n:</div>
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
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} placeholder="Nh\\u1eadp c\\u00e2u h\\u1ecfi c\\u1ee7a b\\u1ea1n..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#c8d8e8', fontSize: 12, fontFamily: 'inherit' }} />
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Send size={14} color="#f4c04a" /></button>
              </div>
              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, background: 'none', border: 'none', color: '#7a8fa6', fontSize: 11.5, cursor: 'pointer', padding: '2px 0' }}>
                <ExternalLink size={12} />M\\u1edf chat \\u0111\\u1ea7y \\u0111\\u1ee7
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
    </div>
  );
}
`;

fs.writeFileSync('src/App.tsx', content, 'utf8');
console.log('Written', content.split('\\n').length, 'lines');
