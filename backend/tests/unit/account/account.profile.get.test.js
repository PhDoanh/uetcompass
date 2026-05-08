jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
  },
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
  },
}));

const { User } = require('../../../src/modules/auth/user.model');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const accountService = require('../../../src/modules/account/account.service');

describe('account.service getProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns identity payload for active account', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      email: 'student@vnu.edu.vn',
      displayName: 'student',
      fullName: 'Student Name',
      privacySetting: 'identified',
      avatarUrl: 'https://cdn/avatar.png',
    });
    StudentProfile.findOne.mockResolvedValueOnce(null);

    const result = await accountService.getProfile('u1');
    expect(result.identity).toEqual(
      expect.objectContaining({
        email: 'student@vnu.edu.vn',
        displayName: 'student',
        fullName: 'Student Name',
        privacySetting: 'identified',
        avatarUrl: 'https://cdn/avatar.png',
      })
    );
  });
});
