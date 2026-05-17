# Tasks: Progress Tracking Dashboard (Refined for Re-implementation)

**Input**: /specs/007-progress-tracking/spec.md, plan.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md
**Goal**: Re-implement Progress Tracking from scratch with full coverage of US1–US5 and SC-001 validation.

**Rules**
- Keep tasks grouped by user story and readiness.
- Always add tests before implementation within each story.
- Use stable `roadmapId` as cache key, API path key, SSE merge key, and deep-link key.

## Format: [ID] [P?] [Story] Description

- [P]: Can run in parallel (different files, no dependency on incomplete tasks)
- [Story]: User story label (US1, US2, US3, US4, US5)
- Each task includes exact file path(s)

---

## Phase 1: Shared Setup (Scaffold + Wiring)

**Purpose**: Recreate module structure and core plumbing before story work.

- [ ] T001 Create backend progress module scaffold in backend/src/modules/progress/ (roadmapProgressCache.model.js, roadmapProgressActivity.model.js, roadmapOwner.adapter.js, progress.service.js, progress.tracking.service.js, progress.controller.js, progress.routes.js, progress.sse.js)
- [ ] T002 [P] Create frontend progress feature scaffold in frontend/src/features/progress/ (ProgressDashboard.jsx, RoadmapCard.jsx, RoadmapDetailView.jsx, NodeListItem.jsx, TrackingTables.jsx, useProgressSSE.js)
- [ ] T003 [P] Create progress API client scaffold in frontend/src/services/progress.api.js and test folder backend/tests/unit/progress/
- [ ] T004 Mount progress model and routes in backend/src/app.js
- [ ] T005 Wire Skill Tree status-write trigger to await progressService.refreshCache and progressTrackingService.updateNodeActivity with soft-fail behavior in backend/src/modules/skill-tree/skillTree.service.js

**Checkpoint**: Progress module loads, routes mounted, Skill Tree hook wired.

---

## Phase 2: Foundational Backend Contracts

**Purpose**: Build cache schema, SSE store, and service backbone used by all stories.

- [ ] T006 Implement RoadmapProgressCache schema, indexes, and collection mapping in backend/src/modules/progress/roadmapProgressCache.model.js
- [ ] T007 [P] Implement RoadmapProgressActivity schema, indexes in backend/src/modules/progress/roadmapProgressActivity.model.js
- [ ] T008 [P] Implement roadmap ownership adapter for Feature 009 lookup in backend/src/modules/progress/roadmapOwner.adapter.js
- [ ] T009 [P] Implement SSE client registry helpers (addClient, removeClient, notifyUser, heartbeat) in backend/src/modules/progress/progress.sse.js
- [ ] T010 Implement base progress service methods (refreshCache, getAll, getRoadmapDetail) with soft-fail retry hooks in backend/src/modules/progress/progress.service.js
- [ ] T011 [P] Implement tracking service method getTrackingTables(userId, { scope, roadmapId, groupBy }) in backend/src/modules/progress/progress.tracking.service.js
- [ ] T012 [P] Implement progress controller handlers with contract-compliant error envelope in backend/src/modules/progress/progress.controller.js
- [ ] T013 [P] Implement progress routes for summaries, detail, tracking, and SSE endpoints in backend/src/modules/progress/progress.routes.js

**Checkpoint**: Backend foundations complete; user stories can proceed.

---

## Phase 3: User Story 1 - View Multi-Roadmap Progress Overview (P1)

**Goal**: Student sees one summary card per owned roadmap with % and counts.

### Tests

- [ ] T014 [P] [US1] Add unit tests for getAll and refreshCache percentage math (including totalNodes=0 guard) in backend/tests/unit/progress/progress.service.test.js
- [ ] T015 [P] [US1] Add controller tests for GET /api/progress/summaries auth and response mapping in backend/tests/unit/progress/progress.controller.test.js
- [ ] T016 [P] [US1] Add UI tests for summary-card rendering and no-roadmap empty state in frontend/src/features/progress/ProgressDashboard.test.jsx

### Implementation

- [ ] T017 [US1] Implement getAll(userId) summary read path from roadmap_progress_cache in backend/src/modules/progress/progress.service.js
- [ ] T018 [US1] Implement GET /api/progress/summaries handler in backend/src/modules/progress/progress.controller.js
- [ ] T019 [US1] Implement getSummaries() fetch wrapper in frontend/src/services/progress.api.js
- [ ] T020 [US1] Implement roadmap summary card component in frontend/src/features/progress/RoadmapCard.jsx
- [ ] T021 [US1] Implement overview page load, empty state, and card list rendering in frontend/src/features/progress/ProgressDashboard.jsx
- [ ] T022 [US1] Register authenticated /progress route in frontend/src/App.jsx

**Checkpoint**: US1 demo-ready and independently testable.

---

## Phase 4: User Story 2 - Drill Down into Node Detail (P1)

**Goal**: Student opens roadmap detail panel with Done/In Progress/Pending groups and per-group empty states.

### Tests

- [ ] T023 [P] [US2] Add service tests for getRoadmapDetail(userId, roadmapId) using Feature 004 getNodesByStatus contract in backend/tests/unit/progress/progress.service.detail.test.js
- [ ] T024 [P] [US2] Add detail-view tests for grouped rendering and zero-count empty-state messages in frontend/src/features/progress/RoadmapDetailView.test.jsx

### Implementation

- [ ] T025 [US2] Implement getRoadmapDetail(userId, roadmapId) with ownership validation and grouped-node response in backend/src/modules/progress/progress.service.js
- [ ] T026 [US2] Implement GET /api/progress/summaries/:roadmapId/nodes handler and route wiring in backend/src/modules/progress/progress.controller.js and backend/src/modules/progress/progress.routes.js
- [ ] T027 [US2] Implement getRoadmapNodes(roadmapId) API wrapper in frontend/src/services/progress.api.js
- [ ] T028 [US2] Implement roadmap detail grouped UI in frontend/src/features/progress/RoadmapDetailView.jsx
- [ ] T029 [US2] Integrate card selection, detail loading, and back-to-overview state preservation in frontend/src/features/progress/ProgressDashboard.jsx

**Checkpoint**: US2 drill-down functional with complete node-by-status breakdown.

---

## Phase 5: User Story 3 - Deep-Link to Skill Tree Node (P2)

**Goal**: Student taps a node in detail view and lands on Skill Tree with that node focused/highlighted.

### Tests

- [ ] T030 [P] [US3] Add NodeListItem deep-link URL test for roadmapId + focus query param in frontend/src/features/progress/NodeListItem.test.jsx
- [ ] T031 [P] [US3] Add SkillTree focus-param handling test in frontend/src/features/skill-tree/SkillTreePage.test.jsx

### Implementation

- [ ] T032 [US3] Implement tappable node list item with deep-link URL builder in frontend/src/features/progress/NodeListItem.jsx
- [ ] T033 [US3] Replace static node rows with NodeListItem in all status groups in frontend/src/features/progress/RoadmapDetailView.jsx
- [ ] T034 [US3] Implement focus query-param parsing and focus lifecycle in frontend/src/features/skill-tree/SkillTreePage.jsx
- [ ] T035 [US3] Implement visual highlight/scroll behavior for focused node in frontend/src/features/skill-tree/SkillTreeCanvas.jsx

**Checkpoint**: US3 deep-link navigation works with back-navigation state preserved.

---

## Phase 6: User Story 4 - Live Updates via SSE (P2)

**Goal**: Dashboard receives live updates after Skill Tree status changes within 5 seconds.

### Tests

- [ ] T036 [P] [US4] Add SSE store tests for connect/disconnect/heartbeat/notify flows in backend/tests/unit/progress/progress.sse.test.js
- [ ] T037 [P] [US4] Add refreshCache soft-fail + eventual-retry behavior tests in backend/tests/unit/progress/progress.service.reliability.test.js
- [ ] T038 [P] [US4] Add useProgressSSE hook tests for merge-by-roadmapId and unauthorized-close handling in frontend/src/features/progress/useProgressSSE.test.jsx

### Implementation

- [ ] T039 [US4] Implement GET /api/progress/sse sseToken validation and event stream responses in backend/src/modules/progress/progress.routes.js
- [ ] T040 [US4] Emit progress:updated events from refreshCache after successful upsert in backend/src/modules/progress/progress.service.js
- [ ] T041 [US4] Implement retry scheduling on refresh failure without breaking Skill Tree writes in backend/src/modules/progress/progress.service.js
- [ ] T042 [US4] Implement frontend SSE hook for progress updates in frontend/src/features/progress/useProgressSSE.js
- [ ] T043 [US4] Merge incoming SSE summary payload into dashboard overview/detail state in frontend/src/features/progress/ProgressDashboard.jsx

**Checkpoint**: US4 delivers near-real-time consistency between Skill Tree and Progress Dashboard.

---

## Phase 7: User Story 5 - Tracking Tables (P1)

**Goal**: Student sees learning frequency and completion rate tables, scoped by all-roadmaps and per-roadmap, with weekly/monthly grouping.

### Tests

- [ ] T044 [P] [US5] Add tracking aggregation tests for weekly/monthly buckets, completion rate, and empty periods in backend/tests/unit/progress/progress.tracking.service.test.js
- [ ] T045 [P] [US5] Add controller tests for GET /api/progress/tracking in backend/tests/unit/progress/progress.controller.test.js
- [ ] T046 [P] [US5] Add UI tests for tracking tables rendering, scope toggle, and empty-state behavior in frontend/src/features/progress/TrackingTables.test.jsx

### Implementation

- [ ] T047 [US5] Implement GET /api/progress/tracking handler in backend/src/modules/progress/progress.controller.js
- [ ] T048 [US5] Implement tracking endpoint route wiring in backend/src/modules/progress/progress.routes.js
- [ ] T049 [US5] Implement getTrackingTables(params) API wrapper in frontend/src/services/progress.api.js
- [ ] T050 [US5] Implement tracking tables UI (scope toggle, weekly/monthly grouping, empty states) in frontend/src/features/progress/TrackingTables.jsx
- [ ] T051 [US5] Integrate tracking tables into ProgressDashboard with per-roadmap and all-roadmaps modes in frontend/src/features/progress/ProgressDashboard.jsx

**Checkpoint**: US5 tracking tables meet FR-008a-e and SC-005.

---

## Phase 8: Polish & Verification

**Purpose**: Validate performance and run targeted tests for re-implementation.

- [ ] T052 [P] Update API contract examples and SSE auth token naming consistency in specs/007-progress-tracking/contracts/rest-api.md
- [ ] T053 [P] Update manual validation steps and acceptance scenario checklist in specs/007-progress-tracking/quickstart.md
- [ ] T054 [P] Validate SC-001 performance on 4G-throttled profile (<=2s full dashboard load with up to 10 owned roadmaps) and record measured results in specs/007-progress-tracking/quickstart.md
- [ ] T055 [P] Add cross-view parity test to verify Progress summary percent stays within ±1pp of Skill Tree percent for the same user/roadmap fixture in backend/tests/unit/progress/progress.service.parity.test.js
- [ ] T056 [P] Add end-to-end roadmapId propagation test (cache key, API payload/path, SSE merge key, deep-link focus URL) in frontend/src/features/progress/ProgressDashboard.integration.test.jsx
- [ ] T057 Run targeted backend/frontend test commands via scripts/run-tests.mjs and record pass/fail notes in specs/007-progress-tracking/tasks.md

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 before Phase 2.
- Phase 2 blocks all user stories.
- US1 before US2 and US4.
- US2 before US3.
- US5 can start after Phase 2 (independent of US2/US3) but integrates into the same dashboard surface.

### Within Each Story

- Tests before implementation.
- Backend service/controller/routes before frontend integration.

---

## Implementation Strategy

1. Rebuild Phase 1–2 scaffolding and base services.
2. Implement US1–US4 in order (overview, detail, deep-link, SSE).
3. Implement US5 tracking tables.
4. Complete Phase 8 verification and SC-001 measurement.

