'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');

function toManualRoadmapNode(node) {
	const relatedCourses = Array.isArray(node.relatedCourses) ? node.relatedCourses : [];
	const label = String(node.skillName || node.nodeId || '').trim();
	return {
		nodeId: node.nodeId,
		type: node.nodeType === 'subtopic' ? 'sub_topic' : 'main_topic',
		parentNodeId: node.parentNodeId || null,
		label,
		description: node.reason || '',
		prerequisites: node.parentNodeId ? [node.parentNodeId] : [],
		skillName: node.skillName || '',
		resources: Array.isArray(node.resources) ? node.resources : [],
		metadata: { relatedCourses, reason: node.reason || '' },
	};
}

async function getPrimaryByUser(userId) {
	return ManualRoadmap.findOne({ userId, isPrimary: true }).lean();
}

async function getCompletedByUser(userId) {
	return ManualRoadmap.findOne({ userId, isPrimary: true, acceptedAt: { $ne: null } }).lean();
}

async function getRetryableByUser(userId) {
	return ManualRoadmap.findOne({ userId, source: 'auto', acceptedAt: null }).lean();
}

async function listByUser(userId, { page = 1, limit = 20, status } = {}) {
	limit = Math.min(limit, 100);
	const filter = { userId };
	if (status) filter.status = status;

	const [items, total] = await Promise.all([
		ManualRoadmap.find(filter, { nodes: 0, edges: 0 })
			.sort({ updatedAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		ManualRoadmap.countDocuments(filter),
	]);

	return { items, pagination: { page, limit, total } };
}

async function getByIdForUser(roadmapId, userId) {
	return ManualRoadmap.findOne({ _id: roadmapId, userId }).lean();
}

async function getByIdForReview(roadmapId) {
	const roadmap = await ManualRoadmap.findById(roadmapId).lean();
	if (roadmap) {
		return { roadmap, model: 'ManualRoadmap' };
	}
	return null;
}

async function updateAverageRating(roadmapId, averageRating) {
	const nextAverage = typeof averageRating === 'number' && Number.isFinite(averageRating) ? averageRating : null;
	const result = await ManualRoadmap.findByIdAndUpdate(
		roadmapId,
		{ $set: { averageRating: nextAverage } },
		{ new: true }
	);

	if (!result) {
		const err = new Error('Roadmap not found.');
		err.code = 'ROADMAP_NOT_FOUND';
		err.status = 404;
		throw err;
	}
	return result;
}

async function upsertFailed(userId) {
	return ManualRoadmap.findOneAndUpdate(
		{ userId, source: 'auto', acceptedAt: null },
		{
			$set: { updatedAt: new Date() },
			$setOnInsert: {
				userId,
				title: 'Generating roadmap...',
				yamlCode: '# Roadmap generation in progress',
				source: 'auto',
				isPrimary: false,
				nodes: [],
				edges: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function upsertFailedWithProfile(userId, studentProfileId, _message, personalisationLevel = 'full') {
	// message is for logging only — NOT stored on the document (2026-04-08 decision)
	return ManualRoadmap.findOneAndUpdate(
		{ userId, source: 'auto', acceptedAt: null },
		{
			$set: { updatedAt: new Date() },
			$setOnInsert: {
				userId,
				title: 'Generating roadmap...',
				yamlCode: '# Roadmap generation in progress',
				source: 'auto',
				isPrimary: false,
				studentProfileId,
				personalisationLevel,
				nodes: [],
				edges: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function commitAccepted(userId, { studentProfileId, roadmapName, personalisationLevel, isPrimary, nodes }) {
	if (isPrimary) {
		await ManualRoadmap.updateMany(
			{ userId, isPrimary: true },
			{ $set: { isPrimary: false } }
		);
	}

	const mappedNodes = Array.isArray(nodes) ? nodes.map(toManualRoadmapNode) : [];
	return ManualRoadmap.create({
		userId,
		title: roadmapName,
		description: '',
		yamlCode: `# Auto-generated roadmap: ${roadmapName}`,
		nodes: mappedNodes,
		edges: [],
		isPrimary: !!isPrimary,
		studentProfileId: studentProfileId || null,
		personalisationLevel: personalisationLevel || 'full',
		source: 'auto',
		acceptedAt: new Date(),
		shared: false,
		isPublic: false,
		status: 'draft',
	});
}

async function switchPrimary(roadmapId, userId) {
	const target = await ManualRoadmap.findOne({ _id: roadmapId, userId });
	if (!target) {
		const err = new Error('Roadmap not found.');
		err.code = 'ROADMAP_NOT_FOUND';
		err.status = 404;
		throw err;
	}

	if (target.isPrimary) return target;

	await ManualRoadmap.updateMany(
		{ userId, isPrimary: true },
		{ $set: { isPrimary: false } }
	);

	const promoted = await ManualRoadmap.findOneAndUpdate(
		{ _id: roadmapId, userId, isPrimary: false },
		{ $set: { isPrimary: true } },
		{ new: true }
	);

	if (!promoted) {
		const err = new Error('Primary roadmap update conflicted with another in-flight operation.');
		err.code = 'CONFLICT';
		err.status = 409;
		throw err;
	}

	return promoted;
}

module.exports = {
	getPrimaryByUser,
	getCompletedByUser,
	getRetryableByUser,
	listByUser,
	getByIdForUser,
	getByIdForReview,
	updateAverageRating,
	upsertFailed,
	upsertFailedWithProfile,
	commitAccepted,
	switchPrimary,
};
