function detectCycles(courseUnits) {
	const adjacency = new Map();
	for (const unit of courseUnits) {
		adjacency.set(unit.code, Array.isArray(unit.prerequisites) ? unit.prerequisites : []);
	}

	const visited = new Set();
	const inStack = new Set();
	const cycles = [];

	function dfs(code) {
		visited.add(code);
		inStack.add(code);

		for (const prerequisite of adjacency.get(code) || []) {
			if (!adjacency.has(prerequisite)) {
				continue;
			}
			if (!visited.has(prerequisite)) {
				dfs(prerequisite);
			} else if (inStack.has(prerequisite)) {
				cycles.push({ from: code, to: prerequisite });
			}
		}

		inStack.delete(code);
	}

	for (const code of adjacency.keys()) {
		if (!visited.has(code)) {
			dfs(code);
		}
	}

	return cycles;
}

module.exports = {
	detectCycles,
};
