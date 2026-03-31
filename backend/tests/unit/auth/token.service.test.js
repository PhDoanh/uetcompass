const tokenService = require('../../../src/modules/auth/token.service');

describe('token service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('issueAccessToken and verifyAccessToken roundtrip', () => {
    process.env.ACCESS_TOKEN_SECRET = 'unit-test-secret';

    const accessToken = tokenService.issueAccessToken({
      userId: 'u1',
      email: 'student@vnu.edu.vn',
    });

    const decoded = tokenService.verifyAccessToken(accessToken);
    expect(decoded.userId).toBe('u1');
    expect(decoded.email).toBe('student@vnu.edu.vn');
    expect(decoded.exp - decoded.iat).toBe(tokenService.ACCESS_TOKEN_TTL_SECONDS);
  });

  test('hashRefreshToken is deterministic and sha256 length', () => {
    const h1 = tokenService.hashRefreshToken('abc');
    const h2 = tokenService.hashRefreshToken('abc');
    const h3 = tokenService.hashRefreshToken('xyz');

    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
    expect(h1).toMatch(/^[a-f0-9]{64}$/);
  });

  test('buildRefreshTokenDocument sets token hash, family and ttl fields', () => {
    const now = Date.now();
    const doc = tokenService.buildRefreshTokenDocument('u1', 'raw-token', 'fam-1');

    expect(doc).toMatchObject({
      userId: 'u1',
      family: 'fam-1',
      tokenHash: tokenService.hashRefreshToken('raw-token'),
      revokedAt: null,
    });

    const expiresMs = new Date(doc.expiresAt).getTime() - now;
    expect(expiresMs).toBeGreaterThan(6 * 24 * 60 * 60 * 1000);
    expect(expiresMs).toBeLessThanOrEqual(tokenService.REFRESH_TOKEN_TTL_MS + 2000);
  });

  test('getRefreshCookieOptions toggles security by NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    const devOptions = tokenService.getRefreshCookieOptions();
    expect(devOptions).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/api/auth',
    });

    process.env.NODE_ENV = 'production';
    const prodOptions = tokenService.getRefreshCookieOptions();
    expect(prodOptions).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/api/auth',
    });
  });
});