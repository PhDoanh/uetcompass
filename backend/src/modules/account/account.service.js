const bcrypt = require('bcryptjs');
const { User } = require('../auth/user.model');
const { RefreshToken } = require('../auth/refreshToken.model');
const { DeletedEmail } = require('../auth/deletedEmail.model');
const { SecurityAudit } = require('../auth/securityAudit.model');
const { Notification } = require('../notifications/notification.model');
const { StudentProfile } = require('../onboarding/onboarding.model');
const { Roadmap } = require('../roadmap/roadmap.model');
const { RoadmapProgress } = require('../roadmap/roadmapProgress.model');
const { ManualRoadmap } = require('../roadmap/manualRoadmap.model');
const { AccountAuditEvent } = require('./account.model');
const accountAuditService = require('./accountAudit.service');
const { resolveEffectiveDisplayName, resolvePublicIdentity } = require('./identity.policy');

const BCRYPT_ROUNDS = 12;
const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

function buildError(status, code, message, details) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.details = details;
  return err;
}

function validatePasswordPolicy(value) {
  const password = String(value || '');
  return PASSWORD_POLICY_REGEX.test(password);
}

function mapIdentity(user) {
  return {
    userId: String(user._id || ''),
    email: user.email,
    displayName: user.displayName || null,
    fullName: user.fullName,
    privacySetting: user.privacySetting,
    avatarUrl: user.avatarUrl || null,
    joinedAt: user.createdAt || null,
    effectiveDisplayName: resolveEffectiveDisplayName({
      displayName: user.displayName,
      fullName: user.fullName,
      email: user.email,
    }),
  };
}

async function getPublicProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  const identity = mapIdentity(user);
  const visible = user.privacySetting !== 'anonymous';

  if (!visible) {
    return {
      visible: false,
      identity: {
        userId: identity.userId,
        displayName: resolvePublicIdentity({
          displayName: user.displayName,
          fullName: user.fullName,
          email: user.email,
          privacySetting: user.privacySetting,
        }),
        privacySetting: user.privacySetting,
        avatarUrl: identity.avatarUrl,
      },
      profile: null,
    };
  }

  const studentProfile = await StudentProfile.findOne({ userId });

  return {
    visible: true,
    identity,
    profile: normalizeProfileDraft({
      major: studentProfile?.major,
      completedCourseIds: Array.isArray(studentProfile?.completedCourses)
        ? studentProfile.completedCourses.map((item) => item?.courseUnitId || item?.courseCode).filter(Boolean)
        : [],
      careerGoal: studentProfile?.careerGoal,
      personalAspirations: studentProfile?.personalAspirations,
    }),
  };
}

function normalizeCareerGoal(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    role: source.role || null,
    graduationTimeline: source.graduationTimeline || null,
  };
}

function normalizeProfileDraft(profile) {
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

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  const studentProfile = await StudentProfile.findOne({ userId });
  const identity = mapIdentity(user);

  return {
    ...identity,
    identity,
    profile: normalizeProfileDraft({
      major: studentProfile?.major,
      completedCourseIds: Array.isArray(studentProfile?.completedCourses)
        ? studentProfile.completedCourses.map((item) => item?.courseUnitId || item?.courseCode).filter(Boolean)
        : [],
      careerGoal: studentProfile?.careerGoal,
      personalAspirations: studentProfile?.personalAspirations,
    }),
  };
}

async function updateProfile(userId, payload = {}) {
  const profilePayload = payload?.profile;
  const nextFields = {};

  if (payload.displayName !== undefined) {
    const displayName = String(payload.displayName || '').trim();
    if (!displayName) {
      throw buildError(400, 'INVALID_INPUT', 'displayName is required when provided.');
    }
    nextFields.displayName = displayName;
  }

  if (payload.fullName !== undefined) {
    const fullName = String(payload.fullName || '').trim();
    if (!fullName) {
      throw buildError(400, 'INVALID_INPUT', 'fullName is required when provided.');
    }
    nextFields.fullName = fullName;
  }

  if (payload.privacySetting !== undefined) {
    if (!['identified', 'anonymous'].includes(payload.privacySetting)) {
      throw buildError(400, 'INVALID_INPUT', 'privacySetting must be identified or anonymous.');
    }
    nextFields.privacySetting = payload.privacySetting;
  }

  if (payload.avatarUrl !== undefined) {
    const avatarUrl = payload.avatarUrl == null ? null : String(payload.avatarUrl).trim();
    nextFields.avatarUrl = avatarUrl || null;
  }

  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User profile not found.');
  }

  const updatedUser = Object.keys(nextFields).length
    ? await User.findByIdAndUpdate(userId, { $set: nextFields }, { new: true })
    : user;

  if (profilePayload && typeof profilePayload === 'object') {
    const currentStudentProfile = await StudentProfile.findOne({ userId });

    if (!currentStudentProfile || currentStudentProfile.isDraft !== false) {
      throw buildError(409, 'ONBOARDING_NOT_COMPLETED', 'Complete onboarding before editing profile fields in settings.');
    }

    const nextDraft = normalizeProfileDraft(profilePayload);
    const nextMajor = nextDraft.major || currentStudentProfile.major || null;
    const completedCourses = mapCompletedCourses(nextDraft.completedCourseIds, nextMajor, currentStudentProfile);

    await StudentProfile.updateOne(
      { userId },
      {
        $set: {
          major: nextMajor,
          completedCourses,
          careerGoal: nextDraft.careerGoal,
          personalAspirations: nextDraft.personalAspirations,
          updatedAt: new Date(),
        },
      }
    );
  }

  if (Object.keys(nextFields).length) {
    await accountAuditService.emitProfileUpdated(userId, {
      changedFields: Object.keys(nextFields),
    });
  }

  const identity = mapIdentity(updatedUser);
  return {
    message: 'Profile updated',
    profile: identity,
    identity,
  };
}

async function changePassword(userId, payload = {}) {
  const currentPassword = String(payload.currentPassword || '');
  const newPassword = String(payload.newPassword || '');

  if (!validatePasswordPolicy(newPassword)) {
    throw buildError(
      400,
      'INVALID_INPUT',
      'New password must be at least 8 characters and include uppercase, lowercase, number, and one of @$!%*?&',
      { field: 'newPassword' }
    );
  }

  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  const hasPassword = Boolean(user.passwordHash);
  if (hasPassword) {
    const isValidCurrent = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      throw buildError(403, 'FORBIDDEN', 'Current password is incorrect');
    }
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await User.updateOne(
    { _id: userId },
    {
      $set: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    }
  );

  await accountAuditService.emitPasswordChanged(userId);

  return {
    message: 'Password changed successfully',
  };
}

async function hardDeleteAccount(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw buildError(404, 'NOT_FOUND', 'User not found.');
  }

  await Promise.all([
    StudentProfile.deleteMany({ userId }),
    RefreshToken.deleteMany({ userId }),
    Notification.deleteMany({ userId }),
    SecurityAudit.deleteMany({ userId }),
    AccountAuditEvent.deleteMany({ userId }),
    RoadmapProgress.deleteMany({ userId }),
    Roadmap.deleteMany({ userId }),
    ManualRoadmap.deleteMany({ userId }),
  ]);

  await User.deleteOne({ _id: userId });
  await DeletedEmail.updateOne(
    { email: user.email },
    {
      $set: {
        deletedAt: new Date(),
      },
    },
    { upsert: true }
  );

  return {
    code: 'ACCOUNT_DELETED',
    message: 'Account deleted permanently.',
  };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  hardDeleteAccount,
  validatePasswordPolicy,
  getPublicProfile,
};
