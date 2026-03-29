'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	findSharedRoadmapByToken: jest.fn(),
	getActivePostByUser: jest.fn(),
	updateSharedRoadmapAccess: jest.fn(),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const shareLinksService = require('../../../../src/modules/roadmap/community/services/shareLinks.service');

describe('shareLinks.service.updateShareLinkAccess', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('switches mode and normalizes users-only allowlist with stable token', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-1',
			status: 'active',
			token: 'token-1',
		});
		repository.getActivePostByUser.mockResolvedValue(null);
		repository.updateSharedRoadmapAccess.mockResolvedValue({
			token: 'token-1',
			accessMode: 'users-only',
			allowedUserIds: ['u1', 'u2'],
			updatedAt: new Date('2026-03-29T10:10:00.000Z'),
		});

		const result = await shareLinksService.updateShareLinkAccess('owner-1', 'token-1', {
			accessMode: 'users-only',
			allowedUserIds: ['u1', 'u1', '  u2 ', ''],
		});

		expect(repository.updateSharedRoadmapAccess).toHaveBeenCalledWith('token-1', 'owner-1', {
			accessMode: 'users-only',
			allowedUserIds: ['u1', 'u2'],
		});
		expect(result.token).toBe('token-1');
		expect(result.accessMode).toBe('users-only');
	});

	test('returns FORBIDDEN when non-owner tries to switch access', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-1',
			status: 'active',
		});

		await expect(shareLinksService.updateShareLinkAccess('other-user', 'token-1', { accessMode: 'public' }))
			.rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
	});

	test('returns POST_DEPENDENCY_CONFLICT on switch to non-public while post depends on link', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			_id: 'shared-1',
			userId: 'owner-1',
			status: 'active',
		});
		repository.getActivePostByUser.mockResolvedValue({ sharedRoadmapId: 'shared-1' });

		await expect(shareLinksService.updateShareLinkAccess('owner-1', 'token-1', { accessMode: 'private' }))
			.rejects.toMatchObject({ status: 409, code: 'POST_DEPENDENCY_CONFLICT' });
	});
});
