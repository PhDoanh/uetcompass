jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('../../../src/modules/account/accountAudit.service', () => ({
  emitProfileUpdated: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const accountAuditService = require('../../../src/modules/account/accountAudit.service');
const accountService = require('../../../src/modules/account/account.service');

describe('account.service updateProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  test('validates privacy setting', async () => {
    await expect(
      accountService.updateProfile('u1', { privacySetting: 'public' })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
  });

  test('updates profile and emits PROFILE_UPDATED audit', async () => {
    User.findById.mockResolvedValueOnce({
      _id: 'u1',
      email: 'student@vnu.edu.vn',
      displayName: 'old',
      fullName: 'Old Name',
      privacySetting: 'identified',
      avatarUrl: null,
    });
    User.findByIdAndUpdate.mockResolvedValueOnce({
      _id: 'u1',
      email: 'student@vnu.edu.vn',
      displayName: 'new-name',
      fullName: 'New Name',
      privacySetting: 'anonymous',
      avatarUrl: 'data:image/png;base64,abc',
    });

    const result = await accountService.updateProfile('u1', {
      displayName: 'new-name',
      fullName: 'New Name',
      privacySetting: 'anonymous',
      avatarUrl: 'data:image/png;base64,abc',
    });

    expect(result.message).toBe('Profile updated');
    expect(accountAuditService.emitProfileUpdated).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ changedFields: expect.any(Array) })
    );
  });
});
