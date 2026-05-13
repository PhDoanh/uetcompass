'use strict';

const mongoose = require('mongoose');

const roadmapProgressActivitySchema = new mongoose.Schema(
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
    nodeId: {
      type: String,
      required: true,
      trim: true,
    },
    lastInProgressAt: {
      type: Date,
      default: null,
    },
    lastDoneAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: 'roadmap_progress_activity',
    timestamps: true,
    versionKey: false,
  }
);

roadmapProgressActivitySchema.index(
  { userId: 1, roadmapId: 1, nodeId: 1 },
  { unique: true, name: 'userId_roadmapId_nodeId_unique' }
);

roadmapProgressActivitySchema.index(
  { userId: 1, roadmapId: 1, updatedAt: -1 },
  { name: 'userId_roadmapId_updatedAt_idx' }
);

const RoadmapProgressActivity =
  mongoose.models.RoadmapProgressActivity ||
  mongoose.model('RoadmapProgressActivity', roadmapProgressActivitySchema, 'roadmap_progress_activity');

module.exports = RoadmapProgressActivity;
