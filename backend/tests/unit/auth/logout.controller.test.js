jest.mock('../../../src/modules/auth/refreshToken.model', () => ({
  RefreshToken: {
    updateOne: jest.fn(),
  },
}));

const { RefreshToken } = require('../../../src/modules/auth/refreshToken.model');
const authService = require('../../../src/modules/auth/auth.service');
const controller = require('../../../src/modules/auth/auth.controller');

describe('logout flow', () => {
  beforeEach(() => jest.clearAllMocks());

  test('service revokes refresh token when cookie present', async () => {
    await authService.logoutSession('raw-refresh-token');
    expect(RefreshToken.updateOne).toHaveBeenCalled();
  });

  test('controller clears cookie and returns 204', async () => {
    const req = { cookies: { rt: 'raw-refresh-token' } };
    const res = {
      clearCookie: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };

    await controller.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });
});
