import { FormEvent, useState, useEffect } from 'react';
import {
  Ticket, Percent, Crown, ShieldCheck,
  User, Mail, Phone, Lock, Eye, EyeOff, RotateCw, Facebook, X,
  FileText, CheckCircle2
} from 'lucide-react';

type AuthMode = 'login' | 'register';

type AuthenticatedAccount = {
  fullName: string;
  email: string;
};

type AuthModalProps = {
  mode: AuthMode;
  onClose: () => void;
  onAuthenticated: (account: AuthenticatedAccount) => void;
  onSwitchMode?: (mode: AuthMode) => void;
};

const API_URL = 'http://localhost/AURORA%20CINEMA/customer/backend/public/api';

export default function AuthModal({
  mode: initialMode,
  onClose,
  onAuthenticated,
  onSwitchMode
}: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaCode, setCaptchaCode] = useState('41132');
  const [captchaInput, setCaptchaInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync mode when prop changes
  useEffect(() => {
    setMode(initialMode);
    setError('');
  }, [initialMode]);

  // Generate random captcha
  function generateCaptcha() {
    const randomCode = Math.floor(10000 + Math.random() * 90000).toString();
    setCaptchaCode(randomCode);
    setCaptchaInput('');
  }

  useEffect(() => {
    generateCaptcha();
  }, [mode]);

  function handleSwitch(nextMode: AuthMode) {
    setMode(nextMode);
    setError('');
    if (onSwitchMode) {
      onSwitchMode(nextMode);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (mode === 'register') {
      if (!fullName.trim() || !normalizedEmail || !password) {
        setError('Vui lòng nhập đầy đủ thông tin bắt buộc.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        setError('Email không đúng định dạng.');
        return;
      }
      if (password.length < 6) {
        setError('Mật khẩu cần ít nhất 6 ký tự.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp.');
        return;
      }
      if (captchaInput.trim() !== '' && captchaInput.trim() !== captchaCode) {
        setError('Mã xác thực không chính xác.');
        return;
      }
      if (!agreeTerms) {
        setError('Vui lòng đồng ý với Điều khoản và điều kiện.');
        return;
      }
    } else {
      if (!normalizedEmail || !password) {
        setError('Vui lòng nhập email và mật khẩu.');
        return;
      }
    }

    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/${mode}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: normalizedEmail,
          password,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || 'Không thể xử lý yêu cầu.');
        return;
      }
      onAuthenticated(result.user);
    } catch {
      setError('Không thể kết nối máy chủ. Hãy kiểm tra Apache và MySQL trong WAMP.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSocialLogin(provider: 'google' | 'facebook') {
    setIsSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/oauth/start?provider=${provider}`, { credentials: 'include' });
      const result = await response.json();
      if (!response.ok) {
        setError(result.message || 'Đăng nhập mạng xã hội chưa được cấu hình.');
        return;
      }
      setError(result.message || 'Đăng nhập mạng xã hội chưa được cấu hình.');
    } catch {
      setError('Không thể kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      style={{
        position: 'relative',
        minHeight: 'calc(100vh - 96px)',
        background: 'linear-gradient(135deg, rgba(6, 17, 33, 0.94) 0%, rgba(8, 22, 42, 0.9) 60%, rgba(4, 12, 24, 0.97) 100%), url("https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1920&q=80") center/cover no-repeat',
        padding: '36px 20px 54px',
        display: 'flex',
        alignItems: 'flex-start'
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 320,
          height: 320,
          background: 'radial-gradient(circle, rgba(244, 192, 74, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          maxWidth: 1320,
          margin: '0 auto',
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr 480px',
          gap: 48,
          alignItems: 'start',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* LEFT COLUMN: HERO INFORMATION & PERKS */}
        <div style={{ color: '#ffffff', paddingRight: 20 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: '#ffffff',
              textTransform: 'uppercase',
              margin: '0 0 2px 0',
              letterSpacing: 1
            }}
          >
            TRẢI NGHIỆM ĐIỆN ẢNH
          </h1>
          <div
            style={{
              fontSize: 42,
              fontWeight: 900,
              color: '#f4c04a',
              textTransform: 'uppercase',
              letterSpacing: 2,
              marginBottom: 12
            }}
          >
            ĐỈNH CAO
          </div>
          <p
            style={{
              fontSize: 14,
              color: '#cbd5e1',
              lineHeight: 1.7,
              margin: '0 0 30px 0'
            }}
          >
            Đặt vé nhanh chóng - Thanh toán tiện lợi
            <br />
            Ưu đãi hấp dẫn dành riêng cho bạn
          </p>

          {/* 4 Feature Badges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxWidth: 440 }}>
            {/* Perk 1 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(10, 25, 47, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '11px 18px'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: '1.5px solid rgba(244, 192, 74, 0.45)',
                  background: 'rgba(244, 192, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Ticket size={21} color="#f4c04a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                  Đặt vé dễ dàng
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Chọn phim - Chọn ghế - Thanh toán nhanh
                </div>
              </div>
            </div>

            {/* Perk 2 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(10, 25, 47, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '11px 18px'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: '1.5px solid rgba(244, 192, 74, 0.45)',
                  background: 'rgba(244, 192, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Percent size={21} color="#f4c04a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                  Ưu đãi hấp dẫn
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Nhiều chương trình khuyến mãi đặc biệt
                </div>
              </div>
            </div>

            {/* Perk 3 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(10, 25, 47, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '11px 18px'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: '1.5px solid rgba(244, 192, 74, 0.45)',
                  background: 'rgba(244, 192, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Crown size={21} color="#f4c04a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                  Thành viên Aurora
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Tích điểm đổi quà - Nâng hạng thành viên
                </div>
              </div>
            </div>

            {/* Perk 4 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(10, 25, 47, 0.65)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 12,
                padding: '11px 18px'
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  border: '1.5px solid rgba(244, 192, 74, 0.45)',
                  background: 'rgba(244, 192, 74, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <ShieldCheck size={21} color="#f4c04a" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff', marginBottom: 2 }}>
                  An toàn & bảo mật
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  Thông tin của bạn luôn được bảo vệ
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: THE AUTH CARD (FIXED DIMENSIONS & STABLE POSITION) */}
        <div
          style={{
            position: 'relative',
            background: '#ffffff',
            borderRadius: 18,
            boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
            padding: '26px 30px 22px',
            width: '100%',
            maxWidth: 480,
            height: 615,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          {/* Close button inside card */}
          <button
            type="button"
            onClick={onClose}
            title="Quay lại trang chủ"
            style={{
              position: 'absolute',
              top: 18,
              right: 18,
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>

          {/* TOP HEADER OF CARD */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: '#fef9ee',
                border: '2px solid #f4c04a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e5a826',
                flexShrink: 0
              }}
            >
              <User size={23} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 900,
                  color: '#071526',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5
                }}
              >
                {mode === 'register' ? 'ĐĂNG KÝ TÀI KHOẢN' : 'ĐĂNG NHẬP'}
              </h2>
              <div style={{ width: 44, height: 3, background: '#f4c04a', borderRadius: 2, marginTop: 4 }} />
            </div>
          </div>

          {/* FORM AREA */}
          <form
            onSubmit={handleSubmit}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            {/* FIELDS CONTAINER (STABLE HEIGHT ACROSS MODES) */}
            <div
              style={{
                minHeight: 275,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: mode === 'login' ? 'center' : 'flex-start',
                gap: mode === 'login' ? 14 : 0
              }}
            >
              {mode === 'register' ? (
                <>
                  {/* Họ và tên */}
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                      Họ và tên
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '8px 12px',
                        background: '#ffffff'
                      }}
                    >
                      <User size={15} color="#94a3b8" />
                      <input
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Họ và tên"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                      />
                    </div>
                  </div>

                  {/* Email & Số điện thoại (2 Columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Email
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 11px',
                          background: '#ffffff'
                        }}
                      >
                        <Mail size={15} color="#94a3b8" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="Email"
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Số điện thoại
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 11px',
                          background: '#ffffff'
                        }}
                      >
                        <Phone size={15} color="#94a3b8" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="Số điện thoại"
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mật khẩu & Nhập lại mật khẩu (2 Columns) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Mật khẩu
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#ffffff'
                        }}
                      >
                        <Lock size={15} color="#94a3b8" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Mật khẩu"
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ border: 'none', background: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#334155', marginBottom: 4 }}>
                        Nhập lại mật khẩu
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 10px',
                          background: '#ffffff'
                        }}
                      >
                        <Lock size={15} color="#94a3b8" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Nhập lại mật khẩu"
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={{ border: 'none', background: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                        >
                          {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* CAPTCHA ROW */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#f0fdf4',
                        border: '1px dashed #86efac',
                        borderRadius: 8,
                        padding: '6px 10px'
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "'Courier New', monospace",
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: 4,
                          color: '#15803d',
                          userSelect: 'none'
                        }}
                      >
                        {captchaCode}
                      </span>
                      <button
                        type="button"
                        onClick={generateCaptcha}
                        title="Đổi mã xác thực"
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex', padding: 2 }}
                      >
                        <RotateCw size={15} />
                      </button>
                    </div>

                    <div>
                      <input
                        value={captchaInput}
                        onChange={e => setCaptchaInput(e.target.value)}
                        placeholder="Nhập mã xác thực"
                        style={{
                          width: '100%',
                          border: '1px solid #cbd5e1',
                          borderRadius: 8,
                          padding: '8px 12px',
                          fontSize: 13,
                          outline: 'none',
                          color: '#0f172a'
                        }}
                      />
                    </div>
                  </div>

                  {/* Checkbox agreement */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 2 }}>
                    <input
                      type="checkbox"
                      id="agreeTerms"
                      checked={agreeTerms}
                      onChange={e => setAgreeTerms(e.target.checked)}
                      style={{ marginTop: 2, cursor: 'pointer' }}
                    />
                    <label htmlFor="agreeTerms" style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4, cursor: 'pointer' }}>
                      Đăng ký để nhận thông tin khuyến mãi từ chúng tôi và đồng ý{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: '#2563eb',
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontSize: 11.5,
                          fontWeight: 700
                        }}
                      >
                        Điều khoản và điều kiện
                      </button>
                    </label>
                  </div>
                </>
              ) : (
                <>
                  {/* LOGIN MODE FIELDS */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Email hoặc số điện thoại
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: '#ffffff'
                      }}
                    >
                      <Mail size={16} color="#94a3b8" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Nhập email của bạn"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                      Mật khẩu
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        border: '1px solid #cbd5e1',
                        borderRadius: 8,
                        padding: '10px 12px',
                        background: '#ffffff'
                      }}
                    >
                      <Lock size={16} color="#94a3b8" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        style={{ width: '100%', border: 'none', outline: 'none', fontSize: 13, color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ border: 'none', background: 'none', padding: 0, color: '#94a3b8', cursor: 'pointer', display: 'flex' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                      />
                      Ghi nhớ tài khoản
                    </label>
                    <a href="#" style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                      Quên mật khẩu?
                    </a>
                  </div>
                </>
              )}
            </div>

            {/* BOTTOM ACTIONS (ANCHORED IN SAME POSITION) */}
            <div style={{ marginTop: 10 }}>
              {/* Error Display */}
              {error && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    borderRadius: 8,
                    padding: '7px 10px',
                    fontSize: 11.5,
                    marginBottom: 8
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '11px 0',
                  background: isSubmitting ? '#475569' : '#071526',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: isSubmitting ? 'wait' : 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  transition: 'background 0.2s',
                  boxShadow: '0 4px 12px rgba(7, 21, 38, 0.25)'
                }}
              >
                {isSubmitting
                  ? 'ĐANG XỬ LÝ...'
                  : mode === 'register'
                  ? 'ĐĂNG KÝ TÀI KHOẢN NGAY'
                  : 'ĐĂNG NHẬP NGAY'}
              </button>

              {/* DIVIDER: HOẶC */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  margin: '12px 0 10px'
                }}
              >
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1 }}>
                  HOẶC
                </span>
                <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
              </div>

              {/* SOCIAL BUTTONS */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Google Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSocialLogin('google')}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#334155',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{mode === 'register' ? 'Đăng ký với Google' : 'Đăng nhập với Google'}</span>
                </button>

                {/* Facebook Button */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSocialLogin('facebook')}
                  style={{
                    width: '100%',
                    padding: '8px 14px',
                    background: '#1877f2',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10
                  }}
                >
                  <Facebook size={16} fill="#ffffff" color="#ffffff" />
                  <span>{mode === 'register' ? 'Đăng ký với Facebook' : 'Đăng nhập với Facebook'}</span>
                </button>
              </div>

              {/* Bottom Switch Mode Link */}
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#64748b' }}>
                {mode === 'register' ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                <button
                  type="button"
                  onClick={() => handleSwitch(mode === 'register' ? 'login' : 'register')}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563eb',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  {mode === 'register' ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ─── TERMS & CONDITIONS MODAL ───────────────────────── */}
      {showTermsModal && (
        <div
          onClick={() => setShowTermsModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(7, 21, 38, 0.78)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: 16,
              maxWidth: 660,
              width: '100%',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f8fafc'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: 'rgba(244,192,74,0.18)',
                    border: '1px solid #f4c04a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#b47805'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#071526' }}>
                    ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG
                  </h3>
                  <p style={{ margin: 0, fontSize: 11.5, color: '#64748b' }}>
                    Áp dụng cho khách hàng & thành viên hệ thống Aurora Cinema
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  border: 'none',
                  background: '#e2e8f0',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div
              style={{
                padding: '22px 26px',
                overflowY: 'auto',
                fontSize: 13,
                lineHeight: 1.65,
                color: '#334155'
              }}
            >
              {/* Section 1 */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  1. Giới thiệu chung
                </h4>
                <p style={{ margin: 0, color: '#475569' }}>
                  Chào mừng quý khách đến với hệ thống rạp chiếu phim <strong>Aurora Cinema</strong>. Khi đăng ký tài khoản thành viên hoặc sử dụng dịch vụ trực tuyến của chúng tôi, quý khách xác nhận đã đọc, hiểu và đồng ý tuân thủ toàn bộ các điều khoản và điều kiện được quy định dưới đây.
                </p>
              </div>

              {/* Section 2 */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  2. Đăng ký & Bảo mật tài khoản
                </h4>
                <ul style={{ margin: '0', paddingLeft: 18, color: '#475569' }}>
                  <li>Khách hàng cam kết cung cấp thông tin đăng ký (Họ tên, Email, Số điện thoại) chính xác, trung thực và thuộc quyền sở hữu của chính mình.</li>
                  <li>Khách hàng có trách nhiệm tự bảo mật thông tin tài khoản và mật khẩu. Aurora Cinema không chịu trách nhiệm đối với các tổn thất phát sinh do khách hàng làm lộ thông tin đăng nhập cho bên thứ ba.</li>
                  <li>Mỗi số điện thoại và email chỉ được liên kết với một tài khoản thành viên Aurora Cinema duy nhất.</li>
                </ul>
              </div>

              {/* Section 3 */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  3. Quy định đặt vé & Thanh toán trực tuyến
                </h4>
                <ul style={{ margin: '0', paddingLeft: 18, color: '#475569' }}>
                  <li>Sau khi hoàn tất thanh toán vé xem phim, mã vé điện tử (Mã QR / Barcode) sẽ được gửi đến email đăng ký và lưu trữ trong mục vé của quý khách.</li>
                  <li>Quý khách vui lòng đến rạp trước giờ chiếu tối thiểu 10 - 15 phút để làm thủ tục vào phòng chiếu hoặc quét vé tự động.</li>
                  <li>Vé xem phim đã thanh toán thành công tuân thủ theo chính sách đổi/trả vé của cụm rạp trước giờ chiếu tối thiểu 60 phút theo quy định hiện hành.</li>
                </ul>
              </div>

              {/* Section 4 */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  4. Quyền lợi thành viên & Tích điểm Aurora
                </h4>
                <ul style={{ margin: '0', paddingLeft: 18, color: '#475569' }}>
                  <li>Thành viên được tích điểm thưởng với mỗi giao dịch mua vé xem phim và combo bắp nước trực tuyến hoặc tại quầy.</li>
                  <li>Điểm thưởng có thể dùng để đổi vé xem phim, combo bắp nước hoặc các quà tặng ưu đãi độc quyền theo từng hạng thành viên (Standard, Silver, Gold, Platinum).</li>
                  <li>Điểm thưởng thành viên có thời hạn sử dụng theo niên độ quy định của chương trình khách hàng thân thiết.</li>
                </ul>
              </div>

              {/* Section 5 */}
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  5. Quy định văn hóa phòng chiếu & Bản quyền
                </h4>
                <ul style={{ margin: '0', paddingLeft: 18, color: '#475569' }}>
                  <li><strong>Tuyệt đối nghiêm cấm:</strong> Mọi hành vi quay phim, chụp ảnh, ghi âm hoặc phát trực tiếp (livestream) nội dung phim trong phòng chiếu. Mọi hành vi vi phạm sẽ bị xử lý theo Luật Sở hữu trí tuệ của Việt Nam.</li>
                  <li>Giữ trật tự, chuyển điện thoại sang chế độ rung, không gây ảnh hưởng đến trải nghiệm của khán giả xung quanh.</li>
                  <li>Không mang đồ ăn, thức uống có mùi từ bên ngoài vào phòng chiếu của rạp.</li>
                </ul>
              </div>

              {/* Section 6 */}
              <div>
                <h4 style={{ margin: '0 0 6px', fontSize: 13.5, fontWeight: 800, color: '#071526' }}>
                  6. Bảo vệ quyền riêng tư & Dữ liệu cá nhân
                </h4>
                <p style={{ margin: 0, color: '#475569' }}>
                  Aurora Cinema cam kết bảo mật tuyệt đối các thông tin cá nhân của quý khách theo các tiêu chuẩn bảo vệ dữ liệu. Thông tin cá nhân chỉ được sử dụng để quản lý tài khoản, gửi thông tin giao dịch vé, chăm sóc khách hàng và gửi ưu đãi khi được quý khách đồng ý.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 12
              }}
            >
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: '9px 18px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer'
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setAgreeTerms(true);
                  setShowTermsModal(false);
                }}
                style={{
                  padding: '9px 22px',
                  background: '#071526',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#f4c04a',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(7, 21, 38, 0.25)'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Tôi đã hiểu và đồng ý</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
