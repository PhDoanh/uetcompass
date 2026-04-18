'use strict';

const ERROR_CODES = {
	ROADMAP_NOT_FOUND: 'ROADMAP_NOT_FOUND',
	CONFLICT: 'CONFLICT',
	ALL_COMPLETED: 'ALL_COMPLETED',
	PREREQUISITE_VIOLATION: 'PREREQUISITE_VIOLATION',
	INVALID_PAYLOAD: 'INVALID_PAYLOAD',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	PUBLICATION_ERROR: 'PUBLICATION_ERROR',
	INVALID_TRANSITION: 'INVALID_TRANSITION',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
};

const ERROR_HTTP_MAP = {
	[ERROR_CODES.ROADMAP_NOT_FOUND]: 404,
	[ERROR_CODES.CONFLICT]: 409,
	[ERROR_CODES.ALL_COMPLETED]: 422,
	[ERROR_CODES.PREREQUISITE_VIOLATION]: 422,
	[ERROR_CODES.INVALID_PAYLOAD]: 400,
	[ERROR_CODES.INVALID_TRANSITION]: 422,
};

class RoadmapError extends Error {
	constructor(status, code, message, details) {
		super(message);
		this.name = 'RoadmapError';
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

function errorEnvelope(code, message, details) {
	return {
		error: {
			code,
			message,
			...(details ? { details } : {}),
		},
	};
}

function toHttpError(err) {
	if (err instanceof RoadmapError) {
		return {
			status: err.status,
			body: errorEnvelope(err.code, err.message, err.details),
		};
	}

	if (err && err.name === 'ValidationError') {
		return {
			status: 400,
			body: errorEnvelope(ERROR_CODES.INVALID_PAYLOAD, err.message),
		};
	}

	const status = ERROR_HTTP_MAP[err?.code] || err?.status || 500;
	const code = err?.code || ERROR_CODES.INTERNAL_ERROR;
	return {
		status,
		body: errorEnvelope(code, err?.message || 'Unexpected server error'),
	};
}

module.exports = {
	ERROR_CODES,
	ERROR_HTTP_MAP,
	RoadmapError,
	errorEnvelope,
	toHttpError,
};
