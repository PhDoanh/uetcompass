import React, { useMemo, useState } from 'react';
import authApi from '../../services/auth.api';
import { AuthField, AuthShell } from './AuthModule';

function isVnuEmail(value) {
  return /@vnu\.edu\.vn$/i.test(String(value || '').trim());
}

export default function RegisterPage() {
  const [step, setStep] = useState('register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', otp: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const emailError = useMemo(() => {
    if (!form.email.trim()) {
      return '';
    }
    return isVnuEmail(form.email) ? '' : 'Email must end with @vnu.edu.vn';
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
      setInfo(result.message || 'OTP sent');
      setStep('verify');
    } catch (err) {
      setError(err.message || 'Registration failed');
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
      setInfo(result.message || 'Email verified');
      if (typeof window !== 'undefined') {
        window.location.assign('/login');
      }
    } catch (err) {
      setError(err.message || 'Verification failed');
    }
  }

  async function handleResend() {
    setError('');
    setInfo('');

    try {
      const result = await authApi.resendOtp({ email: form.email });
      setInfo(result.message || 'OTP resent');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    }
  }

  return (
    <AuthShell
      title="Create Account"
      description={
        step === 'register'
          ? 'Register with your @vnu.edu.vn email to receive OTP verification.'
          : 'Enter the OTP sent to your email to verify your account.'
      }
      error={error || emailError}
      success={info}
    >
      {step === 'register' ? (
        <form onSubmit={submitRegister} className="auth-form">
          <AuthField id="fullName" label="Full name">
            <input
              id="fullName"
              placeholder="Nguyen Van A"
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              required
              className="auth-input"
            />
          </AuthField>

          <AuthField id="email" label="Email">
            <input
              id="email"
              type="email"
              placeholder="student@vnu.edu.vn"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
              className="auth-input"
            />
          </AuthField>

          <AuthField id="password" label="Password">
            <div className="auth-password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
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
            disabled={Boolean(emailError)}
            className={`auth-button primary ${emailError ? 'disabled' : ''}`}
          >
            Register
          </button>
        </form>
      ) : (
        <form onSubmit={submitVerify} className="auth-form">
          <AuthField id="otp" label="Verification OTP">
            <input
              id="otp"
              placeholder="4-digit OTP"
              value={form.otp}
              onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
              required
              className="auth-input"
            />
          </AuthField>

          <div className="auth-row">
            <button type="submit" className="auth-button primary">
              Verify
            </button>
            <button type="button" onClick={handleResend} className="auth-button secondary">
              Resend OTP
            </button>
          </div>
        </form>
      )}

      <div className="auth-links">
        <a href="/login">Back to login</a>
      </div>
    </AuthShell>
  );
}
