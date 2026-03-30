describe('ProgressDashboard URL state helpers', () => {
  function getRoadmapIdFromLocation(searchValue) {
    const params = new URLSearchParams(searchValue || '');
    return params.get('roadmapId') || '';
  }

  test('reads selected roadmapId from query string', () => {
    expect(getRoadmapIdFromLocation('?roadmapId=abc123')).toBe('abc123');
  });

  test('returns empty string when roadmapId missing', () => {
    expect(getRoadmapIdFromLocation('?foo=bar')).toBe('');
    expect(getRoadmapIdFromLocation('')).toBe('');
  });
});
