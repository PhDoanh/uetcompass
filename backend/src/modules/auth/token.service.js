const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

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

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_MS,
  issueAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  buildRefreshTokenDocument,
  getRefreshCookieOptions,
};
