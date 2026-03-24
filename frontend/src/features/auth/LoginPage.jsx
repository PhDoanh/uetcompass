import React, { useEffect, useMemo, useState } from 'react';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import authApi from './auth.api';
import { decidePostLoginRoute, useAuth } from '../../providers/AuthProvider';

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
  const [error, setError] = useState('');
  const [lockRemaining, setLockRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

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

  return (
    <GoogleOAuthProvider clientId={googleClientId || 'missing-google-client-id'}>
      <main style={{ maxWidth: 420, margin: '64px auto', padding: 16 }}>
        <h1>Email login</h1>
        <p>Sign in with your VNU account.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="student@vnu.edu.vn"
            required
            style={{ width: '100%', marginBottom: 12 }}
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />

          {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
          {lockMessage ? <p style={{ color: '#b42318' }}>{lockMessage}</p> : null}

          <button type="submit" disabled={isSubmitting || lockRemaining > 0}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google sign-in failed. Please try again.')}
            useOneTap={false}
          />
        </div>
      </main>
    </GoogleOAuthProvider>
  );
}
