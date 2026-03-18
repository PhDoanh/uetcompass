const { validateFreeText } = require('../../../src/modules/onboarding/onboarding.validation');

describe('validateFreeText', () => {
	test('null input is valid', () => {
		expect(validateFreeText(null)).toEqual({ valid: true });
	});

	test('whitespace-only is valid as omitted', () => {
		expect(validateFreeText('   ')).toEqual({ valid: true });
	});

	test('too short value is invalid', () => {
		expect(validateFreeText('ok').valid).toBe(false);
	});

	test('special-only value is invalid', () => {
		expect(validateFreeText('!!!').valid).toBe(false);
	});

	test('unicode letter value is valid', () => {
		expect(validateFreeText('Kỹ sư backend')).toEqual({ valid: true });
	});
});
