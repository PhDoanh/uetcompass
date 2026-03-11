# Implementation Plan: Progress Tracking Dashboard

**Branch**: `007-progress-tracking` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-progress-tracking/spec.md`

## Summary

A read-only Progress Dashboard page (`/progress`) that gives students a cross-roadmap overview of their learning progress — the one view Skill Tree does not provide because it displays only one roadmap at a time. Progress data is served from a pre-computed `roadmap_progress_cache` MongoDB collection (one document per student+roadmap pair). The cache is refreshed synchronously by the Skill Tree module via a service-layer call after every node status write — no queue, no Redis. Real-time dashboard updates are delivered to open tabs via a dedicated SSE channel (`GET /api/progress/sse`), following the same Map-based connection store pattern established in Feature 001. Node-level drill-down queries node status data from the Skill Tree module through the service layer. No new npm packages are required.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8` — no new packages; reuses existing stack
- Frontend: `React 18`, `React Router v6`, native `EventSource` (SSE client — pattern reused from Feature 001)

**Storage**: MongoDB Atlas free tier — new `roadmap_progress_cache` collection (owned by this feature); reads `roadmap_nodes` collection (owned by Feature 004 — Skill Tree)
**Testing**: Jest 29 — unit tests only; MongoDB mocked via `jest.fn()`; no external services required
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Dashboard `GET /api/progress/summaries` served from pre-computed cache → single `find({ userId })` → p95 < 100ms; SC-001 (< 2s on 4G) met by cache design. SSE push within 200ms of node write on Atlas M0; SC-004 (< 5s) met comfortably.
**Constraints**: No Redis — cache stored in MongoDB; read-only REST API (no write endpoints in this module); SSE auth via `?token=<JWT>` query param (EventSource cannot send headers); soft-fail on `refreshCache` errors (node write already committed); no new npm packages introduced
**Scale/Scope**: UET-VNU students only; up to 10 roadmaps per student (per SC-001); tens to low hundreds of nodes per roadmap

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All progress logic is isolated in `backend/src/modules/progress/`. The only cross-module interaction is (a) Skill Tree service calls `progressService.refreshCache()` via service-layer injection — no direct cross-module import, and (b) `progress.service.js#getRoadmapDetail` calls `skillTreeService.getNodesByStatus()` through the service layer. No microservice split introduced.
- [x] **UET-First**: Dashboard is exclusively for UET-VNU students. No abstraction for other institutions. Career goal and roadmap concepts are UET-specific, hardcoded in scope.
- [x] **Privacy**: `roadmap_progress_cache` stores only aggregate counts and timestamps — no academic credentials, no grades, no UET portal data. This is the minimum data needed for the dashboard. Fully consistent with Principle III.
- [x] **AI-Assisted**: No Gemini API calls in this feature. All computation (progress percent formula, node grouping) is pure code logic. No LLM involved.
- [x] **Test What Matters**: Unit tests mandatory for `progress.service.js` — the `refreshCache` formula (including division-by-zero guard for `totalNodes = 0`), `getAll` (empty array when no cache docs), and `getRoadmapDetail` (correct status grouping). These are the complex pieces with side effects or business logic.

## Project Structure

### Documentation (this feature)

```text
specs/007-progress-tracking/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 5 technical decisions resolved
├── data-model.md        ← Phase 1: RoadmapProgressCache schema + data flow
├── quickstart.md        ← Phase 1: local dev setup + 5 manual test scenarios
├── contracts/
│   └── rest-api.md      ← Phase 1: 2 REST endpoints + SSE endpoint + deep-link convention
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── progress/
│   │   │   ├── roadmapProgressCache.model.js  # Mongoose schema: roadmap_progress_cache collection
│   │   │   ├── progress.service.js            # getAll(userId), getRoadmapDetail(userId, roadmapId), refreshCache(userId, roadmapId)
│   │   │   ├── progress.controller.js         # Express handlers — thin, delegates to service
│   │   │   ├── progress.routes.js             # GET /api/progress/summaries, /summaries/:id/nodes, /sse
│   │   │   └── progress.sse.js                # Map-based SSE store: addClient, removeClient, notifyUser
│   │   └── skillTree/                         # Owned by Feature 004 — calls progressService.refreshCache after node writes
│   ├── middleware/
│   │   └── auth.middleware.js                 # Shared — JWT verify → req.user.userId (no changes needed)
│   └── app.js                                 # Mount progress.routes (one new line)
└── tests/
    └── unit/
        └── progress/
            └── progress.service.test.js        # refreshCache formula + edge cases, getAll, getRoadmapDetail grouping

frontend/
├── src/
│   ├── features/
│   │   └── progress/
│   │       ├── ProgressDashboard.jsx           # /progress page — fetches summaries, renders RoadmapCard list
│   │       ├── RoadmapCard.jsx                 # Summary card: name, %, Done/InProgress/Pending counts, last activity
│   │       ├── RoadmapDetailView.jsx           # Node-by-status breakdown; three labeled groups with empty states
│   │       ├── NodeListItem.jsx                # Tappable node entry → React Router Link to /skill-tree/:id?focus=<nodeId>
│   │       ├── useProgressSSE.js               # EventSource hook: connects /api/progress/sse, merges progress:update into state
│   │       └── progress.api.js                 # Fetch wrappers: getSummaries(), getRoadmapNodes(roadmapId)
│   └── guards/
│       └── AuthGuard.jsx                       # Shared — wraps /progress route (no changes needed)
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with progress logic isolated in `modules/progress/`. SSE store follows the established per-feature Map pattern (`progress.sse.js`). Frontend uses feature-folder structure mirroring the backend module boundary. No new top-level directories introduced. Cross-module communication goes exclusively through service-layer function calls.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
