'use strict';

const pendingPreviews = new Map();

function storePendingPreview(userId, payload) {
	pendingPreviews.set(userId.toString(), payload);
}

function getPendingPreview(userId) {
	return pendingPreviews.get(userId.toString()) ?? null;
}

function clearPendingPreview(userId) {
	pendingPreviews.delete(userId.toString());
}

function getAllPendingUserIds() {
	return [...pendingPreviews.keys()];
}

module.exports = {
	storePendingPreview,
	getPendingPreview,
	clearPendingPreview,
	getAllPendingUserIds,
};
