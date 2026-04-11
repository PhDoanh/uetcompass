require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const { exportSkillsReview } = require('./skills.review.export');
const { applySkillsReview } = require('./skills.review.apply');

async function ensureDbConnection() {
	if (mongoose.connection.readyState === 1) return;
	if (!process.env.MONGODB_URI) throw new Error('Missing MONGODB_URI');
	await mongoose.connect(process.env.MONGODB_URI);
}

function parseArgs(argv) {
	const args = {};
	for (let i = 0; i < argv.length; i += 1) {
		const token = argv[i];
		if (token === '--file') args.file = argv[i + 1];
		if (token === '--programId') args.programId = argv[i + 1];
	}
	return args;
}

async function runExportCli() {
	await ensureDbConnection();
	const args = parseArgs(process.argv.slice(2));
	const result = await exportSkillsReview({ outputPath: args.file, programId: args.programId });
	console.log(JSON.stringify({ event: 'SKILLS_REVIEW_EXPORTED', ...result }));
	await mongoose.disconnect();
}

async function runApplyCli() {
	await ensureDbConnection();
	const args = parseArgs(process.argv.slice(2));
	const filePath = args.file ? path.resolve(args.file) : null;
	const result = await applySkillsReview({ filePath });
	console.log(JSON.stringify({ event: 'SKILLS_REVIEW_APPLIED', ...result }));
	await mongoose.disconnect();
}

module.exports = {
	runExportCli,
	runApplyCli,
	parseArgs,
};
