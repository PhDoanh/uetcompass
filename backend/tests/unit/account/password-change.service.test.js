const { validatePasswordPolicy } = require('../../../src/modules/account/account.service');

describe('password policy helper', () => {
  test('accepts strong password', () => {
    expect(validatePasswordPolicy('Abcd1234!')).toBe(true);
  });

  test('rejects missing special character', () => {
    expect(validatePasswordPolicy('Abcd1234')).toBe(false);
  });
});
