# Quickstart: UET Authentication and Access Control Update

**Feature**: `011-authentication`
**Date**: 2026-04-07

## Goal

Validate guest/public boundary, UET-only auth policy, OTP constraints, and mandatory audit events.

## Preconditions

- Application is running with auth + routing guards enabled.
- Test data includes:
  - One existing `@vnu.edu.vn` account.
  - One non-`@vnu.edu.vn` Google account for deny-path checks.

## Validation Steps

### 1) Guest public/private boundary

1. Access sample roadmap as guest -> must succeed.
2. Access public shared roadmap link as guest -> must succeed.
3. Submit feedback as guest -> must succeed.
4. Open private UI route as guest -> must redirect to login.
5. Call private API as guest -> must return 401.

### 2) UET-only auth domain checks

1. Attempt email-password signup/login with non-`@vnu.edu.vn` email -> reject.
2. Google login with existing `@vnu.edu.vn` -> login existing account.
3. Google login with new `@vnu.edu.vn` -> create+login.
4. Google login with non-`@vnu.edu.vn` -> deny and do not create account.

### 3) OTP policy checks

1. OTP code format is 4-digit manual entry.
2. OTP expires exactly at 2 minutes.
3. Resend before 2 minutes -> reject.
4. Resend over 10/hour per account -> reject.
5. Resend over 10/hour per IP -> reject.
6. Wrong OTP attempts before expiry are not capped.

### 4) Password reset session behavior

1. Perform forgot-password flow to success.
2. Confirm only current session/device is logged out.
3. Confirm other active sessions remain valid.

### 5) Audit events

Trigger and verify each required event exists:
- `signup`
- `login_success`
- `login_fail`
- `otp_send`
- `otp_resend`
- `otp_verify_fail`
- `password_reset_success`
- `google_login_denied_domain`

## Regression Checklist

- Guest still has exactly 3 public capabilities.
- No private feature leaks to guest (UI or API).
- Domain enforcement remains server-side and strict.
- OTP cooldown + dual hourly caps enforce correctly.
- Password reset session behavior matches clarified rule.
- Mandatory audit event catalog remains complete.
