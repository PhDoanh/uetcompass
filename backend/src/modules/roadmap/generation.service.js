'use strict';

const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { callGemini } = require('./roadmap.gemini.service');
const { notifyPreviewReady, notifyGenerationFailed } = require('./roadmap.sse');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

const activeGenerations = new Set();

// Enrich roadmap nodes with skills (Feature 003, phase 1)
async function enrichNode(nodes, userId) {
	// Example: Call Feature 003 for skill enrichment only
	const axios = require('axios');
	try {
		const response = await axios.post(
			process.env.FEATURE_003_ENRICH_SKILLS_URL || 'http://localhost:3001/api/skill-enrich',
			{ nodes, userId }
		);
		return response.data.nodes; // Expecting { nodes: [...] }
	} catch (err) {
		console.error('[enrichNode] Skill enrichment failed:', err.message);
		throw new Error('Skill enrichment failed (Feature 003)');
	}
}

async function runGenerationLifecycle(userId, studentProfileId, triggerReason) {
	let personalisationLevel = 'full';
	try {
		const profile = await StudentProfile.findById(studentProfileId);
		if (!profile) {
			throw new Error(`StudentProfile not found: ${studentProfileId}`);
		}

		personalisationLevel =
			profile.careerGoal?.role || profile.careerGoal?.companyType ? 'full' : 'low';

		const courseUnits = await CourseUnit.find({ major: profile.major }).lean();

		let existingRoadmap = null;
		if (triggerReason === 'repersonalization') {
			existingRoadmap = await roadmapService.getCompletedByUser(userId);
		}

		const nodes = await callGemini(profile, courseUnits, existingRoadmap);

		const skillEnrichedNodes = await enrichNode(nodes, userId);

		const completedCourseCodes = new Set(
			(profile.completedCourses ?? []).map((c) => c.courseCode)
		);

		roadmapValidation.validateTopologicalOrder(nodes, courseUnits, completedCourseCodes);

		previewStore.storePendingPreview(userId, {
			nodes,
			personalisationLevel,
			triggerReason,
			studentProfileId,
		});

		notifyPreviewReady(userId);
	} catch (err) {
		await roadmapService.upsertFailedWithProfile(userId, studentProfileId, err.message, personalisationLevel);
		notifyGenerationFailed(userId);
	} finally {
		activeGenerations.delete(userId.toString());
	}
}

async function triggerGeneration(userId, studentProfileId, triggerReason) {
	const userKey = userId.toString();
	if (activeGenerations.has(userKey)) {
		const err = new Error('CONFLICT');
		err.code = 'CONFLICT';
		err.status = 409;
		throw err;
	}

	activeGenerations.add(userKey);

	runGenerationLifecycle(userId, studentProfileId, triggerReason).catch((unexpectedErr) => {
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
		notifyGenerationFailed(userId);
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
