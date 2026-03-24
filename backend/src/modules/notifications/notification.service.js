const { Notification } = require('./notification.model');

const sseConnections = new Map();

function addConnection(userId, res) {
  const key = String(userId);

  if (sseConnections.has(key)) {
    try {
      sseConnections.get(key).end();
    } catch (_) {
      // best effort cleanup
    }
  }

  sseConnections.set(key, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(':heartbeat\\n\\n');
    } catch (_) {
      clearInterval(heartbeat);
      sseConnections.delete(key);
    }
  }, 15000);

  res.on('close', () => {
    clearInterval(heartbeat);
    sseConnections.delete(key);
  });
}

function pushNotification(userId, payload) {
  const key = String(userId);
  const connection = sseConnections.get(key);

  if (!connection) {
    return;
  }

  connection.write('event: notification\\n');
  connection.write(`data: ${JSON.stringify(payload)}\\n\\n`);
}

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
  addConnection,
  createNotification,
  createRepersonalizeNotification,
  getNotifications,
  markNotificationRead,
};
