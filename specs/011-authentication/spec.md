# Feature Specification: UET Authentication and Access Control Update

**Feature Branch**: `011-authentication`
**Created**: 2026-04-07
**Status**: Draft
**Input**: User description: "UET Authentication & Access Control Update (guest + uet_student) - update Account Management with guest public access, UET-only private access, OTP policy, Google login rules, and audit events."

## Clarifications

### Session 2026-04-07

- Q: OTP resend limit should be scoped how? -> A: Enforce both per-account and per-IP limits; block when either limit is exceeded.
- Q: Should wrong OTP attempts be capped per OTP? -> A: No cap; wrong attempts are allowed until OTP expires.
- Q: After successful password reset, which sessions should be logged out? -> A: Only the current session/device is logged out.
- Q: Should guest have an authenticated session/token? -> A: No. Guest is anonymous and has no auth session/token.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest Public Access Boundaries (Priority: P1)

A guest user can access only three public capabilities: view sample roadmap, view publicly shared roadmap, and submit system feedback. Any private route/API is blocked.

**Why this priority**: This defines product exposure boundary and protects private data/operations immediately.

**Independent Test**: Test as unauthenticated user: verify exactly three public capabilities work; verify private UI redirects to login and private API returns 401.

**Acceptance Scenarios**:

1. **Given** a guest user opens the app, **When** they access sample roadmap pages, **Then** content is accessible without login.
2. **Given** a guest user has a public roadmap link, **When** they open it, **Then** roadmap content is visible without login.
3. **Given** a guest user opens the feedback form, **When** they submit valid feedback, **Then** submission succeeds without requiring login.
4. **Given** a guest user navigates to any private UI route, **When** route guard evaluates access, **Then** user is redirected to login.
5. **Given** a guest user calls any private API endpoint, **When** authorization is checked, **Then** response is `401 Unauthorized`.

---

### User Story 2 - UET-Only Authentication Rules (Priority: P1)

A `uet_student` can authenticate only with `@vnu.edu.vn` identity via email-password or Google. Non-`@vnu.edu.vn` identities are rejected.

**Why this priority**: UET-only identity policy is the core access contract for private features.

**Independent Test**: Verify email/password and Google auth using three cases: existing `@vnu.edu.vn`, new `@vnu.edu.vn`, and non-`@vnu.edu.vn`.

**Acceptance Scenarios**:

1. **Given** user registers/logs in with email-password, **When** email is not `@vnu.edu.vn`, **Then** request is rejected.
2. **Given** user logs in with Google and email is existing `@vnu.edu.vn`, **When** token is valid, **Then** user is logged into existing account.
3. **Given** user logs in with Google and email is new `@vnu.edu.vn`, **When** token is valid, **Then** system creates account and logs user in.
4. **Given** user logs in with Google and email is non-`@vnu.edu.vn`, **When** token is validated, **Then** login is denied and no account is created.

---

### User Story 3 - OTP Policy for Verification and Password Reset (Priority: P1)

Users receive and enter 4-digit OTP for signup verification and forgot-password with strict TTL, resend cooldown, and rate limits.

**Why this priority**: OTP behavior directly affects security and account recovery reliability.

**Independent Test**: Verify OTP format, expiry at 2 minutes, resend blocked before 2 minutes, and resend blocked after 10 resend attempts in 1 hour.

**Acceptance Scenarios**:

1. **Given** OTP is issued for verify-email or forgot-password, **When** user receives code, **Then** code is 4 digits for manual entry.
2. **Given** OTP is issued, **When** 2 minutes pass, **Then** OTP is expired and verification fails.
3. **Given** OTP resend is requested before 2-minute cooldown ends, **When** request is sent, **Then** resend is rejected.
4. **Given** user has reached 10 resend attempts within 1 hour, **When** user requests resend again in same 1-hour window, **Then** resend is denied.
5. **Given** OTP is still within TTL, **When** user enters wrong OTP multiple times, **Then** attempts are rejected but not capped until OTP expires.

---

### User Story 4 - Session and Audit Guarantees (Priority: P2)

System guarantees access behavior and audit logging outcomes, including invalidating only the current session/device after successful password reset.

**Why this priority**: Ensures post-auth security posture and traceability for key auth events.

**Independent Test**: Trigger each required event and confirm audit logs are recorded; complete password reset and verify only the current session/device is logged out.

**Acceptance Scenarios**:

1. **Given** password reset completes successfully, **When** session state is reconciled, **Then** only the current session/device is logged out.
2. **Given** auth lifecycle actions occur, **When** audit pipeline records events, **Then** all mandatory events are persisted.
3. **Given** user role model is evaluated, **When** access control is enforced, **Then** only `guest` and `uet_student` roles are recognized and no admin role/portal is available in scope.

---

### Edge Cases

- Guest calls private API without authenticated token/session: system returns 401.
- Google account email is `@vnu.edu.vn` but token is invalid/expired: deny login and do not create account.
- OTP verify attempted exactly at expiry boundary: OTP is treated as expired once TTL has elapsed.
- User repeatedly requests OTP resend across multiple flows or networks: resend is denied once either per-account or per-IP hourly cap is exceeded.
- Password reset success occurs while user has active sessions on multiple devices: only current session/device is logged out; other sessions remain active.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Role model MUST include only `guest` and `uet_student`.
- **FR-001A**: `guest` MUST be anonymous and MUST NOT have an authenticated session/token.
- **FR-002**: Guest MUST be able to access only three public capabilities: sample roadmap view, public shared roadmap view, and system feedback submission.
- **FR-003**: All capabilities outside FR-002 MUST be private and accessible only to `uet_student`.
- **FR-004**: Guest access to private UI routes MUST redirect to login.
- **FR-005**: Guest calls to private APIs MUST return `401 Unauthorized`.
- **FR-006**: Email-password signup/login MUST accept only `@vnu.edu.vn` email addresses.
- **FR-007**: Google login for existing `@vnu.edu.vn` account MUST authenticate to that existing account.
- **FR-008**: Google login for new `@vnu.edu.vn` account MUST create account then authenticate.
- **FR-009**: Google login for non-`@vnu.edu.vn` identities MUST be denied and MUST NOT create any account.
- **FR-010**: OTP for signup verification and forgot-password MUST be 4 digits and manually enterable.
- **FR-011**: OTP TTL MUST be exactly 2 minutes after issuance.
- **FR-012**: OTP resend MUST enforce cooldown of 2 minutes between resend attempts.
- **FR-013**: OTP resend MUST be limited to maximum 10 resend attempts per hour per account and 10 resend attempts per hour per IP; resend MUST be denied when either limit is exceeded.
- **FR-013A**: Wrong OTP verification attempts MUST NOT have a per-OTP attempt cap; verification attempts remain allowed until OTP expiry.
- **FR-014**: Successful password reset MUST invalidate only the current session/device.
- **FR-015**: System MUST record at minimum these audit events: `signup`, `login_success`, `login_fail`, `otp_send`, `otp_resend`, `otp_verify_fail`, `password_reset_success`, `google_login_denied_domain`.
- **FR-016**: Session strategy remains implementation-defined, but auth/guard observable behavior in this spec MUST be met.
- **FR-017**: Admin role and admin portal MUST NOT be introduced in this feature scope.

### Non-Functional Requirements

- **NFR-001 (Security)**: Private API responses for unauthorized access MUST be deterministic and consistent (`401`) to prevent ambiguous access states.
- **NFR-002 (Security)**: Domain enforcement for email and Google authentication MUST be performed server-side.
- **NFR-003 (Reliability)**: OTP expiry and resend limits (per-account and per-IP) MUST be enforced consistently for both signup verification and forgot-password flows; wrong OTP attempts remain uncapped within OTP TTL.
- **NFR-004 (Auditability)**: Mandatory audit events MUST be queryable by event type and timestamp for operational review.
- **NFR-005 (Compatibility)**: Access-control behavior MUST hold regardless of session implementation details.
- **NFR-006 (Security)**: Guest access MUST be enforced without creating authenticated guest sessions/tokens.

### Public/Private Access Matrix

| Capability | guest | uet_student |
|---|---|---|
| View sample roadmap | Allow | Allow |
| View publicly shared roadmap | Allow | Allow |
| Submit system feedback | Allow | Allow |
| Generate roadmap | Deny | Allow |
| Save roadmap progress | Deny | Allow |
| Account settings | Deny | Allow |
| Other private features | Deny | Allow |

### Auth Flow Updates

- Email-password auth: only `@vnu.edu.vn` identities are accepted.
- Google auth:
  - Existing `@vnu.edu.vn` -> login existing account.
  - New `@vnu.edu.vn` -> create then login.
  - Non-`@vnu.edu.vn` -> deny, no account creation.
- OTP policy applies to verify-email and forgot-password flows with same rules (4-digit, 2-minute TTL, resend cooldown, and hourly caps per account and per IP).
- Password reset success logs out only the current session/device.
- Guest model is anonymous-only (no authenticated guest token/session).

### Audit Event Catalog and Logging Checklist

Mandatory events:
- `signup`
- `login_success`
- `login_fail`
- `otp_send`
- `otp_resend`
- `otp_verify_fail`
- `password_reset_success`
- `google_login_denied_domain`

Logging checklist:
- Event includes actor identity context (or guest context when applicable).
- Event includes timestamp.
- Event includes outcome status (success/fail).
- Event is persisted for operational troubleshooting.

### Key Entities

- **AccountIdentity**: Represents user identity record with role (`guest` or `uet_student`), email domain constraints, and account linkage.
- **OtpChallenge**: Represents 4-digit OTP lifecycle for verify-email and forgot-password with issuance time, expiry, resend cooldown window, and hourly resend counter.
- **SessionGrant**: Represents active session state for authenticated users; supports bulk invalidation after password reset.
- **AuditEvent**: Represents immutable record of mandatory auth/access events with type, timestamp, actor context, and outcome.
- **GuestContext**: Represents anonymous visitor context for public-only access, without authenticated session/token.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Guest users can complete exactly the 3 defined public capabilities without authentication.
- **SC-002**: 100% of guest attempts to access private UI routes are redirected to login.
- **SC-003**: 100% of unauthenticated/guest requests to private APIs return `401`.
- **SC-003A**: 100% of guest interactions are handled without issuing authenticated session/token credentials.
- **SC-004**: 100% of email-password and Google auth attempts with non-`@vnu.edu.vn` identities are denied.
- **SC-005**: 100% of denied non-`@vnu.edu.vn` Google login attempts create no account and emit `google_login_denied_domain` event.
- **SC-006**: OTP challenges expire at 2 minutes and resend requests before cooldown or above hourly limits (10/hour per account or 10/hour per IP) are blocked, while wrong OTP attempts have no cap before expiry.
- **SC-007**: 100% successful password resets invalidate only the current session/device.
- **SC-008**: All mandatory audit event types are present in logs for their corresponding trigger actions.

## Regression Test Checklist

- Verify guest access to each public capability still works.
- Verify guest block behavior for private UI and private APIs.
- Verify UET-only domain enforcement on email-password and Google auth.
- Verify OTP TTL/cooldown/hourly-cap boundaries.
- Verify password reset logs out only the current session/device.
- Verify mandatory audit event emission for success/failure paths.

## Assumptions

- Existing product already has identifiable private routes and API groups that can be guarded as `uet_student` only.
- Session mechanism may vary by environment, but must support invalidating the current session/device after password reset.
- Public shared roadmap links can be validated independently from user authentication.

## Out of Scope

- Admin role, admin portal, or privileged internal management workflows.
- Redesign of non-auth business features beyond access guard behavior.
- Changes to roadmap generation logic itself (outside auth/authorization impact).
