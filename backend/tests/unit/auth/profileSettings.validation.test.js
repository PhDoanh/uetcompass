jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

const { User } = require('../../../src/modules/auth/user.model');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const profileSettingsService = require('../../../src/modules/auth/profileSettings.service');

describe('profileSettings.updateProfile input validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A',
      fullName: 'Nguyen Van A',
      privacySetting: 'identified',
    });
    StudentProfile.findOne.mockResolvedValue(null);
  });

  test('rejects blank displayName when provided', async () => {
    await expect(
      profileSettingsService.updateProfile('u1', {
        displayName: '   ',
      })
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_INPUT',
      message: 'displayName is required when provided.',
    });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('rejects blank fullName when provided', async () => {
    await expect(
      profileSettingsService.updateProfile('u1', {
        fullName: '   ',
      })
    ).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_INPUT',
      message: 'fullName is required when provided.',
    });

    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});
