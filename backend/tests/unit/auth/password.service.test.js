const passwordService = require('../../../src/modules/auth/password.service');
const bcrypt = require('bcryptjs');

describe('password service', () => {
  test('hashes and verifies password', async () => {
    const hash = await passwordService.hashPassword('MyPass123!');
    expect(typeof hash).toBe('string');
    expect(bcrypt.getRounds(hash)).toBe(12);
    const ok = await passwordService.verifyPassword('MyPass123!', hash);
    expect(ok).toBe(true);
  });

  test('rejects wrong password', async () => {
    const hash = await passwordService.hashPassword('MyPass123!');
    const ok = await passwordService.verifyPassword('WrongPass!', hash);
    expect(ok).toBe(false);
  });
});
