const {
	CALL2_RESPONSE_SCHEMA,
	buildCall2Prompt,
	callGeminiJSON,
	filterVocabularySkills,
	filterCareerTracks,
} = require('./gemini.service');

async function runProgramEnrichment({
	program,
	courseUnits,
	programOutcomes,
	careerTracks,
	skillVocabulary,
	CourseUnitModel,
	ProgramOutcomeModel,
	logger,
}) {
	const skillSet = new Set(skillVocabulary || []);
	const trackIdSet = new Set((careerTracks || []).map((item) => item.trackId));

	logger?.info?.({ event: 'ENRICHMENT_START', programId: program.programId });

	const prompt = buildCall2Prompt({
		program,
		courseUnits,
		programOutcomes,
		careerTracks,
		skillVocabulary,
	});

	const enriched = await callGeminiJSON({ prompt, schema: CALL2_RESPONSE_SCHEMA });

	const inputCourseUnits = Array.isArray(enriched?.courseUnits) ? enriched.courseUnits : [];
	const inputProgramOutcomes = Array.isArray(enriched?.programOutcomes) ? enriched.programOutcomes : [];

	const unitByCode = new Map(courseUnits.map((unit) => [unit.code, unit]));
	const unitOps = [];

	for (const item of inputCourseUnits) {
		const existing = unitByCode.get(item.code);
		if (!existing) continue;

		const { kept: keptSkills, dropped: droppedSkills } = filterVocabularySkills(item.skills || [], skillSet);
		const { kept: keptTracks } = filterCareerTracks(item.careerTracks || [], trackIdSet);

		if (droppedSkills.length > 0) {
			logger?.warn?.({
				event: 'SKILL_TAG_DROPPED',
				programId: existing.programId,
				code: existing.code,
				dropped: droppedSkills,
			});
		}

		if (existing?.enrichmentSource?.scrapeType === 'human-validated') {
			unitOps.push({
				updateOne: {
					filter: { code: existing.code, programId: existing.programId },
					update: {
						$set: {
							difficultyLevel: item.difficultyLevel ?? existing.difficultyLevel,
							careerTracks: keptTracks,
						},
					},
				},
			});
			continue;
		}

		unitOps.push({
			updateOne: {
				filter: { code: existing.code, programId: existing.programId },
				update: {
					$set: {
						difficultyLevel: item.difficultyLevel ?? null,
						careerTracks: keptTracks,
						skills: keptSkills,
						enrichmentSource: {
							scrapeType: 'ai-inferred',
							enrichedAt: new Date(),
							validatedAt: existing?.enrichmentSource?.validatedAt || null,
							validatedBy: existing?.enrichmentSource?.validatedBy || null,
							validationNote: existing?.enrichmentSource?.validationNote || null,
						},
					},
				},
			},
		});
	}

	const outcomeByPoId = new Map(programOutcomes.map((item) => [item.poId, item]));
	const outcomeOps = [];
	for (const item of inputProgramOutcomes) {
		const existing = outcomeByPoId.get(item.poId);
		if (!existing) continue;

		const { kept } = filterCareerTracks(item.careerTracks || [], trackIdSet);
		outcomeOps.push({
			updateOne: {
				filter: { poId: existing.poId },
				update: { $set: { careerTracks: kept } },
			},
		});
	}

	if (unitOps.length) {
		await CourseUnitModel.bulkWrite(unitOps, { ordered: false });
	}
	if (outcomeOps.length) {
		await ProgramOutcomeModel.bulkWrite(outcomeOps, { ordered: false });
	}

	logger?.info?.({
		event: 'ENRICHMENT_SUCCESS',
		programId: program.programId,
		courseUnitsUpdated: unitOps.length,
		programOutcomesUpdated: outcomeOps.length,
	});

	return {
		courseUnitsUpdated: unitOps.length,
		programOutcomesUpdated: outcomeOps.length,
	};
}

module.exports = {
	runProgramEnrichment,
};
