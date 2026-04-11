'use strict';

const mongoose = require('mongoose');

const RoadmapNodeSchema = new mongoose.Schema(
  {
    courseCode:        { type: String, required: true, trim: true },
    courseName:        { type: String, required: true, trim: true },
    credits:           { type: Number, required: true, min: 1 },
    suggestedSemester: { type: Number, min: 1, default: null },
    reason:            { type: String, required: true },
		skills:            { type: [String], default: [] }, // Enriched by Feature 003
    resources:         { type: [mongoose.Schema.Types.Mixed], default: [] }, // Enriched by Feature 003
  },
  { _id: false }
);

const RoadmapSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
		},
		isPrimary: {
			type: Boolean,
			required: true,
			default: false,
		},
		studentProfileId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'StudentProfile',
			required: true,
		},
		personalisationLevel: {
			type: String,
			required: true,
			enum: ['full', 'low'],
		},
		status: {
			type: String,
			required: true,
			enum: ['completed', 'failed'],
		},
		errorMessage: {
			type: String,
			default: null,
		},
		nodes: {
			type: [RoadmapNodeSchema],
			default: [],
		},
		acceptedAt: {
			type: Date,
			default: null,
		},
	},
	{
		collection: 'roadmaps',
		timestamps: true,
		versionKey: false,
	}
);

// Partial unique index: exactly one primary roadmap per user
RoadmapSchema.index(
	{ userId: 1, isPrimary: 1 },
	{
		unique: true,
		partialFilterExpression: { isPrimary: true },
		name: 'primary_per_user_unique',
	}
);

// List index: user + status filter, sorted by recency
RoadmapSchema.index(
	{ userId: 1, status: 1, updatedAt: -1 },
	{ name: 'roadmap_list_by_user_status_updatedAt' }
);

// Detail index: auth-scoped lookup by id
RoadmapSchema.index(
	{ userId: 1, _id: 1 },
	{ name: 'roadmap_detail_by_user_id' }
);

const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', RoadmapSchema, 'roadmaps');

module.exports = { Roadmap };
