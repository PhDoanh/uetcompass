'use strict';

const { RoadmapError, ERROR_CODES } = require('./roadmap.errors');

function parsePositiveIntQuery(rawValue, fieldName) {
	if (rawValue == null || rawValue === '') {
		return undefined;
	}

	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isInteger(parsed) || parsed < 1) {
		throw new RoadmapError(400, ERROR_CODES.INVALID_PAYLOAD, `${fieldName} must be a positive integer.`);
	}

	return parsed;
}

module.exports = { parsePositiveIntQuery };
