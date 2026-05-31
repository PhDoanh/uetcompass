'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const itviecAdapter = require('../src/modules/job-market/adapters/itviec.adapter');
const jobokoAdapter = require('../src/modules/job-market/adapters/joboko.adapter');
const topcvAdapter = require('../src/modules/job-market/adapters/topcv.adapter');
const topdevAdapter = require('../src/modules/job-market/adapters/topdev.adapter');
const jobService = require('../src/modules/job-market/job.service');
const { Job } = require('../src/modules/job-market/job.model');
const { JOB_ROLES } = require('../src/modules/job-market/jobRole.config');

const SOURCE_TARGETS = {
    topcv: 4,
    topdev: 2,
    itviec: 2,
    joboko: 2,
};

const ADAPTERS = {
    topcv: topcvAdapter,
    topdev: topdevAdapter,
    itviec: itviecAdapter,
    joboko: jobokoAdapter,
};

async function countFor(roleCode, sourceCode) {
    return Job.countDocuments({ isTargetJob: true, roleCodes: roleCode, sourceCode });
}

async function crawlSourceRole(adapter, role, sourceCode, target) {
    const before = await countFor(role.code, sourceCode);
    const stat = { before, target, saved: 0, skipped: 0, runs: [] };
    if (before >= target) return stat;

    const queries = role.queries?.[sourceCode] || [role.label];
    const queryList = Array.isArray(queries) ? queries : [queries];

    for (const query of queryList) {
        if (await countFor(role.code, sourceCode) >= target) break;

        const run = await adapter.crawl(async (raw) => {
            if (await countFor(role.code, sourceCode) >= target) {
                return { status: 'skipped', reason: 'source_role_quota_reached' };
            }

            const result = await jobService.saveJob(raw);
            if (result?.status === 'saved') stat.saved++;
            else stat.skipped++;
            return result;
        }, { role, query, limit: 40 });

        stat.runs.push({
            query,
            totalFound: run.totalFound,
            totalSaved: run.totalSaved,
            totalSkipped: run.totalSkipped,
            errors: run.errors?.slice(0, 3) || [],
        });
    }

    stat.after = await countFor(role.code, sourceCode);
    return stat;
}

async function main() {
    if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    await Job.deleteMany({});

    const summary = {};

    try {
        for (const role of JOB_ROLES) {
            summary[role.code] = {};
            for (const [sourceCode, target] of Object.entries(SOURCE_TARGETS)) {
                const adapter = ADAPTERS[sourceCode];
                try {
                    summary[role.code][sourceCode] = await crawlSourceRole(adapter, role, sourceCode, target);
                } catch (err) {
                    summary[role.code][sourceCode] = { target, error: err.message };
                }
            }
        }

        const counts = await Job.aggregate([
            { $match: { isTargetJob: true } },
            { $unwind: '$roleCodes' },
            {
                $group: {
                    _id: { role: '$roleCodes', source: '$sourceCode' },
                    total: { $sum: 1 },
                    samples: { $push: { title: '$title', companyName: '$companyName', jobUrl: '$jobUrl' } },
                },
            },
            { $sort: { '_id.role': 1, '_id.source': 1 } },
        ]);

        console.log(JSON.stringify({
            summary,
            counts: counts.map((item) => ({
                role: item._id.role,
                source: item._id.source,
                total: item.total,
                samples: item.samples.slice(0, 3),
            })),
            total: await Job.countDocuments({ isTargetJob: true }),
        }, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

main().catch(async (err) => {
    console.error(err);
    try {
        await mongoose.disconnect();
    } catch {
        // Ignore disconnect failure on fatal crawl errors.
    }
    process.exitCode = 1;
});
