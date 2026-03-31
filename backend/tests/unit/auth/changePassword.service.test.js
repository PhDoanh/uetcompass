jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/password.service', () => ({
  verifyPassword: jest.fn(),
  hashPassword: jest.fn(),
  requestPasswordReset: jest.fn(),
  verifyResetOtp: jest.fn(),
  resetPasswordWithToken: jest.fn(),
}));

jest.mock('../../../src/modules/auth/securityAudit.model', () => ({
  SecurityAudit: {
    create: jest.fn(),
  },
}));

const { User } = require('../../../src/modules/auth/user.model');
const passwordService = require('../../../src/modules/auth/password.service');
const { SecurityAudit } = require('../../../src/modules/auth/securityAudit.model');
const profileSettingsService = require('../../../src/modules/auth/profileSettings.service');

describe('change password service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('requires correct current password and writes PASSWORD_CHANGED audit', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      passwordHash: 'old-hash',
    });
    passwordService.verifyPassword.mockResolvedValueOnce(true);
    passwordService.hashPassword.mockResolvedValueOnce('new-hash');

    const result = await profileSettingsService.changePassword('u1', {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    });

    expect(result.code).toBe('PASSWORD_CHANGED');
    expect(User.updateOne).toHaveBeenCalled();
    expect(SecurityAudit.create).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'PASSWORD_CHANGED' })
    );
  });
});
