const accountService = require('./account.service');
const { getRefreshCookieOptions } = require('../auth/token.service');

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

const accountController = {
  async getProfile(req, res) {
    try {
      const result = await accountService.getProfile(req.user.userId);
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async patchProfile(req, res) {
    try {
      const result = await accountService.updateProfile(req.user.userId, req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async changePassword(req, res) {
    try {
      const result = await accountService.changePassword(req.user.userId, req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },

  async hardDeleteAccount(req, res) {
    try {
      const result = await accountService.hardDeleteAccount(req.user.userId);
      res.clearCookie('rt', getRefreshCookieOptions());
      return res.status(200).json(result);
    } catch (err) {
      return sendError(res, err);
    }
  },
};

module.exports = {
  accountController,
};
