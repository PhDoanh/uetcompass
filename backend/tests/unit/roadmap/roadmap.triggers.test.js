'use strict';

jest.mock('../../../src/modules/roadmap/generation.service', () => ({
	triggerGeneration: jest.fn().mockResolvedValue(undefined),
	isGenerating: jest.fn().mockReturnValue(false),
	__handleSigterm: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../src/modules/onboarding/onboarding.service', () => ({
	setRoadmapGenerationHandler: jest.fn(),
}));

const generationService = require('../../../src/modules/roadmap/generation.service');
const onboardingService = require('../../../src/modules/onboarding/onboarding.service');

describe('roadmap.triggers wiring', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test('registers roadmap generation handler on module load', () => {
		jest.isolateModules(() => {
			require('../../../src/modules/roadmap/roadmap.triggers');
		});

		expect(onboardingService.setRoadmapGenerationHandler).toHaveBeenCalledTimes(1);
		expect(onboardingService.setRoadmapGenerationHandler).toHaveBeenCalledWith(expect.any(Function));
	});

	test('handler triggers generation with profile_submission reason', async () => {
		let registeredHandler;
		onboardingService.setRoadmapGenerationHandler.mockImplementation((handler) => {
			registeredHandler = handler;
		});

		jest.isolateModules(() => {
			require('../../../src/modules/roadmap/roadmap.triggers');
		});

		expect(typeof registeredHandler).toBe('function');
		registeredHandler({ userId: 'u1', profileId: 'p1' });

		await new Promise((resolve) => setImmediate(resolve));
		expect(generationService.triggerGeneration).toHaveBeenCalledWith('u1', 'p1', 'profile_submission');
	});

	test('handler does not trigger generation when one is already active', () => {
		let registeredHandler;
		generationService.isGenerating.mockReturnValue(true);
		onboardingService.setRoadmapGenerationHandler.mockImplementation((handler) => {
			registeredHandler = handler;
		});

		jest.isolateModules(() => {
			require('../../../src/modules/roadmap/roadmap.triggers');
		});

		registeredHandler({ userId: 'u1', profileId: 'p1' });
		expect(generationService.triggerGeneration).not.toHaveBeenCalled();
	});
});
