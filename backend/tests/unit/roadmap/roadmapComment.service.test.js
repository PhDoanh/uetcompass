'use strict';

jest.mock('../../../src/modules/roadmap/manualRoadmap.model');
jest.mock('../../../src/modules/roadmap/roadmapComment.model');

const { ManualRoadmap } = require('../../../src/modules/roadmap/manualRoadmap.model');
const { RoadmapComment } = require('../../../src/modules/roadmap/roadmapComment.model');
const roadmapCommentService = require('../../../src/modules/roadmap/roadmapComment.service');

const roadmapId = 'roadmap-1';
const userId = 'user-1';

function makeFindChain(result) {
	const chain = {
		populate: jest.fn().mockReturnThis(),
		sort: jest.fn().mockReturnThis(),
		limit: jest.fn().mockReturnThis(),
		lean: jest.fn().mockResolvedValue(result),
	};

	return chain;
}

describe('roadmapComment.service', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('listByRoadmapId returns normalized reviews for a roadmap', async () => {
		ManualRoadmap.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: roadmapId }) });
		RoadmapComment.find = jest.fn().mockReturnValue(makeFindChain([
			{
				_id: 'comment-1',
				roadmapId,
				userId: { _id: userId, displayName: 'Tester', privacySetting: 'identified' },
				rating: 5,
				content: 'Great roadmap',
				commentedAt: new Date('2026-04-28T10:00:00Z'),
			},
		]));
		RoadmapComment.countDocuments = jest.fn().mockResolvedValue(1);

		const result = await roadmapCommentService.listByRoadmapId(roadmapId, { limit: 10 });

		expect(ManualRoadmap.findById).toHaveBeenCalledWith(roadmapId, { _id: 1 });
		expect(RoadmapComment.find).toHaveBeenCalledWith({ roadmapId });
		expect(result.pagination).toEqual({ page: 1, limit: 10, total: 1 });
		expect(result.items[0]).toMatchObject({
			id: 'comment-1',
			roadmapId,
			userId,
			author: 'Tester',
			rating: 5,
			content: 'Great roadmap',
		});
	});

	test('createComment persists a new comment and returns normalized review', async () => {
		const createdAt = new Date('2026-04-28T11:15:00Z');
		ManualRoadmap.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: roadmapId }) });
		RoadmapComment.create = jest.fn().mockResolvedValue({ _id: 'comment-2' });
		RoadmapComment.findById = jest.fn().mockReturnValue({
			populate: jest.fn().mockReturnThis(),
			lean: jest.fn().mockResolvedValue({
				_id: 'comment-2',
				roadmapId,
				userId: { _id: userId, fullName: 'Nguyen Van A', privacySetting: 'identified' },
				rating: 4,
				content: 'Helpful roadmap',
				commentedAt: createdAt,
			}),
		});

		const result = await roadmapCommentService.createComment(roadmapId, userId, {
			content: '  Helpful roadmap  ',
			rating: '4',
		});

		expect(RoadmapComment.create).toHaveBeenCalledWith({
			roadmapId,
			userId,
			content: 'Helpful roadmap',
			rating: 4,
		});
		expect(result).toMatchObject({
			id: 'comment-2',
			roadmapId,
			author: 'Nguyen Van A',
			rating: 4,
			content: 'Helpful roadmap',
		});
	});

	test('rejects empty content and invalid rating', async () => {
		ManualRoadmap.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: roadmapId }) });

		await expect(
			roadmapCommentService.createComment(roadmapId, userId, { content: '   ', rating: 5 })
		).rejects.toMatchObject({ code: 'INVALID_PAYLOAD', status: 400 });

		await expect(
			roadmapCommentService.createComment(roadmapId, userId, { content: 'Nice', rating: 9 })
		).rejects.toMatchObject({ code: 'INVALID_PAYLOAD', status: 400 });
	});
});