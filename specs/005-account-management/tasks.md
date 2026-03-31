# Tasks: Student Account Management

**Input**: Design documents from `/specs/005-account-management/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Jest unit tests are required for this feature (per plan + constitution check). Include tests before implementation in each user story phase.

**Organization**: Tasks are grouped by user story so each story can be built and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4, US5, US6, US7, US8)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish auth/account module scaffolding and dependencies for backend + frontend.

- [X] T001 Create auth module directory scaffold and module export in `backend/src/modules/auth/index.js`
- [X] T002 [P] Add auth and security dependencies (`jsonwebtoken`, `bcryptjs`, `google-auth-library`, `nodemailer`, `cookie-parser`, `helmet`, `express-rate-limit`, `uuid`) in `backend/package.json`
- [X] T003 [P] Add Google Sign-In dependency (`@react-oauth/google`) in `frontend/package.json`
- [X] T004 Add feature environment variable documentation for auth/session/email/Google setup in `specs/005-account-management/quickstart.md`
- [X] T005 Create frontend auth feature entry scaffold in `frontend/src/features/auth/AuthModule.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth/account infrastructure that MUST exist before user stories can be implemented.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [X] T006 Implement `User` schema with account states, OTP sub-documents, identity/privacy fields, and lockout fields in `backend/src/modules/auth/user.model.js`
- [X] T007 [P] Implement `RefreshToken` schema with family rotation and TTL index in `backend/src/modules/auth/refreshToken.model.js`
- [X] T008 [P] Implement `DeletedEmail` schema for deletion audit/re-registration eligibility in `backend/src/modules/auth/deletedEmail.model.js`
- [X] T009 [P] Implement notification persistence schema for auth-triggered in-app events in `backend/src/modules/notifications/notification.model.js`
- [X] T010 Implement shared identity fallback policy helpers (`resolveEffectiveDisplayName`, sanitization) in `backend/src/modules/auth/identity.policy.js`
- [X] T011 Implement token primitives (AT issue/verify + opaque RT generate/hash) in `backend/src/modules/auth/token.service.js`
- [X] T012 [P] Implement email transport + templates for registration OTP, reset OTP, and deletion confirmation in `backend/src/modules/auth/auth.email.js`
- [X] T013 [P] Implement notification service + SSE connection store for auth/account events in `backend/src/modules/notifications/notification.service.js`
- [X] T014 Create baseline auth router/controller skeleton with input validation and shared error envelope mapping in `backend/src/modules/auth/auth.routes.js`
- [X] T015 Mount auth/account/notification routes and middleware (`helmet`, `cookie-parser`, CORS credentials) in `backend/src/app.js`

**Checkpoint**: Shared foundations complete; user stories can proceed.

---

## Phase 3: User Story 1 - Register as a New UET Student (Priority: P1) 🎯 MVP

**Goal**: Students register with `@vnu.edu.vn`, receive 4-digit OTP, verify within 2 minutes, and recover locked-unverified accounts through OTP resend.

**Independent Test**: Register with valid `@vnu.edu.vn` email, receive OTP, verify within 2 minutes, then confirm active login eligibility; also verify timeout lock + resend-unlock flow.

### Tests for User Story 1

- [X] T016 [P] [US1] Add registration validation unit tests for required fields, domain enforcement, and duplicate email handling in `backend/tests/unit/auth/register.validation.test.js`
- [X] T017 [P] [US1] Add email verification OTP lifecycle tests (issue, expiry at 2 minutes, lock transition, resend unlock) in `backend/tests/unit/auth/emailVerification.service.test.js`
- [X] T018 [P] [US1] Add auth controller tests for `POST /api/auth/register`, `POST /api/auth/verify-email`, and `POST /api/auth/resend-otp` in `backend/tests/unit/auth/register.controller.test.js`

### Implementation for User Story 1

- [X] T019 [US1] Implement registration + duplicate-email guard + pending account creation in `backend/src/modules/auth/auth.service.js`
- [X] T020 [US1] Implement verify-email and resend-otp service flow with locked-unverified account recovery in `backend/src/modules/auth/auth.service.js`
- [X] T021 [US1] Implement register/verify/resend controllers and route wiring in `backend/src/modules/auth/auth.controller.js`
- [X] T022 [P] [US1] Build registration page with inline `@vnu.edu.vn` validation and OTP verification step in `frontend/src/features/auth/RegisterPage.jsx`
- [X] T023 [US1] Add registration API client methods (`register`, `verifyEmail`, `resendOtp`) in `frontend/src/features/auth/auth.api.js`

**Checkpoint**: US1 registration and email verification flow is independently functional.

---

## Phase 4: User Story 2 - Log In with Email and Password (Priority: P1)

**Goal**: Verified students log in with email/password, with 5-failure lockout for 15 minutes and correct lockout messaging.

**Independent Test**: Login succeeds with correct credentials; 5 consecutive failures trigger 15-minute lockout and remaining-time responses; lockout clears after timeout.

### Tests for User Story 2

- [X] T024 [P] [US2] Add password hash/verify tests (`bcryptjs`, 12 rounds) in `backend/tests/unit/auth/password.service.test.js`
- [X] T025 [P] [US2] Add login lockout tests for failed attempt counter, 5th failure lock, and 15-minute release in `backend/tests/unit/auth/loginLockout.service.test.js`
- [X] T026 [P] [US2] Add login controller tests for `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`, and `EMAIL_NOT_VERIFIED` mappings in `backend/tests/unit/auth/login.controller.test.js`

### Implementation for User Story 2

- [X] T027 [US2] Implement password hashing/verification helpers in `backend/src/modules/auth/password.service.js`
- [X] T028 [US2] Implement email/password login service with lockout timer and failure reset on success in `backend/src/modules/auth/auth.service.js`
- [X] T029 [US2] Implement login endpoint response contract (`accessToken`, onboarding state placeholder, lockout details) in `backend/src/modules/auth/auth.controller.js`
- [X] T030 [US2] Build email/password login form with generic credential error and lockout countdown messaging in `frontend/src/features/auth/LoginPage.jsx`

**Checkpoint**: US2 email/password login and lockout behavior is independently functional.

---

## Phase 5: User Story 3 - Log In with Google (Priority: P1)

**Goal**: Students authenticate via Google account picker with strict `@vnu.edu.vn` domain enforcement and existing/new account handling.

**Independent Test**: Google sign-in with `@vnu.edu.vn` grants access and onboarding flow; non-`@vnu.edu.vn` fails with clear domain restriction error.

### Tests for User Story 3

- [X] T031 [P] [US3] Add Google token verification unit tests (`email_verified`, audience check, domain enforcement) in `backend/tests/unit/auth/google.service.test.js`
- [X] T032 [P] [US3] Add Google login service tests for existing-account login vs new-account creation in `backend/tests/unit/auth/googleLogin.service.test.js`
- [X] T033 [P] [US3] Add controller tests for `POST /api/auth/google` 200/201/403/400 paths in `backend/tests/unit/auth/google.controller.test.js`

### Implementation for User Story 3

- [X] T034 [US3] Implement Google ID token verification service (`google-auth-library`) in `backend/src/modules/auth/google.service.js`
- [X] T035 [US3] Implement Google login/register orchestration in `backend/src/modules/auth/auth.service.js`
- [X] T036 [US3] Implement Google login controller route and domain-specific error mapping in `backend/src/modules/auth/auth.controller.js`
- [X] T037 [US3] Integrate Google OAuth provider + Google login button flow in `frontend/src/features/auth/LoginPage.jsx`

**Checkpoint**: US3 Google sign-in is independently functional.

---

## Phase 6: User Story 4 - Recover Account via Forgot Password (Priority: P2)

**Goal**: Students reset passwords via 4-digit OTP with 2-minute expiry, 10 wrong-attempt cap, and non-enumerating generic request response.

**Independent Test**: Request reset, receive OTP, verify OTP within 2 minutes, set new password, then login succeeds with the new password; unknown email still returns generic response.

### Tests for User Story 4

- [X] T038 [P] [US4] Add forgot-password request tests to enforce generic response for both known and unknown emails in `backend/tests/unit/auth/forgotPassword.request.test.js`
- [X] T039 [P] [US4] Add reset OTP verification tests for expiry and 10-attempt invalidation behavior in `backend/tests/unit/auth/resetOtp.service.test.js`
- [X] T040 [P] [US4] Add reset-password controller tests for `POST /api/auth/verify-reset-otp` and `POST /api/auth/reset-password`, including `PASSWORD_RESET_COMPLETED` audit-record assertion, in `backend/tests/unit/auth/resetPassword.controller.test.js`

### Implementation for User Story 4

- [X] T041 [US4] Implement forgot-password OTP issuance with generic response policy in `backend/src/modules/auth/password.service.js`
- [X] T042 [US4] Implement reset OTP verify flow + short-lived reset token + password update flow with `PASSWORD_RESET_COMPLETED` audit-record write in `backend/src/modules/auth/password.service.js`
- [X] T043 [US4] Implement forgot-password, verify-reset-otp, and reset-password routes/controllers in `backend/src/modules/auth/auth.controller.js`
- [X] T044 [US4] Build forgot-password UI (email submit -> OTP verify -> new password) in `frontend/src/features/auth/ForgotPasswordPage.jsx`

**Checkpoint**: US4 password recovery is independently functional.

---

## Phase 7: User Story 5 - Post-Login Routing by Onboarding State (Priority: P2)

**Goal**: Every successful login returns and applies onboarding state (`NEVER_STARTED`, `DRAFT_IN_PROGRESS`, `COMPLETED`) to drive correct post-login UX.

**Independent Test**: Use three accounts (never started, draft, completed) and verify each login path triggers the correct homepage/onboarding behavior.

### Tests for User Story 5

- [X] T045 [P] [US5] Add onboarding-state resolver tests from `student_profiles` (`null`, draft, completed`) and key draft-field restoration checks (`major`, `completedCourseIds`, `careerGoal`, `personalAspirations`) in `backend/tests/unit/auth/onboardingState.service.test.js`
- [X] T046 [P] [US5] Add login response tests ensuring onboarding state is included for email and Google login in `backend/tests/unit/auth/loginResponse.contract.test.js`
- [X] T047 [P] [US5] Add frontend auth provider tests for onboarding-route decision handling and key draft-field rehydration on re-login in `frontend/src/features/auth/AuthProvider.test.jsx`

### Implementation for User Story 5

- [X] T048 [US5] Implement onboarding-state lookup integration in auth login service using onboarding profile read in `backend/src/modules/auth/auth.service.js`
- [X] T049 [US5] Implement AuthProvider state management (AT in memory + onboarding-state propagation) in `frontend/src/providers/AuthProvider.jsx`
- [X] T050 [US5] Implement auth guard redirect behavior for authenticated/unauthenticated route access in `frontend/src/guards/AuthGuard.jsx`
- [X] T051 [US5] Wire onboarding state to onboarding panel trigger and account-settings reopen entry in `frontend/src/App.jsx`

**Checkpoint**: US5 post-login routing is independently functional.

---

## Phase 8: User Story 6 - Update Profile, Identity Preferences, and Trigger Re-personalization (Priority: P2)

**Goal**: Students update account/profile fields, apply global identity/privacy policy, and trigger roadmap re-personalization only when onboarding fields change.

**Independent Test**: For onboarded student, update onboarding field and verify `repersonalizationPending=true`, roadmap CTA signal, and in-app notification with roadmap link; non-onboarding-only updates do not trigger signal.

### Tests for User Story 6

- [X] T052 [P] [US6] Add identity policy tests for `displayName/fullName/privacySetting` and fallback order resolution in `backend/tests/unit/auth/identity.policy.test.js`
- [X] T053 [P] [US6] Add profile update diff-detection tests for onboarding fields vs non-onboarding fields in `backend/tests/unit/auth/profileSettings.service.test.js`
- [X] T054 [P] [US6] Add notifications endpoint tests (`GET /api/notifications`, `PATCH /api/notifications/:id/read`) and `REPERSONALIZE` delivery timing assertion (<= 5 seconds) in `backend/tests/unit/notifications/notification.controller.test.js`

### Implementation for User Story 6

- [X] T055 [US6] Implement `GET/PATCH /api/account/profile` with explicit `displayName`, `fullName`, `privacySetting` handling in `backend/src/modules/auth/profileSettings.service.js`
- [X] T056 [US6] Implement onboarding-field change detection to set `student_profiles.repersonalizationPending` in `backend/src/modules/auth/profileSettings.service.js`
- [X] T057 [US6] Implement `REPERSONALIZE` notification creation + SSE push integration in `backend/src/modules/notifications/notification.service.js`
- [X] T058 [US6] Implement account profile + notifications controllers/routes in `backend/src/modules/auth/auth.controller.js`
- [X] T059 [US6] Build account settings page for identity/privacy/avatar and conditional onboarding profile fields in `frontend/src/features/auth/AccountSettingsPage.jsx`
- [X] T060 [US6] Extend single frontend auth API client with profile/notification methods and roadmap-link notification handling in `frontend/src/features/auth/auth.api.js`

**Checkpoint**: US6 profile updates and re-personalization signaling are independently functional.

---

## Phase 9: User Story 7 - Change Password, Manage Google Links, and Delete Account (Priority: P3)

**Goal**: Logged-in students self-manage password, linked Google accounts, and hard-delete account via email confirmation token.

**Independent Test**: Independently validate password change, Google link/unlink, and deletion-request/confirmation cascade including email re-registration eligibility.

### Tests for User Story 7

- [X] T061 [P] [US7] Add authenticated password-change tests (`currentPassword` verification required) with `PASSWORD_CHANGED` audit-record assertion in `backend/tests/unit/auth/changePassword.service.test.js`
- [X] T062 [P] [US7] Add link/unlink Google account tests including cross-account conflict handling in `backend/tests/unit/auth/googleLinking.service.test.js`
- [X] T063 [P] [US7] Add deletion-token and hard-delete cascade tests (`users`, `student_profiles`, `refresh_tokens`, `notifications`, `deleted_emails`) in `backend/tests/unit/auth/deletion.service.test.js`

### Implementation for User Story 7

- [X] T064 [US7] Implement `POST /api/account/change-password` with `PASSWORD_CHANGED` audit-record write in `backend/src/modules/auth/profileSettings.service.js`
- [X] T065 [US7] Implement `POST /api/account/link-google` and `DELETE /api/account/link-google/:googleId` in `backend/src/modules/auth/google.service.js`
- [X] T066 [US7] Implement deletion request + token confirmation + cascade delete in `backend/src/modules/auth/deletion.service.js`
- [X] T067 [US7] Implement account-management endpoints for change-password/link/unlink/request-deletion/confirm-deletion in `backend/src/modules/auth/auth.controller.js`
- [X] T068 [US7] Extend account settings UI with password change, linked Google management, and delete-account flow in `frontend/src/features/auth/AccountSettingsPage.jsx`
- [X] T069 [US7] Add account-security API methods to single frontend auth API client in `frontend/src/features/auth/auth.api.js`
- [X] T070 [US7] Add post-deletion cleanup and redirect-to-login handling in `frontend/src/providers/AuthProvider.jsx`

**Checkpoint**: US7 account self-service management is independently functional.

---

## Phase 10: User Story 8 - Log Out (Priority: P3)

**Goal**: Students can terminate their session immediately and are blocked from authenticated routes until re-authentication.

**Independent Test**: Trigger logout and verify refresh token revocation, access loss, and forced redirect when opening protected routes.

### Tests for User Story 8

- [X] T071 [P] [US8] Add logout service/controller tests for refresh-token revocation and cookie clearing in `backend/tests/unit/auth/logout.controller.test.js`
- [X] T072 [P] [US8] Add frontend auth guard tests to verify redirect after logout in `frontend/src/guards/AuthGuard.test.jsx`

### Implementation for User Story 8

- [X] T073 [US8] Implement `POST /api/auth/logout` with refresh token revocation and cookie clear in `backend/src/modules/auth/auth.service.js`
- [X] T074 [US8] Implement frontend logout action and protected-route invalidation in `frontend/src/providers/AuthProvider.jsx`

**Checkpoint**: US8 logout and route protection behavior is independently functional.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, documentation, and validation across stories.

- [X] T075 [P] Add auth/account module README with endpoint map and ownership boundaries in `backend/src/modules/auth/README.md`
- [X] T076 [P] Add frontend auth UX polish for loading/error/success states across auth pages in `frontend/src/features/auth/AuthModule.jsx`
- [X] T077 Run and stabilize auth/account unit test suite via `scripts/run-tests.mjs`
- [X] T078 Validate quickstart manual scenarios and document outcomes in `specs/005-account-management/checklists/requirements.md`
- [X] T079 Security hardening review for cookie flags, CORS credentials, and sensitive logging redaction in `backend/src/app.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3+ (User Stories)**: Depend on Phase 2 completion.
- **Phase 11 (Polish)**: Depends on all targeted user stories being complete.

### User Story Dependency Graph

- **US1 (P1)**: Starts after Phase 2; no user-story dependency.
- **US2 (P1)**: Depends on US1 account activation path and shared token/password foundations.
- **US3 (P1)**: Depends on US1 user lifecycle foundations; independent from US2 after Phase 2.
- **US4 (P2)**: Depends on US2 password service foundations.
- **US5 (P2)**: Depends on successful login flows from US2 and US3.
- **US6 (P2)**: Depends on US5 authenticated session + onboarding state usage.
- **US7 (P3)**: Depends on US3 Google verification service and US6 account settings surface.
- **US8 (P3)**: Depends on US2/US3 session issuance and refresh-token foundations.

Suggested completion order: **US1 -> (US2, US3 in parallel) -> US4 -> US5 -> US6 -> (US7, US8 in parallel)**.

---

## Parallel Execution Examples

### User Story 1

Run in parallel after T015:

- T016 `backend/tests/unit/auth/register.validation.test.js`
- T017 `backend/tests/unit/auth/emailVerification.service.test.js`
- T018 `backend/tests/unit/auth/register.controller.test.js`
- T022 `frontend/src/features/auth/RegisterPage.jsx`

### User Story 2

Run in parallel after T023:

- T024 `backend/tests/unit/auth/password.service.test.js`
- T025 `backend/tests/unit/auth/loginLockout.service.test.js`
- T026 `backend/tests/unit/auth/login.controller.test.js`

### User Story 3

Run in parallel after T030:

- T031 `backend/tests/unit/auth/google.service.test.js`
- T032 `backend/tests/unit/auth/googleLogin.service.test.js`
- T033 `backend/tests/unit/auth/google.controller.test.js`

### User Story 4

Run in parallel after T037:

- T038 `backend/tests/unit/auth/forgotPassword.request.test.js`
- T039 `backend/tests/unit/auth/resetOtp.service.test.js`
- T040 `backend/tests/unit/auth/resetPassword.controller.test.js`

### User Story 5

Run in parallel after T044:

- T045 `backend/tests/unit/auth/onboardingState.service.test.js`
- T046 `backend/tests/unit/auth/loginResponse.contract.test.js`
- T047 `frontend/src/features/auth/AuthProvider.test.jsx`

### User Story 6

Run in parallel after T051:

- T052 `backend/tests/unit/auth/identity.policy.test.js`
- T053 `backend/tests/unit/auth/profileSettings.service.test.js`
- T054 `backend/tests/unit/notifications/notification.controller.test.js`
- T059 `frontend/src/features/auth/AccountSettingsPage.jsx`

### User Story 7

Run in parallel after T060:

- T061 `backend/tests/unit/auth/changePassword.service.test.js`
- T062 `backend/tests/unit/auth/googleLinking.service.test.js`
- T063 `backend/tests/unit/auth/deletion.service.test.js`

### User Story 8

Run in parallel after T070:

- T071 `backend/tests/unit/auth/logout.controller.test.js`
- T072 `frontend/src/guards/AuthGuard.test.jsx`

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independent test criteria before expanding scope.

### Incremental Delivery

1. Deliver MVP (US1 registration + verification).
2. Add core login methods (US2, US3).
3. Add recovery and routing (US4, US5).
4. Add account settings and re-personalization signal (US6).
5. Add advanced account management and logout hardening (US7, US8).
6. Finish polish and full validation.

### Parallel Team Strategy

1. Team completes Phase 1 and Phase 2 together.
2. Split core auth work:
   - Developer A: US2 (email/password login)
   - Developer B: US3 (Google sign-in)
3. Rejoin for US5/US6 integration, then split US7 and US8 in parallel.
