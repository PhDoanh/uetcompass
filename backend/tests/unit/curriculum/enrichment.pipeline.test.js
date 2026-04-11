const { runProgramEnrichment } = require('../../../src/modules/curriculum/enrichment.pipeline');

jest.mock('../../../src/modules/curriculum/gemini.service', () => ({
	buildCall2Prompt: jest.fn(() => 'prompt'),
	callGeminiJSON: jest.fn(),
	filterVocabularySkills: jest.fn((skills, set) => {
		const kept = skills.filter((s) => set.has(s));
		const dropped = skills.filter((s) => !set.has(s));
		return { kept, dropped };
	}),
	filterCareerTracks: jest.fn((tracks, set) => {
		const kept = tracks.filter((t) => set.has(t));
		const dropped = tracks.filter((t) => !set.has(t));
		return { kept, dropped };
	}),
}));

const { callGeminiJSON } = require('../../../src/modules/curriculum/gemini.service');

describe('runProgramEnrichment', () => {
	test('updates course units and outcomes with vocabulary filtering', async () => {
		callGeminiJSON.mockResolvedValue({
			program: { careerTracks: ['t1', 'bad'] },
			courseUnits: [{ code: 'INT1001', difficultyLevel: 3, careerTracks: ['t1', 'invalid'], skills: ['oop', 'bad'] }],
			programOutcomes: [{ poId: 'PO-1', careerTracks: ['t1', 'bad'] }],
		});

		const CourseUnitModel = { bulkWrite: jest.fn(async () => ({ ok: 1 })) };
		const ProgramOutcomeModel = { bulkWrite: jest.fn(async () => ({ ok: 1 })) };
		const ProgramModel = { updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })) };
		const logger = { info: jest.fn(), warn: jest.fn() };

		const result = await runProgramEnrichment({
			program: { programId: 'P1' },
			courseUnits: [{ code: 'INT1001', programId: 'P1', enrichmentSource: { scrapeType: 'ai-inferred' } }],
			programOutcomes: [{ poId: 'PO-1', programId: 'P1' }],
			careerTracks: [{ trackId: 't1', description: 'ok' }],
			skillVocabulary: ['oop'],
			ProgramModel,
			CourseUnitModel,
			ProgramOutcomeModel,
			logger,
		});

		expect(result.programUpdated).toBe(1);
		expect(result.courseUnitsUpdated).toBe(1);
		expect(result.programOutcomesUpdated).toBe(1);
		expect(ProgramModel.updateOne).toHaveBeenCalledWith(
			{ programId: 'P1' },
			expect.objectContaining({ $set: expect.objectContaining({ careerTracks: ['t1'] }) })
		);
		expect(CourseUnitModel.bulkWrite).toHaveBeenCalled();
		expect(ProgramOutcomeModel.bulkWrite).toHaveBeenCalled();
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'SKILL_TAG_DROPPED', code: 'INT1001' })
		);
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'PROGRAM_TRACK_DROPPED', programId: 'P1' })
		);
	});

	test('does not overwrite skills for human-validated records', async () => {
		callGeminiJSON.mockResolvedValue({
			courseUnits: [{ code: 'INT2001', difficultyLevel: 4, careerTracks: ['t1'], skills: ['oop'] }],
			programOutcomes: [],
		});

		const CourseUnitModel = { bulkWrite: jest.fn(async () => ({ ok: 1 })) };
		const ProgramOutcomeModel = { bulkWrite: jest.fn(async () => ({ ok: 1 })) };
		const ProgramModel = { updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })) };

		await runProgramEnrichment({
			program: { programId: 'P1' },
			courseUnits: [
				{ code: 'INT2001', programId: 'P1', enrichmentSource: { scrapeType: 'human-validated' }, skills: ['keep'] },
			],
			programOutcomes: [],
			careerTracks: [{ trackId: 't1', description: 'ok' }],
			skillVocabulary: ['oop'],
			ProgramModel,
			CourseUnitModel,
			ProgramOutcomeModel,
			logger: { info: jest.fn(), warn: jest.fn() },
		});

		const ops = CourseUnitModel.bulkWrite.mock.calls[0][0];
		expect(JSON.stringify(ops)).not.toContain('"skills"');
	});

	test('applies deterministic fallback when AI program tracks have no evidence', async () => {
		callGeminiJSON.mockResolvedValue({
			program: { careerTracks: ['t2'] },
			courseUnits: [{ code: 'INT3001', difficultyLevel: 3, careerTracks: ['t1'], skills: ['oop'] }],
			programOutcomes: [],
		});

		const ProgramModel = { updateOne: jest.fn(async () => ({ matchedCount: 1, modifiedCount: 1 })) };

		await runProgramEnrichment({
			program: { programId: 'P1' },
			courseUnits: [{ code: 'INT3001', programId: 'P1', enrichmentSource: { scrapeType: 'ai-inferred' } }],
			programOutcomes: [],
			careerTracks: [
				{ trackId: 't1', description: 'ok' },
				{ trackId: 't2', description: 'ok' },
			],
			skillVocabulary: ['oop'],
			ProgramModel,
			CourseUnitModel: { bulkWrite: jest.fn(async () => ({ ok: 1 })) },
			ProgramOutcomeModel: { bulkWrite: jest.fn(async () => ({ ok: 1 })) },
			logger: { info: jest.fn(), warn: jest.fn() },
		});

		expect(ProgramModel.updateOne).toHaveBeenCalledWith(
			{ programId: 'P1' },
			expect.objectContaining({ $set: expect.objectContaining({ careerTracks: ['t1'] }) })
		);
	});
});
