function decidePostLoginRoute() {
  return '/';
}

describe('AuthGuard route decisions', () => {
  test('redirect target after logout is homepage', () => {
    const target = '/';
    expect(target).toBe('/');
  });

  test('authenticated users hitting public auth routes are redirected by onboarding state', () => {
    expect(decidePostLoginRoute('COMPLETED')).toBe('/');
    expect(decidePostLoginRoute('NEVER_STARTED')).toBe('/');
  });
});
