const { OAuth2Client } = require('google-auth-library');
const { emitAuthEvent } = require('./audit.service');

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || '';
}

async function verifyGoogleIdToken(credential, context = {}) {
  const idToken = String(credential || '').trim();
  if (!idToken) {
    throw buildError(400, 'GOOGLE_TOKEN_INVALID', 'Invalid Google credential.');
  }

  const audience = getGoogleClientId();
  const client = new OAuth2Client();

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    });
    payload = ticket.getPayload() || {};
  } catch (err) {
    throw buildError(400, 'GOOGLE_TOKEN_INVALID', 'Invalid Google credential.', { reason: err.message });
  }

  const email = String(payload.email || '').trim().toLowerCase();
  if (!email || payload.email_verified !== true) {
    throw buildError(400, 'GOOGLE_EMAIL_NOT_VERIFIED', 'Google account email is not verified.');
  }

  if (!/@vnu\.edu\.vn$/i.test(email)) {
    try {
      await emitAuthEvent('google_login_denied_domain', {
        actorType: 'system',
        requestIp: String(context?.requestIp || '').trim() || null,
        outcome: 'fail',
        metadata: { email },
      });
    } catch {
      // Ignore audit emission failures on deny path.
    }
    throw buildError(403, 'GOOGLE_DOMAIN_RESTRICTED', 'Only @vnu.edu.vn accounts are allowed.');
  }

  return {
    email,
    name: String(payload.name || '').trim() || null,
    sub: String(payload.sub || '').trim(),
    aud: String(payload.aud || '').trim(),
  };
}

const { User } = require('./user.model');

async function linkGoogleAccount(userId, credential) {
  const payload = await verifyGoogleIdToken(credential);
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  const conflict = await User.findOne({
    _id: { $ne: userId },
    'linkedGoogleAccounts.googleId': payload.sub,
  });
  if (conflict) {
    throw buildError(409, 'GOOGLE_ACCOUNT_CONFLICT', 'This Google account is already linked to another user.');
  }

  const linkedAccounts = Array.isArray(user.linkedGoogleAccounts) ? user.linkedGoogleAccounts : [];
  const alreadyLinked = linkedAccounts.some((item) => item && item.googleId === payload.sub);
  if (alreadyLinked) {
    return {
      code: 'GOOGLE_LINKED',
      message: 'Google account already linked.',
    };
  }

  await User.updateOne(
    { _id: userId },
    {
      $push: {
        linkedGoogleAccounts: {
          googleId: payload.sub,
          email: payload.email,
        },
      },
    }
  );

  return {
    code: 'GOOGLE_LINKED',
    message: 'Google account linked successfully.',
  };
}

async function unlinkGoogleAccount(userId, googleId) {
  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        linkedGoogleAccounts: { googleId: String(googleId || '').trim() },
      },
    }
  );

  return {
    code: 'GOOGLE_UNLINKED',
    message: 'Google account unlinked successfully.',
  };
}

module.exports = {
  verifyGoogleIdToken,
  linkGoogleAccount,
  unlinkGoogleAccount,
};