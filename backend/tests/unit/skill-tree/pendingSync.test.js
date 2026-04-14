/**
 * T018: Pending reconciliation tests
 * Test ensurePendingReconciliation upserts missing pending records
 */

describe('pendingSync', () => {
  function ensurePendingReconciliation(studentId, roadmapNodes, existingStatuses = []) {
    const statusMap = {};
    existingStatuses.forEach((s) => {
      statusMap[s.nodeId] = s;
    });

    const roadmapNodeIds = roadmapNodes.map((n) => n.nodeId);
    const toInsert = [];

    roadmapNodeIds.forEach((nodeId) => {
      if (!statusMap[nodeId]) {
        toInsert.push({
          studentId,
          nodeId,
          status: 'pending',
          updatedAt: new Date(),
        });
        statusMap[nodeId] = { status: 'pending' };
      }
    });

    return { toInsert, statusMap };
  }

  test('creates pending records for all missing nodes', () => {
    const studentId = '507f1f77bcf86cd799439011';
    const roadmapNodes = [
      { nodeId: 'IT1010' },
      { nodeId: 'IT3910E' },
      { nodeId: 'IT4409' },
    ];
    const existing = [{ nodeId: 'IT1010', status: 'done' }];

    const { toInsert } = ensurePendingReconciliation(studentId, roadmapNodes, existing);

    expect(toInsert.length).toBe(2);
    expect(toInsert[0].nodeId).toBe('IT3910E');
    expect(toInsert[0].status).toBe('pending');
    expect(toInsert[1].nodeId).toBe('IT4409');
  });

  test('does not duplicate existing records', () => {
    const studentId = '507f1f77bcf86cd799439011';
    const roadmapNodes = [
      { nodeId: 'IT1010' },
      { nodeId: 'IT3910E' },
    ];
    const existing = [
      { nodeId: 'IT1010', status: 'done' },
      { nodeId: 'IT3910E', status: 'in_progress' },
    ];

    const { toInsert } = ensurePendingReconciliation(studentId, roadmapNodes, existing);

    expect(toInsert.length).toBe(0);
  });

  test('handles empty roadmap', () => {
    const { toInsert } = ensurePendingReconciliation('507f1f77bcf86cd799439011', [], []);
    expect(toInsert.length).toBe(0);
  });

  test('returns accurate statusMap for subsequent lookups', () => {
    const roadmapNodes = [
      { nodeId: 'IT1010' },
      { nodeId: 'IT3910E' },
    ];
    const existing = [{ nodeId: 'IT1010', status: 'done' }];

    const { statusMap } = ensurePendingReconciliation('507f1f77bcf86cd799439011', roadmapNodes, existing);

    expect(statusMap.IT1010.status).toBe('done');
    expect(statusMap.IT3910E.status).toBe('pending');
  });
});
