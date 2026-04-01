const mongoose = require('mongoose');

const googleAccountSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
  },
  { _id: false }
);

const emailVerificationSchema = new mongoose.Schema(
  {
    otp: { type: String, trim: true },
    expiresAt: { type: Date },
    verified: { type: Boolean, default: false },
  },
  { _id: false }
);

const passwordResetSchema = new mongoose.Schema(
  {
    otp: { type: String, trim: true },
    expiresAt: { type: Date },
    attempts: { type: Number, default: 0, min: 0 },
    resetTokenHash: { type: String, trim: true, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const deletionTokenSchema = new mongoose.Schema(
  {
    hash: { type: String, trim: true },
    expiresAt: { type: Date },
    used: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: (value) => /@vnu\.edu\.vn$/i.test(String(value || '')),
        message: 'email must end with @vnu.edu.vn',
      },
    },
    passwordHash: {
      type: String,
      default: null,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: null,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    privacySetting: {
      type: String,
      enum: ['identified', 'anonymous'],
      default: 'identified',
      required: true,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending-verification', 'active', 'locked', 'deleted'],
      default: 'pending-verification',
      required: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    lockedUntil: {
      type: Date,
      default: null,
      required: false,
    },
    linkedGoogleAccounts: {
      type: [googleAccountSchema],
      default: [],
    },
    emailVerification: {
      type: emailVerificationSchema,
      default: null,
    },
    passwordReset: {
      type: passwordResetSchema,
      default: null,
    },
    deletionToken: {
      type: deletionTokenSchema,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ email: 1 }, { unique: true, name: 'email_unique' });

const User = mongoose.models.User || mongoose.model('User', userSchema, 'users');

module.exports = {
  User,
};
