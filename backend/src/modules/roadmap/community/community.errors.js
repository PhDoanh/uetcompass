'use strict';

class CommunityError extends Error {
	constructor(status, code, message, details) {
		super(message);
		this.name = 'CommunityError';
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
	if (err instanceof CommunityError) {
		return {
			status: err.status,
			body: errorEnvelope(err.code, err.message, err.details),
		};
	}

	if (err && err.code === 11000) {
		return {
			status: 409,
			body: errorEnvelope('CONFLICT', 'Resource already exists.'),
		};
	}

	return {
		status: 500,
		body: errorEnvelope('INTERNAL_ERROR', err?.message || 'Unexpected error.'),
	};
}

module.exports = {
	CommunityError,
	errorEnvelope,
	toHttpError,
};
