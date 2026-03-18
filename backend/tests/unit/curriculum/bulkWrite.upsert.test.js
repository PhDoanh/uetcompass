jest.mock('../../../src/modules/curriculum/courseUnit.model', () => ({
	CourseUnit: {
		bulkWrite: jest.fn(),
	},
}));

const { CourseUnit } = require('../../../src/modules/curriculum/courseUnit.model');
const {
	buildBulkUpsertOps,
	upsertCourseUnits,
} = require('../../../src/modules/curriculum/seed.pipeline');

describe('CourseUnit bulkWrite upsert', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	test('builds updateOne+upsert ops with full $set payload', () => {
		const units = [
			{ code: 'INT1001', major: 'CNTT', name: 'A', credits: 3, prerequisites: [] },
			{ code: 'INT1002', major: 'CNTT', name: 'B', credits: 3, prerequisites: ['INT1001'] },
		];

		const ops = buildBulkUpsertOps(units);
		expect(ops).toHaveLength(2);
		expect(ops[0]).toEqual({
			updateOne: {
				filter: { code: 'INT1001', major: 'CNTT' },
				update: { $set: units[0] },
				upsert: true,
			},
		});
	});

	test('calls CourseUnit.bulkWrite with ordered=false', async () => {
		CourseUnit.bulkWrite.mockResolvedValue({ matchedCount: 1, upsertedCount: 1 });
		const units = [{ code: 'INT1001', major: 'CNTT', name: 'A', credits: 3, prerequisites: [] }];

		await upsertCourseUnits(units);

		expect(CourseUnit.bulkWrite).toHaveBeenCalledWith(expect.any(Array), { ordered: false });
	});
});
