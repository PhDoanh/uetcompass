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
- Keep browser session/cookie active for Account Settings tests.

## 3. Validate profile read/write

1. Open Account Settings.
2. Update `displayName`, `fullName`, `privacySetting`, and use `Import Image` / `Delete image` actions for avatar.
3. Save and refresh page.

Expected:
- Changes persist.
- Imported avatar preview is shown before save, and Delete image clears avatar state.
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

## 5. Recommended automated tests

Backend unit tests:
- Ownership enforcement for profile read/update.
- Password change current-password verification.
- Password policy validation for new password (>= 8 chars with letter/number/special).

Frontend tests:
- Account Settings profile form validation and submit behavior.
- Privacy fallback display behavior for identity fields.

## 6. Definition of done checklist

- All Feature 005 endpoints require Feature 011-authentication context.
- Profile updates persist and enforce ownership.
- Password change path is secure and auditable.
