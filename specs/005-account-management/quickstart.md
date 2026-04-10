# Quickstart: Student Account Management (Feature 005)

**Feature**: `005-account-management`
**Date**: 2026-04-09
**Precondition**: Test user must already pass Feature 011-authentication (authenticated + UET-verified).

## 1. Start services

```bash
# from repo root
npm install

cd backend
npm install
npm run dev

cd ../frontend
npm install
npm run dev
```

Expected:
- Backend running on configured API port.
- Frontend running on Vite dev server.

## 2. Prepare authenticated test session

Use an existing verified student account from Feature 011-authentication.

- Log in through current auth flow.
- Ensure account status is active (not soft-deleted).
- Keep browser session/cookie active for Account Settings tests.

## 3. Validate profile read/write

1. Open Account Settings.
2. Update `displayName`, `fullName`, `privacySetting`, and upload avatar image by upload button.
3. Save and refresh page.

Expected:
- Changes persist.
- Uploaded avatar preview is shown before save.
- No cross-account data leakage.
- `effectiveDisplayName` resolves consistently by fallback rule.

## 4. Validate password change

1. Open Change Password in Account Settings.
2. Submit correct current password + invalid new password (e.g., less than 8 chars or missing one character class).
3. Submit wrong current password + valid new password.
4. Submit correct current password + valid new password (>= 8 chars with letter, number, special).
5. Re-login using old and new passwords.

Expected:
- Invalid new password is rejected by password policy validation.
- Wrong current password is rejected.
- Correct current password allows change.
- Old password no longer works.
- Audit event `PASSWORD_CHANGED` is recorded.

## 5. Validate account soft delete with email confirmation

1. In Account Settings, request account deletion.
2. Confirm email received with single-use link.
3. Click confirmation link once and measure time from successful confirm response to authenticated-route denial.
4. Retry using same link.

Expected:
- Request step does not delete immediately.
- First valid click soft-deletes account and revokes active sessions.
- Session revocation and access denial happen within 5 seconds.
- Replayed/used link is rejected safely.
- Soft-deleted account is blocked from authenticated routes.

## 6. Recommended automated tests

Backend unit/integration:
- Ownership enforcement for profile read/update.
- Password change current-password verification.
- Password policy validation for new password (>= 8 chars with letter/number/special).
- Deletion token issue/consume/expire/replay handling.
- Deletion confirmation to session-revocation SLA verification (`<= 5s`).
- Soft-delete authorization denial on protected endpoints.

Frontend tests:
- Account Settings profile form validation and submit behavior.
- Privacy fallback display behavior for identity fields.

## 7. Definition of done checklist

- All Feature 005 endpoints require Feature 011-authentication context.
- Profile updates persist and enforce ownership.
- Password change path is secure and auditable.
- Soft delete path is email-confirmed, replay-safe, and session-revoking.
