import { parseAllowedUserIdsInput } from '../ShareControls';

describe('ShareControls logic', () => {
	test('normalizes users-only allowlist input', () => {
		expect(parseAllowedUserIdsInput(' userA, userB ,userA,, ')).toEqual(['userA', 'userB']);
	});

	test('returns empty list for blank input', () => {
		expect(parseAllowedUserIdsInput('   ')).toEqual([]);
	});

	test('keeps stable ordering after dedupe', () => {
		expect(parseAllowedUserIdsInput('u2,u1,u2,u3')).toEqual(['u2', 'u1', 'u3']);
	});
});
