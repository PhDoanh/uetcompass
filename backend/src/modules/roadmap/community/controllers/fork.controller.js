'use strict';

const forkService = require('../services/fork.service');
const { toHttpError } = require('../community.errors');

async function forkPost(req, res) {
	try {
		const response = await forkService.forkPost(req.params.postId, req.user.userId);
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

module.exports = {
	forkPost,
};
