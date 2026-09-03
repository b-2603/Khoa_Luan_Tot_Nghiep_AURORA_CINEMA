import { useState, useEffect, FormEvent } from 'react';
import ShiftDashboard, { ShiftInfo } from './components/ShiftDashboard';
import PosSalesScreen from './components/PosSalesScreen';

type ViewMode = 'login' | 'dashboard' | 'sales';

export default function App() {
  const [view, setView] = useState<ViewMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shiftData, setShiftData] = useState<ShiftInfo>({
    cinemaName: 'AURORA CINEMA',
    staffName: 'Nguyễn Trần Thái Bảo',
    workDate: '03/06/2026',
    shiftTime: '00:00:00 - 23:59:59',
    counter: 'AURORA BOX 02',
    initialCash: '500.000 VNĐ',
    status: 'Tạm nghỉ',
  });

  // Tự động kiểm tra trạng thái phiên làm việc khi tải trang
  useEffect(() => {
    const savedUser = localStorage.getItem('pos_user_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed.isLoggedIn) {
          setShiftData((prev) => ({
            ...prev,
            staffName: parsed.fullName || prev.staffName,
            counter: parsed.counter || prev.counter,
          }));
          setView('dashboard');
        }
      } catch {
        // Bỏ qua nếu parse lỗi
      }
    }
  }, []);

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Gửi request đăng nhập tới API Backend PHP POS
      const apiUrl = 'http://localhost/AURORA%20CINEMA/pos/backend/public/api.php?action=login';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: inputUser,
          password: inputPass,
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Đăng nhập thành công từ Database MySQL
        const userData = result.data.user;
        const sessionData = result.data.session;

        const newShift: ShiftInfo = {
          cinemaName: sessionData?.cinema_name || 'AURORA CINEMA',
          staffName: userData?.full_name || 'Nguyễn Trần Thái Bảo',
          workDate: sessionData?.work_date || new Date().toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          shiftTime: sessionData?.shift_time || '00:00:00 - 23:59:59',
          counter: sessionData?.counter || 'AURORA BOX 02',
          initialCash: sessionData?.initial_cash ? `${Number(sessionData.initial_cash).toLocaleString('vi-VN')} VNĐ` : '500.000 VNĐ',
          status: 'Tạm nghỉ',
        };

        setShiftData(newShift);

        localStorage.setItem(
          'pos_user_session',
          JSON.stringify({
            isLoggedIn: true,
            username: userData.username,
            fullName: userData.full_name,
            counter: newShift.counter,
          })
        );

        setView('dashboard');
        return;
      } else {
        setErrorMsg(result.message || 'Tên đăng nhập hoặc mật khẩu không chính xác.');
      }
    } catch {
      // 2. Fallback nếu Apache/PHP WAMP chưa bật hoặc đang dev độc lập
      const isMatched = 
        (inputUser === '0328754062' && inputPass === '8888') ||
        (inputUser.toLowerCase() === 'admin' && inputPass === 'admin123');

      if (!isMatched) {
        setErrorMsg('Tên đăng nhập hoặc mật khẩu không chính xác.');
      } else {
        const displayName = 'Nguyễn Trần Thái Bảo';
        const newShift: ShiftInfo = {
          ...shiftData,
          staffName: displayName,
          workDate: new Date().toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          status: 'Tạm nghỉ',
        };

        setShiftData(newShift);

        localStorage.setItem(
          'pos_user_session',
          JSON.stringify({
            isLoggedIn: true,
            username: inputUser,
            fullName: displayName,
            counter: newShift.counter,
          })
        );

        setView('dashboard');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('pos_user_session');
    setPassword('');
    setView('login');
  };

  const handleCloseShift = () => {
    localStorage.removeItem('pos_user_session');
    setPassword('');
    setSuccessMsg('Phiên làm việc đã được đóng và kết thúc thành công.');
    setView('login');
  };

  const handleSalesClick = () => {
    setView('sales');
  };

  const handleBackToDashboard = () => {
    setView('dashboard');
  };

  // 1. Màn hình Bán hàng
  if (view === 'sales') {
    return (
      <PosSalesScreen
        cinemaName={shiftData.cinemaName}
        staffName={shiftData.staffName}
        counter={shiftData.counter}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // 2. Màn hình Dashboard Ca làm việc (Hiển thị sau khi đăng nhập đúng theo ảnh yêu cầu)
  if (view === 'dashboard') {
    return (
      <ShiftDashboard
        shiftData={shiftData}
        onSalesClick={handleSalesClick}
        onLogout={handleLogout}
        onCloseShift={handleCloseShift}
        onReload={() => {
          // Làm mới thời gian / dữ liệu
          setShiftData((prev) => ({
            ...prev,
            workDate: new Date().toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }),
          }));
        }}
      />
    );
  }

  // 3. Màn hình Đăng nhập POS
  return (
    <div className="pos-page">
      <div className="pos-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
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
            <div style={{ fontSize: 9.5, letterSpacing: '0.36em', color: '#7a8fa6', fontWeight: 700, marginTop: 2 }}>CINEMA</div>
          </div>
        </div>

        <h2 className="title">ĐĂNG NHẬP HỆ THỐNG POS</h2>
        <p className="subtitle">Vui lòng nhập tài khoản và mật khẩu để đăng nhập</p>

        <div className="divider" />

        {errorMsg && <div className="pos-login-error">{errorMsg}</div>}
        {successMsg && <div className="pos-login-success">{successMsg}</div>}

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

        <div className="footer">© 2026 Aurora Cinema POS - Powered by AuroraSoft</div>
      </div>
    </div>
  );
}
