const mongoose = require('mongoose');

const skillTrendSnapshotSchema = new mongoose.Schema(
  {
    roadmapNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadmapNode',
      required: true
    },
    skillName: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Skill',
      default: null
    },
    personalizationContext: {
      type: Object,
      default: null
    },
    personalizationContext: {
      major: String,
      careerRole: String,
      companyType: String
    },
    jobCount: {
      type: Number,
      required: true,
      default: 0,
      min: 0
    },
    jobCountTrend: {
      type: String,
      enum: ['increasing', 'stable', 'decreasing'],
      default: 'stable'
    },
    averageSalaryRange: {
      type: Object,
      default: null
    },
    'averageSalaryRange.min': Number,
    'averageSalaryRange.max': Number,
    'averageSalaryRange.currency': {
      enum: ['VND', 'USD'],
      type: String
    },
    snapshotDate: {
      type: Date,
      required: true
    },
    contributingSources: {
      type: [String],
      default: []
    },
    expiresAt: {
      type: Date,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    collection: 'skill_trend_snapshots',
    timestamps: true
  }
);

// Indexes as per data-model.md
skillTrendSnapshotSchema.index({ roadmapNodeId: 1, skillName: 1, snapshotDate: 1 }, { unique: true });
skillTrendSnapshotSchema.index({ roadmapNodeId: 1, snapshotDate: -1 });
skillTrendSnapshotSchema.index({ skillId: 1 });
// TTL index for automatic expiration
skillTrendSnapshotSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SkillTrendSnapshot', skillTrendSnapshotSchema);
