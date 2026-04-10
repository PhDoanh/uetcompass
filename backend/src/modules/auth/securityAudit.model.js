const mongoose = require('mongoose');

const securityAuditSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        'PROFILE_UPDATED',
        'PASSWORD_CHANGED',
        'PASSWORD_RESET_COMPLETED',
        'ACCOUNT_DELETION_REQUESTED',
        'ACCOUNT_SOFT_DELETED',
      ],
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

const SecurityAudit =
  mongoose.models.SecurityAudit || mongoose.model('SecurityAudit', securityAuditSchema, 'security_audits');

module.exports = {
  SecurityAudit,
};