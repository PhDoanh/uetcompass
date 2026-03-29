'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	findSharedRoadmapById: jest.fn(),
	publishPost: jest.fn(),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const postsService = require('../../../../src/modules/roadmap/community/services/posts.service');

describe('posts.service.publishPost', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('rejects missing sharedRoadmapId', async () => {
		await expect(postsService.publishPost('user-1', {}))
			.rejects.toMatchObject({ status: 400, code: 'INVALID_INPUT' });
	});

	test('rejects when shared roadmap not found', async () => {
		repository.findSharedRoadmapById.mockResolvedValue(null);

		await expect(postsService.publishPost('user-1', { sharedRoadmapId: 'shared-1' }))
			.rejects.toMatchObject({ status: 404, code: 'SHARED_ROADMAP_NOT_FOUND' });
	});

	test('rejects when shared roadmap belongs to another user', async () => {
		repository.findSharedRoadmapById.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-2',
			status: 'active',
			accessMode: 'public',
		});

		await expect(postsService.publishPost('owner-1', { sharedRoadmapId: 'shared-1' }))
			.rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
	});

	test('rejects publish when access mode is not public', async () => {
		repository.findSharedRoadmapById.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-1',
			status: 'active',
			accessMode: 'private',
		});

		await expect(postsService.publishPost('owner-1', { sharedRoadmapId: 'shared-1' }))
			.rejects.toMatchObject({ status: 403, code: 'ACCESS_MODE_NOT_PUBLISHABLE' });
	});

	test('publishes with replace-upsert semantics', async () => {
		repository.findSharedRoadmapById.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-1',
			status: 'active',
			accessMode: 'public',
		});
		repository.publishPost.mockResolvedValue({
			_id: 'post-1',
			sharedRoadmapId: 'shared-1',
			publishedAt: new Date('2026-03-29T10:20:00.000Z'),
			likeCount: 0,
		});

		const result = await postsService.publishPost('owner-1', { sharedRoadmapId: 'shared-1' });

		expect(repository.publishPost).toHaveBeenCalledWith({ userId: 'owner-1', sharedRoadmapId: 'shared-1' });
		expect(result).toEqual({
			communityPostId: 'post-1',
			sharedRoadmapId: 'shared-1',
			publishedAt: new Date('2026-03-29T10:20:00.000Z'),
			likeCount: 0,
		});
	});
});
