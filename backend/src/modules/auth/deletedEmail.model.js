const mongoose = require('mongoose');

const deletedEmailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    deletedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

deletedEmailSchema.index({ email: 1 }, { unique: true, name: 'email_unique' });

const DeletedEmail =
  mongoose.models.DeletedEmail || mongoose.model('DeletedEmail', deletedEmailSchema, 'deleted_emails');

module.exports = {
  DeletedEmail,
};
