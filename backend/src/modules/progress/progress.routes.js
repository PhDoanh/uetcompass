'use strict';

const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const progressController = require('./progress.controller');

const router = express.Router();

router.get('/sse', progressController.streamProgressEvents);

router.use(requireAuth);
router.get('/summaries', progressController.getSummaries);
router.get('/summaries/:roadmapId/nodes', progressController.getRoadmapNodes);

module.exports = router;
