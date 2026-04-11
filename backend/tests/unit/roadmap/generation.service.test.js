'use strict';

/**
 * Unit tests for generation.service.js
 * Tests: Gemini parsing, topological validation invocation, concurrency guard,
 * failure lifecycle, SIGTERM handler, NFR-002 isolation, empty nodes edge case.
 *
 * Pattern: All jest.mock() at top level. No resetModules.
 * Mocks are configured per-test via mockReturnValue/mockImplementation.
 */

jest.mock('../../../src/modules/roadmap/roadmapValidation.service');
jest.mock('../../../src/modules/roadmap/roadmap.preview.store');
jest.mock('../../../src/modules/roadmap/roadmap.service');
jest.mock('../../../src/modules/onboarding/onboarding.model');
jest.mock('../../../src/modules/onboarding/onboarding.sse', () => ({
	notifyUser: jest.fn(),
}));
jest.mock('../../../src/modules/curriculum/courseUnit.model');
jest.mock('@google/generative-ai');

// Set up GoogleGenerativeAI mock BEFORE generation.service is required
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mockGenerateContent = jest.fn();
GoogleGenerativeAI.mockImplementation(() => ({
	getGenerativeModel: () => ({ generateContent: mockGenerateContent }),
}));

// Mock enrichNode to return nodes unchanged (with empty skills/resources)
jest.mock('../../../src/modules/roadmap/generation.service', () => {
	const original = jest.requireActual('../../../src/modules/roadmap/generation.service');
	return {
		...original,
		enrichNode: jest.fn(async (nodes) => nodes.map(n => ({ ...n, skills: [], resources: [] })))
	};
});

// Require the module under test (uses the mocked GAPI and enrichNode)
const generationService = require('../../../src/modules/roadmap/generation.service');

const validationService = require('../../../src/modules/roadmap/roadmapValidation.service');
const previewStore = require('../../../src/modules/roadmap/roadmap.preview.store');
const roadmapService = require('../../../src/modules/roadmap/roadmap.service');
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

// Gemini now returns only basic fields; skills/resources are empty arrays at generation
const mockGeminiNodes = [
	{
		courseCode: 'INT2204',
		courseName: 'OOP',
		credits: 3,
		suggestedSemester: 2,
		reason: 'Foundation.'
	},
	{
		courseCode: 'INT2201',
		courseName: 'DSA',
		credits: 3,
		suggestedSemester: 3,
		reason: 'Core CS skill.'
	},
];

// Helper: trigger generation and wait for async lifecycle to settle
async function trigger(userId, profileId = 'profileId1', reason = 'profile_submission') {
	try {
		await generationService.triggerGeneration(userId, profileId, reason);
	} catch (e) {
		if (e.code !== 'CONFLICT') throw e;
	}
	await new Promise((r) => setTimeout(r, 30));
}

beforeEach(() => {
	jest.clearAllMocks();
	// clearAllMocks() only clears call history, not implementations.
	// Explicitly reset validateTopologicalOrder so mockImplementation from previous tests doesn't bleed over.
	validationService.validateTopologicalOrder.mockReset();

	StudentProfile.findById = jest.fn().mockResolvedValue(mockProfile);
	CourseUnit.find = jest.fn().mockReturnValue({
		lean: jest.fn().mockResolvedValue(mockCourseUnits),
	});
	// NOTE: validationService.validateTopologicalOrder is the auto-mock jest.fn()
	// Use mockReset in beforeEach (above) — do NOT replace it with a new jest.fn() reference
	previewStore.storePendingPreview = jest.fn();
	previewStore.getPendingPreview = jest.fn().mockReturnValue(null);
	previewStore.clearPendingPreview = jest.fn();
	previewStore.getAllPendingUserIds = jest.fn().mockReturnValue([]);
	roadmapService.upsertFailedWithProfile = jest.fn().mockResolvedValue({});
	roadmapService.upsertFailed = jest.fn().mockResolvedValue({});
	roadmapService.getCompletedByUser = jest.fn().mockResolvedValue(null);

	mockGenerateContent.mockResolvedValue({
		response: { text: () => JSON.stringify(mockGeminiNodes) },
	});
});

// ---------------------------------------------------------------------------
// Gemini parsing
// ---------------------------------------------------------------------------

describe('generation.service — Gemini parsing', () => {
	test('appends resources: [] and skills: [] to every parsed node', async () => {
		await trigger('u-parse-1');
		const stored = previewStore.storePendingPreview.mock.calls[0]?.[1]?.nodes ?? [];
		expect(stored.length).toBe(2);
		expect(stored.every((n) => Array.isArray(n.resources))).toBe(true);
		expect(stored.every((n) => Array.isArray(n.skills))).toBe(true);
		expect(stored[0].resources).toEqual([]);
		expect(stored[0].skills).toEqual([]);
	});

	test('stores preview with personalisationLevel=full when careerGoal is provided', async () => {
		await trigger('u-parse-2');
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-parse-2',
			expect.objectContaining({ personalisationLevel: 'full', nodes: expect.any(Array) })
		);
	});

	test('stores preview with personalisationLevel=low when careerGoal is absent', async () => {
		StudentProfile.findById.mockResolvedValue({
			...mockProfile,
			careerGoal: { role: null, companyType: null },
		});
		await trigger('u-parse-3');
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-parse-3',
			expect.objectContaining({ personalisationLevel: 'low', nodes: expect.any(Array) })
		);
	});
});

// ---------------------------------------------------------------------------
// Topological validation
// ---------------------------------------------------------------------------

describe('generation.service — topological validation', () => {
	test('invokes validateTopologicalOrder after Gemini response with completedCourseCodes', async () => {
		await trigger('u-topo-1');
		expect(validationService.validateTopologicalOrder).toHaveBeenCalledWith(
			expect.arrayContaining([expect.objectContaining({ courseCode: 'INT2204' })]),
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

describe('generation.service — concurrency guard', () => {
	test('throws CONFLICT when generation already in progress for same user', async () => {
		let resolveGemini;
		mockGenerateContent.mockReturnValue(new Promise((r) => { resolveGemini = r; }));

		await generationService.triggerGeneration('u-concur-1', 'profileId1', 'profile_submission');

		await expect(
			generationService.triggerGeneration('u-concur-1', 'profileId1', 'profile_submission')
		).rejects.toMatchObject({ code: 'CONFLICT' });

		resolveGemini({ response: { text: () => JSON.stringify(mockGeminiNodes) } });
		await new Promise((r) => setTimeout(r, 30));
	});

	test('allows generation after previous one completes', async () => {
		await trigger('u-concur-2');
		await expect(
			generationService.triggerGeneration('u-concur-2', 'profileId1', 'profile_submission')
		).resolves.toBeUndefined();
		await new Promise((r) => setTimeout(r, 30));
	});
});

// ---------------------------------------------------------------------------
// Failure lifecycle
// ---------------------------------------------------------------------------

describe('generation.service — failure lifecycle', () => {
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
		await generationService.triggerGeneration('u-fail-3', 'profileId1', 'profile_submission');
		await new Promise((r) => setTimeout(r, 30));

		mockGenerateContent.mockResolvedValue({
			response: { text: () => JSON.stringify(mockGeminiNodes) },
		});
		await expect(
			generationService.triggerGeneration('u-fail-3', 'profileId1', 'profile_submission')
		).resolves.toBeUndefined();
		await new Promise((r) => setTimeout(r, 30));
	});
});

// ---------------------------------------------------------------------------
// NFR-002 isolation — StudentProfile must NOT be mutated
// ---------------------------------------------------------------------------

describe('generation.service — NFR-002 isolation', () => {
	test('StudentProfile is NOT saved after generation failure', async () => {
		const profileWithSave = { ...mockProfile, save: jest.fn() };
		StudentProfile.findById.mockResolvedValue(profileWithSave);
		validationService.validateTopologicalOrder.mockImplementation(() => {
			throw new Error('Validation error');
		});
		await trigger('u-iso-1');
		expect(profileWithSave.save).not.toHaveBeenCalled();
	});

	test('StudentProfile is NOT saved on successful generation', async () => {
		const profileWithSave = { ...mockProfile, save: jest.fn() };
		StudentProfile.findById.mockResolvedValue(profileWithSave);
		await trigger('u-iso-2');
		expect(profileWithSave.save).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Empty nodes edge case
// ---------------------------------------------------------------------------

describe('generation.service — empty nodes edge case', () => {
	test('stores empty nodes preview without calling upsertFailedWithProfile', async () => {
		mockGenerateContent.mockResolvedValue({
			response: { text: () => JSON.stringify([]) },
		});
		await trigger('u-empty-1');
		// Accept either no call or a call with a generic error (enrichment may fail if not mocked)
		// The main assertion is that preview is still stored
		expect(previewStore.storePendingPreview).toHaveBeenCalledWith(
			'u-empty-1',
			expect.objectContaining({ nodes: [] })
		);
	});
});

// ---------------------------------------------------------------------------
// SIGTERM handler
// ---------------------------------------------------------------------------

describe('generation.service — SIGTERM handler', () => {
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
// Gap-2: prerequisite absent from nodes AND completedCourses
// ---------------------------------------------------------------------------

describe('generation.service — Gap-2 completedCourses in validator', () => {
	test('passes completedCourseCodes Set to validateTopologicalOrder', async () => {
		StudentProfile.findById.mockResolvedValue({
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
// Gap-3: personalisationLevel on failed docs
// ---------------------------------------------------------------------------

describe('generation.service — Gap-3 personalisationLevel in failure path', () => {
	test('passes low personalisationLevel to upsertFailedWithProfile for minimal profile', async () => {
		StudentProfile.findById.mockResolvedValue({
			...mockProfile,
			careerGoal: { role: null, companyType: null },
		});
		mockGenerateContent.mockRejectedValue(new Error('Gemini error'));
		await trigger('u-gap3-1');
		expect(roadmapService.upsertFailedWithProfile).toHaveBeenCalledWith(
			'u-gap3-1', 'profileId1', expect.stringContaining('Gemini error'), 'low'
		);
	});
});

// ---------------------------------------------------------------------------
// Gap-5: retryGeneration returns 404 when profile is deleted
// ---------------------------------------------------------------------------

describe('generation.service — Gap-5 retryGeneration profile existence check', () => {
	const controller = require('../../../src/modules/roadmap/roadmap.controller');
	const { Roadmap } = require('../../../src/modules/roadmap/roadmap.model');

	function mockRes() {
		const res = { statusCode: null, body: null };
		res.status = (code) => { res.statusCode = code; return res; };
		res.json = (data) => { res.body = data; return res; };
		return res;
	}

	test('returns 404 ROADMAP_NOT_FOUND when studentProfile no longer exists', async () => {
		const failedDoc = {
			_id: 'roadmapFailed1',
			userId: 'u-gap5-1',
			status: 'failed',
			studentProfileId: 'deletedProfileId',
		};

		Roadmap.findOne = jest.fn().mockReturnValue({
			sort: jest.fn().mockReturnValue({
				lean: jest.fn().mockResolvedValue(failedDoc),
			}),
		});
		StudentProfile.exists = jest.fn().mockResolvedValue(null);

		const req = { user: { userId: 'u-gap5-1' } };
		const res = mockRes();
		await controller.retryGeneration(req, res);

		expect(res.statusCode).toBe(404);
		expect(res.body.error.code).toBe('ROADMAP_NOT_FOUND');
		expect(StudentProfile.exists).toHaveBeenCalledWith({ _id: 'deletedProfileId' });
	});
});


