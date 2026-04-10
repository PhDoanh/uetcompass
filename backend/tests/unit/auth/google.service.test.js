const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

const googleService = require('../../../src/modules/auth/google.service');

describe('google token verification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  });

  test('accepts verified vnu.edu.vn token payload', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'student@vnu.edu.vn',
        email_verified: true,
        sub: 'google-sub-1',
        aud: 'test-client-id',
        name: 'Student One',
      }),
    });

    const payload = await googleService.verifyGoogleIdToken('credential-token');

    expect(payload.email).toBe('student@vnu.edu.vn');
    expect(mockVerifyIdToken).toHaveBeenCalledWith({
      idToken: 'credential-token',
      audience: 'test-client-id',
    });
  });

  test('rejects unverified google email', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'student@vnu.edu.vn',
        email_verified: false,
        sub: 'google-sub-1',
      }),
    });

    await expect(googleService.verifyGoogleIdToken('credential-token')).rejects.toMatchObject({
      code: 'GOOGLE_EMAIL_NOT_VERIFIED',
      status: 400,
    });
  });

  test('rejects non-vnu domain', async () => {
    mockVerifyIdToken.mockResolvedValueOnce({
      getPayload: () => ({
        email: 'student@gmail.com',
        email_verified: true,
        sub: 'google-sub-1',
      }),
    });

    await expect(googleService.verifyGoogleIdToken('credential-token')).rejects.toMatchObject({
      code: 'GOOGLE_DOMAIN_RESTRICTED',
      status: 403,
    });
  });
});
