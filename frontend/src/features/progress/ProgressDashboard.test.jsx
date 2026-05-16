import { getRoadmapIdFromLocation } from './progress.utils';

describe('ProgressDashboard URL state helpers', () => {

  test('reads selected roadmapId from query string', () => {
    expect(getRoadmapIdFromLocation('?roadmapId=abc123')).toBe('abc123');
  });

  test('returns empty string when roadmapId missing', () => {
    expect(getRoadmapIdFromLocation('?foo=bar')).toBe('');
    expect(getRoadmapIdFromLocation('')).toBe('');
  });
});
