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
      enum: ['PASSWORD_CHANGED', 'PASSWORD_RESET_COMPLETED'],
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