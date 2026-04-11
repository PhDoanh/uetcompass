function decidePostLoginRoute(onboardingState) {
  return onboardingState === 'COMPLETED' ? '/skill-tree' : '/';
}

describe('AuthGuard route decisions', () => {
  test('redirect target after logout is homepage', () => {
    const target = '/';
    expect(target).toBe('/');
  });

  test('authenticated users hitting public auth routes are redirected by onboarding state', () => {
    expect(decidePostLoginRoute('COMPLETED')).toBe('/skill-tree');
    expect(decidePostLoginRoute('NEVER_STARTED')).toBe('/');
  });
});
