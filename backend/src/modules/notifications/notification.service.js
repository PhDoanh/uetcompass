const { Notification } = require('./notification.model');
const { pushNotification } = require('./notification.sse');

async function createNotification({ userId, type, message, link = null }) {
  const created = await Notification.create({
    userId,
    type,
    message,
    link,
    read: false,
  });

  const payload = {
    _id: created._id,
    type: created.type,
    message: created.message,
    link: created.link,
    read: created.read,
    createdAt: created.createdAt,
  };

  pushNotification(userId, payload);
  return payload;
}

async function getNotifications(userId, read) {
  const query = { userId };
  if (typeof read === 'boolean') {
    query.read = read;
  }

  return Notification.find(query).sort({ createdAt: -1 }).lean();
}

async function markNotificationRead(userId, notificationId) {
  return Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { $set: { read: true } },
    { new: true }
  ).lean();
}

async function createRepersonalizeNotification(userId) {
  return createNotification({
    userId,
    type: 'REPERSONALIZE',
    message: 'Your profile changed. Re-personalize roadmap to refresh recommendations.',
    link: '/roadmap',
  });
}

module.exports = {
  createNotification,
  createRepersonalizeNotification,
  getNotifications,
  markNotificationRead,
};
