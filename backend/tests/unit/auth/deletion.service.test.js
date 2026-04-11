jest.mock('../../../src/modules/auth/user.model', () => ({
  User: {
    findById: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    updateOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
  StudentProfile: {
    deleteOne: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/refreshToken.model', () => ({
  RefreshToken: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/notifications/notification.model', () => ({
  Notification: {
    deleteMany: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/deletedEmail.model', () => ({
  DeletedEmail: {
    create: jest.fn(),
  },
}));

jest.mock('../../../src/modules/auth/auth.email', () => ({
  sendDeletionConfirmationEmail: jest.fn(),
}));

const { User } = require('../../../src/modules/auth/user.model');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { RefreshToken } = require('../../../src/modules/auth/refreshToken.model');
const { Notification } = require('../../../src/modules/notifications/notification.model');
const { DeletedEmail } = require('../../../src/modules/auth/deletedEmail.model');
const deletionService = require('../../../src/modules/auth/deletion.service');

describe('deletion service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('executes hard-delete cascade on token confirmation', async () => {
    User.findOne.mockResolvedValueOnce({
      _id: 'u1',
      email: 'a@vnu.edu.vn',
      deletionToken: {
        hash: deletionService.hashDeletionToken('raw-token'),
        expiresAt: new Date(Date.now() + 60_000),
        used: false,
      },
    });

    const result = await deletionService.confirmDeletionByToken('raw-token');

    expect(result.code).toBe('ACCOUNT_DELETED');
    expect(User.deleteOne).toHaveBeenCalled();
    expect(StudentProfile.deleteOne).toHaveBeenCalled();
    expect(RefreshToken.deleteMany).toHaveBeenCalled();
    expect(Notification.deleteMany).toHaveBeenCalled();
    expect(DeletedEmail.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@vnu.edu.vn' }));
  });
});
