'use strict';

function sendNotification(userId, eventName, payload) {
	try {
		const { notifyUser } = require('../onboarding/onboarding.sse');
		notifyUser(userId.toString(), eventName, payload);
	} catch {
		// SSE module unavailable (test env) — silently ignore
	}
}

function notifyPreviewReady(userId) {
	sendNotification(userId, 'roadmap:status', { status: 'completed' });
}

function notifyGenerationFailed(userId) {
	sendNotification(userId, 'roadmap:status', { status: 'failed', retryable: true });
}

module.exports = { notifyPreviewReady, notifyGenerationFailed };
