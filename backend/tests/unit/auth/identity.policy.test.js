const {
  resolveEffectiveDisplayName,
  resolvePublicIdentity,
  sanitizeEmailLocalPart,
} = require('../../../src/modules/auth/identity.policy');

describe('identity policy', () => {
  test('uses displayName first when valid', () => {
    const result = resolveEffectiveDisplayName({
      displayName: 'NguyenA',
      fullName: 'Nguyen Van A',
      email: 'student@vnu.edu.vn',
    });

    expect(result).toBe('NguyenA');
  });

  test('falls back to fullName then email local-part', () => {
    const result1 = resolveEffectiveDisplayName({
      displayName: '   ',
      fullName: 'Nguyen Van A',
      email: 'student@vnu.edu.vn',
    });
    const result2 = resolveEffectiveDisplayName({
      displayName: '   ',
      fullName: '   ',
      email: 'stu+dent@vnu.edu.vn',
    });

    expect(result1).toBe('Nguyen Van A');
    expect(result2).toBe('student');
  });

  test('anonymous privacy does not leak fullName when no public display name', () => {
    const result = resolvePublicIdentity({
      displayName: '   ',
      fullName: 'Nguyen Van A',
      email: 'student@vnu.edu.vn',
      privacySetting: 'anonymous',
    });

    expect(result).toBe('Student');
  });

  test('sanitizes email local part', () => {
    expect(sanitizeEmailLocalPart('stu+de!nt@vnu.edu.vn')).toBe('student');
  });
});
