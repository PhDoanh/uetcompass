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
	ProgramModel,
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
	const inputProgramCareerTracks = Array.isArray(enriched?.program?.careerTracks)
		? enriched.program.careerTracks
		: [];

	const courseTrackFrequency = new Map();
	const outcomeTrackEvidence = new Set();

	const unitByCode = new Map(courseUnits.map((unit) => [unit.code, unit]));
	const unitOps = [];

	for (const item of inputCourseUnits) {
		const existing = unitByCode.get(item.code);
		if (!existing) continue;

		const { kept: keptSkills, dropped: droppedSkills } = filterVocabularySkills(item.skills || [], skillSet);
		const { kept: keptTracks } = filterCareerTracks(item.careerTracks || [], trackIdSet);
		for (const trackId of new Set(keptTracks)) {
			courseTrackFrequency.set(trackId, (courseTrackFrequency.get(trackId) || 0) + 1);
		}

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
		for (const trackId of kept) outcomeTrackEvidence.add(trackId);
		outcomeOps.push({
			updateOne: {
				filter: { poId: existing.poId },
				update: { $set: { careerTracks: kept } },
			},
		});
	}

	const minCourseEvidence = (courseUnits || []).length <= 3 ? 1 : 2;
	const deterministicEvidence = new Set([...outcomeTrackEvidence]);
	for (const [trackId, count] of courseTrackFrequency.entries()) {
		if (count >= minCourseEvidence) deterministicEvidence.add(trackId);
	}

	const { kept: aiProgramTracks, dropped: droppedProgramTracks } = filterCareerTracks(
		inputProgramCareerTracks,
		trackIdSet
	);

	if (droppedProgramTracks.length > 0) {
		logger?.warn?.({
			event: 'PROGRAM_TRACK_DROPPED',
			programId: program.programId,
			dropped: droppedProgramTracks,
			reason: 'out-of-vocabulary',
		});
	}

	let finalProgramTracks = aiProgramTracks.length
		? aiProgramTracks.filter((trackId) => deterministicEvidence.has(trackId))
		: [...deterministicEvidence];

	if (aiProgramTracks.length > 0) {
		const droppedByEvidence = aiProgramTracks.filter((trackId) => !deterministicEvidence.has(trackId));
		if (droppedByEvidence.length > 0) {
			logger?.warn?.({
				event: 'PROGRAM_TRACK_DROPPED',
				programId: program.programId,
				dropped: droppedByEvidence,
				reason: 'insufficient-deterministic-evidence',
			});
		}
		if (finalProgramTracks.length === 0 && deterministicEvidence.size > 0) {
			finalProgramTracks = [...deterministicEvidence];
		}
	}

	let programUpdated = 0;
	if (ProgramModel?.updateOne) {
		const res = await ProgramModel.updateOne(
			{ programId: program.programId },
			{ $set: { careerTracks: finalProgramTracks } }
		);
		programUpdated = res?.modifiedCount || res?.matchedCount || 0;
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
		programUpdated,
		courseUnitsUpdated: unitOps.length,
		programOutcomesUpdated: outcomeOps.length,
	});

	return {
		programUpdated,
		courseUnitsUpdated: unitOps.length,
		programOutcomesUpdated: outcomeOps.length,
	};
}

module.exports = {
	runProgramEnrichment,
};
