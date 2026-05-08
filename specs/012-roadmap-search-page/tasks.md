# Tasks: Roadmap Search Page

**Input**: Design documents from `/specs/012-roadmap-search-page/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/roadmap-search-api.md`, `quickstart.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create feature scaffolding and initial integration points for search-page development.

- [X] T001 Create roadmap search feature files in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`, `frontend/src/features/roadmap-search/RoadmapSearchResults.jsx`, and `frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx`
- [X] T002 Add `/roadmaps/search` route shell in `frontend/src/App.jsx`
- [X] T003 [P] Create roadmap search API client scaffold in `frontend/src/services/roadmapSearch.api.js`
- [X] T004 [P] Add backend route/controller stubs for roadmap search in `backend/src/modules/roadmap/roadmap.routes.js` and `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T005 [P] Create test scaffolds in `backend/tests/integration/roadmapSearch.api.test.js` and `frontend/src/features/roadmap-search/RoadmapSearchPage.test.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement core backend/frontend plumbing required before user-story work.

**⚠️ CRITICAL**: Complete this phase before starting user stories.

- [X] T006 Implement public roadmap query filter support (`q`, pagination) in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [X] T007 [P] Implement public roadmap preview-by-id service method in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [X] T008 Implement controller query validation (`q` minimum 2 chars) and payload mapping in `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T009 Register public search and public preview routes before auth middleware in `backend/src/modules/roadmap/roadmap.routes.js`
- [X] T010 Implement page-local search state hook and transitions in `frontend/src/features/roadmap-search/useRoadmapSearch.js`
- [X] T011 [P] Add split-screen layout and responsive styles in `frontend/src/style/general-component.css`
- [X] T012 Wire navbar search click navigation to `/roadmaps/search` in `frontend/src/features/general/NavBar.jsx`

**Checkpoint**: Foundation ready; user stories can proceed.

---

## Phase 3: User Story 1 - Open Search Workspace from Search Bar (Priority: P1) 🎯 MVP

**Goal**: Clicking the global search bar opens a dedicated split-screen search page while keeping the navbar search field as the only input.

**Independent Test**: From a page with navbar search, click the search bar and verify navigation to split-screen page with the navbar search field still available.

### Tests for User Story 1

- [X] T013 [P] [US1] Add navbar-click navigation test in `frontend/src/features/general/NavBar.search.test.jsx`
- [X] T014 [P] [US1] Add split-screen render and navbar-search focus test in `frontend/src/features/roadmap-search/RoadmapSearchPage.test.jsx`

### Implementation for User Story 1

- [X] T015 [US1] Implement split-screen search page shell without its own search input in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`
- [X] T016 [P] [US1] Implement left-panel result list skeleton in `frontend/src/features/roadmap-search/RoadmapSearchResults.jsx`
- [X] T017 [P] [US1] Implement right-panel preview placeholder state in `frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx`
- [X] T018 [US1] Finalize route rendering and guard behavior for `/roadmaps/search` in `frontend/src/App.jsx`

**Checkpoint**: US1 works independently (navigation + split-screen entry).

---

## Phase 4: User Story 2 - Search Roadmaps by Name (Priority: P2)

**Goal**: Search public/shared roadmaps by name with 300ms debounce, 2-character minimum, and clear result states.

**Independent Test**: Enter valid query text and verify matching results; enter 1 character and verify no search request with guidance state.

### Tests for User Story 2

- [X] T019 [P] [US2] Add backend integration tests for query filtering and min-length validation in `backend/tests/integration/roadmapSearch.api.test.js`
- [X] T020 [P] [US2] Add frontend debounce/min-length/stale-result tests in `frontend/src/features/roadmap-search/RoadmapSearch.behavior.test.jsx`

### Implementation for User Story 2

- [X] T021 [US2] Implement title-based public search query in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [X] T022 [US2] Implement search request validation and error mapping in `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T023 [US2] Implement debounced search API function in `frontend/src/services/roadmapSearch.api.js`
- [X] T024 [US2] Implement search state machine (`idle/searching/loaded/empty/error`) in `frontend/src/features/roadmap-search/useRoadmapSearch.js`
- [X] T025 [US2] Render result cards and selected-item styles in `frontend/src/features/roadmap-search/RoadmapSearchResults.jsx`
- [X] T026 [US2] Integrate navbar-driven search behavior, loading, empty, and error UI in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`

**Checkpoint**: US2 works independently (debounced search + result rendering).

---

## Phase 5: User Story 3 - Preview Selected Roadmap (Priority: P3)

**Goal**: Auto-preview first result and support click-to-preview updates with resilient error/fallback handling.

**Independent Test**: Run a query with results and verify first result auto-previews; click another result and verify preview updates.

### Tests for User Story 3

- [X] T027 [P] [US3] Add backend integration tests for public preview-by-id success/not-found in `backend/tests/integration/roadmapSearch.preview.test.js`
- [X] T028 [P] [US3] Add frontend tests for auto-preview-first and click-to-preview synchronization in `frontend/src/features/roadmap-search/RoadmapPreviewPanel.test.jsx`

### Implementation for User Story 3

- [X] T029 [US3] Implement preview-by-id service method in `backend/src/modules/roadmap/manualRoadmap.service.js`
- [X] T030 [US3] Implement preview-by-id controller endpoint in `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T031 [US3] Register preview-by-id public route in `backend/src/modules/roadmap/roadmap.routes.js`
- [X] T032 [US3] Implement preview fetch client function in `frontend/src/services/roadmapSearch.api.js`
- [X] T033 [US3] Implement preview panel graph/fallback/error rendering in `frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx`
- [X] T034 [US3] Implement auto-select-first and click-selection preview updates in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`

**Checkpoint**: US3 works independently (preview behavior complete).

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T035 [P] Add full-flow frontend regression test (navbar click -> search -> preview) in `frontend/src/features/roadmap-search/RoadmapSearch.flow.test.jsx`
- [ ] T036 [P] Add backend unit test coverage for search/preview edge handling in `backend/tests/unit/roadmap/roadmapSearch.controller.test.js`
- [ ] T037 [P] Reconcile implemented API behavior with contract examples in `specs/012-roadmap-search-page/contracts/roadmap-search-api.md`
- [ ] T038 [P] Validate quickstart instructions against real flow and update notes in `specs/012-roadmap-search-page/quickstart.md`
- [ ] T039 [P] Clean up UX copy/loading/error consistency across search UI in `frontend/src/features/roadmap-search/RoadmapSearchPage.jsx`, `frontend/src/features/roadmap-search/RoadmapSearchResults.jsx`, and `frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies; starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1; blocks all user stories.
- **Phase 3 (US1)**: Depends on Phase 2; delivers MVP entry flow.
- **Phase 4 (US2)**: Depends on Phase 2 and UI shell from US1.
- **Phase 5 (US3)**: Depends on Phase 2 and search result flow from US2.
- **Phase 6 (Polish)**: Depends on completion of desired user stories.

### User Story Dependencies

- **US1 (P1)**: Independent once foundational work is complete.
- **US2 (P2)**: Requires search page entry from US1, but can be validated independently after implementation.
- **US3 (P3)**: Requires searchable result set from US2 to drive preview selection.

### Within Each User Story

- Write tests first and confirm they fail before implementation.
- Implement data/service flow before UI wiring.
- Complete story-level checkpoint before moving to next priority.

### Parallel Opportunities

- Setup tasks marked `[P]` can run together.
- Foundational backend service and frontend styling tasks marked `[P]` can run in parallel.
- For each user story, `[P]` test tasks can run concurrently.
- US3 backend preview endpoint and frontend preview UI can run in parallel after contract is fixed.

---

## Parallel Example: User Story 1

```bash
Task: "T013 [US1] Add navbar-click navigation test in frontend/src/features/general/NavBar.search.test.jsx"
Task: "T014 [US1] Add split-screen render and autofocus test in frontend/src/features/roadmap-search/RoadmapSearchPage.test.jsx"

Task: "T016 [US1] Implement left-panel result list skeleton in frontend/src/features/roadmap-search/RoadmapSearchResults.jsx"
Task: "T017 [US1] Implement right-panel preview placeholder state in frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx"
```

## Parallel Example: User Story 2

```bash
Task: "T019 [US2] Add backend integration tests for query filtering and min-length validation in backend/tests/integration/roadmapSearch.api.test.js"
Task: "T020 [US2] Add frontend debounce/min-length/stale-result tests in frontend/src/features/roadmap-search/RoadmapSearch.behavior.test.jsx"

Task: "T021 [US2] Implement title-based public search query in backend/src/modules/roadmap/manualRoadmap.service.js"
Task: "T023 [US2] Implement debounced search API function in frontend/src/services/roadmapSearch.api.js"
```

## Parallel Example: User Story 3

```bash
Task: "T027 [US3] Add backend integration tests for public preview-by-id success/not-found in backend/tests/integration/roadmapSearch.preview.test.js"
Task: "T028 [US3] Add frontend tests for auto-preview-first and click-to-preview synchronization in frontend/src/features/roadmap-search/RoadmapPreviewPanel.test.jsx"

Task: "T029 [US3] Implement public preview-by-id service with isPublic enforcement in backend/src/modules/roadmap/manualRoadmap.service.js"
Task: "T033 [US3] Implement preview panel graph/fallback/error rendering in frontend/src/features/roadmap-search/RoadmapPreviewPanel.jsx"
```

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) for click-to-open split-screen experience.
3. Validate US1 independently before adding search/preview behavior.

### Incremental Delivery

1. Add US2 for searchable public roadmap discovery.
2. Add US3 for preview synchronization and selection behavior.
3. Execute Polish phase for full-flow reliability and documentation.

### Team Parallel Strategy

1. One backend developer handles roadmap module API work (Phases 2, 4, 5).
2. One frontend developer handles search page components/state (Phases 2, 3, 4, 5).
3. Test tasks marked `[P]` can be split across both developers during each story phase.
