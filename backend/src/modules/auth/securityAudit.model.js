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
        'signup',
        'login_success',
        'login_fail',
        'otp_send',
        'otp_resend',
        'otp_verify_fail',
        'password_reset_success',
        'google_login_denied_domain',
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