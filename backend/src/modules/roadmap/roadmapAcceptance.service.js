'use strict';

const { validateTopologicalOrder } = require('./roadmapValidation.service');
const roadmapService = require('./roadmap.service');
const progressService = require('./roadmapProgress.service');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

async function acceptRoadmap(userId, { studentProfileId, roadmapName, personalisationLevel, isPrimary, nodes }) {
	const profile = await StudentProfile.findOne({ _id: studentProfileId, userId });
	if (!profile) {
		const err = new Error('Student profile not found.');
		err.code = 'ROADMAP_NOT_FOUND';
		err.status = 404;
		throw err;
	}

	const completedCodes = new Set(
		(profile.completedCourses ?? []).map((c) => c.courseCode)
	);

	// A node is filtered out if ALL its related courses are already completed.
	// (At generation time completed courses are excluded from relatedCourses,
	// but a student may complete additional courses between generation and acceptance.)
	const filteredNodes = nodes.filter(
		(n) =>
			(n.relatedCourses ?? []).length === 0 ||
			!(n.relatedCourses ?? []).every((rc) => completedCodes.has(rc.courseCode))
	);

	if (filteredNodes.length === 0) {
		const err = new Error('All submitted roadmap nodes are already completed by this student.');
		err.code = 'ALL_COMPLETED';
		err.status = 422;
		throw err;
	}

	const courseUnits = await CourseUnit.find({ major: profile.major ?? '' }).lean();
	validateTopologicalOrder(filteredNodes, courseUnits, completedCodes);

	const committed = await roadmapService.commitAccepted(userId, {
		studentProfileId,
		roadmapName,
		personalisationLevel,
		isPrimary,
		nodes: filteredNodes,
	});

	// Seed progress document — all accepted nodeIds start in `pending`
	const nodeIds = filteredNodes.map((n) => n.nodeId);
	await progressService.createProgress(userId, committed._id, nodeIds);

	return committed;
}

module.exports = {
	acceptRoadmap,
};
