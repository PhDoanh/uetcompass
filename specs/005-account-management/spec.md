# Feature Specification: Student Account Management

**Feature Branch**: `005-account-management`
**Created**: 2026-03-11
**Updated**: 2026-04-09
**Status**: Draft
**Input**: User description: "Feature 005 only covers account management for already authenticated UET students. Users can update their information and delete their own account."

---

## Scope

Feature 005 is limited to **Account Management** for users who are already authenticated and already validated as UET students.

Entry condition:
- User MUST already pass authentication and UET account verification via Feature 011-authentication before accessing any screen/API in this feature.

Included:
- Update account/profile information.
- Change password.
- Request account deletion and confirm by email link.
- Execute **soft delete** (disable account, recoverable by admin process).

Excluded from this feature:
- Registration, email verification OTP, login, Google sign-in, forgot password, logout.
- Authentication bootstrapping and first-time access flows.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Update Basic Account Profile (Priority: P1)

An authenticated UET student opens Account Settings and updates basic profile fields (`displayName`, `fullName`, `privacySetting`) and avatar image via upload button.

**Why this priority**: Core account self-management must be available at all times for authenticated users.

**Independent Test**: Log in as an existing verified student, edit each basic profile field, save, and confirm the new values are persisted and reloaded correctly.

**Acceptance Scenarios**:

1. **Given** an authenticated student in Account Settings, **When** they update `displayName`, `fullName`, `privacySetting`, or upload/remove avatar image and save, **Then** the system persists the changes successfully.
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

### User Story 3 - Soft Delete Account with Email Confirmation (Priority: P1)

An authenticated student requests account deletion. The system sends an email confirmation link. Only after clicking a valid link, the account is soft-deleted (disabled), access is revoked, and data is hidden from active product flows.

**Why this priority**: Students must be able to control account lifecycle while retaining recoverability required by business policy.

**Independent Test**: Request deletion, click valid confirmation link, confirm account is disabled and cannot be used until recovery.

**Acceptance Scenarios**:

1. **Given** an authenticated student requests deletion, **When** the request is submitted, **Then** the system sends a single-use confirmation email link and performs no deletion yet.
2. **Given** a valid deletion link, **When** the student confirms, **Then** the account is marked soft-deleted and active sessions are terminated immediately.
3. **Given** an account is soft-deleted, **When** the user tries to access authenticated routes, **Then** access is denied.
4. **Given** an expired or already used deletion link, **When** it is opened, **Then** deletion is not executed and a clear error is shown.

---

### Edge Cases

- Student tries to update another user's account data via manipulated request payload; request is rejected by ownership checks.
- `displayName` is blank or invalid; rendering falls back using unified order.
- Student sets `privacySetting = anonymous`; public surfaces never expose raw `fullName` unless viewer is owner.
- Student requests deletion multiple times; only the latest valid token should be usable (or earlier tokens are invalidated by policy).
- Deletion link is replayed after successful soft delete; system responds idempotently without changing state again.
- Password change and account deletion are requested concurrently; deletion completion revokes session and takes precedence for access control.
- New password meets length but misses one required character class (letter, number, or special character); update is rejected by password policy.

---

## Requirements *(mandatory)*

### Functional Requirements

**Account/Profile Update**

- **FR-001**: The system MUST allow an authenticated student to update `displayName`, `fullName`, `privacySetting` (`identified | anonymous`), and avatar image.
- **FR-002**: Profile update APIs MUST only allow a student to read and modify their own account data.
- **FR-003**: The system MUST expose and accept `displayName`, `fullName`, `privacySetting`, and `avatarUrl` explicitly in account/profile APIs, where `avatarUrl` may be a hosted URL or image Data URL from frontend upload.
- **FR-004**: `displayName` MUST be treated as the primary public identity field and editable independently from `fullName`.
- **FR-005**: The system MUST support `privacySetting` with enum values `identified | anonymous`, defaulting to `identified`.
- **FR-006**: Any UI that renders student identity MUST apply fallback order: valid `displayName` -> `fullName` -> sanitized email local-part -> `"Student"`.
- **FR-006A**: Access to all Account Management pages/APIs in this feature MUST require a valid authenticated session and UET-verified account state provided by Feature 011-authentication.

**Password Management**

- **FR-007**: The system MUST allow authenticated students to change password by providing current password and new password.
- **FR-008**: The current password MUST be verified before applying a password change.
- **FR-009**: New password MUST be at least 8 characters and include at least one letter, one number, and one special character.
- **FR-010**: After password change, old password MUST no longer be accepted.

**Account Deletion (Soft Delete)**

- **FR-011**: The system MUST allow authenticated students to request account deletion from Account Settings.
- **FR-012**: On deletion request, the system MUST send a time-limited, single-use confirmation link to the account email and MUST NOT delete/disable immediately.
- **FR-013**: Account deletion MUST execute only after a valid confirmation link is clicked.
- **FR-014**: Deletion execution for this feature MUST be soft delete: account status changes to disabled/deleted, sign-in access is blocked, and current sessions are revoked.
- **FR-015**: Expired or consumed deletion tokens MUST be rejected safely with no state change.

---

### Non-Functional Requirements

- **NFR-001 (Security)**: Passwords MUST be stored and processed so plaintext cannot be recovered or exposed.
- **NFR-002 (Isolation)**: Cross-account read/write MUST be prevented; only account owners can operate on their own account.
- **NFR-003 (Privacy)**: When `privacySetting = anonymous`, public surfaces MUST not expose personally identifying fields beyond approved fallback identity output.
- **NFR-004 (Auditability)**: Sensitive account events MUST be auditable (`PROFILE_UPDATED`, `PASSWORD_CHANGED`, `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_SOFT_DELETED`).
- **NFR-005 (Consistency)**: Profile reads after successful write MUST reflect the latest committed state.

---

### Key Entities

- **StudentAccount**: Authenticated UET student account. Key attributes: `displayName`, `fullName`, `privacySetting`, email, password credential, `avatarUrl` (URL/Data URL), account status (`active | soft-deleted`), timestamps.
- **AccountDeletionToken**: Time-limited, single-use token used to confirm account soft deletion by email link.
- **AccountAuditEvent**: Immutable event records for account-sensitive actions.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `GET/PATCH /api/account/profile` consistently read/write `displayName`, `fullName`, `privacySetting`, `avatarUrl` (URL/Data URL), with ownership enforcement.
- **SC-002**: Identity rendering always resolves with fallback order (`displayName` -> `fullName` -> sanitized email local-part -> `"Student"`).
- **SC-003**: Password change succeeds only with correct current password, and old password is unusable immediately after successful change.
- **SC-004**: After deletion confirmation link is validated, the account is soft-deleted and all active sessions are revoked within 5 seconds.
- **SC-005**: Soft-deleted accounts cannot access authenticated APIs/pages unless restored by an authorized recovery flow outside this feature.

---

## Assumptions

- Authentication and UET student verification are implemented by Feature 011-authentication and are strict prerequisites for this feature.
- Account recovery after soft delete is handled by a separate admin/support process outside this feature.

---

## Out of Scope

- Registration, login, Google sign-in, forgot password, logout.
- OTP issuance/verification flows for sign-up or password reset.
- Hard delete and irreversible data purge.
- Admin account management interfaces.
- Non-student account types.
