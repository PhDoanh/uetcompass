'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	findSharedRoadmapByToken: jest.fn(),
	revokeSharedRoadmap: jest.fn(),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const shareLinksService = require('../../../../src/modules/roadmap/community/services/shareLinks.service');

describe('shareLinks.service.revokeShareLink', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('revokes active link for owner', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			userId: 'owner-1',
			status: 'active',
		});

		await shareLinksService.revokeShareLink('owner-1', 'token-1');
		expect(repository.revokeSharedRoadmap).toHaveBeenCalledWith('token-1', 'owner-1');
	});

	test('returns NOT_FOUND for missing or non-active token', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue(null);

		await expect(shareLinksService.revokeShareLink('owner-1', 'token-1'))
			.rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
	});

	test('returns FORBIDDEN when non-owner attempts revoke', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			userId: 'owner-1',
			status: 'active',
		});

		await expect(shareLinksService.revokeShareLink('other-user', 'token-1'))
			.rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
	});
});
