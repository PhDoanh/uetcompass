const mongoose = require('mongoose');

const aiContextSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: true,
    },
    careerGoal: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    generatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Compound unique index for (courseCode, careerGoal)
aiContextSchema.index({ courseCode: 1, careerGoal: 1 }, { unique: true });

module.exports = mongoose.model('AIContext', aiContextSchema, 'course_ai_contexts');
