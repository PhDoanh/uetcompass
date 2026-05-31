'use strict';

const { RoadmapProgress } = require('./roadmapProgress.model');
const roadmapHistoryService = require('./roadmapHistory.service');
const roadmapService = require('./roadmap.service');

const VALID_STATES = new Set(['pending', 'inProgress', 'completed', 'skip']);

const ALLOWED_TRANSITIONS = new Map([
	['pending', new Set(['inProgress', 'completed', 'skip'])],
	['inProgress', new Set(['pending', 'completed', 'skip'])],
	['completed', new Set(['pending', 'inProgress', 'skip'])],
	['skip', new Set(['pending', 'inProgress', 'completed'])],
]);

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
			state: {
				pending: nodeIds,
				inProgress: [],
				completed: [],
				skip: [],
			},
			updatedAt: new Date(),
		});
	} catch (err) {
		if (err.code === 11000) {
			// Duplicate key — progress already initialised; return existing doc
			return RoadmapProgress.findOne({ userId, roadmapId });
		}
		// Retry only on transient Mongo network/write errors
		const TRANSIENT_CODES = new Set([6, 7, 89, 91, 189, 262, 9001, 10107, 11600, 11602, 13435, 13436]);
		if (!TRANSIENT_CODES.has(err.code) && !err.message?.includes('ECONNRESET') && !err.message?.includes('ETIMEDOUT')) {
			throw err;
		}
		// Single retry — handle duplicate key in case the first write actually succeeded
		try {
			return await RoadmapProgress.create({
				userId,
				roadmapId,
				state: {
					pending: nodeIds,
					inProgress: [],
					completed: [],
					skip: [],
				},
				updatedAt: new Date(),
			});
		} catch (retryErr) {
			if (retryErr.code === 11000) {
				return RoadmapProgress.findOne({ userId, roadmapId });
			}
			throw retryErr;
		}
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

	const allowed = ALLOWED_TRANSITIONS.get(fromState);
	if (!allowed || !allowed.has(toState)) {
		const err = new Error(`Transition from '${fromState}' to '${toState}' is not allowed.`);
		err.code = 'INVALID_TRANSITION';
		err.status = 422;
		throw err;
	}

	const filter = { userId, roadmapId, [`state.${fromState}`]: nodeId };
	const before = await RoadmapProgress.findOne({ userId, roadmapId }).lean();
	const beforeCompleted = Array.isArray(before?.state?.completed) ? before.state.completed.length : 0;
	const totalNodes = [
		...(before?.state?.pending || []),
		...(before?.state?.inProgress || []),
		...(before?.state?.completed || []),
		...(before?.state?.skip || []),
	].length || 0;

	// Aggregation pipeline update: pull nodeId from ALL arrays to restore
	// the exactly-one-array invariant, then push to the target array.
	const allStates = ['pending', 'inProgress', 'completed', 'skip'];
	const update = [
		{
			$set: allStates.reduce((acc, s) => {
				acc[`state.${s}`] = { $filter: { input: `$state.${s}`, cond: { $ne: ['$$this', nodeId] } } };
				return acc;
			}, {}),
		},
		{
			$set: {
				[`state.${toState}`]: { $concatArrays: [`$state.${toState}`, [nodeId]] },
				updatedAt: new Date(),
			},
		},
	];

	const updated = await RoadmapProgress.findOneAndUpdate(filter, update, { new: true });

	if (!updated) {
		const err = new Error(`Node '${nodeId}' is not in state '${fromState}'.`);
		err.code = 'INVALID_TRANSITION';
		err.status = 422;
		throw err;
	}

	try {
		const currentCompleted = Array.isArray(updated.state?.completed) ? updated.state.completed.length : 0;
		const previousPercent = roadmapHistoryService.calculateProgressPercent(beforeCompleted, totalNodes);
		const currentPercent = roadmapHistoryService.calculateProgressPercent(currentCompleted, totalNodes);
		const roadmap = await roadmapService.getByIdForUser(roadmapId, userId);
		const nodeLabel = (roadmap?.nodes || []).find((node) => node.nodeId === nodeId)?.skillName || nodeId;

		await roadmapHistoryService.recordNodeTransition(userId, roadmapId, {
			nodeId,
			nodeLabel,
			fromState,
			toState,
		});

		await roadmapHistoryService.recordMilestoneAchievements(userId, roadmapId, {
			previousPercent,
			currentPercent,
		});
	} catch (historyErr) {
		// History is best-effort: progress transition should still succeed even if logging fails.
		console.error('[roadmap-history:error]', historyErr);
	}

	try {
		const progressTrackingService = require('../progress/progress.tracking.service');
		await progressTrackingService.updateNodeActivity(userId, roadmapId, nodeId, toState);
	} catch (trackingErr) {
		console.error('[progress] updateNodeActivity failed:', trackingErr.message);
	}

	return updated;
}

/**
 * Reconcile progress against a new set of valid nodeIds after a roadmap revert.
 * - Removes nodeIds that no longer exist in the roadmap
 * - Adds new nodeIds (not found in any state) as `pending`
 */
async function reconcileProgress(userId, roadmapId, validNodeIds) {
	const validSet = new Set(validNodeIds);
	const doc = await RoadmapProgress.findOne({ userId, roadmapId }).lean();

	const current = doc?.state ?? { pending: [], inProgress: [], completed: [], skip: [] };
	const allTracked = new Set([
		...current.pending,
		...current.inProgress,
		...current.completed,
		...current.skip,
	]);

	const newPending = [
		...current.pending.filter(id => validSet.has(id)),
		...[...validSet].filter(id => !allTracked.has(id)),
	];

	const reconciled = {
		pending: newPending,
		inProgress: current.inProgress.filter(id => validSet.has(id)),
		completed: current.completed.filter(id => validSet.has(id)),
		skip: current.skip.filter(id => validSet.has(id)),
	};

	await RoadmapProgress.updateOne(
		{ userId, roadmapId },
		{ $set: { state: reconciled, updatedAt: new Date() } },
		{ upsert: true }
	);
}

module.exports = {
	createProgress,
	getProgress,
	updateNodeState,
	reconcileProgress,
};
