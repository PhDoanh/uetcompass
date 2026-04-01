require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');
const { cronSchedule } = require('./curriculum.config');
const { runSeedPipeline } = require('./seed.pipeline');
const { getExitCode } = require('./seed.status');
const { logEvent } = require('./seed.logger');

let scheduledTask;

async function ensureDbConnection() {
	if (mongoose.connection.readyState === 1) return;
	if (!process.env.MONGODB_URI) {
		throw new Error('Missing MONGODB_URI');
	}
	await mongoose.connect(process.env.MONGODB_URI);
}

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
		await ensureDbConnection();
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
