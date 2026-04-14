import React, { useMemo, useState } from 'react';
import { Compass, Eye, EyeOff, Info, Lock, Mail, User } from 'lucide-react';
import authApi from '../../services/auth.api';
import { AuthField, AuthShell } from './AuthModule';

function isVnuEmail(value) {
  return /@vnu\.edu\.vn$/i.test(String(value || '').trim());
}

export default function RegisterPage() {
  const [step, setStep] = useState('register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', otp: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const passwordStrength = useMemo(() => {
    const value = String(form.password || '');
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 2) {
      return { level: 'Yếu', className: 'weak', activeBars: 1 };
    }
    if (score <= 4) {
      return { level: 'Trung bình', className: 'medium', activeBars: 2 };
    }
    return { level: 'Mạnh', className: 'strong', activeBars: 3 };
  }, [form.password]);

  const emailError = useMemo(() => {
    if (!form.email.trim()) {
      return '';
    }
    return isVnuEmail(form.email) ? '' : 'Email phải có đuôi @vnu.edu.vn';
  }, [form.email]);

  async function submitRegister(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    if (emailError) {
      setError(emailError);
      return;
    }

    try {
      const result = await authApi.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setInfo(result.message || 'Đã gửi mã OTP');
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    }
  }

  async function submitVerify(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    try {
      const result = await authApi.verifyEmail({
        email: form.email,
        otp: form.otp,
      });
      setInfo(result.message || 'Xác thực email thành công');
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    } catch (err) {
      setError(err.message || 'Xác thực thất bại');
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');

    try {
      const result = await authApi.resendOtp({ email: form.email });
      setInfo(result.message || 'Đã gửi lại OTP');
    } catch (err) {
      setError(err.message || 'Gửi lại OTP thất bại');
    }
  }

  function onOtpDigitChange(index, value) {
    const safe = String(value || '').replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = safe;
      const otp = next.join('');
      setForm((old) => ({ ...old, otp }));
      return next;
    });

    if (safe && typeof document !== 'undefined') {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function onOtpDigitKeyDown(index, event) {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0 && typeof document !== 'undefined') {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  return (
    <AuthShell
      title="UETCompass"
      description={
        step === 'register'
          ? 'Đăng ký tài khoản bằng email @vnu.edu.vn.'
          : 'Nhập mã OTP 4 số được gửi đến email của bạn.'
      }
      error={error || emailError}
      success={info}
      icon={<Compass size={24} />}
      tabs={[
        { href: '/login', label: 'Đăng nhập', active: false },
        { href: '/register', label: 'Đăng ký', active: true },
      ]}
      footerNote="Bằng cách tiếp tục, bạn đồng ý với các chính sách và điều khoản dịch vụ của UETCompass"
      footerLinks={[
        { href: '#', label: 'Trung tâm hỗ trợ' },
        { href: '#', label: 'Chính sách & Điều khoản' },
      ]}
    >
      {step === 'register' ? (
        <form onSubmit={submitRegister} className="auth-form">
          <AuthField id="fullName" label="Họ và tên">
            <div className="auth-input-wrap">
              <User size={16} className="auth-leading-icon" />
              <input
                id="fullName"
                placeholder="Nguyễn Văn A"
                value={form.fullName}
                onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                required
                className="auth-input has-leading"
              />
            </div>
          </AuthField>

          <AuthField id="email" label="Email">
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-leading-icon" />
              <input
                id="email"
                type="email"
                placeholder="student@vnu.edu.vn"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
                className="auth-input has-leading"
              />
            </div>
            <p className={emailError ? 'auth-helper-text error' : 'auth-helper-text'}>
              <Info size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
              Chỉ chấp nhận email @vnu.edu.vn.
            </p>
          </AuthField>

          <AuthField id="password" label="Mật khẩu">
            <div className="auth-password-wrapper">
              <Lock size={16} className="auth-leading-icon" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ít nhất 8 ký tự"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                className="auth-input has-leading has-trailing"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="auth-eye-icon" /> : <Eye className="auth-eye-icon" />}
              </button>
            </div>

            <div className="auth-strength">
              <div className="auth-strength-head">
                <span>Độ mạnh mật khẩu</span>
                <b className={passwordStrength.className}>{passwordStrength.level}</b>
              </div>
              <div className="auth-strength-bars">
                <span className={passwordStrength.activeBars >= 1 ? `on ${passwordStrength.className}` : ''} />
                <span className={passwordStrength.activeBars >= 2 ? `on ${passwordStrength.className}` : ''} />
                <span className={passwordStrength.activeBars >= 3 ? `on ${passwordStrength.className}` : ''} />
              </div>
            </div>
          </AuthField>

          <button
            type="submit"
            disabled={Boolean(emailError)}
            className={`auth-button primary ${emailError ? 'disabled' : ''}`}
          >
            Tạo tài khoản
          </button>
        </form>
      ) : (
        <form onSubmit={submitVerify} className="auth-form auth-otp-panel">
          <div className="auth-otp-grid">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                id={`otp-digit-${index}`}
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => onOtpDigitChange(index, e.target.value)}
                onKeyDown={(e) => onOtpDigitKeyDown(index, e)}
                required
              />
            ))}
          </div>

          <p className="auth-otp-hint">
            Không nhận được mã?
            {' '}
            <button type="button" onClick={handleResend}>Gửi lại mã</button>
          </p>

          <button type="submit" className="auth-button primary" disabled={form.otp.length !== 4}>
            Xác thực
          </button>
        </form>
      )}

      <div className="auth-links">
        <a href="/login">Quay lại đăng nhập</a>
      </div>
    </AuthShell>
  );
}
