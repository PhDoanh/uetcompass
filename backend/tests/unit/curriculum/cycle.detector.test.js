const { detectCyclesByProgram } = require('../../../src/modules/curriculum/cycle.detector');

describe('detectCyclesByProgram', () => {
	test('returns empty array for a clean DAG', () => {
		const units = [
			{ code: 'A', programId: 'P1', prerequisites: [] },
			{ code: 'B', programId: 'P1', prerequisites: ['A'] },
			{ code: 'C', programId: 'P1', prerequisites: ['B'] },
		];

		expect(detectCyclesByProgram(units)).toEqual([]);
	});

	test('detects a direct cycle A -> B -> A', () => {
		const units = [
			{ code: 'A', programId: 'P1', prerequisites: ['B'] },
			{ code: 'B', programId: 'P1', prerequisites: ['A'] },
		];

		const cycles = detectCyclesByProgram(units);
		expect(cycles.length).toBeGreaterThan(0);
		expect(cycles[0].programId).toBe('P1');
	});

	test('does not report unknown prerequisite as a cycle', () => {
		const units = [
			{ code: 'A', programId: 'P1', prerequisites: ['X'] },
			{ code: 'B', programId: 'P1', prerequisites: ['A'] },
		];

		expect(detectCyclesByProgram(units)).toEqual([]);
	});
});
