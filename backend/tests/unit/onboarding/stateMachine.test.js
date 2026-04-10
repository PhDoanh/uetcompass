jest.mock('../../../src/modules/onboarding/onboarding.model', () => ({
	StudentProfile: {
		findOne: jest.fn(),
		findOneAndUpdate: jest.fn(),
	},
}));

const { StudentProfile } = require('../../../src/modules/onboarding/onboarding.model');
const onboardingService = require('../../../src/modules/onboarding/onboarding.service');

describe('StudentProfile state transitions', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('submit returns 400 when major missing', async () => {
		await expect(onboardingService.submitProfile('u1', {})).rejects.toMatchObject({ status: 400 });
	});

	test('submit returns 409 when already submitted', async () => {
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce(null);
		await expect(onboardingService.submitProfile('u1', { major: 'Computer Science' })).rejects.toMatchObject({
			status: 409,
		});
	});

	test('submit accepts major-only payload and returns generic mode', async () => {
		StudentProfile.findOneAndUpdate.mockResolvedValueOnce({ _id: 'p1', isDraft: false });
		const result = await onboardingService.submitProfile('u1', { major: 'Computer Science' });
		expect(result.isGeneric).toBe(true);
	});
});
