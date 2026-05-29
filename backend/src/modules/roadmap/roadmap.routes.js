'use strict';


const express = require('express');
const { requireAuth } = require('../../middleware/auth.middleware');
const { verifyAccessToken } = require('../auth/token.service');
const controller = require('./roadmap.controller');
const { addConnection, addUserConnection } = require('./roadmap.sse');



const roadmapRouter = express.Router();

// Public endpoints - no auth required
roadmapRouter.get('/public', controller.getPublicSharedRoadmap);
roadmapRouter.get('/manual-roadmaps/public', controller.listPublicManualRoadmaps);
roadmapRouter.get('/manual-roadmaps/public/:roadmapId', controller.getPublicManualRoadmapPreviewById);
roadmapRouter.get('/manual-roadmaps/tags', controller.getManualRoadmapTags);

// SSE endpoint supports EventSource by authenticating with JWT passed via sseToken query.
roadmapRouter.get('/sse', (req, res) => {
	const sseToken = String(req.query?.sseToken || '').trim();
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

	let userId = '';
	try {
		const payload = verifyAccessToken(sseToken);
		userId = String(payload?.userId || '').trim();
	} catch (_) {
		res.writeHead(401, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write('event: error\n');
		res.write('data: {"code":"UNAUTHORIZED","message":"Missing or invalid authentication"}\n\n');
		res.end();
		return;
	}

	if (!userId) {
		res.writeHead(401, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write('event: error\n');
		res.write('data: {"code":"UNAUTHORIZED","message":"Missing or invalid authentication"}\n\n');
		res.end();
		return;
	}

	addConnection(sseToken, res);
	addUserConnection(userId, res);
});

roadmapRouter.use(requireAuth);

roadmapRouter.post('/preview', controller.previewRoadmapHandler);
roadmapRouter.get('/primary', controller.getPrimaryRoadmap);
roadmapRouter.post('/primary/regenerate', controller.retryGeneration);
roadmapRouter.post('/primary/accept', controller.acceptRoadmapHandler);
roadmapRouter.post('/primary/reject', controller.rejectRoadmap);

roadmapRouter.post('/manual-roadmaps', controller.createManualRoadmap);
roadmapRouter.get('/manual-roadmaps', controller.listManualRoadmaps);
roadmapRouter.get('/manual-roadmaps/:roadmapId', controller.getManualRoadmapById);
roadmapRouter.patch('/manual-roadmaps/:roadmapId', controller.updateManualRoadmap);
roadmapRouter.delete('/manual-roadmaps/:roadmapId', controller.deleteManualRoadmap);
roadmapRouter.post('/manual-roadmaps/:roadmapId/share', controller.shareManualRoadmap);
roadmapRouter.post('/manual-roadmaps/:roadmapId/unshare', controller.unshareManualRoadmap);

// roadmapRouter.get('/', controller.listRoadmaps); // Deprecated compatibility alias, now removed
roadmapRouter.get('/:roadmapId', controller.getRoadmapById);
roadmapRouter.patch('/:roadmapId/primary', controller.switchPrimaryHandler);
roadmapRouter.get('/:roadmapId/progress', controller.getProgressHandler);
roadmapRouter.patch('/:roadmapId/progress/node', controller.updateNodeStateHandler);

module.exports = { roadmapRouter };
