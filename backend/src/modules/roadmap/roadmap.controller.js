'use strict';

const fs = require('fs');
const path = require('path');
const roadmapService = require('./roadmap.service');
const { ManualRoadmap } = require('./manualRoadmap.model');
const manualRoadmapService = require('./manualRoadmap.service');
const roadmapCommentService = require('./roadmapComment.service');
const manualRoadmapValidation = require('./manualRoadmapValidation.service');
const { Roadmap } = require('./roadmap.model');
const { acceptRoadmap } = require('./roadmapAcceptance.service');
const progressService = require('./roadmapProgress.service');
const { triggerGeneration, isGenerating } = require('./generation.service');
const { notifyClientByToken } = require('./roadmap.sse');
const previewStore = require('./roadmap.preview.store');
const { toHttpError, RoadmapError, ERROR_CODES } = require('./roadmap.errors');
const { parsePositiveIntQuery } = require('./roadmap.helpers');

function mapError(err, res) {
	const { status, body } = toHttpError(err);
	return res.status(status).json(body);
}

async function getPrimaryRoadmap(req, res) {
	try {
		const roadmap = await roadmapService.getPrimaryByUser(req.user.userId);
		if (!roadmap) throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'No roadmap has been generated for this user yet.');
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
		if (!roadmap) throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Roadmap not found.');
		return res.json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function listPublicManualRoadmaps(req, res) {
	try {
		const { q, page, limit } = req.query;
		const normalizedQuery = String(q || '').trim();

		if (normalizedQuery.length > 0 && normalizedQuery.length < 2) {
			throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'Search query must be at least 2 characters.');
		}

		const result = await manualRoadmapService.listPublic({
			q: normalizedQuery,
			page: parsePositiveIntQuery(page, 'page'),
			limit: parsePositiveIntQuery(limit, 'limit'),
		});
		return res.json(result);
	} catch (err) {
		return mapError(err, res);
	}
}

async function getPublicManualRoadmapPreviewById(req, res) {
	try {
		const [roadmap, commentsResult] = await Promise.all([
			manualRoadmapService.getPublicPreviewById(req.params.roadmapId),
			roadmapCommentService.listByRoadmapId(req.params.roadmapId, { limit: 10 }),
		]);
		if (!roadmap) {
			throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Public roadmap not found.');
		}
		return res.json({
			...roadmap,
			reviews: commentsResult.items,
			reviewCount: commentsResult.pagination.total,
		});
	} catch (err) {
		return mapError(err, res);
	}
}

async function listRoadmapComments(req, res) {
	try {
		const { limit } = req.query;
		const result = await roadmapCommentService.listByRoadmapId(req.params.roadmapId, {
			limit: parsePositiveIntQuery(limit, 'limit'),
		});
		return res.json(result);
	} catch (err) {
		return mapError(err, res);
	}
	}

async function createRoadmapComment(req, res) {
	try {
		const { content, rating } = req.body ?? {};
		const result = await roadmapCommentService.createComment(req.params.roadmapId, req.user.userId, {
			content,
			rating,
		});
		return res.status(201).json(result);
	} catch (err) {
		return mapError(err, res);
	}
}

async function getManualRoadmapById(req, res) {
	try {
		const roadmap = await manualRoadmapService.getByIdForUser(req.params.roadmapId, req.user.userId);
		if (!roadmap) throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Manual roadmap not found.');
		return res.json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function createManualRoadmap(req, res) {
	try {
		const { yamlCode } = req.body ?? {};
		const parsed = manualRoadmapValidation.validateManualRoadmapYaml(String(yamlCode || ''));
		const { title, description, nodes } = parsed;

		const roadmap = await manualRoadmapService.createDraft(req.user.userId, {
			title,
			description,
			yamlCode: String(yamlCode || '').trim(),
			nodes,
		});

		return res.status(201).json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function updateManualRoadmap(req, res) {
	try {
		const { yamlCode } = req.body ?? {};
		const parsed = manualRoadmapValidation.validateManualRoadmapYaml(String(yamlCode || ''));
		const { title, description, nodes } = parsed;

		const roadmap = await manualRoadmapService.updateDraft(req.params.roadmapId, req.user.userId, {
			title,
			description,
			yamlCode: String(yamlCode || '').trim(),
			nodes,
		});

		return res.json(roadmap);
	} catch (err) {
		return mapError(err, res);
	}
}

async function shareManualRoadmap(req, res) {
	try {
		const roadmap = await manualRoadmapService.share(req.params.roadmapId, req.user.userId);
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
			throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'Request body must include a valid nodes array, studentProfileId string, roadmapName string, and personalisationLevel (full|low).');
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

		if (isGenerating(userId)) throw new RoadmapError(409, ERROR_CODES.CONFLICT, 'A roadmap generation is already running for this user. Please wait for it to complete.');

		const sseToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
		await triggerGeneration(userId, 'retry', sseToken);

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
		return res.json({ message: 'Roadmap preview rejected. Your previous roadmap remains active.' });
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

async function getPublicSharedRoadmap(req, res) {
	try {
		const roadmapName = String(req.query.name || '').trim();
		if (!roadmapName) throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'Roadmap name is required.');

		// Read from data files
		const dataDir = path.join(__dirname, '../../..', 'backend', 'data');
		const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));

		let foundRoadmap = null;
		for (const file of files) {
			const filePath = path.join(dataDir, file);
			const content = fs.readFileSync(filePath, 'utf-8');
			const data = JSON.parse(content);

			if (data.roadmapName === roadmapName) {
				foundRoadmap = data;
				break;
			}
		}

		if (!foundRoadmap) throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Public roadmap not found.');

		return res.json({
			roadmapName: foundRoadmap.roadmapName,
			personalisationLevel: foundRoadmap.personalisationLevel,
			nodes: foundRoadmap.nodes || [],
		});
	} catch (err) {
		return mapError(err, res);
	}
}

async function getProgressHandler(req, res) {
	try {
		const { roadmapId } = req.params;
		const userId = req.user.userId;

		const progress = await progressService.getProgress(userId, roadmapId);
		if (!progress) throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Roadmap or progress not found.');

		return res.json(progress);
	} catch (err) {
		return mapError(err, res);
	}
}

async function updateNodeStateHandler(req, res) {
	try {
		const { roadmapId } = req.params;
		const userId = req.user.userId;
		const { nodeId, fromState, toState } = req.body;

		if (!nodeId || !fromState || !toState) throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, 'nodeId, fromState, and toState are required.');

		const updated = await progressService.updateNodeState(userId, roadmapId, nodeId, fromState, toState);
		return res.json(updated);
	} catch (err) {
		return mapError(err, res);
	}
}

module.exports = {
	getPublicSharedRoadmap,
	getPrimaryRoadmap,
	listRoadmaps,
	getRoadmapById,
	listPublicManualRoadmaps,
	getPublicManualRoadmapPreviewById,
	listRoadmapComments,
	createRoadmapComment,
	createManualRoadmap,
	getManualRoadmapById,
	updateManualRoadmap,
	shareManualRoadmap,
	acceptRoadmapHandler,
	switchPrimaryHandler,
	retryGeneration,
	rejectRoadmap,
	previewRoadmapHandler,
	getProgressHandler,
	updateNodeStateHandler,
};
