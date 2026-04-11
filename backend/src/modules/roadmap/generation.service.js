'use strict';

const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { evaluateOffTemplateSkills } = require('./roadmap.gemini.service');
const { notifyUser } = require('./roadmap.sse');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

const activeGenerations = new Set();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Converts a skill name string to a URL-safe kebab-case nodeId slug. */
function toKebabCase(str) {
	return str
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '');
}

/**
 * Topologically sorts course units using Kahn's BFS.
 * Prerequisites that are not present in the input array are ignored (treated as satisfied).
 */
function sortCourseUnitsTopologically(courseUnits) {
	const codeMap = new Map(courseUnits.map((cu) => [cu.code, cu]));
	const inDegree = new Map(courseUnits.map((cu) => [cu.code, 0]));
	const children = new Map(courseUnits.map((cu) => [cu.code, []]));

	for (const cu of courseUnits) {
		for (const prereq of cu.prerequisites ?? []) {
			if (codeMap.has(prereq)) {
				inDegree.set(cu.code, (inDegree.get(cu.code) ?? 0) + 1);
				children.get(prereq).push(cu.code);
			}
		}
	}

	const queue = courseUnits.filter((cu) => inDegree.get(cu.code) === 0).map((cu) => cu.code);
	const sorted = [];

	while (queue.length > 0) {
		const code = queue.shift();
		sorted.push(codeMap.get(code));
		for (const child of children.get(code) ?? []) {
			const deg = inDegree.get(child) - 1;
			inDegree.set(child, deg);
			if (deg === 0) queue.push(child);
		}
	}

	return sorted;
}

/**
 * Collects candidate skills from available (non-completed) course units.
 * Uses cu.skills[] if the field is populated; falls back to the course name.
 * Deduplicates skill names -- if the same skill name appears in multiple courses,
 * its relatedCourses list aggregates all contributing courses.
 *
 * @param {Array} availableCourseUnits
 * @returns {Array<{ skillName: string, relatedCourses: Array }>}
 */
function buildCandidateSkills(availableCourseUnits) {
	const skillCoursesMap = new Map(); // skillName -> relatedCourse[]

	for (const cu of availableCourseUnits) {
		const skills = cu.skills?.length > 0 ? cu.skills : [cu.name];
		for (const skill of skills) {
			if (!skillCoursesMap.has(skill)) skillCoursesMap.set(skill, []);
			skillCoursesMap
				.get(skill)
				.push({ courseCode: cu.code, courseName: cu.name, credits: cu.credits });
		}
	}

	return [...skillCoursesMap.entries()].map(([skillName, relatedCourses]) => ({
		skillName,
		relatedCourses,
	}));
}

/**
 * Builds an ordered RoadmapNode[] from AI-approved skills.
 * Nodes are placed in topological order of their related courses' prerequisites.
 * Each skill becomes one node (type: topic); duplicate skill names are deduplicated.
 *
 * @param {Array<{ skillName: string, reason: string }>} approvedSkills
 * @param {Map<string, { skillName, relatedCourses }>} candidateSkillsMap
 * @param {Array} allCourseUnits - Full DAG used for ordering
 * @returns {Array} RoadmapNode[]
 */
function buildNodesTopologically(approvedSkills, candidateSkillsMap, allCourseUnits) {
	// Map each courseCode to the first approved skill index that covers it
	const courseToApprovedIdx = new Map();
	for (let i = 0; i < approvedSkills.length; i++) {
		const candidate = candidateSkillsMap.get(approvedSkills[i].skillName);
		if (!candidate) continue;
		for (const rc of candidate.relatedCourses) {
			if (!courseToApprovedIdx.has(rc.courseCode)) {
				courseToApprovedIdx.set(rc.courseCode, i);
			}
		}
	}

	const sortedUnits = sortCourseUnitsTopologically(allCourseUnits);
	const addedSkills = new Set();
	const nodes = [];

	for (const cu of sortedUnits) {
		const idx = courseToApprovedIdx.get(cu.code);
		if (idx === undefined) continue;
		const { skillName, reason } = approvedSkills[idx];
		if (addedSkills.has(skillName)) continue;
		const candidate = candidateSkillsMap.get(skillName);
		nodes.push({
			nodeId: toKebabCase(skillName),
			nodeType: 'topic',
			skillName,
			parentNodeId: null,
			relatedCourses: candidate.relatedCourses,
			reason,
			resources: [],
		});
		addedSkills.add(skillName);
	}

	return nodes;
}

// ---------------------------------------------------------------------------
// Core lifecycle
// ---------------------------------------------------------------------------

async function runGenerationLifecycle(userId, triggerReason) {
	let personalisationLevel = 'low';
	let studentProfileId;
	try {
		const profile = await StudentProfile.findOne({ userId });
		if (!profile) {
			throw new Error(`StudentProfile not found for user: ${userId}`);
		}
		studentProfileId = profile._id;

		personalisationLevel =
			profile.careerGoal?.role || profile.careerGoal?.companyType ? 'full' : 'low';

		const roadmapName = profile.careerGoal?.role || `${profile.major} Curriculum`;

		const completedCourseCodes = new Set(
			(profile.completedCourses ?? []).map((c) => c.courseCode)
		);

		const courseUnits = await CourseUnit.find({ major: profile.major }).lean();

		let nodes;

		if (personalisationLevel === 'full') {
			const availableCourseUnits = courseUnits.filter(
				(cu) => !completedCourseCodes.has(cu.code)
			);
			const candidateSkills = buildCandidateSkills(availableCourseUnits);
			const candidateSkillsMap = new Map(candidateSkills.map((c) => [c.skillName, c]));

			const approvedSkills = await evaluateOffTemplateSkills(candidateSkills, profile);
			nodes = buildNodesTopologically(approvedSkills, candidateSkillsMap, courseUnits);
		} else {
			// Low personalisation: map all required courses to topic nodes in DAG order
			const sortedUnits = sortCourseUnitsTopologically(courseUnits);
			nodes = sortedUnits
				.filter((cu) => cu.type === 'required' && !completedCourseCodes.has(cu.code))
				.map((cu) => ({
					nodeId: toKebabCase(cu.name),
					nodeType: 'topic',
					skillName: cu.name,
					parentNodeId: null,
					relatedCourses: [
						{ courseCode: cu.code, courseName: cu.name, credits: cu.credits },
					],
					reason: `Core required course for the ${profile.major} programme.`,
					resources: [],
				}));
		}

		roadmapValidation.validateTopologicalOrder(nodes, courseUnits, completedCourseCodes);

		previewStore.storePendingPreview(userId, {
			nodes,
			roadmapName,
			personalisationLevel,
			triggerReason,
			studentProfileId,
		});

		notifyUser(userId, 'roadmap_preview_ready', {
			type: 'roadmap_preview_ready',
			roadmapName,
			personalisationLevel,
			lowPersonalisationNotice:
				personalisationLevel === 'low'
					? 'Your roadmap was generated without career goal data. Update your profile for a personalised roadmap.'
					: null,
			preview: { nodes },
		});
	} catch (err) {
		await roadmapService.upsertFailedWithProfile(
			userId,
			studentProfileId,
			err.message,
			personalisationLevel
		);
		notifyUser(userId, 'roadmap_generation_failed', {
			type: 'roadmap_generation_failed',
			retryable: true,
			retryEndpoint: 'POST /api/roadmaps/primary/regenerate',
			message: 'Roadmap generation failed. You can retry from the Skill Tree.',
		});
	} finally {
		activeGenerations.delete(userId.toString());
	}
}

async function triggerGeneration(userId, triggerReason) {
	const userKey = userId.toString();
	if (activeGenerations.has(userKey)) {
		const err = new Error('CONFLICT');
		err.code = 'CONFLICT';
		err.status = 409;
		throw err;
	}

	activeGenerations.add(userKey);

	runGenerationLifecycle(userId, triggerReason).catch((unexpectedErr) => {
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
				'Worker restart -- generation preview lost'
			);
		} else {
			await roadmapService.upsertFailed(userId, 'Worker restart -- generation preview lost');
		}
		previewStore.clearPendingPreview(userId);
	}
}

module.exports = {
	triggerGeneration,
	isGenerating,
	__handleSigterm,
};
