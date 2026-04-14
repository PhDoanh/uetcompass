/**
 * T048: Learning resource grouping tests
 */

describe('learningResources', () => {
  function groupResourcesByTypeAndPlatform(resources) {
    const grouped = { free: [], paid: [] };

    resources.forEach((r) => {
      if (r.type === 'free') {
        grouped.free.push(r);
      } else if (r.type === 'paid') {
        grouped.paid.push(r);
      }
    });

    return grouped;
  }

  test('groups resources into free and paid', () => {
    const resources = [
      { title: 'React Docs', type: 'free', platform: 'Official' },
      { title: 'React Course', type: 'paid', platform: 'Udemy' },
      { title: 'YT Series', type: 'free', platform: 'YouTube' },
    ];

    const grouped = groupResourcesByTypeAndPlatform(resources);

    expect(grouped.free.length).toBe(2);
    expect(grouped.paid.length).toBe(1);
  });

  test('always returns both categories', () => {
    const grouped = groupResourcesByTypeAndPlatform([]);

    expect(grouped).toHaveProperty('free');
    expect(grouped).toHaveProperty('paid');
    expect(Array.isArray(grouped.free)).toBe(true);
    expect(Array.isArray(grouped.paid)).toBe(true);
  });
});
