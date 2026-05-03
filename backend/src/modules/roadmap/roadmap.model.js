'use strict';

const mongoose = require('mongoose');

const RelatedCourseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    credits:    { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const RoadmapNodeSchema = new mongoose.Schema(
  {
    nodeId:        { type: String, required: true },
    nodeType:      { type: String, required: true, enum: ['topic', 'subtopic'] },
    skillName:     { type: String, required: true },
    parentNodeId:  { type: String, default: null },
    relatedCourses: { type: [RelatedCourseSchema], default: [] },
    reason:        { type: String, required: true },
    resources:     { type: [mongoose.Schema.Types.Mixed], default: [] },
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
		roadmapName: {
			type: String,
			required: true,
			trim: true,
		},
		personalisationLevel: {
			type: String,
			required: true,
			enum: ['full', 'low'],
		},
		nodes: {
			type: [RoadmapNodeSchema],
			default: [],
		},
		averageRating: {
			type: Number,
			default: null,
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

// List index: user roadmaps sorted by acceptance and recency
RoadmapSchema.index(
	{ userId: 1, acceptedAt: 1, updatedAt: -1 },
	{ name: 'roadmap_list_by_user_acceptedAt_updatedAt' }
);

// Detail index: auth-scoped lookup by id
RoadmapSchema.index(
	{ userId: 1, _id: 1 },
	{ name: 'roadmap_detail_by_user_id' }
);

const Roadmap = mongoose.models.Roadmap || mongoose.model('Roadmap', RoadmapSchema, 'roadmaps');

module.exports = { Roadmap };
