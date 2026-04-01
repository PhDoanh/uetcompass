/**
 * T036: Course resources grouping tests
 */

describe('courseResources', () => {
  function groupResourcesByType(resources) {
    const grouped = {
      textbook: [],
      slide: [],
      lab: [],
      assignment: [],
    };

    resources.forEach((r) => {
      if (grouped[r.type]) {
        grouped[r.type].push(r);
      }
    });

    return grouped;
  }

  test('groups resources by type', () => {
    const resources = [
      { courseCode: 'IT3910E', type: 'textbook', title: 'JS Guide' },
      { courseCode: 'IT3910E', type: 'slide', title: 'Week 1' },
      { courseCode: 'IT3910E', type: 'lab', title: 'HTML/CSS Lab' },
      { courseCode: 'IT3910E', type: 'textbook', title: 'React Guide' },
    ];

    const grouped = groupResourcesByType(resources);

    expect(grouped.textbook.length).toBe(2);
    expect(grouped.slide.length).toBe(1);
    expect(grouped.lab.length).toBe(1);
    expect(grouped.assignment.length).toBe(0);
  });

  test('handles unknown resource types gracefully', () => {
    const resources = [
      { courseCode: 'IT3910E', type: 'textbook', title: 'JS Guide' },
      { courseCode: 'IT3910E', type: 'unknown', title: 'Unknown' },
    ];

    const grouped = groupResourcesByType(resources);

    expect(grouped.textbook.length).toBe(1);
    expect(grouped.assignment.length).toBe(0);
  });

  test('returns all required type properties even if empty', () => {
    const grouped = groupResourcesByType([]);

    expect(grouped).toHaveProperty('textbook');
    expect(grouped).toHaveProperty('slide');
    expect(grouped).toHaveProperty('lab');
    expect(grouped).toHaveProperty('assignment');

    expect(Array.isArray(grouped.textbook)).toBe(true);
    expect(Array.isArray(grouped.slide)).toBe(true);
  });
});
