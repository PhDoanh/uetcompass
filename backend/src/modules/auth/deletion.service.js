const crypto = require('crypto');
const { User } = require('./user.model');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { RefreshToken } = require('./refreshToken.model');
const { Notification } = require('../notifications/notification.model');
const { DeletedEmail } = require('./deletedEmail.model');
const { sendDeletionConfirmationEmail } = require('./auth.email');

const DELETION_TOKEN_TTL_MS = 60 * 60 * 1000;

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function hashDeletionToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

async function requestDeletion(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const hash = hashDeletionToken(rawToken);
  const expiresAt = new Date(Date.now() + DELETION_TOKEN_TTL_MS);

  await User.updateOne(
    { _id: userId },
    {
      $set: {
        deletionToken: {
          hash,
          expiresAt,
          used: false,
        },
      },
    }
  );

  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const confirmUrl = `${baseUrl}/confirm-deletion?token=${rawToken}`;
  await sendDeletionConfirmationEmail(user.email, confirmUrl);

  return {
    code: 'DELETION_REQUESTED',
    message: 'Deletion confirmation email has been sent.',
  };
}

async function confirmDeletionByToken(token) {
  const tokenHash = hashDeletionToken(token);
  const user = await User.findOne({ 'deletionToken.hash': tokenHash });

  if (!user || !user.deletionToken) {
    throw buildError(400, 'DELETION_TOKEN_INVALID', 'Deletion token is invalid or expired.');
  }

  if (user.deletionToken.used) {
    throw buildError(400, 'DELETION_TOKEN_INVALID', 'Deletion token is invalid or expired.');
  }

  if (new Date(user.deletionToken.expiresAt).getTime() < Date.now()) {
    throw buildError(400, 'DELETION_TOKEN_INVALID', 'Deletion token is invalid or expired.');
  }

  await User.updateOne({ _id: user._id }, { $set: { 'deletionToken.used': true } });

  await User.deleteOne({ _id: user._id });
  await StudentProfile.deleteOne({ userId: user._id });
  await RefreshToken.deleteMany({ userId: user._id });
  await Notification.deleteMany({ userId: user._id });
  await DeletedEmail.create({ email: user.email, deletedAt: new Date() });

  return {
    code: 'ACCOUNT_DELETED',
    message: 'Account deleted successfully.',
  };
}

module.exports = {
  hashDeletionToken,
  requestDeletion,
  confirmDeletionByToken,
};
