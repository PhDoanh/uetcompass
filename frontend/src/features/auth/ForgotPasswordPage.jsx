import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Compass, Eye, EyeOff, Lock, LockKeyhole, Mail, Send } from 'lucide-react';
import authApi from '../../services/auth.api';
import { useNotification } from '../general/NotificationContainer';
import { AuthField, AuthShell } from './AuthModule';
import { navigateTo } from '../../shared/navigation';

const BUTTON_DELAY_MS = 5000;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export default function ForgotPasswordPage() {
  const notificationApi = useNotification();
  const addNotification = notificationApi?.addNotification || (() => {});
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isButtonCoolingDown, setIsButtonCoolingDown] = useState(false);
  const buttonDelayTimerRef = useRef(null);
  const isNewPasswordValid = PASSWORD_POLICY_REGEX.test(String(newPassword || ''));

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

  async function submitRequest(event) {
    event.preventDefault();
    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setMessage('');

    try {
      const result = await authApi.forgotPassword({ email });
      setMessage(result.message || 'Mã khôi phục đã được gửi.');
      addNotification(result.message || 'Mã khôi phục đã được gửi.', 'success');
      setStep('verifyOtp');
    } catch (err) {
      const nextError = err?.code === 'EMAIL_NOT_FOUND'
        ? 'Email không tồn tại trong hệ thống.'
        : (err.message || 'Không thể gửi mã khôi phục.');
      setError(nextError);
      addNotification(nextError, 'error');
    }
  }

  async function submitVerifyOtp(event) {
    event.preventDefault();
    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setMessage('');

    try {
      const result = await authApi.verifyResetOtp({ email, otp });
      setResetToken(result.resetToken || '');
      setMessage(result.message || 'Xác thực OTP thành công. Bạn có thể đặt mật khẩu mới.');
      addNotification(result.message || 'Xác thực OTP thành công. Bạn có thể đặt mật khẩu mới.', 'success');
      setStep('resetPassword');
    } catch (err) {
      setError(err.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn.');
      addNotification(err.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn.', 'error');
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    if (!isNewPasswordValid) {
      const nextError = 'Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự @$!%*?&.';
      setError(nextError);
      addNotification(nextError, 'warning');
      return;
    }

    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setMessage('');

    try {
      const result = await authApi.resetPassword({ resetToken, newPassword });
      setMessage(result.message || 'Đặt lại mật khẩu thành công.');
      addNotification(result.message || 'Đặt lại mật khẩu thành công.', 'success');
      navigateTo('/login');
    } catch (err) {
      setError(err.message || 'Không thể đặt lại mật khẩu.');
      addNotification(err.message || 'Không thể đặt lại mật khẩu.', 'error');
    }
  }

  async function handleResendOtp() {
    if (isButtonCoolingDown) {
      return;
    }
    triggerButtonDelay();

    setError('');
    setMessage('');

    try {
      const result = await authApi.forgotPassword({ email });
      setMessage(result.message || 'Mã khôi phục mới đã được gửi.');
      addNotification(result.message || 'Mã khôi phục mới đã được gửi.', 'success');
    } catch (err) {
      const nextError = err?.code === 'EMAIL_NOT_FOUND'
        ? 'Email không tồn tại trong hệ thống.'
        : (err.message || 'Không thể gửi lại mã khôi phục.');
      setError(nextError);
      addNotification(nextError, 'error');
    }
  }

  function onOtpDigitChange(index, value) {
    const safe = String(value || '').replace(/\D/g, '').slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = safe;
      const otp = next.join('');
      setOtp(otp);
      return next;
    });

    if (safe && typeof document !== 'undefined') {
      const nextInput = document.getElementById(`forgot-otp-digit-${index + 1}`);
      if (nextInput) {
        nextInput.focus();
      }
    }
  }

  function onOtpDigitKeyDown(index, event) {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0 && typeof document !== 'undefined') {
      const prevInput = document.getElementById(`forgot-otp-digit-${index - 1}`);
      if (prevInput) {
        prevInput.focus();
      }
    }
  }

  const shellMeta = {
    request: {
      title: 'UETCompass',
      description: 'Quên mật khẩu? Nhập email VNU để nhận mã khôi phục.',
      icon: <LockKeyhole size={24} />,
      backLink: { href: '/login', label: 'Quay lại' },
    },
    verifyOtp: {
      title: 'UETCompass',
      description: 'Nhập mã xác thực 4 số đã gửi tới email của bạn.',
      icon: <Compass size={24} />,
    },
    resetPassword: {
      title: 'UETCompass',
      description: 'Thiết lập mật khẩu mới cho tài khoản của bạn.',
      icon: <Compass size={24} />,
    },
    done: {
      title: 'UETCompass',
      description: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
      icon: <Compass size={24} />,
    },
  };

  const meta = shellMeta[step] || shellMeta.request;

  return (
    <AuthShell
      title={meta.title}
      description={meta.description}
      error={error}
      success={step === 'done' ? 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.' : message}
      icon={meta.icon}
      backLink={meta.backLink}
      footerNote="Bằng cách tiếp tục, bạn đồng ý với các chính sách và điều khoản dịch vụ của UETCompass"
      footerSecondary="Chính sách bảo mật / Điều khoản sử dụng"
      footerTertiary="© 2026 UETCompass • Phát triển bởi sinh viên UET"
    >
      {step === 'request' ? (
        <form onSubmit={submitRequest} className="auth-form">
          <AuthField id="email" label="Email VNU">
            <div className="auth-input-wrap">
              <Mail size={16} className="auth-leading-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@vnu.edu.vn"
                required
                className="auth-input has-leading"
              />
            </div>
          </AuthField>
          <button type="submit" className="auth-button primary" disabled={isButtonCoolingDown}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Gửi mã khôi phục
              <Send size={14} />
            </span>
          </button>
        </form>
      ) : null}

      {step === 'verifyOtp' ? (
        <form onSubmit={submitVerifyOtp} className="auth-form auth-otp-panel">
          <div className="auth-otp-grid">
            {otpDigits.map((digit, index) => (
              <input
                key={index}
                id={`forgot-otp-digit-${index}`}
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
            <button type="button" onClick={handleResendOtp} disabled={isButtonCoolingDown}>Gửi lại mã</button>
          </p>
          <button type="submit" className="auth-button primary" disabled={isButtonCoolingDown}>Xác thực mã</button>
        </form>
      ) : null}

      {step === 'resetPassword' ? (
        <form onSubmit={submitResetPassword} className="auth-form">
          <AuthField id="newPassword" label="Mật khẩu mới">
            <div className="auth-password-wrapper">
              <Lock size={16} className="auth-leading-icon" />
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="auth-input has-leading has-trailing"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <EyeOff className="auth-eye-icon" /> : <Eye className="auth-eye-icon" />}
              </button>
            </div>
            <p className="auth-helper-text">
              Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự @$!%*?&.
            </p>
          </AuthField>
          <button
            type="submit"
            className="auth-button primary"
            disabled={isButtonCoolingDown || !isNewPasswordValid}
          >
            Đổi mật khẩu
          </button>

          <div className="auth-links" style={{ marginTop: 2 }}>
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
            >
              <ArrowLeft size={14} />
              Quay lại đăng nhập
            </button>
          </div>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="auth-links">
          <button type="button" onClick={() => navigateTo('/login')} className="auth-inline-link">Quay lại đăng nhập</button>
        </div>
      ) : null}
    </AuthShell>
  );
}
