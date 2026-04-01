jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/password.service', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const passwordService = require('../../../src/modules/auth/password.service');
const authService = require('../../../src/modules/auth/auth.service');

describe('login lockout service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns lock error when account still locked', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      status: 'active',
      lockedUntil: new Date(Date.now() + 60_000),
    });

    await expect(authService.loginWithPassword({ email: 'a@vnu.edu.vn', password: 'x' })).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
    });
  });

  test('locks account on 5th failed attempt', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      status: 'active',
      passwordHash: 'hash',
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    passwordService.verifyPassword.mockResolvedValueOnce(false);

    await expect(authService.loginWithPassword({ email: 'a@vnu.edu.vn', password: 'bad' })).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED',
    });
    expect(User.updateOne).toHaveBeenCalled();
    const updateCall = User.updateOne.mock.calls[0][1];
    const lockUntil = updateCall.$set.lockedUntil;
    const diffMs = new Date(lockUntil).getTime() - Date.now();
    expect(diffMs).toBeGreaterThanOrEqual(14 * 60 * 1000);
    expect(diffMs).toBeLessThanOrEqual(15 * 60 * 1000 + 5_000);
  });

  test('resets failure counter after successful login', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      status: 'active',
      passwordHash: 'hash',
      failedLoginAttempts: 2,
      lockedUntil: null,
    });
    passwordService.verifyPassword.mockResolvedValueOnce(true);

    const result = await authService.loginWithPassword({ email: 'a@vnu.edu.vn', password: 'ok' });
    expect(result.code).toBe('LOGIN_SUCCESS');
    expect(User.updateOne).toHaveBeenCalled();
  });
});
