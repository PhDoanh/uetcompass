'use strict';

/**
 * Unit tests for roadmapProgress.service.js
 * Tests: createProgress, getProgress, updateNodeState transitions and invariants.
 */

jest.mock('../../../src/modules/roadmap/roadmapProgress.model');

const { RoadmapProgress } = require('../../../src/modules/roadmap/roadmapProgress.model');
const progressService = require('../../../src/modules/roadmap/roadmapProgress.service');

const userId = 'user001';
const roadmapId = 'roadmap001';
const nodeIds = ['INT2204', 'INT2201', 'INT3306'];

const baseProgressDoc = {
	_id: 'progress001',
	userId,
	roadmapId,
	pending: [...nodeIds],
	inProgress: [],
	completed: [],
	skip: [],
	updatedAt: new Date(),
};

beforeEach(() => {
	jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// createProgress
// ---------------------------------------------------------------------------

describe('roadmapProgress.service — createProgress', () => {
	test('seeds pending with all passed nodeIds, all other arrays empty', async () => {
		RoadmapProgress.create = jest.fn().mockResolvedValue({ ...baseProgressDoc });

		const result = await progressService.createProgress(userId, roadmapId, nodeIds);

		expect(RoadmapProgress.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId,
				roadmapId,
				pending: nodeIds,
				inProgress: [],
				completed: [],
				skip: [],
			})
		);
		expect(result.pending).toEqual(nodeIds);
		expect(result.inProgress).toEqual([]);
		expect(result.completed).toEqual([]);
		expect(result.skip).toEqual([]);
	});

	test('returns existing doc on duplicate key (11000)', async () => {
		const dupErr = new Error('duplicate key');
		dupErr.code = 11000;
		RoadmapProgress.create = jest.fn().mockRejectedValue(dupErr);
		RoadmapProgress.findOne = jest.fn().mockResolvedValue({ ...baseProgressDoc });

		const result = await progressService.createProgress(userId, roadmapId, nodeIds);

		expect(RoadmapProgress.findOne).toHaveBeenCalledWith({ userId, roadmapId });
		expect(result.pending).toEqual(nodeIds);
	});
});

// ---------------------------------------------------------------------------
// getProgress
// ---------------------------------------------------------------------------

describe('roadmapProgress.service — getProgress', () => {
	test('returns progress document scoped to userId + roadmapId', async () => {
		RoadmapProgress.findOne = jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue({ ...baseProgressDoc }),
		});

		const result = await progressService.getProgress(userId, roadmapId);

		expect(RoadmapProgress.findOne).toHaveBeenCalledWith({ userId, roadmapId });
		expect(result).toEqual(expect.objectContaining({ userId, roadmapId }));
	});

	test('returns null when no progress document found', async () => {
		RoadmapProgress.findOne = jest.fn().mockReturnValue({
			lean: jest.fn().mockResolvedValue(null),
		});

		const result = await progressService.getProgress(userId, roadmapId);
		expect(result).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// updateNodeState — valid transitions
// ---------------------------------------------------------------------------

describe('roadmapProgress.service — updateNodeState valid transitions', () => {
	function makeUpdatedDoc(from, to, nodeId) {
		const doc = { ...baseProgressDoc };
		doc[from] = doc[from].filter((n) => n !== nodeId);
		doc[to] = [...(doc[to] || []), nodeId];
		return doc;
	}

	test('pending → inProgress: atomically moves node', async () => {
		const nodeId = 'INT2204';
		const updated = makeUpdatedDoc('pending', 'inProgress', nodeId);
		RoadmapProgress.findOneAndUpdate = jest.fn().mockResolvedValue(updated);

		const result = await progressService.updateNodeState(userId, roadmapId, nodeId, 'pending', 'inProgress');

		expect(RoadmapProgress.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, roadmapId, pending: nodeId },
			expect.objectContaining({
				$pull: { pending: nodeId },
				$push: { inProgress: nodeId },
			}),
			expect.objectContaining({ new: true })
		);
		expect(result.inProgress).toContain(nodeId);
		expect(result.pending).not.toContain(nodeId);
	});

	test('pending → skip: atomically moves node', async () => {
		const nodeId = 'INT2201';
		const updated = makeUpdatedDoc('pending', 'skip', nodeId);
		RoadmapProgress.findOneAndUpdate = jest.fn().mockResolvedValue(updated);

		const result = await progressService.updateNodeState(userId, roadmapId, nodeId, 'pending', 'skip');

		expect(RoadmapProgress.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, roadmapId, pending: nodeId },
			expect.objectContaining({
				$pull: { pending: nodeId },
				$push: { skip: nodeId },
			}),
			expect.objectContaining({ new: true })
		);
		expect(result.skip).toContain(nodeId);
	});

	test('inProgress → completed: atomically moves node', async () => {
		const docWithInProgress = { ...baseProgressDoc, pending: [], inProgress: ['INT2204'] };
		const updated = { ...docWithInProgress, inProgress: [], completed: ['INT2204'] };
		RoadmapProgress.findOneAndUpdate = jest.fn().mockResolvedValue(updated);

		const result = await progressService.updateNodeState(userId, roadmapId, 'INT2204', 'inProgress', 'completed');

		expect(RoadmapProgress.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, roadmapId, inProgress: 'INT2204' },
			expect.objectContaining({
				$pull: { inProgress: 'INT2204' },
				$push: { completed: 'INT2204' },
			}),
			expect.objectContaining({ new: true })
		);
		expect(result.completed).toContain('INT2204');
	});
});

// ---------------------------------------------------------------------------
// updateNodeState — INVALID_TRANSITION
// ---------------------------------------------------------------------------

describe('roadmapProgress.service — updateNodeState INVALID_TRANSITION', () => {
	test('throws INVALID_TRANSITION when nodeId not found in fromState', async () => {
		RoadmapProgress.findOneAndUpdate = jest.fn().mockResolvedValue(null);

		await expect(
			progressService.updateNodeState(userId, roadmapId, 'NONEXISTENT', 'pending', 'inProgress')
		).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
	});

	test('throws INVALID_PAYLOAD for invalid fromState value', async () => {
		await expect(
			progressService.updateNodeState(userId, roadmapId, 'INT2204', 'invalidState', 'completed')
		).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
	});

	test('throws INVALID_PAYLOAD for invalid toState value', async () => {
		await expect(
			progressService.updateNodeState(userId, roadmapId, 'INT2204', 'pending', 'unknown')
		).rejects.toMatchObject({ code: 'INVALID_PAYLOAD' });
	});

	test('enforces exactly-one-array invariant: node must be in declared fromState', async () => {
		// Node is in completed[] but caller claims it is in pending — should throw
		RoadmapProgress.findOneAndUpdate = jest.fn().mockResolvedValue(null);

		await expect(
			progressService.updateNodeState(userId, roadmapId, 'INT2204', 'pending', 'inProgress')
		).rejects.toMatchObject({ code: 'INVALID_TRANSITION', status: 400 });
	});
});
