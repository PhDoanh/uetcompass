describe('seed job', () => {
	beforeEach(() => {
		jest.resetModules();
		process.env.NODE_ENV = 'test';
	});

	test('manual trigger throws in production', async () => {
		process.env.NODE_ENV = 'production';
		jest.doMock('../../../src/modules/curriculum/seed.pipeline', () => ({
			runSeedPipeline: jest.fn(),
		}));
		jest.doMock('node-cron', () => ({ schedule: jest.fn(), validate: jest.fn(() => true) }));

		const { triggerManually } = require('../../../src/modules/curriculum/seed.job');
		await expect(triggerManually()).rejects.toThrow('Manual trigger is not available in production');
	});

	test('manual trigger returns mapped exit code', async () => {
		jest.doMock('../../../src/modules/curriculum/seed.pipeline', () => ({
			runSeedPipeline: jest.fn(async () => ({ exitStatus: 'SUCCESS' })),
		}));
		jest.doMock('node-cron', () => ({ schedule: jest.fn(), validate: jest.fn(() => true) }));

		const { triggerManually } = require('../../../src/modules/curriculum/seed.job');
		const result = await triggerManually();
		expect(result.exitCode).toBe(0);
	});

	test('cron registration schedules shared pipeline handler', () => {
		const schedule = jest.fn(() => ({ stop: jest.fn() }));
		const validate = jest.fn(() => true);
		jest.doMock('node-cron', () => ({ schedule, validate }));
		jest.doMock('../../../src/modules/curriculum/curriculum.config', () => ({
			cronSchedule: '0 0 1 3,8 *',
			DEFAULT_CRON_SCHEDULE: '0 0 1 3,8 *',
		}));
		jest.doMock('../../../src/modules/curriculum/seed.pipeline', () => ({
			runSeedPipeline: jest.fn(async () => ({ exitStatus: 'SUCCESS' })),
		}));

		const { registerCronJob } = require('../../../src/modules/curriculum/seed.job');
		registerCronJob();

		expect(validate).toHaveBeenCalledWith('0 0 1 3,8 *');
		expect(schedule).toHaveBeenCalledTimes(1);
		expect(schedule).toHaveBeenCalledWith('0 0 1 3,8 *', expect.any(Function));
	});
});
