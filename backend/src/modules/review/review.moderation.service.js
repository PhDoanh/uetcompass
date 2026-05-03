'use strict';

const { Review } = require('./review.model');
const reviewService = require('./review.service');
const reviewNotifications = require('./review.notifications');
const { broadcastRatingUpdate, broadcastModerationUpdate } = require('./review.sse');

const BLOCKED_PATTERNS = [
	/\bscam\b/i,
	/\bfraud\b/i,
	/\bhack(?:er|ing)?\b/i,
	/\bspam\b/i,
];

function containsBlockedContent(content) {
	const normalized = String(content || '');
	return BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

async function updateStatus(reviewId, status) {
	return Review.findByIdAndUpdate(reviewId, { $set: { status, updatedAt: new Date() } }, { new: true }).lean();
}

async function runReviewModerationJob(reviewId) {
	const review = await Review.findById(reviewId).lean();
	if (!review) {
		return null;
	}

	if (containsBlockedContent(review.content)) {
		const flagged = await updateStatus(reviewId, 'flagged');
		await reviewNotifications.notifyFlaggedReview(flagged);
		broadcastModerationUpdate({ reviewId: flagged._id, roadmapId: flagged.roadmapId, status: 'flagged' });
		const summary = await reviewService.recalculateRoadmapAverageRating(flagged.roadmapId);
		broadcastRatingUpdate(summary);
		return flagged;
	}

	const approved = await updateStatus(reviewId, 'approved');
	const summary = await reviewService.recalculateRoadmapAverageRating(approved.roadmapId);
	broadcastModerationUpdate({ reviewId: approved._id, roadmapId: approved.roadmapId, status: 'approved' });
	broadcastRatingUpdate(summary);
	return approved;
}

module.exports = {
	runReviewModerationJob,
	containsBlockedContent,
};