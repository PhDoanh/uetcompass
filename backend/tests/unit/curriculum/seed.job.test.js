describe('seed job', () => {
	beforeEach(() => {
		jest.resetModules();
	});

	test('manual trigger throws in production', async () => {
		process.env.NODE_ENV = 'production';
		jest.doMock('../../../src/modules/curriculum/seed.pipeline', () => ({
			runSeedPipeline: jest.fn(),
		}));
		jest.doMock('node-cron', () => ({ schedule: jest.fn() }));

		const { triggerManually } = require('../../../src/modules/curriculum/seed.job');
		await expect(triggerManually()).rejects.toThrow('Manual trigger is not available in production');
	});

	test('cron registration schedules shared pipeline handler', () => {
		process.env.NODE_ENV = 'test';
		const schedule = jest.fn(() => ({ stop: jest.fn() }));
		jest.doMock('node-cron', () => ({ schedule }));
		jest.doMock('../../../src/modules/curriculum/curriculum.config', () => ({
			cronSchedule: '0 0 1 3,8 *',
		}));
		jest.doMock('../../../src/modules/curriculum/seed.pipeline', () => ({
			runSeedPipeline: jest.fn(async () => ({ exitStatus: 'SUCCESS' })),
		}));

		const { registerCronJob } = require('../../../src/modules/curriculum/seed.job');
		registerCronJob();

		expect(schedule).toHaveBeenCalledTimes(1);
		expect(schedule).toHaveBeenCalledWith('0 0 1 3,8 *', expect.any(Function));
	});
});
