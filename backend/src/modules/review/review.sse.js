'use strict';

const connections = new Set();

function addConnection(res) {
	connections.add(res);
	res.on('close', () => {
		connections.delete(res);
	});
}

function broadcastRatingUpdate(payload) {
	for (const res of connections) {
		res.write(`event: review:rating\ndata: ${JSON.stringify(payload)}\n\n`);
	}
}

function broadcastModerationUpdate(payload) {
	for (const res of connections) {
		res.write(`event: review:moderation\ndata: ${JSON.stringify(payload)}\n\n`);
	}
}

module.exports = {
	addConnection,
	broadcastRatingUpdate,
	broadcastModerationUpdate,
};