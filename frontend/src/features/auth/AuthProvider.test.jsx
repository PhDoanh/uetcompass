function sanitizeOnboardingDraft(draft) {
  const source = draft && typeof draft === 'object' ? draft : {};
  const careerGoal = source.careerGoal && typeof source.careerGoal === 'object' ? source.careerGoal : {};

  return {
    major: source.major || null,
    completedCourseIds: Array.isArray(source.completedCourseIds) ? source.completedCourseIds : [],
    careerGoal: {
      role: careerGoal.role || null,
      companyType: careerGoal.companyType || null,
      graduationTimeline: careerGoal.graduationTimeline || null,
    },
    personalAspirations: source.personalAspirations || null,
  };
}

function decidePostLoginRoute(onboardingState) {
  return '/';
}

describe('AuthProvider helpers', () => {
  test('routes completed onboarding users to skill-tree', () => {
    expect(decidePostLoginRoute('COMPLETED')).toBe('/');
  });

  test('routes non-completed onboarding users to homepage onboarding flow', () => {
    expect(decidePostLoginRoute('NEVER_STARTED')).toBe('/');
    expect(decidePostLoginRoute('DRAFT_IN_PROGRESS')).toBe('/');
  });

  test('sanitizes and rehydrates only key onboarding draft fields', () => {
    const draft = sanitizeOnboardingDraft({
      major: 'Computer Science',
      completedCourseIds: ['INT2204'],
      careerGoal: {
        role: 'Software Engineer',
        companyType: 'Product',
        graduationTimeline: '2027',
      },
      personalAspirations: 'Build impactful products',
      ignoredField: 'x',
    });

    expect(draft).toEqual({
      major: 'Computer Science',
      completedCourseIds: ['INT2204'],
      careerGoal: {
        role: 'Software Engineer',
        companyType: 'Product',
        graduationTimeline: '2027',
      },
      personalAspirations: 'Build impactful products',
    });
  });
});
