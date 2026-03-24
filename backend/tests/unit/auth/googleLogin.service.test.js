jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/google.service', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const googleService = require('../../../src/modules/auth/google.service');
const authService = require('../../../src/modules/auth/auth.service');

describe('google login orchestration', () => {
  beforeEach(() => jest.clearAllMocks());

  test('logs in existing account', async () => {
    googleService.verifyGoogleIdToken.mockResolvedValueOnce({
      email: 'existing@vnu.edu.vn',
      sub: 'g-1',
      name: 'Existing User',
    });

    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'existing@vnu.edu.vn',
      status: 'active',
      linkedGoogleAccounts: [],
    });

    const result = await authService.loginWithGoogle({ credential: 'abc' });

    expect(result.code).toBe('LOGIN_SUCCESS');
    expect(result.isNewUser).toBe(false);
    expect(result.accessToken).toBeTruthy();
  });

  test('creates new account on first google login', async () => {
    googleService.verifyGoogleIdToken.mockResolvedValueOnce({
      email: 'newuser@vnu.edu.vn',
      sub: 'g-2',
      name: 'New User',
    });

    User.findOne.mockResolvedValueOnce(null);
    User.create.mockResolvedValueOnce({
      _id: 'u2',
      email: 'newuser@vnu.edu.vn',
    });

    const result = await authService.loginWithGoogle({ credential: 'abc' });

    expect(User.create).toHaveBeenCalled();
    expect(result.isNewUser).toBe(true);
    expect(result.code).toBe('LOGIN_SUCCESS');
  });
});
