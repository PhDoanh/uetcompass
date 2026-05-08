const { validatePasswordPolicy } = require('../../../src/modules/account/account.service');

describe('password policy helper', () => {
  test('accepts strong password', () => {
    expect(validatePasswordPolicy('Abcd1234!')).toBe(true);
  });

  test('rejects missing special character', () => {
    expect(validatePasswordPolicy('Abcd1234')).toBe(false);
  });

  test('rejects missing uppercase character', () => {
    expect(validatePasswordPolicy('abcd1234!')).toBe(false);
  });

  test('rejects missing lowercase character', () => {
    expect(validatePasswordPolicy('ABCD1234!')).toBe(false);
  });
});
