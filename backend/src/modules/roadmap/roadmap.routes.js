'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./roadmap.controller');

const roadmapRouter = express.Router();

roadmapRouter.use(requireAuth);

// Canonical primary-roadmap endpoint
roadmapRouter.get('/primary', controller.getPrimaryRoadmap);

// Retry roadmap generation
roadmapRouter.post('/retry', controller.retryGeneration);

// Accept a generated roadmap preview
roadmapRouter.post('/accept', controller.acceptRoadmapHandler);
roadmapRouter.post('/reject', controller.rejectRoadmap);

// Collection endpoints
roadmapRouter.get('/', controller.listRoadmaps);
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);

module.exports = { roadmapRouter };
