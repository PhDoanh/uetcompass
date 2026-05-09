'use strict';

const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { evaluateOffTemplateSkills } = require('./roadmap.gemini.service');
const { notifyUser, notifyGenerationFailed } = require('./roadmap.sse');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { CourseUnit } = require('../curriculum/courseUnit.model');

const {
	toKebabCase,
	uniqueNodeId,
	sortCourseUnitsTopologically,
	buildCandidateSkills,
	buildNodesTopologically,
} = require('./generation.helpers');
const { ROADMAP_TEMPLATES } = require('./generation.templates');

const activeGenerations = new Set();

// ---------------------------------------------------------------------------
// Core lifecycle
// ---------------------------------------------------------------------------

async function runGenerationLifecycle(userId, triggerReason, sseToken = '') {
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

		const courseUnits = await CourseUnit.find({ major: profile.major ?? '' }).lean();

		let nodes;

		const availableCourseUnits = courseUnits.filter(
			(cu) => !completedCourseCodes.has(cu.code)
		);
		const candidateSkills = buildCandidateSkills(availableCourseUnits);
		const candidateSkillsMap = new Map(candidateSkills.map((c) => [c.skillName, c]));

		// Check if a pre-built template matches the roadmapName
		const templateNodes = ROADMAP_TEMPLATES.get(roadmapName.toLowerCase());
		if (templateNodes) {
			const seenIds = new Set();

			// Enrich template nodes with relatedCourses from course skills
			const enriched = templateNodes.map((n) => {
				// Find candidate by matching kebab-case nodeId to kebab-case skillName
				const candidate = candidateSkills.find((c) => toKebabCase(c.skillName) === n.nodeId);
				return {
					...n,
					nodeName: n.nodeName || n.skillName, // Fallback for old templates
					nodeType: n.nodeType === 'topic' ? 'milestone' : (n.nodeType === 'subtopic' ? 'skill' : n.nodeType),
					skillId: n.nodeType === 'subtopic' ? n.nodeId : null,
					relatedCourses: candidate?.relatedCourses ?? [],
				};
			});

			// Build a lookup: topic nodeId -> enriched topic node (for attaching subtopics)
			const topicNodeIds = new Map();
			for (const n of enriched) {
				if (n.nodeType === 'milestone' || n.nodeType === 'topic') topicNodeIds.set(n.nodeId, n);
			}

			if (personalisationLevel === 'full') {
				// Identify course skills NOT already in the template (compare by nodeId)
				const templateNodeIds = new Set(templateNodes.map((n) => n.nodeId));
				const offTemplateSkills = candidateSkills.filter((c) => !templateNodeIds.has(toKebabCase(c.skillName)));

				// AI evaluates relevance of off-template skills to the career goal
				notifyUser(userId, 'ai_evaluation_started', { roadmapName });
				const approvedExtras = [] //await evaluateOffTemplateSkills(offTemplateSkills, profile);

				// Off-template nodes are always subtopic, attached to the nearest template topic
				// that shares a relatedCourse. Exclude if no parent topic found.
				const extraNodes = [];
				for (const skillName of approvedExtras) {
					const candidate = candidateSkillsMap.get(skillName);
					if (!candidate) continue;

					// Find the template topic node sharing the MOST relatedCourses
					const courseCodes = new Set(candidate.relatedCourses.map((rc) => rc.courseCode));
					let parentNode = null;
					let bestOverlap = 0;
					for (const tpl of enriched) {
						if (tpl.nodeType !== 'milestone' && tpl.nodeType !== 'topic') continue;
						const overlap = tpl.relatedCourses.filter((rc) => courseCodes.has(rc.courseCode)).length;
						if (overlap > bestOverlap) {
							bestOverlap = overlap;
							parentNode = tpl;
						}
					}
					if (!parentNode) continue; // Spec: exclude if no parent topic

					extraNodes.push({
						nodeId: uniqueNodeId(skillName, seenIds),
						nodeType: 'skill',
						nodeName: skillName,
						skillId: toKebabCase(skillName),
						parentNodeId: parentNode.nodeId,
						relatedCourses: candidate.relatedCourses,
						description: '',
						resources: [],
					});
				}

				// Insert each subtopic right after its parent topic in the enriched list
				const result = [];
				const extrasByParent = new Map();
				for (const extra of extraNodes) {
					if (!extrasByParent.has(extra.parentNodeId)) extrasByParent.set(extra.parentNodeId, []);
					extrasByParent.get(extra.parentNodeId).push(extra);
				}
				for (const n of enriched) {
					result.push(n);
					const children = extrasByParent.get(n.nodeId);
					if (children) result.push(...children);
				}
				nodes = result;
			} else {
				nodes = enriched;
			}
		} else {
			throw new Error(`No roadmap template found for: ${roadmapName}`);
		}

		roadmapValidation.validateTopologicalOrder(nodes, courseUnits, completedCourseCodes);

		notifyUser(userId, 'roadmap_generation_ready', {
			type: 'roadmap_generation_ready',
			roadmapName,
			personalisationLevel,
			lowPersonalisationNotice:
				personalisationLevel === 'low'
					? 'Your roadmap was generated without career goal data. Update your profile for a personalised roadmap.'
					: null,
			preview: { nodes, visual: { edges: [] } },
		});
	} catch (err) {
		console.error('[generation] roadmap generation failed:', err);
		if (studentProfileId) {
			await roadmapService.upsertFailedWithProfile(
				userId,
				studentProfileId,
				err.message,
				personalisationLevel
			);
		} else {
			await roadmapService.upsertFailed(userId, err.message);
		}
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
