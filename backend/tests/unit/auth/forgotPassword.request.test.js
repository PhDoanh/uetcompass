jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendResetOtpEmail: jest.fn(),
}));

jest.mock('../../../src/modules/auth/token.service', () => ({
  enforceOtpResendPolicy: jest.fn().mockResolvedValue({
    cooldownUntil: new Date(Date.now() + 60_000),
    hourlyLimit: 10,
  }),
  hashRefreshToken: jest.fn(() => 'test-refresh-hash'),
}));

jest.mock('../../../src/modules/auth/audit.service', () => ({
  emitAuthEvent: jest.fn().mockResolvedValue({ _id: 'audit-1' }),
}));

const { User } = require('../../../src/modules/auth/user.model');
const { sendResetOtpEmail } = require('../../../src/modules/auth/auth.email');
const passwordService = require('../../../src/modules/auth/password.service');

describe('forgot-password request policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns generic response for known email', async () => {
    User.findOne.mockResolvedValueOnce({ _id: 'u1', email: 'known@vnu.edu.vn', status: 'active' });

    const result = await passwordService.requestPasswordReset({ email: 'known@vnu.edu.vn' });

    expect(result.code).toBe('FORGOT_PASSWORD_REQUEST_ACCEPTED');
    expect(User.updateOne).toHaveBeenCalled();
    expect(sendResetOtpEmail).toHaveBeenCalled();
  });

  test('throws EMAIL_NOT_FOUND for unknown email', async () => {
    User.findOne.mockResolvedValueOnce(null);

    await expect(passwordService.requestPasswordReset({ email: 'unknown@vnu.edu.vn' })).rejects.toMatchObject({
      status: 404,
      code: 'EMAIL_NOT_FOUND',
    });
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(sendResetOtpEmail).not.toHaveBeenCalled();
  });

  test('throws EMAIL_NOT_FOUND for soft-deleted account email', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u2',
      email: 'deleted@vnu.edu.vn',
      status: 'soft-deleted',
    });

    await expect(passwordService.requestPasswordReset({ email: 'deleted@vnu.edu.vn' })).rejects.toMatchObject({
      status: 404,
      code: 'EMAIL_NOT_FOUND',
    });
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(sendResetOtpEmail).not.toHaveBeenCalled();
  });
});
