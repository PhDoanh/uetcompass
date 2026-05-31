'use strict';

/** Converts a skill name string to a URL-safe kebab-case nodeId slug. */
function toKebabCase(str) {
	const slug = str
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');
	return slug || 'node';
}

/**
 * Wraps toKebabCase with collision detection.
 * Appends -2, -3, ... on duplicate slugs within the same generation run.
 */
function uniqueNodeId(str, seenIds) {
	let base = toKebabCase(str);
	let id = base;
	let counter = 2;
	while (seenIds.has(id)) {
		id = `${base}-${counter++}`;
	}
	seenIds.add(id);
	return id;
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
 * Each skill is placed at the latest topological position of any of its
 * related courses, ensuring all prerequisites are satisfied before the node.
 * Each skill becomes one node (type: topic); duplicate skill names are deduplicated.
 *
 * @param {Array<{ skillName: string, reason: string }>} approvedSkills
 * @param {Map<string, { skillName, relatedCourses }>} candidateSkillsMap
 * @param {Array} allCourseUnits - Full DAG used for ordering
 * @returns {Array} RoadmapNode[]
 */
function buildNodesTopologically(approvedSkills, candidateSkillsMap, allCourseUnits) {
	const sortedUnits = sortCourseUnitsTopologically(allCourseUnits);

	// Build courseCode -> topological position index
	const coursePos = new Map();
	for (let i = 0; i < sortedUnits.length; i++) {
		coursePos.set(sortedUnits[i].code, i);
	}

	// Collect approved skills with their rank = max topological position of related courses
	const skillEntries = [];

	for (const { skillName, reason } of approvedSkills) {
		const candidate = candidateSkillsMap.get(skillName);
		if (!candidate) continue;
		const rank = Math.max(...candidate.relatedCourses.map((rc) => coursePos.get(rc.courseCode) ?? 0));
		skillEntries.push({ skillName, reason, candidate, rank });
	}

	// Sort by rank (latest prerequisite position) to ensure valid topological placement
	skillEntries.sort((a, b) => a.rank - b.rank);

	const seenIds = new Set();
	const nodes = skillEntries.map(({ skillName, reason, candidate }) => ({
		nodeId: uniqueNodeId(skillName, seenIds),
		nodeType: 'topic',
		skillName,
		parentNodeId: null,
		relatedCourses: candidate.relatedCourses,
		reason,
		resources: [],
	}));

	return nodes;
}

module.exports = {
	toKebabCase,
	uniqueNodeId,
	sortCourseUnitsTopologically,
	buildCandidateSkills,
	buildNodesTopologically,
};
