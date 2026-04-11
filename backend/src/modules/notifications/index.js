const { Notification } = require('./notification.model');
const notificationService = require('./notification.service');

module.exports = {
  Notification,
  ...notificationService,
};
