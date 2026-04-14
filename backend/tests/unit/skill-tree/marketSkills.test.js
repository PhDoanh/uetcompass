/**
 * T037: Market skills sorting and empty-state tests
 */

describe('marketSkills', () => {
  function sortSkillsByJobCount(skills) {
    return [...skills].sort((a, b) => (b.jobCount || 0) - (a.jobCount || 0));
  }

  test('sorts skills by job count descending', () => {
    const skills = [
      { name: 'React.js', jobCount: 500 },
      { name: 'Node.js', jobCount: 1200 },
      { name: 'Python', jobCount: 800 },
    ];

    const sorted = sortSkillsByJobCount(skills);

    expect(sorted[0].name).toBe('Node.js');
    expect(sorted[1].name).toBe('Python');
    expect(sorted[2].name).toBe('React.js');
  });

  test('handles missing jobCount gracefully', () => {
    const skills = [
      { name: 'React.js', jobCount: 500 },
      { name: 'NewSkill' },
      { name: 'Node.js', jobCount: 1200 },
    ];

    const sorted = sortSkillsByJobCount(skills);

    expect(sorted[0].name).toBe('Node.js');
    expect(sorted[1].name).toBe('React.js');
    expect(sorted[2].name).toBe('NewSkill');
  });

  test('handles empty skills array', () => {
    const sorted = sortSkillsByJobCount([]);
    expect(sorted.length).toBe(0);
  });

  test('handles single skill', () => {
    const skills = [{ name: 'React.js', jobCount: 500 }];
    const sorted = sortSkillsByJobCount(skills);
    expect(sorted.length).toBe(1);
    expect(sorted[0].name).toBe('React.js');
  });
});
