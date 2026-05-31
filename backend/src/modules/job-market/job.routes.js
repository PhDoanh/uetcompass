'use strict';

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./job.controller');

const router = express.Router();

// Public listing — no auth required
router.get('/', controller.listJobs);
router.get('/roles', controller.listRoles);
router.get('/crawl/status', controller.getCrawlStatus);
router.get('/:jobId', controller.getJob);

// Trigger crawl — auth required
router.post('/crawl/trigger', requireAuth, controller.triggerCrawl);

module.exports = router;
