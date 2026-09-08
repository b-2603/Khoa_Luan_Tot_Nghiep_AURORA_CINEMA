import { useState, useEffect, FormEvent } from 'react';
import {
  User, Mail, Phone, CreditCard, Calendar, MapPin,
  Lock, Eye, EyeOff, Check, AlertCircle, ChevronRight,
  Star, Ticket, Gift, Shield, Edit3, Save, X, Clock3, ReceiptText,
  CheckCircle, Tag, Sparkles
} from 'lucide-react';

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api.php';

type Profile = {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  idNumber: string | null;
  birthday: string | null;
  gender: string | null;
  city: string | null;
  district: string | null;
  address: string | null;
  membershipLevel: string;
  points: number;
  createdAt: string | null;
};

type AccountPageProps = {
  authUser: { fullName: string; email: string } | null;
  onUserUpdate?: (user: { fullName: string; email: string }) => void;
  initialTab?: string;
};

const TABS = [
  { id: 'info',    label: 'THÔNG TIN TÀI KHOẢN', icon: User   },
  { id: 'member', label: 'THẺ THÀNH VIÊN',        icon: Star   },
  { id: 'history',label: 'LỊCH SỬ ĐẶT VÉ',       icon: Ticket },
  { id: 'points', label: 'ĐIỂM THƯỞNG',            icon: Gift   },
  { id: 'voucher',label: 'VOUCHER CỦA TÔI',        icon: Shield },
];

const MEMBERSHIP_CONFIG: Record<string, { label: string; color: string; next?: string; nextPoints: number }> = {
  STANDARD: { label: 'Thành Viên', color: '#64748b', next: 'SILVER',   nextPoints: 500  },
  SILVER:   { label: 'Bạc',        color: '#94a3b8', next: 'GOLD',     nextPoints: 2000 },
  GOLD:     { label: 'Vàng',       color: '#f4c04a', next: 'PLATINUM', nextPoints: 5000 },
  PLATINUM: { label: 'Bạch Kim',   color: '#e2e8f0', next: undefined,  nextPoints: 9999 },
};

const VN_CITIES = [
  'Hà Nội','TP. Hồ Chí Minh','Đà Nẵng','Cần Thơ','Hải Phòng',
  'Bình Dương','Đồng Nai','Khánh Hòa','Thừa Thiên Huế','Quảng Nam',
  'An Giang','Bà Rịa - Vũng Tàu','Bắc Giang','Bắc Kạn','Bạc Liêu',
  'Bắc Ninh','Bến Tre','Bình Định','Bình Phước','Bình Thuận',
  'Cà Mau','Cao Bằng','Đắk Lắk','Đắk Nông','Điện Biên','Đồng Tháp',
  'Gia Lai','Hà Giang','Hà Nam','Hà Tĩnh','Hải Dương','Hậu Giang',
  'Hòa Bình','Hưng Yên','Kiên Giang','Kon Tum','Lai Châu','Lạng Sơn',
  'Lào Cai','Lâm Đồng','Long An','Nam Định','Nghệ An','Ninh Bình',
  'Ninh Thuận','Phú Thọ','Phú Yên','Quảng Bình','Quảng Ngãi',
  'Quảng Ninh','Quảng Trị','Sóc Trăng','Sơn La','Tây Ninh',
  'Thái Bình','Thái Nguyên','Thanh Hóa','Tiền Giang','Trà Vinh',
  'Tuyên Quang','Vĩnh Long','Vĩnh Phúc','Yên Bái',
];

function InputField({
  label, value, onChange, type = 'text', placeholder = '', required = false,
  icon: Icon, disabled = false, hint
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
  icon?: any; disabled?: boolean; hint?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#4a637a', letterSpacing: 0.3 }}>
        {required && <span style={{ color: '#e74c3c', marginRight: 2 }}>*</span>}
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {Icon && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
            <Icon size={14} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: Icon ? '10px 12px 10px 36px' : '10px 12px',
            border: '1.5px solid #d5dee9', borderRadius: 10, fontSize: 13.5,
            background: disabled ? '#f8fafd' : '#fff',
            color: disabled ? '#64748b' : '#1a2332',
            outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#f4c04a'; e.target.style.boxShadow = '0 0 0 3px rgba(244,192,74,0.15)'; }}
          onBlur={e => { e.target.style.borderColor = '#d5dee9'; e.target.style.boxShadow = 'none'; }}
        />
      </div>
      {hint && <span style={{ fontSize: 11, color: '#94a3b8' }}>{hint}</span>}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function AccountPage({ authUser, onUserUpdate, initialTab = 'info' }: AccountPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [birthday, setBirthday] = useState('');
  const [gender, setGender] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // UI feedback
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_URL}?action=profile`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          const p = data.profile as Profile;
          setProfile(p);
          setFullName(p.fullName || '');
          setPhone(p.phone || '');
          setIdNumber(p.idNumber || '');
          setBirthday(p.birthday || '');
          setGender(p.gender || '');
          setCity(p.city || '');
          setDistrict(p.district || '');
          setAddress(p.address || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'history') return;
    setBookingsLoading(true);
    fetch(`${API_URL}?action=booking_history`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(data => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [activeTab]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setSuccessMsg(''); setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}?action=profile_update`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone, idNumber, birthday, gender, city, district, address }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.message || 'Không thể cập nhật.'); return; }
      setSuccessMsg('Cập nhật thông tin thành công!');
      if (data.user && onUserUpdate) onUserUpdate(data.user);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch { setErrorMsg('Không thể kết nối máy chủ.'); }
    finally { setSaving(false); }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { setPwdError('Mật khẩu mới không khớp.'); return; }
    if (newPassword.length < 6) { setPwdError('Mật khẩu mới cần ít nhất 6 ký tự.'); return; }
    setSavingPwd(true); setPwdError(''); setPwdSuccess('');
    try {
      const res = await fetch(`${API_URL}?action=change_password`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(data.message || 'Đổi mật khẩu thất bại.'); return; }
      setPwdSuccess('Đổi mật khẩu thành công!');
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPwdSuccess(''), 4000);
    } catch { setPwdError('Không thể kết nối máy chủ.'); }
    finally { setSavingPwd(false); }
  }

  const memberLevel = profile?.membershipLevel || 'STANDARD';
  const memberCfg = MEMBERSHIP_CONFIG[memberLevel] || MEMBERSHIP_CONFIG.STANDARD;
  const avatarLetter = (authUser?.fullName || fullName || 'A').charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f0f4f8 0%,#eef0f4 100%)', fontFamily: "'Segoe UI','Inter',sans-serif" }}>

      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg,#0d1b2e 0%,#1a3050 100%)', padding: '32px 20px 56px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(244,192,74,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(244,192,74,0.05)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#f4c04a 0%,#e8a020 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#0d1b2e',
            border: '3px solid rgba(244,192,74,0.4)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', flexShrink: 0
          }}>
            {avatarLetter}
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4 }}>
              {authUser?.fullName || fullName || 'Người dùng'}
            </div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{authUser?.email}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
                background: `linear-gradient(135deg,${memberCfg.color},${memberCfg.color}cc)`,
                color: memberLevel === 'PLATINUM' ? '#0d1b2e' : '#fff', letterSpacing: 0.5
              }}>⭐ {memberCfg.label.toUpperCase()}</span>
              <span style={{ fontSize: 12, color: '#f4c04a', fontWeight: 700 }}>{profile?.points || 0} điểm</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div style={{ maxWidth: 1100, margin: '-28px auto 0', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e8edf4', overflowX: 'auto' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex: 1, minWidth: 120, padding: '16px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 11.5, fontWeight: active ? 800 : 600, letterSpacing: 0.5,
                  color: active ? '#0d1b2e' : '#6b7f94',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: active ? '3px solid #f4c04a' : '3px solid transparent',
                  transition: 'all 0.2s', whiteSpace: 'nowrap'
                }}>
                  <Icon size={14} />{tab.label}
                </button>
              );
            })}
          </div>

          {/* ── TAB: THÔNG TIN TÀI KHOẢN ── */}
          {activeTab === 'info' && (
            <div style={{ padding: 32 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>Đang tải thông tin...
                </div>
              ) : (
                <form onSubmit={handleSave}>
                  {successMsg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#166534', fontSize: 13.5, fontWeight: 600 }}>
                      <Check size={16} />{successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#991b1b', fontSize: 13.5, fontWeight: 600 }}>
                      <AlertCircle size={16} />{errorMsg}
                    </div>
                  )}

                  {/* Section: Cá nhân */}
                  <SectionTitle>THÔNG TIN CÁ NHÂN</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                    <InputField label="Họ và tên" value={fullName} onChange={setFullName} required icon={User} placeholder="Nguyễn Văn A" />
                    <InputField label="Email" value={authUser?.email || ''} onChange={() => {}} disabled icon={Mail} hint="Email không thể thay đổi" />
                    <InputField label="Số điện thoại" value={phone} onChange={setPhone} icon={Phone} placeholder="0901 234 567" type="tel" />
                    <InputField label="CMND / CCCD / Hộ chiếu" value={idNumber} onChange={setIdNumber} icon={CreditCard} placeholder="Nhập số CMND/CCCD" />
                  </div>

                  {/* Section: Bổ sung */}
                  <SectionTitle>THÔNG TIN BỔ SUNG</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                    <InputField label="Ngày sinh" value={birthday} onChange={setBirthday} type="date" icon={Calendar} />
                    <SelectField label="Giới tính" value={gender} onChange={setGender} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }]} placeholder="Chọn giới tính" />
                  </div>

                  {/* Section: Địa chỉ */}
                  <SectionTitle>ĐỊA CHỈ</SectionTitle>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <SelectField label="Tỉnh / Thành phố" value={city} onChange={v => { setCity(v); setDistrict(''); }} options={VN_CITIES.map(c => ({ value: c, label: c }))} placeholder="Chọn Tỉnh/Thành phố" icon={MapPin} />
                    <InputField label="Quận / Huyện" value={district} onChange={setDistrict} placeholder="Nhập Quận/Huyện" />
                  </div>
                  <div style={{ marginBottom: 28 }}>
                    <InputField label="Địa chỉ cụ thể" value={address} onChange={setAddress} icon={MapPin} placeholder="Số nhà, tên đường..." />
                  </div>

                  {/* Section: Bảo mật */}
                  <SectionTitle>BẢO MẬT</SectionTitle>
                  {pwdSuccess && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#dcfce7', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px', marginBottom: 14, color: '#166534', fontSize: 13.5, fontWeight: 600 }}>
                      <Check size={16} />{pwdSuccess}
                    </div>
                  )}
                  {!showPasswordForm ? (
                    <button type="button" onClick={() => setShowPasswordForm(true)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28,
                      background: 'none', border: '1.5px dashed #d5dee9', borderRadius: 10,
                      padding: '12px 18px', cursor: 'pointer', fontSize: 13.5, color: '#0d1b2e', fontWeight: 600, transition: 'all 0.2s'
                    }}>
                      <Lock size={15} color="#f4c04a" /> Đổi mật khẩu <Edit3 size={13} style={{ marginLeft: 'auto' }} />
                    </button>
                  ) : (
                    <div style={{ background: '#f8fafd', border: '1.5px solid #e8edf4', borderRadius: 12, padding: 20, marginBottom: 28 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0d1b2e', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Lock size={14} color="#f4c04a" /> Đổi mật khẩu
                        </span>
                        <button type="button" onClick={() => { setShowPasswordForm(false); setPwdError(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                          <X size={16} />
                        </button>
                      </div>
                      {pwdError && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#991b1b', fontSize: 13, fontWeight: 600 }}>
                          <AlertCircle size={14} />{pwdError}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Mật khẩu hiện tại', val: currentPassword, setVal: setCurrentPassword, show: showCurrent, setShow: setShowCurrent },
                          { label: 'Mật khẩu mới',       val: newPassword,       setVal: setNewPassword,       show: showNew,     setShow: setShowNew     },
                          { label: 'Xác nhận mật khẩu mới', val: confirmNewPassword, setVal: setConfirmNewPassword, show: showConfirm, setShow: setShowConfirm },
                        ].map(({ label, val, setVal, show, setShow }) => (
                          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            <label style={{ fontSize: 12, fontWeight: 700, color: '#4a637a' }}>{label}</label>
                            <div style={{ position: 'relative' }}>
                              <Lock size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                              <input type={show ? 'text' : 'password'} value={val} onChange={e => setVal(e.target.value)} placeholder="••••••••"
                                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 40px 9px 36px', border: '1.5px solid #d5dee9', borderRadius: 8, fontSize: 13, background: '#fff', color: '#1a2332', outline: 'none' }} />
                              <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                {show ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={handleChangePassword} disabled={savingPwd} style={{
                        marginTop: 14, padding: '10px 20px',
                        background: 'linear-gradient(135deg,#f4c04a,#e8a020)', border: 'none', borderRadius: 8,
                        fontSize: 13, fontWeight: 700, color: '#0d1b2e', cursor: savingPwd ? 'not-allowed' : 'pointer', opacity: savingPwd ? 0.7 : 1
                      }}>
                        {savingPwd ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
                      </button>
                    </div>
                  )}

                  {/* Save */}
                  <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                    <button type="submit" disabled={saving} style={{
                      padding: '13px 48px',
                      background: saving ? '#e5e7eb' : 'linear-gradient(135deg,#f4c04a 0%,#e8a020 100%)',
                      border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 800,
                      color: saving ? '#9ca3af' : '#0d1b2e', cursor: saving ? 'not-allowed' : 'pointer',
                      boxShadow: saving ? 'none' : '0 6px 20px rgba(244,192,74,0.40)',
                      transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 8
                    }}>
                      {saving ? '⏳ Đang lưu...' : <><Save size={16} /> CẬP NHẬT THÔNG TIN</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAB: THẺ THÀNH VIÊN ── */}
          {activeTab === 'member' && (
            <div style={{ padding: 32 }}>
              {/* Membership card */}
              <div style={{
                borderRadius: 20, padding: '32px 28px',
                background: 'linear-gradient(135deg,#0d1b2e 0%,#1a3050 60%,#0f2540 100%)',
                position: 'relative', overflow: 'hidden', marginBottom: 24,
                boxShadow: '0 16px 48px rgba(13,27,46,0.35)'
              }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(244,192,74,0.10)' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontSize: 11, letterSpacing: 3, color: '#f4c04a', fontWeight: 800, marginBottom: 4 }}>AURORA CINEMA</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>Thẻ Thành Viên</div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 14px', borderRadius: 20, background: `linear-gradient(135deg,${memberCfg.color},${memberCfg.color}bb)`, color: memberLevel === 'PLATINUM' ? '#0d1b2e' : '#fff' }}>
                    ⭐ {memberCfg.label.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: 0.5 }}>{profile?.fullName || authUser?.fullName}</div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>{authUser?.email}</div>
                <div style={{ display: 'flex', gap: 28 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, fontWeight: 600, marginBottom: 2 }}>ĐIỂM TÍCH LŨY</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#f4c04a' }}>{profile?.points || 0}</div>
                  </div>
                  {profile?.createdAt && (
                    <div>
                      <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 1, fontWeight: 600, marginBottom: 2 }}>THÀNH VIÊN TỪ</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
                        {new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Progress */}
              {memberCfg.next && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf4', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0d1b2e' }}>Tiến đến hạng {MEMBERSHIP_CONFIG[memberCfg.next]?.label}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{profile?.points || 0} / {memberCfg.nextPoints} điểm</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#f4c04a,#e8a020)', width: `${Math.min(100, ((profile?.points || 0) / memberCfg.nextPoints) * 100)}%`, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Cần thêm <strong style={{ color: '#f4c04a' }}>{Math.max(0, memberCfg.nextPoints - (profile?.points || 0))}</strong> điểm để lên hạng
                  </div>
                </div>
              )}
              {/* Benefits */}
              <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf4' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#0d1b2e', marginBottom: 14 }}>Quyền lợi thành viên</div>
                {[
                  { icon: '🎬', text: 'Ưu đãi đặc biệt mỗi thứ 3 hàng tuần' },
                  { icon: '🍿', text: 'Tích điểm qua mỗi lần mua vé và combo' },
                  { icon: '🎁', text: 'Quà tặng sinh nhật đặc biệt từ Aurora' },
                  { icon: '📱', text: 'Thông báo lịch chiếu phim sớm nhất' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
                    <span style={{ fontSize: 20 }}>{b.icon}</span>
                    <span style={{ fontSize: 13.5, color: '#1a2332' }}>{b.text}</span>
                    <Check size={14} color="#22c55e" style={{ marginLeft: 'auto', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TAB: LỊCH SỬ ĐẶT VÉ ── */}
          {activeTab === 'history' && (
            <div style={{ padding: 32 }}>
              <PageHeading icon={ReceiptText} title="Lịch sử đặt vé" subtitle="Theo dõi tất cả giao dịch đặt vé của bạn." />
              {bookingsLoading ? <LoadingState text="Đang tải lịch sử đặt vé..." /> : bookings.length === 0 ? (
                <EmptyState icon="🎟️" title="Bạn chưa có vé nào" text="Các vé đã đặt sẽ xuất hiện tại đây để bạn tiện theo dõi." />
              ) : <div style={{ display: 'grid', gap: 14 }}>
                {bookings.map(booking => {
                  const isPaid = booking.status === 'PAID';
                  return <div key={booking.id} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 18, background: '#fff', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#fff7dd', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Ticket size={23} color="#d99216" /></div>
                    <div style={{ flex: 1, minWidth: 210 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0d1b2e' }}>{booking.movieTitle}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 5 }}>{booking.theaterName} · {booking.screenName}</div>
                      <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 3 }}>{formatDateTime(booking.startsAt)} · Ghế {booking.seats || '—'}</div>
                    </div>
                    <div style={{ minWidth: 120 }}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>MÃ ĐẶT VÉ</div><div style={{ fontWeight: 800, color: '#0d1b2e', fontSize: 13 }}>{booking.code}</div></div>
                    <div style={{ minWidth: 115 }}><div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>TỔNG TIỀN</div><div style={{ fontWeight: 800, color: '#d99216', fontSize: 14 }}>{formatMoney(booking.totalAmount)}</div></div>
                    <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 20, color: isPaid ? '#166534' : '#9a6700', background: isPaid ? '#dcfce7' : '#fef3c7' }}>{isPaid ? 'ĐÃ THANH TOÁN' : booking.status}</span>
                  </div>;
                })}
              </div>}
            </div>
          )}

          {/* ── TAB: ĐIỂM THƯỞNG ── */}
          {activeTab === 'points' && (
            <div style={{ padding: 32 }}>
              <PageHeading icon={Sparkles} title="Điểm thưởng Aurora" subtitle="Tích điểm sau mỗi giao dịch và dùng điểm để nhận ưu đãi." />
              <div style={{ borderRadius: 18, padding: 26, background: 'linear-gradient(135deg,#fff7dc,#fff 65%)', border: '1px solid #f6d77d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 22 }}>
                <div><div style={{ fontSize: 12, fontWeight: 800, color: '#9a6700', letterSpacing: 1 }}>SỐ DƯ ĐIỂM HIỆN TẠI</div><div style={{ fontSize: 38, fontWeight: 900, color: '#d99216', marginTop: 3 }}>{profile?.points || 0} <span style={{ fontSize: 15 }}>điểm</span></div><div style={{ color: '#64748b', fontSize: 13 }}>1.000đ chi tiêu hợp lệ = 1 điểm Aurora</div></div>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f4c04a', display: 'grid', placeItems: 'center', boxShadow: '0 8px 20px rgba(244,192,74,.35)' }}><Star size={31} fill="#0d1b2e" color="#0d1b2e" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 14, marginBottom: 24 }}>
                {[['1', 'điểm', 'mỗi 1.000đ chi tiêu'], ['500', 'điểm', 'để lên hạng Silver'], ['2.000', 'điểm', 'để lên hạng Gold']].map(item => <div key={item[0]} style={{ border: '1px solid #e8edf4', borderRadius: 12, padding: 16, textAlign: 'center' }}><b style={{ fontSize: 20, color: '#0d1b2e' }}>{item[0]} <span style={{ fontSize: 12 }}>{item[1]}</span></b><div style={{ color: '#64748b', fontSize: 12, marginTop: 5 }}>{item[2]}</div></div>)}
              </div>
              <div style={{ borderTop: '1px solid #e8edf4', paddingTop: 20 }}><SectionTitle>LỊCH SỬ ĐIỂM</SectionTitle><EmptyState icon="⭐" title="Chưa có giao dịch điểm" text="Điểm từ các vé thanh toán thành công sẽ được cập nhật tại đây." compact /></div>
            </div>
          )}

          {/* ── TAB: VOUCHER ── */}
          {activeTab === 'voucher' && (
            <div style={{ padding: 32 }}>
              <PageHeading icon={Gift} title="Voucher của tôi" subtitle="Lưu mã ưu đãi để áp dụng khi thanh toán vé." />
              <div style={{ display: 'flex', gap: 10, padding: 16, background: '#f8fafd', border: '1px solid #e8edf4', borderRadius: 14, marginBottom: 22, flexWrap: 'wrap' }}>
                <Tag size={20} color="#d99216" style={{ marginTop: 8 }} /><input value={voucherCode} onChange={e => setVoucherCode(e.target.value.toUpperCase())} placeholder="Nhập mã voucher của bạn" style={{ flex: 1, minWidth: 200, border: '1px solid #d5dee9', borderRadius: 9, padding: '10px 12px', outline: 'none', fontSize: 13 }} /><button onClick={() => setVoucherCode('')} style={{ background: '#f4c04a', border: 'none', borderRadius: 9, padding: '0 18px', fontWeight: 800, color: '#0d1b2e', cursor: 'pointer' }}>ÁP DỤNG</button>
              </div>
              <EmptyState icon="🎁" title="Bạn chưa có voucher khả dụng" text="Voucher được gửi từ các chương trình ưu đãi của Aurora Cinema sẽ hiển thị tại đây." />
              <div style={{ marginTop: 24, borderTop: '1px solid #e8edf4', paddingTop: 20 }}><SectionTitle>MẸO SỬ DỤNG VOUCHER</SectionTitle><div style={{ display: 'grid', gap: 10 }}>{['Nhập mã voucher tại bước thanh toán để áp dụng ưu đãi.', 'Mỗi voucher chỉ dùng một lần và có thời hạn riêng.', 'Không thể cộng dồn nhiều voucher trong cùng một đơn hàng.'].map((text, i) => <div key={text} style={{ display: 'flex', gap: 10, color: '#475569', fontSize: 13 }}><CheckCircle size={17} color="#22a55a" style={{ flexShrink: 0 }} />{text}</div>)}</div></div>
            </div>
          )}
        </div>
      </div>
      <div style={{ height: 48 }} />
    </div>
  );
}

/* ─── Small helper sub-components ── */
function formatMoney(value: number | string) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function formatDateTime(value: string) {
  if (!value) return 'Chưa có lịch chiếu';
  return new Date(value.replace(' ', 'T')).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function PageHeading({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
    <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#fff7dd' }}><Icon size={21} color="#d99216" /></div>
    <div><div style={{ fontSize: 20, fontWeight: 850, color: '#0d1b2e' }}>{title}</div><div style={{ fontSize: 12.5, color: '#64748b', marginTop: 2 }}>{subtitle}</div></div>
  </div>;
}

function EmptyState({ icon, title, text, compact = false }: { icon: string; title: string; text: string; compact?: boolean }) {
  return <div style={{ padding: compact ? '24px 16px' : '44px 20px', textAlign: 'center', border: '1px dashed #d5dee9', borderRadius: 14, background: '#fbfdff' }}><div style={{ fontSize: compact ? 32 : 44, marginBottom: 10 }}>{icon}</div><div style={{ fontWeight: 800, fontSize: 15, color: '#1a2332', marginBottom: 5 }}>{title}</div><div style={{ fontSize: 13, color: '#64748b', maxWidth: 400, margin: '0 auto' }}>{text}</div></div>;
}

function LoadingState({ text }: { text: string }) {
  return <div style={{ padding: '48px 0', textAlign: 'center', color: '#64748b', fontSize: 13.5 }}><Clock3 size={25} style={{ marginBottom: 10 }} /><div>{text}</div></div>;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <div style={{ width: 4, height: 18, borderRadius: 2, background: '#f4c04a' }} />
      <span style={{ fontSize: 14, fontWeight: 800, color: '#0d1b2e', letterSpacing: 0.3 }}>{children}</span>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string; icon?: any;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#4a637a', letterSpacing: 0.3 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />}
        <select value={value} onChange={e => onChange(e.target.value)} style={{
          width: '100%', padding: Icon ? '10px 36px 10px 36px' : '10px 36px 10px 12px',
          border: '1.5px solid #d5dee9', borderRadius: 10, fontSize: 13.5,
          background: '#fff', color: value ? '#1a2332' : '#94a3b8', outline: 'none', cursor: 'pointer', appearance: 'none'
        }}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight size={14} color="#94a3b8" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
      </div>
    </div>
  );
}
