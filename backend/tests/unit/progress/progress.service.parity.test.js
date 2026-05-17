const { computeProgressPercent } = require('../../../src/modules/progress/progress.service');

describe('progress percentage parity', () => {
  function skillTreePercent(done, total) {
    if (!total) return 0;
    return Math.round((done / total) * 100);
  }

  test('progress cache percent matches skill-tree formula within ±1pp', () => {
    const fixtures = [
      { done: 0, total: 0 },
      { done: 1, total: 3 },
      { done: 2, total: 3 },
      { done: 8, total: 24 },
      { done: 24, total: 24 },
    ];

    fixtures.forEach(({ done, total }) => {
      const fromProgress = computeProgressPercent(done, total);
      const fromSkillTree = skillTreePercent(done, total);
      expect(Math.abs(fromProgress - fromSkillTree)).toBeLessThanOrEqual(1);
    });
  });
});
