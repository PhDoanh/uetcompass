/**
 * T017: DAG unlock traversal tests
 * Test isUnlocked behavior for single/multi-prerequisite diamonds
 */

describe('dagTraversal', () => {
  function isUnlocked(node, statusMap) {
    if (!node.prerequisites || node.prerequisites.length === 0) {
      return true;
    }
    return node.prerequisites.every((prereqId) => {
      const status = statusMap[prereqId];
      return status && status.status === 'done';
    });
  }

  test('unlocks node with no prerequisites', () => {
    const node = { nodeId: 'IT1010', prerequisites: [] };
    const statusMap = {};
    expect(isUnlocked(node, statusMap)).toBe(true);
  });

  test('unlocks node when single prerequisite is done', () => {
    const node = { nodeId: 'IT3910E', prerequisites: ['IT1010'] };
    const statusMap = { IT1010: { status: 'done' } };
    expect(isUnlocked(node, statusMap)).toBe(true);
  });

  test('locks node when single prerequisite is not done', () => {
    const node = { nodeId: 'IT3910E', prerequisites: ['IT1010'] };
    const statusMap = { IT1010: { status: 'pending' } };
    expect(isUnlocked(node, statusMap)).toBe(false);
  });

  test('unlocks node when all multiple prerequisites are done', () => {
    const node = { nodeId: 'IT4409', prerequisites: ['IT3910E', 'IT2010'] };
    const statusMap = {
      IT3910E: { status: 'done' },
      IT2010: { status: 'done' },
    };
    expect(isUnlocked(node, statusMap)).toBe(true);
  });

  test('locks node when any prerequisite is not done', () => {
    const node = { nodeId: 'IT4409', prerequisites: ['IT3910E', 'IT2010'] };
    const statusMap = {
      IT3910E: { status: 'done' },
      IT2010: { status: 'pending' },
    };
    expect(isUnlocked(node, statusMap)).toBe(false);
  });

  test('locks node when prerequisite missing from statusMap', () => {
    const node = { nodeId: 'IT3910E', prerequisites: ['IT1010'] };
    const statusMap = {};
    expect(isUnlocked(node, statusMap)).toBe(false);
  });

  test('handles diamond dependency (two nodes with common prerequisite)', () => {
    const prereq = { nodeId: 'IT1010', prerequisites: [] };
    const left = { nodeId: 'IT2010', prerequisites: ['IT1010'] };
    const right = { nodeId: 'IT3010', prerequisites: ['IT1010'] };
    const diamond = { nodeId: 'IT4409', prerequisites: ['IT2010', 'IT3010'] };

    const statusMap = { IT1010: { status: 'done' } };

    expect(isUnlocked(prereq, statusMap)).toBe(true);
    expect(isUnlocked(left, statusMap)).toBe(true);
    expect(isUnlocked(right, statusMap)).toBe(true);
    expect(isUnlocked(diamond, statusMap)).toBe(false); // not all direct prereqs done

    statusMap.IT2010 = { status: 'done' };
    statusMap.IT3010 = { status: 'done' };
    expect(isUnlocked(diamond, statusMap)).toBe(true);
  });
});
