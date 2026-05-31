'use strict';

const mongoose = require('mongoose');

const RESOURCE_TYPES = [
    'video',
    'article',
    'docs',
    'documentation',
    'course',
    'project',
    'slide',
    'lecture_note',
    'textbook',
    'syllabus',
    'exercise',
    'lab',
    'assignment',
    'job',
    'other',
];

const RESOURCE_SOURCE_TYPES = [
    'uet_official',
    'uet_youtube',
    'youtube',
    'github',
    'external',
    'job_market',
    'unknown',
];

const ResourceSchema = new mongoose.Schema(
    {
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        type: {
            type: String,
            enum: RESOURCE_TYPES,
            default: 'article',
        },
        sourceType: {
            type: String,
            enum: RESOURCE_SOURCE_TYPES,
            default: 'external',
        },
        sourceName: { type: String, default: '', trim: true },
        platform: { type: String, default: '', trim: true },
        description: { type: String, default: '', trim: true },
        courseCode: { type: String, default: '', trim: true },
        courseName: { type: String, default: '', trim: true },
        crawledAt: { type: Date, default: Date.now },
        metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    },
    { _id: false }
);

const RelatedJobSchema = new mongoose.Schema(
    {
        jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', default: null },
        title: { type: String, required: true, trim: true },
        companyName: { type: String, default: '', trim: true },
        companyLogoUrl: { type: String, default: '', trim: true },
        location: { type: String, default: '', trim: true },
        salaryText: { type: String, default: '', trim: true },
        experienceText: { type: String, default: '', trim: true },
        sourceCode: { type: String, default: '', trim: true },
        sourceName: { type: String, default: '', trim: true },
        roleCodes: [{ type: String, trim: true }],
        skills: [{ type: String, trim: true }],
        score: { type: Number, default: 0 },
        matchScore: { type: Number, default: 0 },
        matchedTerms: [{ type: String, trim: true }],
        applyUrl: { type: String, default: '', trim: true },
        jobUrl: { type: String, required: true, trim: true },
        updatedAt: { type: Date, default: null },
    },
    { _id: false }
);

const SkillSchema = new mongoose.Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        skillName: { type: String, required: true, trim: true },
        description: { type: String, default: '', trim: true },
        resources: { type: [ResourceSchema], default: [] },
        relatedJobs: { type: [RelatedJobSchema], default: [] },
        resourceCuration: {
            status: {
                type: String,
                enum: ['idle', 'running', 'success', 'partial', 'failed'],
                default: 'idle',
            },
            version: { type: Number, default: 1 },
            lastStartedAt: { type: Date, default: null },
            lastFinishedAt: { type: Date, default: null },
            lastError: { type: String, default: '' },
            resourceCount: { type: Number, default: 0 },
            jobCount: { type: Number, default: 0 },
        },
        canonicalRoadmapId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Roadmap',
            default: null,
        },
        metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    },
    {
        collection: 'skills',
        timestamps: true,
        versionKey: false,
    }
);

SkillSchema.index({ skillName: 1 });
SkillSchema.index({ 'relatedJobs.jobId': 1 });

const Skill = mongoose.models.Skill || mongoose.model('Skill', SkillSchema, 'skills');

module.exports = {
    Skill,
    RESOURCE_TYPES,
    RESOURCE_SOURCE_TYPES,
};
