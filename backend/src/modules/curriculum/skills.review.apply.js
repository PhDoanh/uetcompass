const fs = require('fs');
const { CourseUnit } = require('./courseUnit.model');

function validateReviewPayload(payload) {
	if (!payload || !Array.isArray(payload.items)) {
		throw new Error('Review file must contain an items array');
	}

	for (const item of payload.items) {
		if (!item.programId || !item.code) {
			throw new Error('Each review item must include programId and code');
		}
		if (!Array.isArray(item.skills) || item.skills.some((skill) => typeof skill !== 'string')) {
			throw new Error(`skills must be an array of strings for ${item.programId}:${item.code}`);
		}
	}
}

async function applySkillsReview({ filePath } = {}, deps = {}) {
	if (!filePath) throw new Error('filePath is required');

	const CourseUnitModel = deps.CourseUnitModel || CourseUnit;
	const raw = fs.readFileSync(filePath, 'utf8');
	const payload = JSON.parse(raw);
	validateReviewPayload(payload);

	let applied = 0;
	let conflicts = 0;

	for (const item of payload.items) {
		const res = await CourseUnitModel.updateOne(
			{
				code: item.code,
				programId: item.programId,
				'enrichmentSource.scrapeType': 'ai-inferred',
			},
			{
				$set: {
					skills: item.skills,
					enrichmentSource: {
						scrapeType: 'human-validated',
						enrichedAt: new Date(),
						validatedAt: new Date(),
						validatedBy: item.validatedBy || 'manual-review',
						validationNote: item.validationNote || null,
					},
				},
			}
		);

		if (res.modifiedCount > 0) applied += 1;
		else conflicts += 1;
	}

	return {
		total: payload.items.length,
		applied,
		conflicts,
	};
}

module.exports = {
	validateReviewPayload,
	applySkillsReview,
};
