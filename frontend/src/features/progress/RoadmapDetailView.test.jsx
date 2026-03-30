describe('RoadmapDetailView grouping contract', () => {
  function getGroupSizes(detail) {
    return {
      done: (detail?.nodes?.done || []).length,
      inProgress: (detail?.nodes?.inProgress || []).length,
      pending: (detail?.nodes?.pending || []).length,
    };
  }

  test('shows empty groups as size 0', () => {
    const sizes = getGroupSizes({ nodes: { done: [], inProgress: [], pending: [] } });
    expect(sizes).toEqual({ done: 0, inProgress: 0, pending: 0 });
  });

  test('counts nodes in all groups', () => {
    const sizes = getGroupSizes({
      nodes: {
        done: [{ id: 1 }, { id: 2 }],
        inProgress: [{ id: 3 }],
        pending: [{ id: 4 }, { id: 5 }, { id: 6 }],
      },
    });

    expect(sizes).toEqual({ done: 2, inProgress: 1, pending: 3 });
  });
});
