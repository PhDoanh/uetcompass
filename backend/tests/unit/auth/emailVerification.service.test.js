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

const { User } = require('../../../src/modules/auth/user.model');
const { sendRegistrationOtpEmail } = require('../../../src/modules/auth/auth.email');
const authService = require('../../../src/modules/auth/auth.service');

describe('email verification lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register creates pending account and sends OTP', async () => {
    User.findOne.mockResolvedValueOnce(null);
    User.create.mockResolvedValueOnce({ _id: 'u1' });

    const result = await authService.registerWithEmail({
      fullName: 'Test User',
      email: 'test@vnu.edu.vn',
      password: 'secret',
    });

    expect(result.code).toBe('OTP_SENT');
    expect(User.create).toHaveBeenCalled();
    expect(sendRegistrationOtpEmail).toHaveBeenCalled();
  });

  test('verify rejects expired OTP and locks account', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      status: 'pending-verification',
      emailVerification: { otp: '1111', expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(authService.verifyEmailOtp({ email: 'test@vnu.edu.vn', otp: '1111' })).rejects.toMatchObject({
      status: 423,
      code: 'ACCOUNT_LOCKED_UNVERIFIED',
    });
    expect(User.updateOne).toHaveBeenCalled();
  });

  test('resend OTP works for locked account', async () => {
    User.findOne.mockResolvedValueOnce({ _id: 'u1', status: 'locked' });

    const result = await authService.resendVerificationOtp({ email: 'test@vnu.edu.vn' });

    expect(result.code).toBe('OTP_RESENT');
    expect(User.updateOne).toHaveBeenCalled();
    expect(sendRegistrationOtpEmail).toHaveBeenCalled();
  });
});
