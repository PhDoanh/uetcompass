import React, { useEffect, useMemo, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import authApi from '../../services/auth.api';
import { decidePostLoginRoute, useAuth } from '../../providers/AuthProvider';
import { AuthField, AuthShell } from './AuthModule';

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
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const hasGoogleClientId = Boolean(String(googleClientId).trim());

  useEffect(() => {
    if (lockRemaining <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLockRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [lockRemaining]);

  const lockMessage = useMemo(() => {
    if (lockRemaining <= 0) {
      return '';
    }
    return `Too many failed attempts. Try again in ${formatCountdown(lockRemaining)}.`;
  }, [lockRemaining]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    if (lockRemaining > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authApi.login({ email, password });
      applyLoginResult(result);
      window.location.assign(decidePostLoginRoute(result?.onboardingState));
    } catch (err) {
      if (err?.code === 'ACCOUNT_LOCKED') {
        const seconds = Number(err?.details?.remainingSeconds || 0);
        setLockRemaining(Math.max(1, seconds));
      }
      setError('Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError('');
    try {
      const result = await authApi.googleLogin({ credential: credentialResponse?.credential });
      applyLoginResult(result);
      window.location.assign(decidePostLoginRoute(result?.onboardingState));
    } catch (err) {
      if (err?.code === 'GOOGLE_DOMAIN_RESTRICTED') {
        setError('Please use your @vnu.edu.vn Google account.');
        return;
      }
      setError('Google sign-in failed. Please try again.');
    }
  }

  const content = (
    <AuthShell
      title="Email Login"
      description="Sign in with your VNU account."
      isLoading={isSubmitting}
      error={error || lockMessage}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <AuthField id="email" label="Email">
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@vnu.edu.vn"
            required
            className="auth-input"
          />
        </AuthField>

        <AuthField id="password" label="Password">
          <div className="auth-password-wrapper">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="auth-input"
            />
            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="auth-eye-icon">
                <path
                  d="M2 12C3.7 8.2 7.3 5.5 12 5.5C16.7 5.5 20.3 8.2 22 12C20.3 15.8 16.7 18.5 12 18.5C7.3 18.5 3.7 15.8 2 12Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </div>
        </AuthField>

        <button
          type="submit"
          disabled={isSubmitting || lockRemaining > 0}
          className={`auth-button primary ${isSubmitting || lockRemaining > 0 ? 'disabled' : ''}`}
        >
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="auth-google-block">
        {hasGoogleClientId ? (
          <div className="auth-google-button-wrap">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Google sign-in failed. Please try again.')}
              useOneTap={false}
              theme="filled_blue"
              shape="pill"
              size="large"
              text="continue_with"
              width="360"
            />
          </div>
        ) : (
          <p className="auth-status helper">Google sign-in is unavailable: missing VITE_GOOGLE_CLIENT_ID.</p>
        )}
      </div>

      <div className="auth-links">
        <a href="/register">Create account</a>
        <a href="/forgot-password">Forgot password</a>
      </div>
    </AuthShell>
  );

  if (!hasGoogleClientId) {
    return content;
  }

  return <GoogleOAuthProvider clientId={googleClientId}>{content}</GoogleOAuthProvider>;
}
