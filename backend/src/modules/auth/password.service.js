const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User } = require('./user.model');
const { sendResetOtpEmail } = require('./auth.email');
const { SecurityAudit } = require('./securityAudit.model');

const PASSWORD_HASH_ROUNDS = 12;
const RESET_OTP_EXPIRY_MS = 2 * 60 * 1000;
const RESET_MAX_ATTEMPTS = 10;
const RESET_TOKEN_EXPIRY_MS = 10 * 60 * 1000;

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

async function requestPasswordReset({ email }) {
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ email: normalizedEmail });

  if (user && user.status !== 'deleted') {
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
  }

  return {
    code: 'FORGOT_PASSWORD_REQUEST_ACCEPTED',
    message: 'If an account exists for this email, a reset code has been sent.',
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
    const nextAttempts = Number(user.passwordReset.attempts || 0) + 1;
    if (nextAttempts >= RESET_MAX_ATTEMPTS) {
      await User.updateOne({ _id: user._id }, { $set: { passwordReset: null } });
      throw buildError(400, 'RESET_OTP_ATTEMPTS_EXCEEDED', 'Too many invalid attempts. Please request a new code.');
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          'passwordReset.attempts': nextAttempts,
        },
      }
    );

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

async function resetPasswordWithToken({ resetToken, newPassword }) {
  const normalizedToken = String(resetToken || '').trim();
  const nextPassword = String(newPassword || '');

  if (!normalizedToken || nextPassword.length < 8) {
    throw buildError(400, 'INVALID_INPUT', 'resetToken and a valid newPassword are required.');
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

  await SecurityAudit.create({
    userId: user._id,
    eventType: 'PASSWORD_RESET_COMPLETED',
    metadata: {},
  });

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