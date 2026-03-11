# Implementation Plan: Advanced Tag-Based Search

**Branch**: `008-advanced-tag-search` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-advanced-tag-search/spec.md`

## Summary

Build an advanced search and discovery system that allows learners to explore the UETCompass ecosystem through AI-generated tags, enabling both tag-based click discovery and keyword-based search. The system traverses the relationship graph (Tag → Skill → Course → Roadmap) to return semantically related courses and roadmaps, organized into two distinct sections with 20-result pagination and relevance-based sorting. Search results highlight courses/roadmaps aligned with the user's current track as "Recommended for You". The search layer uses an indexed query (Elasticsearch or MongoDB full-text index) with graceful degradation to pre-cached fallback results if the search index becomes unavailable. Frontend supports filter combinations (Tag + Level + Domain) and result sorting without requerying. Personalization data (user's enrolled roadmap) is fetched once per session and reused across search instances.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, `elasticsearch` or built-in MongoDB `text` index (decided during Phase 1 research)
- Frontend: React 18, React Router v6, React Query (for caching search results)

**Storage**: MongoDB Atlas free tier — `skills` collection (with AI-generated tags), `courses` collection, `roadmaps` collection (all pre-existing), `search_cache` collection (for graceful degradation fallback data); user enrollment data read from `student_profiles.enrolledRoadmap`
**Testing**: Jest 29 — unit tests only; search index mocked; deduplication logic tested against mock Tag→Skill→Course→Roadmap graphs
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: 500ms p95 latency for search queries on 10,000-skill dataset; fallback results available within 100ms when index unavailable
**Constraints**: No Redis (MongoDB-only search index or Elasticsearch); free tier search solution preferred; must support future scaling to 50,000 skills with review of optimization strategy
**Scale/Scope**: All authenticated UET learners can search; discovery features available to all without per-user restrictions (but personalization highlighting for enrolled users)

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All search logic isolated in `backend/src/modules/search/`. Cross-module integration points: (1) reads from `skill` module's tags via Skill schema reference, (2) reads from `course` and `roadmap` modules' schemas, (3) calls `studentProfileService.getUserEnrolledRoadmap(userId)` via service layer — no direct cross-module imports. Module boundary strictly respected.
- [x] **UET-First**: Feature scope is exclusively for UET learners discovering UET curriculum via UET-generated tags. Tag schema and filter options (Level, Domain) are UET-specific concepts. No abstraction for other universities.
- [x] **Privacy**: Feature does not collect or store any student credentials or sensitive personal data. User's enrolled roadmap ID is read for personalization highlighting only — this data is already stored and managed by the onboarding/profile feature. No new credential handling introduced.
- [x] **AI-Assisted**: Tag content is produced by Feature 006 (AI Auto-Tagging System) and consumed (not generated) by this search feature. The search system does not call Gemini — it only queries and organizes existing tags. Relevance sorting may optionally use Gemini for ranking, but that is Phase 2+ scope. Current MVP uses TF-IDF or Elasticsearch relevance scoring.
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
│   │   │   ├── search.queryBuilder.js    # Build Mongoose queries or Elasticsearch DSL from filters
│   │   │   ├── search.dedup.js           # Deduplication logic: handle multi-path Tag→Skill→Course/Roadmap
│   │   │   ├── search.cache.js           # Cache/fallback management, seed initial cache
│   │   │   ├── search.index.js           # Search index initialization (Mongoose text index or Elasticsearch)
│   │   │   ├── search.personalization.js # Load user's enrolled roadmap, highlight logic
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
            ├── pagination.test.js        # Pagination boundaries, page overflow, empty pages
            ├── fallback.test.js          # Graceful degradation: index unavailable → cache served
            └── personalization.test.js   # Enrolled roadmap highlighting, missing enrollment
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

**Structure Decision**: Option 2 — Web application. Modular monolith backend; all search logic isolated in `modules/search/`. Reads (no writes) from existing `skill`, `course`, `roadmap` modules via Mongoose schema references. Frontend uses feature-folder structure mirroring backend module. React Query handles client-side search result caching and pagination state.
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
## Complexity Tracking

No Constitution violations — complexity tracking table not required.

---

## Phase 0: Research & Technical Decisions

### Key Unknowns to Resolve

1. **Search Index Technology**: MongoDB native text index vs. Elasticsearch vs. in-memory Filter? (Trade-off: simplicity vs. performance)
2. **Deduplication Algorithm**: Efficient dedup for Tag→Skill→Course/Roadmap multi-path traversal on 10K-50K scale
3. **Personalization Data Flow**: How/when to load user's enrolled roadmap for highlighting (cache in session vs. fetch per-query)
4. **Relevance Scoring Strategy**: TF-IDF, Elasticsearch BM25, or simple match-count for MVP?
5. **Fallback Cache Refresh**: How often to rebuild pre-cached fallback data (daily? on-demand? event-driven from FEAT-006)?

### Research Tasks

- Research MongoDB text indexing vs. Elasticsearch for 50K+ scale
- Benchmark deduplication algorithms on mock graphs (1K, 10K, 50K edges)
- Design graceful degradation fallback (cache structure, refresh strategy)
- Survey relevance scoring approaches compatible with free tier

**Research Output**: `research.md` — technology choices locked, rationale documented

---

## Phase 1: Design & Data Modeling

### Deliverables

1. **data-model.md**: 
   - SearchQuery, SearchResponse, PaginationMeta schemas
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
   - Add search index technology choice (Elasticsearch or MongoDB text) to context
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
