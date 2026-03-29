'use strict';

const repository = require('../community.repository');
const { presentOwnerIdentity } = require('./privacyPresenter.service');
const { CommunityError } = require('../community.errors');

async function publishPost(userId, payload = {}) {
	const { sharedRoadmapId } = payload;
	if (!sharedRoadmapId) {
		throw new CommunityError(400, 'INVALID_INPUT', 'sharedRoadmapId is required.');
	}

	const sharedRoadmap = await repository.findSharedRoadmapById(sharedRoadmapId);
	if (!sharedRoadmap || sharedRoadmap.status !== 'active') {
		throw new CommunityError(404, 'SHARED_ROADMAP_NOT_FOUND', 'Shared roadmap not found.');
	}
	if (String(sharedRoadmap.userId) !== String(userId)) {
		throw new CommunityError(403, 'FORBIDDEN', 'You do not own this shared roadmap.');
	}
	if (sharedRoadmap.accessMode !== 'public') {
		throw new CommunityError(403, 'ACCESS_MODE_NOT_PUBLISHABLE', 'Only public share links can be published.');
	}

	const post = await repository.publishPost({ userId, sharedRoadmapId: sharedRoadmap._id });
	return {
		communityPostId: String(post._id),
		sharedRoadmapId: String(post.sharedRoadmapId),
		publishedAt: post.publishedAt,
		likeCount: post.likeCount,
	};
}

async function unpublishMyPost(userId) {
	await repository.unpublishPostByUser(userId);
}

async function listPosts(userId, filters = {}) {
	const result = await repository.listPosts(filters);
	return {
		items: (result.items || []).map((item) => {
			const owner = presentOwnerIdentity({
				displayName: item.profile?.displayName,
				major: item.profile?.major || item.snapshot?.nodes?.[0]?.major || null,
				privacySetting: item.profile?.privacySetting || 'identified',
				fallbackName: 'Student',
			});
			return {
				communityPostId: String(item._id),
				owner,
				careerGoalRole: item.profile?.careerGoal?.role || null,
				personalisationLevel: item.acceptedRoadmap?.personalisationLevel || null,
				nodeCount: item.snapshot?.nodeCount || 0,
				likeCount: item.likeCount || 0,
				publishedAt: item.publishedAt,
				previewNodes: (item.snapshot?.nodes || []).slice(0, 3).map((node) => ({
					courseCode: node.courseCode,
					courseName: node.courseName,
					skills: node.skills || [],
					reason: node.reason,
				})),
			};
		}),
		pagination: {
			page: result.page,
			limit: result.limit,
			total: result.total,
		},
	};
}

async function getPostDetail(postId, viewerUserId) {
	const post = await repository.getPostById(postId);
	if (!post) {
		throw new CommunityError(404, 'NOT_FOUND', 'Post not found.');
	}

	const sharedRoadmap = await repository.findSharedRoadmapById(post.sharedRoadmapId);
	if (!sharedRoadmap || sharedRoadmap.status !== 'active') {
		throw new CommunityError(404, 'NOT_FOUND', 'Post not found.');
	}
	const snapshot = await repository.findSnapshotById(sharedRoadmap.snapshotId);
	if (!snapshot) {
		throw new CommunityError(404, 'NOT_FOUND', 'Post not found.');
	}

	const ownerProfile = await repository.getStudentProfile(post.userId);
	const owner = presentOwnerIdentity({
		displayName: ownerProfile?.displayName,
		major: ownerProfile?.major || snapshot?.nodes?.[0]?.major || null,
		privacySetting: ownerProfile?.privacySetting || 'identified',
		fallbackName: 'Student',
	});

	const hasLiked = !!(viewerUserId ? await repository.hasLikedPost(post._id, viewerUserId) : false);
	return {
		communityPostId: String(post._id),
		owner,
		likeCount: post.likeCount || 0,
		publishedAt: post.publishedAt,
		nodeCount: snapshot.nodeCount,
		nodes: snapshot.nodes,
		hasLiked,
		isOwner: String(post.userId) === String(viewerUserId),
	};
}

module.exports = {
	publishPost,
	unpublishMyPost,
	listPosts,
	getPostDetail,
};
