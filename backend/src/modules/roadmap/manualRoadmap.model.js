'use strict';

const mongoose = require('mongoose');

const ManualRoadmapNodeSchema = new mongoose.Schema(
    {
        nodeId: {
            type: String,
            required: true,
            trim: true,
        },
        label: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            default: '',
        },
        prerequisites: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['locked', 'pending', 'in_progress', 'done'],
            default: 'pending',
        },
        skills: {
            type: [String],
            default: [],
        },
        resources: {
            type: [mongoose.Schema.Types.Mixed],
            default: [],
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
    },
    { _id: false }
);

const ManualRoadmapSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 200,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: '',
        },
        yamlCode: {
            type: String,
            required: true,
            trim: true,
            maxlength: 10240,
        },
        nodes: {
            type: [ManualRoadmapNodeSchema],
            default: [],
        },
        shared: {
            type: Boolean,
            required: true,
            default: false,
        },
        isPublic: {
            type: Boolean,
            required: true,
            default: false,
        },
        status: {
            type: String,
            required: true,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        sharedAt: {
            type: Date,
            default: null,
        },
    },
    {
        collection: 'manual_roadmaps',
        timestamps: true,
        versionKey: false,
    }
);

ManualRoadmapSchema.index({ userId: 1, updatedAt: -1 }, { name: 'manual_roadmap_by_user' });
ManualRoadmapSchema.index({ isPublic: 1, updatedAt: -1 }, { name: 'manual_roadmap_public' });

const ManualRoadmap = mongoose.models.ManualRoadmap || mongoose.model('ManualRoadmap', ManualRoadmapSchema);

module.exports = { ManualRoadmap };