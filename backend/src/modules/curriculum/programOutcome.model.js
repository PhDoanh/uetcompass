const mongoose = require('mongoose');

const ProgramOutcomeSchema = new mongoose.Schema(
	{
		poId: { type: String, required: true, trim: true },
		programId: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		careerTracks: { type: [String], default: [] },
		source: {
			url: { type: String, default: null },
			scrapeType: { type: String, default: null },
			scrapedAt: { type: Date, default: null },
			version: { type: String, default: null },
		},
	},
	{
		collection: 'program_outcomes',
		timestamps: true,
		versionKey: false,
	}
);

ProgramOutcomeSchema.index({ poId: 1 }, { unique: true });
ProgramOutcomeSchema.index({ programId: 1 });

const ProgramOutcome =
	mongoose.models.ProgramOutcome || mongoose.model('ProgramOutcome', ProgramOutcomeSchema, 'program_outcomes');

module.exports = { ProgramOutcome };
