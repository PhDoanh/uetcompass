const express = require('express');
const taggingService = require('./tagging.service');
const { TaggingJob } = require('./tagging.model');
const logger = require('../../lib/logger');

const router = express.Router();

// Middleware to check service key for ingestion
const checkServiceKey = (req, res, next) => {
    const serviceKey = req.headers['x-service-key'];
    if (!serviceKey || serviceKey !== process.env.DEV_SERVICE_KEY) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid service key' } });
    }
    next();
};

// POST /api/tagging/skills - Enqueue a skill for tagging
router.post('/skills', checkServiceKey, async (req, res) => {
    try {
        const { name, description, domain, sourceCourseId } = req.body;

        if (!name || !domain) {
            return res.status(400).json({
                error: { code: 'INVALID_INPUT', message: 'name and domain are required' }
            });
        }

        const result = await taggingService.enqueueSkill({
            name,
            description,
            domain,
            sourceCourseId,
        });

        res.status(202).json(result);
    } catch (error) {
        if (error.message === 'Skill is already queued for tagging') {
            return res.status(409).json({
                error: { code: 'ALREADY_QUEUED', message: error.message }
            });
        }
        logger.error('Enqueue skill error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to enqueue skill' }
        });
    }
});

// GET /api/tagging/jobs - List jobs (admin only, but for now no auth check)
router.get('/jobs', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        const query = {};
        if (status) {
            query.status = { $in: status.split(',') };
        }

        const jobs = await TaggingJob.find(query)
            .populate('skillId', 'name')
            .sort({ createdAt: -1 })
            .skip(parseInt(offset))
            .limit(parseInt(limit));

        const total = await TaggingJob.countDocuments(query);

        const jobList = jobs.map(job => ({
            _id: job._id,
            skillName: job.skillId?.name || 'Unknown',
            status: job.status,
            attempts: job.attempts,
            lastError: job.lastError,
            confidence: job.confidence,
            createdAt: job.createdAt,
        }));

        res.json({ jobs: jobList, total });
    } catch (error) {
        logger.error('List jobs error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to list jobs' }
        });
    }
});

// GET /api/tagging/jobs/{jobId} - Get job details
router.get('/jobs/:jobId', async (req, res) => {
    try {
        const job = await TaggingJob.findById(req.params.jobId)
            .populate('skillId', 'name');

        if (!job) {
            return res.status(404).json({
                error: { code: 'NOT_FOUND', message: 'Job not found' }
            });
        }

        res.json({
            _id: job._id,
            skillName: job.skillId?.name || 'Unknown',
            status: job.status,
            resultTags: job.resultTags,
            confidence: job.confidence,
            attempts: job.attempts,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
        });
    } catch (error) {
        logger.error('Get job error:', error);
        res.status(500).json({
            error: { code: 'INTERNAL_ERROR', message: 'Failed to get job' }
        });
    }
});

module.exports = router;