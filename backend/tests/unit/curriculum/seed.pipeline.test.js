async function loadPipeline({
	programs,
	extractImpl = async () => '# markdown',
	callGeminiImpl = async () => ({
		program: { nameVI: 'CNTT' },
		programOutcomes: [{ poId: 'PO-1', description: 'desc' }],
		courseUnits: [{ code: 'INT1001', name: 'Intro', credits: 3, prerequisites: [] }],
	}),
	hasSnapshotChangedImpl = () => true,
	runEnrichmentImpl = async () => ({ courseUnitsUpdated: 1, programOutcomesUpdated: 1 }),
	cyclesImpl = () => [],
	allUnits = [{ code: 'INT1001', programId: 'P1', prerequisites: [] }],
} = {}) {
	jest.resetModules();

	const logger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	};

	const CourseUnitModel = {
		bulkWrite: jest.fn(async () => ({ ok: 1 })),
		find: jest.fn((query) => ({
			lean: jest.fn(async () => {
				if (!query || Object.keys(query).length === 0) return allUnits;
				return allUnits.filter((item) => item.programId === query.programId);
			}),
		})),
	};

	const ProgramModel = {
		bulkWrite: jest.fn(async () => ({ ok: 1 })),
		findOne: jest.fn(() => ({ lean: jest.fn(async () => ({ programId: 'P1' })) })),
	};

	const ProgramOutcomeModel = {
		bulkWrite: jest.fn(async () => ({ ok: 1 })),
		find: jest.fn(() => ({ lean: jest.fn(async () => [{ poId: 'PO-1', programId: 'P1' }]) })),
	};

	const SeedRunModel = {
		findOne: jest.fn(() => ({ sort: jest.fn(() => ({ lean: jest.fn(async () => null) })) })),
		create: jest.fn(async () => ({ _id: 'run1' })),
		updateOne: jest.fn(async () => ({ matchedCount: 1 })),
	};

	jest.doMock('../../../src/modules/curriculum/config.loader', () => ({
		loadAndValidateConfig: () => ({
			programs:
				programs ||
				[
					{
						programId: 'P1',
						sources: { 'curriculum-table': { url: 'https://example.com/p1' } },
					},
				],
			careerTracks: [{ trackId: 'software-engineer-general', description: 'd' }],
			skillVocabulary: ['oop'],
		}),
	}));

	jest.doMock('../../../src/modules/curriculum/tavily.service', () => ({
		extractContent: jest.fn(extractImpl),
	}));

	jest.doMock('../../../src/modules/curriculum/gemini.service', () => ({
		callGeminiJSON: jest.fn(callGeminiImpl),
		buildCall1Prompt: jest.fn(() => 'prompt'),
		computeEmphasis: jest.fn(() => 'balance'),
	}));

	jest.doMock('../../../src/modules/curriculum/change-detection', () => ({
		buildCurrentSnapshot: jest.fn(async (url, options = {}) => {
			const markdown = await options.extractContent(url);
			return {
				url,
				httpEtag: 'etag',
				lastModified: 'lm',
				contentHash: 'h',
				checkedAt: new Date(),
				markdown,
			};
		}),
		hasSnapshotChanged: jest.fn(hasSnapshotChangedImpl),
		defaultHeadFetcher: jest.fn(),
	}));

	jest.doMock('../../../src/modules/curriculum/enrichment.pipeline', () => ({
		runProgramEnrichment: jest.fn(runEnrichmentImpl),
	}));

	jest.doMock('../../../src/modules/curriculum/cycle.detector', () => ({
		detectCyclesByProgram: jest.fn(cyclesImpl),
	}));

	jest.doMock('../../../src/modules/curriculum/seed.logger', () => ({
		log: logger,
	}));

	jest.doMock('../../../src/modules/curriculum/courseUnit.model', () => ({ CourseUnit: CourseUnitModel }));
	jest.doMock('../../../src/modules/curriculum/program.model', () => ({ Program: ProgramModel }));
	jest.doMock('../../../src/modules/curriculum/programOutcome.model', () => ({ ProgramOutcome: ProgramOutcomeModel }));
	jest.doMock('../../../src/modules/curriculum/seedRun.model', () => ({ SeedRun: SeedRunModel }));

	const pipeline = require('../../../src/modules/curriculum/seed.pipeline');
	return { pipeline, logger, CourseUnitModel, SeedRunModel };
}

describe('runSeedPipeline', () => {
	test('processes changed program successfully and exits with SUCCESS', async () => {
		const { pipeline } = await loadPipeline();
		const result = await pipeline.runSeedPipeline({ triggeredBy: 'manual' });

		expect(result.exitStatus).toBe('SUCCESS');
		expect(result.successCount).toBe(1);
		expect(result.failCount).toBe(0);
	});

	test('returns PARTIAL_FAILURE when URL extraction fails', async () => {
		const { pipeline } = await loadPipeline({
			extractImpl: async () => {
				throw new Error('Tavily failed');
			},
		});

		const result = await pipeline.runSeedPipeline({ triggeredBy: 'manual' });
		expect(result.exitStatus).toBe('PARTIAL_FAILURE');
		expect(result.failCount).toBe(1);
	});

	test('skips unchanged programs and exits SUCCESS', async () => {
		const { pipeline } = await loadPipeline({
			hasSnapshotChangedImpl: () => false,
		});

		const result = await pipeline.runSeedPipeline({ triggeredBy: 'manual' });
		expect(result.exitStatus).toBe('SUCCESS');
		expect(result.skippedPrograms).toBe(1);
		expect(result.processedPrograms).toBe(0);
	});

	test('returns FAILED when cycles are detected', async () => {
		const { pipeline } = await loadPipeline({
			cyclesImpl: () => [{ programId: 'P1', from: 'A', to: 'B' }],
			allUnits: [
				{ code: 'A', programId: 'P1', prerequisites: ['B'] },
				{ code: 'B', programId: 'P1', prerequisites: ['A'] },
			],
		});

		const result = await pipeline.runSeedPipeline({ triggeredBy: 'manual' });
		expect(result.exitStatus).toBe('FAILED');
		expect(result.cyclesDetected).toBeGreaterThan(0);
	});

	test('emits unresolved prerequisite warning', async () => {
		const { pipeline, logger } = await loadPipeline({
			allUnits: [{ code: 'INT2001', programId: 'P1', prerequisites: ['INT9999'] }],
		});

		await pipeline.runSeedPipeline({ triggeredBy: 'manual' });
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'UNRESOLVED_PREREQUISITE',
				code: 'INT2001',
				prerequisite: 'INT9999',
			})
		);
	});
});
