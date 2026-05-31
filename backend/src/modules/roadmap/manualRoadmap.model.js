'use strict';

const mongoose = require('mongoose');

/**
 * Schema cho Edges (connections giữa nodes)
 * Cần thiết cho ELK.js layout engine và ReactFlow renderer
 */
const ManualRoadmapEdgeSchema = new mongoose.Schema(
    {
        edgeId: {
            type: String,
            required: true,
            trim: true,
        },
        source: {
            type: String,
            required: true,
            trim: true,
        },
        target: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['default', 'dashed', 'smoothstep'],
            default: 'default',
        },
    },
    { _id: false }
);

/**
 * Schema cho Roadmap Nodes
 * Parsed từ YAML input, chứa cấu trúc đồ thị
 */
const ManualRoadmapNodeSchema = new mongoose.Schema(
    {
        nodeId: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['main_topic', 'sub_topic', 'group_container', 'choice_item'],
            default: 'main_topic',
        },
        parentNodeId: {
            type: String,
            default: null,
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
        elkOptions: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        skillName: {
            type: String,
            trim: true,
            default: '',
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
        edges: {
            type: [ManualRoadmapEdgeSchema],
            default: [],
        },
        positions: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        averageRating: {
            type: Number,
            default: null,
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
        tags: {
            type: [
                {
                    label: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    normalizedLabel: {
                        type: String,
                        required: true,
                        trim: true,
                        lowercase: true,
                    },
                    _id: false,
                }
            ],
            default: [],
        },
        isPrimary: {
            type: Boolean,
            default: false,
        },
        studentProfileId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'StudentProfile',
            default: null,
        },
        personalisationLevel: {
            type: String,
            enum: ['full', 'low', 'manual'],
            default: 'manual',
        },
        acceptedAt: {
            type: Date,
            default: null,
        },
        source: {
            type: String,
            enum: ['auto', 'manual'],
            default: 'manual',
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
ManualRoadmapSchema.index(
    { userId: 1, isPrimary: 1 },
    {
        unique: true,
        partialFilterExpression: { isPrimary: true },
        name: 'manual_roadmap_primary_per_user',
    }
);

const ManualRoadmap = mongoose.models.ManualRoadmap || mongoose.model('ManualRoadmap', ManualRoadmapSchema);

module.exports = { ManualRoadmap };