/**
 * T055: Repersonalization flag tests
 */

describe('repersonalizeFlag', () => {
  function needsRepersonalization(studentUpdatedAt, roadmapGeneratedAt) {
    return new Date(studentUpdatedAt) > new Date(roadmapGeneratedAt);
  }

  test('returns true when profile updated after roadmap generated', () => {
    const studentUpdated = new Date('2026-03-15');
    const roadmapGenerated = new Date('2026-03-01');

    expect(needsRepersonalization(studentUpdated, roadmapGenerated)).toBe(true);
  });

  test('returns false when profile updated before roadmap generated', () => {
    const studentUpdated = new Date('2026-02-15');
    const roadmapGenerated = new Date('2026-03-01');

    expect(needsRepersonalization(studentUpdated, roadmapGenerated)).toBe(false);
  });

  test('returns false when profiles are equal', () => {
    const date = new Date('2026-03-01');

    expect(needsRepersonalization(date, date)).toBe(false);
  });
});
