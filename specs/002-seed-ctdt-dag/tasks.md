# Tasks: Seed UET Curriculum into DB as DAG

**Input**: Design documents from `/specs/002-seed-ctdt-dag/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include unit tests because plan.md explicitly requires Jest unit coverage for pipeline logic, cycle detection, and bulk upsert behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, ...)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add required dependencies and create curriculum module scaffolding.

- [X] T001 Add runtime dependencies `node-cron`, `@google/generative-ai`, and `@tavily/core` in backend/package.json
- [X] T002 [P] Create curriculum module directory and initial exports in backend/src/modules/curriculum/index.js
- [X] T003 [P] Create seed configuration file with URL list and default cron expression in backend/src/modules/curriculum/curriculum.config.js
- [X] T004 [P] Add seed log file ignore rule for `backend/logs/seed-ctdt.log` in .gitignore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared foundations required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [X] T005 Create `CourseUnit` schema, model, and compound unique index `{ code, major }` in backend/src/modules/curriculum/courseUnit.model.js
- [X] T006 [P] Implement Tavily extraction wrapper with sequential single-URL call contract in backend/src/modules/curriculum/tavily.service.js
- [X] T007 [P] Implement Gemini structured-output parser and schema validation entrypoint in backend/src/modules/curriculum/gemini.service.js
- [X] T008 [P] Implement structured console+file logger with JSON line format in backend/src/modules/curriculum/seed.logger.js
- [X] T009 Create shared status constants and run summary helpers in backend/src/modules/curriculum/seed.status.js
- [X] T010 Create seed pipeline skeleton, dependency wiring, and exported `runSeedPipeline()` in backend/src/modules/curriculum/seed.pipeline.js
- [X] T011 Register curriculum module (cron registration + manual trigger export) in backend/src/app.js

**Checkpoint**: Foundation ready for independent user-story implementation.

---

## Phase 3: User Story 1 - Full Batch Seed Succeeds (Priority: P1) 🎯 MVP

**Goal**: Process all configured URLs successfully and upsert complete CourseUnit data with idempotent overwrite behavior.

**Independent Test**: Trigger pipeline with two valid mocked URLs and verify `bulkWrite` upserts all records, overwrites existing `{code, major}` records, logs success, and returns `SUCCESS`.

### Tests for User Story 1

- [X] T012 [P] [US1] Add happy-path pipeline unit test for all URLs success in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T013 [P] [US1] Add bulk upsert overwrite/idempotency unit tests in backend/tests/unit/curriculum/bulkWrite.upsert.test.js

### Implementation for User Story 1

- [X] T014 [US1] Implement sequential URL processing and extract→parse→validate flow in backend/src/modules/curriculum/seed.pipeline.js
- [X] T015 [US1] Implement `CourseUnit.bulkWrite` upsert mapping with full-document `$set` in backend/src/modules/curriculum/seed.pipeline.js
- [X] T016 [US1] Populate and persist `seededAt` on successful upserts in backend/src/modules/curriculum/seed.pipeline.js
- [X] T017 [US1] Implement empty-URL-list no-op behavior with `SUCCESS` status logging in backend/src/modules/curriculum/seed.pipeline.js

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Partial Failure Handling (Priority: P1)

**Goal**: Continue processing remaining URLs when one URL fails and surface detailed per-stage failure logs.

**Independent Test**: Trigger pipeline with one failing mocked URL and one valid URL, verify successful URL data persists, failed URL is skipped with stage+reason log, and final status is `PARTIAL_FAILURE`.

### Tests for User Story 2

- [X] T018 [P] [US2] Add unit test for Tavily-stage failure skip/continue behavior in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T019 [P] [US2] Add unit test for Gemini/validation-stage failure skip/continue behavior in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T020 [P] [US2] Add unit test for all-URLs-failed aggregate result handling in backend/tests/unit/curriculum/seed.pipeline.test.js

### Implementation for User Story 2

- [X] T021 [US2] Add per-stage try/catch handling and URL skip continuation logic in backend/src/modules/curriculum/seed.pipeline.js
- [X] T022 [US2] Emit structured `URL_SKIP` logs with `url`, `stage`, and `reason` fields in backend/src/modules/curriculum/seed.logger.js (includes `JOB_START`/`JOB_COMPLETE`)
- [X] T023 [US2] Implement final status resolution rules for partial vs full success in backend/src/modules/curriculum/seed.pipeline.js

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Post-Seed Cycle Detection (Priority: P1)

**Goal**: Run per-major cycle detection after upserts and fail run status when graph cycles are found while preserving data.

**Independent Test**: Seed mocked records containing one known cycle, run post-seed validation, verify `CYCLE_DETECTED` logs include cycle nodes and final status is `FAILED` without rollback.

### Tests for User Story 3

- [X] T024 [P] [US3] Add DFS unit tests for clean graph and cycle graph in backend/tests/unit/curriculum/cycle.detector.test.js
- [X] T025 [P] [US3] Add pipeline integration-style unit test asserting `FAILED` on detected cycles in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T026 [P] [US3] Add unit test for unresolved prerequisite warning emission in backend/tests/unit/curriculum/seed.pipeline.test.js

### Implementation for User Story 3

- [X] T027 [US3] Implement per-major DFS cycle detection utility in backend/src/modules/curriculum/cycle.detector.js
- [X] T028 [US3] Integrate post-upsert per-major graph scan into run pipeline in backend/src/modules/curriculum/seed.pipeline.js
- [X] T029 [US3] Emit `CYCLE_CLEAN` and `CYCLE_DETECTED` structured logs in backend/src/modules/curriculum/seed.logger.js
- [X] T030 [US3] Add unresolved prerequisite detection and warning logs in backend/src/modules/curriculum/seed.pipeline.js

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Manual Trigger on Dev Environment (Priority: P2)

**Goal**: Provide a dev-only manual trigger with behavior identical to scheduled execution.

**Independent Test**: Run manual trigger in development and production-mocked environments, verify development runs pipeline normally and production mode rejects trigger.

### Tests for User Story 4

- [X] T031 [P] [US4] Add unit tests for dev-only manual trigger guard and exit behavior in backend/tests/unit/curriculum/seed.job.test.js
- [X] T032 [P] [US4] Add unit test for cron registration calling shared pipeline handler in backend/tests/unit/curriculum/seed.job.test.js

### Implementation for User Story 4

- [X] T033 [US4] Implement cron registration and manual trigger exports in backend/src/modules/curriculum/seed.job.js
- [X] T034 [US4] Add `seed:ctdt` npm script for manual trigger in backend/package.json

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation alignment, and quality checks across all stories.

- [X] T036 [P] Update feature runbook and env variable docs for seed pipeline in specs/002-seed-ctdt-dag/quickstart.md
- [X] T037 [P] Align job-interface status semantics and log examples with implementation in specs/002-seed-ctdt-dag/contracts/job-interface.md
- [X] T038 Run full backend unit suite for curriculum module and fix regressions in backend/tests/unit/curriculum/
- [X] T039 Validate quickstart end-to-end flow (manual trigger + logs + statuses) and record outcomes in specs/002-seed-ctdt-dag/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion; blocks all user stories.
- **Phase 3–6 (User Stories)**: Depend on Phase 2.
- **Phase 7 (Polish)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories.
- **US2 (P1)**: Starts after US1 pipeline baseline is in place (depends on T014–T017).
- **US3 (P1)**: Starts after US1 upsert baseline is in place (depends on T014–T017).
- **US4 (P2)**: Starts after core pipeline is stable (US1 complete; US2/US3 recommended before finalizing trigger behavior).

### Dependency Graph (Story Completion Order)

- Foundation → US1 → {US2, US3} → US4 → Polish

---

## Parallel Execution Examples

### User Story 1

- Run in parallel: T012 and T013 (separate test concerns/files)

### User Story 2

- Run in parallel: T018, T019, and T020 (independent failure-mode tests)

### User Story 3

- Run in parallel: T024, T025, and T026 (detector test and pipeline cycle scenarios)

### User Story 4

- Run in parallel: T031 and T032 (manual trigger guard vs cron registration test)

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently via tests and manual run.
4. Demo/deploy MVP with reliable curriculum seed success path.

### Incremental Delivery

1. Add US2 for robust partial-failure resilience.
2. Add US3 for graph integrity guarantees.
3. Add US4 dev tooling convenience.
4. Finish with Phase 7 polish and full regression validation.

### Parallel Team Strategy

1. One developer completes Setup + Foundational.
2. After US1 baseline, split work:
   - Dev A: US2 failure handling
   - Dev B: US3 cycle detection
   - Dev C: US4 trigger interface
3. Merge and execute polish phase.

---

## Notes

- All tasks follow the required checklist format: `- [ ] T### [P?] [US?] Description with file path`.
- `[US#]` labels are applied only to user-story tasks.
- Tasks are intentionally concrete so an LLM agent can execute each item directly.
