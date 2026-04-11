import React, { useState } from 'react';
import authApi from '../../services/auth.api';
import { AuthField, AuthShell } from './AuthModule';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
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
    <AuthShell
      title="Forgot Password"
      description="Recover access by requesting and verifying a reset OTP."
      error={error}
      success={step === 'done' ? 'Password reset successful. You can log in now.' : message}
    >
      {step === 'request' ? (
        <form onSubmit={submitRequest} className="auth-form">
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
          <button type="submit" className="auth-button primary">Send reset code</button>
        </form>
      ) : null}

      {step === 'verifyOtp' ? (
        <form onSubmit={submitVerifyOtp} className="auth-form">
          <AuthField id="otp" label="Reset OTP">
            <input
              id="otp"
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="4-digit code"
              required
              className="auth-input"
            />
          </AuthField>
          <button type="submit" className="auth-button primary">Verify code</button>
        </form>
      ) : null}

      {step === 'resetPassword' ? (
        <form onSubmit={submitResetPassword} className="auth-form">
          <AuthField id="newPassword" label="New password">
            <div className="auth-password-wrapper">
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                className="auth-input"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowNewPassword((prev) => !prev)}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
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
          <button type="submit" className="auth-button primary">Reset password</button>
        </form>
      ) : null}

      <div className="auth-links">
        <a href="/login">Back to login</a>
      </div>
    </AuthShell>
  );
}
