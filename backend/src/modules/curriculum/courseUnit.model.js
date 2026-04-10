const mongoose = require('mongoose');

const CourseUnitSchema = new mongoose.Schema(
	{
		code: { type: String, required: true, trim: true },
		name: { type: String, required: true, trim: true },
		credits: { type: Number, required: true, min: 1 },
		major: { type: String, required: true, trim: true },
		prerequisites: { type: [String], default: [] },
		type: { type: String, enum: ['required', 'elective', null], default: null },
		suggestedSemester: { type: Number, min: 1, default: null },
		seededAt: { type: Date, default: Date.now },
	},
	{
		collection: 'course_units',
		timestamps: true,
		versionKey: false,
	}
);

CourseUnitSchema.index({ code: 1, major: 1 }, { unique: true, name: 'code_major_unique' });
CourseUnitSchema.index({ major: 1 }, { name: 'major_idx' });

const CourseUnit = mongoose.models.CourseUnit || mongoose.model('CourseUnit', CourseUnitSchema, 'course_units');

module.exports = { CourseUnit };
