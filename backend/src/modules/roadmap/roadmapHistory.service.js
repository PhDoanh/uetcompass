'use strict';

const { RoadmapHistory } = require('./roadmapHistory.model');

const FIXED_MILESTONES = [
	{ milestoneId: '25', milestoneTitle: 'Getting Started', milestonePercent: 25 },
	{ milestoneId: '50', milestoneTitle: 'Halfway', milestonePercent: 50 },
	{ milestoneId: '75', milestoneTitle: 'Almost there', milestonePercent: 75 },
	{ milestoneId: '100', milestoneTitle: 'Complete', milestonePercent: 100 },
];

function clampPercent(value) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

function calculateProgressPercent(completedCount, totalCount) {
	if (!totalCount || totalCount <= 0) {
		return 0;
	}

	return clampPercent(Math.round((completedCount / totalCount) * 100));
}

async function recordNodeTransition(userId, roadmapId, {
	nodeId,
	nodeLabel,
	fromState,
	toState,
	occurredAt = new Date(),
} = {}) {
	if (!nodeId || !fromState || !toState) {
		return null;
	}

	return RoadmapHistory.create({
		userId,
		roadmapId,
		eventType: 'node_transition',
		occurredAt,
		nodeTransition: {
			nodeId,
			nodeLabel: nodeLabel || nodeId,
			fromState,
			toState,
		},
	});
}

async function recordMilestoneAchievements(userId, roadmapId, {
	previousPercent = 0,
	currentPercent = 0,
	occurredAt = new Date(),
} = {}) {
	const safePrevious = clampPercent(previousPercent);
	const safeCurrent = clampPercent(currentPercent);

	const crossed = FIXED_MILESTONES.filter(
		(milestone) => safePrevious < milestone.milestonePercent && safeCurrent >= milestone.milestonePercent
	);

	if (crossed.length === 0) {
		return [];
	}

	const created = [];
	for (const milestone of crossed) {
		const dedupeKey = `milestone:${milestone.milestoneId}`;
		try {
			const doc = await RoadmapHistory.create({
				userId,
				roadmapId,
				eventType: 'milestone_achieved',
				occurredAt,
				milestone: milestone,
				dedupeKey,
			});
			created.push(doc);
		} catch (err) {
			if (err?.code === 11000) {
				continue;
			}
			throw err;
		}
	}

	return created;
}

async function listByRoadmap(userId, roadmapId, { limit = 50 } = {}) {
	const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
	const items = await RoadmapHistory.find({ userId, roadmapId })
		.sort({ occurredAt: -1, _id: -1 })
		.limit(safeLimit)
		.lean();

	return { items, limit: safeLimit };
}

module.exports = {
	FIXED_MILESTONES,
	calculateProgressPercent,
	recordNodeTransition,
	recordMilestoneAchievements,
	listByRoadmap,
};
