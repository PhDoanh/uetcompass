# Implementation Plan: Resource Curation

**Branch**: `003-resource-curation` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-resource-curation/spec.md`

## Summary

Build the Resource Curation subsystem as a new `scraping` module in the backend monolith. The module runs three scheduled background jobs via `node-cron`: (1) a weekly learning-resource crawler that queries Udemy's public REST API, Coursera's public API, and the YouTube Data API v3 per skill and upserts results into a `learning_resources` MongoDB collection; (2) a weekly academic-document finder that scrapes UET faculty pages and GitHub for publicly accessible slides/syllabi, uses Gemini to infer skill associations (validated against JSON schema before persistence), and upserts results into `academic_documents`; (3) a daily market-trend tracker that scrapes job counts and salary signals from TopDev, ITviec, LinkedIn, and JobOKO via HTTP + cheerio, stores daily snapshots in `skill_trend_snapshots` (30-day TTL), and computes ±10% trend direction relative to the 7-day-ago baseline. Three read-only REST endpoints expose the collected data to the React frontend with no computation at read time.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `node-cron` (existing), `@google/generative-ai` (existing), `cheerio` (new — HTML parsing for job board scrapers), `node-fetch` (existing or built-in); YouTube Data API v3 via plain HTTP (`YOUTUBE_API_KEY`)
- Frontend: React 18, React Router v6 — no new packages

**Storage**: MongoDB Atlas free tier — 3 new collections: `learning_resources`, `academic_documents`, `skill_trend_snapshots`; reads `skills` collection (owned by Roadmap module)
**Testing**: Jest 29 — unit tests for skill-mapping/inference logic (constitution mandate), crawl pipeline (partial-failure handling), trend ±10% computation, free/paid classifiers
**Target Platform**: Backend → Render (free tier, Node.js web service); Frontend → Vercel
**Project Type**: Web application — Node.js/Express modular monolith (backend) + React SPA (frontend)
**Performance Goals**: All three read endpoints served from pre-computed/stored data — no aggregation at read time → p95 < 150ms per endpoint. Crawl jobs run off-hours; runtime budget: resource crawl ≤ 10 min/week, market crawl ≤ 10 min/day for 150 skills.
**Constraints**: No Redis/external queue — `node-cron` only; no Playwright for Capability 1 (public APIs used instead); one new npm package (`cheerio`) only; `YOUTUBE_API_KEY` stays within 10,000 units/day free quota; no Gemini calls for free/paid classification — deterministic per-source rules used instead
**Scale/Scope**: UET-VNU students only; ~50–150 skills in catalog; 30-day rolling snapshot retention (~4,500 documents max in `skill_trend_snapshots`)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All new code lives in `backend/src/modules/scraping/` — the `scraping` module is a first-class domain boundary explicitly listed in the constitution ("auth, curriculum, roadmap, scraping, recommendation"). No cross-module direct imports: the `scraping` module reads the `skills` collection via its own `skillCatalog.service.js` accessor; it does not import from the `roadmap` module. Frontend feature components are self-contained under `features/resources/`.
- [x] **UET-First**: Academic Finder targets UET-VNU official sources exclusively (FR-009); Vietnamese job boards (TopDev, ITviec, JobOKO) are prioritized; skill catalog is UET-specific. No abstraction or generalization for other universities introduced.
- [x] **Privacy by Minimalism**: This feature collects only public external data — no student credentials, no grades, no UET portal sessions. `LearningResource`, `AcademicDocument`, and `SkillTrendSnapshot` contain zero student PII. Privacy principle is fully satisfied.
- [x] **AI-Assisted, Human-Controlled**: Gemini is used only for skill-to-document inference (the parse/transform role explicitly authorized in the constitution). Gemini output is validated against a strict JSON schema (`{ skillId, confidence }`) before any persistence — no blind trust. Free/paid classification uses deterministic per-source rules with no Gemini involvement (R-004). Free tier: one Gemini call per academic document per weekly run — token usage is minimal.
- [x] **Test What Matters**: Unit tests mandatory for: skill-mapping/inference logic (`skillInference.service.js` — explicitly named in constitution), crawl pipeline partial-failure handling (one source down → job continues), trend ±10% computation (boundary values), and per-source free/paid classifiers (`classifyFree`). All external APIs (YouTube, Udemy, Coursera, job boards, Gemini) are mocked in tests.

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
│           │   ├── udemy.adapter.js              # Udemy public REST API → LearningResource[]
│           │   ├── coursera.adapter.js           # Coursera public API → LearningResource[]
│           │   ├── youtube.adapter.js            # YouTube Data API v3 → LearningResource[]
│           │   ├── edx.adapter.js                # edX course discovery API → LearningResource[]
│           │   ├── freecodecamp.adapter.js        # freeCodeCamp content (always free)
│           │   ├── viblo.adapter.js              # Viblo API → LearningResource[]
│           │   ├── uetSite.adapter.js            # UET faculty pages (HTTP+cheerio) → AcademicDocument[]
│           │   ├── github.adapter.js             # GitHub search API → AcademicDocument[]
│           │   ├── topdev.adapter.js             # TopDev (HTTP+cheerio) → SkillJobData
│           │   ├── itviec.adapter.js             # ITviec (HTTP+cheerio) → SkillJobData
│           │   ├── linkedin.adapter.js           # LinkedIn jobs (HTTP+cheerio) → SkillJobData
│           │   └── joboko.adapter.js             # JobOKO (HTTP+cheerio) → SkillJobData
│           ├── services/
│           │   ├── resourceCrawler.service.js    # Cap.1: per-skill loop, dedup upsert
│           │   ├── academicFinder.service.js     # Cap.2: UET + GitHub crawl, Gemini inference
│           │   ├── marketTracker.service.js      # Cap.3: job count + salary + trend direction
│           │   └── skillInference.service.js     # Gemini skill-to-doc inference + schema validation
│           ├── routes/
│           │   ├── resource.routes.js            # GET /api/resources/skills/:skillId
│           │   │                                  # GET /api/resources/academic/:skillId
│           │   └── market.routes.js              # GET /api/market/trends
│           ├── controllers/
│           │   ├── resource.controller.js        # Thin handlers, delegate to service/model
│           │   └── market.controller.js
│           ├── routes/
│           │   └── scraping.routes.js            # POST /api/scraping/trigger/:capability (dev only)
│           ├── skillCatalog.service.js           # getActiveSkills() — reads skills collection
│           ├── scraping.job.js                   # node-cron registrations (cap.1+2 weekly, cap.3 daily)
│           └── scraping.config.js               # API keys, base URLs, schedule strings
└── tests/
    └── unit/
        └── scraping/
            ├── skillInference.service.test.js   # Gemini inference + schema validation
            ├── resourceCrawler.pipeline.test.js  # Per-skill loop: dedup, partial failure, unavailable URL
            ├── marketTracker.trend.test.js       # ±10% boundary values, zero postings, missing baseline
            ├── classifyFree.test.js              # Per-source free/paid rules (all platforms)
            └── adapters/
                └── [adapter].adapter.test.js    # HTML parsing tests per job board (mocked responses)

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
