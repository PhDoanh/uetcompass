jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendRegistrationOtpEmail: jest.fn(),
}));

jest.mock('../../../src/modules/auth/password.service', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../../../src/modules/auth/google.service', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock('../../../src/modules/auth/token.service', () => ({
  issueAccessToken: jest.fn().mockReturnValue('token'),
}));

const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const authService = require('../../../src/modules/auth/auth.service');

describe('onboarding state resolver', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns NEVER_STARTED when profile is null', async () => {
    StudentProfile.findOne.mockResolvedValueOnce(null);

    const result = await authService.resolveOnboardingState('u1');

    expect(result.onboardingState).toBe('NEVER_STARTED');
    expect(result.onboardingDraft).toBe(null);
  });

  test('returns DRAFT_IN_PROGRESS with key draft fields', async () => {
    StudentProfile.findOne.mockResolvedValueOnce({
      isDraft: true,
      major: 'Computer Science',
      completedCourses: [{ courseCode: 'INT2204' }],
      careerGoal: {
        role: 'Backend Engineer',
        companyType: 'Product',
        graduationTimeline: '2027',
      },
      personalAspirations: 'Build scalable systems',
    });

    const result = await authService.resolveOnboardingState('u1');

    expect(result.onboardingState).toBe('DRAFT_IN_PROGRESS');
    expect(result.onboardingDraft).toEqual({
      major: 'Computer Science',
      completedCourseIds: ['INT2204'],
      careerGoal: {
        role: 'Backend Engineer',
        companyType: 'Product',
        graduationTimeline: '2027',
      },
      personalAspirations: 'Build scalable systems',
    });
  });

  test('returns COMPLETED when profile is submitted', async () => {
    StudentProfile.findOne.mockResolvedValueOnce({ isDraft: false });

    const result = await authService.resolveOnboardingState('u1');

    expect(result.onboardingState).toBe('COMPLETED');
    expect(result.onboardingDraft).toBe(null);
  });
});
