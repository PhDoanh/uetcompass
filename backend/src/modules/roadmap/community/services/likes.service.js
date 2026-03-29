'use strict';

const repository = require('../community.repository');
const { CommunityError } = require('../community.errors');

async function likePost(postId, userId) {
	const post = await repository.getPostById(postId);
	if (!post) {
		throw new CommunityError(404, 'NOT_FOUND', 'Post not found.');
	}

	const existing = await repository.hasLikedPost(post._id, userId);
	if (existing) {
		return {
			communityPostId: String(post._id),
			likeCount: post.likeCount,
			hasLiked: true,
			created: false,
		};
	}

	await repository.createLike(post._id, userId);
	const updatedPost = await repository.incrementLikeCount(post._id, 1);
	return {
		communityPostId: String(post._id),
		likeCount: updatedPost.likeCount,
		hasLiked: true,
		created: true,
	};
}

async function unlikePost(postId, userId) {
	const post = await repository.getPostById(postId);
	if (!post) {
		throw new CommunityError(404, 'NOT_FOUND', 'Post not found.');
	}

	const removed = await repository.removeLike(post._id, userId);
	if (!removed) {
		return {
			communityPostId: String(post._id),
			likeCount: post.likeCount,
			hasLiked: false,
		};
	}

	const updatedPost = await repository.incrementLikeCount(post._id, -1);
	return {
		communityPostId: String(post._id),
		likeCount: updatedPost.likeCount,
		hasLiked: false,
	};
}

module.exports = {
	likePost,
	unlikePost,
};
