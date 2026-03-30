const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['ROADMAP_READY', 'ROADMAP_FAILED', 'REPERSONALIZE'],
    },
    message: {
      type: String,
      required: true,
      maxlength: 500,
    },
    link: {
      type: String,
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

notificationSchema.index({ userId: 1, read: 1 }, { name: 'userId_read_idx' });

const Notification =
  mongoose.models.Notification || mongoose.model('Notification', notificationSchema, 'notifications');

module.exports = {
  Notification,
};
