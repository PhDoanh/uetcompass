const mongoose = require('mongoose');

const userFollowSchema = new mongoose.Schema(
  {
    followerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    followingUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

userFollowSchema.index(
  { followerUserId: 1, followingUserId: 1 },
  { unique: true, name: 'user_follow_unique' }
);

const UserFollow = mongoose.models.UserFollow || mongoose.model('UserFollow', userFollowSchema, 'user_follows');

module.exports = {
  UserFollow,
};