'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./roadmap.controller');

const roadmapRouter = express.Router();

roadmapRouter.use(requireAuth);

roadmapRouter.get('/primary', controller.getPrimaryRoadmap);
roadmapRouter.post('/primary/regenerate', controller.retryGeneration);
roadmapRouter.post('/primary/accept', controller.acceptRoadmapHandler);
roadmapRouter.post('/primary/reject', controller.rejectRoadmap);
// roadmapRouter.get('/', controller.listRoadmaps); // Deprecated compatibility alias, now removed
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);

module.exports = { roadmapRouter };
