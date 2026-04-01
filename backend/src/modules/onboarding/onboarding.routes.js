const express = require('express');
const controller = require('./onboarding.controller');
const { requireAuth } = require('../../middleware/auth.middleware');
const { addConnection } = require('./onboarding.sse');
const { verifyAccessToken } = require('../auth/token.service');

const router = express.Router();

router.get('/status', (req, res) => {
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

	try {
		const payload = verifyAccessToken(String(sseToken));
		const userId = String(payload?.userId || '').trim();
		if (!userId) {
			throw new Error('INVALID_TOKEN_PAYLOAD');
		}
		addConnection(userId, res);
	} catch (_) {
		res.writeHead(401, {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no',
		});
		res.write('event: error\n');
		res.write('data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}\n\n');
		res.end();
	}
});

router.get('/course-catalog', controller.getCourseCatalog);

router.use(requireAuth);

router.get('/draft', controller.getDraft);
router.put('/draft', controller.putDraft);
router.post('/submit', controller.submit);

module.exports = router;
