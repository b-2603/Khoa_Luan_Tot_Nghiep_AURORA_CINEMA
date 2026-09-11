import { useState, FormEvent } from 'react';
import {
  User, Lock, Eye, EyeOff, Globe, ChevronDown, Clapperboard,
  ShieldCheck, TrendingUp, Users, LogOut, Bell, BarChart3,
  Building2, CalendarDays, Film, Home, Menu, Package,
  Receipt, Settings, Tag, Ticket, UserRound, X, FileText
} from 'lucide-react';

interface TMSUser {
  id?: number;
  username: string;
  full_name: string;
  role: string;
  phone?: string;
}

const nav = [
  { name: 'Tổng quan', icon: Home },
  { name: 'Phim', icon: Film, children: ['Danh sách phim', 'Thêm phim mới', 'Phim đang chiếu'] },
  { name: 'Suất chiếu', icon: CalendarDays, children: ['Lịch suất chiếu', 'Tạo suất chiếu', 'Khóa suất chiếu'] },
  { name: 'Rạp & Phòng chiếu', icon: Building2, children: ['Danh sách phòng', 'Sơ đồ ghế', 'Trạng thái thiết bị'] },
  { name: 'Loại vé & Giá vé', icon: Tag, children: ['Danh sách loại vé', 'Thiết lập giá vé', 'Giá theo khung giờ'] },
  { name: 'Hàng hóa', icon: Package, children: ['Danh mục hàng hóa', 'Tồn kho', 'Nhập xuất kho'] },
  { name: 'Voucher / Khuyến mãi', icon: Ticket, children: ['Danh sách voucher', 'Tạo voucher', 'Lịch sử sử dụng'] },
  { name: 'Khách hàng', icon: UserRound, children: ['Danh sách khách hàng', 'Thành viên', 'Lịch sử giao dịch'] },
  { name: 'Nhân viên', icon: Users, children: ['Tài khoản nhân viên', 'Phân quyền', 'Ca làm việc'] },
  { name: 'Giao dịch', icon: Receipt, children: ['Danh sách giao dịch', 'Tra cứu giao dịch', 'Yêu cầu hoàn tiền'] },
  { name: 'Báo cáo', icon: BarChart3, children: ['Doanh thu', 'Hiệu suất suất chiếu', 'Đối soát dữ liệu'] },
  { name: 'Cài đặt hệ thống', icon: Settings }
] as const;

const movieData = [
  ['Lật Mặt 7: Một Điều Ước', '18.250.000 đ', '128 suất chiếu', 'poster-one'],
  ['Doraemon: Nobita Và Cuộc Phiêu Lưu', '9.850.000 đ', '96 suất chiếu', 'poster-two'],
  ['Avengers: Secret Wars', '6.720.000 đ', '72 suất chiếu', 'poster-three'],
  ['Fast & Furious 11', '4.980.000 đ', '56 suất chiếu', 'poster-four'],
  ['Nhà Gia Tiền', '3.210.000 đ', '40 suất chiếu', 'poster-five']
];

const alerts = [
  ['red', 'Suất chiếu “Lật Mặt 7” lúc 19:30 tại Phòng 3 sắp hết vé.', '5 phút trước'],
  ['blue', 'Doanh thu ngày 02/06/2026 tăng 10.2% so với ngày trước đó.', '30 phút trước'],
  ['green', 'Phim “Nhà Gia Tiền” sẽ ra mắt vào ngày 07/06/2026.', '2 giờ trước'],
  ['orange', 'Có 3 yêu cầu đổi/hoàn vé cần xử lý.', '3 giờ trước']
];

const sales = [28.5, 32.7, 30.1, 42.8, 38.6, 40.2, 45.2];

export default function App() {
  // Trạng thái đăng nhập ban đầu: Luôn bắt đầu ở giao diện đăng nhập ban đầu
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState<TMSUser | null>(null);

  // Trạng thái Dashboard TMS
  const [active, setActive] = useState('Tổng quan');
  const [expanded, setExpanded] = useState('');
  const [open, setOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [period, setPeriod] = useState('Hôm nay');

  const API_BASE = 'http://localhost/AURORA%20CINEMA/tms/backend/public/api.php';

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const inputUser = username.trim();
    const inputPass = password.trim();

    if (!inputUser || !inputPass) {
      setErrorMsg(language === 'vi' ? 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' : 'Please enter your username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}?action=login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: inputUser,
          password: inputPass,
        }),
      });

      const result = await response.json();

      if (result.success && result.data?.user) {
        const u = result.data.user;
        setCurrentUser({
          id: u.id,
          username: u.username,
          full_name: u.full_name || 'Nguyễn Trần Thái Bảo',
          role: u.role === 'director' ? 'Ban Giám đốc' : 'Quản trị hệ thống',
          phone: u.phone
        });
        setIsLoggedIn(true);
      } else {
        setErrorMsg(result.message || (language === 'vi' ? 'Tên đăng nhập hoặc mật khẩu không chính xác.' : 'Invalid credentials.'));
      }
    } catch {
      // Fallback khi offline
      if (
        (inputUser === '0328754062' && (inputPass === '8888' || inputPass === 'admin123')) ||
        (inputUser.toLowerCase() === 'admin' && (inputPass === 'admin123' || inputPass === '8888'))
      ) {
        setCurrentUser({
          id: 1,
          username: inputUser,
          full_name: 'Nguyễn Trần Thái Bảo',
          role: inputUser === '0328754062' ? 'Ban Giám đốc' : 'Quản trị hệ thống',
          phone: '0328754062'
        });
        setIsLoggedIn(true);
      } else {
        setErrorMsg(language === 'vi' ? 'Tên đăng nhập hoặc mật khẩu không chính xác.' : 'Invalid credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}?action=logout`);
    } catch {
      // Bỏ qua nếu lỗi mạng
    }
    setIsLoggedIn(false);
    setPassword('');
    setCurrentUser(null);
    setUserDropdownOpen(false);
  };

  // ========================================================
  // 1. GIAO DIỆN ĐĂNG NHẬP BAN ĐẦU CỦA HỆ THỐNG TMS
  // (Đúng chuẩn trang ban đầu ban đầu của hệ thống TMS)
  // ========================================================
  if (!isLoggedIn) {
    return (
      <div className="tms-page-container">
        {/* Nút chọn ngôn ngữ ở góc trên bên phải */}
        <div className="tms-language-picker">
          <button
            type="button"
            className="tms-lang-btn"
            onClick={() => setShowLangMenu(!showLangMenu)}
            aria-label="Chọn ngôn ngữ"
          >
            <Globe size={18} />
            <span>{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
            <ChevronDown size={15} />
          </button>

          {showLangMenu && (
            <div className="tms-lang-dropdown">
              <div
                className={`tms-lang-item ${language === 'vi' ? 'active' : ''}`}
                onClick={() => { setLanguage('vi'); setShowLangMenu(false); }}
              >
                🇻🇳 Tiếng Việt
              </div>
              <div
                className={`tms-lang-item ${language === 'en' ? 'active' : ''}`}
                onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
              >
                🇺🇸 English
              </div>
            </div>
          )}
        </div>

        {/* Khối Split Screen chính */}
        <div className="tms-split-layout">
          {/* CỘT TRÁI: Hero Branding & Cinema Ambience */}
          <div className="tms-hero-panel">
            <div className="tms-hero-overlay" />

            <div className="tms-hero-content">
              {/* Logo Thương hiệu Aurora Cinema chuẩn nhận diện hệ thống */}
              <div className="tms-brand-header">
                <div style={{
                  width: 72,
                  height: 72,
                  background: '#f0b52d',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(240, 181, 45, 0.4)',
                  marginBottom: 16
                }}>
                  <svg viewBox="0 0 24 24" width="40" height="40" fill="#0b1220">
                    <path d="M12 2l2.8 6.5 7 .6-5.3 4.7 1.6 6.9-6.1-3.6-6.1 3.6 1.6-6.9-5.3-4.7 7-.6z" />
                  </svg>
                </div>

                <h1 className="tms-brand-name">AURORA</h1>
                <div className="tms-brand-sub">C I N E M A</div>

                <div className="tms-system-divider">
                  <span className="tms-div-line" />
                  <span className="tms-system-tag">TMS</span>
                  <span className="tms-div-line" />
                </div>

                <div className="tms-system-fullname">THEATER MANAGEMENT SYSTEM</div>
                <div className="tms-star-icon">★</div>
              </div>

              {/* 3 Tính năng nổi bật phía dưới */}
              <div className="tms-feature-list">
                <div className="tms-feature-item">
                  <div className="tms-feat-icon-box">
                    <ShieldCheck size={22} className="gold-icon" />
                  </div>
                  <div className="tms-feat-text">
                    <div className="tms-feat-title">Quản lý rạp chiếu</div>
                    <div className="tms-feat-desc">Vận hành hiệu quả</div>
                  </div>
                </div>

                <div className="tms-feature-item">
                  <div className="tms-feat-icon-box">
                    <TrendingUp size={22} className="gold-icon" />
                  </div>
                  <div className="tms-feat-text">
                    <div className="tms-feat-title">Báo cáo doanh thu</div>
                    <div className="tms-feat-desc">Theo dõi tức thời</div>
                  </div>
                </div>

                <div className="tms-feature-item">
                  <div className="tms-feat-icon-box">
                    <Users size={22} className="gold-icon" />
                  </div>
                  <div className="tms-feat-text">
                    <div className="tms-feat-title">Quản lý nhân sự</div>
                    <div className="tms-feat-desc">Lịch làm việc, chấm công</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Form Đăng nhập TMS ban đầu */}
          <div className="tms-form-panel">
            <div className="tms-form-container">
              {/* Icon Clapperboard trên đỉnh Card */}
              <div className="tms-form-badge">
                <div className="tms-badge-circle">
                  <Clapperboard size={26} color="#e5a93c" />
                </div>
              </div>

              {/* Tiêu đề form */}
              <h2 className="tms-login-title">Đăng nhập hệ thống</h2>
              <p className="tms-login-subtitle">Theater Management System</p>

              {errorMsg && (
                <div className="tms-alert-error">{errorMsg}</div>
              )}

              {/* Form input */}
              <form onSubmit={handleLogin} className="tms-auth-form">
                {/* Ô Tên đăng nhập */}
                <div className="tms-input-field">
                  <span className="tms-input-icon">
                    <User size={19} />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Tên đăng nhập"
                    autoComplete="username"
                    required
                  />
                </div>

                {/* Ô Mật khẩu */}
                <div className="tms-input-field">
                  <span className="tms-input-icon">
                    <Lock size={19} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="tms-toggle-pwd"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Ẩn hiện mật khẩu"
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>

                {/* Tùy chọn: Ghi nhớ đăng nhập */}
                <div className="tms-form-options">
                  <label className="tms-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Ghi nhớ đăng nhập</span>
                  </label>
                </div>

                {/* Nút Đăng nhập chính */}
                <button
                  type="submit"
                  className="tms-submit-btn"
                  disabled={isLoading}
                >
                  {isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'}
                </button>
              </form>
            </div>

            {/* Dòng Copyright phía dưới */}
            <footer className="tms-footer">
              © 2026 Aurora Cinema. All rights reserved.
            </footer>
          </div>
        </div>
      </div>
    );
  }

  // ========================================================
  // 2. GIAO DIỆN BẢNG ĐIỀU KHIỂN TMS KHI ĐÃ ĐĂNG NHẬP
  // ========================================================
  const displayName = currentUser?.full_name || 'Nguyễn Trần Thái Bảo';
  const displayRole = currentUser?.role || 'Ban Giám đốc';
  const displayInitials = displayName.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase() || 'AD';

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="logo-image" role="img" aria-label="Aurora Cinema" />
          <button className="close-sidebar" onClick={() => setOpen(false)}><X /></button>
        </div>
        <div className="system-title">
          <b>TMS</b>
          <span>Theater Management System</span>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            const hasChildren = 'children' in item;
            const isExpanded = expanded === item.name;
            return (
              <div className="nav-section" key={item.name}>
                <button
                  className={active === item.name ? 'nav-active' : ''}
                  onClick={() => {
                    setActive(item.name);
                    setExpanded(hasChildren ? (isExpanded ? '' : item.name) : '');
                    if (!hasChildren) setOpen(false);
                  }}
                >
                  <Icon size={19} />
                  <span>{item.name}</span>
                  {hasChildren && <ChevronDown className={`nav-chevron ${isExpanded ? 'rotated' : ''}`} size={15} />}
                </button>
                {hasChildren && isExpanded && (
                  <div className="subnav">
                    {item.children.map((child) => (
                      <button
                        key={child}
                        className={active === child ? 'sub-active' : ''}
                        onClick={() => {
                          setActive(child);
                          setOpen(false);
                        }}
                      >
                        {child}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="open-sidebar" onClick={() => setOpen(true)}><Menu size={23} /></button>
          <div className="topbar-spacer" />
          <div className="topbar-actions">
            <div className="notification">
              <button onClick={() => setNoticeOpen(!noticeOpen)}>
                <Bell size={23} />
                <b>5</b>
              </button>
              {noticeOpen && <div className="notification-pop">Bạn có 5 thông báo mới</div>}
            </div>

            {/* MENU THÔNG TIN TÀI KHOẢN TRÊN TOPBAR */}
            <div className="topbar-user-wrap">
              <button
                type="button"
                className="topbar-user-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <div className="hello">
                  Xin chào,
                  <strong>{displayName}</strong>
                </div>
                <ChevronDown size={15} />
                <div className="user-icon"><UserRound size={20} /></div>
              </button>

              {userDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <b>{displayName}</b>
                    <span>{displayRole} • @{currentUser?.username || 'admin'}</span>
                  </div>
                  <button
                    type="button"
                    className="user-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="content">
          <div className="heading">
            <div>
              <h1>{active === 'Tổng quan' ? 'Tổng quan' : active}</h1>
              <div className="crumb">
                <span>Trang chủ</span>
                <b>›</b>
                <strong>{active}</strong>
              </div>
            </div>
            <div className="filters">
              <button><CalendarDays size={17} />03/06/2026</button>
              <button onClick={() => setPeriod(period === 'Hôm nay' ? 'Tuần này' : 'Hôm nay')}>
                {period}
                <ChevronDown size={15} />
              </button>
            </div>
          </div>

          <Stats />
          <Charts sales={sales} />
          <Bottom movies={movieData} alerts={alerts} />

          <footer>
            © 2026 Aurora Cinema. All rights reserved.
            <span>Phiên bản 1.0.0</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function Stats() {
  const items = [
    ['blue', Ticket, 'Doanh thu hôm nay', '45.250.000 đ', '+12.5%'],
    ['green', Receipt, 'Giao dịch hôm nay', '356', '+8.7%'],
    ['purple', Users, 'Lượt khách hôm nay', '1.248', '+10.3%'],
    ['orange', Clapperboard, 'Suất chiếu hôm nay', '48', '+4 suất']
  ] as const;
  return (
    <section className="stats-grid">
      {items.map(([color, Icon, label, value, change]) => (
        <div className="stat-card" key={label}>
          <div className={`stat-icon ${color}`}><Icon size={25} /></div>
          <div>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{change} <em>so với hôm qua</em></small>
          </div>
        </div>
      ))}
    </section>
  );
}

function Title({ title, subtitle, action }: { title: string; subtitle?: string; action?: string }) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <span>{subtitle}</span>}
      </div>
      {action && <button>{action}<ChevronDown size={14} /></button>}
    </div>
  );
}

function Charts({ sales }: { sales: number[] }) {
  return (
    <section className="charts-grid">
      <div className="card revenue-card">
        <Title title="Doanh thu 7 ngày qua" subtitle="(đơn vị: VNĐ)" action="7 ngày qua" />
        <div className="line-chart">
          <div className="y-axis">
            <span>60M</span><span>45M</span><span>30M</span><span>15M</span><span>0</span>
          </div>
          <div className="chart-body">
            <div className="grid-lines">{[1, 2, 3, 4, 5].map((line) => <i key={line} />)}</div>
            <svg viewBox="0 0 700 180" preserveAspectRatio="none">
              <path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64 L650 180 L20 180Z" fill="#2774e926" />
              <path d="M20 130 L130 108 L230 117 L330 73 L430 88 L530 78 L650 64" fill="none" stroke="#1d6beb" strokeWidth="2.5" />
            </svg>
            <div className="chart-points">
              {sales.map((value, index) => (
                <div className="point" style={{ left: `${3 + index * 16.5}%`, top: `${66 - (value - 28) * 3.1}%` }} key={value}>
                  <b>{value}M</b>
                  <i />
                  <span>{['28/05', '29/05', '30/05', '31/05', '01/06', '02/06', '03/06'][index]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="card channel-card">
        <Title title="Doanh thu theo kênh bán" />
        <div className="channel-content">
          <div className="donut">
            <strong>45.250.000 đ</strong>
            <span>Tổng doanh thu</span>
          </div>
          <div className="channel-list">
            <Channel color="blue" label="Quầy vé (POS)" percent="52.1%" value="23.610.000 đ" />
            <Channel color="green" label="Website/App" percent="36.4%" value="16.480.000 đ" />
            <Channel color="orange" label="Đối tác (OTA)" percent="11.5%" value="5.160.000 đ" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Channel({ color, label, percent, value }: { color: string; label: string; percent: string; value: string }) {
  return (
    <div className="channel-row">
      <i className={`bullet ${color}`} />
      <span>{label}</span>
      <strong>{percent}<small>{value}</small></strong>
    </div>
  );
}

function Bottom({ movies, alerts }: { movies: readonly (readonly string[])[]; alerts: readonly (readonly string[])[] }) {
  return (
    <section className="bottom-grid">
      <div className="card movie-card">
        <Title title="Top phim doanh thu cao nhất" />
        <div className="movie-list">
          {movies.map((movie, index) => (
            <div className="movie-row" key={movie[0]}>
              <span className="rank">{index + 1}</span>
              <div className={`poster ${movie[3]}`}><Film size={15} /></div>
              <b>{movie[0]}</b>
              <div className="movie-revenue">
                <strong>{movie[1]}</strong>
                <span>{movie[2]}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card schedule-card">
        <Title title="Tình trạng suất chiếu hôm nay" />
        <div className="schedule-content">
          <div className="schedule-legend">
            <Legend color="gray" label="Đã chiếu" value="12" percent="25.0%" />
            <Legend color="green" label="Đang chiếu" value="8" percent="16.7%" />
            <Legend color="blue" label="Sắp chiếu" value="14" percent="29.2%" />
            <Legend color="orange" label="Chưa chiếu" value="14" percent="29.2%" />
          </div>
          <div className="schedule-donut">
            <strong>48</strong>
            <span>Tổng suất</span>
          </div>
        </div>
      </div>
      <div className="card notice-card">
        <Title title="Thông báo" />
        <div className="notice-list">
          {alerts.map(([color, text, time]) => (
            <div className="notice-row" key={text}>
              <div className={`notice-icon ${color}`}><FileText size={15} /></div>
              <b>{text}</b>
              <span>{time}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Legend({ color, label, value, percent }: { color: string; label: string; value: string; percent: string }) {
  return (
    <div>
      <i className={`bullet ${color}`} />
      <span>{label}</span>
      <b>{value}</b>
      <small>{percent}</small>
    </div>
  );
}
