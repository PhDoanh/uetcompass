'use strict';

const postsService = require('../services/posts.service');
const { toHttpError } = require('../community.errors');

async function publishPost(req, res) {
	try {
		const response = await postsService.publishPost(req.user.userId, req.body || {});
		return res.status(201).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function unpublishMyPost(req, res) {
	try {
		await postsService.unpublishMyPost(req.user.userId);
		return res.status(204).send();
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function listPosts(req, res) {
	try {
		const response = await postsService.listPosts(req.user.userId, req.query || {});
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function getPostDetail(req, res) {
	try {
		const response = await postsService.getPostDetail(req.params.postId, req.user.userId);
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

module.exports = {
	publishPost,
	unpublishMyPost,
	listPosts,
	getPostDetail,
};
