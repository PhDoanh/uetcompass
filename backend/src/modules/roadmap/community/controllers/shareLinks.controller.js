'use strict';

const shareLinksService = require('../services/shareLinks.service');
const { toHttpError } = require('../community.errors');

function resolveBaseUrl(req) {
	const appBaseUrl = process.env.APP_BASE_URL || process.env.FRONTEND_URL;
	if (appBaseUrl) {
		return appBaseUrl.replace(/\/$/, '');
	}
	return `${req.protocol}://${req.get('host')}`;
}

async function createShareLink(req, res) {
	try {
		const response = await shareLinksService.createShareLink(req.user.userId, resolveBaseUrl(req));
		return res.status(201).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function updateShareLinkAccess(req, res) {
	try {
		const response = await shareLinksService.updateShareLinkAccess(req.user.userId, req.params.token, req.body || {});
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function getShareLinkSnapshot(req, res) {
	try {
		const viewerUserId = req.user?.userId || null;
		const response = await shareLinksService.resolveShareLink(req.params.token, viewerUserId);
		return res.status(200).json(response);
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

async function revokeShareLink(req, res) {
	try {
		await shareLinksService.revokeShareLink(req.user.userId, req.params.token);
		return res.status(204).send();
	} catch (err) {
		const { status, body } = toHttpError(err);
		return res.status(status).json(body);
	}
}

module.exports = {
	createShareLink,
	updateShareLinkAccess,
	getShareLinkSnapshot,
	revokeShareLink,
};
