const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function normalizeOptionalValue(value) {
	if (value == null) {
		return null;
	}
	const normalized = String(value).trim();
	return normalized.length === 0 ? null : normalized;
}

function validateDropdownValue(value, options) {
	const normalized = normalizeOptionalValue(value);
	if (normalized == null) {
		return { valid: true };
	}

	if (!Array.isArray(options) || !options.includes(normalized)) {
		return {
			valid: false,
			reason: 'Value must be selected from predefined options',
		};
	}

	return { valid: true };
}

function validateDateValue(value) {
	const normalized = normalizeOptionalValue(value);
	if (normalized == null) {
		return { valid: true };
	}

	if (!DATE_ONLY_REGEX.test(normalized)) {
		return {
			valid: false,
			reason: 'Value must be a valid date in YYYY-MM-DD format',
		};
	}

	const [year, month, day] = normalized.split('-').map((part) => Number(part));
	const date = new Date(Date.UTC(year, month - 1, day));
	const isValidDate =
		date.getUTCFullYear() === year &&
		date.getUTCMonth() === month - 1 &&
		date.getUTCDate() === day;

	if (!isValidDate) {
		return {
			valid: false,
			reason: 'Value must be a valid date in YYYY-MM-DD format',
		};
	}

	return { valid: true };
}

module.exports = {
	normalizeOptionalValue,
	validateDateValue,
	validateDropdownValue,
};
