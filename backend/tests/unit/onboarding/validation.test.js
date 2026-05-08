const {
	validateDateValue,
	validateDropdownValue,
} = require('../../../src/modules/onboarding/onboarding.validation');

const ROLE_OPTIONS = ['Software Engineer', 'Backend Engineer', 'Frontend Engineer'];

describe('validateDropdownValue', () => {
	test('null input is valid', () => {
		expect(validateDropdownValue(null, ROLE_OPTIONS)).toEqual({ valid: true });
	});

	test('empty input is valid as omitted', () => {
		expect(validateDropdownValue('   ', ROLE_OPTIONS)).toEqual({ valid: true });
	});

	test('role option is valid', () => {
		expect(validateDropdownValue(ROLE_OPTIONS[0], ROLE_OPTIONS)).toEqual({ valid: true });
	});

	test('role outside options is invalid', () => {
		expect(validateDropdownValue('Data Scientist', ROLE_OPTIONS)).toEqual({
			valid: false,
			reason: 'Value must be selected from predefined options',
		});
	});

	test('valid graduation date is accepted', () => {
		expect(validateDateValue('2027-06-30')).toEqual({ valid: true });
	});

	test('malformed graduation date is invalid', () => {
		expect(validateDateValue('2027-06')).toEqual({
			valid: false,
			reason: 'Value must be a valid date in YYYY-MM-DD format',
		});
	});

	test('non-existent calendar date is invalid', () => {
		expect(validateDateValue('2027-02-30')).toEqual({
			valid: false,
			reason: 'Value must be a valid date in YYYY-MM-DD format',
		});
	});
});
