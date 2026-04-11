const authService = require('./auth.service');
const passwordService = require('./password.service');
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
      const result = await authService.registerWithEmail({
        ...(req.body || {}),
        requestIp: req.ip,
      });
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
      const result = await authService.resendVerificationOtp({
        ...(req.body || {}),
        requestIp: req.ip,
      });
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
  login: async (req, res) => {
    try {
      const result = await authService.loginWithPassword({
        ...(req.body || {}),
        requestIp: req.ip,
      });
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
      const result = await authService.loginWithGoogle({
        ...(req.body || {}),
        requestIp: req.ip,
      });
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
      const result = await passwordService.requestPasswordReset({
        ...(req.body || {}),
        requestIp: req.ip,
      });
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
      const currentRefreshToken = req.cookies?.refreshToken || null;
      const result = await passwordService.resetPasswordWithToken({
        ...(req.body || {}),
        currentSessionId: currentRefreshToken ? String(currentRefreshToken).trim() : null,
      });
      return res.status(200).json({ message: result.message, code: result.code });
    } catch (err) {
      return sendError(res, err);
    }
  },
};
