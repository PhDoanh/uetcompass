const mongoose = require('mongoose');

const CompletedCourseSchema = new mongoose.Schema(
	{
		major: { type: String, required: true, trim: true },
		courseCode: { type: String, required: true, trim: true },
		courseUnitId: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseUnit', required: false },
	},
	{ _id: false }
);

const CareerGoalSchema = new mongoose.Schema(
	{
		role: { type: String, default: null, maxlength: 500, trim: true },
		companyType: { type: String, default: null, maxlength: 500, trim: true },
		graduationTimeline: { type: String, default: null, maxlength: 100, trim: true },
	},
	{ _id: false }
);

const StudentProfileSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User',
			required: true,
			unique: true,
			index: true,
		},
		isDraft: { type: Boolean, required: true, default: true },
		major: { type: String, default: null, trim: true },
		completedCourses: { type: [CompletedCourseSchema], default: [] },
		careerGoal: { type: CareerGoalSchema, default: () => ({}) },
		personalAspirations: { type: String, default: null, maxlength: 1000, trim: true },
		repersonalizationPending: { type: Boolean, required: true, default: false },
		submittedAt: { type: Date, default: null },
	},
	{
		collection: 'student_profiles',
		timestamps: true,
		versionKey: false,
	}
);

const StudentProfile = mongoose.model('StudentProfile', StudentProfileSchema, 'student_profiles');

module.exports = { StudentProfile };
