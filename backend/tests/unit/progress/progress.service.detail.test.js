describe('progress detail grouping contract', () => {
  function normalizeDetail(detail) {
    return {
      roadmapId: detail.roadmapId,
      roadmapName: detail.roadmapName,
      nodes: {
        done: detail.nodes.done || [],
        inProgress: detail.nodes.inProgress || [],
        pending: detail.nodes.pending || [],
      },
    };
  }

  test('always returns done/inProgress/pending arrays', () => {
    const normalized = normalizeDetail({
      roadmapId: 'r1',
      roadmapName: 'Test',
      nodes: { done: [] },
    });

    expect(Array.isArray(normalized.nodes.done)).toBe(true);
    expect(Array.isArray(normalized.nodes.inProgress)).toBe(true);
    expect(Array.isArray(normalized.nodes.pending)).toBe(true);
  });

  test('preserves node payload shape for status groups', () => {
    const normalized = normalizeDetail({
      roadmapId: 'r1',
      roadmapName: 'Test',
      nodes: {
        done: [{ nodeId: 'n1', courseCode: 'INT101', status: 'done' }],
        inProgress: [{ nodeId: 'n2', courseCode: 'INT102', status: 'in_progress' }],
        pending: [{ nodeId: 'n3', courseCode: 'INT103', status: 'pending' }],
      },
    });

    expect(normalized.nodes.done[0].status).toBe('done');
    expect(normalized.nodes.inProgress[0].status).toBe('in_progress');
    expect(normalized.nodes.pending[0].status).toBe('pending');
  });
});
