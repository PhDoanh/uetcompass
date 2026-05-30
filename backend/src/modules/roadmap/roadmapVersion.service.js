'use strict';

const { RoadmapVersion } = require('./roadmapVersion.model');
const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');

/**
 * Append a new {yamlCode, updatedAt} entry to the roadmap's version list.
 */
async function createVersion(roadmapId, yamlCode) {
	await RoadmapVersion.updateOne(
		{ roadmapId },
		{ $push: { versions: { yamlCode: yamlCode || '', updatedAt: new Date() } } },
		{ upsert: true }
	);
}

/**
 * List all versions for a roadmap (newest first).
 * Returns lightweight entries — yamlCode excluded to keep payloads small.
 */
async function listVersions(roadmapId, { page = 1, limit = 20 } = {}) {
	limit = Math.min(limit, 100);

	const doc = await RoadmapVersion.findOne({ roadmapId }, { 'versions.yamlCode': 0 }).lean();
	if (!doc) return { items: [], pagination: { page, limit, total: 0 } };

	const all = doc.versions.slice().reverse(); // newest first
	const total = all.length;
	const items = all.slice((page - 1) * limit, page * limit);

	return { items, pagination: { page, limit, total } };
}

/**
 * Get a single version entry by its subdocument _id (includes yamlCode for restore).
 */
async function getVersionById(roadmapId, versionId) {
	const doc = await RoadmapVersion.findOne(
		{ roadmapId, 'versions._id': versionId },
		{ 'versions.$': 1 }
	).lean();
	if (!doc?.versions?.[0]) {
		throw new RoadmapError(404, ERROR_CODES.ROADMAP_NOT_FOUND, 'Version not found.');
	}
	return doc.versions[0];
}

/**
 * Delete all versions for a roadmap (called when the roadmap itself is deleted).
 */
async function deleteAllForRoadmap(roadmapId) {
	await RoadmapVersion.deleteOne({ roadmapId });
}

module.exports = {
	createVersion,
	listVersions,
	getVersionById,
	deleteAllForRoadmap,
};
