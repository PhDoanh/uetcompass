const mongoose = require('mongoose');

const otpRateLimitSchema = new mongoose.Schema(
  {
    scope: {
      type: String,
      required: true,
      enum: ['account', 'ip'],
      index: true,
    },
    key: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    flowType: {
      type: String,
      required: true,
      enum: ['verify_email', 'forgot_password'],
      index: true,
    },
    windowStart: {
      type: Date,
      required: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    cooldownUntil: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

otpRateLimitSchema.index({ scope: 1, key: 1, flowType: 1 }, { unique: true, name: 'scope_key_flow_unique' });

const OtpRateLimit =
  mongoose.models.OtpRateLimit || mongoose.model('OtpRateLimit', otpRateLimitSchema, 'otp_rate_limits');

module.exports = {
  OtpRateLimit,
};
