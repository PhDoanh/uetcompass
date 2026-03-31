'use strict';

const connections = new Map();

function addConnection(sseToken, res) {
	console.info('[roadmap:sse:open]', { sseToken });
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	});

	res.write(':ok\n\n');
	connections.set(sseToken, res);

	const heartbeat = setInterval(() => {
		res.write(': heartbeat\n\n');
	}, 15000);

	res.on('close', () => {
		clearInterval(heartbeat);
		connections.delete(sseToken);
		console.info('[roadmap:sse:close]', { sseToken });
	});
}

function notifyClientByToken(sseToken, eventName, data) {
	const res = connections.get(sseToken);
	if (!res) {
		console.warn('[roadmap:sse:missed]', { sseToken, eventName });
		return false;
	}
	res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
	console.info('[roadmap:sse:sent]', { sseToken, eventName });
	return true;
}

function closeConnection(sseToken) {
	const res = connections.get(sseToken);
	if (res) {
		res.end();
		connections.delete(sseToken);
	}
}

function notifyPreviewReady(userId) {
	sendNotification(userId, 'roadmap:status', { status: 'completed' });
}
function notifyPreviewReady(sseToken) {
   notifyClientByToken(sseToken, 'roadmap:notification', {
	   type: 'success',
	   message: 'Your roadmap has been generated!'
   });
}
function notifyGenerationFailed(userId) {
	sendNotification(userId, 'roadmap:status', { status: 'failed', retryable: true });
}
function notifyGenerationFailed(sseToken) {
   notifyClientByToken(sseToken, 'roadmap:notification', {
	   type: 'error',
	   message: 'Roadmap generation failed.',
	   retryable: true
   });
}
module.exports = {
	addConnection,
	closeConnection,
	connections,
	notifyClientByToken,
	notifyPreviewReady,
	notifyGenerationFailed,
};
