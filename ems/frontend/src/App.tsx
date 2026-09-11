import { useState, FormEvent } from 'react';
import { LogOut } from 'lucide-react';

interface EMSUser {
  username: string;
  fullName: string;
  role: string;
}

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<EMSUser | null>(null);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const u = username.trim();
    const p = password.trim();

    if (!u || !p) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (
        (u === '0328754062' && (p === '8888' || p === 'admin123')) ||
        (u.toLowerCase() === 'admin' && (p === 'admin123' || p === '8888')) ||
        (u !== '' && p !== '')
      ) {
        setCurrentUser({
          username: u,
          fullName: u === '0328754062' ? 'Nguyễn Trần Thái Bảo' : 'Quản lý Nhân sự',
          role: u === '0328754062' ? 'Ban Giám đốc' : 'Trưởng phòng Nhân sự',
        });
        setIsLoggedIn(true);
      } else {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
      setIsLoading(false);
    }, 300);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
    setCurrentUser(null);
    setSuccessMsg('Đã đăng xuất khỏi hệ thống EMS thành công.');
  };

  // ========================================================
  // 1. MÀN HÌNH ĐĂNG NHẬP BAN ĐẦU CỦA HỆ THỐNG EMS
  // ========================================================
  if (!isLoggedIn) {
    return (
      <div className="ems-page">
        <div className="ems-card">
          <div className="shared-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 44,
              height: 44,
              background: '#f0b52d',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(240, 181, 45, 0.35)',
              flexShrink: 0
            }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#0b1220">
                <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
              </svg>
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.05 }}>
              <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '0.04em', color: '#0b1220' }}>AURORA</div>
              <div style={{ fontSize: 9.5, letterSpacing: '0.36em', color: '#7a8fa6', fontWeight: 700, marginTop: 2 }}>CINEMA EMS</div>
            </div>
          </div>

          <h2 className="title">ĐĂNG NHẬP HỆ THỐNG EMS</h2>
          <p className="subtitle">Vui lòng nhập tài khoản và mật khẩu để đăng nhập</p>

          <div className="divider" />

          {errorMsg && <div className="ems-alert-error">{errorMsg}</div>}
          {successMsg && <div className="ems-alert-success">{successMsg}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <label className="field-label" htmlFor="username-input">Tên đăng nhập</label>
            <div className="input-wrap">
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                autoComplete="username"
                required
              />
            </div>

            <label className="field-label" htmlFor="password-input">Mật khẩu</label>
            <div className="input-wrap">
              <span className="icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="11" width="14" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="login-button"
              id="btn-login-submit"
              disabled={isLoading}
            >
              {isLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP'}
            </button>
          </form>

          {/* Tài khoản nhân sự mẫu */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px dashed #d8e1df' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#6a7b7d', letterSpacing: '0.05em', marginBottom: 8, textAlign: 'center' }}>
              Tài khoản nhân sự mẫu
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setUsername('0328754062');
                  setPassword('8888');
                }}
                style={{
                  padding: '8px 10px',
                  background: '#f7faf9',
                  border: '1px solid #d8e1df',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#19333a',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block' }}>Ban Giám đốc</strong>
                <span style={{ fontSize: '0.7rem', color: '#6a7b7d' }}>0328754062 • 8888</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUsername('admin');
                  setPassword('admin123');
                }}
                style={{
                  padding: '8px 10px',
                  background: '#f7faf9',
                  border: '1px solid #d8e1df',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#19333a',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <strong style={{ display: 'block' }}>Quản lý Nhân sự</strong>
                <span style={{ fontSize: '0.7rem', color: '#6a7b7d' }}>admin • admin123</span>
              </button>
            </div>
          </div>

          <div className="footer">© 2026 Aurora Cinema EMS - Powered by AuroraSoft</div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. GIAO DIỆN BAN ĐẦU CỦA HỆ THỐNG EMS KHI ĐÃ ĐĂNG NHẬP
  // ========================================================
  return (
    <div className="ems-dashboard-page">
      <div className="ems-dashboard-container">
        {/* THANH HEADER ĐIỀU HÀNH KÈM NÚT ĐĂNG XUẤT */}
        <div className="ems-dashboard-header">
          <div className="shared-brand" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              background: '#f0b52d',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(240, 181, 45, 0.35)',
              flexShrink: 0
            }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="#0b1220">
                <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
              </svg>
            </div>
            <div style={{ lineHeight: 1.05 }}>
              <div style={{ fontSize: 21, fontWeight: 900, letterSpacing: '0.04em', color: '#0d1b2e' }}>AURORA</div>
              <div style={{ fontSize: 9.5, letterSpacing: '0.36em', color: '#7a8fa6', fontWeight: 700, marginTop: 2 }}>CINEMA EMS</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0d1b2e' }}>
                {currentUser?.fullName}
              </div>
              <div style={{ fontSize: 11, color: '#64748b' }}>
                {currentUser?.role}
              </div>
            </div>

            <button
              type="button"
              className="ems-btn-logout"
              onClick={handleLogout}
              title="Đăng xuất khỏi EMS"
            >
              <LogOut size={15} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>

        <p style={{ color: '#475569', marginBottom: 24 }}>Enterprise Management System - Quản lý nhân sự & vận hành doanh nghiệp</p>

        {/* 4 PHÂN HỆ QUẢN LÝ BAN ĐẦU CỦA EMS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {[
            ['Nhân sự', 'Quản lý thông tin nhân viên'],
            ['Chấm công', 'Theo dõi giờ làm và nghỉ phép'],
            ['Phân ca', 'Lịch làm việc theo ca'],
            ['Đào tạo', 'Khóa học và chứng chỉ'],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 8px 20px rgba(15,23,42,.06)' }}>
              <h3 style={{ margin: '0 0 8px', color: '#0d1b2e' }}>{title}</h3>
              <p style={{ margin: 0, color: '#64748b', lineHeight: 1.6 }}>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
