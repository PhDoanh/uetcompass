const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    family: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    sessionId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    deviceFingerprint: {
      type: String,
      trim: true,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

refreshTokenSchema.index({ tokenHash: 1 }, { unique: true, name: 'tokenHash_unique' });
refreshTokenSchema.index({ userId: 1 }, { name: 'userId_idx' });
refreshTokenSchema.index({ family: 1 }, { name: 'family_idx' });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'ttl_idx' });

const RefreshToken =
  mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema, 'refresh_tokens');

module.exports = {
  RefreshToken,
};
