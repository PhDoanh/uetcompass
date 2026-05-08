# Tasks: Skill Tree

**Input**: Design documents from `/specs/004-skill-tree/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: No separate test-first tasks are generated because the specification does not explicitly require a TDD workflow. Validation is covered by story-level independent tests and quickstart scenarios.

**Organization**: Tasks are grouped by user story to preserve independent implementation and validation.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Align feature artifacts and implementation entry points with the updated 009-first contract.

- [X] T001 Update skill-tree contract baseline in specs/004-skill-tree/contracts/rest-api.md
- [X] T002 Update module usage notes in backend/src/modules/skill-tree/README.md
- [X] T003 [P] Create canonical Skill Tree types in frontend/src/features/skill-tree/skillTree.types.js
- [X] T004 [P] Create graph transformation utility in frontend/src/features/skill-tree/graphTransform.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Remove legacy schema assumptions and establish canonical 009 integration points required by all stories.

**CRITICAL**: No user story implementation should begin before this phase is complete.

- [X] T005 Refactor roadmap adapter mapping to canonical 009 fields in backend/src/modules/skill-tree/primaryRoadmap.service.js
- [X] T006 [P] Align input and transition validation with nodeId/fromState/toState in backend/src/modules/skill-tree/skillTree.validation.js
- [X] T007 Refactor core skill-tree orchestration to consume roadmap and progress contracts in backend/src/modules/skill-tree/skillTree.service.js
- [X] T008 Align controller response/error envelopes with 009 error codes in backend/src/modules/skill-tree/skillTree.controller.js
- [X] T009 [P] Align route surface with updated skill-tree contract in backend/src/modules/skill-tree/skillTree.routes.js
- [X] T010 [P] Update frontend API client schemas and request builders in frontend/src/services/skillTree.api.js
- [X] T011 [P] Update client state model for pending/inProgress/completed/skip in frontend/src/stores/skillTreeStore.js

**Checkpoint**: Foundation complete - all user stories can now be implemented independently.

---

## Phase 3: User Story 1 - View Interactive Skill Tree from 009 Primary Roadmap (Priority: P1) MVP

**Goal**: Render canonical 009 roadmap nodes as a topic/subtopic graph with correct edge semantics and low-personalisation signaling.

**Independent Test**: Load a valid 009 primary roadmap and verify node rendering uses nodeId identity, topic main-flow edges are solid, subtopic branch edges are dashed, and low-personalisation notice appears when personalisationLevel is low.

### Implementation for User Story 1

- [X] T012 [US1] Implement roadmap-to-view-node transformation from roadmap.nodes in frontend/src/features/skill-tree/graphTransform.js
- [X] T013 [P] [US1] Implement main-flow and branch edge derivation in frontend/src/features/skill-tree/graphTransform.js
- [X] T014 [P] [US1] Update node rendering for topic/subtopic semantics in frontend/src/features/skill-tree/CourseNode.jsx
- [X] T015 [US1] Update canvas rendering to consume canonical graph model in frontend/src/features/skill-tree/SkillTreeCanvas.jsx
- [X] T016 [US1] Wire page loading state and low-personalisation banner in frontend/src/features/skill-tree/SkillTreePage.jsx
- [X] T017 [P] [US1] Update visual styles for main-flow and branch semantics in frontend/src/features/skill-tree/skill-tree.css
- [X] T018 [US1] Align hook state mapping and node identity handling in frontend/src/features/skill-tree/useSkillTree.js

**Checkpoint**: User Story 1 is independently functional and verifiable.

---

## Phase 4: User Story 2 - Open Canonical Node Details (Priority: P1)

**Goal**: Show node detail content directly from canonical fields skillName, reason, resources, and relatedCourses.

**Independent Test**: Click topic/subtopic nodes and verify detail panel renders skillName, reason, resources, and relatedCourses (courseCode, courseName, credits) with stable empty states.

### Implementation for User Story 2

- [X] T019 [US2] Refactor detail panel bindings to canonical node fields in frontend/src/features/skill-tree/CourseDetailPanel.jsx
- [X] T020 [P] [US2] Update resources rendering to canonical resources shape in frontend/src/features/skill-tree/ResourcesTab.jsx
- [X] T021 [P] [US2] Align reason/explanation rendering with canonical reason field in frontend/src/features/skill-tree/WhyThisCourseTab.jsx
- [X] T022 [US2] Implement explicit empty-state behavior for relatedCourses/resources in frontend/src/features/skill-tree/CourseDetailPanel.jsx
- [X] T023 [US2] Remove legacy field fallbacks not present in 009 schema in frontend/src/features/skill-tree/SkillTreePage.jsx

**Checkpoint**: User Story 2 is independently functional and verifiable.

---

## Phase 5: User Story 3 - Track Progress via 009 RoadmapProgress (Priority: P2)

**Goal**: Read/write progress using 009 progress API and valid transitions only.

**Independent Test**: Load roadmap progress, perform valid transitions (pending->inProgress, pending->skip, inProgress->completed), reload, and confirm persisted visual state.

### Implementation for User Story 3

- [X] T024 [US3] Implement progress fetch and mutation calls to roadmap progress endpoints in frontend/src/services/skillTree.api.js
- [X] T025 [P] [US3] Update store reducers/selectors for four canonical progress arrays in frontend/src/stores/skillTreeStore.js
- [X] T026 [US3] Wire node action handlers for valid transitions in frontend/src/features/skill-tree/useSkillTree.js
- [X] T027 [P] [US3] Align controller pass-through for INVALID_TRANSITION and CONFLICT in backend/src/modules/skill-tree/skillTree.controller.js
- [X] T028 [US3] Remove prerequisite lock enforcement from progress updates in backend/src/modules/skill-tree/skillTree.service.js
- [X] T029 [US3] Implement optimistic-update rollback and re-sync on mutation failure in frontend/src/features/skill-tree/useSkillTree.js

**Checkpoint**: User Story 3 is independently functional and verifiable.

---

## Phase 6: User Story 4 - Handle Missing or Failed Roadmap States (Priority: P3)

**Goal**: Present robust UI states for ROADMAP_NOT_FOUND, acceptedAt null (retryable), and recoverable fetch failures.

**Independent Test**: Simulate ROADMAP_NOT_FOUND, roadmap with acceptedAt null, and server fetch errors; verify correct empty/retryable/error messaging and flows.

### Implementation for User Story 4

- [X] T030 [US4] Implement ROADMAP_NOT_FOUND empty-state rendering in frontend/src/features/skill-tree/SkillTreePage.jsx
- [X] T031 [P] [US4] Implement retryable lifecycle state rendering based on acceptedAt null in frontend/src/features/skill-tree/SkillTreePage.jsx
- [X] T032 [P] [US4] Implement recoverable fetch error UI with retry action in frontend/src/features/skill-tree/SkillTreePage.jsx
- [X] T033 [US4] Align repersonalize action handling with 009 regenerate/conflict semantics in frontend/src/features/skill-tree/RepersonalizeButton.jsx
- [X] T034 [US4] Align backend lifecycle normalization with acceptedAt semantics in backend/src/modules/skill-tree/skillTree.service.js

**Checkpoint**: User Story 4 is independently functional and verifiable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency cleanup and cross-story validation.

- [X] T035 [P] Remove or isolate legacy persistence artifacts not used by 009 progress flow in backend/src/modules/skill-tree/skillNodeStatus.model.js
- [X] T036 [P] Update final integration notes and API behavior in specs/004-skill-tree/research.md
- [X] T037 [P] Refresh manual verification scenarios after implementation in specs/004-skill-tree/quickstart.md
- [X] T038 Perform end-to-end walkthrough and document completion notes in specs/004-skill-tree/tasks.md

Completion notes (T038):
- Frontend production build succeeded via `frontend: npm run build`.
- Backend skill-tree regression suite succeeded via `backend: npm test -- tests/unit/skill-tree --runInBand`.
- Checklist gate verified complete (`requirements.md`: 24/24 items checked).
- Remaining implementation is contract-aligned with Feature 009 node/progress schema and transition rules.

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup; blocks all user stories.
- User Story phases (Phase 3-6): Depend on Foundational completion.
- Polish (Phase 7): Depends on completion of targeted user stories.

### User Story Dependencies

- US1 (P1): Starts after Foundational; no dependency on other user stories.
- US2 (P1): Starts after Foundational; depends only on shared canonical node shape.
- US3 (P2): Starts after Foundational; can run parallel with US1/US2 but integrates with their node identity model.
- US4 (P3): Starts after Foundational; can run parallel with US2/US3.

### Within Each User Story

- Data bindings before UI interactions.
- API/state wiring before visual refinements.
- Story-level independent verification after implementation tasks complete.

---

## Parallel Opportunities

- Setup: T003 and T004 can run in parallel.
- Foundational: T006, T009, T010, and T011 can run in parallel after T005 begins.
- US1: T013, T014, and T017 can run in parallel after T012.
- US2: T020 and T021 can run in parallel after T019.
- US3: T025 and T027 can run in parallel after T024.
- US4: T031 and T032 can run in parallel after T030.
- Polish: T035, T036, and T037 can run in parallel.

---

## Parallel Example: User Story 1

- Execute T013 in frontend/src/features/skill-tree/graphTransform.js
- Execute T014 in frontend/src/features/skill-tree/CourseNode.jsx
- Execute T017 in frontend/src/features/skill-tree/skill-tree.css

---

## Parallel Example: User Story 2

- Execute T020 in frontend/src/features/skill-tree/ResourcesTab.jsx
- Execute T021 in frontend/src/features/skill-tree/WhyThisCourseTab.jsx

---

## Parallel Example: User Story 3

- Execute T025 in frontend/src/stores/skillTreeStore.js
- Execute T027 in backend/src/modules/skill-tree/skillTree.controller.js

---

## Parallel Example: User Story 4

- Execute T031 in frontend/src/features/skill-tree/SkillTreePage.jsx
- Execute T032 in frontend/src/features/skill-tree/SkillTreePage.jsx

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete US1 (Phase 3).
3. Validate independent test for US1.
4. Demo/render baseline before proceeding.

### Incremental Delivery

1. Deliver US1 + US2 for core visualization and details.
2. Deliver US3 for persisted progress tracking.
3. Deliver US4 for resilient lifecycle/error handling.
4. Finish with Phase 7 polish.

### Parallel Team Strategy

1. Team aligns on Setup + Foundational tasks.
2. After foundation:
   - Developer A: US1 graph rendering
   - Developer B: US2 detail panel
   - Developer C: US3 progress orchestration
   - Developer D: US4 lifecycle states
3. Merge per-story increments after independent verification.

---

## Notes

- [P] tasks indicate no blocking dependency on unfinished work in the same phase.
- [USx] labels map each task to a specific user story.
- Every task includes an explicit file path for execution clarity.
- Keep contract fidelity with Feature 009 as the primary acceptance gate.
