# Implementation Plan: AI-Powered Personalised Roadmap Generator

**Branch**: `009-automated-roadmap-generator` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-automated-roadmap-generator/spec.md`

## Summary

When a student submits their onboarding profile, the system asynchronously generates a personalised learning roadmap by mapping the student's career goal and completed courses against a pre-loaded roadmap template and the CourseUnit DAG. Template-matched skills are ordered by template position; off-template skills are evaluated for career relevance by Gemini and inserted adjacent to their most-related topic node as subtopics. The resulting ordered `RoadmapNode[]` (skill-primary identity, no embedded progress state) is held in-memory as a preview and committed as an accepted `Roadmap` document only after explicit student acceptance. The system also handles the low-personalisation (no career goal) fallback, generation failure with retry, and re-generation on career goal update.

**Technical approach**: Gemini is scoped narrowly to off-template skill evaluation only — returning `{ skillName, reason }[]` via `responseSchema` enforcement. Template matching, topological ordering, deduplication, and node enrichment are deterministic system-side logic. The in-memory `RoadmapPreview` store (a `Map<userId, PreviewPayload>`) is cleared on SIGTERM with `upsertFailedWithProfile` called for all pending entries.

## Technical Context

**Language/Version**: Node.js 20 LTS (backend), JavaScript (frontend)
**Primary Dependencies**: Express, Mongoose, `@google/generative-ai` (Gemini 2.5 Flash), `jsonwebtoken`, dotenv, Vite, React
**Runtime Feature Dependencies**: `notification.service.js` (Feature 005) for SSE delivery of `roadmap_preview_ready` and `roadmap_generation_failed` events; Feature 001 `StudentProfile` and Feature 002 `CourseUnit` collections (read-only)
**Storage**: MongoDB Atlas — `roadmaps` and `roadmap_progress` collections (both owned by this feature); reads `student_profiles` (Feature 001) and `course_units` (Feature 002)
**Testing**: Jest (backend unit tests, Gemini mocked); no frontend tests for this feature
**Target Platform**: Render (backend, free tier), Vercel (frontend), MongoDB Atlas (free tier)
**Project Type**: Web application — monolithic repo, modular backend
**Performance Goals**: API p95 <500 ms for non-AI endpoints; generation runs asynchronously, student never blocked
**Constraints**: Free-tier cloud (cold start ~50 s on Render), no hardcoded secrets, UET-only scope, no microservices, no cross-module direct DB writes
**Scale/Scope**: 10k+ UET students, up to ~200 course nodes per major, 100+ concurrent users

## Constitution Check

*Checked against constitution.md v1.0.0*

| Principle | Status | Notes |
|---|---|---|
| I. Modular Monolithic | ✅ PASS | All roadmap logic lives in `backend/src/modules/roadmap/`. No direct cross-module DB writes. Other features consume via 009 service contracts only. |
| II. UET-First Scope | ✅ PASS | Roadmap templates are hardcoded UET-major JSON. No generalization hooks added. |
| III. Privacy by Minimalism | ✅ PASS | Only `userId`, `studentProfileId`, `personalisationLevel`, `nodes`, `acceptedAt`, `isPrimary` stored. No credentials or excessive personal data. |
| IV. AI-Assisted, Human-Controlled | ✅ PASS | Gemini scoped to off-template skill relevance evaluation only. `responseSchema` validates AI output before any use. Student explicitly accepts or rejects every roadmap preview. |
| V. Test What Matters | ✅ PASS | Unit tests mandatory for generation service (AI call parsing, concurrency guard, SIGTERM handler, failure isolation), acceptance service (completed-filter, prerequisite validation), roadmap persistence service, primary-switch invariant, and progress service (createProgress seeding, updateNodeState atomic transition, exclusivity invariant). |

## Project Structure

### Documentation (this feature)

```text
specs/009-automated-roadmap-generator/
├── plan.md              # This file
├── research.md          # Gemini schema, topological sort, preview store, failure/retry patterns
├── data-model.md        # Roadmap, RoadmapNode, RoadmapTemplate, RoadmapPreview, RoadmapProgress schemas
├── quickstart.md        # Local setup, seed steps, manual test scenarios
├── contracts/
│   └── rest-api.md      # All student-facing endpoints + internal trigger contracts
└── tasks.md             # 28 tasks across 7 phases
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── roadmap/
│           ├── roadmap.model.js               # Mongoose schema: Roadmap + RoadmapNode (embedded)
            ├── roadmapProgress.model.js        # Mongoose schema: RoadmapProgress (roadmap_progress collection);
            │                                  #   fields: userId, roadmapId, pending[], inProgress[], completed[], skip[];
            │                                  #   index: unique { userId: 1, roadmapId: 1 } (progress_per_user_roadmap)
            ├── roadmap.preview.store.js        # In-memory Map<userId, PreviewPayload>; exports: storePendingPreview,
            │                                  #   getPendingPreview, clearPendingPreview, getAllPendingUserIds;
            │                                  #   SIGTERM handler iterates all pending entries → reads preview → upsertFailedWithProfile + clear
│           ├── roadmapValidation.service.js    # DFS cycle detection + topological order validation
│           ├── roadmap.service.js              # CRUD: getPrimaryByUser, listByUser, getByIdForUser,
│           │                                  #   upsertFailed, upsertFailedWithProfile, commitAccepted, switchPrimary
            ├── generation.service.js           # Exports: triggerGeneration(userId, studentProfileId, triggerReason)
            │                                  #   Internal pipeline: buildSkillCoursesMap → matchSkillsToTemplate
            │                                  #     → evaluateOffTemplateSkills (AI call, skipped if no careerGoal)
            │                                  #     → mapOffTemplateSkills → validateTopologicalOrder → storePendingPreview
            │                                  #   Concurrency guard: module-level Set<userId>; add on start, delete in finally
            │                                  #   Low-personalisation: skip AI call, use required courses only
            │                                  #   Retry: re-reads existing StudentProfile, re-runs full lifecycle
            │                                  #   Re-generation: passes existing accepted roadmap nodes as AI context
            ├── roadmapAcceptance.service.js    # Exports: acceptRoadmapPayload(userId, payload) — fork-consumable;
            │                                  #   payload carries full nodes[], studentProfileId, personalisationLevel, isPrimary
            │                                  #   Pipeline: filterCompletedCourses → validatePrerequisites → commitAccepted → createProgress
            │                                  #   Throws domain errors: ALL_COMPLETED, PREREQUISITE_VIOLATION, CONFLICT
│           ├── roadmapPrimary.service.js       # Atomic demote/promote primary invariant enforcement
            ├── roadmapProgress.service.js      # Exports: createProgress(userId, roadmapId, nodeIds) — called on acceptance;
            │                                  #   getProgress(userId, roadmapId);
            │                                  #   updateNodeState(userId, roadmapId, nodeId, fromState, toState) — atomic pull+push
│           ├── roadmap.controller.js           # Thin HTTP handlers; maps domain errors → HTTP codes
│           └── roadmap.routes.js              # Express routes + auth middleware
└── tests/
    └── unit/
        └── roadmap/
            ├── generation.service.test.js
            ├── roadmapAcceptance.service.test.js
            ├── roadmap.service.test.js
            ├── roadmapPrimary.service.test.js
            └── roadmapProgress.service.test.js
```

**Structure Decision**: Web application (Option 2). All source under `backend/src/modules/roadmap/` following the project's existing module pattern. No frontend files for this feature — rendering is Feature 004's responsibility.

## Complexity Tracking

> No constitution violations — no entries required.
