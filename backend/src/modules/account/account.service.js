const bcrypt = require('bcryptjs');
const { User } = require('../auth/user.model');
const accountAuditService = require('./accountAudit.service');
const { resolveEffectiveDisplayName } = require('./identity.policy');

const BCRYPT_ROUNDS = 12;

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function validatePasswordPolicy(value) {
  const password = String(value || '');
  const meetsLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^A-Za-z\d]/.test(password);
  return meetsLength && hasLetter && hasNumber && hasSpecial;
}

function mapIdentity(user) {
  return {
    email: user.email,
    displayName: user.displayName || null,
    fullName: user.fullName,
    privacySetting: user.privacySetting,
    avatarUrl: user.avatarUrl || null,
    effectiveDisplayName: resolveEffectiveDisplayName({
      displayName: user.displayName,
      fullName: user.fullName,
      email: user.email,
    }),
  };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  return {
    identity: mapIdentity(user),
  };
}

async function updateProfile(userId, payload = {}) {
  const nextFields = {};

  if (payload.displayName !== undefined) {
    const displayName = String(payload.displayName || '').trim();
    if (!displayName) {
      throw buildError(400, 'INVALID_INPUT', 'displayName is required when provided.');
    }
    nextFields.displayName = displayName;
  }

  if (payload.fullName !== undefined) {
    const fullName = String(payload.fullName || '').trim();
    if (!fullName) {
      throw buildError(400, 'INVALID_INPUT', 'fullName is required when provided.');
    }
    nextFields.fullName = fullName;
  }

  if (payload.privacySetting !== undefined) {
    if (!['identified', 'anonymous'].includes(payload.privacySetting)) {
      throw buildError(400, 'INVALID_INPUT', 'privacySetting must be identified or anonymous.');
    }
    nextFields.privacySetting = payload.privacySetting;
  }

  if (payload.avatarUrl !== undefined) {
    const avatarUrl = payload.avatarUrl == null ? null : String(payload.avatarUrl).trim();
    nextFields.avatarUrl = avatarUrl || null;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  const updatedUser = Object.keys(nextFields).length
    ? await User.findByIdAndUpdate(userId, { $set: nextFields }, { new: true })
    : user;

  if (Object.keys(nextFields).length) {
    await accountAuditService.emitProfileUpdated(userId, {
      changedFields: Object.keys(nextFields),
    });
  }

  return {
    message: 'Profile updated',
    profile: mapIdentity(updatedUser),
  };
}

async function changePassword(userId, payload = {}) {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');

  if (!validatePasswordPolicy(newPassword)) {
    throw buildError(
      400,
      'INVALID_INPUT',
      'New password must be at least 8 characters and include letters, numbers, and special characters',
      { field: 'newPassword' }
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  const hasPassword = Boolean(user.passwordHash);
  if (hasPassword) {
    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw buildError(403, 'FORBIDDEN', 'Current password is incorrect');
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }
  );

  await accountAuditService.emitPasswordChanged(userId);

  return {
    message: 'Password changed successfully',
  };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  validatePasswordPolicy,
};
