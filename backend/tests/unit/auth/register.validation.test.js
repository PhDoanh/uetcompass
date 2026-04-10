const { isVnuEmail, validateRegisterInput } = require('../../../src/modules/auth/auth.service');

describe('register validation', () => {
  test('accepts vnu.edu.vn email', () => {
    expect(isVnuEmail('student@vnu.edu.vn')).toBe(true);
  });

  test('rejects non-vnu email', () => {
    expect(isVnuEmail('student@gmail.com')).toBe(false);
  });

  test('fails when fullName missing', () => {
    const result = validateRegisterInput({ email: 'a@vnu.edu.vn', password: 'x' });
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
  });

  test('fails when password missing', () => {
    const result = validateRegisterInput({ fullName: 'A', email: 'a@vnu.edu.vn' });
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
  });

  test('fails when email not in domain', () => {
    const result = validateRegisterInput({ fullName: 'A', email: 'a@gmail.com', password: 'x' });
    expect(result.valid).toBe(false);
    expect(result.error.code).toBe('INVALID_INPUT');
  });
});
