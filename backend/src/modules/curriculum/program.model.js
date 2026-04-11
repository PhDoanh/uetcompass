const mongoose = require('mongoose');

const SourceSchema = new mongoose.Schema(
	{
		url: { type: String, default: null, trim: true },
		scrapeType: { type: String, default: null, trim: true },
		scrapedAt: { type: Date, default: null },
		version: { type: String, default: null, trim: true },
	},
	{ _id: false }
);

const ProgramSchema = new mongoose.Schema(
	{
		programId: { type: String, required: true, trim: true, unique: true, index: true },
		nameVI: { type: String, default: null, trim: true },
		nameEN: { type: String, required: true, trim: true },
		careerTracks: { type: [String], default: [] },
		source: { type: SourceSchema, default: null },
	},
	{
		collection: 'programs',
		timestamps: true,
		versionKey: false,
	}
);

const Program = mongoose.models.Program || mongoose.model('Program', ProgramSchema, 'programs');

module.exports = { Program };
