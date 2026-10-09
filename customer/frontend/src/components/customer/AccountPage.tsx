import { useState, useEffect, FormEvent, useRef, useId, PointerEvent as ReactPointerEvent } from 'react';
import {
  User, Mail, Phone, CreditCard, Calendar, MapPin,
  Lock, Eye, EyeOff, Check, AlertCircle, ChevronRight,
  Star, Ticket, Gift, Shield, Edit3, Save, X, Clock3, ReceiptText,
  CheckCircle, Tag, Sparkles, Camera, Upload, Loader2, Trash2
} from 'lucide-react';
import SafeAvatar from './SafeAvatar';
import './AccountPage.css';

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
  avatarUrl?: string | null;
};

type MembershipCard = {
  cardNumber: string;
  status: 'ACTIVE' | string;
  membershipLevel: string;
  activatedAt: string;
  expiresAt: string;
  totalSpent: number;
  pointsAccumulated: number;
  pointsUsed: number;
  pointsAvailable: number;
  pointsExpiring: number;
  nextLevel: string | null;
  nextThreshold: number | null;
  pointsToNextLevel: number;
  expiryNote: string;
};

type AccountPageProps = {
  authUser: { fullName: string; email: string; avatarUrl?: string | null } | null;
  onUserUpdate?: (user: { fullName: string; email: string; avatarUrl?: string | null }) => void;
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

type AdministrativeProvince = {
  code: string;
  name: string;
  fullName: string;
  aliases?: string[];
};

type AdministrativeDistrict = {
  code: string;
  name: string;
};

type AvatarCropMetadata = {
  offsetX: number;
  offsetY: number;
  zoom: number;
  sourceWidth: number;
  sourceHeight: number;
  outputSize: number;
};

function InputField({
  label, value, onChange, type = 'text', placeholder = '', required = false,
  icon: Icon, disabled = false, hint, lang
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
  icon?: any; disabled?: boolean; hint?: string; lang?: string;
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
          lang={lang}
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

function formatVietnameseDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function parseVietnameseDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function VietnameseDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [displayValue, setDisplayValue] = useState(() => formatVietnameseDate(value));
  const [dateError, setDateError] = useState('');
  const nativeDateRef = useRef<HTMLInputElement>(null);
  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => setDisplayValue(formatVietnameseDate(value)), [value]);

  function handleTextChange(rawValue: string) {
    const digits = rawValue.replace(/\D/g, '').slice(0, 8);
    const formatted = digits.length <= 2 ? digits : digits.length <= 4 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    setDisplayValue(formatted);
    setDateError('');
    if (formatted === '') onChange('');
    if (formatted.length === 10) {
      const isoDate = parseVietnameseDate(formatted);
      if (isoDate) onChange(isoDate);
      else setDateError('Ngày sinh không hợp lệ.');
    }
  }

  function openDatePicker() {
    const input = nativeDateRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (input?.showPicker) input.showPicker();
    else input?.click();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#4a637a', letterSpacing: 0.3 }}>Ngày sinh</label>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', display: 'flex', pointerEvents: 'none' }}><Calendar size={14}/></span>
        <input type="text" inputMode="numeric" autoComplete="bday" value={displayValue} onChange={event => handleTextChange(event.target.value)} onBlur={() => {
          if (displayValue && !parseVietnameseDate(displayValue)) setDateError('Vui lòng nhập theo định dạng ngày/tháng/năm.');
          else if (value) setDisplayValue(formatVietnameseDate(value));
        }} placeholder="dd/mm/yyyy" maxLength={10} aria-invalid={Boolean(dateError)} style={{ width:'100%', boxSizing:'border-box', padding:'10px 44px 10px 36px', border:`1.5px solid ${dateError ? '#ef8d8d' : '#d5dee9'}`, borderRadius:10, color:'#1a2332', background:'#fff', fontSize:13.5, outline:'none' }} />
        <button type="button" onClick={openDatePicker} aria-label="Mở lịch chọn ngày sinh" title="Chọn ngày sinh" style={{ position:'absolute', top:'50%', right:7, transform:'translateY(-50%)', display:'grid', width:31, height:31, placeItems:'center', padding:0, border:0, borderRadius:8, color:'#49647f', background:'transparent', cursor:'pointer' }}><Calendar size={16}/></button>
        <input ref={nativeDateRef} type="date" value={value || ''} max={maxDate} onChange={event => { onChange(event.target.value); setDisplayValue(formatVietnameseDate(event.target.value)); setDateError(''); }} tabIndex={-1} aria-hidden="true" style={{ position:'absolute', width:1, height:1, right:12, bottom:0, opacity:0, pointerEvents:'none' }} />
      </div>
      {dateError && <span role="alert" style={{ fontSize: 11, color: '#c24141' }}>{dateError}</span>}
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
  const [provinces, setProvinces] = useState<AdministrativeProvince[]>([]);
  const [districts, setDistricts] = useState<AdministrativeDistrict[]>([]);
  const [provincesLoading, setProvincesLoading] = useState(true);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [addressCatalogError, setAddressCatalogError] = useState('');

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
  const [membershipCard, setMembershipCard] = useState<MembershipCard | null>(null);
  const [membershipLoading, setMembershipLoading] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreviewOpen, setAvatarPreviewOpen] = useState(false);
  const [avatarDeleteConfirmOpen, setAvatarDeleteConfirmOpen] = useState(false);
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setActiveTab(initialTab), [initialTab]);

  useEffect(() => {
    if (!avatarPreviewOpen && !avatarDeleteConfirmOpen && !avatarCropFile) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setAvatarDeleteConfirmOpen(false);
      if (!avatarUploading) {
        setAvatarCropFile(null);
        if (avatarInputRef.current) avatarInputRef.current.value = '';
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [avatarPreviewOpen, avatarDeleteConfirmOpen, avatarCropFile, avatarUploading]);

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
    let cancelled = false;
    setProvincesLoading(true);
    setAddressCatalogError('');
    fetch(`${API_URL}?action=address_provinces`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách tỉnh/thành.');
        return data;
      })
      .then(data => {
        if (!cancelled) setProvinces(Array.isArray(data.provinces) ? data.provinces : []);
      })
      .catch(error => {
        if (!cancelled) setAddressCatalogError(error instanceof Error ? error.message : 'Không thể tải danh mục địa chỉ.');
      })
      .finally(() => { if (!cancelled) setProvincesLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const selectedProvince = provinces.find(province =>
      province.name === city || province.fullName === city || province.aliases?.includes(city)
    );
    if (!selectedProvince) {
      setDistricts([]);
      setDistrictsLoading(false);
      return;
    }

    if (city !== selectedProvince.name) {
      setCity(selectedProvince.name);
      return;
    }

    let cancelled = false;
    setDistrictsLoading(true);
    setAddressCatalogError('');
    fetch(`${API_URL}?action=address_districts&province_code=${encodeURIComponent(selectedProvince.code)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Không thể tải danh sách quận/huyện.');
        return data;
      })
      .then(data => {
        if (!cancelled) setDistricts(Array.isArray(data.districts) ? data.districts : []);
      })
      .catch(error => {
        if (!cancelled) {
          setDistricts([]);
          setAddressCatalogError(error instanceof Error ? error.message : 'Không thể tải danh sách quận/huyện.');
        }
      })
      .finally(() => { if (!cancelled) setDistrictsLoading(false); });
    return () => { cancelled = true; };
  }, [city, provinces]);

  useEffect(() => {
    if (activeTab !== 'history') return;
    setBookingsLoading(true);
    fetch(`${API_URL}?action=booking_history`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : { bookings: [] })
      .then(data => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'member') return;
    setMembershipLoading(true);
    fetch(`${API_URL}?action=membership_card`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setMembershipCard(data.card || null))
      .catch(() => setMembershipCard(null))
      .finally(() => setMembershipLoading(false));
  }, [activeTab]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSuccessMsg(''); setErrorMsg('');
    const cleanName = fullName.trim();
    const cleanPhone = phone.replace(/[\s.\-()]/g, '');
    const cleanIdNumber = idNumber.trim();
    const cleanAddress = address.trim();
    if (cleanName.length < 2 || cleanName.length > 120) { setErrorMsg('Họ và tên phải có từ 2 đến 120 ký tự.'); return; }
    if (cleanPhone && !/^(0\d{9,10}|\+84\d{9,10})$/.test(cleanPhone)) { setErrorMsg('Số điện thoại không đúng định dạng Việt Nam.'); return; }
    if (cleanIdNumber && !/^[A-Za-z0-9]{6,20}$/.test(cleanIdNumber)) { setErrorMsg('CMND, CCCD hoặc hộ chiếu phải có từ 6 đến 20 ký tự chữ và số.'); return; }
    if (birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(birthday) || birthday > new Date().toISOString().slice(0, 10))) { setErrorMsg('Ngày sinh không hợp lệ.'); return; }
    if (cleanAddress.length > 255) { setErrorMsg('Địa chỉ cụ thể không được vượt quá 255 ký tự.'); return; }
    if (city && !district && !districtsLoading) { setErrorMsg('Vui lòng chọn quận/huyện thuộc tỉnh/thành đã chọn.'); return; }
    if (district && !city) { setErrorMsg('Vui lòng chọn tỉnh/thành trước khi chọn quận/huyện.'); return; }
    if (provincesLoading || districtsLoading) { setErrorMsg('Danh mục địa chỉ đang tải, vui lòng chờ trong giây lát.'); return; }
    const saveStartedAt = Date.now();
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}?action=profile_update`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: cleanName, phone: cleanPhone, idNumber: cleanIdNumber, birthday, gender, city, district, address: cleanAddress }),
      });
      const rawResponse = await res.text();
      let data: any = {};
      try { data = rawResponse ? JSON.parse(rawResponse) : {}; }
      catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ.'); }
      if (!res.ok) { setErrorMsg(data.message || 'Không thể cập nhật.'); return; }
      if (data.profile) {
        const updated = data.profile as Profile;
        setProfile(updated);
        setFullName(updated.fullName || ''); setPhone(updated.phone || ''); setIdNumber(updated.idNumber || '');
        setBirthday(updated.birthday || ''); setGender(updated.gender || ''); setCity(updated.city || '');
        setDistrict(updated.district || ''); setAddress(updated.address || '');
      }
      setSuccessMsg(data.message || 'Cập nhật thông tin thành công!');
      if (data.user && onUserUpdate) onUserUpdate(data.user);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.'); }
    finally {
      const remaining = 650 - (Date.now() - saveStartedAt);
      if (remaining > 0) await new Promise(resolve => window.setTimeout(resolve, remaining));
      setSaving(false);
    }
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

  function handleAvatarFileSelected(file?: File) {
    if (!file) return;
    setErrorMsg(''); setSuccessMsg('');
    const supportedMime = ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type.toLowerCase());
    const supportedExtension = /\.(jpe?g|png)$/i.test(file.name);
    if (!supportedMime && !supportedExtension) {
      setErrorMsg('Chỉ hỗ trợ ảnh JPG hoặc PNG hợp lệ.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ảnh đại diện phải nhỏ hơn hoặc bằng 5 MB.');
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      return;
    }
    setAvatarCropFile(file);
  }

  async function handleAvatarUpload(file: File, crop: AvatarCropMetadata, sourceName: string) {
    setErrorMsg(''); setSuccessMsg('');
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      formData.append('source_name', sourceName);
      formData.append('source_width', String(crop.sourceWidth));
      formData.append('source_height', String(crop.sourceHeight));
      formData.append('crop_offset_x', crop.offsetX.toFixed(4));
      formData.append('crop_offset_y', crop.offsetY.toFixed(4));
      formData.append('crop_zoom', crop.zoom.toFixed(4));
      formData.append('crop_output_size', String(crop.outputSize));
      const response = await fetch(`${API_URL}?action=profile_avatar`, { method:'POST', credentials:'include', body:formData });
      const responseText = await response.text();
      let data: any = {};
      try { data = responseText ? JSON.parse(responseText) : {}; }
      catch { throw new Error('Máy chủ trả về dữ liệu không hợp lệ khi tải ảnh.'); }
      if (!response.ok) throw new Error(data.message || 'Không thể tải ảnh đại diện lên.');
      const avatarUrl = String(data.avatarUrl || '');
      if (!avatarUrl) throw new Error('Máy chủ chưa trả về đường dẫn ảnh đại diện.');
      setProfile(current => current ? { ...current, avatarUrl } : current);
      if (data.user && onUserUpdate) onUserUpdate(data.user);
      setSuccessMsg('Đã cập nhật ảnh đại diện.');
      window.setTimeout(() => setSuccessMsg(''), 4000);
      setAvatarCropFile(null);
      return true;
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không thể tải ảnh đại diện lên.');
      return false;
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  }

  async function handleAvatarRemove() {
    if (!avatarUrl || avatarUploading) return;
    setAvatarDeleteConfirmOpen(false);
    setAvatarUploading(true); setErrorMsg(''); setSuccessMsg('');
    try {
      const response = await fetch(`${API_URL}?action=profile_avatar_delete`, { method: 'POST', credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể xóa ảnh đại diện.');
      setProfile(current => current ? { ...current, avatarUrl: null } : current);
      if (data.user && onUserUpdate) onUserUpdate(data.user);
      setSuccessMsg('Đã xóa ảnh đại diện.');
      window.setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Không thể xóa ảnh đại diện.'); }
    finally { setAvatarUploading(false); }
  }

  const memberLevel = profile?.membershipLevel || 'STANDARD';
  const memberCfg = MEMBERSHIP_CONFIG[memberLevel] || MEMBERSHIP_CONFIG.STANDARD;
  const avatarLetter = (authUser?.fullName || fullName || 'A').charAt(0).toUpperCase();
  const avatarUrl = profile?.avatarUrl || authUser?.avatarUrl || '';

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f0f4f8 0%,#eef0f4 100%)', fontFamily: "'Inter','Segoe UI',Arial,sans-serif" }}>

      {/* Page Header */}
      <div style={{ background: 'linear-gradient(135deg,#0d1b2e 0%,#1a3050 100%)', padding: '32px 20px 56px', position: 'relative', overflow: 'hidden' }}>
        <input ref={avatarInputRef} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" onChange={event => handleAvatarFileSelected(event.target.files?.[0])} style={{ display:'none' }} />
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(244,192,74,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -60, left: -30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(244,192,74,0.05)' }} />
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
          <button type="button" onClick={() => avatarUrl ? setAvatarPreviewOpen(true) : avatarInputRef.current?.click()} title={avatarUrl ? 'Xem ảnh đại diện' : 'Thay ảnh đại diện'} aria-label={avatarUrl ? 'Xem ảnh đại diện kích thước lớn' : 'Chọn ảnh đại diện'} style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'linear-gradient(135deg,#f4c04a 0%,#e8a020 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 30, fontWeight: 800, color: '#0d1b2e',
            border: '3px solid rgba(244,192,74,0.4)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)', flexShrink: 0, padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative'
          }}>
            <SafeAvatar url={avatarUrl} name={authUser?.fullName || fullName || avatarLetter} />
            <span style={{ position:'absolute', right:0, bottom:0, display:'grid', width:24, height:24, placeItems:'center', borderRadius:'50%', color:'#fff', background:'#0d1b2e', border:'2px solid #f4c04a' }}>{avatarUrl ? <Eye size={12}/> : <Camera size={12}/>}</span>
          </button>
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

                  <div className="profile-avatar-actions profile-avatar-actions-only">
                    <button type="button" className="primary" disabled={avatarUploading} onClick={() => avatarInputRef.current?.click()}>{avatarUploading ? <Loader2 size={16} style={{ animation:'spin .8s linear infinite' }}/> : <Upload size={16}/>} {avatarUploading ? 'Đang tải ảnh...' : 'Thay ảnh'}</button>
                    <button type="button" className="remove" disabled={!avatarUrl || avatarUploading} onClick={() => setAvatarDeleteConfirmOpen(true)}><Trash2 size={14}/>Xóa ảnh</button>
                  </div>

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
                    <VietnameseDateField value={birthday} onChange={setBirthday} />
                    <SelectField label="Giới tính" value={gender} onChange={setGender} options={[{ value: 'male', label: 'Nam' }, { value: 'female', label: 'Nữ' }, { value: 'other', label: 'Khác' }]} placeholder="Chọn giới tính" />
                  </div>

                  {/* Section: Địa chỉ */}
                  <SectionTitle>ĐỊA CHỈ</SectionTitle>
                  <div className="profile-address-card">
                    <div className="profile-address-grid">
                      <SelectField
                        label="Tỉnh / Thành phố"
                        value={city}
                        onChange={value => { setCity(value); setDistrict(''); setDistricts([]); setDistrictsLoading(Boolean(value)); setAddressCatalogError(''); }}
                        options={provinces.map(province => ({ value: province.name, label: province.name }))}
                        placeholder={provincesLoading ? 'Đang tải tỉnh/thành...' : 'Chọn Tỉnh/Thành phố'}
                        icon={MapPin}
                        loading={provincesLoading}
                        disabled={provincesLoading}
                      />
                      <SelectField
                        label="Quận / Huyện"
                        value={district}
                        onChange={setDistrict}
                        options={districts.map(item => ({ value: item.name, label: item.name }))}
                        placeholder={!city ? 'Chọn tỉnh/thành trước' : districtsLoading ? 'Đang tải quận/huyện...' : 'Chọn Quận/Huyện'}
                        icon={MapPin}
                        loading={districtsLoading}
                        disabled={!city || districtsLoading || Boolean(addressCatalogError)}
                      />
                    </div>
                    {addressCatalogError && <div className="profile-address-error" role="alert"><AlertCircle size={14}/>{addressCatalogError}</div>}
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
                  <div className="profile-save-area">
                    {successMsg && <div className="profile-save-result success" role="status"><CheckCircle size={16}/>{successMsg}</div>}
                    {errorMsg && <div className="profile-save-result error" role="alert"><AlertCircle size={16}/>{errorMsg}</div>}
                    <button type="submit" disabled={saving} aria-busy={saving} className={`profile-save-button ${saving ? 'loading' : ''}`}>
                      {saving ? <><Loader2 size={17}/>ĐANG CẬP NHẬT...</> : <><Save size={16} />CẬP NHẬT THÔNG TIN</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ── TAB: THẺ THÀNH VIÊN ── */}
          {activeTab === 'member' && (
            <div style={{ padding: 32 }}>
              {membershipLoading && !membershipCard ? <LoadingState text="Đang cấp và tải thông tin thẻ thành viên..." /> : <>
              <div style={{ borderRadius: 20, padding: '30px 28px', background: 'linear-gradient(135deg,#0d1b2e,#1a3050 60%,#0f2540)', position: 'relative', overflow: 'hidden', marginBottom: 20, boxShadow: '0 16px 48px rgba(13,27,46,.35)' }}>
                <div style={{ position:'absolute', width:220, height:220, border:'34px solid rgba(244,192,74,.10)', borderRadius:'50%', right:-68, top:-92 }} />
                <div style={{ display:'flex', justifyContent:'space-between', gap:16, position:'relative', flexWrap:'wrap' }}>
                  <div><div style={{ fontSize:11, letterSpacing:3, color:'#f4c04a', fontWeight:800 }}>AURORA CINEMA</div><div style={{ fontSize:23, color:'#fff', fontWeight:900, marginTop:5 }}>Thẻ Thành Viên</div></div>
                  <span style={{ alignSelf:'flex-start', fontSize:12, fontWeight:800, padding:'7px 13px', borderRadius:22, background:'rgba(255,255,255,.16)', color:'#fff' }}>✦ {MEMBERSHIP_CONFIG[membershipCard?.membershipLevel || memberLevel]?.label.toUpperCase() || 'THÀNH VIÊN'}</span>
                </div>
                <div style={{ position:'relative', marginTop:28, fontSize:24, fontWeight:900, color:'#fff' }}>{profile?.fullName || authUser?.fullName || 'Khách hàng Aurora'}</div>
                <div style={{ position:'relative', marginTop:5, fontSize:13, color:'#b8c6d8' }}>{profile?.email || authUser?.email}</div>
                <div style={{ position:'relative', marginTop:24, display:'flex', gap:32, flexWrap:'wrap' }}>
                  <div><div style={{ fontSize:10, letterSpacing:1.1, fontWeight:800, color:'#9fb1c6' }}>MÃ THÀNH VIÊN</div><div style={{ marginTop:5, color:'#f4c04a', fontSize:18, fontWeight:900, letterSpacing:1.5, fontFamily:'monospace' }}>{membershipCard?.cardNumber || '—'}</div></div>
                  <div><div style={{ fontSize:10, letterSpacing:1.1, fontWeight:800, color:'#9fb1c6' }}>ĐIỂM KHẢ DỤNG</div><div style={{ marginTop:5, color:'#fff', fontSize:18, fontWeight:900 }}>{membershipCard?.pointsAvailable ?? profile?.points ?? 0} điểm</div></div>
                  <div><div style={{ fontSize:10, letterSpacing:1.1, fontWeight:800, color:'#9fb1c6' }}>TRẠNG THÁI</div><div style={{ marginTop:5, color:'#86efac', fontSize:14, fontWeight:800 }}>● ĐANG HOẠT ĐỘNG</div></div>
                </div>
              </div>
              <div style={{ border:'1px solid #e5ebf2', borderRadius:16, overflow:'hidden', marginBottom:20, background:'#fff' }}>
                <div style={{ padding:'16px 20px', borderBottom:'1px solid #edf1f5', fontWeight:800, color:'#0d1b2e' }}>Thông tin thẻ và điểm thưởng</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))' }}>
                  {[
                    ['Mã thành viên', membershipCard?.cardNumber || 'Đang cấp'], ['Hạng thẻ', MEMBERSHIP_CONFIG[membershipCard?.membershipLevel || memberLevel]?.label || 'Thành Viên'], ['Ngày kích hoạt', formatShortDate(membershipCard?.activatedAt)],
                    ['Tổng chi tiêu', formatMoney(membershipCard?.totalSpent || 0)], ['Điểm tích lũy', `${membershipCard?.pointsAccumulated ?? 0} điểm`], ['Điểm đã dùng', `${membershipCard?.pointsUsed ?? 0} điểm`],
                    ['Điểm khả dụng', `${membershipCard?.pointsAvailable ?? profile?.points ?? 0} điểm`], ['Điểm sắp hết hạn', `${membershipCard?.pointsExpiring ?? 0} điểm`], ['Hạn thẻ', formatShortDate(membershipCard?.expiresAt)]
                  ].map(([label, value]) => <div key={label} style={{ padding:'16px 20px', borderRight:'1px solid #edf1f5', borderBottom:'1px solid #edf1f5' }}><div style={{ fontSize:10.5, color:'#7b8ba0', fontWeight:800, letterSpacing:.5 }}>{label.toUpperCase()}</div><div style={{ marginTop:6, color:'#172b4d', fontSize:14, fontWeight:800 }}>{value}</div></div>)}
                </div>
              </div>
              {(membershipCard?.nextLevel || memberCfg.next) && (
                <div style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #e8edf4', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0d1b2e' }}>Tiến đến hạng {MEMBERSHIP_CONFIG[membershipCard?.nextLevel || memberCfg.next || '']?.label}</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{membershipCard?.pointsAvailable ?? profile?.points ?? 0} / {membershipCard?.nextThreshold || memberCfg.nextPoints} điểm</span>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: 'linear-gradient(90deg,#f4c04a,#e8a020)', width: `${Math.min(100, ((membershipCard?.pointsAvailable ?? profile?.points ?? 0) / (membershipCard?.nextThreshold || memberCfg.nextPoints)) * 100)}%`, transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
                    Cần thêm <strong style={{ color: '#f4c04a' }}>{membershipCard?.pointsToNextLevel ?? Math.max(0, memberCfg.nextPoints - (profile?.points || 0))}</strong> điểm để lên hạng
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
              </>}
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
      {avatarPreviewOpen && avatarUrl && (
        <div className="profile-avatar-lightbox" role="presentation">
          <div className="profile-avatar-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Xem ảnh đại diện">
            <button type="button" className="profile-avatar-lightbox-close" onClick={() => setAvatarPreviewOpen(false)} aria-label="Đóng ảnh đại diện"><X size={20}/></button>
            <div className="profile-avatar-lightbox-media">
              <SafeAvatar url={avatarUrl} name={authUser?.fullName || fullName || avatarLetter} fit="contain" />
            </div>
            <div className="profile-avatar-lightbox-caption">{authUser?.fullName || fullName || 'Ảnh đại diện'}</div>
          </div>
        </div>
      )}
      {saving && (
        <div className="profile-update-loading" role="status" aria-live="polite">
          <div className="profile-update-loading-icon"><Loader2 size={20}/></div>
          <div className="profile-update-loading-copy"><strong>Đang cập nhật thông tin</strong><span>Hệ thống đang lưu thay đổi vào hồ sơ của bạn.</span></div>
          <div className="profile-update-loading-progress"><i/></div>
        </div>
      )}
      {avatarCropFile && (
        <AvatarCropModal
          file={avatarCropFile}
          saving={avatarUploading}
          onCancel={() => {
            if (avatarUploading) return;
            setAvatarCropFile(null);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
          }}
          onConfirm={handleAvatarUpload}
        />
      )}
      {avatarDeleteConfirmOpen && (
        <div className="profile-confirm-overlay" onClick={() => setAvatarDeleteConfirmOpen(false)} role="presentation">
          <div className="profile-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="avatar-delete-title" aria-describedby="avatar-delete-description" onClick={event => event.stopPropagation()}>
            <button type="button" className="profile-confirm-close" onClick={() => setAvatarDeleteConfirmOpen(false)} aria-label="Đóng thông báo"><X size={18}/></button>
            <div className="profile-confirm-icon"><Trash2 size={24}/></div>
            <div className="profile-confirm-copy">
              <h3 id="avatar-delete-title">Xóa ảnh đại diện?</h3>
              <p id="avatar-delete-description">Ảnh hiện tại sẽ bị xóa khỏi hồ sơ của bạn. Bạn có thể tải ảnh mới lên bất cứ lúc nào.</p>
            </div>
            <div className="profile-confirm-actions">
              <button type="button" className="cancel" onClick={() => setAvatarDeleteConfirmOpen(false)}>Hủy</button>
              <button type="button" className="confirm" onClick={() => void handleAvatarRemove()}><Trash2 size={15}/>Xóa ảnh</button>
            </div>
          </div>
        </div>
      )}
      <div style={{ height: 48 }} />
    </div>
  );
}

/* ─── Small helper sub-components ── */
function AvatarCropModal({ file, saving, onCancel, onConfirm }: {
  file: File;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (file: File, crop: AvatarCropMetadata, sourceName: string) => Promise<boolean>;
}) {
  const OUTPUT_SIZE = 512;
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [viewportSize, setViewportSize] = useState(360);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [cropError, setCropError] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number; maxX: number; maxY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const updateSize = () => setViewportSize(Math.max(1, viewport.getBoundingClientRect().width));
    updateSize();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    observer?.observe(viewport);
    window.addEventListener('resize', updateSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const baseScale = sourceSize.width && sourceSize.height
    ? Math.max(viewportSize / sourceSize.width, viewportSize / sourceSize.height)
    : 1;
  const renderedWidth = sourceSize.width * baseScale * zoom;
  const renderedHeight = sourceSize.height * baseScale * zoom;
  const maxX = Math.max(0, (renderedWidth - viewportSize) / 2);
  const maxY = Math.max(0, (renderedHeight - viewportSize) / 2);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceSize.width || saving) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y, maxX, maxY };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextX = drag.maxX > 0 ? drag.offsetX + (event.clientX - drag.x) / drag.maxX : 0;
    const nextY = drag.maxY > 0 ? drag.offsetY + (event.clientY - drag.y) / drag.maxY : 0;
    setOffset({ x: Math.max(-1, Math.min(1, nextX)), y: Math.max(-1, Math.min(1, nextY)) });
  }

  function handlePointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function createCroppedImage() {
    const image = imageRef.current;
    if (!image || !sourceSize.width || saving) return;
    setCropError('');
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext('2d');
    if (!context) { setCropError('Trình duyệt không thể xử lý ảnh này.'); return; }
    const scale = Math.max(OUTPUT_SIZE / sourceSize.width, OUTPUT_SIZE / sourceSize.height) * zoom;
    const width = sourceSize.width * scale;
    const height = sourceSize.height * scale;
    const outputMaxX = Math.max(0, (width - OUTPUT_SIZE) / 2);
    const outputMaxY = Math.max(0, (height - OUTPUT_SIZE) / 2);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(image, (OUTPUT_SIZE - width) / 2 + offset.x * outputMaxX, (OUTPUT_SIZE - height) / 2 + offset.y * outputMaxY, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', .92));
    if (!blob) { setCropError('Không thể tạo ảnh đã cắt. Vui lòng thử lại.'); return; }
    const croppedFile = new File([blob], `avatar_${Date.now()}.jpg`, { type: 'image/jpeg' });
    await onConfirm(croppedFile, {
      offsetX: offset.x,
      offsetY: offset.y,
      zoom,
      sourceWidth: sourceSize.width,
      sourceHeight: sourceSize.height,
      outputSize: OUTPUT_SIZE,
    }, file.name);
  }

  return (
    <div className="profile-crop-overlay" role="presentation" onClick={() => { if (!saving) onCancel(); }}>
      <div className="profile-crop-dialog" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title" onClick={event => event.stopPropagation()}>
        <div className="profile-crop-header">
          <div><h3 id="avatar-crop-title">Cắt ảnh đại diện</h3><p>Kéo ảnh để chọn vùng bạn muốn hiển thị.</p></div>
          <button type="button" onClick={onCancel} disabled={saving} aria-label="Đóng trình cắt ảnh"><X size={19}/></button>
        </div>
        <div className="profile-crop-body">
          <div
            ref={viewportRef}
            className="profile-crop-viewport"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {sourceUrl && <img
              ref={imageRef}
              src={sourceUrl}
              alt="Ảnh đang cắt"
              draggable={false}
              onLoad={event => setSourceSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              style={{
                width: renderedWidth || 'auto',
                height: renderedHeight || 'auto',
                transform: `translate(calc(-50% + ${offset.x * maxX}px), calc(-50% + ${offset.y * maxY}px))`,
              }}
            />}
            <div className="profile-crop-grid" aria-hidden="true" />
            <div className="profile-crop-mask" aria-hidden="true" />
          </div>
          <div className="profile-crop-controls">
            <div className="profile-crop-control-heading"><span>Thu phóng</span><strong>{Math.round(zoom * 100)}%</strong></div>
            <div className="profile-crop-slider-row">
              <span aria-hidden="true">−</span>
              <input type="range" min="1" max="3" step="0.01" value={zoom} disabled={saving} onChange={event => setZoom(Number(event.target.value))} aria-label="Thu phóng ảnh" />
              <span aria-hidden="true">+</span>
            </div>
            <button type="button" className="profile-crop-reset" disabled={saving} onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }}>Đặt lại vị trí</button>
          </div>
        </div>
        {cropError && <div className="profile-crop-error" role="alert"><AlertCircle size={15}/>{cropError}</div>}
        <div className="profile-crop-footer">
          <button type="button" className="cancel" disabled={saving} onClick={onCancel}>Hủy</button>
          <button type="button" className="save" disabled={saving || !sourceSize.width} onClick={() => void createCroppedImage()}>{saving ? <Loader2 size={16} style={{ animation:'spin .8s linear infinite' }}/> : <Check size={16}/>} {saving ? 'Đang lưu ảnh...' : 'Dùng ảnh này'}</button>
        </div>
      </div>
    </div>
  );
}

function formatMoney(value: number | string) {
  return `${Number(value || 0).toLocaleString('vi-VN')}đ`;
}

function formatShortDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
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

function SelectField({ label, value, onChange, options, placeholder, icon: Icon, disabled = false, loading = false, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string; icon?: any;
  disabled?: boolean; loading?: boolean; hint?: string;
}) {
  const fieldId = useId();
  return (
    <div className="account-select-field">
      <label htmlFor={fieldId}>{label}</label>
      <div className="account-select-control">
        {Icon && <Icon className="account-select-leading" size={15}/>}
        <select
          value={value}
          id={fieldId}
          disabled={disabled}
          aria-busy={loading}
          onChange={e => onChange(e.target.value)}
          className={`${Icon ? 'has-icon' : ''} ${value ? 'has-value' : ''}`}
        >
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {loading
          ? <Loader2 className="account-select-spinner" size={15}/>
          : <ChevronRight className="account-select-chevron" size={15}/>
        }
      </div>
      {hint && <span className="account-select-hint">{hint}</span>}
    </div>
  );
}
