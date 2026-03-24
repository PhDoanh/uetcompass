import React, { useMemo, useState } from 'react';
import authApi from './auth.api';

function isVnuEmail(value) {
  return /@vnu\.edu\.vn$/i.test(String(value || '').trim());
}

export default function RegisterPage() {
  const [step, setStep] = useState('register');
  const [form, setForm] = useState({ fullName: '', email: '', password: '', otp: '' });
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
    <div>
      {step === 'register' ? (
        <form onSubmit={submitRegister}>
          <input
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          {emailError ? <p>{emailError}</p> : null}
          <input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <button type="submit" disabled={Boolean(emailError)}>
            Register
          </button>
        </form>
      ) : (
        <form onSubmit={submitVerify}>
          <input
            placeholder="4-digit OTP"
            value={form.otp}
            onChange={(e) => setForm((prev) => ({ ...prev, otp: e.target.value }))}
          />
          <button type="submit">Verify</button>
          <button type="button" onClick={handleResend}>
            Resend OTP
          </button>
        </form>
      )}

      {error ? <p>{error}</p> : null}
      {info ? <p>{info}</p> : null}
    </div>
  );
}
