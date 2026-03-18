const { detectCycles } = require('../../../src/modules/curriculum/cycle.detector');

describe('detectCycles', () => {
	test('returns empty array for a clean DAG', () => {
		const units = [
			{ code: 'A', prerequisites: [] },
			{ code: 'B', prerequisites: ['A'] },
			{ code: 'C', prerequisites: ['B'] },
		];

		expect(detectCycles(units)).toEqual([]);
	});

	test('detects a direct cycle A -> B -> A', () => {
		const units = [
			{ code: 'A', prerequisites: ['B'] },
			{ code: 'B', prerequisites: ['A'] },
		];

		const cycles = detectCycles(units);
		expect(cycles.length).toBeGreaterThan(0);
	});

	test('does not report unknown prerequisite as a cycle', () => {
		const units = [
			{ code: 'A', prerequisites: ['X'] },
			{ code: 'B', prerequisites: ['A'] },
		];

		expect(detectCycles(units)).toEqual([]);
	});
});
