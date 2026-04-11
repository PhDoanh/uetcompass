function sanitizeEmailLocalPart(email) {
  const [localPart = ''] = String(email || '').split('@');
  return localPart.replace(/[^a-zA-Z0-9._-]/g, '').trim();
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isVnuEmailAddress(email) {
  return /@vnu\.edu\.vn$/i.test(normalizeEmail(email));
}

function isValidDisplayName(value) {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  return trimmed.length >= 1 && trimmed.length <= 120;
}

function resolveEffectiveDisplayName({ displayName, fullName, email }) {
  if (isValidDisplayName(displayName)) {
    return displayName.trim();
  }

  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const localPart = sanitizeEmailLocalPart(email);
  if (localPart.length > 0) {
    return localPart;
  }

  return 'Student';
}

function resolvePublicIdentity({ displayName, fullName, email, privacySetting }) {
  if (privacySetting === 'anonymous') {
    if (isValidDisplayName(displayName)) {
      return displayName.trim();
    }
    return 'Student';
  }

  return resolveEffectiveDisplayName({ displayName, fullName, email });
}

module.exports = {
  sanitizeEmailLocalPart,
  normalizeEmail,
  isVnuEmailAddress,
  isValidDisplayName,
  resolveEffectiveDisplayName,
  resolvePublicIdentity,
};
