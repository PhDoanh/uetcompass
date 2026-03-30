# Implementation Plan: Progress Tracking Dashboard

**Branch**: `007-progress-tracking` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-progress-tracking/spec.md`

## Summary

A read-only Progress Dashboard page (`/progress`) that gives students a cross-roadmap overview of their learning progress across all roadmap documents they own (Feature 009 canonical ownership). Progress data is served from a pre-computed `roadmap_progress_cache` MongoDB collection (one document per student+roadmap pair, keyed by stable 009 `roadmapId`). The cache is refreshed by Skill Tree via service-layer call after node-status writes, using **soft-fail + eventual consistency** policy (no user action rollback on cache failures). Real-time dashboard updates are delivered via dedicated SSE channel (`GET /api/progress/sse`). Node-level drill-down uses Feature 004 canonical contract `getNodesByStatus(userId, roadmapId)` backed by `skill_node_statuses`. No new npm packages are required.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8` — no new packages; reuses existing stack
- Frontend: `React 18`, `React Router v6`, native `EventSource` (SSE client — pattern reused from Feature 001)

**Storage**: MongoDB Atlas free tier — new `roadmap_progress_cache` collection (owned by this feature); reads roadmap ownership from Feature 009 (`roadmaps` via service contract) and node statuses from Feature 004 contract (`getNodesByStatus`, backed by `skill_node_statuses`)
**Testing**: Jest 29 — unit tests only; MongoDB mocked via `jest.fn()`; no external services required
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Dashboard `GET /api/progress/summaries` served from pre-computed cache → single `find({ userId })` → p95 < 100ms; SC-001 (< 2s on 4G) met by cache design. SSE push within 200ms of node write on Atlas M0; SC-004 (< 5s) met comfortably.
**Constraints**: No Redis — cache stored in MongoDB; read-only REST API (no write endpoints in this module); SSE auth via `?sseToken=<JWT>` query param (EventSource cannot send headers); `refreshCache` soft-fail + eventual-consistency retry/repair; no new npm packages introduced
**Scale/Scope**: UET-VNU students only; multi-roadmap ownership from Feature 009 (typically up to 10 completed roadmaps in dashboard scope); tens to low hundreds of nodes per roadmap

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All progress logic is isolated in `backend/src/modules/progress/`. Cross-module interaction is service-layer only: (a) Skill Tree calls `progressService.refreshCache()` after status write, (b) progress reads node-group payload via `skillTreeService.getNodesByStatus()`, and (c) progress resolves owned roadmap identities via Feature 009 roadmap service contract. No direct cross-module model import. No microservice split introduced.
- [x] **UET-First**: Dashboard is exclusively for UET-VNU students. No abstraction for other institutions. Career goal and roadmap concepts are UET-specific, hardcoded in scope.
- [x] **Privacy**: `roadmap_progress_cache` stores only aggregate counts and timestamps — no academic credentials, no grades, no UET portal data. This is the minimum data needed for the dashboard. Fully consistent with Principle III.
- [x] **AI-Assisted**: No Gemini API calls in this feature. All computation (progress percent formula, node grouping) is pure code logic. No LLM involved.
- [x] **Test What Matters**: Unit tests mandatory for `progress.service.js` — `refreshCache` formula (including division-by-zero guard), soft-fail + eventual-retry scheduling behavior, `getAll` (empty array when no cache docs), and `getRoadmapDetail` (correct 004 status grouping shape). These are the complex pieces with side effects or business logic.

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
│   │   │   ├── roadmapOwner.adapter.js        # Feature 009 adapter: list owned roadmaps + stable roadmapId mapping
│   │   │   ├── progress.controller.js         # Express handlers — thin, delegates to service
│   │   │   ├── progress.routes.js             # GET /api/progress/summaries, /summaries/:id/nodes, /sse
│   │   │   └── progress.sse.js                # Map-based SSE store: addClient, removeClient, notifyUser
│   │   └── skill-tree/                        # Owned by Feature 004 — calls progressService.refreshCache after node writes
│   ├── middleware/
│   │   └── auth.middleware.js                 # Shared — JWT verify → req.user.userId (no changes needed)
│   └── app.js                                 # Mount progress.routes (one new line)
└── tests/
    └── unit/
        └── progress/
            └── progress.service.test.js        # refreshCache formula + soft-fail/eventual consistency + getAll + getRoadmapDetail grouping

frontend/
├── src/
│   ├── features/
│   │   └── progress/
│   │       ├── ProgressDashboard.jsx           # /progress page — fetches summaries, renders RoadmapCard list
│   │       ├── RoadmapCard.jsx                 # Summary card: name, %, Done/InProgress/Pending counts, last activity
│   │       ├── RoadmapDetailView.jsx           # Node-by-status breakdown; three labeled groups with empty states
│   │       ├── NodeListItem.jsx                # Tappable node entry → React Router Link to /skill-tree/:id?focus=<nodeId>
│   │       ├── useProgressSSE.js               # EventSource hook: connects /api/progress/sse, merges progress:updated into state
│   ├── services/
│   │   └── progress.api.js                     # Fetch wrappers: getSummaries(), getRoadmapNodes(roadmapId)
│   └── guards/
│       └── AuthGuard.jsx                       # Shared — wraps /progress route (no changes needed)
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with progress logic isolated in `modules/progress/`. SSE store follows established per-feature Map pattern (`progress.sse.js`). Frontend uses feature-folder structure mirroring backend boundary. Cross-module communication goes exclusively through service-layer contracts with Feature 004 (node statuses) and Feature 009 (roadmap ownership + stable IDs).

## Complexity Tracking

No Constitution violations — complexity tracking table not required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
