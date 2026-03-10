# Implementation Plan: Skill Tree – Visual Career Path Tracker

**Branch**: `003-skill-tree` | **Date**: 2026-03-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-skill-tree/spec.md`

## Summary

Build a Next.js + React Flow Skill Tree that renders a student's personalized DAG-based learning path toward a chosen UET career goal. Career path node definitions are stored as static JSON files in the backend; per-student progress is tracked in MongoDB `skill_node_statuses`. The server computes unlock states (DAG traversal) and next-step recommendations (topological sort — no LLM). The client polls every 2500ms (paused when tab hidden), applies optimistic updates with rollback, and toggles Vietnamese/English node labels via a Zustand locale field persisted to `localStorage`.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 via Next.js 14 (frontend)
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, `jsonwebtoken` (existing auth middleware — reused from 001)
- Frontend: Next.js 14, `@xyflow/react` v12 (React Flow), Zustand 4 with `persist` middleware, Tailwind CSS

**Storage**: MongoDB Atlas free tier — new collection `skill_node_statuses`; `course_units` (read-only, seeded by Feature 002)
**Testing**: Jest — unit tests only; no external services required; MongoDB mocked via `jest.fn()` / `jest.mock()`
**Target Platform**: Backend → Render (Node.js, free tier, cold start ~50s handled by loading skeleton); Frontend → Vercel
**Project Type**: Web application — Next.js 14 frontend + Node.js/Express modular-monolith backend
**Performance Goals**: Tree page fully interactive <2s for 100-node paths; status update visible in current session <1s; cross-session sync within 3s (2500ms poll interval)
**Constraints**: No Redis; no WebSocket; no SSE; no Gemini/LLM for recommendation logic; Render free tier — polling only; optimistic update mandatory to meet 1s UX goal despite cold start
**Scale/Scope**: UET-VNU students only — hundreds to low thousands; career paths contain 15–100 nodes; Vietnamese names primary

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **I — Modular Monolithic**: All backend code lives in `backend/src/modules/skill-tree/`. No direct cross-import from `curriculum` module — the career-path JSON files reference `course_unit` codes for name lookups only, via `curriculumService.getByCode()` through the service layer.
- [x] **II — UET-First**: Career path node definitions are hardcoded JSON for UET-VNU context. Vietnamese (`nameVi`) is primary. English (`nameEn`) is populated as a TODO field where not yet available. No abstraction for other universities.
- [x] **III — Privacy by Minimalism**: Only `{ studentId, nodeId, status, updatedAt }` is stored per student. No extra personal data collected. No credentials involved.
- [x] **IV — AI-Assisted, Human-Controlled**: "Next Steps" recommendation is implemented as a pure topological-sort DAG traversal — **no Gemini API call**. Students can always override by manually changing node status.
- [x] **V — Test What Matters**: Unit tests mandatory for: DAG unlock computation, progress % calculation, next-step topological selection, and locked-node status update guard (→ 403). All mocked — no external service needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-skill-tree/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 8 decisions resolved
├── data-model.md        ← Phase 1: schema + career path interface
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: all 3 endpoint contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── skill-tree/
│           ├── skillNodeStatus.model.js     # Mongoose schema: skill_node_statuses collection
│           ├── skillTree.service.js         # DAG traversal, unlock, progress %, next-step, status guard
│           ├── skillTree.controller.js      # Express handlers (thin — delegates to service)
│           ├── skillTree.routes.js          # Express Router + auth middleware applied
│           ├── careerPaths/
│           │   ├── index.js                 # Loader: reads + caches career path JSON at startup
│           │   ├── frontend-developer.json  # UET Frontend Dev career path (nodes + edges)
│           │   └── backend-developer.json   # UET Backend Dev career path (nodes + edges)
│           └── skillTree.validation.js      # Zod/manual schema validation for status updates
└── tests/
    └── unit/
        └── skill-tree/
            ├── dagTraversal.test.js         # Unlock computation: single prereq, multi-prereq, diamond DAG
            ├── progress.test.js             # Progress %: 0%, partial, 100%, rounding
            ├── nextStep.test.js             # Topological next-step: 1 available, 3 available, all done
            └── statusGuard.test.js          # Locked node → reject; unlocked node → allow

frontend/
├── src/
│   ├── app/
│   │   └── skill-tree/
│   │       └── page.jsx                    # Next.js route: /skill-tree
│   ├── features/
│   │   └── skill-tree/
│   │       ├── SkillTreePage.jsx           # Outer layout: canvas + sidebar panels
│   │       ├── SkillTreeCanvas.jsx         # <ReactFlow> wrapper with custom node types
│   │       ├── CourseNode.jsx              # Custom React Flow node: Course type (status badge + collapse)
│   │       ├── SkillNode.jsx               # Custom React Flow node: Skill type (status badge)
│   │       ├── ProgressBar.jsx             # Done / total percentage display
│   │       ├── NextSteps.jsx               # 1–3 recommended next-node cards
│   │       ├── LanguageToggle.jsx          # Vi / En toggle button
│   │       └── useSkillTree.js             # Polling hook: 2500ms interval, visibilitychange, optimistic update
│   ├── stores/
│   │   └── skillTreeStore.js               # Zustand store: nodes[], locale, optimistic snapshot
│   └── services/
│       └── skillTree.api.js                # fetch wrappers: getTree, patchNodeStatus, getCareerPaths
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with Skill Tree logic isolated in `modules/skill-tree/`. Career path DAG definitions stored as version-controlled JSON (not a MongoDB collection) to keep structure changes in code review. Frontend follows Next.js App Router conventions with feature-folder isolation mirroring the backend module boundary.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
