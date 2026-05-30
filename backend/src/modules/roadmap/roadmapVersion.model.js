'use strict';

const mongoose = require('mongoose');

const VersionEntrySchema = new mongoose.Schema(
	{
		yamlCode: { type: String, default: '' },
		updatedAt: { type: Date, default: Date.now },
	},
	{ versionKey: false }
);

const RoadmapVersionSchema = new mongoose.Schema(
	{
		roadmapId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'ManualRoadmap',
			required: true,
			unique: true,
		},
		versions: { type: [VersionEntrySchema], default: [] },
	},
	{
		collection: 'roadmap_versions',
		timestamps: false,
		versionKey: false,
	}
);

const RoadmapVersion =
	mongoose.models.RoadmapVersion ||
	mongoose.model('RoadmapVersion', RoadmapVersionSchema, 'roadmap_versions');

module.exports = { RoadmapVersion };
