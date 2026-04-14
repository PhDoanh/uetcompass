# Tasks: Seed UET Curriculum into DB as DAG

**Input**: Design documents from `/specs/002-seed-ctdt-dag/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Include unit tests because `plan.md` explicitly requires Jest unit coverage for pipeline logic, cycle detection, change detection, and bulk upsert behavior.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`[US1]`, `[US2]`, ...)
- Every task includes an exact file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare dependencies, configuration surface, and module scaffold for the Program-centric seed job.

- [X] T001 Add runtime dependencies `node-cron`, `@google/generative-ai`, and `@tavily/core` in backend/package.json
- [X] T002 [P] Add/confirm no extra Jest deps required for curriculum tests in backend/package.json
- [X] T003 [P] Create curriculum module exports and file scaffold in backend/src/modules/curriculum/index.js
- [X] T004 [P] Define Program-centric seed config skeleton (`programs`, `careerTracks`, `skillVocabulary`) in backend/src/modules/curriculum/curriculum.config.js
- [X] T005 [P] Add environment variable examples for `TAVILY_API_KEY`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `SEED_CRON_SCHEDULE` in backend/.env.example
- [X] T006 [P] Add seed log file ignore rule for backend/logs/seed-ctdt.log in .gitignore

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared foundations required by all user stories.

**⚠️ CRITICAL**: Complete this phase before starting user story implementation.

- [X] T007 Create `CourseUnit` schema and indexes including unique `{ code, programId }` in backend/src/modules/curriculum/courseUnit.model.js
- [X] T008 [P] Create `Program` schema/model with unique `programId` in backend/src/modules/curriculum/program.model.js
- [X] T009 [P] Create `ProgramOutcome` schema/model with `poId` and `programId` indexes in backend/src/modules/curriculum/programOutcome.model.js
- [X] T010 [P] Create `CourseOutcome` schema/model for MVP forward-compatibility in backend/src/modules/curriculum/courseOutcome.model.js
- [X] T011 Create `SeedRun` schema/model with `urlSnapshots` and summary fields in backend/src/modules/curriculum/seedRun.model.js
- [X] T012 [P] Implement config loader + validation for `programId`, `trackId`, and vocab uniqueness in backend/src/modules/curriculum/config.loader.js
- [X] T013 [P] Implement Tavily extraction wrapper (single URL + sequential helper) in backend/src/modules/curriculum/tavily.service.js
- [X] T014 [P] Implement Gemini structured JSON helper + deterministic `computeEmphasis()` + skill filtering helpers in backend/src/modules/curriculum/gemini.service.js
- [X] T015 [P] Implement change detection helpers for HEAD comparison and snapshot building in backend/src/modules/curriculum/change-detection.js
- [X] T016 [P] Implement structured JSON logger for console + file sinks in backend/src/modules/curriculum/seed.logger.js
- [X] T017 Create persistence helper functions for `Program`/`ProgramOutcome`/`CourseUnit` bulk upserts in backend/src/modules/curriculum/seed.pipeline.persistence.js
- [X] T018 Create shared status constants and final-status resolver in backend/src/modules/curriculum/seed.status.js
- [X] T019 Create pipeline skeleton and dependency wiring for `runSeedPipeline()` in backend/src/modules/curriculum/seed.pipeline.js
- [X] T020 [P] Create Call-2 batch enrichment orchestrator in backend/src/modules/curriculum/enrichment.pipeline.js
- [X] T021 Register curriculum startup integration in backend/src/app.js

**Checkpoint**: Foundation ready for independent user-story implementation.

---

## Phase 3: User Story 1 - Full Batch Seed Succeeds (Priority: P1) 🎯 MVP

**Goal**: Process all changed Programs successfully, persist Program/ProgramOutcome/CourseUnit records, run Call 2 batch enrichment, then complete with `SUCCESS`.

**Independent Test**: Trigger pipeline with two changed Programs and valid mocked sources, verify DB upserts for all three collections, enrichment fields persisted with vocabulary filtering, cycle detection clean, and final status `SUCCESS`.

### Tests for User Story 1

- [X] T022 [P] [US1] Add happy-path end-to-end pipeline unit test (change-detected programs only) in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T023 [P] [US1] Add upsert overwrite/idempotency tests for `{ code, programId }` in backend/tests/unit/curriculum/bulkWrite.upsert.test.js
- [X] T024 [P] [US1] Add batch enrichment test for CourseUnit and ProgramOutcome updates, including dropping `careerTracks` values outside `CAREER_TRACKS.trackId`, in backend/tests/unit/curriculum/enrichment.pipeline.test.js
- [X] T025 [P] [US1] Add change-detection test for skip when all source snapshots unchanged in backend/tests/unit/curriculum/seedRun.changeDetection.test.js

### Implementation for User Story 1

- [X] T026 [US1] Implement Program loop with pre-check change detection and `CHANGE_SKIP` handling in backend/src/modules/curriculum/seed.pipeline.js
- [X] T027 [US1] Implement Call-1 flow (extract → parse → validate → normalize) with deterministic `emphasis` computation in backend/src/modules/curriculum/seed.pipeline.js
- [X] T028 [US1] Implement bulk upsert mapping for Program, ProgramOutcome, and CourseUnit writes in backend/src/modules/curriculum/seed.pipeline.js
- [X] T029 [US1] Implement Call-2 single Gemini batch enrichment per Program, enforcing `careerTracks` whitelist (`CAREER_TRACKS.trackId`) and skills vocabulary filtering before apply, in backend/src/modules/curriculum/enrichment.pipeline.js
- [X] T030 [US1] Persist `SeedRun.urlSnapshots`, summary counters, and finalization metadata in backend/src/modules/curriculum/seed.pipeline.js
- [X] T031 [US1] Emit canonical success-path events per contract (`JOB_START`, `URL_START`, `URL_SUCCESS`, `CHANGE_SKIP`, `ENRICHMENT_START`, `ENRICHMENT_SUCCESS`, `JOB_COMPLETE`) in backend/src/modules/curriculum/seed.logger.js
- [X] T032 [US1] Implement empty-program/no-change no-op completion path with `SUCCESS` in backend/src/modules/curriculum/seed.pipeline.js

**Checkpoint**: User Story 1 is independently functional and testable.

---

## Phase 4: User Story 2 - Partial Failure Handling (Priority: P1)

**Goal**: Continue processing when URL-stage or Program-stage failures occur and return `PARTIAL_FAILURE` with complete diagnostics.

**Independent Test**: Trigger pipeline with at least one Tavily/Call-1 URL failure and one Call-2 Program failure, verify unaffected Programs persist successfully, failure events include stage + reason, and final status is `PARTIAL_FAILURE`.

### Tests for User Story 2

- [X] T033 [P] [US2] Add unit test for URL-stage failure skip/continue behavior (`tavily`, `gemini`, `validate`, `upsert`) in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T034 [P] [US2] Add unit test for Program-level Call-2 failure (`ENRICHMENT_SKIP`) while continuing to next Program in backend/tests/unit/curriculum/enrichment.pipeline.test.js
- [X] T035 [P] [US2] Add unit test for aggregate `PARTIAL_FAILURE` when all changed Programs fail but process continues in backend/tests/unit/curriculum/seed.pipeline.test.js

### Implementation for User Story 2

- [X] T036 [US2] Add stage-isolated error boundaries and skip-continue semantics in backend/src/modules/curriculum/seed.pipeline.js
- [X] T037 [US2] Emit canonical failure/warning events per contract (`URL_SKIP`, `ENRICHMENT_SKIP`, `SKILL_TAG_DROPPED`, `UNRESOLVED_PREREQUISITE`) with required context (`programId`, `url`, `stage`, `reason`) in backend/src/modules/curriculum/seed.logger.js
- [X] T038 [US2] Apply partial-failure status resolution and counters in backend/src/modules/curriculum/seed.status.js

**Checkpoint**: User Story 2 is independently functional and testable.

---

## Phase 5: User Story 3 - Post-Seed Cycle Detection (Priority: P1)

**Goal**: Validate per-program DAG integrity after upserts and force final `FAILED` status when any cycle is detected (without rollback).

**Independent Test**: Seed records containing one known cycle under a single `programId`, run post-seed validation, verify `CYCLE_DETECTED` includes cycle edges and final status is `FAILED` while data remains persisted.

### Tests for User Story 3

- [X] T039 [P] [US3] Add DFS unit tests for clean graph and cyclic graph per `programId` in backend/tests/unit/curriculum/cycle.detector.test.js
- [X] T040 [P] [US3] Add pipeline unit test asserting `FAILED` status precedence when cycle exists in backend/tests/unit/curriculum/seed.pipeline.test.js
- [X] T041 [P] [US3] Add unresolved prerequisite warning test (`UNRESOLVED_PREREQUISITE`) in backend/tests/unit/curriculum/seed.pipeline.test.js

### Implementation for User Story 3

- [X] T042 [US3] Implement per-program DFS cycle detection utility and cycle edge collection in backend/src/modules/curriculum/cycle.detector.js
- [X] T043 [US3] Integrate post-seed graph scan and unresolved prerequisite audit in backend/src/modules/curriculum/seed.pipeline.js
- [X] T044 [US3] Emit `CYCLE_CLEAN` / `CYCLE_DETECTED` events and enforce final `FAILED` when cycles found in backend/src/modules/curriculum/seed.logger.js

**Checkpoint**: User Story 3 is independently functional and testable.

---

## Phase 6: User Story 4 - Manual Trigger on Dev Environment (Priority: P2)

**Goal**: Provide dev-only manual execution with identical behavior to scheduled cron execution.

**Independent Test**: Execute manual trigger under development and production-mocked environments, verify dev path runs full pipeline and production guard rejects execution.

### Tests for User Story 4

- [X] T045 [P] [US4] Add unit tests for `triggerManually()` environment guard and exit-code mapping in backend/tests/unit/curriculum/seed.job.test.js
- [X] T046 [P] [US4] Add unit test for cron registration invoking shared pipeline handler in backend/tests/unit/curriculum/seed.job.test.js
- [X] T047 [P] [US4] Add unit tests for 2-step skills review flow (`skills:export-review` JSON shape + `skills:apply-review` schema validation) in backend/tests/unit/curriculum/skills.review.script.test.js
- [X] T048 [P] [US4] Add unit test ensuring Call-2 does not overwrite `skills` when `enrichmentSource.scrapeType="human-validated"` in backend/tests/unit/curriculum/enrichment.pipeline.test.js

### Implementation for User Story 4

- [X] T049 [US4] Implement `registerCronJob()` and `triggerManually()` using shared pipeline in backend/src/modules/curriculum/seed.job.js
- [X] T050 [US4] Add `seed:ctdt` manual command entrypoint in backend/package.json
- [X] T051 [US4] Wire manual trigger bootstrap script for local execution in backend/src/seed-mock.js
- [X] T052 [US4] Implement `skills:export-review` script to export `ai-inferred` CourseUnit skills into editable JSON in backend/src/modules/curriculum/skills.review.export.js
- [X] T053 [US4] Implement `skills:apply-review` script to apply human-edited JSON and promote `enrichmentSource.scrapeType` to `human-validated` in backend/src/modules/curriculum/skills.review.apply.js
- [X] T054 [US4] Add optimistic apply guard (update only when current source is still `ai-inferred`) and conflict summary reporting in backend/src/modules/curriculum/skills.review.apply.js
- [X] T055 [US4] Update enrichment pipeline to preserve `skills` for `human-validated` records while still updating other enrichment fields in backend/src/modules/curriculum/enrichment.pipeline.js
- [X] T056 [US4] Add npm script entries `skills:export-review` and `skills:apply-review` in backend/package.json

**Checkpoint**: User Story 4 is independently functional and testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final alignment, regression validation, and operational readiness across all stories.

- [ ] T057 [P] Align quickstart examples with Program-centric config, SeedRun change detection, two-phase Gemini flow, and skills review scripts in specs/002-seed-ctdt-dag/quickstart.md
- [ ] T058 [P] Reconcile and finalize log-event taxonomy/examples across contract and data-model docs in specs/002-seed-ctdt-dag/contracts/job-interface.md
- [ ] T059 [P] Reconcile and finalize Seed Log Schema event list in specs/002-seed-ctdt-dag/data-model.md
- [X] T060 Run curriculum unit test suite and fix regressions in backend/tests/unit/curriculum/
- [ ] T061 Validate end-to-end local runbook (manual trigger + logs + statuses + snapshots + skills review apply) and capture outcomes in specs/002-seed-ctdt-dag/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 completion; blocks all user stories.
- **Phase 3–6 (User Stories)**: Depend on Phase 2.
- **Phase 7 (Polish)**: Depends on all selected user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Foundational; no dependency on other stories.
- **US2 (P1)**: Starts after US1 pipeline baseline is in place (depends on T026–T032).
- **US3 (P1)**: Starts after US1 persistence baseline is in place (depends on T026–T032).
- **US4 (P2)**: Starts after core pipeline stabilizes (US1 required; US2/US3 recommended before final sign-off).

### Dependency Graph (Story Completion Order)

- Foundation → US1 → {US2, US3} → US4 → Polish

---

## Parallel Execution Examples

### User Story 1

- Run in parallel: T022, T023, T024, T025 (separate test files/concerns)

### User Story 2

- Run in parallel: T033, T034, T035 (independent failure-path tests)

### User Story 3

- Run in parallel: T039, T040, T041 (detector + pipeline assertions)

### User Story 4

- Run in parallel: T045, T046, T047, T048

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1).
3. Validate US1 independently via unit tests and manual run.
4. Demo/deploy MVP with reliable seed success path.

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
- This file is intentionally execution-ready for LLM agents with minimal ambiguity.
