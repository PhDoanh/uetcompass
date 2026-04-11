const crypto = require('crypto');
const { loadAndValidateConfig } = require('./config.loader');
const { extractContent } = require('./tavily.service');
const { CALL1_RESPONSE_SCHEMA, callGeminiJSON, buildCall1Prompt, computeEmphasis } = require('./gemini.service');
const { runProgramEnrichment } = require('./enrichment.pipeline');
const { buildCurrentSnapshot, hasSnapshotChanged, defaultHeadFetcher } = require('./change-detection');
const { detectCyclesByProgram } = require('./cycle.detector');
const { log } = require('./seed.logger');
const { createInitialSummary, resolveFinalStatus } = require('./seed.status');
const { upsertCourseUnits, upsertPrograms, upsertProgramOutcomes } = require('./seed.pipeline.persistence');
const { CourseUnit } = require('./courseUnit.model');
const { Program } = require('./program.model');
const { ProgramOutcome } = require('./programOutcome.model');
const { SeedRun } = require('./seedRun.model');

function normalizeCourseUnit(unit, programId) {
	return {
		code: `${unit.code || ''}`.trim(),
		name: `${unit.name || ''}`.trim(),
		credits: Number(unit.credits),
		programId,
		prerequisites: Array.isArray(unit.prerequisites)
			? unit.prerequisites.map((item) => `${item}`.trim()).filter(Boolean)
			: [],
		type: unit.type || null,
		theoryHours: unit.theoryHours ?? null,
		practiceHours: unit.practiceHours ?? null,
		block: unit.block ?? null,
		emphasis: computeEmphasis(unit.theoryHours, unit.practiceHours),
		source: unit.source || null,
		seededAt: new Date(),
	};
}

function validateCourseUnits(units) {
	if (!Array.isArray(units) || units.length === 0) {
		throw new Error('No course units parsed from source');
	}

	for (const unit of units) {
		if (!unit.code) throw new Error('Course unit code is required');
		if (!unit.name) throw new Error(`Course unit name is required for ${unit.code}`);
		if (!Number.isFinite(unit.credits) || unit.credits < 1) {
			throw new Error(`Course unit credits must be >= 1 for ${unit.code}`);
		}
		if (!unit.programId) throw new Error(`Course unit programId is required for ${unit.code}`);
		if (!Array.isArray(unit.prerequisites)) {
			throw new Error(`Course unit prerequisites must be an array for ${unit.code}`);
		}
	}
}

function detectUnresolvedPrerequisites(courseUnits) {
	const codeSet = new Set(courseUnits.map((unit) => unit.code));
	const unresolved = [];
	for (const unit of courseUnits) {
		for (const prerequisite of unit.prerequisites || []) {
			if (!codeSet.has(prerequisite)) unresolved.push({ programId: unit.programId, code: unit.code, prerequisite });
		}
	}
	return unresolved;
}

function buildBulkUpsertOps(courseUnits) {
	return courseUnits.map((unit) => ({
		updateOne: {
			filter: { code: unit.code, programId: unit.programId },
			update: { $set: unit },
			upsert: true,
		},
	}));
}

async function upsertCourseUnitsCompat(courseUnits) {
	if (!courseUnits.length) return { matchedCount: 0, upsertedCount: 0, modifiedCount: 0 };
	const ops = buildBulkUpsertOps(courseUnits);
	return CourseUnit.bulkWrite(ops, { ordered: false });
}

function createSeedRun({ programId, triggeredBy }) {
	return SeedRun.create({
		runId: crypto.randomUUID(),
		programId,
		status: 'running',
		triggeredBy,
		startedAt: new Date(),
		urlSnapshots: [],
		summary: { coursesUpserted: 0, outcomesUpserted: 0, errors: [] },
	});
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableGeminiError(error) {
	const status = Number(error?.status || error?.statusCode || error?.response?.status);
	if ([429, 503, 504].includes(status)) return true;

	const message = `${error?.message || ''}`.toLowerCase();
	return (
		message.includes('429') ||
		message.includes('503') ||
		message.includes('504') ||
		message.includes('rate limit') ||
		message.includes('quota') ||
		message.includes('timeout') ||
		message.includes('temporar') ||
		message.includes('overload')
	);
}

async function callGeminiWithRetry({ callGemini, prompt, schema, logger, programId, maxAttempts = 3, baseDelayMs = 1200 }) {
	let attempt = 0;
	while (attempt < maxAttempts) {
		attempt += 1;
		try {
			return await callGemini({ prompt, schema });
		} catch (error) {
			const canRetry = isRetryableGeminiError(error) && attempt < maxAttempts;
			if (!canRetry) throw error;

			const delayMs = baseDelayMs * (2 ** (attempt - 1));
			logger?.warn?.({
				event: 'GEMINI_RETRY',
				programId,
				attempt,
				nextDelayMs: delayMs,
				reason: error?.message || 'Unknown Gemini error',
			});
			await sleep(delayMs);
		}
	}

	throw new Error('Gemini retry logic exhausted unexpectedly');
}

async function runSeedPipeline(
	{ triggeredBy = 'cron' } = {},
	deps = {}
) {
	const logger = deps.logger || log;
	const config = deps.config || loadAndValidateConfig();
	const extract = deps.extractContent || extractContent;
	const headFetcher = deps.headFetcher || defaultHeadFetcher;
	const callGemini = deps.callGeminiJSON || callGeminiJSON;

	const courseUnitModel = deps.CourseUnitModel || CourseUnit;
	const programModel = deps.ProgramModel || Program;
	const programOutcomeModel = deps.ProgramOutcomeModel || ProgramOutcome;
	const seedRunModel = deps.SeedRunModel || SeedRun;

	const summary = createInitialSummary(config.programs.length);
	logger.info({ event: 'JOB_START', totalPrograms: config.programs.length, triggeredBy });

	if (!config.programs.length) {
		summary.exitStatus = resolveFinalStatus({ hasFailures: false, cyclesDetected: 0 });
		logger.info({ event: 'JOB_COMPLETE', ...summary });
		return summary;
	}

	for (const programItem of config.programs) {
		const programId = programItem.programId;
		const sources = Object.entries(programItem.sources || {})
			.filter(([, source]) => source?.url)
			.map(([scrapeType, source]) => ({ scrapeType, url: source.url }));

		const lastCompletedRun = await seedRunModel.findOne({ programId, status: 'completed' }).sort({ startedAt: -1 }).lean();
		const previousSnapshots = new Map((lastCompletedRun?.urlSnapshots || []).map((item) => [item.url, item]));

		const snapshots = [];
		const extractedDocuments = [];
		let precheckFailures = 0;
		let hasChange = false;
		for (const source of sources) {
			logger.info({ event: 'URL_START', programId, url: source.url, scrapeType: source.scrapeType });
			try {
				const snapshot = await buildCurrentSnapshot(source.url, {
					headFetcher,
					extractContent: extract,
				});
				snapshots.push({
					url: snapshot.url,
					httpEtag: snapshot.httpEtag,
					lastModified: snapshot.lastModified,
					contentHash: snapshot.contentHash,
					checkedAt: snapshot.checkedAt,
				});
				extractedDocuments.push({ scrapeType: source.scrapeType, url: source.url, markdown: snapshot.markdown || '' });
				if (hasSnapshotChanged(previousSnapshots.get(source.url), snapshot)) {
					hasChange = true;
				}
				logger.info({ event: 'URL_SUCCESS', programId, url: source.url, scrapeType: source.scrapeType });
			} catch (error) {
				precheckFailures += 1;
				const message = error?.message || 'Unknown error';
				const stage = message.includes('HEAD request failed') ? 'head' : 'tavily';
				logger.error({
					event: 'URL_SKIP',
					programId,
					url: source.url,
					scrapeType: source.scrapeType,
					stage,
					reason: message,
				});
			}
		}

		if (!hasChange && precheckFailures === 0) {
			summary.skippedPrograms += 1;
			logger.info({ event: 'CHANGE_SKIP', programId });
			continue;
		}

		summary.processedPrograms += 1;
		const runDoc = await createSeedRun({ programId, triggeredBy });

		let programFailures = precheckFailures;
		let upsertedCourses = 0;
		let upsertedOutcomes = 0;

		if (extractedDocuments.length > 0) {
			try {
				const prompt = buildCall1Prompt({
					programId,
					sourceDocuments: extractedDocuments.map((item) => ({
						scrapeType: item.scrapeType,
						markdown: item.markdown,
					})),
				});
				const parsed = await callGeminiWithRetry({
					callGemini,
					prompt,
					schema: CALL1_RESPONSE_SCHEMA,
					logger,
					programId,
				});

				const sourceRef = {
					url: extractedDocuments.map((item) => item.url).join(' | '),
					scrapeType: 'program-aggregate',
					scrapedAt: new Date(),
				};

				const programRecord = parsed.program
					? [{ ...parsed.program, programId, source: sourceRef }]
					: [];
				const programOutcomes = Array.isArray(parsed.programOutcomes)
					? parsed.programOutcomes.map((item, index) => ({
						...item,
						poId: item.poId || `${programId}-PO-${index + 1}`,
						programId,
						source: sourceRef,
					}))
					: [];

				const normalizedUnits = (Array.isArray(parsed.courseUnits) ? parsed.courseUnits : []).map((item) =>
					normalizeCourseUnit(
						{
							...item,
							source: sourceRef,
						},
						programId
					)
				);

				validateCourseUnits(normalizedUnits);

				await upsertPrograms(programModel, programRecord);
				await upsertProgramOutcomes(programOutcomeModel, programOutcomes);
				await upsertCourseUnits(courseUnitModel, normalizedUnits);

				upsertedCourses += normalizedUnits.length;
				upsertedOutcomes += programOutcomes.length;

				logger.info({
					event: 'PROGRAM_PARSE_SUCCESS',
					programId,
					sourceCount: extractedDocuments.length,
					upsertedCount: normalizedUnits.length,
				});
			} catch (error) {
				programFailures += 1;
				const message = error?.message || 'Unknown error';
				const stage = message.includes('JSON') ? 'gemini' : message.includes('Gemini') ? 'gemini' : 'validate';
				logger.error({
					event: 'PROGRAM_PARSE_FAILED',
					programId,
					stage,
					reason: message,
				});
			}
		} else {
			logger.error({
				event: 'PROGRAM_PARSE_FAILED',
				programId,
				stage: 'tavily',
				reason: 'No source documents available for aggregated parsing',
			});
		}

		if (upsertedCourses > 0) {
			try {
				const currentProgram = await programModel.findOne({ programId }).lean();
				const currentUnits = await courseUnitModel.find({ programId }).lean();
				const currentOutcomes = await programOutcomeModel.find({ programId }).lean();

				await runProgramEnrichment({
					program: currentProgram || { programId },
					courseUnits: currentUnits,
					programOutcomes: currentOutcomes,
					careerTracks: config.careerTracks,
					skillVocabulary: config.skillVocabulary,
					CourseUnitModel: courseUnitModel,
					ProgramOutcomeModel: programOutcomeModel,
					logger,
				});
			} catch (error) {
				programFailures += 1;
				logger.warn({ event: 'ENRICHMENT_SKIP', programId, reason: error.message, stage: 'gemini' });
			}
		}

		const runFailed = programFailures > 0;
		await seedRunModel.updateOne(
			{ _id: runDoc._id },
			{
				$set: {
					status: runFailed ? 'failed' : 'completed',
					completedAt: new Date(),
					urlSnapshots: snapshots,
					summary: {
						coursesUpserted: upsertedCourses,
						outcomesUpserted: upsertedOutcomes,
						errors: [],
					},
				},
			}
		);

		if (runFailed) summary.failCount += 1;
		else summary.successCount += 1;
		summary.coursesUpserted += upsertedCourses;
		summary.outcomesUpserted += upsertedOutcomes;
	}

	const allUnits = await courseUnitModel.find({}).lean();
	const unresolved = detectUnresolvedPrerequisites(allUnits);
	for (const item of unresolved) {
		logger.warn({
			event: 'UNRESOLVED_PREREQUISITE',
			programId: item.programId,
			code: item.code,
			prerequisite: item.prerequisite,
		});
	}

	const cycles = detectCyclesByProgram(allUnits);
	if (cycles.length > 0) {
		summary.cyclesDetected = cycles.length;
		for (const group of cycles) {
			logger.warn({ event: 'CYCLE_DETECTED', programId: group.programId, cycles: [group] });
		}
	} else {
		const programIds = [...new Set(allUnits.map((item) => item.programId))];
		for (const programId of programIds) {
			logger.info({ event: 'CYCLE_CLEAN', programId });
		}
	}

	summary.exitStatus = resolveFinalStatus({
		hasFailures: summary.failCount > 0,
		cyclesDetected: summary.cyclesDetected,
	});
	logger.info({ event: 'JOB_COMPLETE', ...summary });
	return summary;
}

module.exports = {
	runSeedPipeline,
	normalizeCourseUnit,
	validateCourseUnits,
	detectUnresolvedPrerequisites,
	buildBulkUpsertOps,
	upsertCourseUnits: upsertCourseUnitsCompat,
};
