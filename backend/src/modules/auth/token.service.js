const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { OtpRateLimit } = require('./otpRateLimit.model');

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OTP_RESEND_HOURLY_LIMIT = 10;
const OTP_RESEND_WINDOW_MS = 60 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function getAccessTokenSecret() {
  return process.env.ACCESS_TOKEN_SECRET || 'dev-access-secret-change-me';
}

function issueAccessToken({ userId, email }) {
  return jwt.sign(
    {
      userId: String(userId),
      email,
    },
    getAccessTokenSecret(),
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessTokenSecret(), { algorithms: ['HS256'] });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashRefreshToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

function buildRefreshTokenDocument(userId, rawToken, family = uuidv4()) {
  return {
    userId,
    tokenHash: hashRefreshToken(rawToken),
    family,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
  };
}

function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
  };
}

function buildPolicyError(code, message, details = {}) {
  const error = new Error(message);
  error.status = 429;
  error.code = code;
  error.details = details;
  return error;
}

function normalizeRateLimitRecord(record, now) {
  if (!record) {
    return {
      count: 0,
      windowStart: now,
      cooldownUntil: null,
    };
  }

  const windowStart = new Date(record.windowStart || now);
  if (now.getTime() - windowStart.getTime() >= OTP_RESEND_WINDOW_MS) {
    return {
      count: 0,
      windowStart: now,
      cooldownUntil: null,
    };
  }

  return {
    count: Number(record.count || 0),
    windowStart,
    cooldownUntil: record.cooldownUntil ? new Date(record.cooldownUntil) : null,
  };
}

async function enforceOtpResendPolicy({ flowType, accountKey, requestIp }) {
  const normalizedFlow = String(flowType || '').trim();
  const normalizedAccountKey = String(accountKey || '').trim().toLowerCase();
  const normalizedIp = String(requestIp || '').trim() || 'unknown';
  const now = new Date();

  if (!normalizedFlow || !normalizedAccountKey) {
    throw buildPolicyError('INVALID_INPUT', 'flowType and accountKey are required for OTP resend policy checks.');
  }

  const [accountDoc, ipDoc] = await Promise.all([
    OtpRateLimit.findOne({ scope: 'account', key: normalizedAccountKey, flowType: normalizedFlow }),
    OtpRateLimit.findOne({ scope: 'ip', key: normalizedIp, flowType: normalizedFlow }),
  ]);

  const accountState = normalizeRateLimitRecord(accountDoc, now);
  const ipState = normalizeRateLimitRecord(ipDoc, now);

  if (accountState.cooldownUntil && accountState.cooldownUntil.getTime() > now.getTime()) {
    throw buildPolicyError('OTP_RESEND_COOLDOWN', 'OTP resend is still in cooldown window.', {
      scope: 'account',
      cooldownUntil: accountState.cooldownUntil,
    });
  }

  if (ipState.cooldownUntil && ipState.cooldownUntil.getTime() > now.getTime()) {
    throw buildPolicyError('OTP_RESEND_COOLDOWN', 'OTP resend is still in cooldown window.', {
      scope: 'ip',
      cooldownUntil: ipState.cooldownUntil,
    });
  }

  if (accountState.count >= OTP_RESEND_HOURLY_LIMIT) {
    throw buildPolicyError('TOO_MANY_REQUESTS', 'OTP resend hourly limit exceeded for account.', {
      scope: 'account',
      hourlyLimit: OTP_RESEND_HOURLY_LIMIT,
    });
  }

  if (ipState.count >= OTP_RESEND_HOURLY_LIMIT) {
    throw buildPolicyError('TOO_MANY_REQUESTS', 'OTP resend hourly limit exceeded for IP.', {
      scope: 'ip',
      hourlyLimit: OTP_RESEND_HOURLY_LIMIT,
    });
  }

  const nextCooldownUntil = new Date(now.getTime() + OTP_RESEND_COOLDOWN_MS);

  await Promise.all([
    OtpRateLimit.updateOne(
      { scope: 'account', key: normalizedAccountKey, flowType: normalizedFlow },
      {
        $set: {
          windowStart: accountState.windowStart,
          cooldownUntil: nextCooldownUntil,
        },
        $inc: { count: 1 },
      },
      { upsert: true }
    ),
    OtpRateLimit.updateOne(
      { scope: 'ip', key: normalizedIp, flowType: normalizedFlow },
      {
        $set: {
          windowStart: ipState.windowStart,
          cooldownUntil: nextCooldownUntil,
        },
        $inc: { count: 1 },
      },
      { upsert: true }
    ),
  ]);

  return {
    cooldownUntil: nextCooldownUntil,
    hourlyLimit: OTP_RESEND_HOURLY_LIMIT,
  };
}

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  OTP_RESEND_HOURLY_LIMIT,
  OTP_RESEND_COOLDOWN_MS,
  issueAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  buildRefreshTokenDocument,
  getRefreshCookieOptions,
  enforceOtpResendPolicy,
};
