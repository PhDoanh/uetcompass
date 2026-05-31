const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('./user.model');
const { RefreshToken } = require('./refreshToken.model');
const { sendResetOtpEmail } = require('./auth.email');
const { emitAuthEvent } = require('./audit.service');
const { enforceOtpResendPolicy } = require('./token.service');

const PASSWORD_HASH_ROUNDS = 12;
const RESET_OTP_EXPIRY_MS = 2 * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateOtp() {
  return String(crypto.randomInt(1000, 10000)).padStart(4, '0');
}

function hashResetToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword || ''), PASSWORD_HASH_ROUNDS);
}

async function verifyPassword(plainPassword, passwordHash) {
  if (!passwordHash) {
    return false;
  }
  return bcrypt.compare(String(plainPassword || ''), String(passwordHash));
}

async function requestPasswordReset({ email, requestIp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = String(requestIp || '').trim() || null;
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || user.status === 'soft-deleted') {
    throw buildError(404, 'EMAIL_NOT_FOUND', 'No account found for this email.');
  }

  const isResend = Boolean(user.passwordReset?.otp && user.passwordReset?.expiresAt);
  await enforceOtpResendPolicy({
    flowType: 'forgot_password',
    accountKey: normalizedEmail,
    requestIp: normalizedIp,
  });

  const otp = generateOtp();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordReset: {
          otp,
          expiresAt: new Date(Date.now() + RESET_OTP_EXPIRY_MS),
          attempts: 0,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
        },
      },
    }
  );
  await sendResetOtpEmail(normalizedEmail, otp);

  try {
    await emitAuthEvent(isResend ? 'otp_resend' : 'otp_send', {
      userId: user._id,
      actorType: 'uet_student',
      requestIp: normalizedIp,
      outcome: 'success',
      metadata: { flowType: 'forgot_password', email: normalizedEmail },
    });
  } catch {
    // Ignore audit emission failures.
  }

  return {
    code: 'FORGOT_PASSWORD_REQUEST_ACCEPTED',
    message: 'Password reset code has been sent.',
  };
}

async function verifyResetOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user || !user.passwordReset || !user.passwordReset.otp || !user.passwordReset.expiresAt) {
    throw buildError(400, 'RESET_OTP_INVALID', 'The reset code is invalid or expired.');
  }

  if (new Date(user.passwordReset.expiresAt).getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $set: { passwordReset: null } });
    throw buildError(400, 'RESET_OTP_INVALID', 'The reset code is invalid or expired.');
  }

  if (String(user.passwordReset.otp) !== normalizedOtp) {
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'passwordReset.attempts': Number(user.passwordReset.attempts || 0) + 1,
        },
      }
    );

    try {
      await emitAuthEvent('otp_verify_fail', {
        userId: user._id,
        actorType: 'uet_student',
        outcome: 'fail',
        metadata: { flowType: 'forgot_password', reason: 'otp_mismatch' },
      });
    } catch {
      // Ignore audit emission failures.
    }

    throw buildError(400, 'RESET_OTP_INVALID', 'The reset code is invalid or expired.');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenHash = hashResetToken(resetToken);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordReset: {
          otp: null,
          expiresAt: null,
          attempts: 0,
          resetTokenHash,
          resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY_MS),
        },
      },
    }
  );

  return {
    code: 'RESET_OTP_VERIFIED',
    message: 'OTP verified. You may now set a new password.',
    resetToken,
  };
}

async function resetPasswordWithToken({ resetToken, newPassword, currentSessionId }) {
  const normalizedToken = String(resetToken || '').trim();
  const nextPassword = String(newPassword || '');
  const normalizedSessionId = String(currentSessionId || '').trim() || null;

  if (!normalizedToken || !PASSWORD_POLICY_REGEX.test(nextPassword)) {
    throw buildError(
      400,
      'INVALID_INPUT',
      'newPassword must be at least 8 chars and include uppercase, lowercase, number, and one of @$!%*?&.'
    );
  }

  const tokenHash = hashResetToken(normalizedToken);
  const user = await User.findOne({ 'passwordReset.resetTokenHash': tokenHash });

  if (!user || !user.passwordReset || !user.passwordReset.resetTokenExpiresAt) {
    throw buildError(400, 'RESET_TOKEN_INVALID', 'Reset token is invalid or expired.');
  }

  if (new Date(user.passwordReset.resetTokenExpiresAt).getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $set: { passwordReset: null } });
    throw buildError(400, 'RESET_TOKEN_INVALID', 'Reset token is invalid or expired.');
  }

  const passwordHash = await hashPassword(nextPassword);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash,
        passwordReset: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }
  );

  // Invalidate current session/device only (if sessionId provided)
  if (normalizedSessionId) {
    await RefreshToken.updateOne(
      { sessionId: normalizedSessionId },
      { $set: { revokedAt: new Date() } }
    );
  }

  try {
    await emitAuthEvent('password_reset_success', {
      userId: user._id,
      actorType: 'uet_student',
      outcome: 'success',
      metadata: {},
    });
  } catch {
    // Ignore audit emission failures.
  }

  return {
    code: 'PASSWORD_RESET_COMPLETED',
    message: 'Password has been reset successfully.',
  };
}

module.exports = {
  PASSWORD_HASH_ROUNDS,
  hashPassword,
  verifyPassword,
  requestPasswordReset,
  verifyResetOtp,
  resetPasswordWithToken,
};