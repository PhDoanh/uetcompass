jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendRegistrationOtpEmail: jest.fn(),
}));

jest.mock('../../../src/modules/auth/password.service', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../../../src/modules/auth/google.service', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/refreshToken.model', () => ({
  RefreshToken: {
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/token.service', () => ({
  issueAccessToken: jest.fn().mockReturnValue('access-token'),
  hashRefreshToken: jest.fn((value) => `hashed:${value}`),
}));

const { User } = require('../../../src/modules/auth/user.model');
const { RefreshToken } = require('../../../src/modules/auth/refreshToken.model');
const passwordService = require('../../../src/modules/auth/password.service');
const tokenService = require('../../../src/modules/auth/token.service');
const authService = require('../../../src/modules/auth/auth.service');

describe('auth service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('registerWithEmail rejects duplicate email for non-deleted account', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'student@vnu.edu.vn',
      status: 'active',
    });

    await expect(
      authService.registerWithEmail({
        fullName: 'Student',
        email: 'student@vnu.edu.vn',
        password: 'Secret123!',
      })
    ).rejects.toMatchObject({
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    });
  });

  test('verifyEmailOtp locks account when OTP expired', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u2',
      email: 'student@vnu.edu.vn',
      status: 'pending-verification',
      emailVerification: {
        otp: '1111',
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    await expect(
      authService.verifyEmailOtp({ email: 'student@vnu.edu.vn', otp: '1111' })
    ).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED_UNVERIFIED',
    });

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u2' },
      { $set: { status: 'locked' } }
    );
  });

  test('loginWithPassword locks account on 5th failed attempt', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u3',
      email: 'student@vnu.edu.vn',
      status: 'active',
      passwordHash: 'hash',
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    passwordService.verifyPassword.mockResolvedValueOnce(false);

    await expect(
      authService.loginWithPassword({ email: 'student@vnu.edu.vn', password: 'wrong' })
    ).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
    });

    expect(User.updateOne).toHaveBeenCalled();
    const updatePayload = User.updateOne.mock.calls[0][1];
    expect(updatePayload.$set.failedLoginAttempts).toBe(0);
    expect(updatePayload.$set.lockedUntil).toBeInstanceOf(Date);
  });

  test('logoutSession revokes refresh token using hashed token', async () => {
    RefreshToken.updateOne.mockResolvedValueOnce({ acknowledged: true });

    const result = await authService.logoutSession('raw-refresh-token');

    expect(result).toEqual({ code: 'LOGOUT_SUCCESS' });
    expect(tokenService.hashRefreshToken).toHaveBeenCalledWith('raw-refresh-token');
    expect(RefreshToken.updateOne).toHaveBeenCalledWith(
      {
        tokenHash: 'hashed:raw-refresh-token',
        revokedAt: null,
      },
      {
        $set: {
          revokedAt: expect.any(Date),
        },
      }
    );
  });
});