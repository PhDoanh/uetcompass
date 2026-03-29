'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	unpublishPostByUser: jest.fn(),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const postsService = require('../../../../src/modules/roadmap/community/services/posts.service');

describe('posts.service.unpublishMyPost', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('deletes active post for current user', async () => {
		repository.unpublishPostByUser.mockResolvedValue({ _id: 'post-1' });

		await postsService.unpublishMyPost('owner-1');

		expect(repository.unpublishPostByUser).toHaveBeenCalledWith('owner-1');
	});

	test('is idempotent when user has no active post', async () => {
		repository.unpublishPostByUser.mockResolvedValue(null);

		await expect(postsService.unpublishMyPost('owner-1')).resolves.toBeUndefined();
	});
});
