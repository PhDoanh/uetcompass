# Tasks: AI-Powered Personalised Roadmap Generator

**Feature**: `009-automated-roadmap-generator`
**Branch**: `009-automated-roadmap-generator`
**Input**: Design documents from `specs/009-automated-roadmap-generator/` (spec.md, plan.md, data-model.md, research.md, contracts/rest-api.md, quickstart.md)

**Tests**: Jest unit tests are mandatory for this feature per plan.md (Constitution Principle V). Test files are created before their corresponding implementation files within each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create module directory scaffold per plan.md project structure.

- [ ] T001 Create roadmap module directory structure: `backend/src/modules/roadmap/` and `backend/tests/unit/roadmap/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model, validation engine, preview store, and persistence service that ALL user stories depend on.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [ ] T002 Implement Roadmap Mongoose schema with embedded `RoadmapNode[]` array (node fields: `nodeId`, `nodeType` enum `topic|subtopic`, `skillName`, `parentNodeId`, `relatedCourses[]` with `{ courseCode, courseName, credits }`, `reason`, `resources[]`); top-level Roadmap fields: `userId`, `isPrimary`, `studentProfileId`, `personalisationLevel` enum `full|low`, `nodes`, `acceptedAt` (null on failed documents — sole acceptance indicator; NO `status` field, NO `errorMessage` field), `createdAt`, `updatedAt`; add three indexes: partial unique `{ userId: 1, isPrimary: 1 }` filtered by `{ isPrimary: true }` (name: `primary_per_user_unique`), list index `{ userId: 1, acceptedAt: 1, updatedAt: -1 }` (name: `roadmap_list_by_user_acceptedAt_updatedAt`), detail index `{ userId: 1, _id: 1 }` (name: `roadmap_detail_by_user_id`) per data-model.md in `backend/src/modules/roadmap/roadmap.model.js`
- [ ] T003 [P] Implement in-memory RoadmapPreview store (`Map<userId, PreviewPayload>`) exporting `storePendingPreview`, `getPendingPreview`, `clearPendingPreview`, `getAllPendingUserIds`; register a SIGTERM handler that iterates `getAllPendingUserIds()` → reads each preview via `getPendingPreview(userId)` → calls `upsertFailedWithProfile(userId, preview.studentProfileId, 'Worker restart', preview.personalisationLevel)` → notifies student → clears the map → calls `process.exit(0)` per R-004 in `backend/src/modules/roadmap/roadmap.preview.store.js`
- [ ] T004 [P] Implement topological validation service: DFS 3-colour cycle detection on the CourseUnit DAG and validation that the assembled node sequence is a valid topological order (any violation throws a descriptive error per NFR-001, NFR-005); a prerequisite is skipped in ordering validation ONLY IF its courseCode appears in the student's `completedCourses` — a prerequisite absent from both selected nodes and `completedCourses` MUST throw `PREREQUISITE_VIOLATION` in `backend/src/modules/roadmap/roadmapValidation.service.js`
- [ ] T005 Implement roadmap persistence service: `getPrimaryByUser(userId)` (returns document where `isPrimary: true`), `listByUser(userId, { page, limit })` (no status filter — uses `{ userId: 1, acceptedAt: 1, updatedAt: -1 }` index), `getByIdForUser(roadmapId, userId)`, `upsertFailed(userId, message)` (creates/updates document without `acceptedAt`; `message` is used for logging only and MUST NOT be stored on the document per 2026-04-08 decision), `upsertFailedWithProfile(userId, studentProfileId, message, personalisationLevel)` (same rules plus stores `studentProfileId` and `personalisationLevel`), `commitAccepted(userId, roadmapDoc)` (sets `acceptedAt` to current timestamp), `switchPrimary(roadmapId, userId)` in `backend/src/modules/roadmap/roadmap.service.js`
- [ ] T024 [P] Implement RoadmapProgress Mongoose schema: fields `userId` (ObjectId, ref `users`), `roadmapId` (ObjectId, ref `roadmaps`), `pending: [String]` (default `[]`), `inProgress: [String]` (default `[]`), `completed: [String]` (default `[]`), `skip: [String]` (default `[]`), `updatedAt` (Date, auto); add unique index `{ userId: 1, roadmapId: 1 }` (name: `progress_per_user_roadmap`) per data-model.md in `backend/src/modules/roadmap/roadmapProgress.model.js`
- [ ] T025 [P] Write unit tests for `roadmapProgress.service.js`: `createProgress` seeds `pending` with all passed `nodeIds` and leaves other arrays empty; `getProgress` returns the document scoped to `userId + roadmapId`; `updateNodeState` atomically pulls from the source state array and pushes to the target state array — passes for all valid transitions (`pending→inProgress`, `pending→skip`, `inProgress→completed`); `updateNodeState` throws `INVALID_TRANSITION` when `nodeId` is not found in the declared `fromState` array (enforces exactly-one-array invariant) per FR-042, FR-043 in `backend/tests/unit/roadmap/roadmapProgress.service.test.js`
- [ ] T026 Implement `roadmapProgress.service.js`: export `createProgress(userId, roadmapId, nodeIds)` (inserts a new document with `pending = nodeIds`, all other arrays `[]`; retry once on transient write error per FR-042); `getProgress(userId, roadmapId)` (returns document or null); `updateNodeState(userId, roadmapId, nodeId, fromState, toState)` (uses `findOneAndUpdate` with `$pull` from `fromState` array and `$push` to `toState` array in a single atomic operation — `fromState` and `toState` must each be one of `pending | inProgress | completed | skip`; throws `INVALID_TRANSITION` if `nodeId` not found in `fromState`) per FR-042, FR-043, data-model.md in `backend/src/modules/roadmap/roadmapProgress.service.js`

**Checkpoint**: Foundation complete — all user story phases can now proceed.

---

## Phase 3: User Story 1 — Generate Personalised Roadmap from Full Profile (Priority: P1) 🎯 MVP

**Goal**: A student with a complete profile (major + careerGoal + optional fields) triggers asynchronous generation; the system runs the full pipeline (template matching → off-template AI evaluation → topological validation), saves a preview, sends a `roadmap_preview_ready` SSE notification via `notification.service.js`, and exposes `POST /api/roadmaps/primary/accept` (payload-based, fork-consumable) plus canonical read APIs so the roadmap becomes the student's primary after explicit acceptance.

**Independent Test**: Call `triggerGeneration` with a complete StudentProfile (all fields filled) → call `POST /api/roadmaps/primary/accept` with the returned nodes payload → verify the committed Roadmap document has `acceptedAt` set, `isPrimary: true`, `personalisationLevel: 'full'`, every node has non-empty `skillName`, non-empty `reason`, non-empty `relatedCourses[]`, and `resources: []`, and the node sequence satisfies all prerequisite constraints with no violations.

### Tests for User Story 1

- [ ] T006 [P] [US1] Write unit tests for `generation.service.js`: `triggerGeneration` fires-and-forgets (returns without awaiting lifecycle), concurrency guard (`Set<userId>`) prevents duplicate concurrent generation for the same user, `evaluateOffTemplateSkills` returns `{ skillName, reason }[]` via `responseSchema` and is skipped entirely when no `careerGoal`, all resulting nodes carry `resources: []` (template-matched nodes inherit from the template, defaulting to `[]` if absent or null; off-template nodes always receive `[]`), `validateTopologicalOrder` is invoked after node assembly, generation success calls `storePendingPreview` and dispatches `roadmap_preview_ready` notification via `notification.service.js`, generation failure calls `upsertFailedWithProfile(userId, studentProfileId, message, personalisationLevel)` and dispatches `roadmap_generation_failed` notification with `retryable: true`, SIGTERM handler iterates all pending preview entries → reads each preview via `getPendingPreview(userId)` → calls `upsertFailedWithProfile(userId, preview.studentProfileId, message, preview.personalisationLevel)` for each → clears the Map, and after simulating a failure the StudentProfile document is NOT mutated (isolation per NFR-002), template-matched nodes inherit `reason` from `TemplateNode.reason` (and `resources` from `TemplateNode.resources` when present) without a separate AI call (FR-015) in `backend/tests/unit/roadmap/generation.service.test.js`
- [ ] T007 [P] [US1] Write unit tests for `roadmapAcceptance.service.js`: `acceptRoadmapPayload` filters nodes whose `relatedCourses` all appear in `completedCourseIds`, prerequisite validation detects ordering violations and throws `PREREQUISITE_VIOLATION`, all-completed scenario throws `ALL_COMPLETED`, happy path calls `roadmap.service.commitAccepted` with correct payload and `roadmapProgress.service.createProgress` with all accepted nodeIds (FR-042), and controller returns `400 INVALID_PAYLOAD` when `nodes` is null, missing, or not an array in `backend/tests/unit/roadmap/roadmapAcceptance.service.test.js`
- [ ] T008 [P] [US1] Write unit tests for `roadmap.service.js`: `getPrimaryByUser` returns the document where `isPrimary: true`, `listByUser` supports pagination and does NOT accept a `status` parameter, `getByIdForUser` scopes by `userId`, `commitAccepted` creates a new document with `acceptedAt` set (not a `status` field) and assigns `isPrimary` per policy, `upsertFailed` creates a document WITHOUT `acceptedAt` set, `upsertFailedWithProfile` stores the passed `personalisationLevel` (not always `'full'`) and does NOT set `acceptedAt`, and `commitAccepted` on retry fully replaces any existing failed document rather than merging or appending to it (NFR-003) in `backend/tests/unit/roadmap/roadmap.service.test.js`
- [ ] T009 [P] [US1] Write unit tests for `roadmapPrimary.service.js`: `switchPrimary` demotes the previous primary (`isPrimary: false`) and promotes the target (`isPrimary: true`) atomically, enforces exactly-one-primary-per-user invariant after switch, returns `ROADMAP_NOT_FOUND` for unknown roadmapId, and returns `CONFLICT` on concurrent switch attempt in `backend/tests/unit/roadmap/roadmapPrimary.service.test.js`

### Implementation for User Story 1

- [ ] T010 [US1] Implement `generation.service.js`: export `triggerGeneration(userId, studentProfileId, triggerReason)` (fire-and-forget; adds userId to module-level `Set<string>` concurrency guard before starting); internal `runGenerationLifecycle` pipeline in order: `loadStudentProfile` → `loadProgram(profile.major)` (resolves `nameEN` → `programId`) → `loadCourseUnitDAG(program._id)` (`find({ programId })`) → `loadRoadmapTemplate(profile.careerGoal?.role ?? null)` (matches by `careerTrack` only; falls back to `{ careerTrack: null }` generic template if no match or role absent) → `buildSkillCoursesMap` (Map<skillName, CourseUnit[]> over non-completed courses) → `matchSkillsToTemplate` (template-matched nodes inherit `nodeId`, `nodeType`, `parentNodeId`, `reason`, and `resources` from template per FR-015) → `evaluateOffTemplateSkills` (AI call via `responseSchema` returning `{ skillName, reason }[]` per R-001; skipped if no `careerGoal`) → `mapOffTemplateSkills` (assigns `nodeType: subtopic`, finds parent topic node by max `relatedCourses` course-code overlap per FR-009; excludes if no overlap) → `validateTopologicalOrder` → `storePendingPreview` → dispatch `roadmap_preview_ready` via `notification.service.js`; `finally` block deletes userId from concurrency `Set` in `backend/src/modules/roadmap/generation.service.js`
- [ ] T011 [US1] Implement `roadmapAcceptance.service.js`: export `acceptRoadmapPayload(userId, payload)` — fork-consumable four-step pipeline receiving full `{ studentProfileId, personalisationLevel, isPrimary, nodes[] }` payload: (1) fetch StudentProfile and filter nodes whose `relatedCourses` are entirely in `completedCourseIds`, throw `ALL_COMPLETED` if none remain; (2) call `roadmapValidation.service.validateTopologicalOrder`, throw `PREREQUISITE_VIOLATION` on failure; (3) call `roadmap.service.commitAccepted` to persist the Roadmap document; (4) call `roadmapProgress.service.createProgress(userId, roadmap._id, nodes.map(n => n.nodeId))` to seed the progress document with all nodeIds in `pending` (FR-042, retry once on transient failure); normalize all throws to domain error codes `ALL_COMPLETED`, `PREREQUISITE_VIOLATION`, `CONFLICT` per FR-041 in `backend/src/modules/roadmap/roadmapAcceptance.service.js`
- [ ] T012 [US1] Implement `roadmapPrimary.service.js`: export `switchPrimary(roadmapId, userId)` that uses a MongoDB session to atomically demote the current primary (`isPrimary: false`) then promote the target (`isPrimary: true`), enforcing the one-primary-per-user invariant backed by the `primary_per_user_unique` partial index; throw `ROADMAP_NOT_FOUND` if roadmap does not belong to userId, throw `CONFLICT` on write conflict in `backend/src/modules/roadmap/roadmapPrimary.service.js`
- [ ] T013 [US1] Implement `roadmap.controller.js`: thin handlers delegating to services — `getPrimaryRoadmap`, `getRoadmapById`, `acceptRoadmap` (validate body: `nodes` is non-null Array, `studentProfileId` non-empty string, `personalisationLevel` is `'full'` or `'low'` — return `400 INVALID_PAYLOAD` immediately on failure; then call `acceptRoadmapPayload`), `switchPrimary`, `retryGeneration` (placeholder, wired in US3); map domain errors to HTTP: `ROADMAP_NOT_FOUND` → 404, `CONFLICT` → 409, `ALL_COMPLETED`/`PREREQUISITE_VIOLATION` → 422, `INVALID_PAYLOAD` → 400 per contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T014 [US1] Implement `roadmap.routes.js`: mount `GET /api/roadmaps/primary`, `GET /api/roadmaps/:roadmapId`, `POST /api/roadmaps/primary/accept`, `POST /api/roadmaps/primary/reject`, `PATCH /api/roadmaps/:roadmapId/primary` — all behind `auth.middleware.js` per contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.routes.js`
- [ ] T015 [US1] Mount roadmap routes in `backend/src/app.js` and register profile-submission event listener that calls `generation.service.triggerGeneration(userId, studentProfileId, 'profile_submission')` in `backend/src/app.js`

**Checkpoint**: User Story 1 fully functional — student can trigger generation via profile submission, receive `roadmap_preview_ready` SSE notification, accept via `POST /api/roadmaps/primary/accept`, and fetch their primary roadmap.

---

## Phase 4: User Story 2 — Generate Generic Roadmap from Minimal Profile (Priority: P2)

**Goal**: A student who submits only their major (no career goal) receives a roadmap covering all required courses in valid prerequisite order, with `personalisationLevel: 'low'`; the `evaluateOffTemplateSkills` AI call is skipped entirely (no career goal to evaluate against); the `roadmap_preview_ready` notification includes `lowPersonalisationNotice`.

**Independent Test**: Call `triggerGeneration` with a StudentProfile containing only `major` (all career goal fields empty/absent) → accept the returned preview → verify committed Roadmap has `personalisationLevel: 'low'`, nodes derived from required courses for that major in valid topological order, every node has non-empty `skillName` and `resources: []`, and the success notification payload includes a non-null `lowPersonalisationNotice`.

- [ ] T016 [US2] Extend `generation.service.js` to detect absent career goal (`careerGoal.role` and `careerGoal.companyType` both empty/null), derive `personalisationLevel: 'low'`, skip the `evaluateOffTemplateSkills` AI call (all off-template skills excluded per FR-019 — no AI call made), and include a `lowPersonalisationNotice` string in the `roadmap_preview_ready` notification payload (FR-018–FR-021, FR-026) in `backend/src/modules/roadmap/generation.service.js`

**Checkpoint**: Students with minimal profiles always receive a roadmap — no student is blocked by missing optional fields.

---

## Phase 5: User Story 3 — Retry Roadmap Generation After Failure (Priority: P3)

**Goal**: When generation fails (AI error, timeout, malformed output, or SIGTERM mid-preview), the system stores a Roadmap document without `acceptedAt` (marking it failed/retryable), sends a `roadmap_generation_failed` SSE notification with `retryable: true`, and exposes `POST /api/roadmaps/primary/regenerate` so the student can re-run generation without resubmitting their profile.

**Independent Test**: Simulate a Gemini error → verify a Roadmap document without `acceptedAt` is stored (no `errorMessage` field on the document per 2026-04-08 decision), the student receives a `roadmap_generation_failed` notification with `retryable: true` and `retryEndpoint: 'POST /api/roadmaps/primary/regenerate'`, and calling `POST /api/roadmaps/primary/regenerate` re-reads the existing StudentProfile, runs the full generation lifecycle, and on success produces a Roadmap document with `acceptedAt` set after acceptance.

- [ ] T017 [US3] Extend `generation.service.js` failure path: catch errors from any lifecycle step, call `roadmap.service.upsertFailedWithProfile(userId, studentProfileId, error.message, personalisationLevel)` using the `personalisationLevel` already derived from the profile before the AI call (available in closure scope — ensures failed documents carry the correct level per FR-020; `error.message` used for logging only, NOT stored on document); dispatch `roadmap_generation_failed` notification with `retryable: true` and `retryEndpoint: 'POST /api/roadmaps/primary/regenerate'` via `notification.service.js` (FR-027, FR-028); concurrency guard entry cleared in `finally` in `backend/src/modules/roadmap/generation.service.js`
- [ ] T018 [US3] Add `retryGeneration` handler to `roadmap.controller.js`: verify a Roadmap without `acceptedAt` exists for the user — return `409 CONFLICT` if none found; verify no generation currently in progress for user — return `409 CONFLICT` if active; verify the `studentProfileId` on the failed Roadmap still resolves to an existing `StudentProfile` via `StudentProfile.exists()` — return `404 ROADMAP_NOT_FOUND` if not (prevents double-failure notification); launch `generation.service.triggerGeneration(userId, studentProfileId, 'retry')`, return `202 Accepted`; add `POST /api/roadmaps/primary/regenerate` route to `roadmap.routes.js` behind `auth.middleware.js` per contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.controller.js` and `backend/src/modules/roadmap/roadmap.routes.js`

**Checkpoint**: Failure recovery path fully operational — students can retry without profile resubmission.

---

## Phase 6: User Story 4 — Re-generate Roadmap on Career Goal Update (Priority: P3)

**Goal**: When Feature 005 emits a `careerGoalUpdated` event (on career goal update in Account Settings), re-generation runs using the existing accepted Roadmap as additional AI context; the previous roadmap remains active until explicit acceptance.

**Independent Test**: Emit `careerGoalUpdated` event for a StudentProfile with an existing accepted Roadmap → call `triggerGeneration(..., 'repersonalization')` → verify Gemini prompt receives existing roadmap nodes as base context → accept the new preview → verify new Roadmap has `acceptedAt` set and `isPrimary: true`, previous Roadmap document still exists in collection. Separately: reject the new preview → verify previous Roadmap unchanged.

- [ ] T019 [US4] Extend `generation.service.js` to handle `triggerReason: 'repersonalization'`: after loading StudentProfile, additionally call `roadmap.service.getPrimaryByUser(userId)` to fetch the existing accepted Roadmap (where `acceptedAt` is not null); if one exists, pass its `nodes` as `existingRoadmap` context to the Gemini prompt per R-001; if none exists, proceed as a fresh initial generation without `existingRoadmap` (FR-039) in `backend/src/modules/roadmap/generation.service.js`
- [ ] T020 [US4] Extend `roadmapAcceptance.service.js` to export `rejectRoadmap(userId)` that calls `previewStore.clearPendingPreview(userId)` — no dedicated REST endpoint needed; add `rejectRoadmap` handler to `roadmap.controller.js` returning `200 OK` in `backend/src/modules/roadmap/roadmapAcceptance.service.js` and `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T021 [US4] Register `careerGoalUpdated` event listener in `backend/src/app.js` that fires when Feature 005 emits the event after a student updates their career goal in Account Settings, invoking `generation.service.triggerGeneration(userId, studentProfileId, 'repersonalization')` — silently drops if generation is already in progress for the same user (FR-002, FR-004) in `backend/src/app.js`

**Checkpoint**: Career goal updates trigger roadmap re-generation and the previous roadmap remains active until the student accepts the new preview.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Progress API surface (FR-044) and final integration check.

- [ ] T023 Run all quickstart.md manual test scenarios locally: confirm generation, acceptance via `POST /api/roadmaps/primary/accept`, retry via `POST /api/roadmaps/primary/regenerate`, primary switch via `PATCH /api/roadmaps/:roadmapId/primary`, and re-generation flows each produce correct results end-to-end in `specs/009-automated-roadmap-generator/quickstart.md`
- [ ] T027 [P] Add `getProgress` and `updateNodeState` handlers to `roadmap.controller.js`: `getProgress` calls `roadmapProgress.service.getProgress(userId, roadmapId)` — returns 404 `ROADMAP_NOT_FOUND` if null; `updateNodeState` validates body (`nodeId` non-empty string, `fromState`/`toState` each one of `pending|inProgress|completed|skip`) — returns 400 `INVALID_PAYLOAD` on failure; calls `roadmapProgress.service.updateNodeState`, maps `INVALID_TRANSITION` → 422 per FR-043, FR-044, contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.controller.js`
- [ ] T028 [P] Mount `GET /api/roadmaps/:roadmapId/progress` and `PATCH /api/roadmaps/:roadmapId/progress/node` routes behind `auth.middleware.js` per FR-044, contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.routes.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — MVP delivery
- **US2 (Phase 4)**: Depends on Phase 2; extends Phase 3 files — start after T010 (generation.service.js created)
- **US3 (Phase 5)**: Depends on Phase 2; extends Phase 3 files — start after T010 and T015 complete
- **US4 (Phase 6)**: Depends on Phase 2; extends Phase 3 and Phase 5 files — start after T010, T015, T017 complete
- **Polish (Phase 7)**: Depends on all user story phases

### User Story Dependencies

| Story | Depends on | Notes |
|---|---|---|
| US1 (P1) | Phase 2 complete | Core; all others build on its files |
| US2 (P2) | Phase 2 complete + T010 created | Extends generation.service.js |
| US3 (P3) | Phase 2 complete + T010 created | Extends generation.service.js + routes |
| US4 (P3) | Phase 2 + T010 + T017 complete | Extends generation.service.js + acceptance service |

### Within User Story 1

- Tests T006–T009 can run in parallel (different files)
- T010 (generation.service.js), T011 (acceptance), T012 (primary service), T013 (controller) can start in parallel after tests are written
- T014 (routes) requires T013 (controller) complete
- T015 (app.js mount) requires T014 (routes) complete

### Parallel Opportunities

```bash
# Phase 2 — run in parallel after T002:
Task T003: roadmap.preview.store.js
Task T004: roadmapValidation.service.js
Task T024: roadmapProgress.model.js  (parallel with T003/T004)
Task T025: roadmapProgress.service.test.js  (parallel with T003/T004)
# T005 (roadmap.service.js) depends on T002 (model)
# T026 (roadmapProgress.service.js) depends on T024 (model)

# Phase 3 tests — all four run in parallel:
Task T006: generation.service.test.js
Task T007: roadmapAcceptance.service.test.js
Task T008: roadmap.service.test.js
Task T009: roadmapPrimary.service.test.js

# Phase 3 implementation — these run in parallel:
Task T010: generation.service.js
Task T011: roadmapAcceptance.service.js
Task T012: roadmapPrimary.service.js
Task T013: roadmap.controller.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (T006–T015)
4. **STOP and VALIDATE**: Test US1 independently — generation → accept → primary retrieval
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Test independently → Deploy/Demo **(MVP!)**
3. US2 → Test independently → Deploy/Demo (low-personalisation students unblocked)
4. US3 → Test independently → Deploy/Demo (failure recovery ready)
5. US4 → Test independently → Deploy/Demo (career goal update loop closed)

---

## Summary

| Phase | Tasks | Stories | Notes |
|---|---|---|---|
| Phase 1: Setup | T001 | — | Create module dirs |
| Phase 2: Foundational | T002–T005, T024–T026 | — | Model (no status/errorMessage fields), preview store, topo validator, persistence service, progress model + service |
| Phase 3: US1 (P1) | T006–T015 | US1 | 4 test files + 4 impl files + roadmapPrimary service + app.js mount |
| Phase 4: US2 (P2) | T016 | US2 | Low-personalisation branch in generation.service.js (AI call skipped) |
| Phase 5: US3 (P3) | T017–T018 | US3 | Failure handling + retry endpoint |
| Phase 6: US4 (P3) | T019–T021 | US4 | Re-generation with base context via `careerGoalUpdated` event |
| Phase 7: Polish | T023, T027–T028 | — | Quickstart validation + progress API routes |
| **Total** | **27 tasks** | | |

**Parallel opportunities**: 6 tasks marked `[P]` — tests in Phase 3 all parallelisable; T003/T004 in Phase 2 parallelisable; T010/T011/T012/T013 in Phase 3 parallelisable after tests are written.

**Suggested MVP scope**: Phases 1–3 (T001–T015) — delivers the complete US1 happy path with all mandatory unit tests.
