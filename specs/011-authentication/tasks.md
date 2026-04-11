# Tasks: UET Authentication and Access Control Update

**Input**: Design documents from `/specs/011-authentication/`
**Prerequisites**: `plan.md` (required), `spec.md` (required for user stories), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Included because the feature spec defines a regression checklist and the plan calls for unit-focused verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare shared auth/access wiring and client entry points.

- [X] T001 Update backend auth module export and route mounting in `backend/src/modules/auth/index.js` and `backend/src/modules/auth/auth.routes.js`
- [X] T002 [P] Update frontend auth API surface in `frontend/src/services/auth.api.js`
- [X] T003 [P] Update frontend auth provider bootstrap and post-login route decisions in `frontend/src/providers/AuthProvider.jsx`
- [X] T004 Update top-level app route wiring for public/private path handling in `frontend/src/App.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth primitives and guards required before any user story work.

**CRITICAL**: No user story work starts before this phase is complete.

- [X] T005 [P] Implement auth identity/domain policy helpers in `backend/src/modules/auth/identity.policy.js`
- [X] T006 [P] Update account identity and session models for `guest` and `uet_student` semantics in `backend/src/modules/auth/user.model.js` and `backend/src/modules/auth/refreshToken.model.js`
- [X] T007 [P] Implement OTP challenge lifecycle helpers, resend counters, and audit event persistence in `backend/src/modules/auth/token.service.js`
- [X] T008 [P] Implement Google login branching and domain deny behavior in `backend/src/modules/auth/google.service.js`
- [X] T009 Implement password reset session invalidation helpers in `backend/src/modules/auth/password.service.js`
- [X] T010 Implement auth controller and route skeleton updates for public/auth flows in `backend/src/modules/auth/auth.controller.js` and `backend/src/modules/auth/auth.routes.js`
- [X] T011 Implement guest/private access enforcement in `backend/src/middleware/auth.middleware.js` and `frontend/src/guards/AuthGuard.jsx`

**Checkpoint**: Foundation ready; user stories can now be developed independently.

---

## Phase 3: User Story 1 - Guest Public Access Boundaries (Priority: P1) 🎯 MVP

**Goal**: Guest users can access only sample roadmap and public shared roadmap; all private routes/APIs are blocked.

**Independent Test**: As an unauthenticated user, verify exactly the two public capabilities work, private UI redirects to login, and private APIs return 401.

### Tests for User Story 1

- [ ] T012 [P] [US1] Add backend unit tests for guest private-API denial and public allow-list in `backend/tests/unit/auth/auth.middleware.test.js`
- [ ] T013 [P] [US1] Add backend unit tests for sample roadmap and public shared roadmap access in `backend/tests/unit/auth/public-access.test.js`
- [ ] T014 [P] [US1] Add frontend unit tests for guest redirect behavior in `frontend/src/guards/AuthGuard.test.jsx`
- [ ] T015 [P] [US1] Add frontend unit tests for guest public homepage capabilities in `frontend/src/features/general/Homepage.test.jsx`

### Implementation for User Story 1

- [X] T016 [US1] Expose sample roadmap and public shared roadmap routes without auth in `backend/src/modules/roadmap/roadmap.routes.js` and `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T019 [P] [US1] Render guest public roadmap entry points on the homepage in `frontend/src/features/general/Homepage.jsx`
- [X] T020 [US1] Wire public/private route handling in `frontend/src/App.jsx`

**Checkpoint**: User Story 1 works end-to-end and is independently testable.

---

## Phase 4: User Story 2 - UET-Only Authentication Rules (Priority: P1)

**Goal**: Email-password and Google auth accept only `@vnu.edu.vn` identities; non-UET identities are rejected.

**Independent Test**: Verify existing `@vnu.edu.vn`, new `@vnu.edu.vn`, and non-`@vnu.edu.vn` flows for email-password and Google login.

### Tests for User Story 2

- [ ] T021 [P] [US2] Add backend unit tests for `@vnu.edu.vn` signup/login domain rejection and `signup`/`login_fail` event emission in `backend/tests/unit/auth/register.validation.test.js` and `backend/tests/unit/auth/login.controller.test.js`
- [ ] T022 [P] [US2] Add backend unit tests for Google login existing/new/deny branching in `backend/tests/unit/auth/google.service.test.js`
- [ ] T023 [P] [US2] Add backend unit tests for identity and domain helpers in `backend/tests/unit/auth/identity.policy.test.js`
- [ ] T024 [P] [US2] Add frontend unit tests for signup/login domain validation in `frontend/src/features/auth/RegisterPage.test.jsx` and `frontend/src/features/auth/LoginPage.test.jsx`
- [ ] T024A [P] [US2] Add backend unit tests for `login_success` and `google_login_denied_domain` event emission in `backend/tests/unit/auth/google.service.test.js` and `backend/tests/unit/auth/loginResponse.contract.test.js`

### Implementation for User Story 2

- [X] T025 [US2] Enforce `@vnu.edu.vn` domain policy in `backend/src/modules/auth/identity.policy.js`
- [X] T026 [US2] Update registration and login request handling to reject non-UET identities in `backend/src/modules/auth/auth.controller.js` and `backend/src/modules/auth/auth.service.js`
- [X] T027 [P] [US2] Implement Google login existing/new/deny branching in `backend/src/modules/auth/google.service.js`
- [X] T028 [P] [US2] Update auth form validation and messaging in `frontend/src/features/auth/RegisterPage.jsx`, `frontend/src/features/auth/LoginPage.jsx`, and `frontend/src/services/auth.api.js`

**Checkpoint**: User Story 2 is independently testable and does not depend on the OTP/password stories.

---

## Phase 5: User Story 3 - OTP Policy for Verification and Password Reset (Priority: P1)

**Goal**: OTPs for signup verification and forgot-password are 4 digits, expire in 2 minutes, and obey resend cooldown and dual hourly caps.

**Independent Test**: Verify format, TTL expiry, resend cooldown, dual hourly caps, and uncapped wrong attempts within TTL.

### Tests for User Story 3

- [ ] T029 [P] [US3] Add backend unit tests for OTP 4-digit format, TTL expiry, and uncapped wrong attempts in `backend/tests/unit/auth/resetOtp.service.test.js`
- [ ] T030 [P] [US3] Add backend unit tests for resend cooldown and dual hourly caps in `backend/tests/unit/auth/forgotPassword.request.test.js` and `backend/tests/unit/auth/token.service.test.js`
- [ ] T031 [P] [US3] Add backend unit tests for `otp_send`, `otp_resend`, and `otp_verify_fail` event emission in `backend/tests/unit/auth/auth.service.test.js`
- [ ] T032 [P] [US3] Add frontend unit tests for OTP entry and resend state in `frontend/src/features/auth/ForgotPasswordPage.test.jsx` and `frontend/src/features/auth/RegisterPage.test.jsx`

### Implementation for User Story 3

- [X] T033 [US3] Implement 4-digit OTP issuance and 2-minute expiry in `backend/src/modules/auth/token.service.js`
- [X] T034 [US3] Implement resend cooldown and per-account/per-IP hourly limits in `backend/src/modules/auth/token.service.js`
- [X] T035 [US3] Wire verify and resend flows for signup verification and forgot-password in `backend/src/modules/auth/auth.controller.js` and `backend/src/modules/auth/auth.routes.js`
- [X] T036 [P] [US3] Update forgot-password and signup OTP UI flows in `frontend/src/features/auth/ForgotPasswordPage.jsx` and `frontend/src/features/auth/RegisterPage.jsx`

**Checkpoint**: User Story 3 is independently testable and enforces the clarified OTP policy.

---

## Phase 6: User Story 4 - Session and Audit Guarantees (Priority: P2)

**Goal**: Password reset invalidates only the current session/device, and mandatory audit events are recorded.

**Independent Test**: Complete password reset and verify only the current session/device logs out; confirm all required audit events are emitted.

### Tests for User Story 4

- [ ] T037 [P] [US4] Add backend unit tests for current-session-only password reset logout in `backend/tests/unit/auth/resetPassword.controller.test.js`
- [ ] T038 [P] [US4] Add backend unit tests for `password_reset_success` event emission in `backend/tests/unit/auth/resetPassword.controller.test.js`
- [ ] T039 [P] [US4] Add frontend unit tests for post-reset session handling in `frontend/src/features/auth/AuthProvider.test.jsx`

### Implementation for User Story 4

- [X] T040 [US4] Implement current-session-only invalidation after password reset in `backend/src/modules/auth/password.service.js` and `backend/src/modules/auth/refreshToken.model.js`
- [X] T041 [US4] Emit and verify all mandatory audit events (`signup`, `login_success`, `login_fail`, `otp_send`, `otp_resend`, `otp_verify_fail`, `password_reset_success`, `google_login_denied_domain`) in `backend/src/modules/auth/auth.service.js` and `backend/src/modules/auth/auth.controller.js`
- [X] T042 [P] [US4] Update frontend auth provider/session bootstrap for password-reset logout handling in `frontend/src/providers/AuthProvider.jsx`

**Checkpoint**: User Story 4 is independently testable and audit/session guarantees are enforced.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, documentation alignment, and regression hardening across all stories.

- [X] T043 [P] Remove obsolete deletion API routes and client methods from `backend/src/modules/auth/auth.routes.js` and `frontend/src/services/auth.api.js`
- [X] T044 [P] Update API examples and boundary notes in `specs/011-authentication/contracts/rest-api.md`
- [ ] T045 [P] Update quickstart and regression checklist in `specs/011-authentication/quickstart.md`
- [X] T046 Run auth-focused backend and frontend test suites and document results in `specs/011-authentication/checklists/requirements.md`
- [X] T047 [P] Perform final security review for guest/private boundary, UET domain checks, OTP limits, and session/audit guarantees in `backend/src/modules/auth/auth.middleware.js` and `backend/src/modules/auth/auth.service.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): no dependencies.
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories.
- Phase 3 (US1), Phase 4 (US2), Phase 5 (US3), and Phase 6 (US4): all depend on Phase 2.
- Phase 7 (Polish): depends on completion of the desired user stories.

### User Story Dependencies

- US1 (P1): can start right after Foundational and serves as the MVP.
- US2 (P1): can start right after Foundational; independent from US1.
- US3 (P1): can start right after Foundational; independent from US1/US2.
- US4 (P2): can start right after Foundational; may consume shared auth primitives but remains independently testable.

### Within Each User Story

- Tests (if included) MUST be written and fail before implementation.
- Backend service/policy work before controller/route wiring.
- Route/public-path updates before frontend guard or page wiring.
- Story complete before moving to the next priority.

### Parallel Opportunities

- Setup tasks T002, T003 can run in parallel after T001/T004 are understood.
- Foundational tasks T005, T006, T007, T008 can run in parallel.
- US1 tests T012-T015 can run in parallel.
- US2 tests T021-T024 can run in parallel.
- US3 tests T029-T032 can run in parallel.
- US4 tests T037-T039 can run in parallel.

### Audit Event Coverage Matrix

- `signup` -> T021, T041
- `login_success` -> T024A, T041
- `login_fail` -> T021, T041
- `otp_send` -> T031, T041
- `otp_resend` -> T031, T041
- `otp_verify_fail` -> T031, T041
- `password_reset_success` -> T038, T041
- `google_login_denied_domain` -> T024A, T041

---

## Parallel Example: User Story 1

```bash
# Launch all User Story 1 tests together:
Task: "Add backend unit tests for guest private-API denial and public allow-list in backend/tests/unit/auth/auth.middleware.test.js"
Task: "Add backend unit tests for sample roadmap and feedback public access in backend/tests/unit/auth/public-access.test.js"
Task: "Add frontend unit tests for guest redirect behavior in frontend/src/guards/AuthGuard.test.jsx"
Task: "Add frontend unit tests for guest public homepage capabilities in frontend/src/features/general/Homepage.test.jsx"

# Run the public-route implementation tasks in parallel:
Task: "Expose sample roadmap and public shared roadmap routes without auth in backend/src/modules/roadmap/roadmap.routes.js and backend/src/modules/roadmap/roadmap.controller.js"
Task: "Create public feedback submission module in backend/src/modules/feedback/index.js, backend/src/modules/feedback/feedback.routes.js, backend/src/modules/feedback/feedback.controller.js, and backend/src/modules/feedback/feedback.service.js"
Task: "Render guest public capability entry points on the homepage in frontend/src/features/general/Homepage.jsx"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) as the first production increment.
3. Validate guest/public boundary behavior independently before continuing.

### Incremental Delivery

1. Add US2 for UET-only auth rules.
2. Add US3 for OTP policy enforcement.
3. Add US4 for session and audit guarantees.
4. Finish with Phase 7 polish and full regression verification.

### Suggested MVP Scope

- MVP: US1 only (guest public access boundaries) after Setup + Foundational.