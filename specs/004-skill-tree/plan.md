# Implementation Plan: Skill Tree – Personalized Academic Roadmap Tracker

**Branch**: `004-skill-tree` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-skill-tree/spec.md`

## Summary

Build an interactive, personalized Skill Tree that renders a student's UET academic roadmap as a top-down DAG. Each node represents a UET course from a per-student personalized roadmap JSON stored in `student_roadmaps`. Node states (`pending`/`in_progress`/`done`) are persisted in `skill_node_statuses`; unlock logic is computed server-side via DAG traversal (O(V + E)). Clicking a node opens a three-tab detail panel: (1) admin-seeded course resources, (2) on-demand Gemini-generated "Why This Course" explanation cached by `{courseCode, careerGoal}` in `course_ai_contexts`, and (3) market skills from Vietnamese job platform data with drill-down learning resources. A "Re-personalize" button appears when `studentProfile.updatedAt > studentRoadmap.generatedAt` and triggers asynchronous roadmap regeneration; the frontend detects completion via 2500ms polling.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 via Next.js 14 (frontend)  
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, `@google/generative-ai` (Gemini SDK — for "Why This Course" on-demand generation), `jsonwebtoken` (existing auth middleware from Feature 001)
- Frontend: Next.js 14, `@xyflow/react` v12 (React Flow — same as Feature 003), Zustand 4 with `persist` middleware, Tailwind CSS

**Storage**: MongoDB Atlas free tier — new collections: `skill_node_statuses`, `course_ai_contexts`, `course_resources`; read-only: `student_roadmaps` (written by personalization job), `market_skills`, `skill_learning_resources` (written by crawling service), `student_profiles` (Feature 001)  
**Testing**: Jest — unit tests only; MongoDB, Gemini SDK, and auth middleware all mocked; no external services required to run tests  
**Target Platform**: Backend → Render (Node.js web service, free tier, cold start ~50s); Frontend → Vercel (Next.js 14, App Router)  
**Project Type**: Web application — Next.js 14 frontend + Node.js/Express modular-monolith backend  
**Performance Goals**: Skill tree page fully interactive within 3s; node state transition visible within 500ms (optimistic update); detail side panel opens within 1s; AI "Why This Course" content returned within 5s  
**Constraints**: No Redis; no WebSocket; no SSE for this feature — polling (2500ms, paused when tab hidden) for roadmap ready detection; Render free tier cold start handled by frontend skeleton loading state; Gemini free-tier token minimization enforced via `{courseCode, careerGoal}` cache  
**Scale/Scope**: UET-VNU students only — hundreds to low thousands of concurrent users; roadmap nodes: 15–100 per student; Vietnamese names primary

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **I — Modular Monolithic**: All backend code lives in `backend/src/modules/skill-tree/`. Cross-module dependencies are: (1) `auth.middleware.js` from the middleware layer (not a domain module), (2) `studentProfileService.findByUserId()` called through the service layer only — no direct import of onboarding module internals. No new top-level packages or microservices.
- [x] **II — UET-First**: Course codes, Vietnamese names, and career goal identifiers are all UET-VNU specific. Market skills are sourced from Vietnamese IT job platforms (TopDev, ITviec). No abstraction for other universities or locales.
- [x] **III — Privacy by Minimalism**: `skill_node_statuses` stores only `{ studentId, nodeId, status, updatedAt }`. The Gemini prompt for "Why This Course" contains only course metadata (`nameVi`, `nameEn`, `credits`) and `careerGoal` — no student personal data (no name, no transcript, no credentials). No new personal data fields beyond what is strictly needed.
- [x] **IV — AI-Assisted, Human-Controlled**: Gemini is called only for "Why This Course" tab content — a descriptive explanation, not a decision-maker. Gemini output is validated before caching (length ≥ 50 chars, no refusal pattern). Students retain full manual control over node states (override by clicking). DAG unlock logic and re-personalize trigger are pure code — no LLM.
- [x] **V — Test What Matters**: Unit tests mandatory for: DAG unlock computation (single prereq, multi-prereq, diamond DAG), state transition guard (locked node rejection, invalid transition), AI context cache hit/miss path, and re-personalize flag computation (`updatedAt` comparison). All dependencies mocked — no external service required.

## Project Structure

### Documentation (this feature)

```text
specs/004-skill-tree/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 8 decisions resolved
├── data-model.md        ← Phase 1: 6 MongoDB collections + state machine
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: 7 endpoint contracts
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
│           ├── skillTree.service.js             # DAG traversal, unlock, state guard, repersonalize flag
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
            └── repersonalizeFlag.test.js        # updatedAt > generatedAt → true; equal or older → false; null roadmap

frontend/
├── src/
│   ├── app/
│   │   └── skill-tree/
│   │       └── page.jsx                        # Next.js App Router route: /skill-tree
│   ├── features/
│   │   └── skill-tree/
│   │       ├── SkillTreePage.jsx               # Outer layout: canvas + side panel + repersonalize button
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

**Structure Decision**: Option 2 — Web application. Modular monolith backend with all Skill Tree logic isolated in `backend/src/modules/skill-tree/`. Feature-folder structure on the frontend mirrors the backend module boundary. Communication from `skill-tree` to the `onboarding` module (`studentProfile.updatedAt` read) passes through `studentProfileService` called from `skillTree.service.js` — no direct cross-module import of schemas or models.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
