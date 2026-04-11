function validateBasicForm(input) {
  const payload = input && typeof input === 'object' ? input : {};
  if (!String(payload.fullName || '').trim()) {
    return { ok: false, reason: 'fullName-required' };
  }
  if (payload.privacySetting && !['identified', 'anonymous'].includes(payload.privacySetting)) {
    return { ok: false, reason: 'privacy-invalid' };
  }
  return { ok: true };
}

describe('AccountSettings basic form logic', () => {
  test('rejects empty fullName', () => {
    expect(validateBasicForm({ fullName: '', privacySetting: 'identified' })).toEqual({
      ok: false,
      reason: 'fullName-required',
    });
  });

  test('accepts valid payload', () => {
    expect(validateBasicForm({ fullName: 'Student', privacySetting: 'anonymous' })).toEqual({ ok: true });
  });
});
