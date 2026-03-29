# Implementation Plan: Resource Curation

**Branch**: `003-resource-curation` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-resource-curation/spec.md`

## Summary

Build the Resource Curation subsystem as a new `scraping` module in the backend monolith. The module runs three scheduled background jobs via `node-cron`, all using **Tavily Search API** as the unified web discovery layer: 

1. **Academic Material Finder** (Cap.1): Crawls each active RoadmapNode's `courseName` via Tavily (course name only — **NO StudentProfile**). Stores results with Gemini-inferred optional skill associations in `academic_documents`. Results are identical for all students.

2. **Market Trend Tracker** (Cap.2): Queries Tavily using RoadmapNode.`courseName` COMBINED WITH StudentProfile personalization data (major, careerGoal.role, careerGoal.companyType) — **ONLY this capability uses StudentProfile**. Extracts trending skill mentions, stores daily snapshots in `skill_trend_snapshots` with jobCount + trend direction + `skillName`. Results are personalized per student's career goals.

3. **Learning Resource Crawler** (Cap.3): Queries Tavily per extracted `skillName` from SkillTrendSnapshot (skill name only — **NO StudentProfile, NO courseName**). Upserts results into `learning_resources` with free/paid classification. Results are identical for all students interested in that skill.

Three read-only REST endpoints expose the collected data to the React frontend with no computation at read time.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)  
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `node-cron` (existing), `@google/generative-ai` (existing), `axios` (for Tavily), `cheerio` (new — HTML parsing if needed for fallback)
- Frontend: React 18, React Router v6 — no new packages
- External: **Tavily Search API** (free tier: 100 searches/month; `TAVILY_API_KEY` env var)

**Feature Dependencies**: Feature 009 (RoadmapNodeSchema), Feature 001 (StudentProfile)

**Storage**: MongoDB Atlas free tier — 3 new collections: `academic_documents`, `skill_trend_snapshots`, `learning_resources`; reads `roadmap_nodes` (Feature 009), `student_profiles` (Feature 001), and optionally `skills` (Feature 004)
**Testing**: Jest 29 — unit tests for skill-mapping/inference logic (constitution mandate), crawl pipeline (partial-failure handling), trend ±10% computation, free/paid classifiers
**Target Platform**: Backend → Render (free tier, Node.js web service); Frontend → Vercel
**Project Type**: Web application — Node.js/Express modular monolith (backend) + React SPA (frontend)
**Performance Goals**: All three read endpoints served from pre-computed/stored data — no aggregation at read time → p95 < 150ms per endpoint. Crawl jobs run off-hours; runtime budget: resource crawl ≤ 10 min/week, market crawl ≤ 10 min/day for 150 skills.
**Constraints**: No Redis/external queue — `node-cron` only; no Playwright for Capability 1 (public APIs used instead); one new npm package (`cheerio`) only; `YOUTUBE_API_KEY` stays within 10,000 units/day free quota; no Gemini calls for free/paid classification — deterministic per-source rules used instead
**Scale/Scope**: UET-VNU students only; ~50–150 skills in catalog; 30-day rolling snapshot retention (~4,500 documents max in `skill_trend_snapshots`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All new code lives in `backend/src/modules/scraping/` — the `scraping` module is a first-class domain boundary. No cross-module direct imports: the `scraping` module reads `roadmap_nodes` collection via its own `nodesCatalog.service.js` accessor; does not import from the `roadmap` module (Feature 009).
- [x] **UET-First**: Academic Finder targets UET-VNU official sources exclusively (FR-003); Vietnamese job boards (TopDev, ITviec, JobOKO) are prioritized; roadmap structure is UET-specific. No abstraction for other universities introduced.
- [x] **Privacy by Minimalism**: This feature collects only public external data — no student credentials, no grades, no roadmap progress tracking. `AcademicDocument`, `SkillTrendSnapshot`, and `LearningResource` contain zero student PII. Privacy principle fully satisfied.
- [x] **AI-Assisted, Human-Controlled**: Gemini is used only for skill inference on academic documents (parse/transform role). Gemini output is validated against strict JSON schema before persistence — no blind trust. Free/paid classification uses deterministic per-source rules with no Gemini involvement (R-004).
- [x] **Test What Matters**: Unit tests mandatory for: skill-extraction-from-job-postings logic (Regex patterns), crawl pipeline partial-failure handling, trend ±10% computation, and per-source free/paid classifiers. All external APIs (job boards, learning platforms, Gemini) are mocked in tests.

## Project Structure

### Documentation (this feature)

```text
specs/003-resource-curation/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 7 technical decisions resolved
├── data-model.md        ← Phase 1: 3 new collections + Skill interface contract
├── quickstart.md        ← Phase 1: local dev setup + 5 manual test scenarios
├── contracts/
│   └── rest-api.md      ← Phase 1: 3 read endpoints + 1 dev-trigger endpoint
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── scraping/
│           ├── models/
│           │   ├── learningResource.model.js     # learning_resources collection
│           │   ├── academicDocument.model.js     # academic_documents collection
│           │   └── skillTrendSnapshot.model.js   # skill_trend_snapshots collection (TTL index)
│           ├── adapters/
│           │   └── tavily.adapter.js             # Unified Tavily Search API adapter (3 search modes):
│           │       # - academicSearch(courseName) → AcademicDocument[]
│           │       # - trendSearch(courseName, personalizationContext) → SkillJobData for SkillTrendSnapshot
│           │       # - resourceSearch(skillName) → LearningResource[]
│           ├── services/
│           │   ├── academicFinder.service.js     # Cap.1: per-RoadmapNode Tavily academic search, Gemini inference
│           │   ├── marketTracker.service.js      # Cap.2: per-RoadmapNode Tavily trend search (with personalization), skill extraction
│           │   ├── resourceCrawler.service.js    # Cap.3: per-SkillTrendSnapshot Tavily resource search, dedup & upsert
│           │   ├── skillInference.service.js     # Gemini/Regex skill extraction + schema validation
│           │   ├── personalizationContext.service.js  # NEW: Enrich Tavily queries with StudentProfile data (major, careerRole, companyType)
│           │   └── studentCatalog.service.js     # NEW: Fetch StudentProfile by studentId for personalization context
│           ├── routes/
│           │   ├── academic.routes.js            # GET /api/academic/:roadmapNodeId
│           │   ├── trends.routes.js              # GET /api/trends/:roadmapNodeId
│           │   └── resources.routes.js           # GET /api/resources/:skillTrendSnapshotId or /:skillName
│           ├── controllers/
│           │   ├── academic.controller.js        # Thin handlers for academic endpoints
│           │   ├── trends.controller.js          # Thin handlers for trends endpoints
│           │   └── resources.controller.js       # Thin handlers for resources endpoints
│           ├── nodesCatalog.service.js           # getActiveRoadmapNodes() — reads roadmap_nodes collection
           ├── scraping.job.js                   # node-cron registrations: Cap.1 (weekly academic Tavily) → Cap.2 (weekly trend Tavily + personalization) → Cap.3 (daily resource Tavily)
           └── scraping.config.js                # TAVILY_API_KEY, Gemini API key, schedule strings
└── tests/
    └── unit/
        └── scraping/
            ├── skillExtraction.service.test.js      # Regex skill extraction from job postings
            ├── resourceCrawler.pipeline.test.js      # Per-skill loop: dedup, partial failure
            ├── marketTracker.trend.test.js           # ±10% trend computation (with personalization)
            ├── personalizationContext.test.js        # StudentProfile → Tavily query enrichment
            ├── tavily.adapter.test.js                # Tavily API mocked responses (academic, trend, resource)
            └── adapters/
                └── [adapter].adapter.test.js        # (Deprecated — use tavily.adapter.test.js)

frontend/
├── src/
│   ├── features/
│   │   └── resources/
│   │       ├── SkillResources.jsx           # Resource list section on skill detail page
│   │       ├── ResourceCard.jsx             # Single resource entry (title, platform, type, free/paid badge)
│   │       ├── AcademicMaterials.jsx        # Academic docs section on skill/course page
│   │       ├── AcademicDocumentItem.jsx     # Single document entry (title, source type, doc type)
│   │       ├── MarketInsight.jsx            # /market-insight page — ranked skill list
│   │       ├── SkillTrendItem.jsx           # Single trend row (name, count, salary, trend arrow)
│   │       └── resources.api.js             # Fetch wrappers: getSkillResources(), getAcademicDocs(), getTrends()
│   └── guards/
│       └── AuthGuard.jsx                   # Shared — wraps /market-insight route (no changes needed)
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with all new code isolated in `backend/src/modules/scraping/` — the pre-defined scraping boundary in the constitution. Frontend uses feature-folder structure under `features/resources/`, consistent with `features/progress/` established in Feature 007. No new top-level directories introduced.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
