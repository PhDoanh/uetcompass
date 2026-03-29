'use strict';

const mongoose = require('mongoose');

const CommunityPostLikeSchema = new mongoose.Schema(
	{
		communityPostId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'CommunityPost',
			required: true,
			index: true,
		},
		userId: { type: String, required: true, index: true },
	},
	{
		collection: 'community_post_likes',
		timestamps: true,
		versionKey: false,
	}
);

CommunityPostLikeSchema.index({ communityPostId: 1, userId: 1 }, { unique: true });
CommunityPostLikeSchema.index({ userId: 1, createdAt: -1 });

const CommunityPostLike = mongoose.models.CommunityPostLike
	|| mongoose.model('CommunityPostLike', CommunityPostLikeSchema, 'community_post_likes');

module.exports = { CommunityPostLike };
