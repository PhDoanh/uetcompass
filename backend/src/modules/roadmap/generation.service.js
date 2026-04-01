'use strict';

const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { callGemini } = require('./roadmap.gemini.service');
const { notifyPreviewReady, notifyGenerationFailed } = require('./roadmap.sse');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');
const activeGenerations = new Set();

async function runGenerationLifecycle(userId, triggerReason, sseToken = '') {
	let personalisationLevel = 'full';
	let studentProfileId;
	try {
		const profile = await StudentProfile.findOne({ userId });
		if (!profile) {
			throw new Error(`StudentProfile not found for user: ${userId}`);
		}
		studentProfileId = profile._id;

		personalisationLevel =
			profile.careerGoal?.role || profile.careerGoal?.companyType ? 'full' : 'low';

		const courseUnits = await CourseUnit.find({ major: profile.major }).lean();

		let existingRoadmap = null;
		if (triggerReason === 'repersonalization') {
			existingRoadmap = await roadmapService.getCompletedByUser(userId);
		}

		const nodes = await callGemini(profile, courseUnits, existingRoadmap);
		const completedCourseCodes = new Set(
			(profile.completedCourses ?? []).map((c) => c.courseCode)
		);

		roadmapValidation.validateTopologicalOrder(nodes, courseUnits, completedCourseCodes);

		   // Save generated roadmap directly to DB as completed
		   await roadmapService.commitAccepted(userId, {
			   studentProfileId,
			   personalisationLevel,
			   isPrimary: true,
			   nodes,
		   });
		   notifyPreviewReady(sseToken);
	} catch (err) {
		await roadmapService.upsertFailedWithProfile(userId, studentProfileId, err.message, personalisationLevel);
		notifyGenerationFailed(sseToken);
	} finally {
		activeGenerations.delete(userId.toString());
	}
}

async function triggerGeneration(userId, triggerReason, sseToken = '') {
	const userKey = userId.toString();
	if (activeGenerations.has(userKey)) {
		const err = new Error('CONFLICT');
		err.code = 'CONFLICT';
		err.status = 409;
		throw err;
	}

	activeGenerations.add(userKey);

	runGenerationLifecycle(userId, triggerReason, sseToken).catch((unexpectedErr) => {
		console.error('[generation] Unhandled lifecycle error:', unexpectedErr);
		activeGenerations.delete(userKey);
	});
}

function isGenerating(userId) {
	return activeGenerations.has(userId.toString());
}

async function __handleSigterm() {
	const pendingUserIds = previewStore.getAllPendingUserIds();
	for (const userId of pendingUserIds) {
		const preview = previewStore.getPendingPreview(userId);
		const profileId = preview?.studentProfileId ?? null;
		if (profileId) {
			await roadmapService.upsertFailedWithProfile(
				userId,
				profileId.toString(),
				'Worker restart — generation preview lost'
			);
		} else {
			await roadmapService.upsertFailed(userId, 'Worker restart — generation preview lost');
		}
		previewStore.clearPendingPreview(userId);
	}
}

module.exports = {
	triggerGeneration,
	isGenerating,
	__handleSigterm,
	// Exported for test injection
	_callGemini: callGemini,
};
