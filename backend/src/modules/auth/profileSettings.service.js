const { User } = require('./user.model');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { resolvePublicIdentity } = require('./identity.policy');
const notificationService = require('../notifications/notification.service');
const passwordService = require('./password.service');
const { SecurityAudit } = require('./securityAudit.model');

const ONBOARDING_FIELDS = [
  'major',
  'completedCourseIds',
  'careerGoal',
  'personalAspirations',
];

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function normalizeCareerGoal(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    role: source.role || null,
    companyType: source.companyType || null,
    graduationTimeline: source.graduationTimeline || null,
  };
}

function normalizeDraftProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    major: source.major || null,
    completedCourseIds: Array.isArray(source.completedCourseIds) ? source.completedCourseIds : [],
    careerGoal: normalizeCareerGoal(source.careerGoal),
    personalAspirations: source.personalAspirations || null,
  };
}

function normalizeCompletedCourseIds(completedCourseIds = []) {
  const ids = Array.isArray(completedCourseIds) ? completedCourseIds : [];
  const uniqueIds = [];
  const seen = new Set();

  ids.forEach((item) => {
    const next = String(item || '').trim();
    if (!next || seen.has(next)) {
      return;
    }
    seen.add(next);
    uniqueIds.push(next);
  });

  return uniqueIds;
}

function mapCompletedCourses(completedCourseIds, major, currentProfile) {
  const ids = normalizeCompletedCourseIds(completedCourseIds);
  const current = Array.isArray(currentProfile?.completedCourses) ? currentProfile.completedCourses : [];
  const byIdentity = new Map();

  current.forEach((item) => {
    const identity = String(item?.courseUnitId || item?.courseCode || '').trim();
    if (!identity) {
      return;
    }
    byIdentity.set(identity, item);
  });

  return ids
    .map((id) => {
      const existing = byIdentity.get(id);
      if (existing) {
        return {
          major: existing.major,
          courseCode: existing.courseCode,
          ...(existing.courseUnitId ? { courseUnitId: existing.courseUnitId } : {}),
        };
      }

      if (!major) {
        return null;
      }

      return {
        major,
        courseCode: id,
      };
    })
    .filter(Boolean);
}

function hasOnboardingDiff(currentProfile, nextDraft) {
  const current = {
    major: currentProfile?.major || null,
    completedCourseIds: Array.isArray(currentProfile?.completedCourses)
      ? currentProfile.completedCourses.map((item) => item?.courseUnitId || item?.courseCode).filter(Boolean)
      : [],
    careerGoal: normalizeCareerGoal(currentProfile?.careerGoal),
    personalAspirations: currentProfile?.personalAspirations || null,
  };

  return ONBOARDING_FIELDS.some((field) => JSON.stringify(current[field]) !== JSON.stringify(nextDraft[field]));
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  const profile = await StudentProfile.findOne({ userId });

  return {
    email: user.email,
    displayName: user.displayName,
    fullName: user.fullName,
    privacySetting: user.privacySetting,
    effectiveDisplayName: resolvePublicIdentity({
      displayName: user.displayName,
      fullName: user.fullName,
      email: user.email,
      privacySetting: user.privacySetting,
    }),
    profile: normalizeDraftProfile({
      major: profile?.major,
      completedCourseIds: Array.isArray(profile?.completedCourses)
        ? profile.completedCourses.map((item) => item?.courseUnitId || item?.courseCode).filter(Boolean)
        : [],
      careerGoal: profile?.careerGoal,
      personalAspirations: profile?.personalAspirations,
    }),
  };
}

async function updateProfile(userId, payload = {}) {
  const { displayName, fullName, privacySetting, profile } = payload;
  const nextUserFields = {};

  if (displayName !== undefined) {
    const value = String(displayName || '').trim();
    nextUserFields.displayName = value.length > 0 ? value : null;
  }
  if (fullName !== undefined) {
    const value = String(fullName || '').trim();
    if (!value) {
      throw buildError(400, 'INVALID_INPUT', 'fullName is required when provided.');
    }
    nextUserFields.fullName = value;
  }
  if (privacySetting !== undefined) {
    if (!['identified', 'anonymous'].includes(privacySetting)) {
      throw buildError(400, 'INVALID_INPUT', 'privacySetting must be identified or anonymous.');
    }
    nextUserFields.privacySetting = privacySetting;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  let updatedUser = user;
  if (Object.keys(nextUserFields).length > 0) {
    updatedUser = await User.findByIdAndUpdate(userId, { $set: nextUserFields }, { new: true });
  }

  const currentStudentProfile = await StudentProfile.findOne({ userId });
  if (profile && typeof profile === 'object') {
    if (!currentStudentProfile || currentStudentProfile.isDraft !== false) {
      throw buildError(409, 'ONBOARDING_NOT_COMPLETED', 'Complete onboarding before editing profile fields in settings.');
    }

    const nextDraft = normalizeDraftProfile(profile);
    const nextMajor = nextDraft.major || currentStudentProfile.major || null;
    const completedCourses = mapCompletedCourses(nextDraft.completedCourseIds, nextMajor, currentStudentProfile);
    const shouldTriggerRepersonalize = hasOnboardingDiff(currentStudentProfile, {
      ...nextDraft,
      major: nextMajor,
      completedCourseIds: completedCourses.map((item) => item.courseUnitId || item.courseCode),
    });

    const now = new Date();
    const updatePayload = {
      major: nextMajor,
      completedCourses,
      careerGoal: nextDraft.careerGoal,
      personalAspirations: nextDraft.personalAspirations,
      updatedAt: now,
      ...(shouldTriggerRepersonalize ? { repersonalizationPending: true } : {}),
    };

    await StudentProfile.updateOne(
      { userId },
      {
        $set: updatePayload,
      }
    );

    if (shouldTriggerRepersonalize) {
      await notificationService.createRepersonalizeNotification(userId);
    }
  }

  return {
    email: updatedUser.email,
    displayName: updatedUser.displayName,
    fullName: updatedUser.fullName,
    privacySetting: updatedUser.privacySetting,
    effectiveDisplayName: resolvePublicIdentity({
      displayName: updatedUser.displayName,
      fullName: updatedUser.fullName,
      email: updatedUser.email,
      privacySetting: updatedUser.privacySetting,
    }),
  };
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  const current = String(currentPassword || '');
  const next = String(newPassword || '');
  if (!current || next.length < 8) {
    throw buildError(400, 'INVALID_INPUT', 'currentPassword and valid newPassword are required.');
  }

  const isValidCurrent = await passwordService.verifyPassword(current, user.passwordHash);
  if (!isValidCurrent) {
    throw buildError(401, 'INVALID_CREDENTIALS', 'Current password is incorrect.');
  }

  const nextHash = await passwordService.hashPassword(next);
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        passwordHash: nextHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }
  );

  await SecurityAudit.create({
    userId,
    eventType: 'PASSWORD_CHANGED',
    metadata: {},
  });

  return {
    code: 'PASSWORD_CHANGED',
    message: 'Password changed successfully.',
  };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
};
