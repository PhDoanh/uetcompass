'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const controller = require('./roadmap.controller');
const { addConnection, addUserConnection } = require('./roadmap.sse');



const roadmapRouter = express.Router();

// Public endpoints - no auth required
roadmapRouter.get('/public', controller.getPublicSharedRoadmap);

roadmapRouter.use(requireAuth);

// SSE connection endpoint for roadmap notifications (auth required for userId)
roadmapRouter.get('/sse', (req, res) => {
	const sseToken = req.query?.sseToken;
	if (!sseToken) {
		res.writeHead(400, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write('event: error\n');
		res.write('data: {"code":"INVALID_PAYLOAD","message":"Missing sseToken query parameter"}\n\n');
		res.end();
		return;
	}
	addConnection(String(sseToken), res);
	addUserConnection(req.user.userId, res);
});

roadmapRouter.post('/preview', controller.previewRoadmapHandler);
roadmapRouter.get('/primary', controller.getPrimaryRoadmap);
roadmapRouter.post('/primary/regenerate', controller.retryGeneration);
roadmapRouter.post('/primary/accept', controller.acceptRoadmapHandler);
roadmapRouter.post('/primary/reject', controller.rejectRoadmap);
// roadmapRouter.get('/', controller.listRoadmaps); // Deprecated compatibility alias, now removed
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);
roadmapRouter.get('/:roadmapId/progress', controller.getProgressHandler);
roadmapRouter.patch('/:roadmapId/progress/node', controller.updateNodeStateHandler);

module.exports = { roadmapRouter };
