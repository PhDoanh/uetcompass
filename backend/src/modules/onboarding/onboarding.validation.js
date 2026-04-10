const MIN_FREE_TEXT_LENGTH = 3;
const HAS_UNICODE_LETTER = /\p{L}/u;

function validateFreeText(value) {
	if (value == null) {
		return { valid: true };
	}

	const trimmed = String(value).trim();

	if (trimmed.length === 0) {
		return { valid: true };
	}

	if (trimmed.length < MIN_FREE_TEXT_LENGTH) {
		return {
			valid: false,
			reason: `Must be at least ${MIN_FREE_TEXT_LENGTH} characters`,
		};
	}

	if (!HAS_UNICODE_LETTER.test(trimmed)) {
		return {
			valid: false,
			reason: 'Must contain at least one letter',
		};
	}

	return { valid: true };
}

module.exports = {
	HAS_UNICODE_LETTER,
	MIN_FREE_TEXT_LENGTH,
	validateFreeText,
};
