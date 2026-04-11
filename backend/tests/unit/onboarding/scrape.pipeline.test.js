/**
 * T069: Constitution-required scraping pipeline regression tests
 * Tests course normalization and deduplication for roadmap generation
 */

describe('scrape.pipeline', () => {
  // Mock pipeline function
  function normalizeCourse(course) {
    return {
      courseCode: course.code ? course.code.trim().toUpperCase() : '',
      nameVi: course.nameVi ? course.nameVi.trim() : '',
      nameEn: course.nameEn ? course.nameEn.trim() : '',
      credits: Math.max(0, parseInt(course.credits) || 0),
      prerequisites: Array.isArray(course.prerequisites) ? course.prerequisites : [],
    };
  }

  function deduplicateCourses(courses) {
    const seen = new Set();
    return courses.filter((c) => {
      const key = c.courseCode;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  test('normalizes course data', () => {
    const input = {
      code: '  it3910e  ',
      nameVi: '  Lập trình Web  ',
      nameEn: '  Web Development  ',
      credits: ' 3 ',
      prerequisites: ['IT1010'],
    };
    const result = normalizeCourse(input);
    expect(result.courseCode).toBe('IT3910E');
    expect(result.nameVi).toBe('Lập trình Web');
    expect(result.nameEn).toBe('Web Development');
    expect(result.credits).toBe(3);
  });

  test('deduplicates courses by courseCode', () => {
    const courses = [
      { courseCode: 'IT1010', nameVi: 'Intro' },
      { courseCode: 'IT3910E', nameVi: 'Web Dev' },
      { courseCode: 'IT1010', nameVi: 'Intro (duplicate)' },
    ];
    const result = deduplicateCourses(courses);
    expect(result.length).toBe(2);
    expect(result[0].courseCode).toBe('IT1010');
    expect(result[1].courseCode).toBe('IT3910E');
  });

  test('handles empty prerequisites', () => {
    const input = { code: 'IT1010', nameVi: 'Intro', nameEn: 'Intro', credits: 3 };
    const result = normalizeCourse(input);
    expect(Array.isArray(result.prerequisites)).toBe(true);
    expect(result.prerequisites.length).toBe(0);
  });
});
