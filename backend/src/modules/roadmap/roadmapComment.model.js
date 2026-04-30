'use strict';

const mongoose = require('mongoose');

const RoadmapCommentSchema = new mongoose.Schema(
	{
		roadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ManualRoadmap',
			required: true,
			index: true,
		},
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			index: true,
		},
		content: {
			type: String,
			required: true,
			trim: true,
			maxlength: 2000,
		},
		rating: {
			type: Number,
			required: true,
			min: 1,
			max: 5,
		},
	},
	{
		collection: 'roadmap_comments',
		timestamps: { createdAt: 'commentedAt', updatedAt: false },
		versionKey: false,
	}
);

RoadmapCommentSchema.index({ roadmapId: 1, commentedAt: -1 }, { name: 'roadmap_comments_by_roadmap_date' });
RoadmapCommentSchema.index({ roadmapId: 1, userId: 1, commentedAt: -1 }, { name: 'roadmap_comments_by_roadmap_user_date' });

const RoadmapComment = mongoose.models.RoadmapComment || mongoose.model('RoadmapComment', RoadmapCommentSchema, 'roadmap_comments');

module.exports = {
	RoadmapComment,
};