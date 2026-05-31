describe('useProgressSSE merge logic', () => {
  function mergeSummaryIntoRoadmaps(currentRoadmaps, incomingSummary) {
    const list = Array.isArray(currentRoadmaps) ? currentRoadmaps : [];
    const next = incomingSummary || null;
    if (!next?.roadmapId) return list;

    const index = list.findIndex((item) => item.roadmapId === next.roadmapId);
    if (index < 0) return [next, ...list];

    const updated = list.slice();
    updated[index] = { ...updated[index], ...next };
    return updated;
  }

  test('updates existing roadmap by roadmapId', () => {
    const merged = mergeSummaryIntoRoadmaps(
      [{ roadmapId: 'r1', progressPercent: 20 }, { roadmapId: 'r2', progressPercent: 40 }],
      { roadmapId: 'r2', progressPercent: 55 }
    );

    expect(merged[1].progressPercent).toBe(55);
  });

  test('prepends new roadmap when not found', () => {
    const merged = mergeSummaryIntoRoadmaps([{ roadmapId: 'r1' }], { roadmapId: 'r2' });
    expect(merged[0].roadmapId).toBe('r2');
    expect(merged[1].roadmapId).toBe('r1');
  });
});
