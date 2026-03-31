const crypto = require('crypto');
const { User } = require('./user.model');
const { sendRegistrationOtpEmail } = require('./auth.email');
const { issueAccessToken, hashRefreshToken } = require('./token.service');
const passwordService = require('./password.service');
const googleService = require('./google.service');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { RefreshToken } = require('./refreshToken.model');

const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 15;

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function isVnuEmail(email) {
  return /@vnu\.edu\.vn$/i.test(String(email || '').trim());
}

function validateRegisterInput(input = {}) {
  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
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

  if (!isVnuEmail(email)) {
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

async function registerWithEmail(payload) {
  const validation = validateRegisterInput(payload);
  if (!validation.valid) {
    throw buildError(400, validation.error.code, validation.error.message);
  }

  const { fullName, email, password } = validation.value;
  const existing = await User.findOne({ email });

  if (existing && existing.status !== 'deleted') {
    throw buildError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists. Please log in instead.');
  }

  const passwordHash = await passwordService.hashPassword(password);
  const otp = generateOtp();
  await User.create({
    email,
    fullName,
    displayName: fullName,
    passwordHash,
    status: 'pending-verification',
    emailVerification: {
      otp,
      expiresAt: buildOtpExpiry(),
      verified: false,
    },
  });

  await sendRegistrationOtpEmail(email, otp);

  return {
    code: 'OTP_SENT',
    message: `OTP sent to ${email}. Please verify your email within 2 minutes.`,
  };
}

async function verifyEmailOtp({ email, otp }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedOtp = String(otp || '').trim();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
  }

  if (!user.emailVerification || !user.emailVerification.otp || !user.emailVerification.expiresAt) {
    throw buildError(400, 'OTP_INVALID', 'The code is incorrect or has expired.');
  }

  if (new Date(user.emailVerification.expiresAt).getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $set: { status: 'locked' } });
    throw buildError(
      423,
      'ACCOUNT_LOCKED_UNVERIFIED',
      'Verification window expired. Please request a new OTP to unlock your account.'
    );
  }

  if (String(user.emailVerification.otp) !== normalizedOtp) {
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

async function resendVerificationOtp({ email }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return {
      code: 'OTP_RESENT',
      message: `A new OTP has been sent to ${normalizedEmail}.`,
    };
  }

  if (user.status === 'active') {
    throw buildError(400, 'ALREADY_VERIFIED', 'This account is already verified.');
  }

  const otp = generateOtp();
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

  await sendRegistrationOtpEmail(normalizedEmail, otp);

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

async function loginWithPassword({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw buildError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (user.status === 'pending-verification') {
    throw buildError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.');
  }

  if (user.status === 'deleted') {
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
  const onboarding = await resolveOnboardingState(user._id);
  return {
    code: 'LOGIN_SUCCESS',
    accessToken,
    onboardingState: onboarding.onboardingState,
    onboardingDraft: onboarding.onboardingDraft,
  };
}

async function loginWithGoogle({ credential }) {
  const payload = await googleService.verifyGoogleIdToken(credential);
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
  isVnuEmail,
  validateRegisterInput,
  registerWithEmail,
  verifyEmailOtp,
  resendVerificationOtp,
  resolveOnboardingState,
  loginWithPassword,
  loginWithGoogle,
  logoutSession,
};
