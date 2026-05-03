# Implementation Plan: Community Roadmap Review & Rating System

**Branch**: `014-community-roadmap-reviews` | **Date**: 2026-04-28 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/014-community-roadmap-reviews/spec.md`

## Summary

Add a standalone review module that lets authenticated UET students upsert one review per roadmap, runs synchronous blacklist rejection plus async moderation with Perspective API and Gemini fallback, and keeps public roadmap ratings fresh through SSE broadcasts. The same review data powers the authenticated review tab in the Skill Tree detail panel and the guest-only homepage review carousel, with pagination for the review list and CSS-only motion for the carousel.

## Technical Context

**Language/Version**: Node.js 22.x backend, React 18 frontend  
**Primary Dependencies**: Express, Mongoose, nodemailer, `@google/generative-ai`, MongoDB, Vite, Axios, Jest  
**Storage**: MongoDB Atlas; new `Review` collection plus `averageRating` on `Roadmap` and `ManualRoadmap` documents  
**Testing**: Jest backend unit tests with external moderation APIs mocked; frontend smoke/manual validation for the new review surfaces  
**Target Platform**: Render backend, Vercel frontend, MongoDB Atlas  
**Project Type**: Web application with a modular monolith backend and React SPA frontend  
**Performance Goals**: Approved-review rating updates broadcast within 3 seconds; homepage carousel first paint for 20 reviews within 200 ms on mobile; review list page size defaults to 10  
**Constraints**: No new frontend libraries; no queue service; no direct cross-module model imports; reduced-motion must disable carousel auto-scroll; UET-only scope  
**Scale/Scope**: Typical UET roadmap traffic, one active review per student per roadmap, top-20 guest carousel, paginated review browsing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Modular Monolithic | ✅ PASS | Review logic stays in `backend/src/modules/review/` and talks to roadmap through service calls only. |
| II. UET-First Scope | ✅ PASS | The feature is scoped to UET students, UET roadmaps, and `@vnu.edu.vn` notification email. |
| III. Privacy by Minimalism | ✅ PASS | Only review content, author identity, status, and timestamps are stored; no extra personal data is introduced. |
| IV. AI-Assisted, Human-Controlled | ✅ PASS | Gemini is only a moderation fallback, not a decision-maker for business logic. |
| V. Test What Matters | ✅ PASS | The plan requires backend unit tests for moderation, rating recalculation, and SSE payloads with external APIs mocked. |

## Project Structure

### Documentation (this feature)

```text
specs/014-community-roadmap-reviews/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── roadmap/
│   │   │   ├── roadmap.model.js
│   │   │   ├── manualRoadmap.model.js
│   │   │   ├── roadmap.service.js
│   │   │   ├── roadmap.sse.js
│   │   │   └── roadmap.gemini.service.js
│   │   ├── notifications/
│   │   │   ├── notification.service.js
│   │   │   └── notification.sse.js
│   │   └── review/
│   │       ├── review.model.js
│   │       ├── review.service.js
│   │       ├── review.controller.js
│   │       ├── review.routes.js
│   │       ├── review.moderation.service.js
│   │       └── review.sse.js
│   └── app.js
└── tests/
    └── unit/
        └── review/

frontend/
├── src/
│   ├── features/
│   │   ├── skill-tree/
│   │   │   ├── CourseDetailPanel.jsx
│   │   │   ├── PublicRoadmapNodePanel.jsx
│   │   │   └── ReviewTab.jsx
│   │   └── general/
│   │       ├── Homepage.jsx
│   │       └── ReviewCarousel.jsx
│   └── services/
```

**Structure Decision**: Web application. The backend gets a new `review` module under `backend/src/modules/` following the existing module boundary pattern, and the frontend reuses the current skill-tree detail panel and homepage surfaces without new routes.

## Complexity Tracking

> No constitution violations require justification.
