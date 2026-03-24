'use strict';

const WHITE = 0, GREY = 1, BLACK = 2;

/** @param {Array} courseUnits - Full CourseUnit DAG array */
function detectCycles(courseUnits) {
	const adjMap = new Map();
	for (const cu of courseUnits) {
		adjMap.set(cu.code, cu.prerequisites ?? []);
	}

	const colour = new Map();
	for (const code of adjMap.keys()) colour.set(code, WHITE);

	function dfs(node) {
		colour.set(node, GREY);
		for (const prereq of adjMap.get(node) ?? []) {
			const c = colour.get(prereq);
			if (c === GREY) {
				const err = new Error(`Cycle detected: ${node} -> ${prereq}`);
				err.code = 'CYCLE_DETECTED';
				throw err;
			}
			if (c === WHITE) dfs(prereq);
		}
		colour.set(node, BLACK);
	}

	for (const [code, c] of colour) {
		if (c === WHITE) dfs(code);
	}
}

/**
 * @param {Array} nodes - Ordered RoadmapNode[] from AI
 * @param {Array} courseUnits - Full CourseUnit DAG for the major
 * @param {Set<string>} [completedCourseCodes] - Courses already completed (skipped in ordering check)
 */
function validateTopologicalOrder(nodes, courseUnits, completedCourseCodes = new Set()) {
	const prereqMap = new Map();
	for (const cu of courseUnits) {
		prereqMap.set(cu.code, cu.prerequisites ?? []);
	}

	detectCycles(courseUnits);

	const positionMap = new Map();
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const prerequisites = prereqMap.get(node.courseCode) ?? [];

		for (const prereq of prerequisites) {
			if (completedCourseCodes.has(prereq)) continue;

			if (positionMap.has(prereq)) {
				if (positionMap.get(prereq) >= i) {
					const err = new Error(
						`Ordering violation: ${node.courseCode} appears before prerequisite ${prereq}`
					);
					err.code = 'PREREQUISITE_VIOLATION';
					throw err;
				}
				continue;
			}

			const err = new Error(
				`Prerequisite ${prereq} for ${node.courseCode} is missing from the roadmap and not in completed courses`
			);
			err.code = 'PREREQUISITE_VIOLATION';
			throw err;
		}

		positionMap.set(node.courseCode, i);
	}
}

module.exports = {
	validateTopologicalOrder,
	detectCycles,
};
