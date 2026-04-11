const { requireAuth } = require('../../middleware/auth.middleware');
const { User } = require('../auth/user.model');

function requireAccountAccess(req, res, next) {
  return requireAuth(req, res, async () => {
    try {
      const user = await User.findById(req.user.userId).select('status');
      if (!user || user.status !== 'active') {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'Account is not in active state.',
          },
        });
      }

      return next();
    } catch (_) {
      return res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unexpected server error',
        },
      });
    }
  });
}

module.exports = {
  requireAccountAccess,
};
