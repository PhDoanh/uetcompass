'use strict';

const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
    {
        sourceCode: { type: String, required: true, index: true },
        sourceName: { type: String },
        sourceUrl: { type: String },
        sourceJobId: { type: String },

        roleCode: { type: String, index: true },
        roleLabel: { type: String },
        roleCodes: [{ type: String, index: true }],
        crawlQuery: { type: String },

        title: { type: String, required: true, index: true },
        companyName: { type: String, index: true },
        companyLogoUrl: { type: String },
        companyAddress: { type: String },

        location: { type: String },
        city: { type: String, default: 'Ha Noi', index: true },
        workingMode: { type: String },
        experienceText: { type: String },
        salaryText: { type: String },
        targetAudience: [{ type: String, index: true }],
        targetAudienceLabel: { type: String },

        skills: [{ type: String }],
        jobDomain: { type: String },
        jobExpertise: { type: String },

        description: { type: String },
        requirements: { type: String },
        responsibilities: { type: String },
        benefits: { type: String },
        companyInfo: { type: String },

        applyUrl: { type: String },
        jobUrl: { type: String, required: true, unique: true },
        originalJobUrl: { type: String },
        linkVerificationStatus: { type: String },
        linkVerifiedAt: { type: Date },

        postedAt: { type: Date },
        expiredAt: { type: Date },

        isTargetJob: { type: Boolean, default: false, index: true },
        score: { type: Number, default: 0, index: true },
        qualityFlags: [{ type: String }],

        rawJson: { type: mongoose.Schema.Types.Mixed },
        contentHash: { type: String, unique: true, sparse: true, index: true },
    },
    { timestamps: true }
);

const CrawlRunSchema = new mongoose.Schema(
    {
        sourceCode: { type: String, required: true, index: true },
        roleCode: { type: String, index: true },
        status: { type: String, enum: ['running', 'success', 'partial', 'failed'], required: true },
        startedAt: { type: Date, default: Date.now },
        finishedAt: { type: Date },
        totalFound: { type: Number, default: 0 },
        totalSaved: { type: Number, default: 0 },
        totalSkipped: { type: Number, default: 0 },
        errorMessage: { type: String },
    },
    { timestamps: true }
);

const CrawlJobLogSchema = new mongoose.Schema(
    {
        runId: { type: mongoose.Schema.Types.ObjectId, ref: 'CrawlRun', index: true },
        sourceCode: { type: String, required: true, index: true },
        jobUrl: { type: String, required: true },
        status: { type: String, enum: ['success', 'failed', 'skipped'], required: true },
        errorMessage: { type: String },
    },
    { timestamps: true }
);

const Job = mongoose.models.Job || mongoose.model('Job', JobSchema);
const CrawlRun = mongoose.models.CrawlRun || mongoose.model('CrawlRun', CrawlRunSchema);
const CrawlJobLog = mongoose.models.CrawlJobLog || mongoose.model('CrawlJobLog', CrawlJobLogSchema);

module.exports = { Job, CrawlRun, CrawlJobLog };
