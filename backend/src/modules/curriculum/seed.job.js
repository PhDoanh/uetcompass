require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');
const { cronSchedule, DEFAULT_CRON_SCHEDULE } = require('./curriculum.config');
const { runSeedPipeline } = require('./seed.pipeline');
const { getExitCode } = require('./seed.status');
const { log } = require('./seed.logger');

let scheduledTask;

async function ensureDbConnection() {
	if (mongoose.connection.readyState === 1) return;
	if (!process.env.MONGODB_URI) {
		throw new Error('Missing MONGODB_URI');
	}
	await mongoose.connect(process.env.MONGODB_URI);
}

function getSchedule() {
	return process.env.SEED_CRON_SCHEDULE || cronSchedule || DEFAULT_CRON_SCHEDULE;
}

function registerCronJob() {
	if (scheduledTask) {
		return scheduledTask;
	}

	const schedule = getSchedule();
	if (!cron.validate(schedule)) {
		throw new Error(`Invalid SEED_CRON_SCHEDULE: ${schedule}`);
	}

	scheduledTask = cron.schedule(schedule, async () => {
		try {
			await runSeedPipeline({ triggeredBy: 'cron' });
		} catch (error) {
			log.error({ event: 'JOB_COMPLETE', exitStatus: 'FAILED', reason: error.message });
		}
	});

	return scheduledTask;
}

async function triggerManually() {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Manual trigger is not available in production');
	}
	const result = await runSeedPipeline({ triggeredBy: 'manual' });
	return { ...result, exitCode: getExitCode(result.exitStatus) };
}

async function runManualCli() {
	try {
		await ensureDbConnection();
		const result = await triggerManually();
		process.exit(result.exitCode);
	} catch (error) {
		console.error(error.message);
		process.exit(2);
	}
}

module.exports = {
	getSchedule,
	registerCronJob,
	triggerManually,
	runManualCli,
};
