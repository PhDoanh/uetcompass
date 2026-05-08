'use strict';

const { createNotification } = require('../notifications/notification.service');
const { User } = require('../auth/user.model');

async function notifyFlaggedReview(review) {
	const studentId = review?.studentId;
	if (!studentId) {
		return null;
	}

	const user = await User.findById(studentId).lean();
	if (!user) {
		return null;
	}

	await createNotification({
		userId: studentId,
		type: 'REVIEW_FLAGGED',
		message: 'Your roadmap review was flagged by moderation.',
		link: '/skill-tree',
	});

	return {
		studentId,
		email: user.email,
	};
}

module.exports = {
	notifyFlaggedReview,
};