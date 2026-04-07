# Quickstart: Student Account Management (Feature 005)

**Feature**: `005-account-management`
**Date**: 2026-04-07
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
2. Update `displayName`, `fullName`, `privacySetting`, and avatar.
3. Save and refresh page.

Expected:
- Changes persist.
- No cross-account data leakage.
- `effectiveDisplayName` resolves consistently by fallback rule.

## 4. Validate onboarding section mode behavior

Case A: Onboarding not completed
1. Use account with no onboarding submission (`isDraft=true` or no profile).
2. Open Account Settings onboarding section.
3. Click CTA button.

Expected:
- Section shows CTA instead of editable onboarding-derived fields.
- Clicking CTA opens Onboarding Panel.

Case B: Onboarding completed
1. Use account with onboarding completed (`isDraft=false`).
2. Open Account Settings onboarding section.
3. Edit onboarding-derived fields and save.

Expected:
- Editable fields shown.
- Values persist and are available to downstream personalization consumers.

## 5. Validate password change

1. Open Change Password in Account Settings.
2. Submit wrong current password + valid new password.
3. Submit correct current password + valid new password.
4. Re-login using old and new passwords.

Expected:
- Wrong current password is rejected.
- Correct current password allows change.
- Old password no longer works.
- Audit event `PASSWORD_CHANGED` is recorded.

## 6. Validate account soft delete with email confirmation

1. In Account Settings, request account deletion.
2. Confirm email received with single-use link.
3. Click confirmation link once.
4. Retry using same link.

Expected:
- Request step does not delete immediately.
- First valid click soft-deletes account and revokes active sessions.
- Replayed/used link is rejected safely.
- Soft-deleted account is blocked from authenticated routes.

## 7. Recommended automated tests

Backend unit/integration:
- Ownership enforcement for profile read/update.
- Onboarding section mode mapping (`cta` vs `editable`).
- Password change current-password verification.
- Deletion token issue/consume/expire/replay handling.
- Soft-delete authorization denial on protected endpoints.

Frontend tests:
- Account Settings renders CTA when onboarding incomplete.
- CTA click triggers Onboarding Panel open action.
- Editable onboarding fields render only when onboarding completed.
- Privacy fallback display behavior for identity fields.

## 8. Definition of done checklist

- All Feature 005 endpoints require Feature 011-authentication context.
- Profile updates persist and enforce ownership.
- Onboarding section behavior matches spec for both states.
- Password change path is secure and auditable.
- Soft delete path is email-confirmed, replay-safe, and session-revoking.
