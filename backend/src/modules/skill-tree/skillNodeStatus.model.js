const mongoose = require('mongoose');

const skillNodeStatusSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    nodeId: {
      type: String,
      required: true,
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

// Compound unique index for (studentId, nodeId)
skillNodeStatusSchema.index({ studentId: 1, nodeId: 1 }, { unique: true });

module.exports = mongoose.model('SkillNodeStatus', skillNodeStatusSchema, 'skill_node_statuses');
