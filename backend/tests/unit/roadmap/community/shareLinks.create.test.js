'use strict';

jest.mock('../../../../src/modules/roadmap/community/community.repository', () => ({
	getPrimaryAcceptedRoadmap: jest.fn(),
	getStudentProfile: jest.fn(),
	findSnapshotByAcceptedRoadmapAndHash: jest.fn(),
	findActiveSharedRoadmapByUserAndSnapshot: jest.fn(),
	createSnapshot: jest.fn(),
	createSharedRoadmap: jest.fn(),
}));

jest.mock('../../../../src/modules/roadmap/community/services/eligibility.service', () => ({
	getEligibility: jest.fn(),
}));

jest.mock('../../../../src/modules/roadmap/community/services/snapshotHash.service', () => ({
	canonicalizeNodes: jest.fn((nodes) => nodes),
	computeSnapshotHash: jest.fn(() => 'hash-001'),
}));

const repository = require('../../../../src/modules/roadmap/community/community.repository');
const { getEligibility } = require('../../../../src/modules/roadmap/community/services/eligibility.service');
const shareLinksService = require('../../../../src/modules/roadmap/community/services/shareLinks.service');

describe('shareLinks.service.createShareLink', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('creates snapshot + share link for eligible user', async () => {
		repository.getPrimaryAcceptedRoadmap.mockResolvedValue({
			_id: 'rm-1',
			acceptedAt: new Date('2026-03-01T00:00:00.000Z'),
			nodes: [{ courseCode: 'INT2204', courseName: 'DB', skills: ['SQL'], reason: 'core' }],
		});
		getEligibility.mockReturnValue({ eligible: true, daysUntilEligible: 0 });
		repository.getStudentProfile.mockResolvedValue({ major: 'Computer Science' });
		repository.findSnapshotByAcceptedRoadmapAndHash.mockResolvedValue(null);
		repository.createSnapshot.mockResolvedValue({ _id: 'snap-1' });
		repository.createSharedRoadmap.mockResolvedValue({
			_id: 'shared-1',
			token: 'token-1',
			accessMode: 'private',
			createdAt: new Date('2026-03-29T10:00:00.000Z'),
		});

		const result = await shareLinksService.createShareLink('user-1', 'https://example.com');

		expect(result.token).toBe('token-1');
		expect(result.shareUrl).toBe('https://example.com/share/token-1');
		expect(repository.createSnapshot).toHaveBeenCalled();
		expect(repository.createSharedRoadmap).toHaveBeenCalledWith(expect.objectContaining({
			userId: 'user-1',
			snapshotId: 'snap-1',
			accessMode: 'private',
		}));
	});

	test('throws ROADMAP_NOT_FOUND when no accepted roadmap', async () => {
		repository.getPrimaryAcceptedRoadmap.mockResolvedValue(null);

		await expect(shareLinksService.createShareLink('user-1', 'https://example.com'))
			.rejects.toMatchObject({ status: 404, code: 'ROADMAP_NOT_FOUND' });
	});

	test('throws INELIGIBLE when hold window not met', async () => {
		repository.getPrimaryAcceptedRoadmap.mockResolvedValue({ _id: 'rm-1', acceptedAt: new Date(), nodes: [] });
		getEligibility.mockReturnValue({ eligible: false, daysUntilEligible: 3 });

		await expect(shareLinksService.createShareLink('user-1', 'https://example.com'))
			.rejects.toMatchObject({ status: 403, code: 'INELIGIBLE' });
	});

	test('throws DUPLICATE_SNAPSHOT_SHARE when active share exists for same snapshot', async () => {
		repository.getPrimaryAcceptedRoadmap.mockResolvedValue({
			_id: 'rm-1',
			acceptedAt: new Date('2026-03-01T00:00:00.000Z'),
			nodes: [],
		});
		getEligibility.mockReturnValue({ eligible: true });
		repository.getStudentProfile.mockResolvedValue({ major: 'Computer Science' });
		repository.findSnapshotByAcceptedRoadmapAndHash.mockResolvedValue({ _id: 'snap-1' });
		repository.findActiveSharedRoadmapByUserAndSnapshot.mockResolvedValue({ token: 'token-existing' });

		await expect(shareLinksService.createShareLink('user-1', 'https://example.com'))
			.rejects.toMatchObject({ status: 409, code: 'DUPLICATE_SNAPSHOT_SHARE' });
	});
});
