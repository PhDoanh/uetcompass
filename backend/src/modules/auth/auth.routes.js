const express = require('express');
const controller = require('./auth.controller');

const authRouter = express.Router();

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

authRouter.post('/register', requireBody(['fullName', 'email', 'password']), controller.register);
authRouter.post('/verify-email', requireBody(['email', 'otp']), controller.verifyEmail);
authRouter.post('/resend-otp', requireBody(['email']), controller.resendOtp);
authRouter.post('/login', requireBody(['email', 'password']), controller.login);
authRouter.post('/google', requireBody(['credential']), controller.googleLogin);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/forgot-password', requireBody(['email']), controller.forgotPassword);
authRouter.post('/verify-reset-otp', requireBody(['email', 'otp']), controller.verifyResetOtp);
authRouter.post('/reset-password', requireBody(['resetToken', 'newPassword']), controller.resetPassword);

module.exports = {
  authRouter,
};
