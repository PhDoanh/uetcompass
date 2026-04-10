# Tasks: Skill Tree – Personalized Academic Roadmap Tracker

**Input**: Design documents from `/specs/004-skill-tree/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Jest unit tests are required for this feature (per plan + constitution). Include tests before implementation in each user story phase.

**Organization**: Tasks are grouped by user story so each story can be built and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4, US5)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create baseline module/file scaffolding and dependency alignment.

- [X] T001 Create backend Skill Tree module index and exports in `backend/src/modules/skill-tree/index.js`
- [X] T002 Create frontend Skill Tree feature entry scaffold in `frontend/src/features/skill-tree/SkillTreePage.jsx`
- [X] T003 [P] Add Gemini SDK dependency wiring in `backend/package.json`
- [X] T004 [P] Add graph/state UI dependencies in `frontend/package.json`
- [X] T005 Add feature environment variable documentation for Gemini in `specs/004-skill-tree/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend/frontend infrastructure required before any user story work.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [X] T006 Create status persistence schema for explicit pending records in `backend/src/modules/skill-tree/skillNodeStatus.model.js`
- [X] T007 [P] Create AI context cache schema in `backend/src/modules/skill-tree/aiContext.model.js`
- [X] T008 [P] Create request validation helpers for status and params in `backend/src/modules/skill-tree/skillTree.validation.js`
- [X] T009 Implement canonical roadmap adapter to Feature 009 in `backend/src/modules/skill-tree/primaryRoadmap.service.js`
- [X] T010 Implement shared DAG utilities, unlock evaluation, and pending reconciliation helpers in `backend/src/modules/skill-tree/skillTree.service.js`
- [X] T011 Create base controller error mapping and response helpers in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T012 Create authenticated router skeleton for all Skill Tree endpoints in `backend/src/modules/skill-tree/skillTree.routes.js`
- [X] T013 Mount Skill Tree routes in backend application bootstrap in `backend/src/app.js`
- [X] T014 Create frontend Skill Tree API client scaffold in `frontend/src/services/skillTree.api.js`
- [X] T015 [P] Create Zustand store for node/panel/tab state in `frontend/src/stores/skillTreeStore.js`
- [X] T016 [P] Create polling hook scaffold with visibility pause/resume in `frontend/src/features/skill-tree/useSkillTree.js`
- [X] T068 [P] Add constitution-required skill-mapping regression tests in `backend/tests/unit/curriculum/skillMapping.test.js`
- [X] T069 [P] Add constitution-required scraping pipeline regression tests in `backend/tests/unit/onboarding/scrape.pipeline.test.js`

**Checkpoint**: Shared foundations complete; user stories can proceed.

---

## Phase 3: User Story 1 - View Personalized Skill Tree (Priority: P1) 🎯 MVP

**Goal**: Render the authenticated student’s personalized top-down DAG with correct initial statuses and lock states.

**Independent Test**: Student opens `/skill-tree` and sees canonical roadmap nodes with `done` from onboarding-seeded status rows, explicit `pending` for remaining nodes, and lock visuals matching prerequisite completion.

### Tests for User Story 1

- [X] T017 [P] [US1] Add DAG unlock traversal unit tests in `backend/tests/unit/skill-tree/dagTraversal.test.js`
- [X] T018 [P] [US1] Add explicit pending reconciliation unit tests in `backend/tests/unit/skill-tree/pendingSync.test.js`
- [X] T019 [P] [US1] Add grouped status contract unit tests for `getNodesByStatus()` in `backend/tests/unit/skill-tree/getNodesByStatus.test.js`

### Implementation for User Story 1

- [X] T020 [US1] Implement `getSkillTree` read flow (roadmap + statuses + `isUnlocked`) in `backend/src/modules/skill-tree/skillTree.service.js`
- [X] T021 [US1] Implement `GET /api/skill-tree` handler in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T022 [US1] Implement `getTree` frontend request function in `frontend/src/services/skillTree.api.js`
- [X] T023 [P] [US1] Build React Flow canvas and edge layout mapping in `frontend/src/features/skill-tree/SkillTreeCanvas.jsx`
- [X] T024 [P] [US1] Build custom course node UI for status badges and lock indicator in `frontend/src/features/skill-tree/CourseNode.jsx`
- [X] T025 [US1] Implement Skill Tree page container loading canonical data into store in `frontend/src/features/skill-tree/SkillTreePage.jsx`
- [X] T026 [US1] Register Skill Tree route in application router in `frontend/src/App.jsx`
- [X] T027 [US1] Enforce onboarding/auth guard behavior for Skill Tree route in `frontend/src/guards/OnboardingGuard.jsx`

**Checkpoint**: US1 is fully functional and independently testable as MVP.

---

## Phase 4: User Story 2 - Track Progress by Updating Node States (Priority: P2)

**Goal**: Support valid node transitions (`pending → in_progress → done`) with persistence and locked-node rejection.

**Independent Test**: Student updates an unlocked node through the valid sequence, sees dependent node unlock, and state persists after refresh.

### Tests for User Story 2

- [X] T028 [P] [US2] Add state guard unit tests for locked nodes and invalid transitions in `backend/tests/unit/skill-tree/stateGuard.test.js`
- [X] T029 [P] [US2] Add controller unit tests for PATCH status validation/error mapping in `backend/tests/unit/skill-tree/statusPatchController.test.js`
- [X] T070 [P] [US2] Add UI interaction contract tests (node click opens panel, status action control updates state, locked node action disabled) in `frontend/src/features/skill-tree/nodeInteraction.test.jsx`

### Implementation for User Story 2

- [X] T030 [US2] Implement transition guard and persistence update logic in `backend/src/modules/skill-tree/skillTree.service.js`
- [X] T031 [US2] Implement `PATCH /api/skill-tree/nodes/:courseCode/status` handler in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T032 [US2] Add `patchNodeStatus` API function in `frontend/src/services/skillTree.api.js`
- [X] T033 [US2] Implement optimistic node status update + rollback logic in `frontend/src/features/skill-tree/useSkillTree.js`
- [X] T034 [US2] Implement dedicated status action control in detail panel and wire sequential transitions in `frontend/src/features/skill-tree/CourseDetailPanel.jsx`
- [X] T071 [US2] Wire node click behavior to open detail panel only (no direct state mutation) in `frontend/src/features/skill-tree/CourseNode.jsx`

**Checkpoint**: US1 + US2 are independently usable and persisted.

---

## Phase 5: User Story 3 - View Course Detail Panel (Priority: P3)

**Goal**: Open a course detail panel with Resources, Why This Course, and Market Skills tabs.

**Independent Test**: Clicking any course opens panel; each tab loads expected data with error/empty handling.

### Tests for User Story 3

- [X] T035 [P] [US3] Add AI cache hit/miss validation tests in `backend/tests/unit/skill-tree/aiContextCache.test.js`
- [X] T036 [P] [US3] Add course resources grouping tests in `backend/tests/unit/skill-tree/courseResources.test.js`
- [X] T037 [P] [US3] Add market skills sorting/empty-state tests in `backend/tests/unit/skill-tree/marketSkills.test.js`

### Implementation for User Story 3

- [X] T038 [P] [US3] Implement course resources read service in `backend/src/modules/skill-tree/courseResource.service.js`
- [X] T039 [P] [US3] Implement market skills read service in `backend/src/modules/skill-tree/marketSkill.service.js`
- [X] T040 [US3] Implement Gemini on-demand generation + cache service in `backend/src/modules/skill-tree/aiContext.service.js`
- [X] T041 [US3] Implement resources/why/market-skills endpoint handlers in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T042 [US3] Add API client methods (`getResources`, `getWhyCourse`, `getMarketSkills`) in `frontend/src/services/skillTree.api.js`
- [X] T043 [US3] Build side panel container with tab switching and course summary in `frontend/src/features/skill-tree/CourseDetailPanel.jsx`
- [X] T044 [P] [US3] Implement grouped materials rendering in `frontend/src/features/skill-tree/ResourcesTab.jsx`
- [X] T045 [P] [US3] Implement Why tab loading/cached/error states in `frontend/src/features/skill-tree/WhyThisCourseTab.jsx`
- [X] T046 [P] [US3] Implement Market Skills tab list with job count ordering in `frontend/src/features/skill-tree/MarketSkillsTab.jsx`
- [X] T047 [US3] Wire node selection to open/close detail panel in `frontend/src/features/skill-tree/SkillTreePage.jsx`

**Checkpoint**: US3 provides full course context panel independently.

---

## Phase 6: User Story 4 - Explore Market Skills and Learning Resources (Priority: P4)

**Goal**: Allow students to open a skill-specific modal showing free/paid learning resources.

**Independent Test**: Student clicks a market skill and sees categorized resources; links open externally.

### Tests for User Story 4

- [X] T048 [P] [US4] Add learning resource grouping tests (`free`/`paid` always present) in `backend/tests/unit/skill-tree/learningResources.test.js`
- [X] T049 [P] [US4] Add learning resources endpoint 404/success tests in `backend/tests/unit/skill-tree/learningResourcesController.test.js`

### Implementation for User Story 4

- [X] T050 [US4] Implement skill learning resource lookup and normalization in `backend/src/modules/skill-tree/marketSkill.service.js`
- [X] T051 [US4] Implement `GET /api/skill-tree/skills/:skillName/learning-resources` handler in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T052 [US4] Add `getLearningResources` API function in `frontend/src/services/skillTree.api.js`
- [X] T053 [US4] Build free/paid skill resource modal component in `frontend/src/features/skill-tree/SkillResourcesModal.jsx`
- [X] T054 [US4] Wire market skill click and modal lifecycle in `frontend/src/features/skill-tree/MarketSkillsTab.jsx`

**Checkpoint**: US4 is independently testable from Market Skills tab.

---

## Phase 7: User Story 5 - Re-personalize Skill Tree After Profile Update (Priority: P5)

**Goal**: Show and execute re-personalization flow when profile freshness exceeds roadmap freshness.

**Independent Test**: After profile update, button appears; click triggers regeneration; polling detects completion and tree refreshes.

### Tests for User Story 5

- [X] T055 [P] [US5] Add `needsRepersonalization` comparison tests (`updatedAt` vs `generatedAt`) in `backend/tests/unit/skill-tree/repersonalizeFlag.test.js`
- [X] T056 [P] [US5] Add repersonalize endpoint tests for `403` and `409` paths in `backend/tests/unit/skill-tree/repersonalizeEndpoint.test.js`

### Implementation for User Story 5

- [X] T057 [US5] Implement repersonalization gating and delegation in `backend/src/modules/skill-tree/skillTree.service.js`
- [X] T058 [US5] Implement `POST /api/skill-tree/repersonalize` handler in `backend/src/modules/skill-tree/skillTree.controller.js`
- [X] T059 [US5] Add `repersonalize` API function in `frontend/src/services/skillTree.api.js`
- [X] T060 [US5] Build CTA component with disabled/loading state in `frontend/src/features/skill-tree/RepersonalizeButton.jsx`
- [X] T061 [US5] Extend polling hook for 2500ms re-personalization completion checks in `frontend/src/features/skill-tree/useSkillTree.js`
- [X] T062 [US5] Render conditional re-personalize flow in page container in `frontend/src/features/skill-tree/SkillTreePage.jsx`

**Checkpoint**: US5 closes profile-change loop and is independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across stories.

- [X] T063 [P] Add Skill Tree module README with run/test notes in `backend/src/modules/skill-tree/README.md`
- [X] T064 [P] Add frontend empty/loading/error polish for tree and panel in `frontend/src/features/skill-tree/SkillTreePage.jsx`
- [X] T065 Validate auth ownership checks for all Skill Tree endpoints in `backend/src/modules/skill-tree/skillTree.service.js`
- [X] T066 Run and stabilize Skill Tree unit test suite via `scripts/run-tests.mjs`
- [X] T067 Update manual verification checklist outcomes in `specs/004-skill-tree/checklists/requirements.md`
- [X] T072 Run constitution traceability suite for Feature 004 (`backend/tests/unit/skill-tree/`, `backend/tests/unit/curriculum/skillMapping.test.js`, `backend/tests/unit/onboarding/scrape.pipeline.test.js`) via `scripts/run-tests.mjs`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3+ (User Stories)**: Depend on Phase 2 completion.
- **Phase 8 (Polish)**: Depends on desired user stories being complete.

### User Story Dependency Graph

- **US1 (P1)**: Starts after Phase 2; no dependency on other user stories.
- **US2 (P2)**: Depends on US1 read/render flow for interactive node updates.
- **US3 (P3)**: Depends on US1 node selection/page shell; otherwise independent of US2.
- **US4 (P4)**: Depends on US3 Market Skills tab.
- **US5 (P5)**: Depends on US1 base tree loading and polling hook.

Suggested completion order: **US1 → (US2, US3, US5 in parallel) → US4**.

---

## Parallel Execution Examples

### User Story 1

Run in parallel after T016:

- T017 `backend/tests/unit/skill-tree/dagTraversal.test.js`
- T018 `backend/tests/unit/skill-tree/pendingSync.test.js`
- T019 `backend/tests/unit/skill-tree/getNodesByStatus.test.js`
- T023 `frontend/src/features/skill-tree/SkillTreeCanvas.jsx`
- T024 `frontend/src/features/skill-tree/CourseNode.jsx`

### User Story 2

Run in parallel after T031:

- T028 `backend/tests/unit/skill-tree/stateGuard.test.js`
- T029 `backend/tests/unit/skill-tree/statusPatchController.test.js`
- T032 `frontend/src/services/skillTree.api.js`

### User Story 3

Run in parallel after T042:

- T035 `backend/tests/unit/skill-tree/aiContextCache.test.js`
- T036 `backend/tests/unit/skill-tree/courseResources.test.js`
- T037 `backend/tests/unit/skill-tree/marketSkills.test.js`
- T044 `frontend/src/features/skill-tree/ResourcesTab.jsx`
- T045 `frontend/src/features/skill-tree/WhyThisCourseTab.jsx`
- T046 `frontend/src/features/skill-tree/MarketSkillsTab.jsx`

### User Story 4

Run in parallel after T052:

- T048 `backend/tests/unit/skill-tree/learningResources.test.js`
- T049 `backend/tests/unit/skill-tree/learningResourcesController.test.js`
- T053 `frontend/src/features/skill-tree/SkillResourcesModal.jsx`

### User Story 5

Run in parallel after T059:

- T055 `backend/tests/unit/skill-tree/repersonalizeFlag.test.js`
- T056 `backend/tests/unit/skill-tree/repersonalizeEndpoint.test.js`
- T060 `frontend/src/features/skill-tree/RepersonalizeButton.jsx`

---

## Implementation Strategy

### MVP First (US1 Only)

1. Finish Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independent test criteria before expanding scope.

### Incremental Delivery

1. Deliver MVP (US1).
2. Add US2 progress transitions.
3. Add US3 detail panel.
4. Add US5 re-personalize workflow.
5. Add US4 market skill drill-down modal.
6. Finish Phase 8 polish and regression pass.

### Parallel Team Strategy

1. Team completes Phase 1 and Phase 2 together.
2. Split after US1 foundation:
   - Dev A: US2
   - Dev B: US3
   - Dev C: US5
3. Merge and finalize US4, then polish.
