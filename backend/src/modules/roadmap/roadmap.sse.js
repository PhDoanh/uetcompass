'use strict';

const connections = new Map();      // sseToken → res
const userConnections = new Map(); // userId   → res

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

function addUserConnection(userId, res) {
	const key = userId.toString();
	userConnections.set(key, res);
	res.on('close', () => {
		userConnections.delete(key);
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

function notifyUser(userId, eventName, data) {
	const res = userConnections.get(userId.toString());
	if (!res) {
		console.warn('[roadmap:sse:missed]', { userId, eventName });
		return false;
	}
	res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
	console.info('[roadmap:sse:sent]', { userId, eventName });
	return true;
}

function closeConnection(sseToken) {
	const res = connections.get(sseToken);
	if (res) {
		res.end();
		connections.delete(sseToken);
	}
}

function notifyPreviewReady(sseToken) {
	notifyClientByToken(sseToken, 'roadmap:notification', {
		status: 'completed',
		type: 'success',
		message: 'Your roadmap has been generated!',
	});
}

function notifyGenerationFailed(sseToken, message) {
	notifyClientByToken(sseToken, 'roadmap:notification', {
		status: 'failed',
		type: 'error',
		message: message || 'Roadmap generation failed. Please try again later.',
		retryable: true,
	});
}
module.exports = {
	addConnection,
	addUserConnection,
	closeConnection,
	connections,
	notifyClientByToken,
	notifyUser,
	notifyPreviewReady,
	notifyGenerationFailed,
};
