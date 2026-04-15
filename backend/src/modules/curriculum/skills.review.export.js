const fs = require('fs');
const path = require('path');
const { CourseUnit } = require('./courseUnit.model');

async function exportSkillsReview({ outputPath, programId } = {}, deps = {}) {
	const CourseUnitModel = deps.CourseUnitModel || CourseUnit;
	const now = new Date();
	const destination =
		outputPath || path.resolve(__dirname, `../../../logs/skills-review-${now.toISOString().replace(/[:.]/g, '-')}.json`);

	const filter = { 'enrichmentSource.scrapeType': 'ai-inferred' };
	if (programId) filter.programId = programId;

	const rows = await CourseUnitModel.find(filter)
		.select({ code: 1, programId: 1, name: 1, skills: 1, careerTracks: 1, _id: 0 })
		.lean();

	const payload = {
		generatedAt: now.toISOString(),
		recordCount: rows.length,
		items: rows.map((item) => ({
			programId: item.programId,
			code: item.code,
			name: item.name,
			skills: item.skills || [],
			careerTracks: item.careerTracks || [],
			validatedBy: null,
			validationNote: null,
		})),
	};

	fs.mkdirSync(path.dirname(destination), { recursive: true });
	fs.writeFileSync(destination, JSON.stringify(payload, null, 2), 'utf8');

	return { outputPath: destination, recordCount: rows.length };
}

module.exports = {
	exportSkillsReview,
};
