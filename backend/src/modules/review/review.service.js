'use strict';

const mongoose = require('mongoose');
const { Review } = require('./review.model');
const { User } = require('../auth/user.model');
const roadmapService = require('../roadmap/roadmap.service');

function buildError(status, code, message) {
	const error = new Error(message);
	error.status = status;
	error.code = code;
	return error;
}

function normalizeObjectId(value, fieldName) {
	const normalized = String(value || '').trim();
	if (!normalized || !mongoose.Types.ObjectId.isValid(normalized)) {
		throw buildError(400, 'INVALID_PAYLOAD', `${fieldName} is required.`);
	}
	return normalized;
}

function normalizePage(value, fallback = 1) {
	const page = Number.parseInt(String(value || fallback), 10);
	return Number.isFinite(page) && page > 0 ? page : fallback;
}

function normalizeLimit(value, fallback = 10, max = 10) {
	const limit = Number.parseInt(String(value || fallback), 10);
	if (!Number.isFinite(limit) || limit <= 0) {
		return fallback;
	}
	return Math.min(limit, max);
}

function normalizeRating(value) {
	const rating = Number(value);
	if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
		throw buildError(400, 'INVALID_PAYLOAD', 'rating must be an integer between 1 and 5.');
	}
	return rating;
}

function normalizeContent(value) {
	const content = String(value || '').trim();
	if (!content) {
		throw buildError(400, 'INVALID_PAYLOAD', 'content is required.');
	}
	return content;
}

async function resolveStudentIdentity(studentId) {
	const user = await User.findById(studentId).lean();
	if (!user) {
		return {
			studentId,
			studentDisplayName: 'UET Student',
			avatarUrl: null,
		};
	}

	return {
		studentId,
		studentDisplayName: String(user.displayName || user.fullName || user.email || 'UET Student').trim(),
		avatarUrl: user.avatarUrl || null,
	};
}

async function ensureRoadmapExists(roadmapId) {
	const roadmap = await roadmapService.getByIdForReview(roadmapId);
	if (!roadmap) {
		throw buildError(404, 'ROADMAP_NOT_FOUND', 'Roadmap not found.');
	}
	return roadmap;
}

async function upsertReview({ studentId, roadmapId, rating, content }) {
	const normalizedStudentId = normalizeObjectId(studentId, 'studentId');
	const normalizedRoadmapId = normalizeObjectId(roadmapId, 'roadmapId');
	const normalizedRating = normalizeRating(rating);
	const normalizedContent = normalizeContent(content);

	await ensureRoadmapExists(normalizedRoadmapId);

	const review = await Review.findOneAndUpdate(
		{ roadmapId: normalizedRoadmapId, studentId: normalizedStudentId },
		{
			$set: {
				rating: normalizedRating,
				content: normalizedContent,
				status: 'pending',
				updatedAt: new Date(),
			},
			$setOnInsert: {
				roadmapId: normalizedRoadmapId,
				studentId: normalizedStudentId,
			},
		},
		{ upsert: true, new: true }
	).lean();
	const studentIdentity = await resolveStudentIdentity(normalizedStudentId);

	return {
		message: 'Review submitted for moderation.',
		review: {
			...studentIdentity,
			...review,
		},
	};
}

async function listReviews({ roadmapId, page = 1, limit = 10 } = {}) {
	const normalizedRoadmapId = normalizeObjectId(roadmapId, 'roadmapId');
	const nextPage = normalizePage(page, 1);
	const nextLimit = normalizeLimit(limit, 10, 10);

	await ensureRoadmapExists(normalizedRoadmapId);

	const query = {
		roadmapId: normalizedRoadmapId,
		status: 'approved',
	};

	const objectRoadmapId = new mongoose.Types.ObjectId(normalizedRoadmapId);
	const [items, total, summary] = await Promise.all([
		Review.find(query)
			.sort({ createdAt: -1, _id: -1 })
			.skip((nextPage - 1) * nextLimit)
			.limit(nextLimit + 1)
			.lean(),
		Review.countDocuments(query),
		Review.aggregate([
			{ $match: { roadmapId: objectRoadmapId, status: 'approved' } },
			{
				$group: {
					_id: '$roadmapId',
					averageRating: { $avg: '$rating' },
					reviewCount: { $sum: 1 },
				},
			},
		]),
	]);

	const slice = items.slice(0, nextLimit);
	const userIds = slice.map((item) => String(item.studentId || '')).filter(Boolean);
	const users = userIds.length > 0
		? await User.find({ _id: { $in: userIds } }, { displayName: 1, fullName: 1, avatarUrl: 1, email: 1 }).lean()
		: [];
	const userMap = new Map(users.map((user) => [String(user._id), user]));

	const normalizedItems = slice.map((item) => {
		const user = userMap.get(String(item.studentId || '')) || {};
		return {
			...item,
			studentDisplayName: String(user.displayName || user.fullName || user.email || 'UET Student').trim(),
			avatarUrl: user.avatarUrl || null,
		};
	});

	const aggregateSummary = summary[0] || {};

	return {
		items: normalizedItems,
		pagination: {
			page: nextPage,
			limit: nextLimit,
			hasMore: total > nextPage * nextLimit,
		},
		summary: {
			roadmapId: normalizedRoadmapId,
			averageRating: aggregateSummary.averageRating == null ? null : Number(aggregateSummary.averageRating.toFixed(1)),
			reviewCount: aggregateSummary.reviewCount || 0,
		},
	};
}

async function listCarouselReviews() {
	const reviews = await Review.find({ status: 'approved' })
		.sort({ rating: -1, createdAt: -1, _id: -1 })
		.limit(20)
		.lean();

	const userIds = reviews.map((item) => String(item.studentId || '')).filter(Boolean);
	const users = userIds.length > 0
		? await User.find({ _id: { $in: userIds } }, { displayName: 1, fullName: 1, avatarUrl: 1, email: 1 }).lean()
		: [];
	const userMap = new Map(users.map((user) => [String(user._id), user]));

	return {
		items: reviews.map((item) => {
			const user = userMap.get(String(item.studentId || '')) || {};
			const approvedAt = item.updatedAt || item.createdAt || null;
			const recency = approvedAt ? new Date(approvedAt).getTime() : 0;
			return {
				reviewId: item._id,
				roadmapId: item.roadmapId,
				studentDisplayName: String(user.displayName || user.fullName || user.email || 'UET Student').trim(),
				avatarUrl: user.avatarUrl || null,
				rating: item.rating,
				content: item.content,
				approvedAt,
				compositeScore: Number((item.rating * 1000000000000 + recency).toFixed(0)),
			};
		}),
	};
}

async function recalculateRoadmapAverageRating(roadmapId) {
	const normalizedRoadmapId = normalizeObjectId(roadmapId, 'roadmapId');
	await ensureRoadmapExists(normalizedRoadmapId);
	const objectRoadmapId = new mongoose.Types.ObjectId(normalizedRoadmapId);

	const [summary] = await Review.aggregate([
		{ $match: { roadmapId: objectRoadmapId, status: 'approved' } },
		{
			$group: {
				_id: '$roadmapId',
				averageRating: { $avg: '$rating' },
			},
		},
	]);

	const averageRating = summary?.averageRating == null ? null : Number(summary.averageRating.toFixed(1));
	await roadmapService.updateAverageRating(normalizedRoadmapId, averageRating);
	return { roadmapId: normalizedRoadmapId, averageRating };
}

module.exports = {
	Review,
	upsertReview,
	listReviews,
	listCarouselReviews,
	recalculateRoadmapAverageRating,
};