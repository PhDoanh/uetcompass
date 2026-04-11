jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('../../../src/modules/account/accountAudit.service', () => ({
  emitPasswordChanged: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const bcrypt = require('bcryptjs');
const accountAuditService = require('../../../src/modules/account/accountAudit.service');
const accountService = require('../../../src/modules/account/account.service');

describe('account.service changePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejects invalid password policy', async () => {
    await expect(
      accountService.changePassword('u1', {
        currentPassword: 'OldPass123!',
        newPassword: 'short',
      })
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
  });

  test('changes password and emits audit', async () => {
    User.findById.mockResolvedValueOnce({ _id: 'u1', passwordHash: 'old-hash' });
    bcrypt.compare.mockResolvedValueOnce(true);
    bcrypt.hash.mockResolvedValueOnce('new-hash');

    const result = await accountService.changePassword('u1', {
      currentPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
    });

    expect(result.message).toBe('Password changed successfully');
    expect(User.updateOne).toHaveBeenCalled();
    expect(accountAuditService.emitPasswordChanged).toHaveBeenCalledWith('u1');
  });
});
