# Auth Module Overview

## Scope

The auth module owns account lifecycle for students:

- Registration and email verification OTP
- Email/password login with lockout
- Google login and Google account linking
- Forgot-password and reset-password
- Account profile settings and privacy preferences
- Account deletion request and confirmation
- Session logout and refresh token revocation

## Key Endpoints

- POST /api/auth/register
- POST /api/auth/verify-email
- POST /api/auth/resend-otp
- POST /api/auth/login
- POST /api/auth/google
- POST /api/auth/forgot-password
- POST /api/auth/verify-reset-otp
- POST /api/auth/reset-password
- POST /api/auth/logout
- GET /api/account/profile
- PATCH /api/account/profile
- POST /api/account/change-password
- POST /api/account/link-google
- DELETE /api/account/link-google/:googleId
- POST /api/account/request-deletion
- GET /api/account/confirm-deletion

## Ownership Boundaries

- Owns: users, refresh_tokens, deleted_emails, security_audits
- Integrates with: student_profiles (onboarding state + repersonalizationPending)
- Integrates with: notifications module (create/list/read and SSE delivery)

## Security Notes

- Passwords are hashed with bcryptjs (12 rounds)
- Refresh token is stored only as hash in database
- Refresh cookie is httpOnly and scoped to /api/auth
- Domain enforcement for identity login: @vnu.edu.vn only
