# Implementation Plan: Skill Tree – Personalized Academic Roadmap Tracker

**Branch**: `004-skill-tree` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-skill-tree/spec.md`

## Summary

Build an interactive, personalized Skill Tree that renders a student's UET academic roadmap as a top-down DAG. Feature 004 consumes canonical roadmap topology from Feature 009 (`GET /api/primary-roadmap` or service-layer equivalent) and does not own roadmap storage. Node states (`pending`/`in_progress`/`done`) are canonical in `skill_node_statuses` with explicit persisted `pending` records for every roadmap node; unlock logic is computed server-side via DAG traversal (O(V + E)). Clicking a node opens a three-tab detail panel: (1) admin-seeded course resources, (2) on-demand Gemini-generated "Why This Course" explanation cached by `{courseCode, careerGoal}` in `course_ai_contexts`, and (3) market skills from Vietnamese job platform data with drill-down learning resources. A "Re-personalize" button appears when `studentProfile.updatedAt > primaryRoadmap.generatedAt`; Feature 004 delegates regeneration to Feature 009 and detects completion via 2500ms polling.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)  
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, `@google/generative-ai` (Gemini SDK — for "Why This Course" on-demand generation), `jsonwebtoken` (existing auth middleware from Feature 001)
- Frontend: React 18, React Router v6, `@xyflow/react` v12 (React Flow), Zustand 4 with `persist` middleware, Tailwind CSS (bundled with Vite)

**Storage**: MongoDB Atlas free tier — new collections: `skill_node_statuses`, `course_ai_contexts`, `course_resources`; read-only collections: `market_skills`, `skill_learning_resources` (written by crawling service), `student_profiles` (Feature 001). Canonical roadmap data is consumed from Feature 009 via API/service contract (not from a local collection).  
**Testing**: Jest — unit tests only; MongoDB, Gemini SDK, and auth middleware all mocked; no external services required to run tests  
**Target Platform**: Backend → Render (Node.js web service, free tier, cold start ~50s); Frontend → Vercel (React SPA)  
**Project Type**: Web application — React SPA + Node.js/Express modular-monolith backend  
**Performance Goals**: Skill tree page fully interactive within 3s; node state transition visible within 500ms (optimistic update); detail side panel opens within 1s; AI "Why This Course" content returned within 5s  
**Constraints**: No Redis; no WebSocket; no SSE for this feature — polling (2500ms, paused when tab hidden) for roadmap ready detection; Render free tier cold start handled by frontend skeleton loading state; Gemini free-tier token minimization enforced via `{courseCode, careerGoal}` cache  
**Scale/Scope**: UET-VNU students only — hundreds to low thousands of concurrent users; roadmap nodes: 15–100 per student; Vietnamese names primary

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **I — Modular Monolithic**: All backend code lives in `backend/src/modules/skill-tree/`. Cross-module dependencies are: (1) `auth.middleware.js` from the middleware layer (not a domain module), (2) `studentProfileService.findByUserId()` via service layer, (3) Feature 009 primary-roadmap adapter via service layer only. No direct model imports across modules. No new top-level packages or microservices.
- [x] **II — UET-First**: Course codes, Vietnamese names, and career goal identifiers are all UET-VNU specific. Market skills are sourced from Vietnamese IT job platforms (TopDev, ITviec). No abstraction for other universities or locales.
- [x] **III — Privacy by Minimalism**: `skill_node_statuses` stores only `{ studentId, nodeId, status, updatedAt }`. The Gemini prompt for "Why This Course" contains only course metadata (`nameVi`, `nameEn`, `credits`) and `careerGoal` — no student personal data (no name, no transcript, no credentials). No new personal data fields beyond what is strictly needed.
- [x] **IV — AI-Assisted, Human-Controlled**: Gemini is called only for "Why This Course" tab content — a descriptive explanation, not a decision-maker. Gemini output is validated before caching (length ≥ 50 chars, no refusal pattern). Students retain full manual control over node states (override by clicking). DAG unlock logic and re-personalize trigger are pure code — no LLM.
- [x] **V — Test What Matters**: Unit tests mandatory for: DAG unlock computation (single prereq, multi-prereq, diamond DAG), explicit pending reconciliation (all roadmap nodes have persisted status rows), state transition guard (locked node rejection, invalid transition), AI context cache hit/miss path, re-personalize flag computation (`updatedAt` comparison against primary roadmap), and `getNodesByStatus()` contract shape (always 3 arrays). All dependencies mocked — no external service required.

## Project Structure

### Documentation (this feature)

```text
specs/004-skill-tree/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 9 decisions resolved
├── data-model.md        ← Phase 1: canonical roadmap contract + progress data model + state machine
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: 7 endpoint contracts + downstream service contract
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── skill-tree/
│           ├── skillNodeStatus.model.js        # Mongoose schema: skill_node_statuses collection
│           ├── aiContext.model.js               # Mongoose schema: course_ai_contexts collection
│           ├── skillTree.service.js             # DAG traversal, explicit pending sync, state guard, repersonalize flag
│           ├── primaryRoadmap.service.js        # Adapter: consume Feature 009 canonical roadmap API/service
│           ├── aiContext.service.js             # Gemini "Why This Course" + cache read/write
│           ├── courseResource.service.js        # Read course_resources collection
│           ├── marketSkill.service.js           # Read market_skills + skill_learning_resources
│           ├── skillTree.controller.js          # Express handlers (thin — delegates to services)
│           ├── skillTree.routes.js              # Express Router + auth middleware applied
│           └── skillTree.validation.js          # Input validation: status enum, courseCode format
└── tests/
    └── unit/
        └── skill-tree/
            ├── dagTraversal.test.js             # isUnlocked: single prereq, multi-prereq, diamond DAG, no prereqs
            ├── stateGuard.test.js               # Locked node → 403; invalid transition → 400; valid → pass
            ├── aiContextCache.test.js           # Cache hit (no Gemini call); cache miss (Gemini called + validation)
            ├── repersonalizeFlag.test.js        # updatedAt > generatedAt(primary roadmap) → true; equal or older → false
            ├── pendingSync.test.js              # explicit pending upsert for missing node status rows
            └── getNodesByStatus.test.js         # roadmapId/roadmapName + done/inProgress/pending arrays always present

frontend/
├── src/
│   ├── features/
│   │   └── skill-tree/
│   │       ├── SkillTreePage.jsx               # Top-level page component (rendered by React Router <Route>)
│   │       ├── SkillTreeCanvas.jsx             # <ReactFlow> wrapper with custom node type
│   │       ├── CourseNode.jsx                  # Custom React Flow node: state badge + locked indicator
│   │       ├── RepersonalizeButton.jsx         # Shown when needsRepersonalization; shows loading during job
│   │       ├── CourseDetailPanel.jsx           # Side panel: 3 tabs (Resources / Why / Market Skills)
│   │       ├── ResourcesTab.jsx                # Grouped materials (textbook, slide, lab, assignment)
│   │       ├── WhyThisCourseTab.jsx            # AI content (loading state + 502 error fallback)
│   │       ├── MarketSkillsTab.jsx             # Skill list sorted by job count; click opens sub-panel
│   │       ├── SkillResourcesModal.jsx         # Sub-panel/modal: free + paid resources for a skill
│   │       └── useSkillTree.js                 # Polling hook: 2500ms interval, visibilitychange, optimistic update
│   ├── stores/
│   │   └── skillTreeStore.js                   # Zustand: nodes[], activeCourseId, activeTab, activeSkillName
│   └── services/
│       └── skillTree.api.js                    # Fetch wrappers: getTree, patchNodeStatus, getResources,
│                                               #   getWhyCourse, getMarketSkills, getLearningResources, repersonalize
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with all Skill Tree logic isolated in `backend/src/modules/skill-tree/`. Feature-folder structure on the frontend mirrors the backend module boundary and is consistent with Feature 001 (`frontend/src/features/<module>`). The `/skill-tree` route is registered in the root React Router setup. Communication from `skill-tree` to other domains is service-layer only: `studentProfileService` (Feature 001) and `primaryRoadmapService` (Feature 009), with no cross-module schema/model imports.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
