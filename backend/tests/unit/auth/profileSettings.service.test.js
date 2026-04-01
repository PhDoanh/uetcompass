jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
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

  test('updates onboarding profile fields without repersonalization side effects', async () => {
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
      isDraft: false,
      major: 'Computer Science',
      completedCourses: [{ courseCode: 'INT2204' }],
      careerGoal: { role: 'SE', companyType: 'Product', graduationTimeline: '2027' },
      personalAspirations: 'x',
    });
    StudentProfile.findOneAndUpdate.mockResolvedValueOnce({
      userId: 'u1',
      isDraft: false,
      major: 'Information Systems',
      completedCourses: [{ major: 'Information Systems', courseCode: 'INT2204' }],
      careerGoal: {
        role: null,
        companyType: null,
        graduationTimeline: null,
      },
      personalAspirations: null,
    });

    await profileSettingsService.updateProfile('u1', {
      profile: {
        major: 'Information Systems',
      },
    });

    expect(StudentProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'u1' },
      {
        $set: expect.objectContaining({
          major: 'Information Systems',
          careerGoal: {
            role: null,
            companyType: null,
            graduationTimeline: null,
          },
          personalAspirations: null,
          isDraft: false,
        }),
        $setOnInsert: expect.objectContaining({
          userId: 'u1',
          isDraft: true,
          submittedAt: null,
        }),
      },
      { new: true, upsert: true, runValidators: true }
    );
    expect(notificationService.createRepersonalizeNotification).not.toHaveBeenCalled();
  });

  test('persists profile changes for draft onboarding profiles', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      displayName: 'A',
      fullName: 'A',
      privacySetting: 'identified',
    });
    StudentProfile.findOne.mockResolvedValueOnce({
      userId: 'u1',
      isDraft: true,
      major: 'Computer Science',
      completedCourses: [{ major: 'Computer Science', courseCode: 'INT2204' }],
      careerGoal: { role: 'SE', companyType: 'Product', graduationTimeline: '2027' },
      personalAspirations: 'x',
    });
    StudentProfile.findOneAndUpdate.mockResolvedValueOnce({
      userId: 'u1',
      isDraft: true,
      major: 'Information Systems',
      completedCourses: [{ major: 'Information Systems', courseCode: 'INT2204' }],
      careerGoal: {
        role: null,
        companyType: null,
        graduationTimeline: null,
      },
      personalAspirations: null,
    });

    await profileSettingsService.updateProfile('u1', {
      profile: {
        major: 'Information Systems',
      },
    });

    expect(StudentProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'u1' },
      {
        $set: expect.objectContaining({
          major: 'Information Systems',
          isDraft: true,
        }),
        $setOnInsert: expect.objectContaining({
          userId: 'u1',
          isDraft: true,
          submittedAt: null,
        }),
      },
      { new: true, upsert: true, runValidators: true }
    );
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
      isDraft: false,
      major: 'Computer Science',
      completedCourses: [{ courseCode: 'INT2204' }],
      careerGoal: { role: 'SE', companyType: 'Product', graduationTimeline: '2027' },
      personalAspirations: 'x',
    });

    await profileSettingsService.updateProfile('u1', {
      displayName: 'A New',
    });

    expect(StudentProfile.findOneAndUpdate).not.toHaveBeenCalled();
    expect(notificationService.createRepersonalizeNotification).not.toHaveBeenCalled();
  });
});
