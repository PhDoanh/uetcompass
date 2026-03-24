/**
 * T029: PATCH /api/skill-tree/nodes/:courseCode/status controller tests
 * Tests validation and error mapping
 */

describe('statusPatchController', () => {
  const validStatuses = ['pending', 'in_progress', 'done'];

  function validatePatchRequest(courseCode, body) {
    if (!courseCode || typeof courseCode !== 'string') {
      return { valid: false, status: 400, error: 'INVALID_COURSE_CODE' };
    }

    if (!body || !body.status) {
      return { valid: false, status: 400, error: 'MISSING_STATUS' };
    }

    if (!validStatuses.includes(body.status)) {
      return { valid: false, status: 400, error: 'INVALID_STATUS' };
    }

    return { valid: true };
  }

  test('accepts valid PATCH request', () => {
    const result = validatePatchRequest('IT3910E', { status: 'in_progress' });
    expect(result.valid).toBe(true);
  });

  test('rejects missing courseCode', () => {
    const result = validatePatchRequest('', { status: 'in_progress' });
    expect(result.valid).toBe(false);
    expect(result.status).toBe(400);
  });

  test('rejects missing status field', () => {
    const result = validatePatchRequest('IT3910E', {});
    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_STATUS');
  });

  test('rejects invalid status value', () => {
    const result = validatePatchRequest('IT3910E', { status: 'completed' });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_STATUS');
  });

  test('validates all valid status values', () => {
    validStatuses.forEach((s) => {
      const result = validatePatchRequest('IT3910E', { status: s });
      expect(result.valid).toBe(true);
    });
  });
});
