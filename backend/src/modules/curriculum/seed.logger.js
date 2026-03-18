const fs = require('fs');
const path = require('path');

const LOG_PATH = path.resolve(__dirname, '../../../logs/seed-ctdt.log');

function writeLine(line) {
	const dir = path.dirname(LOG_PATH);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
	fs.appendFileSync(LOG_PATH, `${line}\n`, 'utf8');
}

function logEvent(level, event, payload = {}) {
	const entry = {
		timestamp: new Date().toISOString(),
		level,
		event,
		...payload,
	};
	const line = JSON.stringify(entry);

	if (level === 'error') {
		console.error(line);
	} else if (level === 'warn') {
		console.warn(line);
	} else {
		console.log(line);
	}

	try {
		writeLine(line);
	} catch (error) {
		console.error(JSON.stringify({
			timestamp: new Date().toISOString(),
			level: 'error',
			event: 'LOG_FILE_WRITE_FAILED',
			reason: error.message,
		}));
	}

	return entry;
}

module.exports = {
	LOG_PATH,
	logEvent,
};
