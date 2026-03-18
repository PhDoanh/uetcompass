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

function resolveExitStatus({ failCount, cyclesDetected }) {
	if (cyclesDetected > 0) {
		return EXIT_STATUS.FAILED;
	}
	if (failCount > 0) {
		return EXIT_STATUS.PARTIAL_FAILURE;
	}
	return EXIT_STATUS.SUCCESS;
}

function getExitCode(status) {
	return EXIT_CODE_BY_STATUS[status] ?? 1;
}

module.exports = {
	EXIT_STATUS,
	resolveExitStatus,
	getExitCode,
};
