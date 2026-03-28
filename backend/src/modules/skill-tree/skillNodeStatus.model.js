const mongoose = require('mongoose');

const skillNodeStatusSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    courseCode: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'done'],
      required: true,
      default: 'pending',
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// Compound unique index for (studentId, courseCode)
skillNodeStatusSchema.index({ studentId: 1, courseCode: 1 }, { unique: true });

module.exports = mongoose.model('SkillNodeStatus', skillNodeStatusSchema, 'skill_node_statuses');
