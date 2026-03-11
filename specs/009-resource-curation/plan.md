# Implementation Plan: Resource Curation

**Branch**: `009-resource-curation` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-resource-curation/spec.md`

## Summary

Build the Resource Curation subsystem for UETCompass: three scheduled background crawlers that automatically gather, classify, and surface external learning data. **Capability 1** crawls Udemy, Coursera, YouTube, edX, freeCodeCamp, and Viblo (weekly) using Tavily Search + a three-layer free/paid classifier (platform default → keyword heuristic → Gemini fallback), writing to `skill_learning_resources`. **Capability 2** discovers public UET faculty slides, GitHub notes, and open academic documents (weekly) via Tavily + Gemini course-code mapping, writing to `academic_documents`. **Capability 3** crawls TopDev, ITviec, LinkedIn, and JobOKO job aggregate pages daily via Tavily Extract + Gemini parsing to produce per-skill job counts, salary ranges, and trend directions, writing to `market_trend_snapshots` and deriving per-course associations into `market_skills` (consumed by Feature 004). A lightweight frontend Market Insight page exposes the global trend ranking. All three crawlers run as `node-cron` in-process jobs (consistent with Feature 002), staggered by 1h to avoid Tavily rate-limit overlap.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `@tavily/core` (existing — shared with Feature 002), `@google/generative-ai` (existing — shared with Feature 002), `node-cron` (existing — same pattern as Feature 002), `express.js`, `mongoose 8`, `jsonwebtoken` (auth middleware)
- Frontend: React 18, React Router v6, Tailwind CSS (existing)

**Storage**: MongoDB Atlas free tier — new collections: `skill_learning_resources` (Feature 009 owns; Feature 004 reads), `academic_documents` (Feature 009 owns), `market_trend_snapshots` (Feature 009 owns), `market_skills` (Feature 009 owns; Feature 004 reads); read-only: `course_units` (Feature 002), `student_profiles` (Feature 001)
**Testing**: Jest 29 — unit tests only; Tavily, Gemini API, and MongoDB all mocked; no external services required to run tests
**Target Platform**: Backend → Render (Node.js web service, free tier, cold start ~50s); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express modular monolith (three cron jobs embedded in the same process)
**Performance Goals**: Crawl jobs are batch/background — no latency target; `GET /api/resource-curation/market-trends` response < 200ms (single indexed MongoDB query); Academic docs and skill resources endpoints < 150ms
**Constraints**: No Redis, no external queue — `node-cron` only; no new npm packages (reuses `@tavily/core` + `@google/generative-ai` from Feature 002); Gemini free-tier token minimization enforced (platform-default + keyword classifier runs first; Gemini invoked only for ambiguous free/paid classification and skill-to-course mapping); Tavily free-tier managed via sequential calls with 500ms delay between requests; three cron jobs staggered 1h apart to prevent concurrent Tavily saturation
**Scale/Scope**: UET-VNU students only; ~20–50 distinct skills in catalog; ~4–6 academic sources per course; 4 job boards × daily = ~4 Tavily Extract calls per day

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **I — Modular Monolithic**: All backend code lives in `backend/src/modules/resource-curation/`. Cross-module dependencies are: (1) `auth.middleware.js` from the middleware layer (not a domain module), (2) `CourseUnit.find()` called via a direct Mongoose model import from the `curriculum` module — acceptable as a read-only data dependency (no circular import, no mutation of `course_units`). No microservice split. No new top-level packages.
- [x] **II — UET-First**: Academic document crawler is scoped to UET-VNU faculty pages and UET-specific GitHub repos. Job board sources are Vietnamese/regional platforms (TopDev, ITviec as primary). Skill names are mapped to UET course codes from `course_units`. No abstraction for other universities.
- [x] **III — Privacy by Minimalism**: Feature crawls entirely public data — no student credentials, no student personal data. Collections store only resource metadata and aggregate market signals. No student-level data is collected or stored by this feature.
- [x] **IV — AI-Assisted, Human-Controlled**: Gemini is used for: (a) free/paid classification only when platform-default and keyword heuristics are insufficient, (b) skill-to-course mapping for academic documents. All Gemini outputs are validated against JSON schemas before any DB write. Students browse results passively — no Gemini recommendation is imposed on any student decision.
- [x] **V — Test What Matters**: Unit tests mandatory for: trend direction computation (`computeTrendDirection`), three-layer free/paid classifier (all three layers), crawl pipeline partial-failure handling (one source fails, rest continue), skill-to-course mapper (high vs. low confidence handling). All external dependencies (Tavily, Gemini, MongoDB) mocked.

## Project Structure

### Documentation (this feature)

```text
specs/009-resource-curation/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 7 technical decisions resolved
├── data-model.md        ← Phase 1: 4 collections + crawl state machine + log schema
├── quickstart.md        ← Phase 1: local dev setup + manual crawl trigger guide
├── contracts/
│   └── rest-api.md      ← Phase 1: 3 student endpoints + 1 admin trigger endpoint
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── resource-curation/
│           ├── shared/
│           │   ├── tavily.helper.js                  # Thin wrapper reusing @tavily/core (same pattern as curriculum/tavily.service.js)
│           │   └── gemini.helper.js                  # Thin wrapper reusing @google/generative-ai (same pattern as curriculum/gemini.service.js)
│           ├── learning-resources/
│           │   ├── learningResource.model.js          # Mongoose schema: skill_learning_resources
│           │   ├── resourceCrawler.service.js         # Tavily Search → classify free/paid → Gemini fallback → upsert
│           │   └── resourceCrawler.job.js             # node-cron weekly job (Sunday 02:00 UTC)
│           ├── academic-docs/
│           │   ├── academicDocument.model.js          # Mongoose schema: academic_documents
│           │   ├── docFinder.service.js               # Tavily Search UET pages + GitHub → Gemini course map → upsert
│           │   └── docFinder.job.js                   # node-cron weekly job (Sunday 03:00 UTC)
│           ├── market-trends/
│           │   ├── marketTrendSnapshot.model.js       # Mongoose schema: market_trend_snapshots
│           │   ├── marketSkill.model.js               # Mongoose schema: market_skills (read by Feature 004)
│           │   ├── trendCrawler.service.js            # Tavily Extract job boards → Gemini parse skills+salary
│           │   ├── trendAnalyzer.service.js           # Trend direction computation + market_skills derivation
│           │   └── trendCrawler.job.js                # node-cron daily job (01:00 UTC)
│           ├── resource-curation.controller.js        # Thin Express handlers for all 3 student endpoints
│           ├── resource-curation.routes.js            # /api/resource-curation/* + admin trigger guard
│           └── resource-curation.jobs.js              # Register all 3 cron jobs + manual triggerManually(capability)
└── tests/
    └── unit/
        └── resource-curation/
            ├── trendDirection.test.js                 # computeTrendDirection: increasing/stable/decreasing/first-run
            ├── freePaidClassifier.test.js             # Layer 1 (platform default), Layer 2 (keyword), Layer 3 (Gemini)
            ├── crawlPipeline.test.js                  # Partial failure: source skip does not abort job; partial results persisted
            └── courseMapper.test.js                   # mapDocumentToSkill: high confidence → courseCode, low → null

frontend/
└── src/
    └── features/
        └── resource-curation/
            ├── MarketInsightPage.jsx                  # Flat ranked skill list — skill name, job count, avg salary, trend arrow
            ├── useMarketTrends.js                     # Fetch hook: GET /api/resource-curation/market-trends
            └── resource-curation.api.js               # API client for all /api/resource-curation/* endpoints
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend; all crawl logic isolated in `backend/src/modules/resource-curation/` with clear sub-folders per capability. The `shared/` helpers are internal to this module only — they do not re-export the Feature 002 curriculum helpers (avoid hidden coupling). Frontend adds a single new page (`MarketInsightPage.jsx`) under the existing feature-folder convention.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
