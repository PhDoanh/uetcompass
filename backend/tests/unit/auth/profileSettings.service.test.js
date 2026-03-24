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

jest.mock('../../../src/modules/notifications/notification.service', () => ({
  createRepersonalizeNotification: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const notificationService = require('../../../src/modules/notifications/notification.service');
const profileSettingsService = require('../../../src/modules/auth/profileSettings.service');

describe('profile settings diff detection', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sets repersonalizationPending when onboarding fields change', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A',
      fullName: 'A',
      privacySetting: 'identified',
    });
    User.findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A',
      fullName: 'A',
      privacySetting: 'identified',
    });
    StudentProfile.findOne.mockResolvedValueOnce({
      userId: 'u1',
      major: 'Computer Science',
      completedCourses: [{ courseCode: 'INT2204' }],
      careerGoal: { role: 'SE', companyType: 'Product', graduationTimeline: '2027' },
      personalAspirations: 'x',
    });

    await profileSettingsService.updateProfile('u1', {
      profile: {
        major: 'Information Systems',
      },
    });

    expect(StudentProfile.updateOne).toHaveBeenCalledWith(
      { userId: 'u1' },
      { $set: { repersonalizationPending: true } }
    );
    expect(notificationService.createRepersonalizeNotification).toHaveBeenCalled();
  });

  test('does not trigger repersonalization for identity-only updates', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A',
      fullName: 'A',
      privacySetting: 'identified',
    });
    User.findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A New',
      fullName: 'A',
      privacySetting: 'identified',
    });
    StudentProfile.findOne.mockResolvedValueOnce({
      userId: 'u1',
      major: 'Computer Science',
      completedCourses: [{ courseCode: 'INT2204' }],
      careerGoal: { role: 'SE', companyType: 'Product', graduationTimeline: '2027' },
      personalAspirations: 'x',
    });

    await profileSettingsService.updateProfile('u1', {
      displayName: 'A New',
    });

    expect(StudentProfile.updateOne).not.toHaveBeenCalled();
    expect(notificationService.createRepersonalizeNotification).not.toHaveBeenCalled();
  });
});
