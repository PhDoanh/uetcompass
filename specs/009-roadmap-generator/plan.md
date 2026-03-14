# Implementation Plan: AI-Powered Personalised Roadmap Generator

**Branch**: `009-roadmap-generator` | **Date**: 2026-03-14 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-roadmap-generator/spec.md`

## Summary

Feature 009 is the canonical owner of roadmap lifecycle. Other features can only consume roadmap data through 009 API/service contracts and must not mutate roadmap state directly.

The backend keeps async AI generation (Gemini + topological validation) but upgrades the persistence model to multi-roadmap per user with exactly one primary roadmap:

- add `isPrimary` on roadmap documents,
- enforce one-primary-per-user with partial unique index,
- support timeline/history listing by `userId`, `status`, and `updatedAt`.

Primary retrieval moves from `GET /api/roadmap` to `GET /api/primary-roadmap` (with compatibility note). New list/detail/primary-switch endpoints are introduced under `/api/roadmaps`.

Acceptance is refactored to a fork-consumable flow that receives full roadmap nodes in request payload (no old preview-accept lookup). Required pipeline: filter completed → prerequisite validation → commit.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `@google/generative-ai`
- Notifications: `notification.service.js` + `notification.sse.js`

**Storage**: MongoDB Atlas free tier — `roadmaps` collection (multi documents per user) with partial unique primary index and list-query index; reads `student_profiles` (owned by Feature 001) and `course_units` (owned by Feature 002) via service-layer calls; in-memory preview remains transient for generation review but is not the source of truth for acceptance commit
**Testing**: Jest 29 — unit tests only; `@google/generative-ai`, Mongoose, and `notification.service.js` all mocked via `jest.fn()` / `jest.mock()`
**Target Platform**: Backend → Render (Node.js web service, free tier, single instance); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Generation result delivered asynchronously via SSE — no synchronous response latency requirement for generation itself. `GET /api/primary-roadmap`, `GET /api/roadmaps`, `GET /api/roadmaps/:roadmapId`, and `PATCH /api/roadmaps/:roadmapId/primary` < 300ms p95. Acceptance commit endpoint < 500ms p95 including prerequisite validation.
**Constraints**: No Redis — in-process async only; concurrency guard = module-level `Set<string>` of active `userId` strings; preview held in-memory on worker only (not persisted; lost on restart); no cross-module direct imports — service-layer calls only
**Scale/Scope**: UET-VNU students only; multi-roadmap per user with exactly one primary roadmap; single Render instance; hundreds to low-thousands of concurrent users

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All roadmap logic is isolated in `backend/src/modules/roadmap/`. Feature 009 is the only owner of lifecycle transitions. No direct cross-module imports — reads `student_profiles` and `course_units` via service-layer calls only. Notifications delivered through the existing `notification.service.js` shared module (Feature 005). No microservice split introduced.
- [x] **UET-First**: No generalisation — the implementation is hardcoded for UET's `CourseUnit` DAG structure and `StudentProfile` schema. No abstraction for other universities.
- [x] **Privacy by Minimalism**: No grades, GPA, or transcript data stored. The `roadmaps` collection holds only course codes, AI-generated skill/reason text, and timestamps. No student credentials involved. The `completedCourseIds` used as prerequisite anchors are already stored in Feature 001's `student_profiles` collection — no new personal data is collected by this feature.
- [x] **AI-Assisted, Human-Controlled**: Gemini output is validated at two levels before storage — `responseSchema` enforces structure server-side, and the system performs independent prerequisite/topological checks. Commits happen only through explicit acceptance API.
- [x] **Test What Matters**: Mandatory unit tests for: generation lifecycle, acceptance pipeline (filter completed → prerequisite validation → commit), primary-switch rule (exactly one primary), and roadmap list/detail retrieval. All external deps mocked.

## Project Structure

### Documentation (this feature)

```text
specs/009-roadmap-generator/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 5 technical decisions resolved
├── data-model.md        ← Phase 1: roadmaps schema + RoadmapNode embedded doc
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: all roadmap API contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── roadmap/
│           ├── roadmap.model.js                  # roadmaps Mongoose schema + indexes (partial unique primary)
│           ├── roadmap.service.js                # getPrimaryByUser, listByUser, getByIdForUser, upsertFailed, commitAccepted
│           ├── generation.service.js             # generation lifecycle, Gemini call, topo validation, concurrency guard
│           ├── roadmap.preview.store.js          # in-memory Map<userId, PreviewPayload> + SIGTERM handler
│           ├── roadmapValidation.service.js      # completed-course filter + prerequisite validation
│           ├── roadmapAcceptance.service.js      # fork-consumable acceptance with full nodes payload
│           ├── roadmap.controller.js             # Express handlers (thin — delegate to services)
│           └── roadmap.routes.js                 # /api/primary-roadmap + /api/roadmaps/* routes + auth middleware
└── tests/
    └── unit/
        └── roadmap/
            ├── generation.service.test.js        # Gemini output parsing, topo sort validation, failure path, concurrency guard
            ├── roadmapAcceptance.service.test.js # full payload accept flow + prerequisite guards
            ├── roadmapPrimary.service.test.js    # one-primary-per-user invariant
            └── roadmap.service.test.js           # list/detail/primary retrieval + commit behavior
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend; all roadmap logic isolated in `modules/roadmap/` and owned by Feature 009 as canonical lifecycle authority. Feature 001's `student_profiles` and Feature 002's `course_units` are read-only from this module via service-layer calls. Feature 005's `notifications` module is used for SSE delivery. No frontend source code is in scope — rendering is owned by Feature 004.

## Lifecycle Ownership Rule

Feature 009 is the single authority that defines:

- allowable roadmap statuses and transitions,
- primary roadmap assignment/switch semantics,
- acceptance validation gates and conflict behavior.

No other feature may define or bypass these transition rules.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
