describe('progress refresh retry strategy', () => {
  function shouldScheduleRetry(retryCount) {
    return retryCount < 1;
  }

  test('schedules eventual retry for first failure only', () => {
    expect(shouldScheduleRetry(0)).toBe(true);
    expect(shouldScheduleRetry(1)).toBe(false);
    expect(shouldScheduleRetry(2)).toBe(false);
  });
});
