'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./roadmap.controller');

const singleRouter = express.Router();

singleRouter.use(requireAuth);

singleRouter.get('/roadmap', (req, res, next) => {
	res.setHeader(
		'Deprecation',
		'true; reason="Use GET /api/primary-roadmap instead"'
	);
	return controller.getPrimaryRoadmap(req, res, next);
});

singleRouter.get('/primary-roadmap', controller.getPrimaryRoadmap);

singleRouter.post('/roadmap/retry', controller.retryGeneration);

const roadmapRouter = express.Router();

roadmapRouter.use(requireAuth);

roadmapRouter.post('/accept', controller.acceptRoadmapHandler);

roadmapRouter.get('/', controller.listRoadmaps);
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);

module.exports = { singleRouter, roadmapRouter };
