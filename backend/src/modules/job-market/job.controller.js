'use strict';

const jobService = require('./job.service');
const crawlService = require('./crawl.service');
const { JOB_ROLES } = require('./jobRole.config');

async function listJobs(req, res) {
    try {
        const { page = 1, limit = 20, source, role, q = '', all } = req.query;
        const result = await jobService.listJobs({
            page: Number(page),
            limit: Number(limit),
            sourceCode: source || undefined,
            roleCode: role || undefined,
            isTargetOnly: all !== 'true',
            q: String(q).trim(),
        });
        res.json(result);
    } catch (err) {
        handleError(err, res);
    }
}

async function getJob(req, res) {
    try {
        const job = await jobService.getJobById(req.params.jobId);
        if (!job) return res.status(404).json({ error: { code: 'JOB_NOT_FOUND', message: 'Job not found.' } });
        res.json(job);
    } catch (err) {
        handleError(err, res);
    }
}

async function triggerCrawl(req, res) {
    try {
        const { source, role, limitPerSource } = req.body || {};
        if (crawlService.isRunning()) {
            return res.status(409).json({ error: { code: 'CRAWL_IN_PROGRESS', message: 'A crawl is already running.' } });
        }

        crawlService.runCrawl({
            sourceCode: source,
            roleCode: role,
            limitPerSource: Number(limitPerSource) || undefined,
        }).catch((err) => {
            console.error('[crawl] background error:', err.message);
        });

        res.json({
            message: 'Crawl started.',
            source: source || 'all',
            role: role || 'all',
            limitPerSource: Number(limitPerSource) || 10,
        });
    } catch (err) {
        handleError(err, res);
    }
}

async function getCrawlStatus(req, res) {
    try {
        const { source } = req.query;
        const runs = await jobService.listCrawlRuns(source, 20);
        res.json({ isRunning: crawlService.isRunning(), recentRuns: runs });
    } catch (err) {
        handleError(err, res);
    }
}

function listRoles(req, res) {
    res.json({ roles: JOB_ROLES.map(({ code, label }) => ({ code, label })) });
}

function handleError(err, res) {
    if (err.status) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message } });
    }
    console.error('[job-market] unhandled error:', err);
    res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: err.message } });
}

module.exports = { getCrawlStatus, getJob, listJobs, listRoles, triggerCrawl };
