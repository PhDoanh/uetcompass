# Implementation Plan: Advanced Tag-Based Search

**Branch**: `008-advanced-tag-search` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-advanced-tag-search/spec.md`

## Summary

Build an advanced search and discovery system that allows learners to explore the UETCompass ecosystem through AI-generated tags, enabling both tag-based click discovery and keyword-based search. The system traverses the relationship graph (Tag → Skill → Course → Roadmap) to return semantically related courses and roadmaps, organized into two distinct sections with 20-result pagination and relevance-based sorting. Search results highlight courses/roadmaps aligned with the user's current track as "Recommended for You". The search layer is locked to MongoDB native text index for MVP, with graceful degradation to pre-cached fallback results if the index becomes unavailable. Search input accepts `tagId` or `tagNormalizedName`, then normalizes to canonical `tagId` before execution. Frontend supports filter combinations (Tag + Level + Domain) and result sorting without changing search intent. Personalization data (user's enrolled roadmap) is fetched once per session and reused across search instances.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, MongoDB native `text` index (`$text`, `$meta: "textScore"`)
- Frontend: React 18, React Router v6, React Query (for caching search results)

**Storage**: MongoDB Atlas free tier — `skills` collection (with AI-generated tags), `courses` collection, `roadmaps` collection (all pre-existing), `search_cache` collection (for graceful degradation fallback data); user enrollment data read from `student_profiles.enrolledRoadmap`
**Testing**: Jest 29 — unit tests only; search index mocked; deduplication logic tested against mock Tag→Skill→Course→Roadmap graphs
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: 500ms p95 latency for search queries on 10,000-skill dataset; fallback results available within 100ms when index unavailable
**Constraints**: No Redis; MongoDB-only search index in MVP; canonical SkillTag contract shared with FEAT-006; must support future scaling to 50,000 skills with optimization review
**Scale/Scope**: All authenticated UET learners can search; discovery features available to all without per-user restrictions (but personalization highlighting for enrolled users)

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All search logic isolated in `backend/src/modules/search/`. Cross-module integration points: (1) reads from `skill` module's tags via Skill schema reference, (2) reads from `course` and `roadmap` modules' schemas, (3) calls `studentProfileService.getUserEnrolledRoadmap(userId)` via service layer — no direct cross-module imports. Module boundary strictly respected.
- [x] **UET-First**: Feature scope is exclusively for UET learners discovering UET curriculum via UET-generated tags. Tag schema and filter options (Level, Domain) are UET-specific concepts. No abstraction for other universities.
- [x] **Privacy**: Feature does not collect or store any student credentials or sensitive personal data. User's enrolled roadmap ID is read for personalization highlighting only — this data is already stored and managed by the onboarding/profile feature. No new credential handling introduced.
- [x] **AI-Assisted**: Tag content is produced by Feature 006 (AI Auto-Tagging System) and consumed (not generated) by this search feature. The search system does not call Gemini — it only queries and organizes existing tags. Current MVP uses MongoDB `textScore` (BM25) with canonical `Skill.tags` metadata.
- [x] **Test What Matters**: Unit tests mandatory for: deduplication logic (handling Tag→Skill→Course→Roadmap multi-path traversal), filter combination logic (AND/OR semantics), fallback/graceful-degradation activation, and pagination boundary cases. Search index setup and query mechanics can be integration-tested; unit tests focus on business logic (dedup, filtering, fallback rules).

## Project Structure

### Documentation (this feature)

```text
specs/008-advanced-tag-search/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: search index technology choice, deduplication strategy, personalization data flow
├── data-model.md        ← Phase 1: Search request/response schemas, Tag-Skill-Course-Roadmap entity relationships, cache schema
├── quickstart.md        ← Phase 1: local dev setup, test data seed (10K skills), manual search flow guide
├── contracts/
│   └── rest-api.md      ← Phase 1: search query API, filter API, personalization API contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

#### Backend

```text
backend/
├── src/
│   ├── modules/
│   │   ├── search/
│   │   │   ├── search.controller.js      # Express handlers: POST /search/query, GET /search/filters
│   │   │   ├── search.routes.js          # Route definitions + auth middleware
│   │   │   ├── search.service.js         # Query execution, deduplication, pagination, sorting
│   │   │   ├── search.queryBuilder.js    # Build canonical Mongoose queries from normalized input + filters
│   │   │   ├── search.normalizer.js      # Resolve tagNormalizedName/tagId -> canonical tagId
│   │   │   ├── search.dedup.js           # Deduplication logic: handle multi-path Tag→Skill→Course/Roadmap
│   │   │   ├── search.cache.js           # Cache/fallback management, seed initial cache
│   │   │   ├── search.index.js           # MongoDB text index initialization and health checks
│   │   │   ├── search.personalization.js # Load user's enrolled roadmap, highlight logic
│   │   │   ├── search.validation.js      # Request contract validation + canonical error mapping
│   │   │   └── search.logger.js          # Query logging + performance metrics
│   │   ├── skill/                         # Referenced (read-only) — provide tags
│   │   │   └── skill.model.js            # Skill schema with tags array + confidence
│   │   ├── course/                        # Referenced (read-only) — courses to return
│   │   │   └── course.model.js           # Course schema + skillIds relations
│   │   └── roadmap/                       # Referenced (read-only) — roadmaps to return
│   │       └── roadmap.model.js          # Roadmap schema + courseIds relations
│   ├── middleware/
│   │   └── auth.middleware.js            # JWT verify → attaches req.user.userId (shared)
│   └── app.js                            # Express bootstrap + route mounting
└── tests/
    └── unit/
        └── search/
            ├── dedup.test.js             # Deduplication: multi-path traversal, duplicate trimming
            ├── filter.test.js            # Filter combinations: Tag AND Level, inclusive/exclusive
            ├── normalizer.test.js        # tagId/tagNormalizedName normalization and conflict validation
            ├── pagination.test.js        # Pagination boundaries, page overflow, empty pages
            ├── fallback.test.js          # Graceful degradation: index unavailable → cache served
            ├── personalization.test.js   # Enrolled roadmap highlighting, missing enrollment
            └── errors.test.js            # Standardized error envelope and error codes
```

#### Frontend

```text
frontend/
├── src/
│   ├── features/
│   │   └── search/
│   │       ├── SearchPage.jsx            # Main search page layout: search form + results sections
│   │       ├── SearchBar.jsx             # Input field + tag/keyword switch
│   │       ├── TagCloud.jsx              # Display clickable tags (from Skill data)
│   │       ├── FilterBar.jsx             # Combined filters: Tag, Level, Domain dropdowns
│   │       ├── ResultsSection.jsx        # Split display: Related Courses + Related Roadmaps
│   │       ├── CourseCard.jsx            # Course result item with tags, level, highlight badge
│   │       ├── RoadmapCard.jsx           # Roadmap result item with included courses, highlight badge
│   │       ├── Pagination.jsx            # Paginate results (20 per page), prev/next buttons
│   │       ├── SortSelector.jsx          # Relevance vs. Alphabetical sort dropdown
│   │       ├── NoResults.jsx             # Empty state + suggested filter alternatives
│   │       ├── useSearch.js              # Hook: query builder, React Query (caching), result fetch
│   │       ├── usePersonalization.js     # Hook: fetch user's enrolled roadmap, highlight logic
│   │       └── search.api.js             # Fetch wrappers: POST /api/search/query, GET /api/search/filters
│   └── components/
│       └── SearchResultBadge.jsx         # "Recommended for You" badge component (reusable)
```

**Structure Decision**: Web application (React SPA + Node/Express modular monolith). All search logic remains isolated in `modules/search/`. Reads (no writes) from existing `skill`, `course`, `roadmap` modules via Mongoose references and canonical `Skill.tags` shape shared with FEAT-006.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.

---

## Phase 0: Research & Technical Decisions

### Technical Decisions Locked

1. **Search Index Technology**: MongoDB native text index is locked for MVP. Elasticsearch is deferred to a later phase.
2. **Deduplication Algorithm**: Set/Map-based deduplication across Tag→Skill→Course→Roadmap is locked.
3. **Personalization Data Flow**: Fetch enrolled roadmap once per session and cache via React Query.
4. **Relevance Scoring Strategy**: MongoDB `textScore` (BM25) is locked for MVP.
5. **Fallback Cache Refresh**: Startup seed + scheduled refresh every 6 hours is locked.
6. **Input Canonicalization**: Accept `tagId`/`tagNormalizedName`; normalize to canonical `tagId` before query execution.
7. **Error Contract**: Standard envelope `{ error: { code, message, details? } }` is locked for all endpoints.

**Research Output**: `research.md` — decisions finalized (no unresolved infrastructure choice in MVP)

---

## Phase 1: Design & Data Modeling

### Deliverables

1. **data-model.md**: 
   - SearchQueryRequest, SearchResponse, PaginationMeta, ErrorResponse schemas
   - Tag-Skill-Course-Roadmap relationship documentation
   - SearchCache schema (for fallback data)

2. **contracts/rest-api.md**:
   - `POST /api/search/query` (with filters, pagination params)
   - `GET /api/search/filters` (fetch available filter values: tag list, level options, domain options)
   - `GET /api/search/personalization` (fetch user's enrolled roadmap ID)

3. **quickstart.md**:
   - Local dev setup (MongoDB seed 10K skills + courses + roadmaps)
   - Manual test flows (click tag, enter keyword, apply filters, paginate)
   - curl examples for each API endpoint

4. **Agent Context Update**:
   - Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`
   - Add finalized search index technology choice (MongoDB text index for MVP) to context
   - Document Mongoose query patterns for multi-table traversal

---

## Phase 1: Constitution Re-check

After design phase completes:
- [ ] Modular isolation verified: search module has no direct cross-imports
- [ ] UET-first scope confirmed: all filter options and relationship assumptions are UET-specific
- [ ] Privacy rules enforced: only reads user's enrolledRoadmap ID (no new credential collection)
- [ ] AI-assisted confirmed: no Gemini calls during MVP search (tags are pre-existing from FEAT-006)
- [ ] Test coverage planned: unit tests cover dedup, filtering, fallback, pagination

---

## Phase 2: Task Generation

After Phase 1 design completes, run `/speckit.tasks` to generate the actionable task breakdown with:
- Backend API implementation (search.service, query builder, dedup logic)
- Frontend UI implementation (components, hooks, React Query integration)
- Test suite implementation (unit tests for all complexity areas)
- Documentation (API contracts, local setup guide, data model)
- Deployment checklist (index setup, cache seed, monitoring alerts)
