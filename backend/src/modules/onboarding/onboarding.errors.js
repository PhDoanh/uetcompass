const ERROR_CODES = {
	INVALID_INPUT: 'INVALID_INPUT',
	UNAUTHORIZED: 'UNAUTHORIZED',
	ONBOARDING_ALREADY_COMPLETED: 'ONBOARDING_ALREADY_COMPLETED',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
};

class OnboardingError extends Error {
	constructor(status, code, message, details) {
		super(message);
		this.name = 'OnboardingError';
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
	if (err instanceof OnboardingError) {
		return {
			status: err.status,
			body: errorEnvelope(err.code, err.message, err.details),
		};
	}

	if (err && err.name === 'ValidationError') {
		return {
			status: 400,
			body: errorEnvelope(ERROR_CODES.INVALID_INPUT, err.message),
		};
	}

	return {
		status: 500,
		body: errorEnvelope(ERROR_CODES.INTERNAL_ERROR, 'Unexpected server error'),
	};
}

module.exports = {
	ERROR_CODES,
	OnboardingError,
	errorEnvelope,
	toHttpError,
};
