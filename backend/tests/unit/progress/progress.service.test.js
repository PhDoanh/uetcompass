const progressService = require('../../../src/modules/progress/progress.service');

describe('progress.service computeProgressPercent', () => {
  test('returns 0 when totalNodes is 0', () => {
    expect(progressService.computeProgressPercent(0, 0)).toBe(0);
    expect(progressService.computeProgressPercent(5, 0)).toBe(0);
  });

  test('rounds done/total to nearest integer percent', () => {
    expect(progressService.computeProgressPercent(1, 3)).toBe(33);
    expect(progressService.computeProgressPercent(2, 3)).toBe(67);
    expect(progressService.computeProgressPercent(10, 10)).toBe(100);
  });
});
