# Tasks: Student Account Management

**Input**: Design documents from `/specs/005-account-management/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rest-api.md`, `quickstart.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare account-focused module scaffolding and shared wiring.

- [X] T001 Create backend account module scaffold in `backend/src/modules/account/account.routes.js`
- [X] T002 [P] Create backend account constants/errors scaffold in `backend/src/modules/account/account.constants.js`
- [X] T003 [P] Create frontend account feature scaffold in `frontend/src/features/account/AccountModule.jsx`
- [X] T004 Create frontend account API service scaffold in `frontend/src/services/account.api.js`
- [X] T005 Update feature quickstart references to account module paths in `specs/005-account-management/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core account infrastructure required before user-story implementation.

**CRITICAL**: No user story work starts before this phase is complete.

- [X] T006 Implement account domain models (`StudentAccount`, `AccountAuditEvent`) in `backend/src/modules/account/account.model.js`
- [X] T007 [P] Implement account audit repository/service in `backend/src/modules/account/accountAudit.service.js`
- [X] T008 [P] Implement identity fallback and privacy policy helpers in `backend/src/modules/account/identity.policy.js`
- [X] T009 Implement account authorization precondition guard (requires Feature 011 authenticated + UET-verified context) in `backend/src/modules/account/account.guard.js`
- [X] T010 Implement base account service skeleton for profile/password operations in `backend/src/modules/account/account.service.js`
- [X] T011 Implement base account controller + router skeleton in `backend/src/modules/account/account.controller.js`
- [X] T012 Mount account routes with guard in `backend/src/app.js`
- [X] T013 [P] Create frontend account settings store (loading/error/success state) in `frontend/src/stores/accountSettings.store.js`
- [X] T014 [P] Create frontend reusable account settings form schema/validators in `frontend/src/features/account/accountSettings.validation.js`
- [X] T015 Create account settings route entry integration in `frontend/src/App.jsx`

**Checkpoint**: Foundation ready; user stories can now be developed independently.

---

## Phase 3: User Story 1 - Update Basic Account Profile (Priority: P1) 🎯 MVP

**Goal**: Authenticated UET student updates `displayName`, `fullName`, `privacySetting`, and avatar image from Account Settings using `Import Image` / `Delete image` controls (API field `avatarUrl`).

**Independent Test**: Save profile updates and verify persisted values are returned on refresh with ownership enforcement.

### Tests for User Story 1

- [X] T016 [P] [US1] Add backend unit test for profile read mapper and ownership guard behavior in `backend/tests/unit/account/account.profile.get.test.js`
- [X] T017 [P] [US1] Add backend unit test for profile patch validation and field update rules in `backend/tests/unit/account/account.profile.patch.test.js`
- [X] T018 [P] [US1] Add frontend unit test for basic account profile save form logic in `frontend/src/features/account/AccountSettings.basic.test.jsx`

### Implementation for User Story 1

- [X] T019 [US1] Implement `GET /api/account/profile` identity payload (`displayName`, `fullName`, `privacySetting`, `avatarUrl`, `effectiveDisplayName`) in `backend/src/modules/account/account.service.js`
- [X] T020 [US1] Implement basic profile update logic and field validation in `backend/src/modules/account/account.service.js`
- [X] T021 [US1] Implement profile API handlers in `backend/src/modules/account/account.controller.js`
- [X] T022 [P] [US1] Implement account settings basic profile UI section (including `Import Image` / `Delete image` controls) in `frontend/src/features/account/AccountSettingsPage.jsx`
- [X] T023 [P] [US1] Implement frontend profile API calls (`getProfile`, `updateProfile`) in `frontend/src/services/account.api.js`
- [X] T024 [US1] Emit `PROFILE_UPDATED` audit event on successful basic profile change in `backend/src/modules/account/accountAudit.service.js`

**Checkpoint**: User Story 1 works end-to-end and is independently testable.

---

## Phase 5: User Story 2 - Change Password (Priority: P2)

**Goal**: Authenticated user changes password by providing current password and new password.

**Independent Test**: Wrong current password is rejected; correct current password updates hash; old password no longer authenticates.

### Tests for User Story 2

- [X] T042 [P] [US2] Add backend unit test for password change success/failure cases, including password policy validation (>= 8 chars with letter/number/special), in `backend/tests/unit/account/account.password-change.test.js`
- [X] T043 [P] [US2] Add backend unit test for password change verification helper in `backend/tests/unit/account/password-change.service.test.js`
- [X] T044 [P] [US2] Add frontend test for password change form validation (>= 8 chars with letter/number/special) and submit states in `frontend/src/features/account/AccountPasswordChange.test.jsx`

### Implementation for User Story 2

- [X] T045 [US2] Implement password change service (verify current password, enforce password policy, update hash) in `backend/src/modules/account/account.service.js`
- [X] T046 [US2] Implement password change endpoint handler in `backend/src/modules/account/account.controller.js`
- [X] T047 [US2] Emit `PASSWORD_CHANGED` audit event in `backend/src/modules/account/accountAudit.service.js`
- [X] T048 [P] [US2] Implement frontend password change section in `frontend/src/features/account/AccountPasswordSection.jsx`

**Checkpoint**: User Story 2 is independently testable and does not regress other stories.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, documentation, and regression hardening across all stories.

- [X] T049 [P] Update API examples and validation notes in `specs/005-account-management/contracts/rest-api.md`
- [X] T050 [P] Update manual verification checklist with final endpoint names and expected errors in `specs/005-account-management/quickstart.md`
- [X] T051 Run backend + frontend test suites and document results in `specs/005-account-management/checklists/requirements.md`
- [X] T052 Perform security review pass for ownership/privacy fallback regressions in `backend/src/modules/account/account.service.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies.
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories.
- Phase 3 (US1) and Phase 5 (US2): both depend on Phase 2.
- Phase 7 (Polish): depends on completion of selected user stories.

### User Story Dependencies

- US1 (P1): can start right after Foundational.
- US2 (P2): depends on Foundational; can run independently of US1.

### Within Each User Story

- Tests first (create failing tests before implementation).
- Service/domain logic before controller wiring.
- Backend endpoint completion before frontend wiring.
- Audit event instrumentation before story checkpoint closure.

## Parallel Execution Examples

### User Story 1

- Run in parallel: T016, T017, T018
- Run in parallel: T022, T023

### User Story 2

- Run in parallel: T042, T043, T044
- Run in parallel: T047, T048 after T045 endpoint contract is finalized

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) as first production increment.
3. Validate US1 independently before continuing.

### Incremental Delivery

2. Add Phase 5 (US2) for password hygiene.
3. Finish with Phase 7 polish and full regression verification.

### Suggested MVP Scope

- MVP: US1 only (basic profile management) after Setup + Foundational.

