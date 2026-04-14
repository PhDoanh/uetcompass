'use strict';

const { Roadmap } = require('./roadmap.model');

async function getPrimaryByUser(userId) {
	return Roadmap.findOne({ userId, isPrimary: true }).lean();
}

async function getCompletedByUser(userId) {
	return Roadmap.findOne({ userId, isPrimary: true, acceptedAt: { $ne: null } }).lean();
}

async function getRetryableByUser(userId) {
	return Roadmap.findOne({ userId, acceptedAt: null }).lean();
}

async function listByUser(userId, { page = 1, limit = 20 } = {}) {
	limit = Math.min(limit, 100);
	const filter = { userId };

	const [items, total] = await Promise.all([
		Roadmap.find(filter, { nodes: 0 })
			.sort({ updatedAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.lean(),
		Roadmap.countDocuments(filter),
	]);

	return { items, pagination: { page, limit, total } };
}

async function getByIdForUser(roadmapId, userId) {
	return Roadmap.findOne({ _id: roadmapId, userId }).lean();
}

async function upsertFailed(userId, message) {
	// message is for logging only — NOT stored on the document (2026-04-08 decision)
	return Roadmap.findOneAndUpdate(
		{ userId, acceptedAt: null },
		{
			$set: { updatedAt: new Date() },
			$setOnInsert: {
				userId,
				isPrimary: false,
				nodes: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function upsertFailedWithProfile(userId, studentProfileId, message, personalisationLevel = 'full') {
	// message is for logging only — NOT stored on the document (2026-04-08 decision)
	return Roadmap.findOneAndUpdate(
		{ userId, acceptedAt: null },
		{
			$set: { updatedAt: new Date() },
			$setOnInsert: {
				userId,
				isPrimary: false,
				studentProfileId,
				personalisationLevel,
				nodes: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function commitAccepted(userId, { studentProfileId, roadmapName, personalisationLevel, isPrimary, nodes }) {
	if (isPrimary) {
		await Roadmap.updateMany(
			{ userId, isPrimary: true },
			{ $set: { isPrimary: false } }
		);
	}

	return Roadmap.create({
		userId,
		isPrimary: !!isPrimary,
		studentProfileId,
		roadmapName,
		personalisationLevel,
		nodes,
		acceptedAt: new Date(),
	});
}

async function switchPrimary(roadmapId, userId) {
	const target = await Roadmap.findOne({ _id: roadmapId, userId });
	if (!target) {
		const err = new Error('Roadmap not found.');
		err.code = 'ROADMAP_NOT_FOUND';
		err.status = 404;
		throw err;
	}

	if (target.isPrimary) return target;

	await Roadmap.updateMany(
		{ userId, isPrimary: true },
		{ $set: { isPrimary: false } }
	);

	const promoted = await Roadmap.findOneAndUpdate(
		{ _id: roadmapId, userId, isPrimary: false },
		{ $set: { isPrimary: true } },
		{ new: true }
	);

	if (!promoted) {
		const err = new Error('Primary roadmap update conflicted with another in-flight operation.');
		err.code = 'CONFLICT';
		err.status = 409;
		throw err;
	}

	return promoted;
}

module.exports = {
	getPrimaryByUser,
	getCompletedByUser,
	getRetryableByUser,
	listByUser,
	getByIdForUser,
	upsertFailed,
	upsertFailedWithProfile,
	commitAccepted,
	switchPrimary,
};
