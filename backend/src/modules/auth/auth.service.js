const crypto = require('crypto');
const { User } = require('./user.model');
const { sendRegistrationOtpEmail } = require('./auth.email');
const { issueAccessToken, hashRefreshToken, enforceOtpResendPolicy } = require('./token.service');
const passwordService = require('./password.service');
const googleService = require('./google.service');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { RefreshToken } = require('./refreshToken.model');
const { isVnuEmailAddress, normalizeEmail } = require('./identity.policy');
const { emitAuthEvent } = require('./audit.service');

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 15;
const pendingRegistrations = new Map();

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function validateRegisterInput(input = {}) {
  const fullName = String(input.fullName || '').trim();
  const email = normalizeEmail(input.email);
  const password = String(input.password || '').trim();

  if (!fullName || !email || !password) {
    return {
      valid: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'fullName, email and password are required',
      },
    };
  }

  if (!isVnuEmailAddress(email)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'email must end with @vnu.edu.vn',
      },
    };
  }

  return { valid: true, value: { fullName, email, password } };
}

function generateOtp() {
  return String(crypto.randomInt(1000, 10000)).padStart(4, '0');
}

function buildOtpExpiry() {
  return new Date(Date.now() + 2 * 60 * 1000);
}

function getPendingRegistration(email) {
  const entry = pendingRegistrations.get(email);
  if (!entry) {
    return null;
  }
  return { ...entry };
}

function setPendingRegistration(email, payload) {
  pendingRegistrations.set(email, {
    fullName: payload.fullName,
    passwordHash: payload.passwordHash,
    otp: payload.otp,
    expiresAt: payload.expiresAt,
  });
}

function deletePendingRegistration(email) {
  pendingRegistrations.delete(email);
}

function clearPendingRegistrationsForTests() {
  pendingRegistrations.clear();
}

async function safeEmit(eventType, payload) {
  try {
    await emitAuthEvent(eventType, payload);
  } catch (_) {
    // Audit failures must not break auth flows.
  }
}

async function registerWithEmail(payload) {
  const validation = validateRegisterInput(payload);
  if (!validation.valid) {
    throw buildError(400, validation.error.code, validation.error.message);
  }

  const { fullName, email, password } = validation.value;
  const existing = await User.findOne({ email });

  if (existing && existing.status !== 'soft-deleted') {
    throw buildError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Please log in instead.');
  }

  const passwordHash = await passwordService.hashPassword(password);
  const otp = generateOtp();
  setPendingRegistration(email, {
    fullName,
    passwordHash,
    otp,
    expiresAt: buildOtpExpiry(),
  });

  await sendRegistrationOtpEmail(email, otp);
  await safeEmit('signup', {
    actorType: 'uet_student',
    outcome: 'success',
    metadata: { email },
  });
  await safeEmit('otp_send', {
    actorType: 'uet_student',
    outcome: 'success',
    metadata: { flowType: 'verify_email', email },
  });

  return {
    code: 'OTP_SENT',
    message: `OTP sent to ${email}. Please verify your email within 2 minutes.`,
  };
}

async function verifyEmailOtp({ email, otp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOtp = String(otp || '').trim();

  const pending = getPendingRegistration(normalizedEmail);
  if (pending) {
    if (new Date(pending.expiresAt).getTime() < Date.now()) {
      await safeEmit('otp_verify_fail', {
        actorType: 'uet_student',
        outcome: 'fail',
        metadata: { flowType: 'verify_email', reason: 'expired' },
      });
      throw buildError(
        423,
        'ACCOUNT_LOCKED_UNVERIFIED',
        'Verification window expired. Please request a new OTP to unlock your account.'
      );
    }

    if (String(pending.otp) !== normalizedOtp) {
      await safeEmit('otp_verify_fail', {
        actorType: 'uet_student',
        outcome: 'fail',
        metadata: { flowType: 'verify_email', reason: 'otp_mismatch' },
      });
      throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing && existing.status !== 'soft-deleted') {
      throw buildError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Please log in instead.');
    }

    if (existing?.status === 'soft-deleted') {
      await User.updateOne(
        { _id: existing._id },
        {
          $set: {
            fullName: pending.fullName,
            displayName: pending.fullName,
            passwordHash: pending.passwordHash,
            status: 'active',
            softDeletedAt: null,
            emailVerification: null,
            failedLoginAttempts: 0,
            lockedUntil: null,
          },
        }
      );
    } else {
      await User.create({
        email: normalizedEmail,
        fullName: pending.fullName,
        displayName: pending.fullName,
        passwordHash: pending.passwordHash,
        status: 'active',
        emailVerification: null,
      });
    }

    deletePendingRegistration(normalizedEmail);

    return {
      code: 'EMAIL_VERIFIED',
      message: 'Email verified successfully. You may now log in.',
    };
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    await safeEmit('otp_verify_fail', {
      actorType: 'system',
      outcome: 'fail',
      metadata: { flowType: 'verify_email', email: normalizedEmail, reason: 'user_not_found' },
    });
    throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
  }

  // Legacy compatibility for accounts created under old pending-verification model.
  if (!user.emailVerification || !user.emailVerification.otp || !user.emailVerification.expiresAt) {
    await safeEmit('otp_verify_fail', {
      userId: user._id,
      actorType: 'uet_student',
      outcome: 'fail',
      metadata: { flowType: 'verify_email', reason: 'missing_challenge' },
    });
    throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
  }

  if (new Date(user.emailVerification.expiresAt).getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $set: { status: 'locked' } });
    await safeEmit('otp_verify_fail', {
      actorType: 'uet_student',
      outcome: 'fail',
      metadata: { flowType: 'verify_email', reason: 'expired' },
    });
    throw buildError(
      423,
      'ACCOUNT_LOCKED_UNVERIFIED',
      'Verification window expired. Please request a new OTP to unlock your account.'
    );
  }

  if (String(user.emailVerification.otp) !== normalizedOtp) {
    await safeEmit('otp_verify_fail', {
      userId: user._id,
      actorType: 'uet_student',
      outcome: 'fail',
      metadata: { flowType: 'verify_email', reason: 'otp_mismatch' },
    });
    throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        status: 'active',
        emailVerification: null,
      },
    }
  );

  return {
    code: 'EMAIL_VERIFIED',
    message: 'Email verified successfully. You may now log in.',
  };
}

async function resendVerificationOtp({ email, requestIp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedIp = String(requestIp || '').trim() || null;
  const pending = getPendingRegistration(normalizedEmail);
  const user = await User.findOne({ email: normalizedEmail });

  if (!pending && !user) {
    return {
      code: 'OTP_RESENT',
      message: `A new OTP has been sent to ${normalizedEmail}.`,
    };
  }

  if (user.status === 'active') {
    throw buildError(400, 'ALREADY_VERIFIED', 'This account is already verified.');
  }

  await enforceOtpResendPolicy({
    flowType: 'verify_email',
    accountKey: normalizedEmail,
    requestIp: normalizedIp,
  });

  const otp = generateOtp();
  if (pending) {
    setPendingRegistration(normalizedEmail, {
      fullName: pending.fullName,
      passwordHash: pending.passwordHash,
      otp,
      expiresAt: buildOtpExpiry(),
    });
  } else if (user) {
    // Keep compatibility for legacy pending users already stored in users collection.
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerification: {
            otp,
            expiresAt: buildOtpExpiry(),
            verified: false,
          },
        },
      }
    );
  }

  await sendRegistrationOtpEmail(normalizedEmail, otp);
  await safeEmit('otp_resend', {
    ...(user?._id ? { userId: user._id } : {}),
    actorType: 'uet_student',
    requestIp: normalizedIp,
    outcome: 'success',
    metadata: { flowType: 'verify_email', email: normalizedEmail },
  });
  await safeEmit('otp_send', {
    ...(user?._id ? { userId: user._id } : {}),
    actorType: 'uet_student',
    requestIp: normalizedIp,
    outcome: 'success',
    metadata: { flowType: 'verify_email', email: normalizedEmail, resend: true },
  });

  return {
    code: 'OTP_RESENT',
    message: `A new OTP has been sent to ${normalizedEmail}.`,
  };
}

function getLockRemainingSeconds(lockedUntil) {
  const diffMs = new Date(lockedUntil).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / 1000));
}

function normalizeOnboardingDraft(profile) {
  const completedCourseIds = Array.isArray(profile?.completedCourses)
    ? profile.completedCourses
        .map((item) => (item?.courseUnitId ? String(item.courseUnitId) : item?.courseCode))
        .filter(Boolean)
    : [];

  const careerGoal = profile?.careerGoal || {};

  return {
    programId: profile?.programId || null,
    major: profile?.major || null,
    completedCourseIds,
    careerGoal: {
      role: careerGoal?.role || null,
      companyType: careerGoal?.companyType || null,
      graduationTimeline: careerGoal?.graduationTimeline || null,
    },
    personalAspirations: profile?.personalAspirations || null,
  };
}

async function resolveOnboardingState(userId) {
  let profile = null;
  try {
    profile = await StudentProfile.findOne({ userId });
  } catch (_) {
    return {
      onboardingState: 'NEVER_STARTED',
      onboardingDraft: null,
    };
  }

  if (!profile) {
    return {
      onboardingState: 'NEVER_STARTED',
      onboardingDraft: null,
    };
  }

  if (profile.isDraft === true) {
    return {
      onboardingState: 'DRAFT_IN_PROGRESS',
      onboardingDraft: normalizeOnboardingDraft(profile),
    };
  }

  return {
    onboardingState: 'COMPLETED',
    onboardingDraft: null,
  };
}

async function loginWithPassword({ email, password, requestIp }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedPassword = String(password || '');
  const normalizedIp = String(requestIp || '').trim() || null;

  if (!isVnuEmailAddress(normalizedEmail)) {
    await safeEmit('login_fail', {
      actorType: 'system',
      requestIp: normalizedIp,
      outcome: 'fail',
      metadata: { email: normalizedEmail, reason: 'domain_not_allowed' },
    });
    throw buildError(401, 'INVALID_CREDENTIALS', 'Only @vnu.edu.vn accounts are allowed.');
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    await safeEmit('login_fail', {
      actorType: 'system',
      requestIp: normalizedIp,
      outcome: 'fail',
      metadata: { email: normalizedEmail, reason: 'user_not_found' },
    });
    throw buildError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (user.status === 'pending-verification') {
    throw buildError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.');
  }

  if (user.status === 'soft-deleted') {
    throw buildError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const now = Date.now();
  if (user.lockedUntil && new Date(user.lockedUntil).getTime() > now) {
    throw buildError(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to too many failed attempts.', {
      remainingSeconds: getLockRemainingSeconds(user.lockedUntil),
    });
  }

  const isValidPassword = await passwordService.verifyPassword(normalizedPassword, user.passwordHash);
  if (!isValidPassword) {
    await safeEmit('login_fail', {
      userId: user._id,
      actorType: 'uet_student',
      requestIp: normalizedIp,
      outcome: 'fail',
      metadata: { email: normalizedEmail, reason: 'password_mismatch' },
    });
    const nextAttempts = Number(user.failedLoginAttempts || 0) + 1;
    if (nextAttempts >= LOGIN_MAX_FAILURES) {
      const lockedUntil = new Date(now + LOGIN_LOCK_MINUTES * 60 * 1000);
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            failedLoginAttempts: 0,
            lockedUntil,
          },
        }
      );
      throw buildError(423, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to too many failed attempts.', {
        remainingSeconds: getLockRemainingSeconds(lockedUntil),
      });
    }

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: nextAttempts,
          lockedUntil: null,
        },
      }
    );
    throw buildError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    }
  );

  const accessToken = issueAccessToken({ userId: user._id, email: user.email });
  await safeEmit('login_success', {
    userId: user._id,
    actorType: 'uet_student',
    requestIp: normalizedIp,
    outcome: 'success',
    metadata: { method: 'password', email: user.email },
  });
  const onboarding = await resolveOnboardingState(user._id);
  return {
    code: 'LOGIN_SUCCESS',
    accessToken,
    onboardingState: onboarding.onboardingState,
    onboardingDraft: onboarding.onboardingDraft,
  };
}

async function loginWithGoogle({ credential, requestIp }) {
  const normalizedIp = String(requestIp || '').trim() || null;
  const payload = await googleService.verifyGoogleIdToken(credential, { requestIp: normalizedIp });
  const googleAccount = {
    googleId: payload.sub,
    email: payload.email,
  };

  let user = await User.findOne({ email: payload.email });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await User.create({
      email: payload.email,
      fullName: payload.name || payload.email,
      displayName: payload.name || payload.email,
      status: 'active',
      linkedGoogleAccounts: [googleAccount],
      emailVerification: null,
    });
  } else {
    const linkedAccounts = Array.isArray(user.linkedGoogleAccounts) ? user.linkedGoogleAccounts : [];
    const hasLink = linkedAccounts.some((item) => item && item.googleId === googleAccount.googleId);
    if (!hasLink) {
      await User.updateOne(
        { _id: user._id },
        {
          $push: { linkedGoogleAccounts: googleAccount },
          $set: {
            status: 'active',
            emailVerification: null,
            lastLoginAt: new Date(),
          },
        }
      );
    } else {
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            status: 'active',
            emailVerification: null,
            lastLoginAt: new Date(),
          },
        }
      );
    }
  }

  const accessToken = issueAccessToken({ userId: user._id, email: user.email });
  await safeEmit('login_success', {
    userId: user._id,
    actorType: 'uet_student',
    requestIp: normalizedIp,
    outcome: 'success',
    metadata: { method: 'google', email: user.email, isNewUser },
  });
  const onboarding = await resolveOnboardingState(user._id);
  return {
    code: 'LOGIN_SUCCESS',
    accessToken,
    onboardingState: onboarding.onboardingState,
    onboardingDraft: onboarding.onboardingDraft,
    isNewUser,
  };
}

async function logoutSession(rawRefreshToken) {
  const token = String(rawRefreshToken || '').trim();
  if (!token) {
    return { code: 'LOGOUT_SUCCESS' };
  }

  await RefreshToken.updateOne(
    {
      tokenHash: hashRefreshToken(token),
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );

  return { code: 'LOGOUT_SUCCESS' };
}

module.exports = {
  isVnuEmail: isVnuEmailAddress,
  validateRegisterInput,
  registerWithEmail,
  verifyEmailOtp,
  resendVerificationOtp,
  resolveOnboardingState,
  loginWithPassword,
  loginWithGoogle,
  logoutSession,
  __testOnlyClearPendingRegistrations: clearPendingRegistrationsForTests,
};
