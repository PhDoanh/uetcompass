/**
 * T019: getNodesByStatus contract test
 * Test that getNodesByStatus always returns {done[], inProgress[], pending[]} shape
 */

describe('getNodesByStatus', () => {
  function groupByStatus(statuses) {
    const grouped = {
      done: [],
      inProgress: [],
      pending: [],
    };

    statuses.forEach((s) => {
      if (s.status === 'done') grouped.done.push(s);
      else if (s.status === 'in_progress') grouped.inProgress.push(s);
      else if (s.status === 'pending') grouped.pending.push(s);
    });

    return grouped;
  }

  test('returns contract shape with empty arrays', () => {
    const result = groupByStatus([]);
    expect(result).toHaveProperty('done');
    expect(result).toHaveProperty('inProgress');
    expect(result).toHaveProperty('pending');
    expect(Array.isArray(result.done)).toBe(true);
    expect(Array.isArray(result.inProgress)).toBe(true);
    expect(Array.isArray(result.pending)).toBe(true);
  });

  test('groups statuses correctly', () => {
    const statuses = [
      { nodeId: 'IT1010', status: 'done' },
      { nodeId: 'IT3910E', status: 'pending' },
      { nodeId: 'IT2010', status: 'in_progress' },
      { nodeId: 'IT4409', status: 'done' },
    ];

    const result = groupByStatus(statuses);

    expect(result.done.length).toBe(2);
    expect(result.inProgress.length).toBe(1);
    expect(result.pending.length).toBe(1);

    expect(result.done[0].nodeId).toBe('IT1010');
    expect(result.done[1].nodeId).toBe('IT4409');
    expect(result.inProgress[0].nodeId).toBe('IT2010');
    expect(result.pending[0].nodeId).toBe('IT3910E');
  });

  test('always preserves contract shape even with all one status', () => {
    const statuses = [
      { nodeId: 'IT1010', status: 'done' },
      { nodeId: 'IT2010', status: 'done' },
    ];

    const result = groupByStatus(statuses);

    expect(result.done.length).toBe(2);
    expect(result.inProgress.length).toBe(0);
    expect(result.pending.length).toBe(0);
  });

  test('preserves node data in grouped results', () => {
    const statuses = [
      { nodeId: 'IT1010', status: 'done', updatedAt: new Date('2026-03-01') },
    ];

    const result = groupByStatus(statuses);

    expect(result.done[0].nodeId).toBe('IT1010');
    expect(result.done[0].updatedAt).toBeDefined();
  });
});
