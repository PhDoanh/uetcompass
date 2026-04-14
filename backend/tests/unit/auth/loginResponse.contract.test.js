jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/password.service', () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

jest.mock('../../../src/modules/auth/google.service', () => ({
  verifyGoogleIdToken: jest.fn(),
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    findOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendRegistrationOtpEmail: jest.fn(),
}));

jest.mock('../../../src/modules/auth/token.service', () => ({
  issueAccessToken: jest.fn().mockReturnValue('access-token'),
}));

const { User } = require('../../../src/modules/auth/user.model');
const passwordService = require('../../../src/modules/auth/password.service');
const googleService = require('../../../src/modules/auth/google.service');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const authService = require('../../../src/modules/auth/auth.service');

describe('login response contract with onboarding state', () => {
  beforeEach(() => jest.clearAllMocks());

  test('email login includes DRAFT_IN_PROGRESS and key draft fields', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      status: 'active',
      passwordHash: 'hash',
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    passwordService.verifyPassword.mockResolvedValueOnce(true);
    StudentProfile.findOne.mockResolvedValueOnce({
      isDraft: true,
      major: 'Information Systems',
      completedCourses: [{ courseCode: 'INT3105' }],
      careerGoal: { role: 'PM', companyType: 'Startup', graduationTimeline: '2026' },
      personalAspirations: 'Lead teams',
    });

    const result = await authService.loginWithPassword({ email: 'a@vnu.edu.vn', password: 'ok' });

    expect(result.accessToken).toBeTruthy();
    expect(result.onboardingState).toBe('DRAFT_IN_PROGRESS');
    expect(result.onboardingDraft).toEqual(
      expect.objectContaining({
        major: 'Information Systems',
        completedCourseIds: ['INT3105'],
      })
    );
  });

  test('google login includes COMPLETED onboarding state', async () => {
    googleService.verifyGoogleIdToken.mockResolvedValueOnce({
      email: 'g@vnu.edu.vn',
      sub: 'gid-1',
      name: 'Google User',
    });
    User.findOne.mockResolvedValueOnce({
      _id: 'u2',
      email: 'g@vnu.edu.vn',
      status: 'active',
      linkedGoogleAccounts: [{ googleId: 'gid-1', email: 'g@vnu.edu.vn' }],
    });
    StudentProfile.findOne.mockResolvedValueOnce({ isDraft: false });

    const result = await authService.loginWithGoogle({ credential: 'cred' });

    expect(result.accessToken).toBeTruthy();
    expect(result.onboardingState).toBe('COMPLETED');
    expect(result.onboardingDraft).toBe(null);
  });
});
