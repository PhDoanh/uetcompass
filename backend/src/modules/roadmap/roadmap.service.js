'use strict';

const { Roadmap } = require('./roadmap.model');

async function getPrimaryByUser(userId) {
	return Roadmap.findOne({ userId, isPrimary: true }).lean();
}

async function getCompletedByUser(userId) {
	return Roadmap.findOne({ userId, status: 'completed', isPrimary: true }).lean();
}

async function listByUser(userId, { status, page = 1, limit = 20 } = {}) {
	limit = Math.min(limit, 100);
	const filter = { userId };
	if (status) filter.status = status;

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

async function upsertFailed(userId, errorMessage) {
	return Roadmap.findOneAndUpdate(
		{ userId, status: 'failed' },
		{
			$set: { errorMessage, updatedAt: new Date() },
			$setOnInsert: {
				userId,
				isPrimary: false,
				status: 'failed',
				nodes: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function upsertFailedWithProfile(userId, studentProfileId, errorMessage, personalisationLevel = 'full') {
	return Roadmap.findOneAndUpdate(
		{ userId, status: 'failed' },
		{
			$set: { errorMessage, updatedAt: new Date() },
			$setOnInsert: {
				userId,
				isPrimary: false,
				studentProfileId,
				personalisationLevel,
				status: 'failed',
				nodes: [],
				acceptedAt: null,
			},
		},
		{ upsert: true, new: true }
	);
}

async function commitAccepted(userId, { studentProfileId, personalisationLevel, isPrimary, nodes }) {
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
		personalisationLevel,
		status: 'completed',
		errorMessage: null,
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
	listByUser,
	getByIdForUser,
	upsertFailed,
	upsertFailedWithProfile,
	commitAccepted,
	switchPrimary,
};
