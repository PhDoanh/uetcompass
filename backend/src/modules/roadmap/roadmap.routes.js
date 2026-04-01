'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./roadmap.controller');
const { addConnection } = require('./roadmap.sse');



const roadmapRouter = express.Router();

// SSE connection endpoint for roadmap notifications
roadmapRouter.get('/sse', (req, res) => {
	const sseToken = req.query?.sseToken;
	if (!sseToken) {
		res.writeHead(401, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write('event: error\n');
		res.write('data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}\n\n');
		res.end();
		return;
	}
	addConnection(String(sseToken), res);
});

roadmapRouter.use(requireAuth);

roadmapRouter.post('/preview', controller.previewRoadmapHandler);
roadmapRouter.get('/primary', controller.getPrimaryRoadmap);
roadmapRouter.post('/primary/regenerate', controller.retryGeneration);
roadmapRouter.post('/primary/accept', controller.acceptRoadmapHandler);
roadmapRouter.post('/primary/reject', controller.rejectRoadmap);
// roadmapRouter.get('/', controller.listRoadmaps); // Deprecated compatibility alias, now removed
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);

module.exports = { roadmapRouter };
