jest.mock('../../../src/modules/auth/password.service', () => ({
  requestPasswordReset: jest.fn(),
  verifyResetOtp: jest.fn(),
  resetPasswordWithToken: jest.fn(),
}));

const passwordService = require('../../../src/modules/auth/password.service');
const controller = require('../../../src/modules/auth/auth.controller');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('reset-password controllers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('forgotPassword returns generic success', async () => {
    passwordService.requestPasswordReset.mockResolvedValueOnce({
      code: 'FORGOT_PASSWORD_REQUEST_ACCEPTED',
      message: 'generic',
    });

    const req = { body: { email: 'a@vnu.edu.vn' } };
    const res = createRes();

    await controller.forgotPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('verifyResetOtp returns reset token', async () => {
    passwordService.verifyResetOtp.mockResolvedValueOnce({
      code: 'RESET_OTP_VERIFIED',
      message: 'ok',
      resetToken: 'token123',
    });

    const req = { body: { email: 'a@vnu.edu.vn', otp: '1234' } };
    const res = createRes();

    await controller.verifyResetOtp(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ resetToken: 'token123' }));
  });

  test('resetPassword maps PASSWORD_RESET_COMPLETED success', async () => {
    passwordService.resetPasswordWithToken.mockResolvedValueOnce({
      code: 'PASSWORD_RESET_COMPLETED',
      message: 'done',
    });

    const req = { body: { resetToken: 'token123', newPassword: 'NewPass123!' } };
    const res = createRes();

    await controller.resetPassword(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'PASSWORD_RESET_COMPLETED' }));
  });
});
