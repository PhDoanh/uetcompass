import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Compass, Eye, EyeOff, Info, Lock, Mail, User } from 'lucide-react';
import authApi from '../../services/auth.api';
import { useNotification } from '../general/NotificationContainer';
import { AuthField, AuthShell } from './AuthModule';
import { navigateTo } from '../../shared/navigation';

function isVnuEmail(value) {
  return /@vnu\.edu\.vn$/i.test(String(value || '').trim());
}

const BUTTON_DELAY_MS = 5000;
const REGISTER_SUCCESS_NOTICE_KEY = 'registerSuccessNotice';
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function RegisterPage() {
  const notificationApi = useNotification();
  const addNotification = notificationApi?.addNotification || (() => {});
  const [step, setStep] = useState('register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', otp: '' });
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isButtonCoolingDown, setIsButtonCoolingDown] = useState(false);
  const buttonDelayTimerRef = useRef(null);

  function triggerButtonDelay() {
    setIsButtonCoolingDown(true);
    if (buttonDelayTimerRef.current) {
      window.clearTimeout(buttonDelayTimerRef.current);
    }
    buttonDelayTimerRef.current = window.setTimeout(() => {
      setIsButtonCoolingDown(false);
      buttonDelayTimerRef.current = null;
    }, BUTTON_DELAY_MS);
  }

  useEffect(() => () => {
    if (buttonDelayTimerRef.current) {
      window.clearTimeout(buttonDelayTimerRef.current);
    }
  }, []);

  const emailError = useMemo(() => {
    if (!form.email.trim()) {
      return '';
    }
    return isVnuEmail(form.email) ? '' : 'Email phải có đuôi @vnu.edu.vn';
  }, [form.email]);

  const passwordError = useMemo(() => {
    if (!form.password) {
      return '';
    }
    return PASSWORD_POLICY_REGEX.test(String(form.password || ''))
      ? ''
      : 'Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt';
  }, [form.password]);

  async function submitRegister(event) {
    event.preventDefault();
    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setInfo('');

    if (emailError) {
      setError(emailError);
      addNotification(emailError, 'warning');
      return;
    }

    if (passwordError) {
      setError(passwordError);
      addNotification(passwordError, 'warning');
      return;
    }

    try {
      const result = await authApi.register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
      });
      setInfo(result.message || 'Đã gửi mã OTP');
      addNotification(result.message || 'Đã gửi mã OTP', 'success');
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
      addNotification(err.message || 'Đăng ký thất bại', 'error');
    }
  }

  async function submitVerify(event) {
    event.preventDefault();
    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setInfo('');

    try {
      const result = await authApi.verifyEmail({
        email: form.email,
        otp: form.otp,
      });
      const successMessage = result.message || 'Đăng ký thành công. Bạn có thể đăng nhập ngay.';
      setInfo(successMessage);
      addNotification(successMessage, 'success');
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(REGISTER_SUCCESS_NOTICE_KEY, successMessage);
        navigateTo('/login');
      }
    } catch (err) {
      setError(err.message || 'Xác thực thất bại');
      addNotification(err.message || 'Xác thực thất bại', 'error');
    }
  }

  async function handleResend() {
    if (isButtonCoolingDown) {
      addNotification('Vui lòng đợi vài giây trước khi gửi lại mã.', 'warning');
      return;
    }
    triggerButtonDelay();

    setError('');
    setInfo('');

    try {
      const result = await authApi.resendOtp({ email: form.email });
      setInfo(result.message || 'Đã gửi lại OTP');
      addNotification(result.message || 'Đã gửi lại OTP', 'success');
    } catch (err) {
      const nextMessage = err?.code === 'NO_PENDING_VERIFICATION'
        ? 'Không tìm thấy phiên xác thực đang chờ. Vui lòng đăng ký lại để nhận OTP mới.'
        : (err.message || 'Gửi lại OTP thất bại');
      setError(nextMessage);
      addNotification(nextMessage, 'error');
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
          ? ''
          : 'Nhập mã OTP 4 số được gửi đến email của bạn.'
      }
      error={error || emailError || passwordError}
      success={info}
      icon={<Compass size={24} />}
      tabs={[
        { href: '/login', label: 'Đăng nhập', active: false },
        { href: '/register', label: 'Đăng ký', active: true },
      ]}
      footerNote="Bằng cách tiếp tục, bạn đồng ý với các chính sách và điều khoản dịch vụ của UETCompass"
      footerSecondary="Chính sách bảo mật / Điều khoản sử dụng"
      footerTertiary="© 2026 UETCompass • Phát triển bởi sinh viên UET"
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

            <p className={passwordError ? 'auth-helper-text error' : 'auth-helper-text'}>
              <AlertTriangle size={12} className="auth-helper-icon" />
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt
            </p>

          </AuthField>

          <button
            type="submit"
            disabled={Boolean(emailError) || Boolean(passwordError) || isButtonCoolingDown}
            className={`auth-button primary ${emailError || passwordError || isButtonCoolingDown ? 'disabled' : ''}`}
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
            <button type="button" onClick={handleResend} disabled={isButtonCoolingDown}>Gửi lại mã</button>
          </p>

          <button type="submit" className="auth-button primary" disabled={form.otp.length !== 4 || isButtonCoolingDown}>
            Xác thực
          </button>
        </form>
      )}
    </AuthShell>
  );
}
