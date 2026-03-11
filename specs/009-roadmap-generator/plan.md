# Implementation Plan: AI-Powered Personalised Roadmap Generator

**Branch**: `009-roadmap-generator` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-roadmap-generator/spec.md`

## Summary

Build the async AI roadmap generation backend for UETCompass. When a student submits their onboarding profile (Feature 001) or updates their career goal (Feature 005), the system asynchronously calls Gemini 1.5 Flash with the student's `StudentProfile` and the full `CourseUnit` DAG for their major, instructing the AI to select career-relevant courses and return them in topological order with per-node skill enrichment. The AI response is validated against a `responseSchema` and then subject to a system-level topological sort check (DFS, O(V+E)). On success, a `RoadmapPreview` is held in-memory and the student is notified via the existing SSE infrastructure (Feature 005). The roadmap is committed to the `roadmaps` MongoDB collection only after the student explicitly accepts the preview. One `roadmaps` document exists per student (unique on `userId`); valid persisted statuses are `completed` and `failed`. A retry mechanism is available for failed generations without requiring profile resubmission. Re-generation uses the existing accepted roadmap as additional AI context alongside the updated profile.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `@google/generative-ai`
- Notifications: `notification.service.js` + `notification.sse.js`

**Storage**: MongoDB Atlas free tier — `roadmaps` collection (new; unique index on `userId`); reads `student_profiles` (owned by Feature 001) and `course_units` (owned by Feature 002) via service-layer calls; in-memory `Map<userId, PreviewPayload>` for pre-acceptance previews (not persisted to any collection)
**Testing**: Jest 29 — unit tests only; `@google/generative-ai`, Mongoose, and `notification.service.js` all mocked via `jest.fn()` / `jest.mock()`
**Target Platform**: Backend → Render (Node.js web service, free tier, single instance); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Generation result delivered asynchronously via SSE — no synchronous response latency requirement for the generation itself. Preview accept/reject endpoints < 300ms p95 (single in-memory Map lookup + one MongoDB upsert)
**Constraints**: No Redis — in-process async only; concurrency guard = module-level `Set<string>` of active `userId` strings; preview held in-memory on worker only (not persisted; lost on restart); no cross-module direct imports — service-layer calls only
**Scale/Scope**: UET-VNU students only; one roadmap per user; single Render instance; hundreds to low-thousands of concurrent users

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All roadmap logic is isolated in `backend/src/modules/roadmap/`. No direct cross-module imports — reads `student_profiles` and `course_units` via service-layer calls only. Notifications delivered through the existing `notification.service.js` shared module (Feature 005). No microservice split introduced.
- [x] **UET-First**: No generalisation — the implementation is hardcoded for UET's `CourseUnit` DAG structure and `StudentProfile` schema. No abstraction for other universities.
- [x] **Privacy by Minimalism**: No grades, GPA, or transcript data stored. The `roadmaps` collection holds only course codes, AI-generated skill/reason text, and timestamps. No student credentials involved. The `completedCourseIds` used as prerequisite anchors are already stored in Feature 001's `student_profiles` collection — no new personal data is collected by this feature.
- [x] **AI-Assisted, Human-Controlled**: Gemini output is validated at two levels before storage — `responseSchema` enforces structure server-side, and the system performs an independent topological sort check (DFS). The student explicitly accepts or rejects every roadmap preview; the AI never commits the roadmap directly.
- [x] **Test What Matters**: Mandatory unit tests for: generation lifecycle (Gemini output parsing, topological sort validation, failure path), roadmap acceptance service (accept/reject, `repersonalizationPending` clear), and roadmap service (upsert, single-document invariant). All external deps mocked.

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
│           ├── roadmap.model.js                  # roadmaps Mongoose schema + model
│           ├── roadmap.service.js                # getByUser, upsertFailed, upsertCompleted
│           ├── generation.service.js             # generation lifecycle, Gemini call, topo validation, concurrency guard
│           ├── roadmap.preview.store.js          # in-memory Map<userId, PreviewPayload> + SIGTERM handler
│           ├── roadmapAcceptance.service.js      # accept preview, reject preview, clear repersonalizationPending
│           ├── roadmap.controller.js             # Express handlers (thin — delegate to services)
│           └── roadmap.routes.js                 # /api/roadmap/* routes + auth middleware
└── tests/
    └── unit/
        └── roadmap/
            ├── generation.service.test.js        # Gemini output parsing, topo sort validation, failure path, concurrency guard
            ├── roadmapAcceptance.service.test.js # accept/reject, repersonalizationPending cleared, no-preview 404
            └── roadmap.service.test.js           # upsertFailed, upsertCompleted, single-document invariant
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend; all roadmap logic isolated in `modules/roadmap/`. Feature 001's `student_profiles` and Feature 002's `course_units` are read-only from this module via service-layer calls. Feature 005's `notifications` module is used for SSE delivery. No frontend source code is in scope — rendering is owned by Feature 004.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
