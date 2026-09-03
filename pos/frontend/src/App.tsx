import { FormEvent } from 'react';

export default function App() {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log('POS login submitted');
  };

  return (
    <div className="pos-page">
      <div className="pos-card">
        <h1 className="brand">AURORA CINEMA POS</h1>

        <h2 className="title">ĐĂNG NHẬP HỆ THỐNG</h2>
        <p className="subtitle">Vui lòng nhập tài khoản và mật khẩu để đăng nhập</p>

        <div className="divider" />

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field-label">Tên đăng nhập</label>
          <div className="input-wrap">
            <span className="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21a8 8 0 0 0-16 0" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input type="text" placeholder="Nhập tên đăng nhập" />
          </div>

          <label className="field-label">Mật khẩu</label>
          <div className="input-wrap">
            <span className="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            </span>
            <input type="password" placeholder="Nhập mật khẩu" />
          </div>

          <button type="submit" className="login-button">ĐĂNG NHẬP</button>
        </form>

        <div className="footer">© 2026 Aurora Cinema POS - Powered by AuroraSoft</div>
      </div>
    </div>
  );
}
