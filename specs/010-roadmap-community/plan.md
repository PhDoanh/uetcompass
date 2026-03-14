# Implementation Plan: Roadmap Community

**Branch**: `010-roadmap-community` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-roadmap-community/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Feature 010 adds social sharing to accepted student roadmaps via two snapshot-based mechanisms: (1) a public `ShareLink` that captures the roadmap at generation time and serves it unauthenticated via a UUID token; and (2) a `CommunityEntry` that captures the roadmap at publish time and is discoverable by authenticated peers in a filtered, major-relevance-ordered feed. Both mechanisms store their node content in an immutable `RoadmapSnapshot` document (separate collection, only public fields). Community entries support likes (atomic `$inc` counter + `LikeRecord` collection) and forks (filter completed courses by canonical key `(major, courseCode)` → call Feature 009 fork-consumable endpoint with full nodes payload → save accepted roadmap). Privacy substitution reads from `User.privacySetting` (Feature 005) and applies response-time substitution only; in identified mode UI prefers `displayName` and falls back via system-wide name policy when missing. Fork success triggers post-acceptance side effects (notification, eligibility-clock reset, audit log, optional progress update). The Y-day time-gate is stored as a `system_config` DB document to allow runtime changes without redeployment. No AI calls in this feature.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `crypto` (built-in — `randomUUID()` for share tokens) — no new packages;
- Frontend: `React 18`, `React Router v6`, existing fetch utilities

**Storage**: MongoDB Atlas free tier — new collections: `roadmap_snapshots`, `share_links`, `community_entries`, `like_records`; reads (read-only): `student_profiles` (Feature 001), `roadmaps` (Feature 009), `users` (Feature 005); shared: `system_config` (Y-day config)
**Testing**: Jest 29 — unit tests for business logic; MongoDB mocked via `jest.fn()`; no external services required locally
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Share-link serve (Endpoint 3) < 100ms p95 — single RoadmapSnapshot read by token; Feed browse (Endpoint 6) < 200ms — aggregation pipeline on ≤ 500 entries; SC-005 (filtered feed within 2s) met by indexed `majorGroup` + `careerGoalRole` fields
**Constraints**: No Redis; no background jobs — snapshots created synchronously; no AI calls; `supportingSkills` and `careerRelevanceNote` excluded at snapshot capture time (never stored, never in any response); privacy substitution at response time only (never alter stored data); Y config readable without redeployment (DB doc + 60s in-process cache)
**Scale/Scope**: UET-VNU students only; expected ≤ 500 community entries at launch; ≤ 50 roadmap nodes per snapshot

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design — all items pass.*

- [x] **Modular Monolithic (Principle I)**: All community logic is isolated in `backend/src/modules/community/`. Cross-module interactions go through the service layer: `community.service.js` calls `studentProfileService.getByUserId()`, `userService.getById()` (privacy/display), and Feature 009 fork-consumable acceptance service via injected references — no direct cross-module model access. No microservice split introduced.
- [x] **UET-First (Principle II)**: No abstraction for other institutions. Major group label mapping is UET-specific config. All student context (major, career goal, canonical completed-course records) is UET-specific. Nothing is parameterised for other universities.
- [x] **Privacy by Minimalism (Principle III)**: `RoadmapSnapshot` stores only `courseCode`, `courseName`, `gainedSkills`, `reason` — `supportingSkills` and `careerRelevanceNote` are excluded at capture time. Privacy mode is read from `User.privacySetting` (owner Feature 005). `CommunityEntry` stores `exactMajor` and `userId` (needed for identified mode) but never exposes raw identity fields when anonymous. No credentials stored.
- [x] **AI-Assisted, Human-Controlled (Principle IV)**: No Gemini API calls in this feature. All logic (snapshot capture, fork filtering, like counting, feed ordering, privacy substitution) is pure code. Feature 009's acceptance flow is a deterministic validation step, not an AI call.
- [x] **Test What Matters (Principle V)**: Unit tests mandatory for: eligibility check (time-gate boundary conditions including `daysUntilEligible` computation), snapshot capture (field exclusion — confirm `supportingSkills` absent), fork filter by canonical `(major, courseCode)` + empty-sequence guard, strict ordering (filter-before-validation), anonymous substitution (identified vs anonymous output), identified-name fallback policy, like atomic operations (increment/decrement, duplicate guard), feed ordering (same-major-group-first sort), and fork success side effects (notification/audit/progress hook). All tests run locally with mocked MongoDB via `jest.fn()`.

## Project Structure

## Project Structure

### Documentation (this feature)

```text
specs/010-roadmap-community/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 7 technical decisions (R-001 through R-007)
├── data-model.md        ← Phase 1: 4 owned collections + referenced entities
├── quickstart.md        ← Phase 1: local dev setup + 5 manual test scenarios
├── contracts/
│   └── rest-api.md          ← Phase 1: 10 REST endpoints with request/response shapes
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── community/
│   │       ├── roadmapSnapshot.model.js     # Mongoose schema: roadmap_snapshots collection
│   │       ├── shareLink.model.js           # Mongoose schema: share_links; partial unique index on userId (active)
│   │       ├── communityEntry.model.js      # Mongoose schema: community_entries; unique index on userId
│   │       ├── likeRecord.model.js          # Mongoose schema: like_records; unique compound index
│   │       ├── community.service.js         # all business logic: eligibility, snapshot capture, fork, like, feed ordering, privacy substitution
│   │       ├── community.controller.js      # thin Express handlers — delegates to service
│   │       └── community.routes.js          # mounts all 10 endpoints under /api/community
│   └── app.js                           # require community models + mount community.routes (two lines)
└── tests/
    └── unit/
        └── community/
            └── community.service.test.js    # eligibility boundary, snapshot field exclusion, fork filter, anonymous substitution, like atomicity, feed ordering

frontend/
└── src/
    └── features/
        └── community/
            ├── pages/
            │   ├── CommunityFeed.jsx            # /community — feed with filter controls + major-relevance ordering
            │   └── CommunityDetailView.jsx      # /community/:entryId — full node list + like + fork buttons
            ├── components/
            │   ├── CommunityEntryCard.jsx       # feed card: owner, major, career goal, node count, like count, preview nodes
            │   ├── ShareLinkPanel.jsx           # student's own share link UI: generate, copy, revoke
            │   ├── LikeButton.jsx               # like/unlike toggle with optimistic count update
            │   └── ForkButton.jsx               # fork action with prerequisite violation error display
            └── community.api.js             # fetch wrappers for all 10 endpoints
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with community logic isolated in `modules/community/`. Same structure as Feature 007 (progress module). Frontend uses feature-folder structure mirroring the backend module boundary. Cross-module service calls go through injected service references — no direct cross-module model access.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
