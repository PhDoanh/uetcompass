const EXIT_STATUS = {
	SUCCESS: 'SUCCESS',
	PARTIAL_FAILURE: 'PARTIAL_FAILURE',
	FAILED: 'FAILED',
};

const EXIT_CODE_BY_STATUS = {
	[EXIT_STATUS.SUCCESS]: 0,
	[EXIT_STATUS.PARTIAL_FAILURE]: 1,
	[EXIT_STATUS.FAILED]: 2,
};

function resolveExitStatus({ failCount = 0, cyclesDetected = 0 }) {
	if (cyclesDetected > 0) {
		return EXIT_STATUS.FAILED;
	}
	if (failCount > 0) {
		return EXIT_STATUS.PARTIAL_FAILURE;
	}
	return EXIT_STATUS.SUCCESS;
}

function resolveFinalStatus({ hasFailures = false, cyclesDetected = 0 }) {
	if (cyclesDetected > 0) return EXIT_STATUS.FAILED;
	if (hasFailures) return EXIT_STATUS.PARTIAL_FAILURE;
	return EXIT_STATUS.SUCCESS;
}

function createInitialSummary(totalPrograms = 0) {
	return {
		totalPrograms,
		processedPrograms: 0,
		skippedPrograms: 0,
		successCount: 0,
		failCount: 0,
		cyclesDetected: 0,
		coursesUpserted: 0,
		outcomesUpserted: 0,
		exitStatus: EXIT_STATUS.SUCCESS,
	};
}

function getExitCode(status) {
	return EXIT_CODE_BY_STATUS[status] ?? 1;
}

module.exports = {
	EXIT_STATUS,
	resolveExitStatus,
	resolveFinalStatus,
	createInitialSummary,
	getExitCode,
};
