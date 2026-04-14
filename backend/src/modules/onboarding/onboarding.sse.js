const connections = new Map();

function addConnection(userId, res) {
	console.info('[onboarding:sse:open]', { userId });
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	});

	res.write(':ok\n\n');
	connections.set(userId, res);

	const heartbeat = setInterval(() => {
		res.write(': heartbeat\n\n');
	}, 15000);

	res.on('close', () => {
		clearInterval(heartbeat);
		connections.delete(userId);
		console.info('[onboarding:sse:close]', { userId });
	});
}

function notifyUser(userId, eventName, data) {
	const res = connections.get(userId);
	if (!res) {
		console.warn('[onboarding:sse:missed]', { userId, eventName });
		return false;
	}
	res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
	console.info('[onboarding:sse:sent]', { userId, eventName });
	return true;
}

function closeConnection(userId) {
	const res = connections.get(userId);
	if (res) {
		res.end();
		connections.delete(userId);
	}
}

module.exports = {
	addConnection,
	closeConnection,
	connections,
	notifyUser,
};
