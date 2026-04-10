jest.mock('../../../src/modules/auth/auth.service', () => ({
  loginWithPassword: jest.fn(),
}));

const authService = require('../../../src/modules/auth/auth.service');
const controller = require('../../../src/modules/auth/auth.controller');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('login controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 on success', async () => {
    authService.loginWithPassword.mockResolvedValueOnce({
      code: 'LOGIN_SUCCESS',
      accessToken: 'token',
      onboardingState: 'NEVER_STARTED',
    });
    const req = { body: { email: 'a@vnu.edu.vn', password: 'x' } };
    const res = createRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns mapped lockout error', async () => {
    authService.loginWithPassword.mockRejectedValueOnce({
      status: 423,
      code: 'ACCOUNT_LOCKED',
      message: 'locked',
      details: { remainingSeconds: 10 },
    });
    const req = { body: { email: 'a@vnu.edu.vn', password: 'x' } };
    const res = createRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(423);
  });

  test('returns mapped invalid credential error', async () => {
    authService.loginWithPassword.mockRejectedValueOnce({
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'invalid',
    });
    const req = { body: { email: 'a@vnu.edu.vn', password: 'x' } };
    const res = createRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns mapped email-not-verified error', async () => {
    authService.loginWithPassword.mockRejectedValueOnce({
      status: 403,
      code: 'EMAIL_NOT_VERIFIED',
      message: 'verify',
    });
    const req = { body: { email: 'a@vnu.edu.vn', password: 'x' } };
    const res = createRes();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
