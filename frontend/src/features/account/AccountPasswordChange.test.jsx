function isPasswordPolicyValid(value) {
  const password = String(value || '');
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

describe('Account password change validation', () => {
  test('accepts strong password', () => {
    expect(isPasswordPolicyValid('Abcd1234!')).toBe(true);
  });

  test('rejects weak password', () => {
    expect(isPasswordPolicyValid('abcdefg')).toBe(false);
  });

  test('rejects unsupported special characters', () => {
    expect(isPasswordPolicyValid('Abcd1234#')).toBe(false);
  });
});
