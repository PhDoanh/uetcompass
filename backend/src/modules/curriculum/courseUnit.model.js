const mongoose = require('mongoose');

const CourseUnitSchema = new mongoose.Schema(
	{
		code: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		credits: { type: Number, required: true, min: 1 },
		programId: { type: String, required: true, trim: true },
		prerequisites: { type: [String], default: [] },
		type: { type: String, enum: ['required', 'elective', null], default: null },
		theoryHours: { type: Number, min: 0, default: null },
		practiceHours: { type: Number, min: 0, default: null },
		emphasis: { type: String, enum: ['theory-heavy', 'balance', 'project-heavy', null], default: null },
		block: { type: String, default: null },
		difficultyLevel: { type: Number, min: 1, max: 5, default: null },
		careerTracks: { type: [String], default: [] },
		skills: { type: [String], default: [] },
		tags: { type: [String], default: [] },
		courseOutcomeId: { type: String, default: null },
		source: {
			url: { type: String, default: null },
			scrapeType: { type: String, default: null },
			scrapedAt: { type: Date, default: null },
			version: { type: String, default: null },
		},
		enrichmentSource: {
			scrapeType: {
				type: String,
				enum: ['ai-inferred', 'human-validated', 'ai-fallback-runtime', null],
				default: null,
			},
			enrichedAt: { type: Date, default: null },
			validatedAt: { type: Date, default: null },
			validatedBy: { type: String, default: null },
			validationNote: { type: String, default: null },
		},
		seededAt: { type: Date, default: Date.now },
	},
	{
		collection: 'course_units',
		timestamps: true,
		versionKey: false,
	}
);

CourseUnitSchema.index({ code: 1, programId: 1 }, { unique: true, name: 'code_program_unique' });
CourseUnitSchema.index({ programId: 1 }, { name: 'programId_idx' });

const CourseUnit = mongoose.models.CourseUnit || mongoose.model('CourseUnit', CourseUnitSchema, 'course_units');

module.exports = { CourseUnit };
