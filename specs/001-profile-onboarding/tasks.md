# Tasks: Student Profile Onboarding

**Input**: Design documents from `/specs/001-profile-onboarding/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize module scaffolding and wire entry points for onboarding.

- [X] T001 Create onboarding backend module files in `backend/src/modules/onboarding/{onboarding.model.js,onboarding.service.js,onboarding.controller.js,onboarding.routes.js,onboarding.validation.js,onboarding.errors.js,onboarding.sse.js,onboarding.email.js}`
- [X] T002 Create onboarding frontend feature files in `frontend/src/features/onboarding/{OnboardingPanel.jsx,MajorSelect.jsx,CourseMultiSelect.jsx,CareerGoalForm.jsx,useOnboardingDraft.js,useRoadmapStatus.js}`
- [X] T003 [P] Register onboarding routes in `backend/src/app.js` and navigation guard entry in `frontend/src/guards/OnboardingGuard.jsx`
- [X] T004 [P] Add onboarding environment variable templates in `backend/.env.example` and `frontend/.env.example`
- [X] T005 [P] Add onboarding API client wrappers in `frontend/src/services/onboarding.api.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared domain/infrastructure required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting any user story.

- [X] T006 Implement `StudentProfile` schema and indexes in `backend/src/modules/onboarding/onboarding.model.js`
- [X] T007 [P] Implement dropdown option validation helpers in `backend/src/modules/onboarding/onboarding.validation.js`
- [X] T008 [P] Implement onboarding error envelope and error code mapping in `backend/src/modules/onboarding/onboarding.errors.js`
- [X] T009 Implement catalog resolution service for `programs.nameEN`, required-link lookup from `course_units.source.url` by `programId`, and elective filtering (`course_units` by `programId` + `type`) in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T010 [P] Implement SSE connection store and event publisher in `backend/src/modules/onboarding/onboarding.sse.js`
- [X] T011 [P] Implement roadmap ready/failed email notifier in `backend/src/modules/onboarding/onboarding.email.js`
- [X] T012 Implement shared draft/submit service methods and irreversible submit guard in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T013 Wire controller endpoints (`GET/PUT draft`, `POST submit`, `GET course-catalog`, `GET status`) in `backend/src/modules/onboarding/onboarding.controller.js` and `backend/src/modules/onboarding/onboarding.routes.js`

**Checkpoint**: Foundation ready; user stories can proceed independently.

---

## Phase 3: User Story 1 - Complete Onboarding and Receive Roadmap (Priority: P1) 🎯 MVP

**Goal**: Student completes onboarding, sees required-courses link for selected major, submits, and receives async completion notification.

**Independent Test**: New account selects major, sees `Required Courses` link above completed-courses selector, optionally selects elective course, submits, then receives roadmap-ready notification and panel no longer reappears.

- [X] T014 [US1] Implement `GET /api/onboarding/course-catalog` response shape with major list from `programs.nameEN` and link target from `course_units.source.url` (matched by `programId`) in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T014a [US1] Include `roleOptionsByMajor` in `GET /api/onboarding/course-catalog` sourced from `programs.careerTracks` by selected `programId` in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T015 [US1] Enforce elective-only completed-courses query (`course_units` by selected `programId` and `type="elective"`) in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T016 [P] [US1] Implement major selection UI from catalog payload in `frontend/src/features/onboarding/MajorSelect.jsx`
- [X] T017 [P] [US1] Implement completed-courses dropdown UI bound to elective-only options in `frontend/src/features/onboarding/CourseMultiSelect.jsx`
- [X] T018 [US1] Implement `Required Courses` link rendering above completed-courses selector in `frontend/src/features/onboarding/OnboardingPanel.jsx`
- [X] T019 [US1] Implement submit controller/service orchestration and async roadmap trigger in `backend/src/modules/onboarding/onboarding.controller.js` and `backend/src/modules/onboarding/onboarding.service.js`
- [X] T020 [US1] Implement roadmap status EventSource handling and user notifications in `frontend/src/features/onboarding/useRoadmapStatus.js`
- [X] T021 [US1] Enforce post-submit route blocking in `frontend/src/guards/OnboardingGuard.jsx` and `frontend/src/App.jsx`

**Checkpoint**: US1 is fully functional and independently demoable (MVP).

---

## Phase 4: User Story 2 - Resume an Interrupted Onboarding Session (Priority: P2)

**Goal**: Persist draft server-side and fully restore user progress after interruption or session expiry.

**Independent Test**: Student partially fills fields, exits/relogs in, and draft values (including major context and selected electives) are restored.

- [X] T022 [US2] Implement draft fetch/upsert behavior and submitted-profile protection in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T023 [US2] Implement `GET /api/onboarding/draft` and `PUT /api/onboarding/draft` handlers in `backend/src/modules/onboarding/onboarding.controller.js`
- [X] T024 [P] [US2] Implement 800ms debounced auto-save and initial hydration in `frontend/src/features/onboarding/useOnboardingDraft.js`
- [X] T025 [US2] Implement major-change confirm flow that clears selected electives and refreshes link/option context in `frontend/src/features/onboarding/OnboardingPanel.jsx`
- [X] T026 [US2] Implement session-expiry redirect behavior on onboarding API 401s in `frontend/src/features/onboarding/useOnboardingDraft.js` and `frontend/src/features/onboarding/useRoadmapStatus.js`

**Checkpoint**: US2 independently preserves and restores onboarding state across sessions.

---

## Phase 5: User Story 3 - Submit with Minimal Information (Priority: P3)

**Goal**: Accept major-only submit and return generic roadmap mode when optional fields are empty.

**Independent Test**: Student submits with only major, system accepts request, returns generic indicator, and displays low-personalisation guidance.

- [X] T027 [US3] Implement generic-mode detection for submit payload with empty optional fields in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T028 [P] [US3] Return `isGeneric` in submit response and propagate through controller in `backend/src/modules/onboarding/onboarding.controller.js`
- [X] T029 [US3] Implement low-personalisation message + Settings CTA in `frontend/src/features/onboarding/OnboardingPanel.jsx`
- [X] T030 [US3] Implement retry action wiring for roadmap generation failure in `frontend/src/features/onboarding/useRoadmapStatus.js` and `frontend/src/services/roadmap.api.js`

**Checkpoint**: US3 independently supports graceful degradation (major-only flow).

---

## Phase 6: User Story 4 - Select Role and Pick Graduation Date (Priority: P3)

**Goal**: Support role dropdown + graduation date-picker fields with deterministic validation and stale-value handling.

**Independent Test**: Student selects valid role and graduation date, submits successfully; stale role or invalid date must be rejected.

- [X] T031 [US4] Implement strict server-side validation for `careerGoal.role` (membership in selected major's `programs.careerTracks`) and `careerGoal.graduationTimeline` (`YYYY-MM-DD` date format) in `backend/src/modules/onboarding/onboarding.validation.js`
- [X] T032 [US4] Enforce stale-value rejection path on submit for role/timeline in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T033 [P] [US4] Implement role dropdown + graduation date-picker fields in `frontend/src/features/onboarding/CareerGoalForm.jsx`
- [X] T034 [US4] Implement stale-option re-selection UX in `frontend/src/features/onboarding/OnboardingPanel.jsx`

**Checkpoint**: US4 independently validates and persists role + graduation date career goals.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final contract/doc consistency and release hardening.

- [X] T035 [P] Align API contract examples with current schema (`programs.nameEN`, required-link lookup from `course_units.source.url` by `programId`, elective filtering by `programId`/`type`) in `specs/001-profile-onboarding/contracts/rest-api.md`
- [X] T036 [P] Update quickstart verification examples to final endpoint behavior in `specs/001-profile-onboarding/quickstart.md`
- [X] T037 [P] Add structured logs for catalog resolution and submit lifecycle in `backend/src/modules/onboarding/onboarding.service.js`
- [X] T038 Execute manual acceptance checklist and record outcomes in `specs/001-profile-onboarding/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): can start immediately.
- Phase 2 (Foundational): depends on Phase 1 and blocks all user stories.
- Phases 3-6 (US1-US4): depend on Phase 2 completion.
- Phase 7 (Polish): depends on completion of selected user stories.

### User Story Dependency Graph

- US1 (P1): depends only on Foundational phase.
- US2 (P2): depends only on Foundational phase.
- US3 (P3): depends on Foundational phase and reuses submit path from US1.
- US4 (P3): depends only on Foundational phase.

Recommended completion order: **US1 → US2 → US3 → US4**.

### Within-Story Order

- Backend contract/service work before frontend integration.
- Catalog/data wiring before submit/notification polish.
- Story checkpoint validation before starting the next priority story.

---

## Parallel Execution Examples

### US1

- Run T016 and T017 in parallel after T014-T015 are done.
- Run T019 and T020 in parallel after catalog wiring is stable.

### US2

- Run T024 and T026 in parallel after T022-T023 are in place.

### US3

- Run T028 and T029 in parallel after T027.

### US4

- Run T031 and T033 in parallel, then complete T032 and T034.

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate US1 independent test criteria before expanding scope.

### Incremental Delivery

1. Ship US1 (major + required link + elective selection + submit + notification).
2. Add US2 (draft persistence and interruption recovery).
3. Add US3 (major-only generic submission path).
4. Add US4 (role dropdown + graduation date validation and stale-option handling).
5. Finish with Phase 7 polish and checklist execution.

### Suggested MVP Scope

- **MVP = US1 only** after Setup + Foundational.
- US2-US4 can be delivered incrementally without breaking MVP behavior.
