'use strict';

const mongoose = require('mongoose');

const roadmapProgressCacheSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      trim: true,
    },
    roadmapId: {
      type: String,
      required: true,
      trim: true,
    },
    roadmapName: {
      type: String,
      required: true,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      required: true,
      default: false,
    },
    totalNodes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    doneNodes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    inProgressNodes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    pendingNodes: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    progressPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    lastActivityDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'roadmap_progress_cache',
    timestamps: true,
    versionKey: false,
  }
);

roadmapProgressCacheSchema.index(
  { userId: 1, roadmapId: 1 },
  { unique: true, name: 'userId_roadmapId_unique' }
);

roadmapProgressCacheSchema.index(
  { userId: 1, updatedAt: -1 },
  { name: 'userId_updatedAt_idx' }
);

roadmapProgressCacheSchema.index(
  { userId: 1, isPrimary: -1, updatedAt: -1 },
  { name: 'userId_isPrimary_updatedAt_idx' }
);

const RoadmapProgressCache =
  mongoose.models.RoadmapProgressCache ||
  mongoose.model('RoadmapProgressCache', roadmapProgressCacheSchema, 'roadmap_progress_cache');

module.exports = RoadmapProgressCache;
