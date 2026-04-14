const {
	upsertCourseUnits,
} = require('../../../src/modules/curriculum/seed.pipeline.persistence');

const CourseUnit = {
	bulkWrite: jest.fn(),
};

describe('CourseUnit bulkWrite upsert', () => {
	afterEach(() => {
		jest.clearAllMocks();
	});

	test('calls CourseUnit.bulkWrite with ordered=false', async () => {
		CourseUnit.bulkWrite.mockResolvedValue({ matchedCount: 1, upsertedCount: 1 });
		const units = [{ code: 'INT1001', programId: 'CNTT', name: 'A', credits: 3, prerequisites: [] }];

		await upsertCourseUnits(CourseUnit, units);

		expect(CourseUnit.bulkWrite).toHaveBeenCalledWith(expect.any(Array), { ordered: false });
		expect(CourseUnit.bulkWrite.mock.calls[0][0][0]).toEqual({
			updateOne: {
				filter: { code: 'INT1001', programId: 'CNTT' },
				update: {
					$set: units[0],
					$currentDate: { seededAt: true },
				},
				upsert: true,
			},
		});
	});
});
