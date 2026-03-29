'use strict';

const { Roadmap } = require('../roadmap.model');
const { StudentProfile } = require('../../onboarding/onboarding.model');
const { RoadmapSnapshot } = require('./models/roadmapSnapshot.model');
const { SharedRoadmap } = require('./models/sharedRoadmap.model');
const { CommunityPost } = require('./models/communityPost.model');
const { CommunityPostLike } = require('./models/communityPostLike.model');

async function getPrimaryAcceptedRoadmap(userId) {
	return Roadmap.findOne({ userId, isPrimary: true, status: 'completed' }).lean();
}

async function getStudentProfile(userId) {
	return StudentProfile.findOne({ userId }).lean();
}

async function createSnapshot(payload) {
	return RoadmapSnapshot.create(payload);
}

async function findSnapshotById(snapshotId) {
	return RoadmapSnapshot.findById(snapshotId).lean();
}

async function findSnapshotByAcceptedRoadmapAndHash(acceptedRoadmapId, contentHash) {
	return RoadmapSnapshot.findOne({ acceptedRoadmapId, contentHash }).lean();
}

async function createSharedRoadmap(payload) {
	return SharedRoadmap.create(payload);
}

async function findSharedRoadmapByToken(token) {
	return SharedRoadmap.findOne({ token }).lean();
}

async function findSharedRoadmapById(sharedRoadmapId) {
	return SharedRoadmap.findById(sharedRoadmapId).lean();
}

async function findActiveSharedRoadmapByUserAndSnapshot(userId, snapshotId) {
	return SharedRoadmap.findOne({ userId, snapshotId, status: 'active' }).lean();
}

async function updateSharedRoadmapAccess(token, userId, update) {
	return SharedRoadmap.findOneAndUpdate(
		{ token, userId, status: 'active' },
		{ $set: { ...update, updatedAt: new Date() } },
		{ new: true }
	).lean();
}

async function revokeSharedRoadmap(token, userId) {
	return SharedRoadmap.findOneAndUpdate(
		{ token, userId, status: 'active' },
		{ $set: { status: 'revoked', revokedAt: new Date(), updatedAt: new Date() } },
		{ new: true }
	).lean();
}

async function getActivePostByUser(userId) {
	return CommunityPost.findOne({ userId }).lean();
}

async function getPostById(postId) {
	return CommunityPost.findById(postId).lean();
}

async function getPostBySharedRoadmap(sharedRoadmapId) {
	return CommunityPost.findOne({ sharedRoadmapId }).lean();
}

async function publishPost({ userId, sharedRoadmapId }) {
	return CommunityPost.findOneAndUpdate(
		{ userId },
		{ $set: { sharedRoadmapId, publishedAt: new Date() }, $setOnInsert: { likeCount: 0 } },
		{ upsert: true, new: true }
	).lean();
}

async function unpublishPostByUser(userId) {
	return CommunityPost.findOneAndDelete({ userId }).lean();
}

async function listPosts({ major, careerGoalRole, personalisationLevel, page = 1, limit = 20 }) {
	const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
	const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
	const skip = (safePage - 1) * safeLimit;

	const match = {};
	const lookups = [
		{ $lookup: { from: 'shared_roadmaps', localField: 'sharedRoadmapId', foreignField: '_id', as: 'sharedRoadmap' } },
		{ $unwind: '$sharedRoadmap' },
		{ $lookup: { from: 'roadmap_snapshots', localField: 'sharedRoadmap.snapshotId', foreignField: '_id', as: 'snapshot' } },
		{ $unwind: '$snapshot' },
		{ $lookup: { from: 'roadmaps', localField: 'snapshot.acceptedRoadmapId', foreignField: '_id', as: 'acceptedRoadmap' } },
		{ $unwind: { path: '$acceptedRoadmap', preserveNullAndEmptyArrays: true } },
		{ $lookup: { from: 'student_profiles', localField: 'userId', foreignField: 'userId', as: 'profile' } },
		{ $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
	];

	if (major) match['profile.major'] = major;
	if (careerGoalRole) match['profile.careerGoal.role'] = careerGoalRole;
	if (personalisationLevel) match['acceptedRoadmap.personalisationLevel'] = personalisationLevel;

	const pipeline = [
		...lookups,
		{ $match: match },
		{ $sort: { publishedAt: -1 } },
		{
			$facet: {
				items: [{ $skip: skip }, { $limit: safeLimit }],
				total: [{ $count: 'count' }],
			},
		},
	];

	const [result] = await CommunityPost.aggregate(pipeline);
	return {
		items: result?.items || [],
		total: result?.total?.[0]?.count || 0,
		page: safePage,
		limit: safeLimit,
	};
}

async function hasLikedPost(postId, userId) {
	return CommunityPostLike.findOne({ communityPostId: postId, userId }).lean();
}

async function createLike(postId, userId) {
	return CommunityPostLike.create({ communityPostId: postId, userId });
}

async function removeLike(postId, userId) {
	return CommunityPostLike.findOneAndDelete({ communityPostId: postId, userId }).lean();
}

async function incrementLikeCount(postId, amount) {
	return CommunityPost.findByIdAndUpdate(postId, { $inc: { likeCount: amount } }, { new: true }).lean();
}

module.exports = {
	getPrimaryAcceptedRoadmap,
	getStudentProfile,
	createSnapshot,
	findSnapshotById,
	findSnapshotByAcceptedRoadmapAndHash,
	createSharedRoadmap,
	findSharedRoadmapByToken,
	findSharedRoadmapById,
	findActiveSharedRoadmapByUserAndSnapshot,
	updateSharedRoadmapAccess,
	revokeSharedRoadmap,
	getActivePostByUser,
	getPostById,
	getPostBySharedRoadmap,
	publishPost,
	unpublishPostByUser,
	listPosts,
	hasLikedPost,
	createLike,
	removeLike,
	incrementLikeCount,
};
