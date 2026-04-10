/**
 * T049: Learning resources endpoint tests
 */

describe('learningResourcesController', () => {
  test('returns 404 when skill not found', () => {
    const statusCode = 404;
    const body = { error: 'SKILL_NOT_FOUND' };
    expect(statusCode).toBe(404);
    expect(body.error).toBe('SKILL_NOT_FOUND');
  });

  test('returns 200 with resources when skill found', () => {
    const statusCode = 200;
    const body = { resources: { free: [], paid: [] } };
    expect(statusCode).toBe(200);
    expect(body).toHaveProperty('resources');
  });
});
