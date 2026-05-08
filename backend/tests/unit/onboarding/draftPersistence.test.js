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

describe('draft persistence', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('upsertDraft writes draft with canonicalized courses', async () => {
		StudentProfile.findOne.mockResolvedValueOnce(null);
		Program.findOne.mockResolvedValueOnce({ programId: 'CNTT-STANDARD', nameEN: 'Computer Science' });
		CourseUnit.find.mockResolvedValueOnce([{ code: 'INT2204' }]);
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce({ _id: 'p1' });

		await onboardingService.upsertDraft('u1', {
			major: 'Computer Science',
			completedCourses: [
				{ major: 'Computer Science', courseCode: 'INT2204' },
				{ major: 'Computer Science', courseCode: 'INT2204' },
			],
		});

		const [, update] = StudentProfile.findOneAndUpdate.mock.calls[0];
		expect(update.$set.completedCourses).toHaveLength(1);
	});

	test('upsertDraft throws 403 when profile already submitted', async () => {
		StudentProfile.findOne.mockResolvedValueOnce({ isDraft: false });
		await expect(onboardingService.upsertDraft('u1', { major: 'CS' })).rejects.toMatchObject({ status: 403 });
	});
});
