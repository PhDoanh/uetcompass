'use strict';

const { RoadmapProgress } = require('./roadmapProgress.model');

const VALID_STATES = new Set(['pending', 'inProgress', 'completed', 'skip']);

/**
 * Seeds a new progress document for a newly accepted roadmap.
 * All nodeIds start in `pending`; all other arrays are empty.
 * Retries once on transient write error per FR-042.
 */
async function createProgress(userId, roadmapId, nodeIds) {
	try {
		return await RoadmapProgress.create({
			userId,
			roadmapId,
			pending: nodeIds,
			inProgress: [],
			completed: [],
			skip: [],
			updatedAt: new Date(),
		});
	} catch (err) {
		if (err.code === 11000) {
			// Duplicate key — progress already initialised; return existing doc
			return RoadmapProgress.findOne({ userId, roadmapId });
		}
		// Single retry on transient write error
		return RoadmapProgress.create({
			userId,
			roadmapId,
			pending: nodeIds,
			inProgress: [],
			completed: [],
			skip: [],
			updatedAt: new Date(),
		});
	}
}

/**
 * Returns the progress document for a user-roadmap pair, or null if not found.
 */
async function getProgress(userId, roadmapId) {
	return RoadmapProgress.findOne({ userId, roadmapId }).lean();
}

/**
 * Atomically transitions a single nodeId from `fromState` to `toState`.
 * Uses a single findOneAndUpdate with $pull + $push to enforce atomicity.
 * Throws INVALID_TRANSITION if nodeId is not found in the fromState array.
 */
async function updateNodeState(userId, roadmapId, nodeId, fromState, toState) {
	if (!VALID_STATES.has(fromState) || !VALID_STATES.has(toState)) {
		const err = new Error(`'fromState' and 'toState' must each be one of: pending, inProgress, completed, skip.`);
		err.code = 'INVALID_PAYLOAD';
		err.status = 400;
		throw err;
	}

	const filter = { userId, roadmapId, [fromState]: nodeId };
	const update = {
		$pull: { [fromState]: nodeId },
		$push: { [toState]: nodeId },
		$set: { updatedAt: new Date() },
	};

	const updated = await RoadmapProgress.findOneAndUpdate(filter, update, { new: true });

	if (!updated) {
		const err = new Error(`Node '${nodeId}' not found in '${fromState}' state for this roadmap progress.`);
		err.code = 'INVALID_TRANSITION';
		err.status = 400;
		throw err;
	}

	return updated;
}

module.exports = {
	createProgress,
	getProgress,
	updateNodeState,
};
