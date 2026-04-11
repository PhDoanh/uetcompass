const mongoose = require('mongoose');
const { User } = require('../auth/user.model');

const accountAuditEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: ['PROFILE_UPDATED', 'PASSWORD_CHANGED'],
      index: true,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const AccountAuditEvent =
  mongoose.models.AccountAuditEvent ||
  mongoose.model('AccountAuditEvent', accountAuditEventSchema, 'account_audit_events');

module.exports = {
  StudentAccount: User,
  AccountAuditEvent,
};
