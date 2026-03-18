async function loadPipeline({
	urls = [],
	extractImpl = async () => '# mock',
	parseImpl = async (markdown, major) => [{ code: 'INT1001', name: 'A', credits: 3, major, prerequisites: [] }],
	bulkWriteImpl = async () => ({ ok: 1 }),
	distinctImpl = async () => [],
	findImpl = async () => [],
	detectCyclesImpl = () => [],
} = {}) {
	jest.resetModules();

	jest.doMock('../../../src/modules/curriculum/curriculum.config', () => ({
		urls,
		cronSchedule: '0 0 1 3,8 *',
	}));
	jest.doMock('../../../src/modules/curriculum/tavily.service', () => ({
		extractContent: jest.fn(extractImpl),
	}));
	jest.doMock('../../../src/modules/curriculum/gemini.service', () => ({
		parseCourseUnits: jest.fn(parseImpl),
	}));
	jest.doMock('../../../src/modules/curriculum/courseUnit.model', () => ({
		CourseUnit: {
			bulkWrite: jest.fn(bulkWriteImpl),
			distinct: jest.fn(distinctImpl),
			find: jest.fn(() => ({ lean: findImpl })),
		},
	}));
	jest.doMock('../../../src/modules/curriculum/cycle.detector', () => ({
		detectCycles: jest.fn(detectCyclesImpl),
	}));
	jest.doMock('../../../src/modules/curriculum/seed.logger', () => ({
		logEvent: jest.fn(),
	}));

	const pipeline = require('../../../src/modules/curriculum/seed.pipeline');
	const { logEvent } = require('../../../src/modules/curriculum/seed.logger');
	return { pipeline, logEvent };
}

describe('runSeedPipeline', () => {
	test('processes all URLs successfully and exits with SUCCESS', async () => {
		const { pipeline } = await loadPipeline({
			urls: [{ url: 'https://example.com/cntt', major: 'CNTT' }],
			distinctImpl: async () => ['CNTT'],
			findImpl: async () => [{ code: 'INT1001', prerequisites: [] }],
		});

		const result = await pipeline.runSeedPipeline();
		expect(result.exitStatus).toBe('SUCCESS');
		expect(result.successCount).toBe(1);
		expect(result.failCount).toBe(0);
	});

	test('skips failing URL and returns PARTIAL_FAILURE', async () => {
		const { pipeline } = await loadPipeline({
			urls: [
				{ url: 'https://broken', major: 'CNTT' },
				{ url: 'https://ok', major: 'CNTT' },
			],
			extractImpl: async url => {
				if (url.includes('broken')) {
					throw new Error('Tavily request failed');
				}
				return '# ok';
			},
			distinctImpl: async () => ['CNTT'],
			findImpl: async () => [{ code: 'INT1001', prerequisites: [] }],
		});

		const result = await pipeline.runSeedPipeline();
		expect(result.exitStatus).toBe('PARTIAL_FAILURE');
		expect(result.successCount).toBe(1);
		expect(result.failCount).toBe(1);
	});

	test('returns PARTIAL_FAILURE when all URLs fail', async () => {
		const { pipeline } = await loadPipeline({
			urls: [{ url: 'https://broken', major: 'CNTT' }],
			extractImpl: async () => {
				throw new Error('Tavily request failed');
			},
			distinctImpl: async () => [],
		});

		const result = await pipeline.runSeedPipeline();
		expect(result.exitStatus).toBe('PARTIAL_FAILURE');
		expect(result.successCount).toBe(0);
		expect(result.failCount).toBe(1);
	});

	test('returns FAILED when cycle detected after upsert', async () => {
		const { pipeline } = await loadPipeline({
			urls: [{ url: 'https://ok', major: 'CNTT' }],
			distinctImpl: async () => ['CNTT'],
			findImpl: async () => [
				{ code: 'A', prerequisites: ['B'] },
				{ code: 'B', prerequisites: ['A'] },
			],
			detectCyclesImpl: () => [{ from: 'A', to: 'B' }],
		});

		const result = await pipeline.runSeedPipeline();
		expect(result.exitStatus).toBe('FAILED');
		expect(result.cyclesDetected).toBeGreaterThan(0);
	});

	test('no-op with SUCCESS when no urls configured', async () => {
		const { pipeline, logEvent } = await loadPipeline({ urls: [] });
		const result = await pipeline.runSeedPipeline();

		expect(result.exitStatus).toBe('SUCCESS');
		expect(logEvent).toHaveBeenCalledWith('warn', 'JOB_NOOP', expect.any(Object));
	});
});
