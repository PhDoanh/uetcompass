# REST API Contract: Auth & Account Management Module

**Feature**: `005-account-management`
**Date**: 2026-03-11
**Base paths**: `/api/auth`, `/api/account`, `/api/notifications`
**Authentication**: Unless noted, all endpoints under `/api/account` and `/api/notifications` require a valid access token JWT in `Authorization: Bearer <token>`. The middleware attaches `req.user.userId` (ObjectId string) to every authenticated request.

---

## Common Conventions

**Request headers** (authenticated endpoints):
```
Authorization: Bearer <access-token-JWT>
Content-Type: application/json
```

**Error envelope** (all non-2xx responses):
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description"
  }
}
```

**Global error codes**:

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body or param failed validation |
| 401 | `UNAUTHORIZED` | Missing, expired, or invalid access token |
| 403 | `FORBIDDEN` | Authenticated but not permitted for this action |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource or invalid state transition |
| 429 | `RATE_LIMITED` | Too many requests in window |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## POST /api/auth/register

Register a new student account. Sends an OTP email and creates a `pending-verification` account.

**Auth**: None

### Request body

```json
{
  "fullName": "Nguyễn Văn A",
  "email": "student@vnu.edu.vn",
  "password": "SecurePassword123!"
}
```

| Field | Type | Required | Constraints |
|---|---|---|---|
| `fullName` | string | yes | 2–200 chars; non-empty after trim |
| `email` | string | yes | Must end in `@vnu.edu.vn`; lowercased at storage |
| `password` | string | yes | Minimum 8 chars |

### Response — 201 Created

```json
{ "message": "OTP sent to student@vnu.edu.vn. Please verify your email within 2 minutes." }
```

### Response — 409 Conflict

Email already associated with an active, pending, or locked account.

```json
{
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "An account with this email already exists. Please log in instead."
  }
}
```

### Response — 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "email: Must end in @vnu.edu.vn"
  }
}
```

---

## POST /api/auth/verify-email

Verify OTP sent at registration. Activates the account on success.

**Auth**: None

### Request body

```json
{
  "email": "student@vnu.edu.vn",
  "otp": "4821"
}
```

### Response — 200 OK

Account activated.

```json
{ "message": "Email verified successfully. You may now log in." }
```

### Response — 400 Bad Request (expired or wrong OTP)

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "The code is incorrect or has expired."
  }
}
```

### Response — 423 Locked (account locked due to OTP timeout)

```json
{
  "error": {
    "code": "ACCOUNT_LOCKED_UNVERIFIED",
    "message": "Verification window expired. Please request a new OTP to unlock your account."
  }
}
```

---

## POST /api/auth/resend-otp

Resend a new OTP for registration verification. Unlocks a locked-unverified account.

**Auth**: None

### Request body

```json
{ "email": "student@vnu.edu.vn" }
```

### Response — 200 OK

```json
{ "message": "A new OTP has been sent to student@vnu.edu.vn." }
```

### Response — 400 Bad Request

Account is already verified (active); resend not needed.

```json
{
  "error": {
    "code": "ALREADY_VERIFIED",
    "message": "This account is already verified."
  }
}
```

---

## POST /api/auth/login

Login with email and password. Returns an access token and sets the refresh token cookie.

**Auth**: None

### Request body

```json
{
  "email": "student@vnu.edu.vn",
  "password": "SecurePassword123!"
}
```

### Response — 200 OK

Sets `rt` httpOnly cookie (Refresh Token, `SameSite=None; Secure; path=/api/auth`).

```json
{
  "accessToken": "<JWT>",
  "onboardingState": "DRAFT_IN_PROGRESS"
}
```

`onboardingState` values:
- `"NEVER_STARTED"` — no `StudentProfile` document for this user
- `"DRAFT_IN_PROGRESS"` — `StudentProfile.isDraft === true`
- `"COMPLETED"` — `StudentProfile.isDraft === false`

### Response — 401 Unauthorized (invalid credentials)

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password."
  }
}
```

### Response — 423 Locked (account locked by failed attempts)

```json
{
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account locked due to too many failed attempts.",
    "remainingSeconds": 847
  }
}
```

### Response — 403 Forbidden (email not verified)

```json
{
  "error": {
    "code": "EMAIL_NOT_VERIFIED",
    "message": "Please verify your email before logging in."
  }
}
```

---

## POST /api/auth/google

Authenticate or register via Google. Verifies the Google ID token, checks domain, and either logs in or creates a new account.

**Auth**: None

### Request body

```json
{ "credential": "<Google-ID-token-JWT>" }
```

### Response — 200 OK (existing account)

Sets `rt` cookie. Same shape as `POST /api/auth/login` 200.

```json
{
  "accessToken": "<JWT>",
  "onboardingState": "NEVER_STARTED"
}
```

### Response — 201 Created (new account created)

Sets `rt` cookie.

```json
{
  "accessToken": "<JWT>",
  "onboardingState": "NEVER_STARTED"
}
```

### Response — 403 Forbidden (invalid domain)

```json
{
  "error": {
    "code": "DOMAIN_NOT_ALLOWED",
    "message": "Only @vnu.edu.vn Google accounts are permitted."
  }
}
```

### Response — 400 Bad Request (invalid ID token)

```json
{
  "error": {
    "code": "INVALID_GOOGLE_TOKEN",
    "message": "Google Sign-In failed. Please try again."
  }
}
```

---

## POST /api/auth/refresh

Rotate refresh token and issue a new access token. Called silently on app mount and every 14 minutes.

**Auth**: httpOnly `rt` cookie (no Authorization header required)

### Request

No body.

### Response — 200 OK

Sets new `rt` cookie (old one is revoked).

```json
{ "accessToken": "<new-JWT>" }
```

### Response — 401 Unauthorized

Covers: missing cookie, expired token, already-revoked token, reuse-detected.

```json
{
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Session expired. Please log in again."
  }
}
```

---

## POST /api/auth/logout

Terminate the current session by revoking the refresh token.

**Auth**: httpOnly `rt` cookie (Authorization header optional — best-effort)

### Request

No body.

### Response — 204 No Content

Clears `rt` cookie. Session ended.

---

## POST /api/auth/forgot-password

Request a password reset OTP. Always returns a generic message regardless of whether the email exists.

**Auth**: None

### Request body

```json
{ "email": "student@vnu.edu.vn" }
```

### Response — 200 OK (always — prevents account enumeration)

```json
{
  "message": "If an account exists for this email, a reset code has been sent."
}
```

---

## POST /api/auth/verify-reset-otp

Verify the reset OTP. On success, returns a short-lived reset session token for use in the next step.

**Auth**: None

### Request body

```json
{
  "email": "student@vnu.edu.vn",
  "otp": "3741"
}
```

### Response — 200 OK

```json
{
  "resetToken": "<opaque-short-lived-token>"
}
```

`resetToken` is a short-lived (5 min), single-use token used in `POST /api/auth/reset-password`.

### Response — 400 Bad Request (wrong OTP, not yet 10 attempts)

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "Incorrect code. You have N attempts remaining."
  }
}
```

### Response — 410 Gone (10 wrong attempts — OTP invalidated)

```json
{
  "error": {
    "code": "OTP_EXHAUSTED",
    "message": "Too many incorrect attempts. Please request a new code."
  }
}
```

### Response — 400 Bad Request (OTP expired)

```json
{
  "error": {
    "code": "OTP_EXPIRED",
    "message": "The code has expired. Please request a new one."
  }
}
```

---

## POST /api/auth/reset-password

Set a new password using the reset token obtained after OTP verification.

**Auth**: None

### Request body

```json
{
  "resetToken": "<opaque-short-lived-token>",
  "newPassword": "NewSecurePassword456!"
}
```

### Response — 200 OK

```json
{ "message": "Password updated successfully. Please log in with your new password." }
```

### Response — 400 Bad Request (invalid/expired reset token)

```json
{
  "error": {
    "code": "RESET_TOKEN_INVALID",
    "message": "Reset session expired or already used. Please start over."
  }
}
```

---

## GET /api/account/profile

Fetch the authenticated student's account and (if onboarding is complete) profile fields.

**Auth**: Bearer token required

### Response — 200 OK (onboarding not yet completed)

```json
{
  "userId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "fullName": "Nguyễn Văn A",
  "email": "student@vnu.edu.vn",
  "avatarUrl": null,
  "linkedGoogleAccounts": [],
  "onboardingState": "DRAFT_IN_PROGRESS",
  "profile": null
}
```

### Response — 200 OK (onboarding completed)

```json
{
  "userId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "fullName": "Nguyễn Văn A",
  "email": "student@vnu.edu.vn",
  "avatarUrl": "https://cdn.example.com/avatar.jpg",
  "linkedGoogleAccounts": [
    { "googleId": "108532...", "email": "student@vnu.edu.vn" }
  ],
  "onboardingState": "COMPLETED",
  "profile": {
    "major": "Computer Science",
    "completedCourseIds": ["64a1..."],
    "careerGoal": {
      "role": "Backend Engineer",
      "companyType": "Product company",
      "graduationTimeline": "3 semesters"
    },
    "personalAspirations": "Work remotely after graduation.",
    "repersonalizationPending": false
  }
}
```

---

## PATCH /api/account/profile

Update account info and/or onboarding profile fields. Only provided fields are updated (partial update).

**Auth**: Bearer token required

### Request body (any subset of fields)

```json
{
  "fullName": "Nguyễn Văn B",
  "avatarUrl": "https://cdn.example.com/new-avatar.jpg",
  "profile": {
    "major": "Software Engineering",
    "completedCourseIds": ["64a1...", "64a2..."],
    "careerGoal": {
      "role": "Frontend Developer",
      "companyType": "Startup",
      "graduationTimeline": "2 semesters"
    },
    "personalAspirations": "Build open-source tools."
  }
}
```

| Field | Notes |
|---|---|
| `fullName` | Optional; maxlength 200 |
| `avatarUrl` | Optional; valid URL or `null` |
| `profile.*` | Only available (and applied) when `onboardingState === 'COMPLETED'`; ignored otherwise |

**Re-personalization detection**: If any `profile.*` field differs from the stored value, the server sets `repersonalizationPending = true` on `StudentProfile` and sends a `REPERSONALIZE` in-app notification.

### Response — 200 OK

Returns the full profile as per `GET /api/account/profile` response.

### Response — 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "profile.careerGoal.role: Must contain at least one letter"
  }
}
```

---

## POST /api/account/change-password

Change the current password. Requires confirmation of the current password.

**Auth**: Bearer token required

### Request body

```json
{
  "currentPassword": "CurrentPass123!",
  "newPassword": "NewPass456!"
}
```

### Response — 200 OK

```json
{ "message": "Password updated successfully." }
```

### Response — 400 Bad Request (wrong current password)

```json
{
  "error": {
    "code": "WRONG_CURRENT_PASSWORD",
    "message": "Current password is incorrect."
  }
}
```

---

## POST /api/account/link-google

Link a new Google account as an additional sign-in method.

**Auth**: Bearer token required

### Request body

```json
{ "credential": "<Google-ID-token-JWT>" }
```

### Response — 200 OK

```json
{
  "message": "Google account linked successfully.",
  "linkedGoogleAccounts": [
    { "googleId": "108532...", "email": "student@vnu.edu.vn" }
  ]
}
```

### Response — 400 Bad Request (domain not allowed or invalid token)

```json
{
  "error": {
    "code": "DOMAIN_NOT_ALLOWED",
    "message": "Only @vnu.edu.vn Google accounts can be linked."
  }
}
```

### Response — 409 Conflict (Google account already linked to another UETCompass account)

```json
{
  "error": {
    "code": "GOOGLE_ACCOUNT_ALREADY_LINKED",
    "message": "This Google account is already linked to a different UETCompass account."
  }
}
```

---

## DELETE /api/account/link-google/:googleId

Unlink a previously linked Google account.

**Auth**: Bearer token required

### Response — 200 OK

```json
{
  "message": "Google account unlinked.",
  "linkedGoogleAccounts": []
}
```

### Response — 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "No linked Google account found with this ID."
  }
}
```

---

## POST /api/account/request-deletion

Initiate account deletion. Sends a confirmation email — no data is deleted at this step.

**Auth**: Bearer token required

### Request

No body.

### Response — 200 OK

```json
{
  "message": "A confirmation email has been sent. Click the link in the email to permanently delete your account."
}
```

---

## GET /api/account/confirm-deletion

Confirm and execute account hard-delete. Called when the student clicks the link in the confirmation email.

**Auth**: None (token is in query param)

### Query params

| Param | Type | Notes |
|---|---|---|
| `token` | string | Raw deletion token from the email link |

**Example**: `GET /api/account/confirm-deletion?token=abc123...`

### Response — 200 OK

Account deleted. All data permanently removed. Student is logged out.

```json
{ "message": "Your account has been permanently deleted." }
```

### Response — 400 Bad Request (token expired, already used, or not found)

```json
{
  "error": {
    "code": "DELETION_TOKEN_INVALID",
    "message": "The confirmation link is invalid or has expired."
  }
}
```

---

## GET /api/notifications

Fetch the authenticated student's notifications.

**Auth**: Bearer token required

### Query params

| Param | Type | Default | Notes |
|---|---|---|---|
| `read` | `"true"` \| `"false"` | (unset = all) | Filter by read status |

### Response — 200 OK

```json
{
  "notifications": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e3",
      "type": "REPERSONALIZE",
      "message": "Your profile has changed. Re-personalize your roadmap to reflect your updated goals.",
      "link": "/roadmap",
      "read": false,
      "createdAt": "2026-03-11T09:00:00.000Z"
    }
  ]
}
```

---

## PATCH /api/notifications/:id/read

Mark a notification as read.

**Auth**: Bearer token required

### Response — 200 OK

```json
{ "message": "Notification marked as read." }
```

### Response — 404 Not Found

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Notification not found."
  }
}
```

---

## GET /api/auth/sse/notifications

SSE stream for real-time notification push. Reuses the same `Map<userId, res>` pattern established in Feature 001's `onboarding.sse.js`.

**Auth**: Bearer token required (passed as `Authorization: Bearer <token>` header or `?token=<token>` query param — EventSource does not support custom headers natively in browsers; use query param fallback)

### Behavior

- On connect: server sends initial handshake comment (`:ok`) and starts 15s heartbeat
- On `REPERSONALIZE` notification created: server pushes `event: notification` with the notification payload
- On disconnect: server removes connection from the Map and clears the heartbeat interval

### Event format

```
event: notification
data: {"_id":"...","type":"REPERSONALIZE","message":"...","link":"/roadmap","read":false,"createdAt":"..."}

```

---

## SSE Connection note (Feature 001 compatibility)

The `/api/auth/sse/notifications` endpoint shares the same SSE infrastructure as Feature 001's `/api/onboarding/sse/status`. Both use the `notification.sse.js` shared module (Map-based connection store). A student opening two tabs will have two SSE connections in the Map (keyed by `userId`) — the last one registered wins for push delivery. This is an acknowledged limitation of the simple Map pattern (consistent with Feature 001's design).
