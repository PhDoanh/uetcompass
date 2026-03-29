const mongoose = require('mongoose');

const learningResourceSchema = new mongoose.Schema(
  {
    skillTrendSnapshotId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SkillTrendSnapshot',
      required: true
    },
    skillName: {
      type: String,
      required: true,
      maxlength: 100,
      trim: true
    },
    roadmapNodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RoadmapNode',
      required: true
    },
    title: {
      type: String,
      required: true,
      maxlength: 500,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    sourcePlatform: {
      type: String,
      enum: ['udemy', 'coursera', 'youtube', 'edx', 'freecodecamp', 'viblo', 'linkedin_learning', 'other'],
      required: true
    },
    resourceType: {
      type: String,
      enum: ['video', 'article', 'course', 'documentation', 'tutorial'],
      required: true
    },
    isFree: {
      type: Boolean,
      default: false
    },
    qualitySignal: {
      type: Object,
      default: null
    },
    'qualitySignal.type': {
      enum: ['rating', 'enrollment_count', 'view_count', 'reviews'],
      type: String
    },
    'qualitySignal.value': {
      type: Number,
      min: 0
    },
    lastCrawledAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    isAvailable: {
      type: Boolean,
      default: true
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
    collection: 'learning_resources',
    timestamps: true
  }
);

// Indexes as per data-model.md
learningResourceSchema.index({ skillTrendSnapshotId: 1, url: 1 }, { unique: true });
learningResourceSchema.index({ skillTrendSnapshotId: 1, isAvailable: 1 });
learningResourceSchema.index({ roadmapNodeId: 1, skillName: 1 });
learningResourceSchema.index({ skillName: 1, isAvailable: 1 });

module.exports = mongoose.model('LearningResource', learningResourceSchema);
