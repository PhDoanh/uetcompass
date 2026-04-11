# Data Model: UET Authentication and Access Control Update

**Feature**: `011-authentication`
**Date**: 2026-04-07

## Entity: AccountIdentity

Purpose: Represents authenticatable user account and role eligibility.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `userId` | ObjectId | yes | PK/FK | |
| `role` | Enum | yes | `guest` \| `uet_student` | Only two supported roles |
| `email` | String\|null | no | Must end `@vnu.edu.vn` when present | Guest anonymous has no auth email |
| `authProviders` | Set | no | `password`, `google` | `uet_student` may have one or both |
| `status` | Enum | yes | `active` \| `pending-verification` \| `locked` | |
| `createdAt` | Date | yes | immutable | |
| `updatedAt` | Date | yes | mutable | |

Invariants:
- Guest has no authenticated session/token.
- `uet_student` identity must satisfy UET domain constraints.

## Entity: OtpChallenge

Purpose: OTP lifecycle for verify-email and forgot-password flows.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `challengeId` | String | yes | unique | |
| `flowType` | Enum | yes | `verify_email` \| `forgot_password` | |
| `accountRef` | ObjectId\|null | no | account-linked for known identity | |
| `otpCode` | String | yes | 4 digits | Manual entry |
| `issuedAt` | Date | yes | | |
| `expiresAt` | Date | yes | `issuedAt + 2m` | |
| `resendCooldownUntil` | Date | yes | `lastSend + 2m` | |
| `resendCountHour` | Number | yes | max 10/account/hour and max 10/IP/hour | Dual limit logic |
| `requestIp` | String | yes | normalized | Used for IP hourly cap |

Invariants:
- Wrong OTP attempts are not capped before expiry.
- Resend denied if cooldown active or either hourly cap exceeded.

## Entity: SessionGrant

Purpose: Represents authenticated session/device token state.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `sessionId` | String | yes | unique | |
| `userId` | ObjectId | yes | FK | Only for `uet_student` |
| `deviceFingerprint` | String\|null | no | | |
| `createdAt` | Date | yes | | |
| `revokedAt` | Date\|null | no | | |

Behavior rule:
- On password reset success, invalidate current session/device only.

## Entity: AuditEvent

Purpose: Typed operational event log for mandatory auth/access events.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `eventId` | ObjectId | yes | PK | |
| `eventType` | Enum | yes | `signup`, `login_success`, `login_fail`, `otp_send`, `otp_resend`, `otp_verify_fail`, `password_reset_success`, `google_login_denied_domain` | Mandatory catalog |
| `actorType` | Enum | yes | `guest` \| `uet_student` \| `system` | |
| `actorRef` | ObjectId\|null | no | | |
| `requestIp` | String\|null | no | | |
| `outcome` | Enum | yes | `success` \| `fail` | |
| `createdAt` | Date | yes | indexed | |

## Access Matrix Model

| Capability | Access Rule |
|---|---|
| `sample_roadmap_view` | guest + uet_student |
| `public_roadmap_view` | guest + uet_student |
| `feedback_submit` | guest + uet_student |
| `private_feature_*` | uet_student only |

Guard mapping:
- Private UI route guard: guest -> redirect login.
- Private API guard: guest/unauthenticated -> 401.
