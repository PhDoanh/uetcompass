const mongoose = require('mongoose');

const UrlSnapshotSchema = new mongoose.Schema(
	{
		url: { type: String, required: true },
		contentHash: { type: String, required: true },
		httpEtag: { type: String, default: null },
		lastModified: { type: String, default: null },
		checkedAt: { type: Date, required: true, default: Date.now },
	},
	{ _id: false }
);

const SeedRunSchema = new mongoose.Schema(
	{
		runId: { type: String, required: true, unique: true, index: true },
		programId: { type: String, default: null, index: true },
		status: {
			type: String,
			enum: ['pending', 'running', 'completed', 'failed'],
			default: 'pending',
			index: true,
		},
		triggeredBy: { type: String, enum: ['cron', 'manual'], required: true },
		startedAt: { type: Date, required: true, default: Date.now },
		completedAt: { type: Date, default: null },
		urlSnapshots: { type: [UrlSnapshotSchema], default: [] },
		summary: {
			coursesUpserted: { type: Number, default: 0 },
			outcomesUpserted: { type: Number, default: 0 },
			errors: { type: [String], default: [] },
		},
	},
	{
		collection: 'seed_runs',
		timestamps: true,
		versionKey: false,
	}
);

SeedRunSchema.index({ programId: 1, status: 1 });
SeedRunSchema.index({ startedAt: -1 });

const SeedRun = mongoose.models.SeedRun || mongoose.model('SeedRun', SeedRunSchema, 'seed_runs');

module.exports = { SeedRun };
