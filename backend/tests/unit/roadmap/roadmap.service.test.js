'use strict';

/**
 * Unit tests for roadmap.service.js
 * Tests: getPrimaryByUser, listByUser (filter + pagination), getByIdForUser,
 * commitAccepted (isPrimary policy), upsertFailedWithProfile.
 */

jest.mock('../../../src/modules/roadmap/roadmap.model');

const { Roadmap } = require('../../../src/modules/roadmap/roadmap.model');
const roadmapService = require('../../../src/modules/roadmap/roadmap.service');

const userId = 'user001';
const roadmapId = 'roadmap001';
const profileId = 'profile001';

const completedRoadmap = {
  _id: roadmapId,
  userId,
  isPrimary: true,
  studentProfileId: profileId,
  personalisationLevel: 'full',
  status: 'completed',
  errorMessage: null,
  nodes: [{ courseCode: 'INT2204', courseName: 'OOP', credits: 3, skills: [], reason: 'r', resources: [] }],
  acceptedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const failedRoadmap = {
  _id: 'roadmap002',
  userId,
  isPrimary: false,
  studentProfileId: profileId,
  personalisationLevel: 'full',
  status: 'failed',
  errorMessage: 'Gemini timeout',
  nodes: [],
  acceptedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
	jest.clearAllMocks();
});

describe('roadmap.service — getPrimaryByUser', () => {
	test('returns primary roadmap when one exists', async () => {
		Roadmap.findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(completedRoadmap) });

		const result = await roadmapService.getPrimaryByUser(userId);

		expect(Roadmap.findOne).toHaveBeenCalledWith({ userId, isPrimary: true });
		expect(result).toEqual(completedRoadmap);
	});

	test('returns null when no primary roadmap exists', async () => {
		Roadmap.findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) });

		const result = await roadmapService.getPrimaryByUser(userId);
		expect(result).toBeNull();
	});
});

describe('roadmap.service — listByUser', () => {
	test('ignores status parameter when provided (no status field per spec)', async () => {
		const mockItems = [completedRoadmap];
		Roadmap.find = jest.fn().mockReturnValue({
			sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve(mockItems) }) }) }),
		});
		Roadmap.countDocuments = jest.fn().mockResolvedValue(1);

		const result = await roadmapService.listByUser(userId, { status: 'completed' });

		// status must NOT be forwarded to the DB query — it is not a schema field
		expect(Roadmap.find).toHaveBeenCalledWith(
			{ userId },
			{ nodes: 0 }
		);
		expect(result.items).toEqual(mockItems);
		expect(result.pagination.total).toBe(1);
	});

	test('uses default pagination when not specified', async () => {
		Roadmap.find = jest.fn().mockReturnValue({
			sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
		});
		Roadmap.countDocuments = jest.fn().mockResolvedValue(0);

		const result = await roadmapService.listByUser(userId);
		expect(result.pagination).toEqual({ page: 1, limit: 20, total: 0 });
	});

	test('caps limit at 100', async () => {
		Roadmap.find = jest.fn().mockReturnValue({
			sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
		});
		Roadmap.countDocuments = jest.fn().mockResolvedValue(0);

		const result = await roadmapService.listByUser(userId, { limit: 999 });
		expect(result.pagination.limit).toBe(100);
	});

	test('omits status filter when not provided', async () => {
		Roadmap.find = jest.fn().mockReturnValue({
			sort: () => ({ skip: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }) }),
		});
		Roadmap.countDocuments = jest.fn().mockResolvedValue(0);

		await roadmapService.listByUser(userId);

		expect(Roadmap.find).toHaveBeenCalledWith({ userId }, { nodes: 0 });
	});
});

describe('roadmap.service — getByIdForUser', () => {
	test('scopes lookup by userId', async () => {
		Roadmap.findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(completedRoadmap) });

		const result = await roadmapService.getByIdForUser(roadmapId, userId);

		expect(Roadmap.findOne).toHaveBeenCalledWith({ _id: roadmapId, userId });
		expect(result).toEqual(completedRoadmap);
	});

	test('returns null when roadmap not found or userId mismatch', async () => {
		Roadmap.findOne = jest.fn().mockReturnValue({ lean: () => Promise.resolve(null) });

		const result = await roadmapService.getByIdForUser('nonExistentId', userId);
		expect(result).toBeNull();
	});
});

describe('roadmap.service — commitAccepted', () => {
	test('creates completed document with isPrimary=true', async () => {
		const createdDoc = { ...completedRoadmap, _id: 'newRoadmap' };
		Roadmap.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 1 });
		Roadmap.create = jest.fn().mockResolvedValue(createdDoc);

		const result = await roadmapService.commitAccepted(userId, {
			studentProfileId: profileId,
			personalisationLevel: 'full',
			isPrimary: true,
			nodes: completedRoadmap.nodes,
		});

		// Should demote previous primary first
		expect(Roadmap.updateMany).toHaveBeenCalledWith(
			{ userId, isPrimary: true },
			expect.objectContaining({ $set: expect.objectContaining({ isPrimary: false }) })
		);
		expect(Roadmap.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId,
				isPrimary: true,
				acceptedAt: expect.any(Date),
			})
		);
		// status and errorMessage must NOT be present
		const createArg = Roadmap.create.mock.calls[0][0];
		expect(createArg).not.toHaveProperty('status');
		expect(createArg).not.toHaveProperty('errorMessage');
		expect(result).toEqual(createdDoc);
	});

	test('skips demotion when isPrimary=false', async () => {
		Roadmap.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
		Roadmap.create = jest.fn().mockResolvedValue({ ...completedRoadmap, isPrimary: false });

		await roadmapService.commitAccepted(userId, {
			studentProfileId: profileId,
			personalisationLevel: 'full',
			isPrimary: false,
			nodes: [],
		});

		expect(Roadmap.updateMany).not.toHaveBeenCalled();
	});
});

describe('roadmap.service — upsertFailedWithProfile', () => {
	test('upserts a failed document with correct shape', async () => {
		const failedDoc = { ...failedRoadmap };
		Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue(failedDoc);

		const result = await roadmapService.upsertFailedWithProfile(
			userId,
			profileId,
			'Gemini error'
		);

		expect(Roadmap.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, acceptedAt: null },
			expect.objectContaining({
				$set: expect.objectContaining({ updatedAt: expect.any(Date) }),
				$setOnInsert: expect.objectContaining({ userId, studentProfileId: profileId }),
			}),
			expect.objectContaining({ upsert: true, new: true })
		);
		// message must NOT be stored on the document (2026-04-08 decision)
		const updateArg = Roadmap.findOneAndUpdate.mock.calls[0][1];
		expect(updateArg.$set).not.toHaveProperty('errorMessage');
		expect(result).toEqual(failedDoc);
	});

	// Gap-3: personalisationLevel is stored on the failed document
	test('stores the passed personalisationLevel (not always full)', async () => {
		const failedDoc = { ...failedRoadmap, personalisationLevel: 'low' };
		Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue(failedDoc);

		await roadmapService.upsertFailedWithProfile(
			userId,
			profileId,
			'Gemini error',
			'low'
		);

		expect(Roadmap.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, acceptedAt: null },
			expect.objectContaining({
				$setOnInsert: expect.objectContaining({ personalisationLevel: 'low' }),
			}),
			expect.objectContaining({ upsert: true, new: true })
		);
	});

	test('defaults personalisationLevel to full when not provided', async () => {
		const failedDoc = { ...failedRoadmap };
		Roadmap.findOneAndUpdate = jest.fn().mockResolvedValue(failedDoc);

		await roadmapService.upsertFailedWithProfile(
			userId,
			profileId,
			'Gemini error'
		);

		expect(Roadmap.findOneAndUpdate).toHaveBeenCalledWith(
			{ userId, acceptedAt: null },
			expect.objectContaining({
				$setOnInsert: expect.objectContaining({ personalisationLevel: 'full' }),
			}),
			expect.objectContaining({ upsert: true, new: true })
		);
	});
});
