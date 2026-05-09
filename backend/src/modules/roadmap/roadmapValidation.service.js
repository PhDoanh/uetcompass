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
 * @param {Array} nodes - Ordered RoadmapNode[] with relatedCourses[]
 * @param {Array} courseUnits - Full CourseUnit DAG for the major
 * @param {Set<string>} [completedCourseCodes] - Courses already completed (skipped in ordering check)
 */
function validateTopologicalOrder(nodes, courseUnits, completedCourseCodes = new Set()) {
	const prereqMap = new Map();
	for (const cu of courseUnits) {
		prereqMap.set(cu.code, cu.prerequisites ?? []);
	}

	detectCycles(courseUnits);

	// Map every courseCode that appears in any node's relatedCourses to that node's position
	const courseToNodePos = new Map();
	nodes.forEach((node, i) => {
		for (const rc of node.relatedCourses ?? []) {
			courseToNodePos.set(rc.courseCode, i);
		}
	});

	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		for (const rc of node.relatedCourses ?? []) {
			const prerequisites = prereqMap.get(rc.courseCode) ?? [];
			for (const prereq of prerequisites) {
				if (completedCourseCodes.has(prereq)) continue;

				if (courseToNodePos.get(prereq) >= i) {
					const err = new Error(
						`Ordering violation: skill "${node.nodeName}" (via ${rc.courseCode}) appears before its prerequisite ${prereq}`
					);
					err.code = 'PREREQUISITE_VIOLATION';
					throw err;
				}
			}
		}
	}
}

module.exports = {
	validateTopologicalOrder,
	detectCycles,
};
