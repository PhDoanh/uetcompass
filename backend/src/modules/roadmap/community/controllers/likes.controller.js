'use strict';

const likesService = require('../services/likes.service');
const { toHttpError } = require('../community.errors');

async function likePost(req, res) {
	try {
		const response = await likesService.likePost(req.params.postId, req.user.userId);
		return res.status(response.created ? 201 : 200).json({
			communityPostId: response.communityPostId,
			likeCount: response.likeCount,
			hasLiked: response.hasLiked,
		});
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function unlikePost(req, res) {
	try {
		const response = await likesService.unlikePost(req.params.postId, req.user.userId);
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

module.exports = {
	likePost,
	unlikePost,
};
