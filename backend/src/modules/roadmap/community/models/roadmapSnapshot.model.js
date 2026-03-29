'use strict';

const mongoose = require('mongoose');

const SnapshotNodeSchema = new mongoose.Schema(
	{
		courseCode: { type: String, required: true, trim: true },
		courseName: { type: String, required: true, trim: true },
		skills: { type: [String], default: [] },
		reason: { type: String, required: true },
		major: { type: String, default: null, trim: true },
	},
	{ _id: false }
);

const RoadmapSnapshotSchema = new mongoose.Schema(
	{
		userId: { type: String, required: true, index: true },
		acceptedRoadmapId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
		capturedAt: { type: Date, required: true, default: Date.now },
		contentHash: { type: String, required: true, trim: true },
		nodes: { type: [SnapshotNodeSchema], default: [] },
		nodeCount: { type: Number, required: true, min: 0 },
	},
	{
		collection: 'roadmap_snapshots',
		timestamps: true,
		versionKey: false,
	}
);

RoadmapSnapshotSchema.index({ acceptedRoadmapId: 1, contentHash: 1 }, { unique: true });
RoadmapSnapshotSchema.index({ userId: 1, capturedAt: -1 });

const RoadmapSnapshot = mongoose.models.RoadmapSnapshot
	|| mongoose.model('RoadmapSnapshot', RoadmapSnapshotSchema, 'roadmap_snapshots');

module.exports = { RoadmapSnapshot };
