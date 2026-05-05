'use strict';

const reviewService = require('./review.service');
const reviewModerationService = require('./review.moderation.service');
const { addConnection } = require('./review.sse');

async function submitReview(req, res, next) {
	try {
		const result = await reviewService.upsertReview({
			studentId: req.user?.userId,
			roadmapId: req.body?.roadmapId,
			rating: req.body?.rating,
			content: req.body?.content,
		});
		void reviewModerationService.runReviewModerationJob(result.review?._id);
		return res.status(202).json(result);
	} catch (err) {
		return next(err);
	}
}

async function listReviews(req, res, next) {
	try {
		const result = await reviewService.listReviews({
			roadmapId: req.query?.roadmapId,
			page: req.query?.page,
			limit: req.query?.limit,
		});
		return res.status(200).json(result);
	} catch (err) {
		return next(err);
	}
}

async function listCarouselReviews(req, res, next) {
	try {
		const result = await reviewService.listCarouselReviews();
		return res.status(200).json(result);
	} catch (err) {
		return next(err);
	}
}

function ratingStream(req, res) {
	res.writeHead(200, {
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no',
	});
	res.write(':ok\n\n');
	addConnection(res);
}

module.exports = {
	submitReview,
	listReviews,
	listCarouselReviews,
	ratingStream,
};