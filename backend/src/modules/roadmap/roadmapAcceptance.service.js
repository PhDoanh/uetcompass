'use strict';

const { validateTopologicalOrder } = require('./roadmapValidation.service');
const roadmapService = require('./roadmap.service');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

async function acceptRoadmap(userId, { studentProfileId, personalisationLevel, isPrimary, nodes }) {
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

	const filteredNodes = nodes.filter((n) => !completedCodes.has(n.courseCode));

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
		personalisationLevel,
		isPrimary,
		nodes: filteredNodes,
	});

	return committed;
}

module.exports = {
	acceptRoadmap,
};
