'use strict';

const roadmapValidation = require('./roadmapValidation.service');
const previewStore = require('./roadmap.preview.store');
const roadmapService = require('./roadmap.service');
const { evaluateOffTemplateSkills } = require('./roadmap.gemini.service');
const { notifyUser } = require('./roadmap.sse');
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
				const candidate = candidateSkillsMap.get(n.skillName);
				return {
					...n,
					nodeId: uniqueNodeId(n.skillName, seenIds),
					relatedCourses: candidate?.relatedCourses ?? [],
				};
			});

			// Build a lookup: topic nodeId -> enriched topic node (for attaching subtopics)
			const topicNodeIds = new Map();
			for (const n of enriched) {
				if (n.nodeType === 'topic') topicNodeIds.set(n.nodeId, n);
			}

			if (personalisationLevel === 'full') {
				// Identify course skills NOT already in the template (compare by nodeId)
				const templateNodeIds = new Set(templateNodes.map((n) => n.nodeId));
				const offTemplateSkills = candidateSkills.filter((c) => !templateNodeIds.has(toKebabCase(c.skillName)));

				// AI evaluates relevance of off-template skills to the career goal
				const approvedExtras = await evaluateOffTemplateSkills(offTemplateSkills, profile);

				// Off-template nodes are always subtopic, attached to the nearest template topic
				// that shares a relatedCourse. Exclude if no parent topic found.
				const extraNodes = [];
				for (const { skillName, reason } of approvedExtras) {
					const candidate = candidateSkillsMap.get(skillName);
					if (!candidate) continue;

					// Find a template topic node sharing at least one relatedCourse
					const courseCodes = new Set(candidate.relatedCourses.map((rc) => rc.courseCode));
					let parentNode = null;
					for (const tpl of enriched) {
						if (tpl.nodeType !== 'topic') continue;
						if (tpl.relatedCourses.some((rc) => courseCodes.has(rc.courseCode))) {
							parentNode = tpl;
							break;
						}
					}
					if (!parentNode) continue; // Spec: exclude if no parent topic

					extraNodes.push({
						nodeId: uniqueNodeId(skillName, seenIds),
						nodeType: 'subtopic',
						skillName,
						parentNodeId: parentNode.nodeId,
						relatedCourses: candidate.relatedCourses,
						reason,
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
		} else if (personalisationLevel === 'full') {
			const approvedSkills = await evaluateOffTemplateSkills(candidateSkills, profile);
			nodes = buildNodesTopologically(approvedSkills, candidateSkillsMap, courseUnits);
		} else {
			// Low personalisation: map all required courses to topic nodes in DAG order
			const sortedUnits = sortCourseUnitsTopologically(courseUnits);
			const seenIds = new Set();
			nodes = sortedUnits
				.filter((cu) => cu.type === 'required' && !completedCourseCodes.has(cu.code))
				.map((cu) => ({
					nodeId: uniqueNodeId(cu.name, seenIds),
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
