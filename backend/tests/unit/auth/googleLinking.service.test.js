jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const { User } = require('../../../src/modules/auth/user.model');
const googleService = require('../../../src/modules/auth/google.service');

describe('google linking service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  });

  test('links a google account for current user', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'a@vnu.edu.vn',
        email_verified: true,
        sub: 'gid-1',
        aud: 'test-client-id',
        name: 'A',
      }),
    });

    User.findById.mockResolvedValueOnce({ _id: 'u1', email: 'a@vnu.edu.vn', linkedGoogleAccounts: [] });
    User.findOne.mockResolvedValueOnce(null);

    const result = await googleService.linkGoogleAccount('u1', 'cred');

    expect(result.code).toBe('GOOGLE_LINKED');
    expect(User.updateOne).toHaveBeenCalled();
  });

  test('rejects cross-account linking conflict', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'a@vnu.edu.vn',
        email_verified: true,
        sub: 'gid-1',
        aud: 'test-client-id',
        name: 'A',
      }),
    });

    User.findById.mockResolvedValueOnce({ _id: 'u1', email: 'a@vnu.edu.vn', linkedGoogleAccounts: [] });
    User.findOne.mockResolvedValueOnce({ _id: 'u2', email: 'b@vnu.edu.vn', linkedGoogleAccounts: [{ googleId: 'gid-1' }] });

    await expect(googleService.linkGoogleAccount('u1', 'cred')).rejects.toMatchObject({
      status: 409,
      code: 'GOOGLE_ACCOUNT_CONFLICT',
    });
  });
});
