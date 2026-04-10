/**
 * T028: State guard tests - locked nodes and invalid transitions
 */

describe('stateGuard', () => {
  function canTransition(node, statusMap) {
    if (!node.prerequisites || node.prerequisites.length === 0) {
      return { allowed: true };
    }

    const allPrereqsDone = node.prerequisites.every((prereqId) => {
      const status = statusMap[prereqId];
      return status && status.status === 'done';
    });

    if (!allPrereqsDone) {
      return { allowed: false, error: 'LOCKED_NODE' };
    }

    return { allowed: true };
  }

  test('rejects transition on locked node (missing prerequisite)', () => {
    const node = { nodeId: 'IT3910E', prerequisites: ['IT1010'] };
    const statusMap = { IT1010: { status: 'pending' } };

    const result = canTransition(node, statusMap);

    expect(result.allowed).toBe(false);
    expect(result.error).toBe('LOCKED_NODE');
  });

  test('rejects transition on locked node (prerequisite not done)', () => {
    const node = { nodeId: 'IT4409', prerequisites: ['IT3910E'] };
    const statusMap = { IT3910E: { status: 'in_progress' } };

    const result = canTransition(node, statusMap);

    expect(result.allowed).toBe(false);
  });

  test('allows transition on unlocked node (no prerequisites)', () => {
    const node = { nodeId: 'IT1010', prerequisites: [] };
    const statusMap = {};

    const result = canTransition(node, statusMap);

    expect(result.allowed).toBe(true);
  });

  test('allows transition on unlocked node (all prerequisites done)', () => {
    const node = { nodeId: 'IT4409', prerequisites: ['IT3910E', 'IT2010'] };
    const statusMap = {
      IT3910E: { status: 'done' },
      IT2010: { status: 'done' },
    };

    const result = canTransition(node, statusMap);

    expect(result.allowed).toBe(true);
  });

  test('rejects transition on locked node even with multiple done prerequisites', () => {
    const node = { nodeId: 'IT5010', prerequisites: ['IT3910E', 'IT2010', 'IT4409'] };
    const statusMap = {
      IT3910E: { status: 'done' },
      IT2010: { status: 'done' },
      IT4409: { status: 'pending' }, // one is not done
    };

    const result = canTransition(node, statusMap);

    expect(result.allowed).toBe(false);
  });
});
