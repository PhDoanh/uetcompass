---

description: "Task list for 008-advanced-tag-search feature implementation"
---

# Tasks: Advanced Tag-Based Search (008)

**Input**: plan.md, spec.md, data-model.md, contracts/rest-api.md, research.md
**Prerequisites**: feature branch set up; backend/frontend monorepo present; test configs already in place.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and baseline module scaffolding for backend and frontend.

- [ ] T001 [P] Create search module directories and entry points in backend: `backend/src/modules/search/`
- [ ] T002 [P] Create frontend search feature directories: `frontend/src/features/search/`
- [ ] T003 [P] Add route registration for search API in backend: `backend/src/modules/search/search.routes.js` and `backend/src/app.js`
- [ ] T004 [P] Add initial test directories: `backend/tests/unit/search/` and `frontend/src/features/search/__tests__/`
- [ ] T005 [P] Add dependency docs note in `specs/008-advanced-tag-search/README` if applicable.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core backend and frontend foundations enabling all user stories.

- [ ] T006 Implement canonical query normalization utility in backend at `backend/src/modules/search/search.normalizer.js`
- [ ] T007 Implement request validation and error contract middleware in backend at `backend/src/modules/search/search.validation.js` and `backend/src/modules/search/search.controller.js`
- [ ] T008 Implement MongoDB text index initialization and health checks in backend at `backend/src/modules/search/search.index.js`
- [ ] T009 Implement fallback cache layer for graceful degradation in backend at `backend/src/modules/search/search.cache.js`
- [ ] T010 Implement base search service skeleton in backend at `backend/src/modules/search/search.service.js`
- [ ] T011 Implement base query builder in backend at `backend/src/modules/search/search.queryBuilder.js`
- [ ] T012 Implement deduplication core in backend at `backend/src/modules/search/search.dedup.js`
- [ ] T013 Implement personalization helper in backend at `backend/src/modules/search/search.personalization.js`
- [ ] T014 Implement API contract check and error envelope in `backend/src/modules/search/search.validation.js`
- [ ] T015 Add backend unit test placeholders and shared fixtures in `backend/tests/unit/search/` (e.g., `normalizer.test.js`, `validation.test.js`).

---

## Phase 3: User Story 1 - Tag-Based Discovery (Priority: P1) 🎯 MVP

**Goal**: Clicking a tag returns related courses and roadmaps with no duplicates, organized in two sections.

**Independent Test**: for a known tag, calling `POST /api/search/query` returns `courses` and `roadmaps`, each deduplicated and containing canonical tags.

### Tests for User Story 1

- [ ] T016 [P] [US1] Backend unit test for tag canonicalization in `backend/tests/unit/search/normalizer.test.js`
- [ ] T017 [P] [US1] Backend unit test for deduplication logic in `backend/tests/unit/search/dedup.test.js`
- [ ] T018 [P] [US1] Backend integration test for `POST /api/search/query` with tag search in `backend/tests/unit/search/search.service.test.js`

### Implementation for User Story 1

- [ ] T019 [US1] Implement tag-based query path in `backend/src/modules/search/search.service.js` including `queryType === "tag"` and `resolvedTagId` lookup
- [ ] T020 [US1] Implement query building for tag path in `backend/src/modules/search/search.queryBuilder.js` (`tagId`, `additionalTagIds`, `minConfidence` mapping)
- [ ] T021 [US1] Implement deduplication of courses and roadmaps in `backend/src/modules/search/search.dedup.js`
- [ ] T022 [US1] Implement `POST /api/search/query` handler in `backend/src/modules/search/search.controller.js` and wire through `search.routes.js`
- [ ] T023 [US1] Map backend results to response schema in `backend/src/modules/search/search.service.js` (courses/roadmaps sections, pagination meta, `queryContext`, `appliedFilters`, `appliedSort`, `fallbackMode`)
- [ ] T024 [US1] Add search frontend hook `frontend/src/features/search/useSearch.js` with tag query path and response parsing
- [ ] T025 [US1] Add `SearchPage.jsx` to display `Related Courses` and `Related Roadmaps` sections from US1 data
- [ ] T026 [US1] Add fix for duplicate entry prevention in UI state mapping in `frontend/src/features/search/useSearch.js`

**Checkpoint**: User Story 1 is functional and unit tested.

---

## Phase 4: User Story 2 - Keyword-Based Search (Priority: P2)

**Goal**: Keyword search returns relevant related courses/roadmaps for free-text input in search bar.

**Independent Test**: entering `SQL` returns consistent courses/roadmaps matching keyword across title/description/tags.

### Tests for User Story 2

- [ ] T027 [P] [US2] Backend unit test for keyword query builder in `backend/tests/unit/search/queryBuilder.test.js`
- [ ] T028 [P] [US2] Backend integration test for `POST /api/search/query` with keyword search in `backend/tests/unit/search/search.service.test.js`
- [ ] T029 [P] [US2] Frontend unit test for search submit by keyword in `frontend/src/features/search/__tests__/SearchPage.test.jsx`

### Implementation for User Story 2

- [ ] T030 [US2] Implement `queryType === "keyword"` path in `backend/src/modules/search/search.service.js` using `query.keyword`
- [ ] T031 [US2] Implement text index keyword query with MongoDB `$text` in `backend/src/modules/search/search.queryBuilder.js`
- [ ] T032 [US2] Ensure results are mapped into `courses`and `roadmaps` and sorted by relevance or alphabetical in backend
- [ ] T033 [US2] Extend frontend search UI in `frontend/src/features/search/SearchBar.jsx` to accept keyword input and trigger keyword search

**Checkpoint**: User Story 2 is functional and testable.

---

## Phase 5: User Story 3 - Combined Filtering (Priority: P2)

**Goal**: Filter by tag + level + domain and optional additional tags, with AND semantics.

**Independent Test**: applying tag "#Java" + level "Intermediate" returns only matching courses/roadmaps.

### Tests for User Story 3

- [ ] T034 [P] [US3] Backend unit test for filter combination in `backend/tests/unit/search/filter.test.js`
- [ ] T035 [P] [US3] Backend integration test for filter and sort behavior in `backend/tests/unit/search/search.service.test.js`
- [ ] T036 [P] [US3] Frontend test for combined filters in `frontend/src/features/search/__tests__/FilterBar.test.jsx`

### Implementation for User Story 3

- [ ] T037 [US3] Implement filter parsing and AND semantics in `backend/src/modules/search/search.queryBuilder.js`
- [ ] T038 [US3] Apply filter effects in data pipeline in `backend/src/modules/search/search.service.js`
- [ ] T039 [US3] Add filter UI components `frontend/src/features/search/FilterBar.jsx` and integrate with SearchPage

**Checkpoint**: US3 filter behavior passes acceptance scenarios.

---

## Phase 6: User Story 4 - Search Result Organization (Priority: P1)

**Goal**: Results clearly labeled and separated into course and roadmap sections with empty state handling.

**Independent Test**: response always has both arrays; frontend shows two labeled sections and hides empty section.

### Tests for User Story 4

- [ ] T040 [P] [US4] Backend unit test ensuring output includes `courses` & `roadmaps` keys for empty and non-empty sets
- [ ] T041 [P] [US4] Frontend snapshot test for result sections in `frontend/src/features/search/__tests__/ResultsSection.test.jsx`

### Implementation for User Story 4

- [ ] T042 [US4] Implement section mapping in `frontend/src/features/search/ResultsSection.jsx` with labels and empty states
- [ ] T043 [US4] Add `NoResults.jsx` state and conditional render behavior

**Checkpoint**: UI organization reflects acceptance criteria.

---

## Phase 7: User Story 5 - Search Performance (Priority: P1)

**Goal**: p95 latency <500ms for 10k skills, fallback within 100ms when index unavailable.

**Independent Test**: run benchmark tests for hot path and fallback path.

### Tests for User Story 5

- [ ] T044 [P] [US5] Performance stress test script in `scripts/search-performance.test.js` or `backend/tests/unit/search/performance.test.js`
- [ ] T045 [P] [US5] Backend integration test for index outage fallback in `backend/tests/unit/search/fallback.test.js`

### Implementation for User Story 5

- [ ] T046 [US5] Implement graceful degradation in `backend/src/modules/search/search.cache.js` and `search.service.js`
- [ ] T047 [US5] Add `search.index.js` health checker and fallback trigger in `search.service.js`
- [ ] T048 [US5] Add metric logging for query duration in `backend/src/modules/search/search.logger.js`

**Checkpoint**: Performance and fallback behavior are validated.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, documentation, and cross-story reliability.

- [ ] T049 [P] Update spec docs in `specs/008-advanced-tag-search/quickstart.md` and `README.md` with final endpoints and test commands
- [ ] T050 [P] Add API contract tests in `backend/tests/unit/search/errors.test.js`
- [ ] T051 [P] Refactor backend search module to remove duplication and improve maintainability
- [ ] T052 [P] Add TypeScript/JSDoc comments to search module functions
- [ ] T053 [P] Run all tests and fix failing cases
- [ ] T054 [P] Validate `performance` goal with a local dataset of 10,000 skills and record results
- [ ] T055 [P] Add release notes in `CHANGELOG.md` under `Unreleased`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) may be parallelized immediately.
- Foundational (Phase 2) depends on Setup completion.
- User stories (Phases 3-7) depend on Foundation and can run in parallel by story.
- Polish (Phase 8) depends on completion of all story phases.

### User Story Dependencies

- US1: can start after Phase 2 (foundational done)
- US2: can start after Phase 2 and US1 baseline; should be independently testable
- US3: can start after Phase 2 and iteratively integrate with US1/US2
- US4: augment US1/US2 output rendering and labeling
- US5: cross-cutting non-functional and resilience behavior

### Parallel Execution Examples

- Parallel Story implementation:
  - Task: `T016` + `T017` + `T018` (US1 tests) can run concurrently
  - Task: `T027` + `T028` + `T029` (US2 tests) can run concurrently
  - Task: `T034` + `T035` + `T036` (US3 tests) can run concurrently
- Parallel tasks within foundational:
  - `T006`, `T007`, `T008`, `T009`, `T010`, `T011`, `T012`, `T013`, `T014`, `T015`
- Parallel polish tasks:
  - `T049`, `T050`, `T051`, `T052`, `T053`, `T054`, `T055`

### Implementation Strategy

- MVP first: complete US1 with API + UI and verify independently.
- Add US2 keyword behavior after US1 passes.
- Add US3 filters after US2 passes.
- Add US4 section organization and UI polish.
- Add US5 performance and fallback logic; then finalize with Phase 8.
