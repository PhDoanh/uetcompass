'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	findSharedRoadmapByToken: jest.fn(),
	findSnapshotById: jest.fn(),
	getStudentProfile: jest.fn(),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const shareLinksService = require('../../../../src/modules/roadmap/community/services/shareLinks.service');

describe('shareLinks.service.resolveShareLink', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('resolves public share-link for anonymous viewer', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			userId: 'owner-1',
			snapshotId: 'snap-1',
			accessMode: 'public',
			status: 'active',
		});
		repository.findSnapshotById.mockResolvedValue({
			_id: 'snap-1',
			capturedAt: new Date('2026-03-29T10:00:00.000Z'),
			nodeCount: 1,
			nodes: [{ courseCode: 'INT2204', courseName: 'DB', skills: ['SQL'], reason: 'core', major: 'CS' }],
		});
		repository.getStudentProfile.mockResolvedValue({ displayName: 'Alice', major: 'CS', privacySetting: 'identified' });

		const result = await shareLinksService.resolveShareLink('token-1', null);

		expect(result.snapshotId).toBe('snap-1');
		expect(result.owner).toEqual({ displayName: 'Alice', major: 'CS' });
		expect(result.nodeCount).toBe(1);
	});

	test('blocks users-only viewers not in allowlist', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			userId: 'owner-1',
			snapshotId: 'snap-1',
			accessMode: 'users-only',
			allowedUserIds: ['allowed-1'],
			status: 'active',
		});

		await expect(shareLinksService.resolveShareLink('token-1', 'blocked-1'))
			.rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
	});

	test('allows private mode only for owner', async () => {
		repository.findSharedRoadmapByToken.mockResolvedValue({
			userId: 'owner-1',
			snapshotId: 'snap-1',
			accessMode: 'private',
			status: 'active',
		});
		repository.findSnapshotById.mockResolvedValue({
			_id: 'snap-1',
			capturedAt: new Date('2026-03-29T10:00:00.000Z'),
			nodeCount: 0,
			nodes: [],
		});
		repository.getStudentProfile.mockResolvedValue({ displayName: 'Owner', major: 'CS', privacySetting: 'anonymous' });

		const result = await shareLinksService.resolveShareLink('token-1', 'owner-1');
		expect(result.owner.displayName).toBe('Anonymous');
		expect(result.owner.major).toBe('CS');
	});
});
