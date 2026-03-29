'use strict';

const mongoose = require('mongoose');

const CommunityPostSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true },
		sharedRoadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'SharedRoadmap',
			required: true,
			unique: true,
		},
		publishedAt: { type: Date, required: true, default: Date.now, index: true },
		likeCount: { type: Number, required: true, min: 0, default: 0 },
	},
	{
		collection: 'community_posts',
		timestamps: true,
		versionKey: false,
	}
);

CommunityPostSchema.index({ userId: 1 }, { unique: true });
CommunityPostSchema.index({ publishedAt: -1 });

const CommunityPost = mongoose.models.CommunityPost
	|| mongoose.model('CommunityPost', CommunityPostSchema, 'community_posts');

module.exports = { CommunityPost };
