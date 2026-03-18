const cron = require('node-cron');
const { cronSchedule } = require('./curriculum.config');
const { runSeedPipeline } = require('./seed.pipeline');
const { getExitCode } = require('./seed.status');
const { logEvent } = require('./seed.logger');

let scheduledTask;

function registerCronJob() {
	if (scheduledTask) {
		return scheduledTask;
	}

	scheduledTask = cron.schedule(cronSchedule, async () => {
		try {
			await runSeedPipeline();
		} catch (error) {
			logEvent('error', 'JOB_CRASHED', { reason: error.message });
		}
	});

	return scheduledTask;
}

async function triggerManually() {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Manual trigger is not available in production');
	}
	return runSeedPipeline();
}

async function runManualCli() {
	try {
		const result = await triggerManually();
		process.exit(getExitCode(result.exitStatus));
	} catch (error) {
		console.error(error.message);
		process.exit(1);
	}
}

module.exports = {
	registerCronJob,
	triggerManually,
	runManualCli,
};
