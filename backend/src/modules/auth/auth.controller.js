const authService = require('./auth.service');
const passwordService = require('./password.service');
const profileSettingsService = require('./profileSettings.service');
const notificationService = require('../notifications/notification.service');
const googleService = require('./google.service');
const deletionService = require('./deletion.service');
const { getRefreshCookieOptions } = require('./token.service');

function sendError(res, err) {
  const status = err?.status || 500;
  const code = err?.code || 'INTERNAL_ERROR';
  const message = err?.message || 'Unexpected server error';

  return res.status(status).json({
    error: {
      code,
      message,
      ...(err?.details ? { details: err.details } : {}),
    },
  });
}

function notImplemented(routeName) {
  return (req, res) => {
    res.status(501).json({
      error: {
        code: 'NOT_IMPLEMENTED',
        message: `${routeName} is not implemented yet`,
      },
    });
  };
}

module.exports = {
  register: async (req, res) => {
    try {
      const result = await authService.registerWithEmail(req.body || {});
      return res.status(201).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  verifyEmail: async (req, res) => {
    try {
      const result = await authService.verifyEmailOtp(req.body || {});
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  resendOtp: async (req, res) => {
    try {
      const result = await authService.resendVerificationOtp(req.body || {});
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  login: async (req, res) => {
    try {
      const result = await authService.loginWithPassword(req.body || {});
      return res.status(200).json({
        code: result.code,
        accessToken: result.accessToken,
        onboardingState: result.onboardingState,
        onboardingDraft: result.onboardingDraft,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },
  googleLogin: async (req, res) => {
    try {
      const result = await authService.loginWithGoogle(req.body || {});
      return res.status(result.isNewUser ? 201 : 200).json({
        code: result.code,
        accessToken: result.accessToken,
        onboardingState: result.onboardingState,
        onboardingDraft: result.onboardingDraft,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },
  refresh: notImplemented('refresh'),
  logout: async (req, res) => {
    try {
      await authService.logoutSession(req.cookies?.rt);
      res.clearCookie('rt', getRefreshCookieOptions());
      return res.status(204).send();
    } catch (err) {
      return sendError(res, err);
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const result = await passwordService.requestPasswordReset(req.body || {});
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  verifyResetOtp: async (req, res) => {
    try {
      const result = await passwordService.verifyResetOtp(req.body || {});
      return res.status(200).json({
        message: result.message,
        code: result.code,
        resetToken: result.resetToken,
      });
    } catch (err) {
      return sendError(res, err);
    }
  },
  resetPassword: async (req, res) => {
    try {
      const result = await passwordService.resetPasswordWithToken(req.body || {});
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  getProfile: async (req, res) => {
    try {
      const result = await profileSettingsService.getProfile(req.user.userId);
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },
  patchProfile: async (req, res) => {
    try {
      const result = await profileSettingsService.updateProfile(req.user.userId, req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },
  changePassword: async (req, res) => {
    try {
      const result = await profileSettingsService.changePassword(req.user.userId, req.body || {});
      return res.status(200).json({ code: result.code, message: result.message });
    } catch (err) {
      return sendError(res, err);
    }
  },
  linkGoogle: async (req, res) => {
    try {
      const result = await googleService.linkGoogleAccount(req.user.userId, req.body?.credential);
      return res.status(200).json({ code: result.code, message: result.message });
    } catch (err) {
      return sendError(res, err);
    }
  },
  unlinkGoogle: async (req, res) => {
    try {
      const result = await googleService.unlinkGoogleAccount(req.user.userId, req.params.googleId);
      return res.status(200).json({ code: result.code, message: result.message });
    } catch (err) {
      return sendError(res, err);
    }
  },
  requestDeletion: async (req, res) => {
    try {
      const result = await deletionService.requestDeletion(req.user.userId);
      return res.status(200).json({ code: result.code, message: result.message });
    } catch (err) {
      return sendError(res, err);
    }
  },
  confirmDeletion: async (req, res) => {
    try {
      const result = await deletionService.confirmDeletionByToken(req.query.token || '');
      return res.status(200).json({ code: result.code, message: result.message });
    } catch (err) {
      return sendError(res, err);
    }
  },
  getNotifications: async (req, res) => {
    try {
      const readParam = req.query.read;
      const read = readParam === 'true' ? true : readParam === 'false' ? false : undefined;
      const result = await notificationService.getNotifications(req.user.userId, read);
      return res.status(200).json({ notifications: result });
    } catch (err) {
      return sendError(res, err);
    }
  },
  markNotificationRead: async (req, res) => {
    try {
      const result = await notificationService.markNotificationRead(req.user.userId, req.params.id);
      if (!result) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: 'Notification not found.',
          },
        });
      }

      return res.status(200).json({ notification: result });
    } catch (err) {
      return sendError(res, err);
    }
  },
  notificationsSse: notImplemented('notificationsSse'),
};
