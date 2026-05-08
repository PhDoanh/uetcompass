jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    deleteOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/refreshToken.model', () => ({
  RefreshToken: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/deletedEmail.model', () => ({
  DeletedEmail: {
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/securityAudit.model', () => ({
  SecurityAudit: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/notifications/notification.model', () => ({
  Notification: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/roadmap/roadmap.model', () => ({
  Roadmap: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/roadmap/roadmapProgress.model', () => ({
  RoadmapProgress: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/roadmap/manualRoadmap.model', () => ({
  ManualRoadmap: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/account/account.model', () => ({
  AccountAuditEvent: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/account/accountAudit.service', () => ({
  emitPasswordChanged: jest.fn(),
  emitProfileUpdated: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const { RefreshToken } = require('../../../src/modules/auth/refreshToken.model');
const { DeletedEmail } = require('../../../src/modules/auth/deletedEmail.model');
const { SecurityAudit } = require('../../../src/modules/auth/securityAudit.model');
const { Notification } = require('../../../src/modules/notifications/notification.model');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { Roadmap } = require('../../../src/modules/roadmap/roadmap.model');
const { RoadmapProgress } = require('../../../src/modules/roadmap/roadmapProgress.model');
const { ManualRoadmap } = require('../../../src/modules/roadmap/manualRoadmap.model');
const { AccountAuditEvent } = require('../../../src/modules/account/account.model');
const accountService = require('../../../src/modules/account/account.service');

describe('account.service hardDeleteAccount', () => {
  beforeEach(() => jest.clearAllMocks());

  test('throws when user does not exist', async () => {
    User.findById.mockResolvedValueOnce(null);

    await expect(accountService.hardDeleteAccount('u1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  test('hard-deletes user and related data', async () => {
    User.findById.mockResolvedValueOnce({ _id: 'u1', email: 'a@vnu.edu.vn' });

    const result = await accountService.hardDeleteAccount('u1');

    expect(StudentProfile.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(RefreshToken.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(Notification.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(SecurityAudit.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(AccountAuditEvent.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(RoadmapProgress.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(Roadmap.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(ManualRoadmap.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
    expect(User.deleteOne).toHaveBeenCalledWith({ _id: 'u1' });
    expect(DeletedEmail.updateOne).toHaveBeenCalledWith(
      { email: 'a@vnu.edu.vn' },
      {
        $set: {
          deletedAt: expect.any(Date),
        },
      },
      { upsert: true }
    );
    expect(result).toMatchObject({
      code: 'ACCOUNT_DELETED',
      message: 'Account deleted permanently.',
    });
  });
});
