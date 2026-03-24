const express = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../middleware/auth.middleware');

const router = express.Router();

function requireBody(fields = []) {
  return (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Request body is required',
        },
      });
    }

    const missing = fields.filter((field) => {
      const value = req.body[field];
      return value == null || String(value).trim() === '';
    });

    if (missing.length > 0) {
      return res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: `${missing.join(', ')} is required`,
          details: { missing },
        },
      });
    }

    return next();
  };
}

router.post('/auth/register', requireBody(['fullName', 'email', 'password']), controller.register);
router.post('/auth/verify-email', requireBody(['email', 'otp']), controller.verifyEmail);
router.post('/auth/resend-otp', requireBody(['email']), controller.resendOtp);
router.post('/auth/login', requireBody(['email', 'password']), controller.login);
router.post('/auth/google', requireBody(['credential']), controller.googleLogin);
router.post('/auth/refresh', controller.refresh);
router.post('/auth/logout', controller.logout);
router.post('/auth/forgot-password', requireBody(['email']), controller.forgotPassword);
router.post('/auth/verify-reset-otp', requireBody(['email', 'otp']), controller.verifyResetOtp);
router.post('/auth/reset-password', requireBody(['resetToken', 'newPassword']), controller.resetPassword);
router.get('/account/confirm-deletion', controller.confirmDeletion);

router.get('/auth/sse/notifications', controller.notificationsSse);

router.use(requireAuth);

router.get('/account/profile', controller.getProfile);
router.patch('/account/profile', controller.patchProfile);
router.post('/account/change-password', requireBody(['currentPassword', 'newPassword']), controller.changePassword);
router.post('/account/link-google', requireBody(['credential']), controller.linkGoogle);
router.delete('/account/link-google/:googleId', controller.unlinkGoogle);
router.post('/account/request-deletion', controller.requestDeletion);

router.get('/notifications', controller.getNotifications);
router.patch('/notifications/:id/read', controller.markNotificationRead);

module.exports = router;
