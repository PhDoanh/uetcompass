# Tasks: AI-Powered Personalised Roadmap Generator

**Input**: Design documents from `/specs/009-roadmap-generator/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Jest unit tests are mandatory for this feature per plan.md (Constitution Principle V). Test files are created before their corresponding implementation files within each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1, US2, US3, US4)
- Every task includes an exact file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create module directory scaffold per plan.md project structure.

- [x] T001 Create roadmap module directory structure: `backend/src/modules/roadmap/` and `backend/tests/unit/roadmap/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data model, validation engine, preview store, and persistence service that ALL user stories depend on.

**⚠️ CRITICAL**: No user story implementation starts until this phase is complete.

- [x] T002 Implement Roadmap Mongoose schema with nodes embedded array, partial unique index `{ userId: 1, isPrimary: 1 } (isPrimary:true)`, and list/detail indexes `{ userId: 1, status: 1, updatedAt: -1 }` and `{ userId: 1, _id: 1 }` in `backend/src/modules/roadmap/roadmap.model.js`
- [x] T003 [P] Implement in-memory RoadmapPreview store (`Map<userId, PreviewPayload>`) with `setPendingPreview`, `getPendingPreview`, `clearPendingPreview` helpers and SIGTERM handler that calls `upsertFailed` for all pending entries then clears the map in `backend/src/modules/roadmap/roadmap.preview.store.js`
- [x] T004 [P] Implement topological validation service: DFS 3-colour cycle detection on the CourseUnit DAG and validation that the AI's returned node sequence is a valid topological order (any violation throws descriptive error per NFR-001, NFR-005); a prerequisite is skipped in ordering validation ONLY IF its courseCode appears in the student's `completedCourses` — a prerequisite absent from both the selected nodes and `completedCourses` MUST throw `PREREQUISITE_VIOLATION`, not be silently skipped in `backend/src/modules/roadmap/roadmapValidation.service.js`
- [x] T005 Implement roadmap persistence service: `getPrimaryByUser(userId)`, `listByUser(userId, { status, page, limit })`, `getByIdForUser(roadmapId, userId)`, `upsertFailed(userId, errorMessage)`, `upsertFailedWithProfile(userId, studentProfileId, errorMessage, personalisationLevel)` — `personalisationLevel` MUST be stored on the created failed document per FR-020 (applies to all Roadmap documents, not only accepted ones); default to `'full'` only as a last-resort fallback when the value cannot be derived; `commitAccepted(userId, roadmapDoc)`, `switchPrimary(roadmapId, userId)` in `backend/src/modules/roadmap/roadmap.service.js`

**Checkpoint**: Foundation complete — all user story phases can now proceed.

---

## Phase 3: User Story 1 — Generate Personalised Roadmap from Full Profile (Priority: P1) 🎯 MVP

**Goal**: A student with a complete profile (major + careerGoal + optional fields) triggers asynchronous generation; the system calls Gemini with `responseSchema`, validates topological order, saves a preview, sends a success notification, and exposes accept/reject + canonical read APIs so the roadmap becomes the student's primary after explicit acceptance.

**Independent Test**: Trigger generation with a complete StudentProfile (all fields filled) → call `POST /api/roadmaps/accept` with the returned nodes payload → verify the committed Roadmap document has `status: 'completed'`, `isPrimary: true`, `personalisationLevel: 'full'`, every node has non-empty `gainedSkills`, `supportingSkills`, `reason`, `careerRelevanceNote`, and `resources: []`, and the node sequence satisfies all prerequisite constraints.

### Tests for User Story 1

- [x] T006 [P] [US1] Write unit tests for `generation.service.js`: Gemini output is parsed correctly via `responseSchema`, `resources: []` is appended to each parsed node, topological validation is invoked after AI response, concurrency guard (`Set<userId>`) prevents duplicate concurrent generation for same user, generation lifecycle calls `upsertFailed` + dispatches error notification on Gemini failure; **[M4]** SIGTERM handler iterates all pending preview entries → calls `upsertFailed` for each → clears the Map (side-effect test); **[M5/NFR-002]** after simulating Gemini failure, StudentProfile document is NOT mutated (isolation test); **[L4/Edge]** Gemini returns empty `[]` nodes → `upsertFailed` is NOT called and preview is stored with empty array; **[Gap-2]** when Gemini omits a required prerequisite course that is not in `completedCourses`, `validateTopologicalOrder` throws `PREREQUISITE_VIOLATION` and `upsertFailedWithProfile` is called; **[Gap-5]** `retryGeneration` returns 404 `ROADMAP_NOT_FOUND` when the `studentProfileId` on the failed roadmap no longer resolves to an existing `StudentProfile` in `backend/tests/unit/roadmap/generation.service.test.js`
- [x] T007 [P] [US1] Write unit tests for `roadmapAcceptance.service.js`: completed-course filter removes nodes matching `completedCourseIds`, prerequisite validation detects ordering violations and throws `PREREQUISITE_VIOLATION`, all-completed scenario throws `ALL_COMPLETED`, happy-path calls `roadmap.service.commitAccepted` with correct payload; **[Gap-1]** controller rejects with `400 INVALID_PAYLOAD` when `nodes` is null, missing, or not an array in `backend/tests/unit/roadmap/roadmapAcceptance.service.test.js`
- [x] T008 [P] [US1] Write unit tests for `roadmap.service.js`: `getPrimaryByUser` returns the document with `isPrimary: true`, `listByUser` supports `status` filter and pagination, `getByIdForUser` scopes by `userId`, `commitAccepted` creates a new document with `status: 'completed'` and assigns `isPrimary` per policy; **[Gap-3]** `upsertFailedWithProfile` stores the passed `personalisationLevel` (not always `'full'`) on the created failed document in `backend/tests/unit/roadmap/roadmap.service.test.js`
- [x] T009 [P] [US1] Write unit tests for primary-switch invariant: `switchPrimary` demotes the previous primary and promotes the target atomically, `roadmapPrimary.service` enforces exactly-one-primary-per-user after switch, `ROADMAP_NOT_FOUND` returned for unknown roadmapId, `CONFLICT` returned on concurrent switch in `backend/tests/unit/roadmap/roadmapPrimary.service.test.js`

### Implementation for User Story 1

- [x] T010 [US1] Implement `generation.service.js`: module-level `Set<string>` concurrency guard, `runGeneration(userId, studentProfileId, triggerReason)` orchestrator that fetches StudentProfile + CourseUnit DAG, calls `callGemini(profile, courseUnits)` with `responseSchema` per R-001, invokes `validateTopologicalOrder` from `roadmapValidation.service.js`, saves preview to `roadmap.preview.store.js`, dispatches success in-app notification via `notification.service.js` in `backend/src/modules/roadmap/generation.service.js`
- [x] T011 [US1] Implement `roadmapAcceptance.service.js`: `acceptRoadmap(userId, { studentProfileId, personalisationLevel, isPrimary, nodes })` runs the three-step acceptance pipeline — (1) fetch StudentProfile and filter nodes listed in `completedCourseIds`, (2) validate prerequisite order, (3) call `roadmap.service.commitAccepted` — returns committed document; exports domain error codes per FR-041 in `backend/src/modules/roadmap/roadmapAcceptance.service.js`
- [x] T012 [US1] Implement `roadmap.controller.js`: thin handlers delegating to services — `getPrimaryRoadmap`, `listRoadmaps`, `getRoadmapById`, `acceptRoadmap`, `switchPrimary` — map service-layer domain errors to HTTP codes (`ROADMAP_NOT_FOUND` → 404, `CONFLICT` → 409, `ALL_COMPLETED` / `PREREQUISITE_VIOLATION` → 422, `INVALID_PAYLOAD` → 400) per contracts/rest-api.md; in `acceptRoadmapHandler`, validate request body before calling `acceptRoadmap`: assert `nodes` is a non-null Array, `studentProfileId` is a non-empty string, and `personalisationLevel` is `'full'` or `'low'` — return `400 INVALID_PAYLOAD` immediately if any assertion fails in `backend/src/modules/roadmap/roadmap.controller.js`
- [x] T013 [US1] Implement `roadmap.routes.js`: mount `GET /api/primary-roadmap`, `GET /api/roadmaps`, `GET /api/roadmaps/:roadmapId`, `POST /api/roadmaps/accept`, `PATCH /api/roadmaps/:roadmapId/primary` — all behind `auth.middleware.js` per contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.routes.js`
- [x] T014 [US1] Mount roadmap routes in `backend/src/app.js` and register profile-submission event listener that calls `generation.service.runGeneration(userId, studentProfileId, 'profile_submission')` in `backend/src/app.js`

**Checkpoint**: User Story 1 fully functional — student can trigger generation via profile submission, see notification, accept via API, and fetch their primary roadmap.

---

## Phase 4: User Story 2 — Generate Generic Roadmap from Minimal Profile (Priority: P2)

**Goal**: A student who submits only their major (no career goal) receives a roadmap covering all required courses in valid prerequisite order, with `personalisationLevel: 'low'` and generic `supportingSkills` per node; the success notification includes an indication that personalisation quality is limited.

**Independent Test**: Trigger generation with a StudentProfile containing only `major` (all career goal fields empty/absent) → accept the returned preview → verify committed Roadmap has `personalisationLevel: 'low'`, all required courses for that major in valid topo order, each node has non-empty `gainedSkills` and generic `supportingSkills` (not role-targeted), and the success notification payload indicates limited personalisation.

- [x] T015 [US2] Extend `generation.service.js` to detect absent career goal (`careerGoal.role` and `careerGoal.companyType` both empty/null), derive `personalisationLevel: 'low'`, adjust the AI prompt to instruct generic required-course-only selection with universally applicable `supportingSkills`, and include low-personalisation indicator in the success notification payload (FR-018–FR-021, FR-026) in `backend/src/modules/roadmap/generation.service.js`

**Checkpoint**: Students with minimal profiles always receive a roadmap — no student is blocked by missing optional fields.

---

## Phase 5: User Story 3 — Retry Roadmap Generation After Failure (Priority: P3)

**Goal**: When generation fails (AI error, timeout, malformed output, or SIGTERM mid-preview), the system stores `status: 'failed'` on the Roadmap document, sends a retryable error notification, and exposes `POST /api/roadmap/retry` so the student can re-run generation without resubmitting their profile.

**Independent Test**: Simulate a Gemini error during generation → verify a Roadmap document with `status: 'failed'` and the error message is stored, the student receives an error notification with `retryable: true` in its payload, and calling `POST /api/roadmap/retry` re-reads the existing StudentProfile, runs the full generation lifecycle, and on success produces a `status: 'completed'` Roadmap that replaces the failed state.

- [x] T016 [US3] Extend `generation.service.js` failure path: catch errors from Gemini call or validation, call `roadmap.service.upsertFailedWithProfile(userId, studentProfileId, errorMessage, personalisationLevel)` using the `personalisationLevel` already derived from the profile before the Gemini call (available in scope) — ensures failed documents carry the correct level per FR-020; dispatch error in-app notification with `retryable: true` flag and retry endpoint reference (FR-027, FR-028), clear concurrency guard entry in `backend/src/modules/roadmap/generation.service.js`
- [x] T017 [US3] Add `retryGeneration` handler to `roadmap.controller.js` (verify `status: 'failed'` roadmap exists — return 409 `CONFLICT` if not present; verify no generation in progress — return 409 `CONFLICT` if active; verify the `studentProfileId` stored on the failed roadmap still resolves to an existing `StudentProfile` via `StudentProfile.exists({ _id: studentProfileId })` — return 404 `ROADMAP_NOT_FOUND` if the profile no longer exists, preventing a silent double-failure notification; launch `generation.service.runGeneration(userId, studentProfileId, 'retry')`, return 202 Accepted) and add `POST /api/roadmap/retry` route to `roadmap.routes.js` (FR-029, FR-030) per contracts/rest-api.md in `backend/src/modules/roadmap/roadmap.controller.js` and `backend/src/modules/roadmap/roadmap.routes.js`

**Checkpoint**: Failure recovery path fully operational — students can retry without profile resubmission.

---

## Phase 6: User Story 4 — Re-generate Roadmap on Career Goal Update (Priority: P3)

**Goal**: When `repersonalizationPending` is `true` on a StudentProfile (set by Feature 005 after a career goal update), the system runs re-generation using the existing accepted roadmap as additional AI context alongside the updated profile; on acceptance or rejection, `repersonalizationPending` is cleared regardless of outcome; the previous roadmap remains active until the student explicitly accepts the new preview.

**Independent Test**: Set `repersonalizationPending: true` and update `careerGoal` on a StudentProfile that has an existing `status: 'completed'` roadmap → trigger re-generation → verify the Gemini prompt receives the existing roadmap's nodes as base context → accept the new preview → verify the new roadmap is committed as primary, the previous roadmap still exists in history, and `repersonalizationPending` is `false` on the StudentProfile. Separately: reject the preview → verify previous roadmap is unchanged, `repersonalizationPending` is `false`, and no new committed document was created.

- [x] T018 [US4] Extend `generation.service.js` to handle `triggerReason: 'repersonalization'`: fetch the student's existing primary (accepted) roadmap if one exists and pass it as `existingRoadmap` to `callGemini` per R-001 re-generation pattern; if no accepted roadmap exists, proceed as fresh initial generation (FR-039) in `backend/src/modules/roadmap/generation.service.js`
- [x] T019 [US4] Extend `roadmapAcceptance.service.js` to clear `repersonalizationPending` flag on StudentProfile via `findOneAndUpdate({ userId }, { $set: { repersonalizationPending: false } })` after acceptance commit (FR-031); also add `rejectRoadmap(userId)` to `roadmap.controller.js` that discards the in-memory preview, clears `repersonalizationPending`, and returns 200 — no dedicated REST endpoint needed (rejection is a frontend-driven local discard with profile flag clear via internal service call); if a REST surface is required later, add `POST /api/roadmaps/reject` to contracts/rest-api.md first in `backend/src/modules/roadmap/roadmapAcceptance.service.js` and `backend/src/modules/roadmap/roadmap.controller.js`
- [x] T020 [US4] Register `repersonalizationPending` event listener in `backend/src/app.js` that fires when Feature 005 sets the flag on a StudentProfile, invoking `generation.service.runGeneration(userId, studentProfileId, 'repersonalization')` — debounce if initial generation is still in progress for the same user (FR-002, FR-004) in `backend/src/app.js`

**Checkpoint**: Career goal updates trigger roadmap re-generation and the previous roadmap remains active until the student accepts the new preview.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Compatibility alias, validation, and final integration check.

- [x] T021 [P] Add deprecated `GET /api/roadmap` compatibility alias pointing to `GET /api/primary-roadmap` handler with a `Deprecation` response header — document as deprecated per FR-033c in `backend/src/modules/roadmap/roadmap.routes.js`
- [x] T022 Run all quickstart.md manual test scenarios locally, confirm roadmap generation, acceptance, retry, primary switch, and re-generation flows each produce correct results end-to-end in `specs/009-roadmap-generator/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — MVP delivery
- **US2 (Phase 4)**: Depends on Phase 2; extends Phase 3 files — start after T010 (generation.service.js created)
- **US3 (Phase 5)**: Depends on Phase 2; extends Phase 3 files — start after T010 and T014 (generation.service.js complete)
- **US4 (Phase 6)**: Depends on Phase 2; extends Phase 3 and Phase 5 files — start after T010, T014, T016
- **Polish (Phase 7)**: Depends on all user story phases

### User Story Dependencies

| Story | Depends on | Notes |
|---|---|---|
| US1 (P1) | Phase 2 complete | Core; all others build on its files |
| US2 (P2) | Phase 2 complete + T010 created | Extends generation.service.js |
| US3 (P3) | Phase 2 complete + T010 created | Extends generation.service.js + routes |
| US4 (P3) | Phase 2 + T010 + T016 complete | Extends generation.service.js + acceptance service |

### Within User Story 1

- Tests T006–T009 can run in parallel (different files)
- T010 (generation.service.js) can start in parallel with T011 (acceptance) and T012 (controller) after tests are written
- T013 (routes) requires T012 (controller) complete
- T014 (app.js mount) requires T013 (routes) complete

### Parallel Opportunities

```bash
# Phase 2 — these three run in parallel after T002:
Task T003: roadmap.preview.store.js
Task T004: roadmapValidation.service.js
# T005 (roadmap.service.js) depends on T002 (model)

# Phase 3 tests — all four run in parallel:
Task T006: generation.service.test.js
Task T007: roadmapAcceptance.service.test.js
Task T008: roadmap.service.test.js
Task T009: roadmapPrimary.service.test.js

# Phase 3 implementation — these run in parallel:
Task T010: generation.service.js
Task T011: roadmapAcceptance.service.js
Task T012: roadmap.controller.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (T006–T014)
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
| Phase 2: Foundational | T002–T005 | — | Model, preview store, topo validator, persistence service |
| Phase 3: US1 (P1) | T006–T014 | US1 | 4 test files + 5 implementation files + app.js mount |
| Phase 4: US2 (P2) | T015 | US2 | Low-personalisation branch in generation.service.js |
| Phase 5: US3 (P3) | T016–T017 | US3 | Failure handling + retry endpoint |
| Phase 6: US4 (P3) | T018–T020 | US4 | Re-generation with base context + flag clearing |
| Phase 7: Polish | T021–T022 | — | Compatibility alias + quickstart validation |
| **Total** | **22 tasks** | | |

**Parallel opportunities**: 7 tasks marked `[P]` — tests in Phase 3 all parallelisable; T003/T004 in Phase 2 parallelisable; T010/T011/T012 in Phase 3 parallelisable after tests are written.

**Suggested MVP scope**: Phases 1–3 (T001–T014) — delivers the complete US1 happy path with all mandatory unit tests.
