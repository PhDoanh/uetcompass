'use strict';

const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');
const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

const activeGenerations = new Set();

const roadmapNodeSchema = {
	type: SchemaType.ARRAY,
	items: {
		type: SchemaType.OBJECT,
		properties: {
			courseCode:          { type: SchemaType.STRING },
			courseName:          { type: SchemaType.STRING },
			credits:             { type: SchemaType.NUMBER },
			suggestedSemester:   { type: SchemaType.NUMBER },
			gainedSkills:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
			supportingSkills:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
			reason:              { type: SchemaType.STRING },
			careerRelevanceNote: { type: SchemaType.STRING },
		},
		required: [
			'courseCode',
			'courseName',
			'credits',
			'gainedSkills',
			'supportingSkills',
			'reason',
			'careerRelevanceNote',
		],
	},
};

function buildGeminiModel() {
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
	return genAI.getGenerativeModel({
		model: 'gemini-2.5-flash',
		generationConfig: {
			responseMimeType: 'application/json',
			responseSchema: roadmapNodeSchema,
		},
	});
}

function sendNotification(userId, eventName, payload) {
	try {
		const { notifyUser } = require('../onboarding/onboarding.sse');
		notifyUser(userId.toString(), eventName, payload);
	} catch {
		// SSE module unavailable (test env) — silently ignore
	}
}

function notifyPreviewReady(userId, { nodes, personalisationLevel }) {
	sendNotification(userId, 'roadmap_preview_ready', {
		type: 'roadmap_preview_ready',
		personalisationLevel,
		lowPersonalisationNotice:
			personalisationLevel === 'low'
				? 'Your roadmap was generated without career goal data. Update your profile for a personalised roadmap.'
				: null,
		preview: { nodes },
	});
}

function notifyGenerationFailed(userId) {
	sendNotification(userId, 'roadmap_generation_failed', {
		type: 'roadmap_generation_failed',
		retryable: true,
		retryEndpoint: 'POST /api/roadmap/retry',
		message: 'Roadmap generation failed. You can retry from the Skill Tree.',
	});
}

async function callGemini(profile, courseUnits, existingRoadmap = null) {
	const baseContext = existingRoadmap
		? `\nExisting accepted roadmap (use as base context — informs but does not constrain the new output):\n${JSON.stringify(existingRoadmap.nodes)}`
		: '';

	const prompt = `You are a personalised learning roadmap generator for UET-VNU students.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.careerGoal?.graduationTimeline ?? profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}
- Completed Course Codes: ${
	(profile.completedCourses ?? []).map((c) => c.courseCode).join(', ') || 'none'
}

Available CourseUnits (DAG with prerequisites):
${JSON.stringify(courseUnits)}
${baseContext}

Instructions:
1. Select only career-relevant courses: all required-type courses that are direct or transitive
   prerequisites of career-relevant courses, plus only the electives that best match the career goal.
2. Exclude courses listed in Completed Course Codes as actionable nodes.
   Treat completed courses as satisfied prerequisites when determining accessible nodes.
3. Return selected nodes in valid topological order: each node MUST appear after all its prerequisites.
4. If no career goal is provided, include all required-type courses in topological order.
5. For each node, populate gainedSkills (skills the course teaches), supportingSkills (skills needed
   in practice for the career goal that the course does NOT teach), reason, and careerRelevanceNote.
   Each skill string must be a single atomic concept (e.g. "Encapsulation", "Polymorphism", "SQL joins").
   Do NOT combine multiple concepts into one string (e.g. WRONG: "OOP principles (encapsulation, inheritance)").
   Skills MUST include relevant technologies, protocols, and important CS concepts the course covers
   (e.g. "HTTPS", "TCP", "UDP", "REST", "Git", "Docker", "Express.js", "Django", "MongoDB").
   Mix both theoretical concepts and practical technologies — do not list only abstract concepts.
6. supportingSkills must NOT repeat skills already listed in gainedSkills for the same node.
7. Do NOT include a resources field — the system will append an empty array after parsing.`;

	const result = await buildGeminiModel().generateContent(prompt);
	const nodes = JSON.parse(result.response.text());
	return nodes.map((node) => ({ ...node, resources: [] }));
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

		notifyPreviewReady(userId, { nodes, personalisationLevel });
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
