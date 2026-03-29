'use strict';

const mongoose = require('mongoose');

const SharedRoadmapSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true },
		snapshotId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'RoadmapSnapshot',
			required: true,
			unique: true,
		},
		token: { type: String, required: true, unique: true, trim: true },
		accessMode: {
			type: String,
			required: true,
			enum: ['private', 'users-only', 'public'],
			default: 'private',
		},
		allowedUserIds: { type: [String], default: [] },
		status: { type: String, required: true, enum: ['active', 'revoked'], default: 'active' },
		revokedAt: { type: Date, default: null },
	},
	{
		collection: 'shared_roadmaps',
		timestamps: true,
		versionKey: false,
	}
);

SharedRoadmapSchema.index({ userId: 1, status: 1, createdAt: -1 });

const SharedRoadmap = mongoose.models.SharedRoadmap
	|| mongoose.model('SharedRoadmap', SharedRoadmapSchema, 'shared_roadmaps');

module.exports = { SharedRoadmap };
