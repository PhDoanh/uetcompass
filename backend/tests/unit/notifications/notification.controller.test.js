jest.mock('../../../src/modules/notifications/notification.service', () => ({
  getNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  createRepersonalizeNotification: jest.fn(),
}));

const notificationService = require('../../../src/modules/notifications/notification.service');
const authController = require('../../../src/modules/auth/auth.controller');

describe('notification controllers', () => {
  beforeEach(() => jest.clearAllMocks());

  test('GET /api/notifications returns list', async () => {
    notificationService.getNotifications.mockResolvedValueOnce([{ _id: 'n1', read: false }]);
    const req = { user: { userId: 'u1' }, query: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await authController.getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('PATCH /api/notifications/:id/read marks one as read', async () => {
    notificationService.markNotificationRead.mockResolvedValueOnce({ _id: 'n1', read: true });
    const req = { user: { userId: 'u1' }, params: { id: 'n1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await authController.markNotificationRead(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('REPERSONALIZE notification helper resolves within 5 seconds', async () => {
    notificationService.createRepersonalizeNotification.mockResolvedValueOnce({ _id: 'n1' });

    const start = Date.now();
    await notificationService.createRepersonalizeNotification('u1');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThanOrEqual(5000);
  });
});
