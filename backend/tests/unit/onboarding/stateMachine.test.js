jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
	StudentProfile: {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
}));

jest.mock('../../../src/modules/curriculum/program.model', () => ({
	Program: {
		findOne: jest.fn(),
		find: jest.fn(),
	},
}));

jest.mock('../../../src/modules/curriculum/courseUnit.model', () => ({
	CourseUnit: {
		find: jest.fn(),
	},
}));

const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const { Program } = require('../../../src/modules/curriculum/program.model');
const { CourseUnit } = require('../../../src/modules/curriculum/courseUnit.model');
const onboardingService = require('../../../src/modules/onboarding/onboarding.service');

describe('StudentProfile state transitions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('submit returns 400 when major missing', async () => {
		await expect(onboardingService.submitProfile('u1', {})).rejects.toMatchObject({ status: 400 });
	});

	test('submit returns 409 when already submitted', async () => {
		Program.findOne.mockResolvedValueOnce({ programId: 'CNTT-STANDARD', nameEN: 'Computer Science' });
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce(null);
		await expect(onboardingService.submitProfile('u1', { major: 'Computer Science' })).rejects.toMatchObject({
			status: 409,
		});
	});

	test('submit accepts major-only payload and returns generic mode', async () => {
		Program.findOne.mockResolvedValueOnce({ programId: 'CNTT-STANDARD', nameEN: 'Computer Science' });
		CourseUnit.find.mockResolvedValueOnce([]);
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce({ _id: 'p1', isDraft: false });
		const result = await onboardingService.submitProfile('u1', { major: 'Computer Science' });
		expect(result.isGeneric).toBe(true);
	});

	test('submit rejects role not in selected program career tracks', async () => {
		Program.findOne.mockResolvedValueOnce({
			programId: 'CNTT-STANDARD',
			nameEN: 'Computer Science',
			careerTracks: ['Backend Engineer', 'Data Engineer'],
		});

		await expect(onboardingService.submitProfile('u1', {
			major: 'Computer Science',
			careerGoal: {
				role: 'Frontend Engineer',
			},
		})).rejects.toMatchObject({ status: 400 });
	});

	test('submit accepts role from selected program career tracks', async () => {
		Program.findOne.mockResolvedValueOnce({
			programId: 'CNTT-STANDARD',
			nameEN: 'Computer Science',
			careerTracks: ['Backend Engineer', 'Data Engineer'],
		});
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce({ _id: 'p1', isDraft: false });

		await expect(onboardingService.submitProfile('u1', {
			major: 'Computer Science',
			careerGoal: {
				role: 'Backend Engineer',
			},
		})).resolves.toMatchObject({
			isGeneric: false,
		});
	});
});
