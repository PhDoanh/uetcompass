jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendResetOtpEmail: jest.fn(),
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

  test('returns same generic response for unknown email', async () => {
    User.findOne.mockResolvedValueOnce(null);

    const result = await passwordService.requestPasswordReset({ email: 'unknown@vnu.edu.vn' });

    expect(result.code).toBe('FORGOT_PASSWORD_REQUEST_ACCEPTED');
    expect(User.updateOne).not.toHaveBeenCalled();
    expect(sendResetOtpEmail).not.toHaveBeenCalled();
  });
});
