const mongoose = require('mongoose');

const ProgramSchema = new mongoose.Schema(
	{
		programId: { type: String, required: true, trim: true },
		nameVI: { type: String, default: '' },
		nameEN: { type: String, default: '' },
		degree: { type: String, enum: ['bachelor', 'engineer', 'master', 'doctoral', null], default: null },
		durationYears: { type: Number, default: null },
		totalCredits: { type: Number, default: null },
		objectives: { type: String, default: '' },
		careerTracks: { type: [String], default: [] },
		creditBlocks: {
			type: [
				new mongoose.Schema(
					{
						blockName: { type: String, required: true },
						requiredCredits: { type: Number, required: true, min: 0 },
					},
					{ _id: false }
				),
			],
			default: [],
		},
		source: {
			url: { type: String, default: null },
			scrapeType: { type: String, default: null },
			scrapedAt: { type: Date, default: null },
			version: { type: String, default: null },
		},
	},
	{
		collection: 'programs',
		timestamps: true,
		versionKey: false,
	}
);

ProgramSchema.index({ programId: 1 }, { unique: true });

const Program = mongoose.models.Program || mongoose.model('Program', ProgramSchema, 'programs');

module.exports = { Program };
