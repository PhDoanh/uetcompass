function isPasswordPolicyValid(value) {
  const password = String(value || '');
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && /[^A-Za-z\d]/.test(password);
}

describe('Account password change validation', () => {
  test('accepts strong password', () => {
    expect(isPasswordPolicyValid('Abcd1234!')).toBe(true);
  });

  test('rejects weak password', () => {
    expect(isPasswordPolicyValid('abcdefg')).toBe(false);
  });
});
