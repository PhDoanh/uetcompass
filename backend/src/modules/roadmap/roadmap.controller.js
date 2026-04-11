'use strict';

const roadmapService = require('./roadmap.service');
const { acceptRoadmap } = require('./roadmapAcceptance.service');
const progressService = require('./roadmapProgress.service');
const { triggerGeneration, isGenerating } = require('./generation.service');
const { notifyClientByToken } = require('./roadmap.sse');
const previewStore = require('./roadmap.preview.store');

// Domain error → HTTP status mapping
const ERROR_HTTP_MAP = {
	ROADMAP_NOT_FOUND: 404,
	CONFLICT: 409,
	ALL_COMPLETED: 422,
	PREREQUISITE_VIOLATION: 422,
	INVALID_PAYLOAD: 400,
	INVALID_TRANSITION: 422,
};

function mapError(err, res) {
	const status = ERROR_HTTP_MAP[err.code] || err.status || 500;
	const code = err.code || 'INTERNAL_ERROR';
	return res.status(status).json({ error: { code, message: err.message } });
}

function parsePositiveIntQuery(rawValue, fieldName) {
	if (rawValue == null || rawValue === '') {
		return undefined;
	}

	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isInteger(parsed) || parsed < 1) {
		const err = new Error(`${fieldName} must be a positive integer.`);
		err.code = 'INVALID_PAYLOAD';
		err.status = 400;
		throw err;
	}

	return parsed;
}

async function getPrimaryRoadmap(req, res) {
	try {
		const roadmap = await roadmapService.getPrimaryByUser(req.user.userId);
		if (!roadmap) {
			return res.status(404).json({
				error: {
					code: 'ROADMAP_NOT_FOUND',
					message: 'No roadmap has been generated for this user yet.',
				},
			});
		}
		return res.json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function listRoadmaps(req, res) {
	try {
		const { status, page, limit } = req.query;
		const result = await roadmapService.listByUser(req.user.userId, {
			status,
			page: parsePositiveIntQuery(page, 'page'),
			limit: parsePositiveIntQuery(limit, 'limit'),
		});
		return res.json(result);
	} catch (err) {
		return mapError(err, res);
	}
}

async function getRoadmapById(req, res) {
	try {
		const roadmap = await roadmapService.getByIdForUser(req.params.roadmapId, req.user.userId);
		if (!roadmap) {
			return res.status(404).json({
				error: {
					code: 'ROADMAP_NOT_FOUND',
					message: 'Roadmap not found.',
				},
			});
		}
		return res.json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function acceptRoadmapHandler(req, res) {
	try {
		const { studentProfileId, roadmapName, personalisationLevel, isPrimary, nodes, sseToken } = req.body ?? {};

		if (
			!Array.isArray(nodes) ||
			typeof studentProfileId !== 'string' || studentProfileId.trim() === '' ||
			typeof roadmapName !== 'string' || roadmapName.trim() === '' ||
			(personalisationLevel !== 'full' && personalisationLevel !== 'low')
		) {
			return res.status(400).json({
				error: {
					code: 'INVALID_PAYLOAD',
					message: 'Request body must include a valid nodes array, studentProfileId string, roadmapName string, and personalisationLevel (full|low).',
				},
			});
		}

		const result = await acceptRoadmap(req.user.userId, {
			studentProfileId,
			roadmapName,
			personalisationLevel,
			isPrimary: !!isPrimary,
			nodes,
		});

		// Notify client roadmap accepted (optional)
		if (sseToken) {
			notifyClientByToken(sseToken, 'roadmap:notification', {
				type: 'success',
				message: 'Roadmap accepted and saved.',
			});
		}

		return res.json(result);
	} catch (err) {
		return mapError(err, res);
	}
}

async function switchPrimaryHandler(req, res) {
	try {
		const result = await roadmapService.switchPrimary(req.params.roadmapId, req.user.userId);
		return res.json({
			message: 'Primary roadmap updated successfully.',
			roadmapId: result._id,
			isPrimary: true,
		});
	} catch (err) {
		return mapError(err, res);
	}
}

async function retryGeneration(req, res) {
	try {
		const userId = req.user.userId;

		const retryable = await roadmapService.getRetryableByUser(userId);
		if (!retryable) {
			return res.status(409).json({
				error: {
					code: 'CONFLICT',
					message: 'No failed roadmap found to retry. Generate a new roadmap first.',
				},
			});
		}

		if (isGenerating(userId)) {
			return res.status(409).json({
				error: {
					code: 'CONFLICT',
					message: 'A roadmap generation is already running for this user. Please wait for it to complete.',
				},
			});
		}

		await triggerGeneration(userId, 'retry');

		return res.status(202).json({
			message: 'Roadmap generation started. You will be notified when it completes.',
		});
	} catch (err) {
		return mapError(err, res);
	}
}

async function rejectRoadmap(req, res) {
	try {
		const userId = req.user.userId;
		previewStore.clearPendingPreview(userId);
		return res.json({ message: 'Roadmap preview rejected.' });
	} catch (err) {
		return mapError(err, res);
	}
}

// Preview roadmap: just echo the roadmap data for preview
async function previewRoadmapHandler(req, res) {
	try {
		const { studentProfileId, personalisationLevel, nodes } = req.body ?? {};
		return res.json({
			studentProfileId,
			personalisationLevel,
			nodes,
			preview: true,
		});
	} catch (err) {
		return mapError(err, res);
	}
}

// Public endpoints - guest access
async function getSampleRoadmap(req, res) {
	try {
		return res.json({
			roadmapId: 'sample-roadmap',
			personalisationLevel: 'low',
			status: 'completed',
			nodes: [
				{
					courseCode: 'INT1001',
					courseName: 'Introduction to Computing',
					credits: 3,
					suggestedSemester: 1,
					reason: 'Foundational course for first-year UET students.',
					skills: ['problem-solving'],
					resources: [],
				},
				{
					courseCode: 'INT2204',
					courseName: 'Data Structures and Algorithms',
					credits: 4,
					suggestedSemester: 3,
					reason: 'Core requirement for software engineering pathways.',
					skills: ['algorithms'],
					resources: [],
				},
			],
		});
	} catch (err) {
		return mapError(err, res);
	}
}

async function getPublicSharedRoadmap(req, res) {
	try {
		const shareId = String(req.params.shareId || '').trim();
		if (!shareId || !shareId.match(/^[a-f\d]{24}$/i)) {
			return res.status(400).json({
				error: {
					code: 'INVALID_PAYLOAD',
					message: 'shareId is invalid.',
				},
			});
		}

		const roadmap = await Roadmap.findById(shareId).lean();
		if (!roadmap || roadmap.status !== 'completed') {
			return res.status(404).json({
				error: {
					code: 'ROADMAP_NOT_FOUND',
					message: 'Public roadmap not found.',
				},
			});
		}

		return res.json({
			roadmapId: String(roadmap._id),
			personalisationLevel: roadmap.personalisationLevel,
			status: roadmap.status,
			nodes: roadmap.nodes || [],
		});
	} catch (err) {
		return mapError(err, res);
	}
}

module.exports = {
	getSampleRoadmap,
	getPublicSharedRoadmap,
	getPrimaryRoadmap,
	listRoadmaps,
	getRoadmapById,
	acceptRoadmapHandler,
	switchPrimaryHandler,
	retryGeneration,
	rejectRoadmap,
	previewRoadmapHandler,
	getProgressHandler,
	updateNodeStateHandler,
};
