const fs = require('fs');
const os = require('os');
const path = require('path');

const { exportSkillsReview } = require('../../../src/modules/curriculum/skills.review.export');
const { applySkillsReview, validateReviewPayload } = require('../../../src/modules/curriculum/skills.review.apply');

describe('skills review scripts', () => {
	test('exports editable JSON payload shape', async () => {
		const filePath = path.join(os.tmpdir(), `skills-review-${Date.now()}.json`);
		const CourseUnitModel = {
			find: jest.fn(() => ({
				select: jest.fn(() => ({
					lean: jest.fn(async () => [
						{ programId: 'P1', code: 'INT1001', name: 'Intro', skills: ['oop'], careerTracks: ['t1'] },
					]),
				})),
			})),
		};

		const result = await exportSkillsReview({ outputPath: filePath }, { CourseUnitModel });
		expect(result.recordCount).toBe(1);

		const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
		expect(Array.isArray(payload.items)).toBe(true);
		expect(payload.items[0]).toEqual(
			expect.objectContaining({
				programId: 'P1',
				code: 'INT1001',
				skills: ['oop'],
				validatedBy: null,
			})
		);
	});

	test('applies review updates with optimistic ai-inferred guard', async () => {
		const filePath = path.join(os.tmpdir(), `skills-apply-${Date.now()}.json`);
		fs.writeFileSync(
			filePath,
			JSON.stringify({
				items: [
					{ programId: 'P1', code: 'INT1001', skills: ['oop'], validatedBy: 'qa', validationNote: 'ok' },
				],
			}),
			'utf8'
		);

		const CourseUnitModel = {
			updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
		};

		const result = await applySkillsReview({ filePath }, { CourseUnitModel });
		expect(result.applied).toBe(1);
		expect(CourseUnitModel.updateOne).toHaveBeenCalledWith(
			expect.objectContaining({
				code: 'INT1001',
				programId: 'P1',
				'enrichmentSource.scrapeType': 'ai-inferred',
			}),
			expect.any(Object)
		);
	});

	test('validateReviewPayload rejects invalid structure', () => {
		expect(() => validateReviewPayload({ items: [{ code: 'INT1001' }] })).toThrow();
	});
});
