'use strict';

const crypto = require('crypto');
const repository = require('../community.repository');
const { computeSnapshotHash, canonicalizeNodes } = require('./snapshotHash.service');
const { getEligibility } = require('./eligibility.service');
const { presentOwnerIdentity } = require('./privacyPresenter.service');
const { CommunityError } = require('../community.errors');

function normalizeAllowedUserIds(accessMode, allowedUserIds) {
	if (accessMode !== 'users-only') {
		return [];
	}
	if (!Array.isArray(allowedUserIds)) {
		return [];
	}
	return [...new Set(allowedUserIds.map((item) => String(item).trim()).filter(Boolean))];
}

function assertAccessMode(accessMode) {
	if (!['private', 'users-only', 'public'].includes(accessMode)) {
		throw new CommunityError(400, 'INVALID_INPUT', 'accessMode must be one of private, users-only, public.');
	}
}

function projectSnapshotNodes(roadmapNodes, major) {
	return canonicalizeNodes((roadmapNodes || []).map((node) => ({
		courseCode: node.courseCode,
		courseName: node.courseName,
		skills: node.skills || [],
		reason: node.reason,
		major,
	})));
}

async function createShareLink(userId, baseUrl) {
	const roadmap = await repository.getPrimaryAcceptedRoadmap(userId);
	if (!roadmap || !roadmap.acceptedAt) {
		throw new CommunityError(404, 'ROADMAP_NOT_FOUND', 'No accepted primary roadmap found.');
	}

	const eligibility = getEligibility(roadmap.acceptedAt);
	if (!eligibility.eligible) {
		throw new CommunityError(403, 'INELIGIBLE', 'Share link is not available yet.', {
			daysUntilEligible: eligibility.daysUntilEligible,
		});
	}

	const profile = await repository.getStudentProfile(userId);
	const snapshotNodes = projectSnapshotNodes(roadmap.nodes, profile?.major || null);
	const contentHash = computeSnapshotHash(snapshotNodes);

	const existingSnapshot = await repository.findSnapshotByAcceptedRoadmapAndHash(roadmap._id, contentHash);
	if (existingSnapshot) {
		const existingShared = await repository.findActiveSharedRoadmapByUserAndSnapshot(userId, existingSnapshot._id);
		if (existingShared) {
			throw new CommunityError(409, 'DUPLICATE_SNAPSHOT_SHARE', 'An active share link already exists for this snapshot.', {
				token: existingShared.token,
			});
		}
	}

	const snapshot = existingSnapshot || await repository.createSnapshot({
		userId,
		acceptedRoadmapId: roadmap._id,
		capturedAt: new Date(),
		contentHash,
		nodes: snapshotNodes,
		nodeCount: snapshotNodes.length,
	});

	let sharedRoadmap;
	try {
		sharedRoadmap = await repository.createSharedRoadmap({
			userId,
			snapshotId: snapshot._id,
			token: crypto.randomUUID(),
			accessMode: 'private',
			allowedUserIds: [],
			status: 'active',
		});
	} catch (err) {
		if (err?.code === 11000) {
			throw new CommunityError(409, 'DUPLICATE_SNAPSHOT_SHARE', 'An active share link already exists for this snapshot.');
		}
		throw err;
	}

	return {
		sharedRoadmapId: String(sharedRoadmap._id),
		snapshotId: String(snapshot._id),
		token: sharedRoadmap.token,
		shareUrl: `${baseUrl}/share/${sharedRoadmap.token}`,
		accessMode: sharedRoadmap.accessMode,
		createdAt: sharedRoadmap.createdAt,
	};
}

async function updateShareLinkAccess(userId, token, payload = {}) {
	const accessMode = payload.accessMode;
	assertAccessMode(accessMode);

	const sharedRoadmap = await repository.findSharedRoadmapByToken(token);
	if (!sharedRoadmap || sharedRoadmap.status !== 'active') {
		throw new CommunityError(404, 'NOT_FOUND', 'Share link not found.');
	}
	if (String(sharedRoadmap.userId) !== String(userId)) {
		throw new CommunityError(403, 'FORBIDDEN', 'You do not own this share link.');
	}

	const activePost = await repository.getActivePostByUser(userId);
	const hasPostDependency =
		activePost &&
		String(activePost.sharedRoadmapId) === String(sharedRoadmap._id) &&
		accessMode !== 'public';
	if (hasPostDependency) {
		throw new CommunityError(
			409,
			'POST_DEPENDENCY_CONFLICT',
			'Cannot switch access mode while an active post depends on this share link.'
		);
	}

	const allowedUserIds = normalizeAllowedUserIds(accessMode, payload.allowedUserIds);
	const updated = await repository.updateSharedRoadmapAccess(token, userId, {
		accessMode,
		allowedUserIds,
	});

	if (!updated) {
		throw new CommunityError(404, 'NOT_FOUND', 'Share link not found.');
	}

	return {
		token: updated.token,
		accessMode: updated.accessMode,
		allowedUserIds: updated.allowedUserIds,
		updatedAt: updated.updatedAt,
	};
}

async function resolveShareLink(token, viewerUserId) {
	const sharedRoadmap = await repository.findSharedRoadmapByToken(token);
	if (!sharedRoadmap || sharedRoadmap.status === 'revoked') {
		throw new CommunityError(404, 'NOT_FOUND', 'Share link not found.');
	}

	const isOwner = viewerUserId && String(sharedRoadmap.userId) === String(viewerUserId);
	if (sharedRoadmap.accessMode === 'private' && !isOwner) {
		throw new CommunityError(403, 'FORBIDDEN', 'This share link is private.');
	}

	if (sharedRoadmap.accessMode === 'users-only' && !isOwner) {
		const isAllowed = viewerUserId && (sharedRoadmap.allowedUserIds || []).includes(String(viewerUserId));
		if (!isAllowed) {
			throw new CommunityError(403, 'FORBIDDEN', 'You are not in the allowlist for this share link.');
		}
	}

	const snapshot = await repository.findSnapshotById(sharedRoadmap.snapshotId);
	if (!snapshot) {
		throw new CommunityError(404, 'NOT_FOUND', 'Snapshot not found.');
	}

	const ownerProfile = await repository.getStudentProfile(sharedRoadmap.userId);
	const owner = presentOwnerIdentity({
		displayName: ownerProfile?.displayName,
		major: ownerProfile?.major || snapshot?.nodes?.[0]?.major || null,
		privacySetting: ownerProfile?.privacySetting || 'identified',
		fallbackName: 'Student',
	});

	return {
		snapshotId: String(snapshot._id),
		owner,
		capturedAt: snapshot.capturedAt,
		nodeCount: snapshot.nodeCount,
		nodes: snapshot.nodes,
	};
}

async function revokeShareLink(userId, token) {
	const sharedRoadmap = await repository.findSharedRoadmapByToken(token);
	if (!sharedRoadmap || sharedRoadmap.status !== 'active') {
		throw new CommunityError(404, 'NOT_FOUND', 'Share link not found.');
	}
	if (String(sharedRoadmap.userId) !== String(userId)) {
		throw new CommunityError(403, 'FORBIDDEN', 'You do not own this share link.');
	}

	await repository.revokeSharedRoadmap(token, userId);
}

module.exports = {
	createShareLink,
	updateShareLinkAccess,
	resolveShareLink,
	revokeShareLink,
};
