import { FormEvent, useEffect, useState } from 'react';
import { BadgeCheck, Clock3, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import ShiftDashboard, { ShiftInfo } from './components/ShiftDashboard';
import PosSalesScreen from './components/PosSalesScreen';

type ViewMode = 'loading' | 'login' | 'dashboard' | 'sales';
export type PosUser = { id:number; username:string; full_name:string; role:string; theater_name?:string; counter_code?:string; counter_role_code?:string; counter_role_name?:string; capabilities?:{sell_tickets:boolean;sell_concessions:boolean;redeem_online_booking:boolean;sell_merchandise:boolean} };
type LoginResponse = { success: boolean; message?: string; data?: { user: PosUser; session: Record<string, unknown> } };

const API_URL = 'http://localhost/AURORA%20CINEMA/pos/backend/public/api.php';
const defaultShift: ShiftInfo = { cinemaName: 'Aurora Cinema', staffName: '', workDate: '', shiftTime: '', counter: '', initialCash: '0 VNĐ', status: 'Đang hoạt động' };

function formatCurrency(value: unknown) { return `${Number(value || 0).toLocaleString('vi-VN')} VNĐ`; }
function toShiftInfo(payload: Record<string, unknown>, user?: PosUser): ShiftInfo {
  return {
    cinemaName: String(payload.cinema_name || user?.theater_name || 'Aurora Cinema'), staffName: String(payload.staff_name || user?.full_name || ''),
    workDate: String(payload.work_date || new Date().toLocaleDateString('vi-VN')), shiftTime: String(payload.shift_time || ''),
    counter: String(payload.counter || user?.counter_code || ''), initialCash: formatCurrency(payload.initial_cash),
    status: payload.status === 'Tạm nghỉ' ? 'Tạm nghỉ' : 'Đang hoạt động',
  };
}

export default function App() {
  const [view, setView] = useState<ViewMode>('loading');
  const [user, setUser] = useState<PosUser | null>(null);
  const [shiftData, setShiftData] = useState<ShiftInfo>(defaultShift);
  const [username, setUsername] = useState(() => localStorage.getItem('aurora-pos-last-username') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberUsername, setRememberUsername] = useState(() => Boolean(localStorage.getItem('aurora-pos-last-username')));
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function refreshDashboard() {
    const response = await fetch(`${API_URL}?action=dashboard`, { credentials: 'include' });
    const result = await response.json();
    if (response.status === 401 || result.code === 'SHIFT_AUTHORIZATION_REQUIRED') {
      handleSessionExpired(result.message);
      throw new Error(result.message || 'Phiên làm việc không còn hiệu lực.');
    }
    if (!response.ok || !result.success) throw new Error(result.message || 'Không thể tải phiên làm việc.');
    const activeUser = result.data.user as PosUser;
    setUser(activeUser); setShiftData(toShiftInfo(result.data.shift as Record<string, unknown>, activeUser));
  }

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}?action=me`, { credentials: 'include' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('No session')))
      .then(async result => { if (!result.success) throw new Error('No session'); if (!alive) return; await refreshDashboard(); if (alive) setView('dashboard'); })
      .catch(() => { if (alive) setView('login'); });
    return () => { alive = false; };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const account = username.trim();
    if (!account || !password) { setErrorMsg('Vui lòng nhập tên đăng nhập và mật khẩu.'); return; }
    setIsSubmitting(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const response = await fetch(`${API_URL}?action=login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: account, password }) });
      const result: LoginResponse = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Đăng nhập không thành công.');
      if (rememberUsername) localStorage.setItem('aurora-pos-last-username', account); else localStorage.removeItem('aurora-pos-last-username');
      setUser(result.data.user); setShiftData(toShiftInfo(result.data.session, result.data.user)); setPassword(''); setView('dashboard');
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Không thể kết nối máy chủ POS.'); }
    finally { setIsSubmitting(false); }
  }

  async function handleLogout() { try { await fetch(`${API_URL}?action=logout`, { method: 'POST', credentials: 'include' }); } finally { setUser(null); setPassword(''); setView('login'); } }
  function handleSessionExpired(message?: string) {
    setUser(null); setPassword(''); setSuccessMsg('');
    setErrorMsg(message || 'Phiên làm việc đã kết thúc. Vui lòng liên hệ Admin Rạp hoặc Supervisor để mở phiên mới.');
    setView('login');
  }
  async function handleCloseShift() {
    const amount = Number(String(shiftData.initialCash).replace(/\D/g, '')) || 0;
    try {
      const response = await fetch(`${API_URL}?action=close_shift`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cash_at_close: amount }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.message || 'Không thể đóng ca.');
      await handleLogout(); setSuccessMsg('Ca làm việc đã được đóng và ghi nhận trong aurora_db.');
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Không thể đóng ca.'); setView('login'); }
  }

  if (view === 'loading') return <div className="pos-boot"><span className="pos-boot-mark">✦</span><strong>AURORA POS</strong><small>Đang kiểm tra phiên làm việc…</small></div>;
  if (view === 'sales') return <PosSalesScreen user={user||undefined} cinemaName={shiftData.cinemaName} staffName={shiftData.staffName} counter={shiftData.counter} onBackToDashboard={() => setView('dashboard')} onSessionExpired={handleSessionExpired} />;
  if (view === 'dashboard') return <ShiftDashboard shiftData={shiftData} onSalesClick={() => setView('sales')} onLogout={handleLogout} onCloseShift={handleCloseShift} onReload={() => refreshDashboard().catch(() => setErrorMsg('Không thể làm mới dữ liệu ca trực.'))} />;

  return <main className="pos-auth-shell">
    <div className="pos-auth-decoration" aria-hidden="true">✦</div>
    <section className="pos-login-card" aria-label="Đăng nhập hệ thống POS">
        <header className="pos-simple-brand">
          <span className="pos-auth-logo">✦</span>
          <span><strong>AURORA</strong><small>CINEMA · POS</small></span>
        </header>
        <div className="pos-login-heading">
          <span>HỆ THỐNG BÁN HÀNG</span>
          <h1>Đăng nhập POS</h1>
          <p>Nhập tài khoản nhân viên để bắt đầu ca làm việc.</p>
        </div>
        {successMsg && <div className="pos-login-alert success"><BadgeCheck size={18} />{successMsg}</div>}
        {errorMsg && <div className="pos-login-alert error"><span>!</span>{errorMsg}</div>}
        {errorMsg.includes('chưa có phiên')&&<div className="pos-shift-required"><Clock3 size={18}/><div><b>Chưa được cấp phiên làm việc</b><p>Sau khi kết phiên, tài khoản chỉ đăng nhập lại khi Admin Rạp hoặc Supervisor cùng rạp mở phiên mới.</p></div></div>}
        <form className="pos-auth-form" onSubmit={handleLogin}>
          <label htmlFor="pos-username">Tên đăng nhập</label>
          <div className="pos-auth-input"><UserRound size={18} /><input id="pos-username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" autoComplete="username" autoFocus required /></div>
          <label htmlFor="pos-password">Mật khẩu</label>
          <div className="pos-auth-input"><LockKeyhole size={18} /><input id="pos-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Nhập mật khẩu" autoComplete="current-password" required /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <label className="pos-auth-remember"><input type="checkbox" checked={rememberUsername} onChange={event => setRememberUsername(event.target.checked)} /> <span>Ghi nhớ tài khoản trên thiết bị này</span></label>
          <button className="pos-auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'ĐANG ĐĂNG NHẬP…' : <><LogIn size={18} /> ĐĂNG NHẬP</>}</button>
        </form>
        <footer className="pos-login-footer">
          <p><ShieldCheck size={14} /> Kết nối bảo mật · Dữ liệu được ghi nhận trong Aurora DB</p>
          <span>© 2026 Aurora Cinema</span>
        </footer>
    </section>
  </main>;
}
