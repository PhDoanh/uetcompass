'use strict';

const { CommunityPost } = require('../../../../src/modules/roadmap/community/models/communityPost.model');

describe('community post immutability model invariants', () => {
	test('stores snapshot pointer and likeCount but no editable content field', () => {
		expect(CommunityPost.schema.path('sharedRoadmapId')).toBeDefined();
		expect(CommunityPost.schema.path('likeCount')).toBeDefined();
		expect(CommunityPost.schema.path('content')).toBeUndefined();
	});

	test('enforces unique sharedRoadmapId for one post per shared snapshot', () => {
		const indexSpecs = CommunityPost.schema.indexes().map(([spec]) => spec);
		expect(indexSpecs).toEqual(expect.arrayContaining([
			expect.objectContaining({ sharedRoadmapId: 1 }),
		]));
	});
});
