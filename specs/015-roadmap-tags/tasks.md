# Tasks: Roadmap Tags

**Input**: Design documents from `/specs/015-roadmap-tags/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included because the feature plan requires validation of tag CRUD, persistence, and tag-filtered search behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared tagging foundations

- [ ] T001 Update roadmap feature context in `specs/015-roadmap-tags/research.md`, `specs/015-roadmap-tags/data-model.md`, and `specs/015-roadmap-tags/contracts/roadmap-tags-api.md`
- [ ] T002 [P] Add roadmap tag contract examples and response shapes to `specs/015-roadmap-tags/contracts/roadmap-tags-api.md`
- [ ] T003 [P] Update roadmap tagging quickstart scenarios in `specs/015-roadmap-tags/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data shape and shared backend/frontend primitives required before any story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Add tag fields to `backend/src/modules/roadmap/manualRoadmap.model.js` for embedded roadmap tags
- [ ] T005 [P] Extend roadmap tag normalization and validation in `backend/src/modules/roadmap/manualRoadmapValidation.service.js`
- [ ] T006 [P] Add shared tag serialization helpers in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [ ] T007 Add public manual roadmap tag projection support in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [ ] T008 Extend public roadmap search request parsing in `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T009 [P] Extend roadmap search API client contract in `frontend/src/services/roadmapSearch.api.js`
- [ ] T010 [P] Prepare shared tag state helpers for roadmap UI in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx`

**⚠️ CRITICAL API BRIDGE TASKS** (Fix HIGH coverage gaps A1 & A2):

- [ ] T011 Implement `GET /manual-roadmaps/tags` endpoint in `backend/src/modules/roadmap/roadmap.controller.js` to fetch distinct tags from public roadmaps (Gap A1)
- [ ] T012 [P] Implement distinct tag query logic in `backend/src/modules/roadmap/manualRoadmap.service.js` to support tag catalog endpoint (Gap A1)
- [ ] T013 [P] Update `frontend/src/services/manualRoadmap.api.js` to accept tags parameter in `createManualRoadmap()` and `updateManualRoadmap()` functions (Gap A2)
- [ ] T014 [P] Load tag catalog in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx` on mount via `GET /manual-roadmaps/tags` and wire tag state to API calls (Gaps A1+A2)

**Checkpoint**: Foundation AND API bridge ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manage Tags While Editing a Roadmap (Priority: P1) 🎯 MVP

**Goal**: Users can add, edit, remove, and create tags while working inside the manual roadmap editor, and those tags persist when the roadmap is saved and reopened.

**Independent Test**: Open a manual roadmap draft, add a tag, remove it, create a new tag, save, and verify the saved roadmap reloads with the updated tag list intact.

### Tests for User Story 1

- [ ] T015 [P] [US1] Add backend validation tests for roadmap tag persistence and duplicate prevention in `backend/tests/unit/manualRoadmapValidation.service.test.js`
- [ ] T016 [P] [US1] Add backend service tests for create/update tag persistence in `backend/tests/unit/manualRoadmap.service.test.js`
- [ ] T017 [P] [US1] Add frontend editor behavior tests for add/remove/create tag interactions in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`

### Implementation for User Story 1

- [ ] T018 [P] [US1] Extend roadmap tag data model and persistence in `backend/src/modules/roadmap/manualRoadmap.model.js`
- [ ] T019 [US1] Implement tag normalization, deduplication, and inline creation rules in `backend/src/modules/roadmap/manualRoadmapValidation.service.js`
- [ ] T020 [US1] Persist roadmap tags on create/update flows in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [ ] T021 [P] [US1] Load and project roadmap tags into the editor state in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx`
- [ ] T022 [US1] Build tag chip add/remove/create UI in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx`
- [ ] T023 [US1] Render saved tags when reopening an existing roadmap in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx`

**Checkpoint**: User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Filter Search Results by Tags (Priority: P2)

**Goal**: Users can search public roadmaps with tag filters and get results narrowed to matching roadmaps.

**Independent Test**: Open roadmap search, select one or more tags, and verify the results list contains only matching roadmaps.

### Tests for User Story 2

- [ ] T024 [P] [US2] Add backend API tests for tag-filtered public search in `backend/tests/integration/manualRoadmapSearch.api.test.js`
- [ ] T025 [P] [US2] Add frontend search hook tests for tag-filtered requests in `frontend/src/features/roadmap-search/useRoadmapSearch.test.js`
- [ ] T026 [P] [US2] Add frontend search UI tests for tag filter selection in `frontend/src/features/roadmap-search/RoadmapSearchPage.test.jsx`

### Implementation for User Story 2

- [ ] T027 [P] [US2] Add tag filter query parsing and validation in `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T028 [US2] Implement tag-aware public manual roadmap search in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [ ] T029 [P] [US2] Extend the search API client to send tag filters from `frontend/src/services/roadmapSearch.api.js`
- [ ] T030 [US2] Add tag filter UI state and query synchronization in `frontend/src/features/roadmap-search/useRoadmapSearch.js`
- [ ] T031 [US2] Render selectable tag filters in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`
- [ ] T032 [US2] Show filtered result summaries and empty-state messaging in `frontend/src/features/roadmap-search/RoadmapSearchResults.jsx`

**Checkpoint**: User Story 2 should be fully functional and testable independently

---

## Phase 5: User Story 3 - Combine Tags With Existing Search Behavior (Priority: P3)

**Goal**: Tag filters work alongside the existing keyword search flow without resetting the user's current search intent.

**Independent Test**: Type a keyword search, add or remove tag filters, and confirm the keyword query stays active while results update.

### Tests for User Story 3

- [ ] T033 [P] [US3] Add backend integration coverage for combined keyword and tag filters in `backend/tests/integration/manualRoadmapSearch.api.test.js`
- [ ] T034 [P] [US3] Add frontend debounce and query-preservation tests in `frontend/src/features/roadmap-search/useRoadmapSearch.test.js`
- [ ] T035 [P] [US3] Add UI regression tests for combined keyword + tag search in `frontend/src/features/roadmap-search/RoadmapSearchPage.test.jsx`

### Implementation for User Story 3

- [ ] T036 [US3] Preserve keyword search state while applying tag filters in `frontend/src/features/roadmap-search/useRoadmapSearch.js`
- [ ] T037 [P] [US3] Keep the combined keyword/tag request contract stable in `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T038 [US3] Update result rendering and empty states to reflect combined filters in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`
- [ ] T039 [US3] Ensure multi-tag selection uses OR matching in `backend/src/modules/roadmap/manualRoadmap.service.js`

**Checkpoint**: User Stories 1, 2, and 3 should all work independently

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T040 [P] Sync roadmap tags into shared UI styles in `frontend/src/style/general-component.css`
- [ ] T041 [P] Update manual roadmap and search documentation references in `README.md` and `specs/015-roadmap-tags/quickstart.md`
- [ ] T042 Clean up roadmap tag helper code and remove temporary scaffolding in `backend/src/modules/roadmap/` and `frontend/src/features/roadmap-search/`
- [ ] T043 Validate tag search and edit flows against `specs/015-roadmap-tags/quickstart.md`
- [ ] T044 Run full lint/test sweep for touched backend and frontend roadmap files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
  - **API Bridge Checkpoint** (T011-T014): CRITICAL MUST-COMPLETE before any user story
    - These tasks fix the 2 HIGH severity coverage gaps (A1: tag catalog endpoint, A2: API payload wiring)
    - Without T011-T014, even completed user stories cannot ship (tags won't load or persist)
- **User Stories (Phase 3+)**: All depend on Foundational phase completion (including API bridge tasks T011-T014)
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational + API Bridge (Phase 2 with T011-T014) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational + API Bridge (Phase 2 with T011-T014) - Uses the same tag data shape but remains independently testable
- **User Story 3 (P3)**: Can start after Foundational + API Bridge (Phase 2 with T011-T014) - Builds on the existing search flow but remains independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints/UI wiring
- **For User Story 1 with API bridge**: T014 (Load tag catalog) must complete before T022 (Build tag chip UI) so tags can be displayed as suggestions
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- Setup tasks marked [P] can run in parallel
- Foundational tasks marked [P] can run in parallel within Phase 2
  - **⚠️ Exception**: T011-T014 (API bridge) must complete before any user story work starts
  - But within T011-T014: T012, T013, T014 can run in parallel since they touch separate layers
- User Story 1 test tasks marked [P] can run in parallel (T015-T017)
- User Story 1 implementation tasks touching separate files can run in parallel (T018-T023)
- User Story 2 test tasks marked [P] can run in parallel (T024-T026)
- User Story 3 test tasks marked [P] can run in parallel (T033-T035)

---

## Parallel Example: Foundational Phase + User Story 1

```bash
# API Bridge tasks can partially parallelize:
Task: "T012: Implement distinct tag query in manualRoadmap.service.js" (backend layer)
Task: "T013: Update manualRoadmap.api.js to accept tags" (frontend API layer)
Task: "T014: Load tag catalog in ManualRoadmapPage" (frontend UI layer)
# Run together, but all must finish before user story work begins

# Then User Story 1 editor and persistence tests together:
Task: "T015: Add backend validation tests for roadmap tag persistence" (backend tests)
Task: "T016: Add backend service tests for create/update tag persistence" (backend tests)
Task: "T017: Add frontend editor behavior tests for add/remove/create tag interactions" (frontend tests)

# Then User Story 1 implementation work on separate files together:
Task: "T018: Extend roadmap tag data model and persistence" (backend model)
Task: "T021: Load and project roadmap tags into the editor state" (frontend state)

# UI implementation can start after:
Task: "T022: Build tag chip add/remove/create UI" (frontend UI)
Task: "T023: Render saved tags when reopening an existing roadmap" (frontend UI)
```

---

## Implementation Strategy

### ⚠️ CRITICAL: API Bridge Checkpoint (T011-T014)

Before starting ANY user story, complete all Phase 2 tasks including the API bridge tasks (T011-T014):
- **T011-T012**: Implement `GET /manual-roadmaps/tags` endpoint (backend)
- **T013**: Update API client to accept tags in payloads (frontend API)
- **T014**: Load and wire tag catalog in editor (frontend UI)

**Why Critical**: 
- Without T011-T012: Tag catalog never exposed → users cannot select from existing tags (FR-006, FR-007 broken)
- Without T013-T014: Tag state from editor never reaches backend → tags not persisted (FR-004 broken, FR-001-003 incomplete)
- These gaps were identified as HIGH severity in project analysis; skipping them causes entire feature to fail at runtime

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational + API Bridge (T004-T014) ⚠️ CRITICAL
3. Complete Phase 3: User Story 1 (T015-T023)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md scenarios
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational + API Bridge → Foundation + bridge ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. **API Bridge Gate**: T011-T014 must complete before user story teams start
3. Once API Bridge is verified:
   - Developer A: User Story 1 (T015-T023)
   - Developer B: User Story 2 (T024-T032)
   - Developer C: User Story 3 (T033-T039)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies within the same phase layer
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing

### Critical API Bridge (T011-T014) Notes

These 4 tasks fix the 2 HIGH severity coverage gaps identified during project analysis:

- **Gap A1 (Tag Catalog)**: Fixed by T011-T012 + T014
  - Without: Editor has no way to show existing tags → FR-006 (allow selection from catalog) broken
  - T011: Add `GET /manual-roadmaps/tags` route to roadmap.controller.js
  - T012: Implement distinct tag query in manualRoadmap.service.js
  - T014: Load catalog in ManualRoadmapPage and pass to tag UI component

- **Gap A2 (API Payload Wiring)**: Fixed by T013 + T014
  - Without: Tag state from editor component never sent to backend → FR-001-004 (persist tags) broken
  - T013: Update manualRoadmap.api.js to accept `tags` in createManualRoadmap() and updateManualRoadmap() payloads
  - T014: Wire editor's tag state into these API calls when saving

- Both gaps must be fixed before feature ships; together they form the critical API bridge between frontend UI layer and backend persistence layer

### Execution Guidelines

- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Test failures before implementations per TDD approach
- Use quickstart.md scenarios for validation at each checkpoint