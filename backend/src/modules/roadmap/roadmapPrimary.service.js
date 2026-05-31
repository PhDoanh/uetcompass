'use strict';

const { ManualRoadmap } = require('./manualRoadmap.model');

/**
 * Atomically demotes the current primary roadmap and promotes the target.
 * Enforces the one-primary-per-user invariant backed by the
 * `primary_per_user_unique` partial index.
 *
 * @throws {Error} ROADMAP_NOT_FOUND (404) if roadmapId not owned by userId
 * @throws {Error} CONFLICT (409) on concurrent switch race
 */
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

module.exports = { switchPrimary };
