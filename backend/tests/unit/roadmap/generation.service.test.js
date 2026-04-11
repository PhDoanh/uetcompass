'use strict';

/**
 * Unit tests for generation.service.js
 * Tests: Gemini off-template skill evaluation, topological node building, concurrency guard,
 * failure lifecycle, SIGTERM handler, NFR-002 isolation, empty nodes edge case.
 *
 * Pipeline under test:
 *   StudentProfile.findOne -> CourseUnit.find -> evaluateOffTemplateSkills (Gemini)
 *   -> buildNodesTopologically -> validateTopologicalOrder -> storePendingPreview -> notifyUser
 *
 * Pattern: All jest.mock() at top level. No resetModules.
 * Mocks are configured per-test via mockReturnValue/mockImplementation.
 */

jest.mock('../../../src/modules/roadmap/roadmapValidation.service');
jest.mock('../../../src/modules/roadmap/roadmap.preview.store');
jest.mock('../../../src/modules/roadmap/roadmap.service');
jest.mock('../../../src/modules/onboarding/onboarding.model');
jest.mock('../../../src/modules/roadmap/roadmap.sse', () => ({
	addConnection: jest.fn(),
	addUserConnection: jest.fn(),
	closeConnection: jest.fn(),
	connections: new Map(),
	notifyClientByToken: jest.fn(),
	notifyUser: jest.fn(),
	notifyPreviewReady: jest.fn(),
	notifyGenerationFailed: jest.fn(),
}));
jest.mock('../../../src/modules/curriculum/courseUnit.model');
jest.mock('@google/generative-ai');

// Set up GoogleGenerativeAI mock BEFORE generation.service is required
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mockGenerateContent = jest.fn();
GoogleGenerativeAI.mockImplementation(() => ({
	getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
}));

const generationService = require('../../../src/modules/roadmap/generation.service');

const validationService = require('../../../src/modules/roadmap/roadmapValidation.service');
const previewStore = require('../../../src/modules/roadmap/roadmap.preview.store');
const roadmapService = require('../../../src/modules/roadmap/roadmap.service');
const { notifyUser } = require('../../../src/modules/roadmap/roadmap.sse');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { CourseUnit } = require('../../../src/modules/curriculum/courseUnit.model');

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockProfile = {
	_id: 'profileId1',
	userId: 'userId1',
	major: 'CS',
	careerGoal: { role: 'Backend Engineer', companyType: 'Product' },
	completedCourses: [],
	personalAspirations: null,
};

const mockCourseUnits = [
	{ code: 'INT2204', name: 'OOP', credits: 3, prerequisites: [], type: 'required' },
	{ code: 'INT2201', name: 'DSA', credits: 3, prerequisites: ['INT2204'], type: 'required' },
];

// Gemini now returns { skillName, reason }[] for off-template skill evaluation
const mockApprovedSkills = [
	{ skillName: 'OOP', reason: 'Essential for Backend Engineer at Product company.' },
	{ skillName: 'DSA', reason: 'Core data structures for Product company engineering.' },
];

// Helper: trigger generation and wait for async lifecycle to settle
async function trigger(userId, reason = 'profile_submission') {
	try {
		await generationService.triggerGeneration(userId, reason);
	} catch (e) {
		if (e.code !== 'CONFLICT') throw e;
	}
	await new Promise((r) => setTimeout(r, 30));
}

beforeEach(() => {
	jest.clearAllMocks();
	// clearAllMocks() only clears call history, not implementations.
	// Explicitly reset validateTopologicalOrder so mockImplementation from previous tests doesn\'t bleed over.
	validationService.validateTopologicalOrder.mockReset();

	StudentProfile.findOne = jest.fn().mockResolvedValue(mockProfile);
	CourseUnit.find = jest.fn().mockReturnValue({
		lean: jest.fn().mockResolvedValue(mockCourseUnits),
	});
	previewStore.storePendingPreview = jest.fn();
	previewStore.getPendingPreview = jest.fn().mockReturnValue(null);
	previewStore.clearPendingPreview = jest.fn();
	previewStore.getAllPendingUserIds = jest.fn().mockReturnValue([]);
	roadmapService.upsertFailedWithProfile = jest.fn().mockResolvedValue({});
	roadmapService.upsertFailed = jest.fn().mockResolvedValue({});
	roadmapService.getCompletedByUser = jest.fn().mockResolvedValue(null);

	// Gemini returns approved { skillName, reason }[] items
	mockGenerateContent.mockResolvedValue({
		response: { text: () => JSON.stringify(mockApprovedSkills) },
	});
});

// ---------------------------------------------------------------------------
// Gemini output / preview store
// ---------------------------------------------------------------------------

describe('generation.service -- Gemini output and preview', () => {
	test('builds skill nodes from AI-approved skills and stores preview', async () => {
		await trigger('u-parse-1');
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-parse-1',
			expect.objectContaining({
				personalisationLevel: 'full',
				nodes: expect.arrayContaining([
					expect.objectContaining({ skillName: 'OOP', resources: [] }),
				]),
			})
		);
	});

	test('notifies user with roadmap_preview_ready including full preview payload', async () => {
		await trigger('u-parse-2');
		expect(notifyUser).toHaveBeenCalledWith(
			'u-parse-2',
			'roadmap_preview_ready',
			expect.objectContaining({
				type: 'roadmap_preview_ready',
				personalisationLevel: 'full',
				preview: expect.objectContaining({ nodes: expect.any(Array) }),
			})
		);
	});

	test('does not call Gemini and stores low-personalisation preview when careerGoal is absent', async () => {
		StudentProfile.findOne.mockResolvedValue({
			...mockProfile,
			careerGoal: { role: null, companyType: null },
		});
		await trigger('u-parse-3');
		expect(mockGenerateContent).not.toHaveBeenCalled();
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-parse-3',
			expect.objectContaining({ personalisationLevel: 'low', nodes: expect.any(Array) })
		);
	});
});

// ---------------------------------------------------------------------------
// Topological validation
// ---------------------------------------------------------------------------

describe('generation.service -- topological validation', () => {
	test('invokes validateTopologicalOrder with relatedCourses nodes and completedCourseCodes', async () => {
		await trigger('u-topo-1');
		expect(validationService.validateTopologicalOrder).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					relatedCourses: expect.arrayContaining([
						expect.objectContaining({ courseCode: 'INT2204' }),
					]),
				}),
			]),
			mockCourseUnits,
			expect.any(Set)
		);
	});

	test('calls upsertFailedWithProfile with personalisationLevel when validation throws', async () => {
		validationService.validateTopologicalOrder.mockImplementation(() => {
			throw new Error('Ordering violation: INT2201 before INT2204');
		});
		await trigger('u-topo-2');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-topo-2', 'profileId1', expect.any(String), 'full'
		);
		expect(
			roadmapService.upsertFailedWithProfile.mock.calls[0][2].toLowerCase()
		).toContain('ordering violation');
		expect(previewStore.storePendingPreview).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Concurrency guard
// ---------------------------------------------------------------------------

describe('generation.service -- concurrency guard', () => {
	test('throws CONFLICT when generation already in progress for same user', async () => {
		let resolveGemini;
		mockGenerateContent.mockReturnValue(new Promise((r) => { resolveGemini = r; }));

		await generationService.triggerGeneration('u-concur-1', 'profile_submission');

		await expect(
			generationService.triggerGeneration('u-concur-1', 'profile_submission')
		).rejects.toMatchObject({ code: 'CONFLICT' });

		resolveGemini({ response: { text: () => JSON.stringify(mockApprovedSkills) } });
		await new Promise((r) => setTimeout(r, 30));
	});

	test('allows generation after previous one completes', async () => {
		await trigger('u-concur-2');
		await expect(
			generationService.triggerGeneration('u-concur-2', 'profile_submission')
		).resolves.toBeUndefined();
		await new Promise((r) => setTimeout(r, 30));
	});
});

// ---------------------------------------------------------------------------
// Failure lifecycle
// ---------------------------------------------------------------------------

describe('generation.service -- failure lifecycle', () => {
	test('calls upsertFailedWithProfile with personalisationLevel on Gemini error', async () => {
		mockGenerateContent.mockRejectedValue(new Error('Gemini timeout'));
		await trigger('u-fail-1');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-fail-1', 'profileId1', expect.stringContaining('Gemini timeout'), 'full'
		);
	});

	test('does not store preview on Gemini error', async () => {
		mockGenerateContent.mockRejectedValue(new Error('rate limited'));
		await trigger('u-fail-2');
		expect(previewStore.storePendingPreview).not.toHaveBeenCalled();
	});

	test('clears concurrency guard after failure so retry is possible', async () => {
		mockGenerateContent.mockRejectedValue(new Error('API error'));
		await generationService.triggerGeneration('u-fail-3', 'profile_submission');
		await new Promise((r) => setTimeout(r, 30));

		mockGenerateContent.mockResolvedValue({
			response: { text: () => JSON.stringify(mockApprovedSkills) },
		});
		await expect(
			generationService.triggerGeneration('u-fail-3', 'profile_submission')
		).resolves.toBeUndefined();
		await new Promise((r) => setTimeout(r, 30));
	});
});

// ---------------------------------------------------------------------------
// NFR-002 isolation -- StudentProfile must NOT be mutated
// ---------------------------------------------------------------------------

describe('generation.service -- NFR-002 isolation', () => {
	test('StudentProfile is NOT saved after generation failure', async () => {
		const profileWithSave = { ...mockProfile, save: jest.fn() };
		StudentProfile.findOne.mockResolvedValue(profileWithSave);
		validationService.validateTopologicalOrder.mockImplementation(() => {
			throw new Error('Validation error');
		});
		await trigger('u-iso-1');
		expect(profileWithSave.save).not.toHaveBeenCalled();
	});

	test('StudentProfile is NOT saved on successful generation', async () => {
		const profileWithSave = { ...mockProfile, save: jest.fn() };
		StudentProfile.findOne.mockResolvedValue(profileWithSave);
		await trigger('u-iso-2');
		expect(profileWithSave.save).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Empty nodes edge case
// ---------------------------------------------------------------------------

describe('generation.service -- empty nodes edge case', () => {
	test('stores preview with empty nodes when AI approves no skills', async () => {
		mockGenerateContent.mockResolvedValue({
			response: { text: () => JSON.stringify([]) },
		});
		await trigger('u-empty-1');
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-empty-1',
			expect.objectContaining({ nodes: [] })
		);
		expect(roadmapService.upsertFailedWithProfile).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// SIGTERM handler
// ---------------------------------------------------------------------------

describe('generation.service -- SIGTERM handler', () => {
	test('calls upsertFailedWithProfile for each pending preview then clears store', async () => {
		previewStore.getAllPendingUserIds.mockReturnValue(['userA', 'userB']);
		previewStore.getPendingPreview.mockImplementation((uid) => ({
			studentProfileId: `profile_${uid}`,
			nodes: [],
			personalisationLevel: 'full',
			triggerReason: 'profile_submission',
		}));

		await generationService.__handleSigterm();

		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'userA', 'profile_userA', expect.stringContaining('restart')
		);
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'userB', 'profile_userB', expect.stringContaining('restart')
		);
		expect(previewStore.clearPendingPreview).toHaveBeenCalledWith('userA');
		expect(previewStore.clearPendingPreview).toHaveBeenCalledWith('userB');
	});

	test('falls back to upsertFailed when no preview found for userId', async () => {
		previewStore.getAllPendingUserIds.mockReturnValue(['userC']);
		previewStore.getPendingPreview.mockReturnValue(null);

		await generationService.__handleSigterm();

		expect(roadmapService.upsertFailed).toHaveBeenCalledWith(
			'userC', expect.stringContaining('restart')
		);
	});
});

// ---------------------------------------------------------------------------
// Gap-2: completedCourseCodes forwarded to validator
// ---------------------------------------------------------------------------

describe('generation.service -- Gap-2 completedCourses in validator', () => {
	test('passes completedCourseCodes Set to validateTopologicalOrder', async () => {
		StudentProfile.findOne.mockResolvedValue({
			...mockProfile,
			completedCourses: [{ courseCode: 'INT1000' }],
		});
		await trigger('u-gap2-1');
		const callArgs = validationService.validateTopologicalOrder.mock.calls[0];
		expect(callArgs[2]).toBeInstanceOf(Set);
		expect(callArgs[2].has('INT1000')).toBe(true);
	});

	test('upsertFailedWithProfile is called when validator throws PREREQUISITE_VIOLATION', async () => {
		const prereqErr = new Error('Prerequisite INT9999 missing');
		prereqErr.code = 'PREREQUISITE_VIOLATION';
		validationService.validateTopologicalOrder.mockImplementation(() => { throw prereqErr; });
		await trigger('u-gap2-2');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-gap2-2', 'profileId1', expect.stringContaining('INT9999'), 'full'
		);
	});
});

// ---------------------------------------------------------------------------
// Gap-3: personalisationLevel in failure path
// ---------------------------------------------------------------------------

describe('generation.service -- Gap-3 personalisationLevel in failure path', () => {
	test('passes full personalisationLevel to upsertFailedWithProfile on Gemini error', async () => {
		mockGenerateContent.mockRejectedValue(new Error('Gemini error'));
		await trigger('u-gap3-full');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-gap3-full', 'profileId1', expect.stringContaining('Gemini error'), 'full'
		);
	});

	test('passes low personalisationLevel to upsertFailedWithProfile when course units fail to load', async () => {
		StudentProfile.findOne.mockResolvedValue({
			...mockProfile,
			careerGoal: { role: null, companyType: null },
		});
		CourseUnit.find.mockReturnValue({
			lean: jest.fn().mockRejectedValue(new Error('DB connection error')),
		});
		await trigger('u-gap3-low');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-gap3-low', 'profileId1', expect.stringContaining('DB connection error'), 'low'
		);
	});
});

// ---------------------------------------------------------------------------
// Gap-5: retryGeneration returns 409 CONFLICT when no retryable roadmap exists
// ---------------------------------------------------------------------------

describe('generation.service -- Gap-5 retryGeneration no retryable roadmap', () => {
	const controller = require('../../../src/modules/roadmap/roadmap.controller');

	function mockRes() {
		const res = { statusCode: null, body: null };
		res.status = (code) => { res.statusCode = code; return res; };
		res.json = (data) => { res.body = data; return res; };
		return res;
	}

	test('returns 409 CONFLICT when no failed roadmap found to retry', async () => {
		roadmapService.getRetryableByUser = jest.fn().mockResolvedValue(null);

		const req = { user: { userId: 'u-gap5-1' } };
		const res = mockRes();
		await controller.retryGeneration(req, res);

		expect(res.statusCode).toBe(409);
		expect(res.body.error.code).toBe('CONFLICT');
	});
});

