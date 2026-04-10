jest.mock('../../../src/modules/auth/auth.service', () => ({
  registerWithEmail: jest.fn(),
  verifyEmailOtp: jest.fn(),
  resendVerificationOtp: jest.fn(),
}));

const authService = require('../../../src/modules/auth/auth.service');
const controller = require('../../../src/modules/auth/auth.controller');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('register controllers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('register returns 201', async () => {
    authService.registerWithEmail.mockResolvedValueOnce({ code: 'OTP_SENT', message: 'ok' });
    const req = { body: { fullName: 'A', email: 'a@vnu.edu.vn', password: 'x' } };
    const res = createRes();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('verify returns 200', async () => {
    authService.verifyEmailOtp.mockResolvedValueOnce({ code: 'EMAIL_VERIFIED', message: 'ok' });
    const req = { body: { email: 'a@vnu.edu.vn', otp: '1234' } };
    const res = createRes();

    await controller.verifyEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('resend returns 200', async () => {
    authService.resendVerificationOtp.mockResolvedValueOnce({ code: 'OTP_RESENT', message: 'ok' });
    const req = { body: { email: 'a@vnu.edu.vn' } };
    const res = createRes();

    await controller.resendOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});
