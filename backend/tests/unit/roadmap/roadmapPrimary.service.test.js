'use strict';

/**
 * Unit tests for primary switch invariant (roadmap.service.switchPrimary)
 * Tests: demote/promote atomicity, exactly-one-primary, ROADMAP_NOT_FOUND, CONFLICT.
 */

jest.mock('../../../src/modules/roadmap/roadmap.model');

const { Roadmap } = require('../../../src/modules/roadmap/roadmap.model');
const roadmapService = require('../../../src/modules/roadmap/roadmap.service');

const userId = 'user001';
const roadmapId = 'roadmap002'; // non-primary target

const currentPrimary = {
	_id: 'roadmap001',
	userId,
	isPrimary: true,
	status: 'completed',
};

const targetRoadmap = {
	_id: roadmapId,
	userId,
	isPrimary: false,
	status: 'completed',
	save: jest.fn(),
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('roadmap.service — switchPrimary', () => {
	test('demotes previous primary and promotes target', async () => {
		Roadmap.findOne = jest.fn().mockResolvedValue({ ...targetRoadmap });
		Roadmap.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
		const promotedDoc = { ...targetRoadmap, isPrimary: true };
		Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue(promotedDoc);

		const result = await roadmapService.switchPrimary(roadmapId, userId);

		// Demote step
		expect(Roadmap.updateMany).toHaveBeenCalledWith(
			{ userId, isPrimary: true },
			expect.objectContaining({ $set: expect.objectContaining({ isPrimary: false }) })
		);

		// Promote step
		expect(Roadmap.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: roadmapId, userId, isPrimary: false },
			expect.objectContaining({ $set: expect.objectContaining({ isPrimary: true }) }),
			expect.objectContaining({ new: true })
		);

		expect(result.isPrimary).toBe(true);
	});

	test('returns target immediately when already primary (idempotent)', async () => {
		const alreadyPrimary = { ...targetRoadmap, isPrimary: true };
		Roadmap.findOne = jest.fn().mockResolvedValue(alreadyPrimary);

		const result = await roadmapService.switchPrimary(roadmapId, userId);

		expect(Roadmap.updateMany).not.toHaveBeenCalled();
		expect(result.isPrimary).toBe(true);
	});

	test('throws ROADMAP_NOT_FOUND for unknown roadmapId', async () => {
		Roadmap.findOne = jest.fn().mockResolvedValue(null);

		await expect(roadmapService.switchPrimary('nonExistent', userId)).rejects.toMatchObject({
			code: 'ROADMAP_NOT_FOUND',
			status: 404,
		});
	});

	test('throws CONFLICT when findOneAndUpdate returns null (race condition)', async () => {
		Roadmap.findOne = jest.fn().mockResolvedValue({ ...targetRoadmap });
		Roadmap.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
		Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue(null); // race — target got promoted by another op

		await expect(roadmapService.switchPrimary(roadmapId, userId)).rejects.toMatchObject({
			code: 'CONFLICT',
			status: 409,
		});
	});

	test('exactly-one-primary invariant: after switch, only one primary exists per user', async () => {
		// Simulate multiple completed roadmaps — after switch, only the target should be primary
		const roadmaps = [
			{ ...currentPrimary, isPrimary: true },
			{ ...targetRoadmap, isPrimary: false },
		];

		Roadmap.findOne = jest.fn().mockResolvedValue(roadmaps[1]);
		Roadmap.updateMany = jest.fn().mockImplementation(async (filter, update) => {
			// Demote all matching
			roadmaps.forEach((r) => {
				if (r.userId === filter.userId && r.isPrimary === filter.isPrimary) {
					r.isPrimary = false;
				}
			});
			return { modifiedCount: 1 };
		});
		Roadmap.findOneAndUpdate = jest.fn().mockImplementation(async (filter, update) => {
			const target = roadmaps.find((r) => r._id === filter._id && !r.isPrimary);
			if (target) {
				target.isPrimary = true;
				return target;
			}
			return null;
		});

		await roadmapService.switchPrimary(roadmapId, userId);

		const primaries = roadmaps.filter((r) => r.isPrimary);
		expect(primaries).toHaveLength(1);
		expect(primaries[0]._id).toBe(roadmapId);
	});
});
