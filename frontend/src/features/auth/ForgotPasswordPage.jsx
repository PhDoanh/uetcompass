import React, { useState } from 'react';
import authApi from '../../services/auth.api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submitRequest(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await authApi.forgotPassword({ email });
      setMessage(result.message || 'If an account exists, a reset code has been sent.');
      setStep('verifyOtp');
    } catch (err) {
      setError(err.message || 'Failed to request reset code.');
    }
  }

  async function submitVerifyOtp(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await authApi.verifyResetOtp({ email, otp });
      setResetToken(result.resetToken || '');
      setMessage(result.message || 'OTP verified. You can now set a new password.');
      setStep('resetPassword');
    } catch (err) {
      setError(err.message || 'Invalid or expired reset code.');
    }
  }

  async function submitResetPassword(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      const result = await authApi.resetPassword({ resetToken, newPassword });
      setMessage(result.message || 'Password reset completed.');
      setStep('done');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    }
  }

  return (
    <main style={{ maxWidth: 460, margin: '64px auto', padding: 16 }}>
      <h1>Forgot Password</h1>

      {step === 'request' ? (
        <form onSubmit={submitRequest}>
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
          <button type="submit">Send reset code</button>
        </form>
      ) : null}

      {step === 'verifyOtp' ? (
        <form onSubmit={submitVerifyOtp}>
          <label htmlFor="otp">Reset OTP</label>
          <input
            id="otp"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            placeholder="4-digit code"
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button type="submit">Verify code</button>
        </form>
      ) : null}

      {step === 'resetPassword' ? (
        <form onSubmit={submitResetPassword}>
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            style={{ width: '100%', marginBottom: 12 }}
          />
          <button type="submit">Reset password</button>
        </form>
      ) : null}

      {step === 'done' ? <p>Password reset successful. You can log in now.</p> : null}

      {message ? <p>{message}</p> : null}
      {error ? <p style={{ color: '#b42318' }}>{error}</p> : null}
    </main>
  );
}
