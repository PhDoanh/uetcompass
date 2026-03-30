# Tasks: Progress Tracking Dashboard

**Input**: Design documents from /specs/007-progress-tracking/
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Jest unit tests and frontend component/hook tests are included because testing is explicitly required by the feature spec and implementation plan.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: [ID] [P?] [Story] Description

- [P]: Can run in parallel (different files, no dependency on incomplete tasks)
- [Story]: User story label (US1, US2, US3, US4)
- Each task includes exact file path(s)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create scaffolding for the new progress module and feature UI.

- [x] T001 Create backend progress module scaffold in backend/src/modules/progress/ (roadmapProgressCache.model.js, roadmapOwner.adapter.js, progress.service.js, progress.controller.js, progress.routes.js, progress.sse.js)
- [x] T002 [P] Create frontend progress feature scaffold in frontend/src/features/progress/ (ProgressDashboard.jsx, RoadmapCard.jsx, RoadmapDetailView.jsx, NodeListItem.jsx, useProgressSSE.js)
- [x] T003 [P] Create progress API client scaffold in frontend/src/services/progress.api.js and test folder backend/tests/unit/progress/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend contracts and wiring required by all stories.

**CRITICAL**: No user story implementation starts before this phase completes.

- [x] T004 Implement RoadmapProgressCache schema, indexes, and collection mapping in backend/src/modules/progress/roadmapProgressCache.model.js
- [x] T005 [P] Implement roadmap ownership adapter for Feature 009 lookup in backend/src/modules/progress/roadmapOwner.adapter.js
- [x] T006 [P] Implement SSE client registry helpers (addClient, removeClient, notifyUser, heartbeat) in backend/src/modules/progress/progress.sse.js
- [x] T007 Implement base progress service methods (refreshCache, getAll, getRoadmapDetail) with soft-fail retry hooks in backend/src/modules/progress/progress.service.js
- [x] T008 [P] Implement progress controller handlers with contract-compliant error envelope in backend/src/modules/progress/progress.controller.js
- [x] T009 [P] Implement progress routes for summaries, detail, and SSE endpoints in backend/src/modules/progress/progress.routes.js
- [x] T010 Mount progress model and routes in backend/src/app.js
- [x] T011 Wire Skill Tree status-write trigger to await progressService.refreshCache with soft-fail behavior in backend/src/modules/skill-tree/skillTree.service.js

**Checkpoint**: Backend foundation complete; user stories can now proceed.

---

## Phase 3: User Story 1 - View Multi-Roadmap Progress Overview (Priority: P1) 🎯 MVP

**Goal**: Student sees one summary card per owned roadmap with percentage, status counts, and last activity.

**Independent Test**: Login with a user owning at least two roadmaps, open /progress, verify all roadmap cards render with correct values and empty-state behavior for zero progress.

### Tests for User Story 1

- [x] T012 [P] [US1] Add unit tests for getAll and refreshCache percentage math (including totalNodes=0 guard) in backend/tests/unit/progress/progress.service.test.js
- [x] T013 [P] [US1] Add controller tests for GET /api/progress/summaries auth and response mapping in backend/tests/unit/progress/progress.controller.test.js
- [x] T014 [P] [US1] Add UI tests for summary-card rendering and no-roadmap empty state in frontend/src/features/progress/ProgressDashboard.test.jsx

### Implementation for User Story 1

- [x] T015 [US1] Implement getAll(userId) summary read path from roadmap_progress_cache in backend/src/modules/progress/progress.service.js
- [x] T016 [US1] Implement GET /api/progress/summaries handler in backend/src/modules/progress/progress.controller.js
- [x] T017 [US1] Implement getSummaries() fetch wrapper in frontend/src/services/progress.api.js
- [x] T018 [US1] Implement roadmap summary card component in frontend/src/features/progress/RoadmapCard.jsx
- [x] T019 [US1] Implement overview page load, empty state, and card list rendering in frontend/src/features/progress/ProgressDashboard.jsx
- [x] T020 [US1] Register authenticated /progress route in frontend/src/App.jsx

**Checkpoint**: US1 is independently functional and demo-ready as MVP.

---

## Phase 4: User Story 2 - Drill Down Into Roadmap Node-Level Detail (Priority: P1)

**Goal**: Student opens a roadmap detail panel with Done/In Progress/Pending groups and per-group empty states.

**Independent Test**: Open a roadmap card and confirm every node appears in exactly one of the three status groups, with counts matching summary totals.

### Tests for User Story 2

- [x] T021 [P] [US2] Add service tests for getRoadmapDetail(userId, roadmapId) using Feature 004 getNodesByStatus contract in backend/tests/unit/progress/progress.service.detail.test.js
- [x] T022 [P] [US2] Add detail-view tests for grouped rendering and zero-count empty-state messages in frontend/src/features/progress/RoadmapDetailView.test.jsx

### Implementation for User Story 2

- [x] T023 [US2] Implement getRoadmapDetail(userId, roadmapId) with ownership validation and grouped-node response in backend/src/modules/progress/progress.service.js
- [x] T024 [US2] Implement GET /api/progress/summaries/:roadmapId/nodes handler and route wiring in backend/src/modules/progress/progress.controller.js and backend/src/modules/progress/progress.routes.js
- [x] T025 [US2] Implement getRoadmapNodes(roadmapId) API wrapper in frontend/src/services/progress.api.js
- [x] T026 [US2] Implement roadmap detail grouped UI in frontend/src/features/progress/RoadmapDetailView.jsx
- [x] T027 [US2] Integrate card selection, detail loading, and back-to-overview state preservation in frontend/src/features/progress/ProgressDashboard.jsx

**Checkpoint**: US2 is independently functional with complete node-by-status drill-down.

---

## Phase 5: User Story 3 - Navigate to Specific Node in Skill Tree (Priority: P2)

**Goal**: Student taps a node in detail view and lands on Skill Tree with that node focused/highlighted.

**Independent Test**: Click any node in roadmap detail and verify navigation to /skill-tree/:roadmapId?focus=<nodeId> and visible focus on target node; browser back returns to same detail context.

### Tests for User Story 3

- [x] T028 [P] [US3] Add NodeListItem deep-link URL test for roadmapId + focus query param in frontend/src/features/progress/NodeListItem.test.jsx
- [x] T029 [P] [US3] Add SkillTree focus-param handling test in frontend/src/features/skill-tree/SkillTreePage.test.jsx

### Implementation for User Story 3

- [x] T030 [US3] Implement tappable node list item with deep-link URL builder in frontend/src/features/progress/NodeListItem.jsx
- [x] T031 [US3] Replace static node rows with NodeListItem in all status groups in frontend/src/features/progress/RoadmapDetailView.jsx
- [x] T032 [US3] Implement focus query-param parsing and focus lifecycle in frontend/src/features/skill-tree/SkillTreePage.jsx
- [x] T033 [US3] Implement visual highlight/scroll behavior for focused node in frontend/src/features/skill-tree/SkillTreeCanvas.jsx

**Checkpoint**: US3 closes the dashboard-to-action loop with deterministic node deep-link navigation.

---

## Phase 6: User Story 4 - Dashboard Reflects Skill Tree Changes Without Reload (Priority: P2)

**Goal**: Dashboard receives live updates after Skill Tree status changes and refreshes relevant roadmap data within 5 seconds.

**Independent Test**: Keep /progress open, update node status in Skill Tree tab, return to dashboard tab and verify updated summary/detail values appear without manual reload.

### Tests for User Story 4

- [x] T034 [P] [US4] Add SSE store tests for connect/disconnect/heartbeat/notify flows in backend/tests/unit/progress/progress.sse.test.js
- [x] T035 [P] [US4] Add refreshCache soft-fail + eventual-retry behavior tests in backend/tests/unit/progress/progress.service.reliability.test.js
- [x] T036 [P] [US4] Add useProgressSSE hook tests for merge-by-roadmapId and unauthorized-close handling in frontend/src/features/progress/useProgressSSE.test.jsx

### Implementation for User Story 4

- [x] T037 [US4] Implement GET /api/progress/sse sseToken validation and event stream responses in backend/src/modules/progress/progress.routes.js
- [x] T038 [US4] Emit progress:updated events from refreshCache after successful upsert in backend/src/modules/progress/progress.service.js
- [x] T039 [US4] Implement retry scheduling on refresh failure without breaking Skill Tree writes in backend/src/modules/progress/progress.service.js
- [x] T040 [US4] Implement frontend SSE hook for progress updates in frontend/src/features/progress/useProgressSSE.js
- [x] T041 [US4] Merge incoming SSE summary payload into dashboard overview/detail state in frontend/src/features/progress/ProgressDashboard.jsx

**Checkpoint**: US4 delivers trustable near-real-time consistency between Skill Tree and Progress Dashboard.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final quality pass, docs alignment, and integrated verification.

- [x] T042 [P] Update API contract examples and SSE auth token naming consistency in specs/007-progress-tracking/contracts/rest-api.md
- [x] T043 [P] Update manual validation steps and acceptance scenario checklist in specs/007-progress-tracking/quickstart.md
- [ ] T044 [P] Validate SC-001 performance on 4G-throttled profile (<=2s full dashboard load with up to 10 owned roadmaps) and record measured results in specs/007-progress-tracking/quickstart.md
- [x] T045 [P] Add cross-view parity test to verify Progress summary percent stays within ±1pp of Skill Tree percent for the same user/roadmap fixture in backend/tests/unit/progress/progress.service.parity.test.js
- [x] T046 [P] Add end-to-end roadmapId propagation test (cache key, API payload/path, SSE merge key, deep-link focus URL) in frontend/src/features/progress/ProgressDashboard.integration.test.jsx
- [x] T047 Run targeted backend/frontend test commands for progress feature via scripts/run-tests.mjs and record pass/fail notes in specs/007-progress-tracking/tasks.md

### T047 Execution Notes

- Command: `node scripts/run-tests.mjs backend`
- Result: PARTIAL PASS (54 suites passed, 1 suite failed)
- Failing suite: `backend/tests/unit/roadmap/generation.service.test.js` (pre-existing roadmap-generation assertions, not introduced by progress module changes)
- Command: `node scripts/run-tests.mjs frontend`
- Result: PASS (9/9 suites)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies, start immediately.
- Foundational (Phase 2): Depends on Phase 1 and blocks all user stories.
- US1 (Phase 3): Depends on Phase 2 completion.
- US2 (Phase 4): Depends on Phase 2 and builds on US1 overview flow.
- US3 (Phase 5): Depends on US2 detail-view implementation.
- US4 (Phase 6): Depends on Phase 2; integrates best with US1 and US2 already completed.
- Polish (Phase 7): Depends on all targeted stories being complete.

### User Story Completion Order (Dependency Graph)

- US1 -> US2 -> US3
- US1 -> US4
- US2 -> US4 (for detail-view live-update parity)

### Within Each User Story

- Tests before implementation for that story.
- Backend service/controller/routes before frontend integration.
- Component and hook tasks before route/state wiring tasks.

---

## Parallel Execution Examples

### User Story 1

- Run T012, T013, and T014 in parallel (different test files).
- Run T017 and T018 in parallel after T015 and T016 are in place.

### User Story 2

- Run T021 and T022 in parallel.
- Run T025 and T026 in parallel after T024.

### User Story 3

- Run T028 and T029 in parallel.
- Run T030 and T032 in parallel, then integrate through T031 and T033.

### User Story 4

- Run T034, T035, and T036 in parallel.
- Run T040 in parallel with T038 and T039, then finalize merge in T041.

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently using its independent test criteria.
4. Demo/deploy MVP with overview dashboard.

### Incremental Delivery

1. Deliver US1 (overview) as MVP.
2. Add US2 (detail drill-down), validate independently.
3. Add US3 (deep-link to Skill Tree), validate independently.
4. Add US4 (live updates), validate independently.
5. Finish Phase 7 polish and full quickstart regression.

### Parallel Team Strategy

1. Team aligns on Phase 1 and Phase 2 together.
2. After foundation:
   - Developer A: US1/US2 backend.
   - Developer B: US1/US2 frontend.
   - Developer C: US4 SSE and reliability.
3. Merge US3 after US2 detail surfaces are stable.

