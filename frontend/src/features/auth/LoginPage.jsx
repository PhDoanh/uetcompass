import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { Compass, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import authApi from '../../services/auth.api';
import { decidePostLoginRoute, useAuth } from '../../providers/AuthProvider';
import { AuthField, AuthShell } from './AuthModule';

const ONBOARDING_AUTO_OPEN_ONCE_KEY = 'onboardingAutoOpenOnce';
const BUTTON_DELAY_MS = 2000;

function formatCountdown(seconds) {
  const safe = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`;
}

export default function LoginPage() {
  const { applyLoginResult } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [lockRemaining, setLockRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isButtonCoolingDown, setIsButtonCoolingDown] = useState(false);
  const buttonDelayTimerRef = useRef(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const hasGoogleClientId = Boolean(String(googleClientId).trim());

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

  useEffect(() => {
    if (lockRemaining <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLockRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockRemaining]);

  useEffect(() => () => {
    if (buttonDelayTimerRef.current) {
      window.clearTimeout(buttonDelayTimerRef.current);
    }
  }, []);

  const lockMessage = useMemo(() => {
    if (lockRemaining <= 0) {
      return '';
    }
    return `Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau ${formatCountdown(lockRemaining)}.`;
  }, [lockRemaining]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (lockRemaining > 0 || isButtonCoolingDown) {
      return;
    }

    triggerButtonDelay();

    setIsSubmitting(true);
    try {
      const result = await authApi.login({ email, password });
      applyLoginResult(result);
      if (result?.onboardingState !== 'COMPLETED' && typeof window !== 'undefined') {
        window.sessionStorage.setItem(ONBOARDING_AUTO_OPEN_ONCE_KEY, '1');
      }
      window.location.assign(decidePostLoginRoute(result?.onboardingState));
    } catch (err) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        const seconds = Number(err?.details?.remainingSeconds || 0);
        setLockRemaining(Math.max(1, seconds));
      }
      setError('Email hoặc mật khẩu không đúng.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    try {
      const result = await authApi.googleLogin({ credential: credentialResponse?.credential });
      applyLoginResult(result);
      if (result?.onboardingState !== 'COMPLETED' && typeof window !== 'undefined') {
        window.sessionStorage.setItem(ONBOARDING_AUTO_OPEN_ONCE_KEY, '1');
      }
      window.location.assign(decidePostLoginRoute(result?.onboardingState));
    } catch (err) {
      if (err?.code === 'GOOGLE_DOMAIN_RESTRICTED') {
        setError('Vui lòng sử dụng tài khoản Google @vnu.edu.vn.');
        return;
      }
      setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
    }
  }

  const content = (
    <AuthShell
      title="UETCompass"
      description="Dẫn lối cho sự nghiệp tương lai của bạn"
      isLoading={isSubmitting}
      error={error || lockMessage}
      icon={<Compass size={24} />}
      tabs={[
        { href: '/login', label: 'Đăng nhập', active: true },
        { href: '/register', label: 'Đăng ký', active: false },
      ]}
      footerNote="Bằng cách tiếp tục, bạn đồng ý với các chính sách và điều khoản dịch vụ của UETCompass"
      footerLinks={[
        { href: '#', label: 'Trung tâm hỗ trợ' },
        { href: '#', label: 'Chính sách & Điều khoản' },
      ]}
    >
      <div className="auth-google-block">
        {hasGoogleClientId ? (
          <div className="auth-google-button-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Đăng nhập Google thất bại. Vui lòng thử lại.')}
              useOneTap={false}
              theme="outline"
              shape="pill"
              size="large"
              text="continue_with"
              width="350"
            />
          </div>
        ) : (
          <p className="auth-status helper tight">Không thể dùng đăng nhập Google: thiếu VITE_GOOGLE_CLIENT_ID.</p>
        )}
        <div className="auth-google-divider">Hoặc</div>
      </div>

      <form onSubmit={handleSubmit} className="auth-form" style={{ marginTop: 12 }}>
        <AuthField id="email" label="Email">
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

        <AuthField
          id="password"
          label="Mật khẩu"
          action={<a href="/forgot-password" className="auth-inline-link">Quên mật khẩu?</a>}
        >
          <div className="auth-password-wrapper">
            <Lock size={16} className="auth-leading-icon" />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
        </AuthField>

        <button
          type="submit"
          disabled={isSubmitting || lockRemaining > 0 || isButtonCoolingDown}
          className={`auth-button primary ${isSubmitting || lockRemaining > 0 || isButtonCoolingDown ? 'disabled' : ''}`}
        >
          {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>

      <div className="auth-links">
        <a href="/register">Tạo tài khoản</a>
        <a href="/forgot-password">Quên mật khẩu</a>
      </div>
    </AuthShell>
  );

  if (!hasGoogleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
