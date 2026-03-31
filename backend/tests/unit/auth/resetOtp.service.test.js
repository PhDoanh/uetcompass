jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const { User } = require('../../../src/modules/auth/user.model');
const passwordService = require('../../../src/modules/auth/password.service');

describe('reset OTP verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects expired OTP', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      passwordReset: {
        otp: '1234',
        expiresAt: new Date(Date.now() - 1_000),
        attempts: 0,
      },
    });

    await expect(passwordService.verifyResetOtp({ email: 'a@vnu.edu.vn', otp: '1234' })).rejects.toMatchObject({
      status: 400,
      code: 'RESET_OTP_INVALID',
    });
  });

  test('invalidates reset flow after 10 wrong attempts', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      passwordReset: {
        otp: '1234',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 9,
      },
    });

    await expect(passwordService.verifyResetOtp({ email: 'a@vnu.edu.vn', otp: '9999' })).rejects.toMatchObject({
      status: 400,
      code: 'RESET_OTP_ATTEMPTS_EXCEEDED',
    });
    expect(User.updateOne).toHaveBeenCalled();
  });

  test('returns short-lived reset token on valid OTP', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      passwordReset: {
        otp: '1234',
        expiresAt: new Date(Date.now() + 60_000),
        attempts: 1,
      },
    });

    const result = await passwordService.verifyResetOtp({ email: 'a@vnu.edu.vn', otp: '1234' });

    expect(result.code).toBe('RESET_OTP_VERIFIED');
    expect(typeof result.resetToken).toBe('string');
    expect(result.resetToken.length).toBeGreaterThan(20);
    expect(User.updateOne).toHaveBeenCalled();
  });
});
