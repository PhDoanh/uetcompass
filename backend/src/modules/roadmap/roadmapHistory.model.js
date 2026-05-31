'use strict';

const mongoose = require('mongoose');

const RoadmapHistorySchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		roadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ManualRoadmap',
			required: true,
		},
		eventType: {
			type: String,
			enum: ['node_transition', 'milestone_achieved'],
			required: true,
		},
		occurredAt: {
			type: Date,
			required: true,
			default: Date.now,
		},
		nodeTransition: {
			type: {
				nodeId: { type: String, trim: true, default: '' },
				nodeLabel: { type: String, trim: true, default: '' },
				fromState: { type: String, trim: true, default: '' },
				toState: { type: String, trim: true, default: '' },
			},
			default: null,
		},
		milestone: {
			type: {
				milestoneId: { type: String, trim: true, default: '' },
				milestoneTitle: { type: String, trim: true, default: '' },
				milestonePercent: { type: Number, default: null },
			},
			default: null,
		},
		dedupeKey: {
			type: String,
			trim: true,
			default: null,
		},
	},
	{
		collection: 'roadmap_history',
		timestamps: false,
		versionKey: false,
	}
);

RoadmapHistorySchema.index({ userId: 1, roadmapId: 1, occurredAt: -1 }, { name: 'history_by_user_roadmap_date' });
RoadmapHistorySchema.index({ userId: 1, roadmapId: 1, eventType: 1, occurredAt: -1 }, { name: 'history_by_user_roadmap_type_date' });
RoadmapHistorySchema.index(
	{ userId: 1, roadmapId: 1, dedupeKey: 1 },
	{
		unique: true,
		partialFilterExpression: { dedupeKey: { $exists: true, $ne: null } },
		name: 'history_dedupe_per_roadmap',
	}
);

const RoadmapHistory = mongoose.models.RoadmapHistory || mongoose.model('RoadmapHistory', RoadmapHistorySchema, 'roadmap_history');

module.exports = { RoadmapHistory };
