const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export function isPasswordPolicyValid(value) {
  const password = String(value || '');
  return PASSWORD_POLICY_REGEX.test(password);
}

export function validateProfilePayload(payload = {}) {
  const errors = {};

  if (payload.displayName !== undefined && !String(payload.displayName || '').trim()) {
    errors.displayName = 'displayName is required when provided';
  }

  if (payload.fullName !== undefined && !String(payload.fullName || '').trim()) {
    errors.fullName = 'fullName is required when provided';
  }

  if (payload.privacySetting !== undefined && !['identified', 'anonymous'].includes(payload.privacySetting)) {
    errors.privacySetting = 'privacySetting must be identified or anonymous';
  }

  return {
    ok: Object.keys(errors).length === 0,
    errors,
  };
}
