# Tasks: Student Account Management

**Input**: Design documents from `/specs/005-account-management/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rest-api.md`, `quickstart.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare account-focused module scaffolding and shared wiring.

- [ ] T001 Create backend account module scaffold in `backend/src/modules/account/index.js`
- [ ] T002 [P] Create backend account constants/errors scaffold in `backend/src/modules/account/account.constants.js`
- [ ] T003 [P] Create frontend account feature scaffold in `frontend/src/features/account/AccountModule.jsx`
- [ ] T004 Create frontend account API service scaffold in `frontend/src/features/account/account.api.js`
- [ ] T005 Update feature quickstart references to account module paths in `specs/005-account-management/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core account infrastructure required before user-story implementation.

**CRITICAL**: No user story work starts before this phase is complete.

- [ ] T006 Implement account domain models (`StudentAccount`, `AccountDeletionToken`, `AccountAuditEvent`) in `backend/src/modules/account/account.model.js`
- [ ] T007 [P] Implement account audit repository/service in `backend/src/modules/account/accountAudit.service.js`
- [ ] T008 [P] Implement identity fallback and privacy policy helpers in `backend/src/modules/account/identity.policy.js`
- [ ] T009 Implement account authorization precondition guard (requires Feature 011 authenticated + UET-verified context) in `backend/src/modules/account/account.guard.js`
- [ ] T010 Implement base account service skeleton for profile/password/deletion operations in `backend/src/modules/account/account.service.js`
- [ ] T011 Implement base account controller + router skeleton in `backend/src/modules/account/account.controller.js`
- [ ] T012 Mount account routes with guard in `backend/src/app.js`
- [ ] T013 [P] Create frontend account settings store (loading/error/success state) in `frontend/src/stores/accountSettings.store.js`
- [ ] T014 [P] Create frontend reusable account settings form schema/validators in `frontend/src/features/account/accountSettings.validation.js`
- [ ] T015 Create account settings route entry integration in `frontend/src/App.jsx`

**Checkpoint**: Foundation ready; user stories can now be developed independently.

---

## Phase 3: User Story 1 - Update Basic Account Profile (Priority: P1) 🎯 MVP

**Goal**: Authenticated UET student updates `displayName`, `fullName`, `privacySetting`, and avatar from Account Settings.

**Independent Test**: Save profile updates and verify persisted values are returned on refresh with ownership enforcement.

### Tests for User Story 1

- [ ] T016 [P] [US1] Add backend unit test for profile read mapper and ownership guard behavior in `backend/tests/unit/account/account.profile.get.test.js`
- [ ] T017 [P] [US1] Add backend unit test for profile patch validation and field update rules in `backend/tests/unit/account/account.profile.patch.test.js`
- [ ] T018 [P] [US1] Add frontend unit test for basic account profile save form logic in `frontend/src/features/account/AccountSettings.basic.test.jsx`

### Implementation for User Story 1

- [ ] T019 [US1] Implement `GET /api/account/profile` identity payload (`displayName`, `fullName`, `privacySetting`, `avatarUrl`, `effectiveDisplayName`) in `backend/src/modules/account/account.service.js`
- [ ] T020 [US1] Implement basic profile update logic and field validation in `backend/src/modules/account/account.service.js`
- [ ] T021 [US1] Implement profile API handlers in `backend/src/modules/account/account.controller.js`
- [ ] T022 [P] [US1] Implement account settings basic profile UI section in `frontend/src/features/account/AccountSettingsPage.jsx`
- [ ] T023 [P] [US1] Implement frontend profile API calls (`getProfile`, `updateProfile`) in `frontend/src/features/account/account.api.js`
- [ ] T024 [US1] Emit `PROFILE_UPDATED` audit event on successful basic profile change in `backend/src/modules/account/accountAudit.service.js`

**Checkpoint**: User Story 1 works end-to-end and is independently testable.

---

## Phase 4: User Story 3 - Soft Delete Account with Email Confirmation (Priority: P1)

**Goal**: Request soft delete via email confirmation token; valid confirmation soft-deletes account and revokes active sessions.

**Independent Test**: Request deletion, consume token once, verify account becomes soft-deleted and subsequent protected access is denied.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add backend unit test for deletion request token issuance + audit call in `backend/tests/unit/account/account.deletion.request.test.js`
- [ ] T034 [P] [US3] Add backend unit test for deletion token consume logic (valid/expired/replayed) in `backend/tests/unit/account/account.deletion.confirm.test.js`
- [ ] T035 [P] [US3] Add backend unit test for soft-delete access gate decision logic in `backend/tests/unit/account/account.soft-delete-access.test.js`
- [ ] T036 [P] [US3] Add frontend unit test for deletion request/confirm UI state transitions in `frontend/src/features/account/AccountDeletionFlow.test.jsx`

### Implementation for User Story 3

- [ ] T037 [US3] Implement deletion token issue + email dispatch in `backend/src/modules/account/account.service.js`
- [ ] T038 [US3] Implement deletion token consume + soft-delete execution + session revocation in `backend/src/modules/account/account.service.js`
- [ ] T039 [US3] Implement deletion request/confirm handlers in `backend/src/modules/account/account.controller.js`
- [ ] T040 [US3] Emit `ACCOUNT_DELETION_REQUESTED` and `ACCOUNT_SOFT_DELETED` audit events in `backend/src/modules/account/accountAudit.service.js`
- [ ] T041 [P] [US3] Implement frontend account deletion section (request + confirm token flow messaging) in `frontend/src/features/account/AccountDeletionSection.jsx`

**Checkpoint**: User Story 3 soft-delete lifecycle works and is independently testable.

---

## Phase 5: User Story 2 - Change Password (Priority: P2)

**Goal**: Authenticated user changes password by providing current password and new password.

**Independent Test**: Wrong current password is rejected; correct current password updates hash; old password no longer authenticates.

### Tests for User Story 2

- [ ] T042 [P] [US2] Add backend unit test for password change success/failure cases in `backend/tests/unit/account/account.password-change.test.js`
- [ ] T043 [P] [US2] Add backend unit test for password change verification helper in `backend/tests/unit/account/password-change.service.test.js`
- [ ] T044 [P] [US2] Add frontend test for password change form validation and submit states in `frontend/src/features/account/AccountPasswordChange.test.jsx`

### Implementation for User Story 2

- [ ] T045 [US2] Implement password change service (verify current password, update hash) in `backend/src/modules/account/account.service.js`
- [ ] T046 [US2] Implement password change endpoint handler in `backend/src/modules/account/account.controller.js`
- [ ] T047 [US2] Emit `PASSWORD_CHANGED` audit event in `backend/src/modules/account/accountAudit.service.js`
- [ ] T048 [P] [US2] Implement frontend password change section in `frontend/src/features/account/AccountPasswordSection.jsx`

**Checkpoint**: User Story 2 is independently testable and does not regress other stories.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and regression hardening across all stories.

- [ ] T049 [P] Update API examples and validation notes in `specs/005-account-management/contracts/rest-api.md`
- [ ] T050 [P] Update manual verification checklist with final endpoint names and expected errors in `specs/005-account-management/quickstart.md`
- [ ] T051 Run backend + frontend test suites and document results in `specs/005-account-management/checklists/requirements.md`
- [ ] T052 Perform security review pass for ownership/soft-delete/privacy fallback regressions in `backend/src/modules/account/account.service.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies.
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories.
- Phase 3 (US1), Phase 4 (US3), Phase 5 (US2): all depend on Phase 2.
- Phase 7 (Polish): depends on completion of selected user stories.

### User Story Dependencies

- US1 (P1): can start right after Foundational.
- US3 (P1): depends on Foundational; independent from US1/US2 except shared account models.
- US2 (P2): depends on Foundational; can run independently of US1/US3.

### Within Each User Story

- Tests first (create failing tests before implementation).
- Service/domain logic before controller wiring.
- Backend endpoint completion before frontend wiring.
- Audit event instrumentation before story checkpoint closure.

## Parallel Execution Examples

### User Story 1

- Run in parallel: T016, T017, T018
- Run in parallel: T022, T023

### User Story 3

- Run in parallel: T033, T034, T035, T036
- Run in parallel: T040, T041 after T037/T038 contracts are stable

### User Story 2

- Run in parallel: T042, T043, T044
- Run in parallel: T047, T048 after T045 endpoint contract is finalized

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) as first production increment.
3. Validate US1 independently before continuing.

### Incremental Delivery

1. Add Phase 4 (US3) for critical account lifecycle control.
2. Add Phase 5 (US2) for password hygiene.
3. Finish with Phase 7 polish and full regression verification.

### Suggested MVP Scope

- MVP: US1 only (basic profile management) after Setup + Foundational.
