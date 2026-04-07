# REST API Contract: Authentication and Access Control

**Feature**: `011-authentication`
**Date**: 2026-04-07

## Access Rules

- Guest is anonymous (no authenticated session/token).
- Private APIs require authenticated `uet_student` context.
- Unauthorized access to private API returns `401 Unauthorized`.

## Public Capabilities

- `GET /api/roadmaps/sample` -> public
- `GET /api/roadmaps/public/{shareId}` -> public
- `POST /api/feedback` -> public

## Private Guard Contract

- For any private endpoint:
  - Missing/invalid auth context -> `401`
  - Valid `uet_student` context -> proceed

## Auth Contracts

### POST /api/auth/signup

Request:
```json
{
  "email": "student@vnu.edu.vn",
  "password": "Secret123!"
}
```

Rules:
- Reject non-`@vnu.edu.vn` email.
- On accepted request, emit/send OTP (`otp_send`).

### POST /api/auth/login

Request:
```json
{
  "email": "student@vnu.edu.vn",
  "password": "Secret123!"
}
```

Rules:
- Reject non-`@vnu.edu.vn` email.
- Emit `login_success` or `login_fail`.

### POST /api/auth/google

Request:
```json
{
  "idToken": "<google-id-token>"
}
```

Rules:
- Existing `@vnu.edu.vn`: login existing account.
- New `@vnu.edu.vn`: create + login.
- Non-`@vnu.edu.vn`: deny, do not create account, emit `google_login_denied_domain`.

## OTP Contracts

### POST /api/auth/otp/verify

Request:
```json
{
  "challengeId": "otp_challenge_id",
  "otp": "1234"
}
```

Rules:
- OTP must be 4 digits.
- OTP expires after 2 minutes.
- Wrong attempts before expiry are uncapped.
- Wrong verify emits `otp_verify_fail`.

### POST /api/auth/otp/resend

Request:
```json
{
  "flowType": "verify_email",
  "account": "student@vnu.edu.vn"
}
```

Rules:
- Cooldown: 2 minutes between resend attempts.
- Hourly cap per account: 10.
- Hourly cap per IP: 10.
- Deny when either cap exceeded.
- Successful resend emits `otp_resend`.

## Password Reset Contracts

### POST /api/auth/password/forgot

Initiates forgot-password and sends OTP (`otp_send`).

### POST /api/auth/password/reset

Request:
```json
{
  "challengeId": "otp_challenge_id",
  "otp": "1234",
  "newPassword": "NewSecret123!"
}
```

Rules:
- On success, emit `password_reset_success`.
- Invalidate current session/device only.

## Error Envelope

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

Common codes used in this feature:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `INVALID_INPUT` (400)
- `CONFLICT` (409)
- `TOO_MANY_REQUESTS` (429)
