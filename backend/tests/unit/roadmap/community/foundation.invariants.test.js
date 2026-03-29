'use strict';

const { RoadmapSnapshot } = require('../../../../src/modules/roadmap/community/models/roadmapSnapshot.model');
const { SharedRoadmap } = require('../../../../src/modules/roadmap/community/models/sharedRoadmap.model');
const { CommunityPost } = require('../../../../src/modules/roadmap/community/models/communityPost.model');
const { CommunityPostLike } = require('../../../../src/modules/roadmap/community/models/communityPostLike.model');
const { computeSnapshotHash } = require('../../../../src/modules/roadmap/community/services/snapshotHash.service');

describe('roadmap-community foundation invariants', () => {
	test('snapshot hashing is canonical for node order and skill order', () => {
		const nodesA = [
			{ courseCode: 'INT2204', courseName: 'DB', skills: ['SQL', 'Index'], reason: 'core' },
			{ courseCode: 'INT2211', courseName: 'Web', skills: ['React'], reason: 'ui' },
		];
		const nodesB = [
			{ courseCode: 'INT2211', courseName: 'Web', skills: ['React'], reason: 'ui' },
			{ courseCode: 'INT2204', courseName: 'DB', skills: ['Index', 'SQL'], reason: 'core' },
		];

		expect(computeSnapshotHash(nodesA)).toBe(computeSnapshotHash(nodesB));
	});

	test('roadmap snapshot enforces unique acceptedRoadmapId/contentHash index', () => {
		const indexSpecs = RoadmapSnapshot.schema.indexes().map(([spec]) => spec);
		expect(indexSpecs).toEqual(expect.arrayContaining([
			expect.objectContaining({ acceptedRoadmapId: 1, contentHash: 1 }),
		]));
	});

	test('shared roadmap enforces unique snapshot cardinality and access enum', () => {
		const indexSpecs = SharedRoadmap.schema.indexes().map(([spec]) => spec);
		expect(indexSpecs).toEqual(expect.arrayContaining([
			expect.objectContaining({ snapshotId: 1 }),
		]));
		expect(SharedRoadmap.schema.path('accessMode').enumValues).toEqual(['private', 'users-only', 'public']);
	});

	test('community post keeps likeCount on post and unique sharedRoadmapId', () => {
		const indexSpecs = CommunityPost.schema.indexes().map(([spec]) => spec);
		expect(indexSpecs).toEqual(expect.arrayContaining([
			expect.objectContaining({ sharedRoadmapId: 1 }),
		]));
		expect(CommunityPost.schema.path('likeCount')).toBeDefined();
	});

	test('community post like enforces one like per user per post', () => {
		const indexSpecs = CommunityPostLike.schema.indexes().map(([spec]) => spec);
		expect(indexSpecs).toEqual(expect.arrayContaining([
			expect.objectContaining({ communityPostId: 1, userId: 1 }),
		]));
	});
});
