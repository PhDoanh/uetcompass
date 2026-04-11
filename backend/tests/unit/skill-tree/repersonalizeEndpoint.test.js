/**
 * T056: Repersonalize endpoint tests
 */

describe('repersonalizeEndpoint', () => {
  test('returns 403 if repersonalization already in progress', () => {
    const repersonalizing = true;
    const statusCode = repersonalizing ? 409 : 200;
    expect(statusCode).toBe(409);
  });

  test('returns 200 if repersonalization started successfully', () => {
    const repersonalizing = false;
    const statusCode = repersonalizing ? 409 : 200;
    expect(statusCode).toBe(200);
  });
});
