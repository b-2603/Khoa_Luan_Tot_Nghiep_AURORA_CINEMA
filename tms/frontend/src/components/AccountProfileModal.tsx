import { FormEvent, useEffect, useState } from 'react';
import { Building2, CalendarDays, CheckCircle2, Clock3, Eye, EyeOff, KeyRound, Mail, MapPin, Phone, RefreshCw, Save, ShieldCheck, UserRound, X } from 'lucide-react';
import './AccountProfileModal.css';

export type AccountProfile = {
  id: number;
  username: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  theater_id: number;
  theater_name?: string;
  theater_address?: string;
  theater_city?: string;
  theater_phone?: string;
  total_screens?: number;
  theater_status?: string;
  scope_mode?: 'system' | 'theater';
  scope_name?: string;
  total_theaters?: number;
  last_login?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  role_info?: { name?: string; badge?: string; color?: string; description?: string } | null;
  source?: string;
};

type Props = {
  open: boolean;
  apiBase: string;
  onClose: () => void;
  onUpdated: (profile: AccountProfile) => void;
};

const dateTime = (value?: string | null) => {
  if (!value) return 'Chưa ghi nhận';
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString('vi-VN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit', year:'numeric' });
};

export default function AccountProfileModal({ open, apiBase, onClose, onUpdated }: Props) {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', current_password:'', new_password:'', confirm_password:'' });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const loadProfile = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      const response = await fetch(`${apiBase}?action=account-profile`, { credentials:'include' });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Không thể tải hồ sơ tài khoản.');
      const value = result.data as AccountProfile;
      setProfile(value);
      setForm({ full_name:value.full_name || '', email:value.email || '', phone:value.phone || '', current_password:'', new_password:'', confirm_password:'' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể tải hồ sơ từ aurora_db.');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) void loadProfile(); }, [open, apiBase]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, saving, onClose]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!form.full_name.trim()) { setError('Vui lòng nhập họ và tên.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setError('Email công việc không đúng định dạng.'); return; }
    if (form.phone && !/^(?:\+84|0)[0-9]{9,10}$/.test(form.phone.replace(/[\s.-]/g,''))) { setError('Số điện thoại không đúng định dạng.'); return; }
    if (form.new_password && form.new_password.length < 8) { setError('Mật khẩu mới phải có ít nhất 8 ký tự.'); return; }
    if (form.new_password !== form.confirm_password) { setError('Xác nhận mật khẩu mới không khớp.'); return; }
    setSaving(true);
    try {
      const response = await fetch(`${apiBase}?action=account-profile`, { method:'PUT', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ full_name:form.full_name.trim(), email:form.email.trim(), phone:form.phone.trim(), current_password:form.current_password, new_password:form.new_password }) });
      const result = await response.json();
      if (!response.ok || !result.success || !result.data) throw new Error(result.message || 'Không thể cập nhật hồ sơ.');
      const value = result.data as AccountProfile;
      setProfile(value); onUpdated(value);
      setForm(previous => ({ ...previous, full_name:value.full_name, email:value.email || '', phone:value.phone || '', current_password:'', new_password:'', confirm_password:'' }));
      setSuccess(result.message || 'Đã cập nhật hồ sơ trong aurora_db.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể cập nhật hồ sơ trong aurora_db.');
    } finally { setSaving(false); }
  };

  const roleName = profile?.role_info?.name || profile?.role || 'Tài khoản TMS';
  const initial = profile?.full_name?.trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() || 'A';

  return <div className="account-profile-backdrop" onMouseDown={event => { if (event.currentTarget === event.target && !saving) onClose(); }}>
    <section className="account-profile-modal" role="dialog" aria-modal="true" aria-labelledby="account-profile-title">
      <button className="account-profile-close" type="button" onClick={onClose} disabled={saving} aria-label="Đóng hồ sơ"><X size={19}/></button>
      {loading ? <div className="account-profile-loading"><RefreshCw className="spin"/><b>Đang tải hồ sơ tài khoản</b><span>Đồng bộ dữ liệu trực tiếp từ aurora_db…</span></div> : profile ? <>
        <header className="account-profile-hero">
          <div className="account-profile-avatar">{initial}</div>
          <div className="account-profile-identity"><span>HỒ SƠ TÀI KHOẢN TMS</span><h2 id="account-profile-title">{profile.full_name}</h2><p>@{profile.username} · {roleName}</p></div>
          <div className="account-profile-status"><span><i/>{profile.status === 'active' ? 'Đang hoạt động' : profile.status}</span></div>
        </header>

        <form id="account-profile-form" onSubmit={submit} className="account-profile-body">
          <aside className="account-profile-scope">
            <div className="account-profile-section-title"><span><ShieldCheck/></span><div><h3>Phạm vi truy cập</h3><p>Thông tin do hệ thống RBAC quản lý</p></div></div>
            <dl>
              <div><dt>Vai trò</dt><dd>{roleName}</dd></div>
              <div><dt>Phạm vi quản trị</dt><dd>{profile.scope_name || profile.theater_name || 'Toàn hệ thống Aurora Cinema'}</dd></div>
              {profile.theater_address && <div><dt><MapPin/>Địa chỉ</dt><dd>{profile.theater_address}{profile.theater_city ? `, ${profile.theater_city}` : ''}</dd></div>}
              {profile.theater_phone && <div><dt><Phone/>Điện thoại rạp</dt><dd>{profile.theater_phone}</dd></div>}
              {profile.scope_mode === 'system' ? <div><dt><Building2/>Quy mô toàn chuỗi</dt><dd>{profile.total_theaters || 0} cụm rạp · {profile.total_screens || 0} phòng chiếu</dd></div> : profile.theater_id > 0 && <div><dt><Building2/>Quy mô rạp</dt><dd>{profile.total_screens || 0} phòng chiếu · {profile.theater_status === 'active' ? 'Đang hoạt động' : profile.theater_status || 'Chưa xác định'}</dd></div>}
            </dl>
            <div className="account-profile-timeline"><p><Clock3/><span><b>Đăng nhập gần nhất</b><small>{dateTime(profile.last_login)}</small></span></p><p><CalendarDays/><span><b>Ngày cấp tài khoản</b><small>{dateTime(profile.created_at)}</small></span></p></div>
          </aside>

          <main className="account-profile-editor">
            <div className="account-profile-section-title"><span><UserRound/></span><div><h3>Thông tin cá nhân</h3><p>Cập nhật thông tin liên hệ của tài khoản</p></div></div>
            <div className="account-profile-grid">
              <label className="wide"><span>Họ và tên <em>*</em></span><div><UserRound/><input value={form.full_name} maxLength={120} onChange={event=>setForm({...form,full_name:event.target.value})}/></div></label>
              <label><span>Email công việc <em>*</em></span><div><Mail/><input type="email" value={form.email} maxLength={180} onChange={event=>setForm({...form,email:event.target.value})}/></div></label>
              <label><span>Số điện thoại</span><div><Phone/><input value={form.phone} maxLength={20} placeholder="0901234567" onChange={event=>setForm({...form,phone:event.target.value})}/></div></label>
              <label className="wide readonly"><span>Tên đăng nhập</span><div><KeyRound/><input value={profile.username} disabled/></div><small>Tên đăng nhập không thể tự thay đổi.</small></label>
            </div>

            <div className="account-profile-security-head"><div><KeyRound/><span><b>Đổi mật khẩu</b><small>Để trống nếu không muốn thay đổi</small></span></div><button type="button" onClick={()=>setShowPasswords(value=>!value)}>{showPasswords?<EyeOff/>:<Eye/>}{showPasswords?'Ẩn':'Hiện'}</button></div>
            <div className="account-profile-grid password-grid">
              <label className="wide"><span>Mật khẩu hiện tại</span><input type={showPasswords?'text':'password'} autoComplete="current-password" value={form.current_password} onChange={event=>setForm({...form,current_password:event.target.value})}/></label>
              <label><span>Mật khẩu mới</span><input type={showPasswords?'text':'password'} autoComplete="new-password" value={form.new_password} onChange={event=>setForm({...form,new_password:event.target.value})}/></label>
              <label><span>Xác nhận mật khẩu mới</span><input type={showPasswords?'text':'password'} autoComplete="new-password" value={form.confirm_password} onChange={event=>setForm({...form,confirm_password:event.target.value})}/></label>
            </div>
            {error && <div className="account-profile-message error">{error}</div>}
            {success && <div className="account-profile-message success"><CheckCircle2/>{success}</div>}
          </main>
        </form>
        <footer className="account-profile-footer" style={{justifyContent:'flex-end'}}><div style={{display:'flex',marginLeft:'auto'}}><button type="button" className="secondary" onClick={onClose} disabled={saving}>Đóng</button><button type="submit" form="account-profile-form" className="primary" disabled={saving}>{saving?<RefreshCw className="spin"/>:<Save/>}{saving?'Đang lưu…':'Lưu thay đổi'}</button></div></footer>
      </> : <div className="account-profile-loading error-state"><UserRound/><b>Không thể hiển thị hồ sơ</b><span>{error || 'Dữ liệu tài khoản không khả dụng.'}</span><button type="button" onClick={()=>void loadProfile()}><RefreshCw/>Thử lại</button></div>}
    </section>
  </div>;
}
