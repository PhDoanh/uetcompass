# Feature Specification: Student Account Management

**Feature Branch**: `005-account-management`
**Created**: 2026-03-11
**Updated**: 2026-04-09
**Status**: Draft
**Input**: User description: "Feature 005 only covers account management for already authenticated UET students. Users can update profile information and change password."

---

## Scope

Feature 005 is limited to **Account Management** for users who are already authenticated and already validated as UET students.

Entry condition:
- User MUST already pass authentication and UET account verification via Feature 011-authentication before accessing any screen/API in this feature.

Included:
- Update account/profile information.
- Change password.

Excluded from this feature:
- Registration, email verification OTP, login, Google sign-in, forgot password, logout.
- Authentication bootstrapping and first-time access flows.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Update Basic Account Profile (Priority: P1)

An authenticated UET student opens Account Settings and updates basic profile fields (`displayName`, `fullName`, `privacySetting`) and avatar image via `Import Image` / `Delete image` controls.

**Why this priority**: Core account self-management must be available at all times for authenticated users.

**Independent Test**: Log in as an existing verified student, edit each basic profile field, save, and confirm the new values are persisted and reloaded correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated student in Account Settings, **When** they update `displayName`, `fullName`, `privacySetting`, or import/delete avatar image and save, **Then** the system persists the changes successfully.
2. **Given** invalid input in any editable field, **When** the student submits, **Then** the system rejects the update with clear inline validation errors.
3. **Given** `privacySetting = anonymous`, **When** the student appears on public-facing surfaces, **Then** personally identifying fields are hidden according to privacy rules.
4. **Given** profile changes are saved, **When** the student refreshes or logs in later, **Then** the latest profile data is shown consistently.

---

### User Story 2 - Change Password (Priority: P2)

An authenticated student changes their password from Account Settings by providing current password and new password.

**Why this priority**: Password hygiene is essential for account safety and user control.

**Independent Test**: Enter valid current password and a valid new password (at least 8 characters including letters, numbers, and special characters), save, then confirm login works with new password and old password no longer works.

**Acceptance Scenarios**:

1. **Given** an authenticated student selects Change Password, **When** they provide correct current password and valid new password, **Then** the password is updated.
2. **Given** a new password that does not meet password policy (minimum 8 characters with letters, numbers, and special characters), **When** the student submits, **Then** the system rejects the change with clear validation error.
3. **Given** incorrect current password, **When** the student submits, **Then** the system rejects the change and does not update the password.
4. **Given** password change completes successfully, **When** the student logs in later, **Then** only the new password is accepted.

---

### Edge Cases

- Student tries to update another user's account data via manipulated request payload; request is rejected by ownership checks.
- `displayName` is blank or invalid; rendering falls back using unified order.
- Student sets `privacySetting = anonymous`; public surfaces never expose raw `fullName` unless viewer is owner.
- New password meets length but misses one required character class (letter, number, or special character); update is rejected by password policy.

---

## Requirements *(mandatory)*

### Functional Requirements

**Account/Profile Update**

- **FR-001**: The system MUST allow an authenticated student to update `displayName`, `fullName`, `privacySetting` (`identified | anonymous`), and avatar image.
- **FR-002**: Profile update APIs MUST only allow a student to read and modify their own account data.
- **FR-003**: The system MUST expose and accept `displayName`, `fullName`, `privacySetting`, and `avatarUrl` explicitly in account/profile APIs, where `avatarUrl` may be a hosted URL or image Data URL created by `Import Image`.
- **FR-004**: `displayName` MUST be treated as the primary public identity field and editable independently from `fullName`.
- **FR-005**: The system MUST support `privacySetting` with enum values `identified | anonymous`, defaulting to `identified`.
- **FR-006**: Any UI that renders student identity MUST apply fallback order: valid `displayName` -> `fullName` -> sanitized email local-part -> `"Student"`.
- **FR-006A**: Access to all Account Management pages/APIs in this feature MUST require a valid authenticated session and UET-verified account state provided by Feature 011-authentication.

**Password Management**

- **FR-007**: The system MUST allow authenticated students to change password by providing current password and new password.
- **FR-008**: The current password MUST be verified before applying a password change.
- **FR-009**: New password MUST be at least 8 characters and include at least one letter, one number, and one special character.
- **FR-010**: After password change, old password MUST no longer be accepted.

### Non-Functional Requirements

- **NFR-001 (Security)**: Passwords MUST be stored and processed so plaintext cannot be recovered or exposed.
- **NFR-002 (Isolation)**: Cross-account read/write MUST be prevented; only account owners can operate on their own account.
- **NFR-003 (Privacy)**: When `privacySetting = anonymous`, public surfaces MUST not expose personally identifying fields beyond approved fallback identity output.
- **NFR-004 (Auditability)**: Sensitive account events MUST be auditable (`PROFILE_UPDATED`, `PASSWORD_CHANGED`).
- **NFR-005 (Consistency)**: Profile reads after successful write MUST reflect the latest committed state.

---

### Key Entities

- **StudentAccount**: Authenticated UET student account. Key attributes: `displayName`, `fullName`, `privacySetting`, email, password credential, `avatarUrl` (URL/Data URL), timestamps.
- **AccountAuditEvent**: Immutable event records for account-sensitive actions.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET/PATCH /api/account/profile` consistently read/write `displayName`, `fullName`, `privacySetting`, `avatarUrl` (URL/Data URL), with ownership enforcement.
- **SC-002**: Identity rendering always resolves with fallback order (`displayName` -> `fullName` -> sanitized email local-part -> `"Student"`).
- **SC-003**: Password change succeeds only with correct current password, and old password is unusable immediately after successful change.
- **SC-004**: Account-sensitive actions emit auditable events (`PROFILE_UPDATED`, `PASSWORD_CHANGED`) with accurate metadata.

---

## Assumptions

- Authentication and UET student verification are implemented by Feature 011-authentication and are strict prerequisites for this feature.
- Account deletion/recovery lifecycle is handled by a separate feature outside Feature 005.

---

## Out of Scope

- Registration, login, Google sign-in, forgot password, logout.
- OTP issuance/verification flows for sign-up or password reset.
- Admin account management interfaces.
- Non-student account types.
