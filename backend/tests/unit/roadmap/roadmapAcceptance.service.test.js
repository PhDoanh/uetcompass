'use strict';

/**
 * Unit tests for roadmapAcceptance.service.js
 * Tests: completed-course filter, prerequisite validation, all-completed guard,
 * happy-path commit, repersonalizationPending clear (US4).
 */

jest.mock('../../../src/modules/roadmap/roadmapValidation.service');
jest.mock('../../../src/modules/roadmap/roadmap.service');
jest.mock('../../../src/modules/onboarding/onboarding.model');
jest.mock('../../../src/modules/curriculum/courseUnit.model');

const { validateTopologicalOrder } = require('../../../src/modules/roadmap/roadmapValidation.service');
const roadmapService = require('../../../src/modules/roadmap/roadmap.service');
const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { CourseUnit } = require('../../../src/modules/curriculum/courseUnit.model');
const roadmapAcceptanceService = require('../../../src/modules/roadmap/roadmapAcceptance.service');

const mockNodes = [
	{
		courseCode: 'INT2204',
		courseName: 'OOP',
		credits: 3,
		suggestedSemester: 2,
		gainedSkills: ['OOP'],
		supportingSkills: ['SOLID'],
		reason: 'Foundation.',
		resources: [],
	},
	{
		courseCode: 'INT2201',
		courseName: 'DSA',
		credits: 3,
		suggestedSemester: 3,
		gainedSkills: ['Algorithms'],
		supportingSkills: ['Big-O'],
		reason: 'Core skill.',
		careerRelevanceNote: 'Backend systems.',
		resources: [],
	},
];

const mockCourseUnits = [
	{ code: 'INT2204', name: 'OOP', credits: 3, prerequisites: [] },
	{ code: 'INT2201', name: 'DSA', credits: 3, prerequisites: ['INT2204'] },
	{ code: 'INT2202', name: 'Completed', credits: 3, prerequisites: [] },
];

const mockProfile = {
	_id: 'profileId1',
	userId: 'userId1',
	completedCourses: [{ courseCode: 'INT2202', major: 'CS' }],
	careerGoal: { role: 'Backend Engineer', companyType: 'Product' },
	repersonalizationPending: false,
};

const mockCommittedRoadmap = {
	_id: 'roadmapId1',
	userId: 'userId1',
	status: 'completed',
	isPrimary: true,
	nodes: mockNodes,
};

beforeEach(() => {
	jest.clearAllMocks();
	validateTopologicalOrder.mockReturnValue(undefined);
	StudentProfile.findOne = jest.fn().mockResolvedValue({ ...mockProfile });
	StudentProfile.findOneAndUpdate = jest.fn().mockResolvedValue(null);
	CourseUnit.find = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(mockCourseUnits) });
	roadmapService.commitAccepted = jest.fn().mockResolvedValue(mockCommittedRoadmap);
});

describe('roadmapAcceptance.service — completed-course filter', () => {
	test('removes nodes whose courseCode is in completedCourses', async () => {
		const nodesWithCompleted = [
			...mockNodes,
			{
				courseCode: 'INT2202',
				courseName: 'Completed',
				credits: 3,
				suggestedSemester: 1,
				gainedSkills: [],
				supportingSkills: [],
				reason: 'Done.',
				careerRelevanceNote: 'N/A',
				resources: [],
			},
		];

		await roadmapAcceptanceService.acceptRoadmap('userId1', {
			studentProfileId: 'profileId1',
			personalisationLevel: 'full',
			isPrimary: true,
			nodes: nodesWithCompleted,
		});

		// validateTopologicalOrder should receive nodes WITHOUT INT2202, plus completedCodes Set
		const callArgs = validateTopologicalOrder.mock.calls[0];
		const filteredNodes = callArgs[0];
		expect(filteredNodes.map((n) => n.courseCode)).not.toContain('INT2202');
		expect(filteredNodes.map((n) => n.courseCode)).toContain('INT2204');
		expect(filteredNodes.map((n) => n.courseCode)).toContain('INT2201');
		// Gap-2: completedCodes Set is passed as 3rd arg
		expect(callArgs[2]).toBeInstanceOf(Set);
		expect(callArgs[2].has('INT2202')).toBe(true);
	});
});

describe('roadmapAcceptance.service — ALL_COMPLETED guard', () => {
	test('throws ALL_COMPLETED when all submitted nodes are completed', async () => {
		const allCompletedNodes = [
			{
				courseCode: 'INT2202',
				courseName: 'Completed',
				credits: 3,
				suggestedSemester: 1,
				gainedSkills: [],
				supportingSkills: [],
				reason: 'Done.',
				careerRelevanceNote: 'N/A',
				resources: [],
			},
		];

		await expect(
			roadmapAcceptanceService.acceptRoadmap('userId1', {
				studentProfileId: 'profileId1',
				personalisationLevel: 'full',
				isPrimary: true,
				nodes: allCompletedNodes,
			})
		).rejects.toMatchObject({ code: 'ALL_COMPLETED' });
	});
});

describe('roadmapAcceptance.service — prerequisite validation', () => {
	test('throws PREREQUISITE_VIOLATION when validateTopologicalOrder throws', async () => {
		const violationErr = new Error('Ordering violation');
		violationErr.code = 'PREREQUISITE_VIOLATION';
		validateTopologicalOrder.mockImplementation(() => { throw violationErr; });

		await expect(
			roadmapAcceptanceService.acceptRoadmap('userId1', {
				studentProfileId: 'profileId1',
				personalisationLevel: 'full',
				isPrimary: true,
				nodes: mockNodes,
			})
		).rejects.toMatchObject({ code: 'PREREQUISITE_VIOLATION' });

		expect(roadmapService.commitAccepted).not.toHaveBeenCalled();
	});
});

describe('roadmapAcceptance.service — happy path', () => {
	test('calls commitAccepted with correct payload on success', async () => {
		const result = await roadmapAcceptanceService.acceptRoadmap('userId1', {
			studentProfileId: 'profileId1',
			personalisationLevel: 'full',
			isPrimary: true,
			nodes: mockNodes,
		});

		expect(roadmapService.commitAccepted).toHaveBeenCalledWith(
			'userId1',
			expect.objectContaining({
				studentProfileId: 'profileId1',
				personalisationLevel: 'full',
				isPrimary: true,
				nodes: expect.arrayContaining([
					expect.objectContaining({ courseCode: 'INT2204' }),
				]),
			})
		);
		expect(result).toEqual(mockCommittedRoadmap);
	});

	test('returns the committed roadmap document', async () => {
		const result = await roadmapAcceptanceService.acceptRoadmap('userId1', {
			studentProfileId: 'profileId1',
			personalisationLevel: 'full',
			isPrimary: true,
			nodes: mockNodes,
		});

		expect(result.status).toBe('completed');
		expect(result.isPrimary).toBe(true);
	});
});

describe('roadmapAcceptance.service — US4 repersonalizationPending clear', () => {
	test('clears repersonalizationPending flag on StudentProfile after successful commit', async () => {
		StudentProfile.findOne = jest.fn().mockResolvedValue({
			...mockProfile,
			repersonalizationPending: true,
		});

		await roadmapAcceptanceService.acceptRoadmap('userId1', {
			studentProfileId: 'profileId1',
			personalisationLevel: 'full',
			isPrimary: true,
			nodes: mockNodes,
		});

		expect(StudentProfile.findOneAndUpdate).toHaveBeenCalledWith(
			{ _id: 'profileId1', userId: 'userId1' },
			{ $set: { repersonalizationPending: false } }
		);
	});

	test('does not throw if repersonalizationPending clear fails', async () => {
		StudentProfile.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('DB error'));

		// Should not propagate the error — acceptance is already committed
		await expect(
			roadmapAcceptanceService.acceptRoadmap('userId1', {
				studentProfileId: 'profileId1',
				personalisationLevel: 'full',
				isPrimary: true,
				nodes: mockNodes,
			})
		).resolves.toBeTruthy();
	});
});

// ---------------------------------------------------------------------------
// Gap-1: input validation in controller (acceptRoadmapHandler)
// ---------------------------------------------------------------------------

describe('roadmapAcceptance — Gap-1 controller input validation', () => {
	// These tests exercise the controller layer which wraps acceptRoadmap
	const controller = require('../../../src/modules/roadmap/roadmap.controller');

	function mockRes() {
		const res = { statusCode: null, body: null };
		res.status = (code) => { res.statusCode = code; return res; };
		res.json = (data) => { res.body = data; return res; };
		return res;
	}

	test('returns 400 INVALID_PAYLOAD when nodes is not an array', async () => {
		const req = { user: { userId: 'u1' }, body: { studentProfileId: 'p1', personalisationLevel: 'full', nodes: 'not-array' } };
		const res = mockRes();
		await controller.acceptRoadmapHandler(req, res);
		expect(res.statusCode).toBe(400);
		expect(res.body.error.code).toBe('INVALID_PAYLOAD');
	});

	test('returns 400 INVALID_PAYLOAD when nodes is null', async () => {
		const req = { user: { userId: 'u1' }, body: { studentProfileId: 'p1', personalisationLevel: 'full', nodes: null } };
		const res = mockRes();
		await controller.acceptRoadmapHandler(req, res);
		expect(res.statusCode).toBe(400);
		expect(res.body.error.code).toBe('INVALID_PAYLOAD');
	});

	test('returns 400 INVALID_PAYLOAD when studentProfileId is missing', async () => {
		const req = { user: { userId: 'u1' }, body: { personalisationLevel: 'full', nodes: [] } };
		const res = mockRes();
		await controller.acceptRoadmapHandler(req, res);
		expect(res.statusCode).toBe(400);
		expect(res.body.error.code).toBe('INVALID_PAYLOAD');
	});

	test('returns 400 INVALID_PAYLOAD when personalisationLevel is invalid', async () => {
		const req = { user: { userId: 'u1' }, body: { studentProfileId: 'p1', personalisationLevel: 'medium', nodes: [] } };
		const res = mockRes();
		await controller.acceptRoadmapHandler(req, res);
		expect(res.statusCode).toBe(400);
		expect(res.body.error.code).toBe('INVALID_PAYLOAD');
	});
});
