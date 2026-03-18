# Tasks: Student Profile Onboarding

**Input**: Design documents from /specs/001-profile-onboarding/
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize feature scaffolding and runtime configuration for onboarding.

- [X] T001 Create onboarding backend module skeleton in backend/src/modules/onboarding/{onboarding.model.js,onboarding.service.js,onboarding.controller.js,onboarding.routes.js,onboarding.validation.js,onboarding.errors.js,onboarding.sse.js,onboarding.email.js}
- [X] T002 Create onboarding frontend feature skeleton in frontend/src/features/onboarding/{OnboardingPanel.jsx,MajorSelect.jsx,CourseMultiSelect.jsx,CareerGoalForm.jsx,FreeTextField.jsx,useOnboardingDraft.js,useRoadmapStatus.js}
- [X] T003 [P] Register onboarding route and guard entry points in backend/src/app.js and frontend/src/guards/OnboardingGuard.jsx
- [X] T004 [P] Add onboarding environment variable templates in backend/.env.example and frontend/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared domain and infrastructure required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting any user story.

- [X] T005 Implement StudentProfile schema, unique user index, and canonical completedCourses shape in backend/src/modules/onboarding/onboarding.model.js
- [X] T006 [P] Implement shared free-text validation utility and constants in backend/src/modules/onboarding/onboarding.validation.js
- [X] T007 [P] Implement onboarding error mapping helpers and response envelope in backend/src/modules/onboarding/onboarding.errors.js
- [X] T008 Implement onboarding service core methods (draft upsert, submit transition guard, canonicalization) in backend/src/modules/onboarding/onboarding.service.js
- [X] T009 [P] Implement onboarding API client wrappers (getDraft, putDraft, postSubmit, openStatusStream) in frontend/src/services/onboarding.api.js
- [X] T010 [P] Wire onboarding router/auth middleware and module exports in backend/src/modules/onboarding/onboarding.routes.js and backend/src/app.js

**Checkpoint**: Foundational onboarding domain is ready; user stories can proceed.

---

## Phase 3: User Story 1 - Complete Onboarding and Receive Roadmap (Priority: P1) 🎯 MVP

**Goal**: Allow first-time students to submit onboarding and receive async roadmap-ready notifications.

**Independent Test**: New account submits onboarding (major + one optional field), receives roadmap notification, and onboarding no longer appears.

- [X] T011 [P] [US1] Add submit state transition unit tests in backend/tests/unit/onboarding/stateMachine.test.js
- [X] T012 [US1] Implement POST /api/onboarding/submit validation and controller flow in backend/src/modules/onboarding/onboarding.controller.js and backend/src/modules/onboarding/onboarding.routes.js
- [X] T013 [P] [US1] Implement SSE connection store, heartbeat, and notifyUser() in backend/src/modules/onboarding/onboarding.sse.js
- [X] T014 [P] [US1] Implement roadmap-ready and failure email notifications via Nodemailer in backend/src/modules/onboarding/onboarding.email.js
- [X] T015 [US1] Integrate roadmap trigger and completion/failure notification dispatch in backend/src/modules/onboarding/onboarding.service.js
- [X] T016 [US1] Implement onboarding submit UI flow and required-field gating in frontend/src/features/onboarding/OnboardingPanel.jsx and frontend/src/features/onboarding/CareerGoalForm.jsx
- [X] T017 [US1] Implement roadmap status EventSource lifecycle and notification handling in frontend/src/features/onboarding/useRoadmapStatus.js
- [X] T018 [US1] Enforce post-submit redirect guard in frontend/src/guards/OnboardingGuard.jsx and frontend/src/App.jsx

**Checkpoint**: US1 is independently functional and demoable as MVP.

---

## Phase 4: User Story 2 - Resume an Interrupted Onboarding Session (Priority: P2)

**Goal**: Persist onboarding draft server-side and restore it seamlessly across close/relogin/session-expiry events.

**Independent Test**: Student partially fills onboarding, exits/relogs in, and sees full draft restored with panel reopened.

- [X] T019 [P] [US2] Implement GET/PUT /api/onboarding/draft handlers in backend/src/modules/onboarding/onboarding.controller.js and backend/src/modules/onboarding/onboarding.routes.js
- [X] T020 [US2] Complete atomic draft upsert merge rules and submitted-profile blocking in backend/src/modules/onboarding/onboarding.service.js
- [X] T021 [P] [US2] Implement major selection and course reset-confirm behavior in frontend/src/features/onboarding/MajorSelect.jsx and frontend/src/features/onboarding/CourseMultiSelect.jsx
- [X] T022 [US2] Implement 800ms debounced auto-save and initial draft hydration hook in frontend/src/features/onboarding/useOnboardingDraft.js
- [X] T023 [US2] Implement dismiss/reopen panel behavior with persisted draft state in frontend/src/features/onboarding/OnboardingPanel.jsx
- [X] T024 [P] [US2] Add draft persistence and restore unit tests in backend/tests/unit/onboarding/draftPersistence.test.js
- [X] T037 [US2] Implement session-expiry handling to redirect to login on onboarding API 401 responses in frontend/src/features/onboarding/useOnboardingDraft.js and frontend/src/features/onboarding/useRoadmapStatus.js

**Checkpoint**: US2 is independently functional with lossless draft restoration.

---

## Phase 5: User Story 3 - Submit with Minimal Information (Priority: P3)

**Goal**: Accept major-only submissions, generate generic roadmap, and show low-personalisation guidance.

**Independent Test**: Student submits with only major, receives successful generation path and clear low-personalisation notice.

- [X] T025 [US3] Implement major-only submission acceptance and `isGeneric` response flag in backend/src/modules/onboarding/onboarding.service.js and backend/src/modules/onboarding/onboarding.controller.js
- [X] T026 [P] [US3] Implement low-personalisation notice and settings CTA in frontend/src/features/onboarding/OnboardingPanel.jsx
- [X] T027 [US3] Implement roadmap failure retry action wiring in frontend/src/features/onboarding/useRoadmapStatus.js and frontend/src/services/roadmap.api.js
- [X] T028 [P] [US3] Add generic-mode and duplicate-submit unit test cases in backend/tests/unit/onboarding/stateMachine.test.js

**Checkpoint**: US3 is independently functional with graceful degradation messaging.

---

## Phase 6: User Story 4 - Enter Free-Text Career Goals (Priority: P3)

**Goal**: Support valid custom role/company free-text entries with client + server validation.

**Independent Test**: Student enters custom valid values, submits successfully, and invalid short/symbol-only inputs show inline errors.

- [X] T029 [P] [US4] Add Unicode free-text validation edge-case unit tests in backend/tests/unit/onboarding/validation.test.js
- [X] T030 [US4] Enforce server-side free-text validation rules in backend/src/modules/onboarding/onboarding.validation.js and backend/src/modules/onboarding/onboarding.controller.js
- [X] T031 [P] [US4] Implement reusable FreeTextField with inline validation messaging in frontend/src/features/onboarding/FreeTextField.jsx
- [X] T032 [US4] Integrate free-text fields and character counters in frontend/src/features/onboarding/CareerGoalForm.jsx

**Checkpoint**: US4 is independently functional and validates free-text safely without LLM.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Harden quality across stories and validate final behavior.

- [X] T033 [P] Add structured logs for draft/submit/SSE lifecycle events in backend/src/modules/onboarding/onboarding.service.js and backend/src/modules/onboarding/onboarding.sse.js
- [X] T034 [P] Sync finalized request/response examples with implementation in specs/001-profile-onboarding/contracts/rest-api.md
- [X] T035 [P] Update developer verification steps for implemented behavior in specs/001-profile-onboarding/quickstart.md
- [X] T036 Execute full manual acceptance checklist and record outcomes in specs/001-profile-onboarding/checklists/requirements.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): starts immediately.
- Phase 2 (Foundational): depends on Phase 1; blocks all user stories.
- Phases 3-6 (US1-US4): depend on Phase 2 completion.
- Phase 7 (Polish): depends on completion of selected user stories.

### User Story Dependency Graph

- US1 (P1): depends only on Foundational phase.
- US2 (P2): depends only on Foundational phase.
- US3 (P3): depends on Foundational phase and reuses US1 submit path.
- US4 (P3): depends only on Foundational phase.

Recommended completion order: **US1 → US2 → US3 → US4**.
Parallel-capable after Foundation: **US2 and US4 can run alongside US1; US3 can start after submit path in US1 is stable**.

### Within-Story Order

- Tests (if present) before implementation changes.
- Backend domain/service before frontend integration.
- Endpoints/hooks before final UI wiring.

---

## Parallel Execution Examples

### US1

- Run T011 with T013 and T014 in parallel.
- After T012 and T015, run T016 and T018 in parallel, then complete T017.

### US2

- Run T019 with T021 and T024 in parallel.
- Then complete T020 → T022 → T037 → T023.

### US3

- Run T026 and T028 in parallel.
- Then complete T025 followed by T027.

### US4

- Run T029 and T031 in parallel.
- Then complete T030 followed by T032.

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate independent test for US1 before expanding scope.

### Incremental Delivery

1. Ship US1 (core onboarding submit + notifications).
2. Add US2 (draft resume reliability).
3. Add US3 (major-only generic mode + guidance).
4. Add US4 (free-text flexibility + validation).
5. Finish with Phase 7 polish and full checklist validation.

### Suggested MVP Scope

- **MVP = US1 only** after Setup + Foundational.
- US2-US4 can be delivered incrementally without breaking MVP behavior.
