function normalizeString(value) {
  return String(value || '').trim();
}

function isValidDisplayName(value) {
  return normalizeString(value).length > 0;
}

function resolveEmailLocalPart(email) {
  const normalizedEmail = normalizeString(email).toLowerCase();
  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0) {
    return '';
  }
  return normalizedEmail.slice(0, atIndex);
}

function resolveEffectiveDisplayName({ displayName, fullName, email }) {
  if (isValidDisplayName(displayName)) {
    return normalizeString(displayName);
  }

  if (normalizeString(fullName)) {
    return normalizeString(fullName);
  }

  const localPart = resolveEmailLocalPart(email);
  if (localPart) {
    return localPart;
  }

  return 'Student';
}

function resolvePublicIdentity({ displayName, fullName, email, privacySetting }) {
  if (privacySetting === 'anonymous') {
    if (isValidDisplayName(displayName)) {
      return normalizeString(displayName);
    }
    return 'Student';
  }

  return resolveEffectiveDisplayName({ displayName, fullName, email });
}

module.exports = {
  isValidDisplayName,
  resolveEffectiveDisplayName,
  resolvePublicIdentity,
};
