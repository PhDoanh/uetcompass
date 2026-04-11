'use strict';

const mongoose = require('mongoose');

const RoadmapProgressSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		roadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Roadmap',
			required: true,
		},
		state: {
			pending: {
				type: [String],
				default: [],
			},
			inProgress: {
				type: [String],
				default: [],
			},
			completed: {
				type: [String],
				default: [],
			},
			skip: {
				type: [String],
				default: [],
			},
		},
		updatedAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		collection: 'roadmap_progress',
		timestamps: false,
		versionKey: false,
	}
);

// Unique index: exactly one progress document per user-roadmap pair
RoadmapProgressSchema.index(
	{ userId: 1, roadmapId: 1 },
	{ unique: true, name: 'progress_per_user_roadmap' }
);

const RoadmapProgress =
	mongoose.models.RoadmapProgress ||
	mongoose.model('RoadmapProgress', RoadmapProgressSchema, 'roadmap_progress');

module.exports = { RoadmapProgress };
