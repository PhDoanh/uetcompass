function detectCyclesByProgram(courseUnits) {
	const grouped = new Map();

	for (const unit of courseUnits || []) {
		if (!grouped.has(unit.programId)) grouped.set(unit.programId, []);
		grouped.get(unit.programId).push(unit);
	}

	const cycles = [];
	for (const [programId, units] of grouped.entries()) {
		const adjacency = new Map(units.map((unit) => [unit.code, Array.isArray(unit.prerequisites) ? unit.prerequisites : []]));
		const visited = new Set();
		const inStack = new Set();

		function dfs(code) {
			visited.add(code);
			inStack.add(code);

			for (const prerequisite of adjacency.get(code) || []) {
				if (!adjacency.has(prerequisite)) continue;
				if (!visited.has(prerequisite)) {
					dfs(prerequisite);
				} else if (inStack.has(prerequisite)) {
					cycles.push({ programId, from: code, to: prerequisite });
				}
			}

			inStack.delete(code);
		}

		for (const code of adjacency.keys()) {
			if (!visited.has(code)) dfs(code);
		}
	}

	return cycles;
}

module.exports = {
	detectCyclesByProgram,
};
