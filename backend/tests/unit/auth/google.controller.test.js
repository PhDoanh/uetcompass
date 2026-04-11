jest.mock('../../../src/modules/auth/auth.service', () => ({
  loginWithGoogle: jest.fn(),
}));

const authService = require('../../../src/modules/auth/auth.service');
const controller = require('../../../src/modules/auth/auth.controller');

function createRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('google login controller', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 for existing account login', async () => {
    authService.loginWithGoogle.mockResolvedValueOnce({
      code: 'LOGIN_SUCCESS',
      accessToken: 'token',
      onboardingState: 'NEVER_STARTED',
      isNewUser: false,
    });
    const req = { body: { credential: 'cred' } };
    const res = createRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('returns 201 for new account creation', async () => {
    authService.loginWithGoogle.mockResolvedValueOnce({
      code: 'LOGIN_SUCCESS',
      accessToken: 'token',
      onboardingState: 'NEVER_STARTED',
      isNewUser: true,
    });
    const req = { body: { credential: 'cred' } };
    const res = createRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('returns 403 for domain restriction', async () => {
    authService.loginWithGoogle.mockRejectedValueOnce({
      status: 403,
      code: 'GOOGLE_DOMAIN_RESTRICTED',
      message: 'Only @vnu.edu.vn accounts are allowed.',
    });
    const req = { body: { credential: 'cred' } };
    const res = createRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('returns 400 for invalid token', async () => {
    authService.loginWithGoogle.mockRejectedValueOnce({
      status: 400,
      code: 'GOOGLE_TOKEN_INVALID',
      message: 'Invalid Google credential.',
    });
    const req = { body: { credential: 'cred' } };
    const res = createRes();

    await controller.googleLogin(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
