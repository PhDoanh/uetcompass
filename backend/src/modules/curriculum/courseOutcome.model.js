const mongoose = require('mongoose');

const CourseOutcomeSchema = new mongoose.Schema(
	{
		coId: { type: String, required: true, trim: true, unique: true },
		courseCode: { type: String, required: true, trim: true },
		description: { type: String, required: true, trim: true },
		relatedPoIds: { type: [String], default: [] },
		skills: { type: [String], default: [] },
		source: {
			url: { type: String, default: null },
			scrapeType: { type: String, default: 'human-labeled' },
			scrapedAt: { type: Date, default: null },
			version: { type: String, default: null },
		},
	},
	{
		collection: 'course_outcomes',
		timestamps: true,
		versionKey: false,
	}
);

CourseOutcomeSchema.index({ coId: 1 }, { unique: true });
CourseOutcomeSchema.index({ courseCode: 1 });

const CourseOutcome =
	mongoose.models.CourseOutcome || mongoose.model('CourseOutcome', CourseOutcomeSchema, 'course_outcomes');

module.exports = { CourseOutcome };
