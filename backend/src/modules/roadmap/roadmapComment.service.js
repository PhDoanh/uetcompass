'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');
const { RoadmapComment } = require('./roadmapComment.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');

const COMMENT_POPULATE = {
	path: 'userId',
	select: 'displayName fullName privacySetting avatarUrl',
};

function clampLimit(value, fallback = 20) {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return fallback;
	}

	return Math.min(Math.floor(numeric), 100);
}

function resolveAuthorName(user) {
	if (!user || typeof user !== 'object') {
		return 'Người dùng';
	}

	if (user.privacySetting === 'anonymous') {
		return 'Người dùng ẩn danh';
	}

	return String(user.displayName || user.fullName || 'Người dùng').trim() || 'Người dùng';
}

function formatComment(doc) {
	if (!doc) {
		return null;
	}

	const populatedUser = doc.userId && typeof doc.userId === 'object' ? doc.userId : null;
	const commentedAt = doc.commentedAt ? new Date(doc.commentedAt) : null;

	return {
		id: String(doc._id || ''),
		roadmapId: String(doc.roadmapId || ''),
		userId: String(populatedUser?._id || doc.userId || ''),
		author: resolveAuthorName(populatedUser),
		rating: Number(doc.rating) || 0,
		content: String(doc.content || '').trim(),
		commentedAt: commentedAt ? commentedAt.toISOString() : null,
		date: commentedAt ? commentedAt.toLocaleString('vi-VN') : '',
	};
}

async function ensureRoadmapExists(roadmapId) {
	const roadmap = await ManualRoadmap.findById(roadmapId, { _id: 1 }).lean();
	if (!roadmap) {
		throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Public roadmap not found.');
	}

	return roadmap;
}

async function listByRoadmapId(roadmapId, { limit = 20 } = {}) {
	await ensureRoadmapExists(roadmapId);

	const safeLimit = clampLimit(limit, 20);
	const filter = { roadmapId };

	const [items, total] = await Promise.all([
		RoadmapComment.find(filter)
			.populate(COMMENT_POPULATE)
			.sort({ commentedAt: -1, _id: -1 })
			.limit(safeLimit)
			.lean(),
		RoadmapComment.countDocuments(filter),
	]);

	return {
		items: items.map(formatComment).filter(Boolean),
		pagination: { page: 1, limit: safeLimit, total },
	};
}

async function createComment(roadmapId, userId, { content, rating } = {}) {
	await ensureRoadmapExists(roadmapId);

	const trimmedContent = String(content || '').trim();
	const numericRating = Number(rating);

	if (!trimmedContent) {
		throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'Comment content is required.');
	}

	if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
		throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'Rating must be an integer between 1 and 5.');
	}

	const created = await RoadmapComment.create({
		roadmapId,
		userId,
		content: trimmedContent,
		rating: numericRating,
	});

	const populated = await RoadmapComment.findById(created._id)
		.populate(COMMENT_POPULATE)
		.lean();

	return formatComment(populated || created);
}

module.exports = {
	clampLimit,
	formatComment,
	listByRoadmapId,
	createComment,
};