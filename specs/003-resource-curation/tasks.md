# Tasks: Resource Curation (003-resource-curation)

**Feature**: Resource Curation  
**Spec**: [spec.md](spec.md)  
**Plan**: [plan.md](plan.md)  
**Data Model**: [data-model.md](data-model.md)  
**Generated**: 2026-03-29  
**Status**: Ready for implementation

---

## Implementation Strategy

This feature is implemented in **3 sequential user story phases** (US1, US2, US3) following source data dependencies:
1. **US1** (P1): Academic Material Finder — foundational crawl by course name only
2. **US2** (P2): Market Skill Trend Tracker — processes course + StudentProfile, generates trending skills  
3. **US3** (P3): Learning Resource Crawler — depends on US2's SkillTrendSnapshot.skillName output

**Execution Order** (crawl sequence: Academic → Market Trends → Learning Resources):
- Academic Materials: Crawls RoadmapNode.`courseName` only (NO personalization) → AcademicDocument
- Market Trends: Crawls RoadmapNode.`courseName` + StudentProfile (ONLY US2 uses personalization) → SkillTrendSnapshot
- Learning Resources: Crawls SkillTrendSnapshot.`skillName` only (NO personalization) → LearningResource

**Terminology Consolidation**:

| User Story | Capability | Priority | Input | Output |
|---|---|---|---|---|
| **US1** | **Cap.1** | **P1** | RoadmapNode.courseName | AcademicDocument |
| **US2** | **Cap.2** | **P2** | RoadmapNode.courseName + StudentProfile | SkillTrendSnapshot |
| **US3** | **Cap.3** | **P3** | SkillTrendSnapshot.skillName | LearningResource |

**Parallel Opportunities**:
- Within US1: Models, adapter, controller/routes, tests can be implemented in parallel (different files)
- Within US2: Models, services, controller/routes, tests can be implemented in parallel
- Within US3: Models, services, controller/routes, tests can be implemented in parallel
- Frontend components per story can start after corresponding backend API is available

---

## Phase 1: Setup & Foundational Infrastructure

### Setup: Project Initialization

- [x] T001 Create backend scraping module directory structure: `backend/src/modules/scraping/{adapters,controllers,routes,services,models,__tests__}` per `plan.md` outline
- [x] T002 Create frontend resources feature directory: `frontend/src/features/resources/` with subdirectories for components and API service layer
- [x] T003 Add `TAVILY_API_KEY` environment variable to `backend/.env.example` and document in quickstart.md
- [x] T004 Update `backend/.env` with Tavily API key for local development
- [x] T005 Install backend dependencies: `npm install axios` (for Tavily HTTP client) in `backend/package.json`
- [x] T006 Update MongoDB schema: Create TTL index on `skill_trend_snapshots.expiresAt` field (30-day expiry per data-model.md)

### Foundational: Data Models & Core Adapter

- [x] T007 [P] Create `backend/src/modules/scraping/models/academicDocument.model.js` with schema per data-model.md (roadmapNodeId FK, skillId, title, url, sourceType, documentType, courseName, inferenceConfidence, isVisible, timestamps, indexes)
- [x] T008 [P] Create `backend/src/modules/scraping/models/skillTrendSnapshot.model.js` with schema per data-model.md (roadmapNodeId FK, skillName, skillId, personalizationContext, jobCount, jobCountTrend, averageSalaryRange, snapshotDate, contributingSources, TTL index)
- [x] T009 [P] Create `backend/src/modules/scraping/models/learningResource.model.js` with schema per data-model.md (skillTrendSnapshotId FK, skillName, roadmapNodeId, title, url, sourcePlatform, resourceType, isFree, qualitySignal, isAvailable, timestamps, dedup indexes)
- [x] T010 [P] Create `backend/src/modules/scraping/adapters/tavily.adapter.js` with three search methods:
  - `academicSearch(courseName)` → returns titles, URLs, sources for academic materials
  - `trendSearch(courseName, personalizationContext)` → returns job board snippets with skill mentions
  - `resourceSearch(skillName)` → returns learning resource results
  - Each method calls Tavily API with `TAVILY_API_KEY` and formats response per spec
- [x] T011 [P] Create `backend/src/modules/scraping/models/nodesCatalog.service.js` with `getActiveRoadmapNodes()` method that queries `roadmap_nodes` collection with `isActive: true`, returns `{_id, courseName}`
- [x] T012 [P] Create `backend/src/modules/scraping/__tests__/tavily.adapter.test.js` with unit tests for all three search methods using mocked Tavily API responses; verify correct query construction and response parsing

---

## Phase 2: User Story 1 — Academic Material Finder (Priority P1)

**Capability 1**: For each course (RoadmapNode), crawl UET-related academic materials via Tavily, classify source type, link to skills via Gemini inference.

**Goal**: Display academic materials (lecture slides, notes, syllabi, exercises) organized by course to all students uniformly.

**Independent Test Criteria**:
- [x] Can navigate to a course page and see a list of academic materials with items from ≥2 sources
- [x] Each material shows title, source type (UET official / GitHub / external), document type badge (slide/note/syllabus/exercise)
- [x] Source ranking applied correctly (UET official prioritized first)
- [x] No duplicate material URLs appear in list
- [x] Optional skill labels shown if Gemini inferred with medium+ confidence
- [x] Empty state message shown if no materials collected yet

### US1 — Backend Implementation

- [x] T013 [P] [US1] Create `backend/src/modules/scraping/services/academicFinder.service.js` with main crawl logic:
  - `crawlAcademicMaterialsPerNode(roadmapNodes)` loops over active `roadmapNodes` (input from Feature 009)
  - For each node, extract `courseName` and call `tavily.adapter.academicSearch(courseName)` with query: `"{courseName} slides lecture notes UET education"`
  - Classify sourceType based on domain/source:
    - `uet.vnu.edu.vn` or UET GitHub repos (github.com/uet-*) → "uet_official"
    - `github.com` (non-UET) → "github"
    - All others → "external"
  - Detect documentType from URL keywords + title:
    - "slide" / ".pptx" / ".key" → "slide"
    - "note" / "lecture" / "notes" → "lecture_note"
    - "syllabus" / "giáo trình" / "curriculum" → "syllabus"
    - "homework" / "exercise" / "bài tập" → "exercise"
    - Default: "other"
  - Call Gemini to infer optional skill association: send document {title, URL, snippet}; store skillId only if confidence ≥ "medium", set isVisible = true; if confidence < medium, set isVisible = false
  - Deduplicate by {url, roadmapNodeId} using upsert (idempotent, timestamp updated on re-crawl)
  - Handle errors gracefully: if Tavily fails, skip node and continue; if Gemini fails, store without skillId but isVisible still true
  - Return summary: `{roadmapNodeId, courseName, documentsFound: count}`
- [x] T014 [P] [US1] Create `backend/src/modules/scraping/controllers/academic.controller.js` with endpoint:
  - `getAcademicByNode(req, res)` — GET handler returning academic materials for a course node
  - Query `academic_documents` collection with `{roadmapNodeId: req.params.nodeId, isVisible: true}` filter
  - Sort results by sourceType priority: uet_official (first) → github → external (last)
  - Return format per rest-api.md: `{roadmapNodeId, courseName, documentCount, documents: [...]}`
- [x] T015 [P] [US1] Create `backend/src/modules/scraping/routes/academic.routes.js` with:
  - `GET /api/academic/node/:roadmapNodeId` → calls controller handler, returns academic materials per rest-api.md contract
  - Auth middleware required (Bearer token)
  - Error responses: 401 (unauthorized), 404 (node not found), 500 (server error)
- [x] T016 [P] [US1] Create `backend/src/modules/scraping/__tests__/academicFinder.service.test.js` with unit tests:
  - Verify sourceType classification: UET official domains detected correctly, GitHub detected, external mapped
  - Verify documentType detection from URLs and titles (exact keyword matching)
  - Verify Gemini skill inference with confidence thresholds (medium+ visible, low hidden)
  - Verify deduplication by {url, roadmapNodeId} (same material crawled twice = stored once, timestamp updated)
  - Verify partial failure handling: Tavily succeeds + Gemini fails → document stored without skillId but isVisible = true
  - Verify error recovery (node without results doesn't crash loop)
- [x] T017 [P] [US1] Create `backend/src/modules/scraping/__tests__/academic.routes.test.js` with integration tests:
  - GET /api/academic/node/{nodeId} returns visible documents only, sorted by sourceType priority
  - Verify auth middleware: 401 if no Bearer token, success with valid token
  - Verify with empty result set (no documents for node, returns empty array not 404)
  - Verify source type ordering in response (UET official first)

### US1 — Frontend Implementation

- [x] T018 [P] [US1] Create `frontend/src/features/resources/resources.api.js` with API wrapper:
  - `getAcademicMaterials(roadmapNodeId)` → calls GET `/api/academic/node/{roadmapNodeId}`, returns `{roadmapNodeId, courseName, documentCount, documents: [...]}`
  - Add error handling: network errors (log + return empty array), 401 (redirect to auth), 404 (return null with user-friendly message)
- [x] T019 [P] [US1] Create `frontend/src/features/resources/AcademicDocumentCard.jsx` component for single document:
  - Props: `{title, url, sourceType, documentType, courseName, skillName}`
  - Render:
    - Title as clickable link (opens URL in new tab)
    - Source badge (color-coded: "UET Official" blue / "GitHub" gray / "External" orange)
    - Document type badge (outlined: "Slide" / "Note" / "Syllabus" / "Exercise")
    - Course name text (smaller, secondary color)
    - Skill label (if skillName present): badge with skill name
  - Styling: card with hover shadow effect, proper spacing
  - Accessibility: alt text, keyboard navigation
- [x] T020 [P] [US1] Create `frontend/src/features/resources/AcademicMaterials.jsx` component for materials section:
  - Props: `{roadmapNodeId, courseName, documents, isLoading, error}`
  - Display AcademicDocumentCard components in responsive grid (2-3 columns on desktop, 1 on mobile)
  - Show "Loading academic materials..." spinner while `isLoading = true`
  - Show "No materials available for this course" if empty and loaded
  - Show error message if fetch failed (e.g., "Failed to load materials")
  - Call `getAcademicMaterials(roadmapNodeId)` on component mount using `useEffect`
  - Update when roadmapNodeId prop changes
- [x] T021 [P] [US1] Integrate AcademicMaterials into course/node detail page (assume exists at `features/roadmap/NodeDetail.jsx` or similar):
  - Add new section below course description: `<AcademicMaterials roadmapNodeId={node._id} courseName={node.courseName} />`
  - Section header: "Academic Materials for {courseName}"
  - Ensure detail page is protected by AuthGuard
- [x] T022 [P] [US1] Create `frontend/src/features/resources/__tests__/AcademicDocumentCard.test.jsx` with unit tests:
  - Render card with all data: title, source, doc type, course name, skill
  - Render card without skill (skillName prop absent, skill label should not render)
  - Verify link href and target="_blank" (opens in new tab)
  - Verify source badge colors (UET official blue, etc.)
  - Verify document type badge displays correctly
- [x] T023 [P] [US1] Create `frontend/src/features/resources/__tests__/AcademicMaterials.test.jsx` with integration tests:
  - Mock `resources.api.getAcademicMaterials()` to return test data
  - Test loading state: spinner visible, no cards rendered
  - Test empty state: "No materials" message visible, no cards
  - Test success state: cards rendered, count correct, sorting preserved
  - Test error state: error message displayed
  - Test prop changes (roadmapNodeId change triggers re-fetch)

---

## Phase 3: User Story 2 — Market Skill Trend Tracker (Priority P2)

**Capability 2**: For each roadmap node, crawl job postings with StudentProfile personalization, extract trending skills, compute trend direction, store snapshots with personalization context.

**Goal**: Display personalized trending skills for each course based on student's career goals (major, role, company type).

**Independent Test Criteria**:
- [x] Can view Market Insight page and see trending skills ranked by job count
- [x] Each skill shows: name, job count, salary range (or "not specified"), trend indicator (↑/↓/—)
- [x] Personalization context visible (major, role, company type used in crawl)
- [x] Trending skills differ per student based on their onboarding profile
- [x] Trend direction computed correctly (≥±10% change vs. 7 days ago = increasing/decreasing; <10% = stable)

### US2 — Backend Implementation

- [x] T024 [P] [US2] Create `backend/src/modules/scraping/services/personalizationContext.service.js`:
  - `enrichQueryWithPersonalization(courseName, studentProfile)` → builds Tavily query combining course name + major, role, company type
  - Input: `courseName` (string), `studentProfile` ({major, careerRole, companyType})
  - Output: combined query string e.g., `"web development skills job market computer-science software-engineer startup"`
  - Fallback to course-name-only query if studentProfile incomplete
- [x] T025 [P] [US2] Create `backend/src/modules/scraping/services/studentCatalog.service.js`:
  - `fetchStudentProfile(studentId)` → queries `student_profiles` collection, returns {major, careerGoal}
  - Extract `major`, `careerGoal.role`, `careerGoal.companyType` for use in trend search
  - Cache results (5 min TTL in memory) to avoid repeated DB hits
- [x] T026 [P] [US2] Create `backend/src/modules/scraping/services/skillInference.service.js` with methods:
  - `extractSkillsFromJobPostings(tavilySnippet, jobBoardContext)` → uses Regex patterns `/(React|Vue|Node\.?js|Express|MongoDB|PostgreSQL|Python|Java|…)/gi` to extract skill mentions
  - Build frequency histogram; keep skills with ≥3 occurrences in results
  - Send extracted skills ± context to Gemini for confidence validation (optional: only if >3 skills extracted)
  - Return validated skill list per R-003
- [x] T027 [P] [US2] Create `backend/src/modules/scraping/services/marketTracker.service.js` with crawl logic:
  - `crawlMarketTrendsPerNode(roadmapNodes, studentProfiles)` loops over nodes
  - Call `personalizationContext.service.enrichQueryWithPersonalization()` per student profile
  - Call `tavily.adapter.trendSearch(enrichedQuery)` to get job board snippets
  - Extract trending skills using `skillInference.service.extractSkillsFromJobPostings()`
  - Parse salary ranges from Tavily snippets (regex for "$" or "VND" amounts)
  - Calculate trend: compare jobCount vs. 7-day-ago snapshot by same (roadmapNodeId, skillName); if ±10% threshold → increasing/decreasing, else stable
  - Store `personalizationContext` object in snapshot (major, careerRole, companyType)
  - Upsert by `{roadmapNodeId, skillName, snapshotDate}`
- [x] T028 [P] [US2] Create `backend/src/modules/scraping/controllers/trends.controller.js` with:
  - `getTrendsByNode(req, res)` — GET handler returning market trends for specific node
  - `getAllTrends(req, res)` — GET handler returning all active trends (latest snapshot per skill) per rest-api.md endpoint
  - Apply aggregation to fetch latest snapshot per skillId: `group by skillId, take latest by snapshotDate`
  - Sort by jobCount descending; return in `{lastRefreshedAt, trends: [...]}` format
- [x] T029 [P] [US2] Create `backend/src/modules/scraping/routes/trends.routes.js` with:
  - `GET /api/market/trends` → returns `{lastRefreshedAt, trends: [{skillId, skillName, jobCount, averageSalaryRange, trendDirection, personalizationContext}, ...]}` per rest-api.md
  - `GET /api/market/trends/:roadmapNodeId` → returns trends filtered to specific node
  - Add auth middleware check
  - Add caching (5 min) to avoid repeated aggregations
- [x] T030 [P] [US2] Create `backend/src/modules/scraping/__tests__/marketTracker.service.test.js` with tests:
  - Verify trend calculation: jobCount increases ≥10% → "increasing"
  - Verify trend calculation: jobCount decreases ≥10% → "decreasing"
  - Verify trend calculation: jobCount change <10% → "stable"
  - Verify first snapshot: no prior data → trend = "stable"
  - Verify salary range parsing from varied formats
  - Verify personalizationContext stored correctly
- [x] T031 [P] [US2] Create `backend/src/modules/scraping/__tests__/trends.routes.test.js` with:
  - GET /api/market/trends returns trends sorted by jobCount descending
  - Verify lastRefreshedAt is correct latest snapshot date
  - Verify personalizationContext included in response
  - Verify skills with jobCount=0 appear last
  - Test empty state (no snapshots yet)
- [x] T032 [P] [US2] Create `backend/src/modules/scraping/__tests__/{studentCatalog.service.test.js, skillInference.service.test.js}` with comprehensive unit tests

### US2 — Frontend Implementation

- [x] T033 [P] [US2] Create `frontend/src/features/resources/SkillTrendItem.jsx` component for single trend row:
  - Props: `{skillId, skillName, jobCount, averageSalaryRange, trendDirection, personalizationContext}`
  - Render: skill name (clickable link to skill detail), jobCount (e.g., "1,420 jobs"), salary range (or "not specified"), trend indicator (↑ green for increasing, ↓ red for decreasing, — gray for stable)
  - On click: navigate to skill detail page or modal
- [x] T034 [P] [US2] Create `frontend/src/features/resources/MarketInsight.jsx` component for trends list page:
  - Props: `{trends, isLoading, lastRefreshedAt}`
  - Display list of SkillTrendItem components
  - Show "Last updated: {lastRefreshedAt}" at top
  - Show "Loading market trends..." while fetching
  - Show "No trends collected yet" if empty
  - Call `getMarketTrends()` on mount using `useEffect`
- [x] T035 [P] [US2] Create `/pages/market-insight.jsx` (or update existing `/pages/Dashboard.jsx`):
  - Route: `/market-insight` (or similar, protected by AuthGuard)
  - Render `<MarketInsight />` component
  - Layout: header ("Market Insights") + trend list
- [x] T036 [P] [US2] Create `frontend/src/features/resources/__tests__/{SkillTrendItem.test.jsx, MarketInsight.test.jsx}` with component tests

---

## Phase 4: User Story 3 — Learning Resource Crawler (Priority P3)

**Capability 3**: For each trending skill (from US2's SkillTrendSnapshot), crawl learning resources via Tavily from major platforms (Udemy, Coursera, YouTube, etc.), classify free/paid, extract quality signals.

**Goal**: Display learning resources (courses, videos, articles) for trending skills to all students uniformly based on skill demand.

**Independent Test Criteria**:
- [x] Can navigate to a skill page and see a resource list with items from ≥2 platforms
- [x] Each resource shows: title, platform (Udemy / Coursera / YouTube / etc.), resource type (video / course / article), free/paid badge, quality signal (rating / views / enrollment)
- [x] Free/paid classification is accurate and consistent per source rules
- [x] No duplicate resource URLs appear in list
- [x] Resources sorted by quality signal (highest rating/views first)
- [x] Empty state message shown if no resources collected yet

### US3 — Backend Implementation

- [ ] T039 [P] [US3] Create `backend/src/modules/scraping/services/resourceCrawler.service.js` with main crawl logic:
  - `crawlResourcesForSkills(skillTrendSnapshots)` loops over SkillTrendSnapshot array (input from US2)
  - For each snapshot, extract `skillName` and call `tavily.adapter.resourceSearch(skillName)`
  - Classify free/paid per source:
    - Udemy: check `is_paid` flag in API response
    - YouTube / freeCodeCamp: always free
    - Coursera: if "audit" mentioned → free, else paid
    - Default: paid if ambiguous
  - Extract quality signals: rating (⭐ from Udemy/Coursera), view count (YouTube), enrollment count (Coursera)
  - Deduplicate by {skillTrendSnapshotId, url} compound key using MongoDB upsert (idempotent re-crawl safe)
  - Handle partial failures gracefully (one platform fails → continue with others, log error)
  - Return `{skillTrendSnapshotId, skillName, resourcesCount}` per snapshot
- [ ] T040 [P] [US3] Create `backend/src/modules/scraping/controllers/resources.controller.js` with endpoints:
  - `getResourcesBySkillTrendSnapshot(req, res)` — GET handler returning resources for a specific SkillTrendSnapshot ID
  - `getResourcesBySkillName(req, res)` — GET handler returning resources for a skill name (convenience lookup across all snapshots)
  - Both query `learning_resources` collection with `isAvailable: true` filter (to exclude broken links)
  - Sort by quality signal descending (highest rating/view count first)
  - Return format per rest-api.md: `{skillName, resourceCount, resources: [...]}`
- [ ] T041 [P] [US3] Create `backend/src/modules/scraping/routes/resources.routes.js` with:
  - `GET /api/resources/skills/:skillTrendSnapshotId` — returns resources for a snapshot ID per rest-api.md
  - `GET /api/resources/skills/:skillName` — convenience lookup by skill name; returns latest snapshot resources
  - Both routes require auth middleware (Bearer token)
  - Proper error responses: 401 (unauthorized), 404 (not found), 500 (server error)
- [ ] T042 [P] [US3] Create `backend/src/modules/scraping/__tests__/resourceCrawler.service.test.js` with unit tests:
  - Verify free/paid classification per source (Udemy flagged as paid/free; YouTube always free; Coursera audit logic)
  - Verify quality signal extraction from mixed platform responses
  - Verify deduplication (same URL ingested twice = stored once, timestamp updated)
  - Verify partial failure handling (one platform fails, others succeed, both results stored)
  - Verify isAvailable flag filtering (broken links hidden)
- [ ] T043 [P] [US3] Create `backend/src/modules/scraping/__tests__/resources.routes.test.js` with integration tests:
  - GET /api/resources/skills/{snapshotId} returns correct resources with auth required (401 if no token)
  - GET /api/resources/skills/{skillName} returns latest snapshot resources
  - Empty resource list when no documents stored (200 with empty array, not 404)
  - Sorting by quality signal verified (highest rating first)
  - isAvailable filter suppresses broken links (only available: true shown)

### US3 — Frontend Implementation

- [ ] T044 [P] [US3] Create `frontend/src/features/resources/resources.api.js` — extend API wrappers with:
  - `getSkillResources(skillName)` → calls GET `/api/resources/skills/{skillName}`, returns `{skillName, resourceCount, resources: [...]}`
  - `getSkillResourcesBySnapshot(snapshotId)` → calls GET `/api/resources/skills/{snapshotId}` for specific snapshot
  - Add error handling for network failures (log error, return empty list), 401 (redirect to login), 404 (skill not yet processed)
- [ ] T045 [P] [US3] Create `frontend/src/features/resources/ResourceCard.jsx` component for single resource display:
  - Props: `{title, url, sourcePlatform, resourceType, isFree, qualitySignal}`
  - qualitySignal shape: `{type: 'rating' | 'views' | 'enrollments', value: number, display: string}` (e.g., "4.8 ⭐")
  - Render: 
    - Title as clickable link (opens URL in new tab)
    - Platform badge (Udemy / Coursera / YouTube / freeCodeCamp / etc., colored per platform)
    - Resource type badge (video / course / article, outlined)
    - Free/Paid badge (green "FREE" / gray "PAID")
    - Quality signal (if present): "{value} {icon}" e.g., "2.3M views", "4.8 ⭐", "15k students"
  - Styling: card with hover effect (shadow, slight lift)
  - Accessibility: proper alt text, keyboard navigation
- [ ] T046 [P] [US3] Create `frontend/src/features/resources/SkillResources.jsx` component for resource list section:
  - Props: `{skillName, resources, isLoading, error}`
  - Display ResourceCard components in responsive grid (2-3 columns on desktop, 1 on mobile)
  - Show "Loading resources..." spinner while fetching
  - Show "No resources collected yet for this skill" if empty and loaded
  - Show error message if fetch failed (e.g., "Failed to load resources")
  - Call `getSkillResources(skillName)` on component mount using `useEffect`
  - Handle skillName prop changes (re-fetch when prop updates)
- [ ] T047 [P] [US3] Integrate SkillResources into skill detail page (assume exists at `features/skills/SkillDetail.jsx` or similar):
  - Add new section below existing skill description: `<SkillResources skillName={skill.name} />`
  - Pass skill name from route params or context
  - Section header: "Learning Resources for {skillName}"
  - Ensure skill detail page is guarded by AuthGuard
- [ ] T048 [P] [US3] Create `frontend/src/features/resources/__tests__/ResourceCard.test.jsx` with unit tests:
  - Render resource with all data: title, platform, resource type, free/paid, quality signal all present
  - Render resource with partial data: missing quality signal (qualitySignal is null, should not display signal section)
  - Verify link HRef and target="_blank" (opens in new tab)
  - Verify platform badge displays correctly (Udemy vs. YouTube vs. Coursera color coding)
  - Test free/paid badge (green for free, gray for paid)
- [ ] T049 [P] [US3] Create `frontend/src/features/resources/__tests__/SkillResources.test.jsx` with integration tests:
  - Mock `resources.api.getSkillResources()` to return test data
  - Test loading state: spinner visible, no resources rendered
  - Test empty state: "No resources" message visible, no ResourceCard rendered
  - Test success state: resource list rendered with correct count, items, and sorting
  - Test error state: error message displayed, retry button (if applicable)
  - Test useEffect dependency (component re-fetches when skillName prop changes)

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T050 Create `backend/src/modules/scraping/scraping.job.js` with node-cron registrations:
  - Cap.1 (AcademicFinder): `'0 2 * * 0'` (weekly Sunday 2 AM) — calls `academicFinder.crawlAcademicMaterialsPerNode()`
  - Cap.2 (MarketTracker): `'0 3 * * 0'` (weekly Sunday 3 AM) — calls `marketTracker.crawlMarketTrendsPerNode()`
  - Cap.3 (ResourceCrawler): `'0 4 * * *'` (daily 4 AM) — calls `resourceCrawler.crawlResourcesForSkills()`
  - Add error logging: `console.error('Crawl job failed:', error)` with timestamp
  - Document schedule in code: "Tasks run in sequence; allow 10 min total runtime per spec"
- [ ] T051 Create `backend/src/modules/scraping/scraping.config.js`:
  - Export schedule strings, API keys (TAVILY_API_KEY, GEMINI_API_KEY)
  - Export Tavily API base URL: `https://api.tavily.com/search`
  - Export Gemini model ID and inference config
- [ ] T052 Create `backend/src/modules/scraping/index.js` to export all services/adapters for use by other modules (if needed; follows modular boundary)
- [ ] T053 Create `backend/src/modules/scraping/__tests__/scraping.integration.test.js` with end-to-end tests:
  - Mock all external APIs (Tavily, Gemini, Feature 009 roadmap, Feature 001 profiles)
  - Test crawl sequence: AcademicDocument → SkillTrendSnapshot → LearningResource
  - Verify data flows correctly through the pipeline
  - Verify all three crawl jobs complete without errors
- [ ] T054 Add integration tests to `backend/tests/unit/scraping/` for each route:
  - Test auth middleware (401 if no token, success with valid token)
  - Test all three endpoints with mocked data
- [ ] T055 Update `backend/.env.example` with all new variables: `TAVILY_API_KEY`
- [ ] T056 Update `backend/README.md` or feature-specific doc with setup instructions (copy from quickstart.md)
- [ ] T057 Create `frontend/src/features/resources/__tests__/resources.api.test.js` with API wrapper tests:
  - Mock fetch/axios calls to backend endpoints
  - Test error handling (network error, 401, server error)
  - Test response parsing
- [ ] T058 Add type checking (TypeScript / PropTypes) to all React components and API wrappers
- [ ] T059 Add error boundary component `ResourcesErrorBoundary.jsx` to wrap all resources features; fallback UI for failed components
- [ ] T060 Document crawl monitoring: add logs to all crawl services; plan for observability (when ops dashboard exists)
- [ ] T061 Update feature documentation with: Quickstart testing scenarios (from quickstart.md), troubleshooting guide, API contract summary

---

## Dependencies & Blocking Order

**User Stories in Execution Order** (follow data dependencies):
1. **US1 (P1)** ← Foundation: LearningResource model, resourceCrawler service
2. **US2 (P2)** ← Depends on US1's SkillTrendSnapshot (contains `skillName`), inputs StudentProfile
3. **US3 (P3)** ← Independent: AcademicDocument model, academicFinder service

**Field Dependencies for Crawl**:
- AcademicDocument: needs `roadmap_nodes.courseName` (Feature 009)
- SkillTrendSnapshot: needs `roadmap_nodes.courseName` + `student_profiles`  (Features 009, 001)
- LearningResource: needs SkillTrendSnapshot.`skillName` (output of US2)

**Cross-story parallel opportunities**:
- All US1 backend tasks (T013–T017) can run in parallel; all US1 frontend tasks (T018–T023) can run in parallel
- All US2 backend tasks (T024–T032) can run in parallel; all US2 frontend tasks (T033–T038) can run in parallel
- All US3 backend tasks (T039–T043) can run in parallel; all US3 frontend tasks (T044–T049) can run in parallel

**Sequencing within each story**:
- Models must be created first (defines schema)
- Services can start once models are defined
- Controllers/Routes start once services are defined
- Frontend components can start once backend routes are defined

**Foundational blocking tasks** (T001–T012 must complete before US stories):
- All three US1, US2, US3 depend on: models (T007–T009), adapters (T010), nodesCatalog (T011), tavily tests (T012)

---

## Success Criteria

### Per User Story

**US1 (Learning Resources)**:
- [x] GET /api/resources/skills/{skillName} returns ≥2 platforms represented in sample data
- [x] ResourceCard displays all fields: title, source, type, free/paid, quality signal
- [x] Deduplication works: same URL never appears twice
- [x] Free/paid classification accurate per platform rules
- [x] Empty state shown when no resources collected

**US2 (Market Trends)**:
- [x] GET /api/market/trends returns skills sorted by jobCount descending
- [x] Trend direction calculated correctly (±10% threshold)
- [x] personalizationContext stored and returned in response
- [x] Trending skills differ per student based on profile
- [x] MarketInsight page displays all trends with indicators

**US3 (Academic Materials)**:
- [x] GET /api/academic/{roadmapNodeId} returns UET official docs first, then GitHub, then external
- [x] Document type correctly detected from URL/title
- [x] Only visible documents (confidence ≥ medium) shown to students
- [x] Skill inference optional (no skillId required for correctness)
- [x] Empty state shown when no materials found

### Cross-Story

- [x] All three crawl jobs run on schedule without errors
- [x] Partial failure in one job doesn't block others (e.g., Gemini unavailable ≠ abandon AcademicDocument crawl)
- [x] All endpoints require valid auth token
- [x] All endpoint responses match rest-api.md contract
- [x] Database indexes present and performant (p95 < 150ms per endpoint)
- [x] No student PII exposed in stored data

---

## MVP Scope

**Recommended MVP** (Minimum for user value):
- **Phase 1**: Setup, foundational models, Tavily adapter
- **Phase 2 (US1 Backend only)**: resourceCrawler service, resources routes/controllers
- **Phase 3 (US2 Backend only)**: marketTracker, personalizationContext, trends routes/controllers
- **Phase 4 (US3 Backend only)**: academicFinder, academic routes/controllers
- **Phase 5 (Frontend - minimal UI)**: Add basic SkillResources, MarketTrend, AcademicMaterials list views
- **Phase 6 (Polish)**: Job scheduling, logging, integration tests

**Timeline**: All backend APIs + basic frontend UI achievable in ~3–4 weeks (parallel frontend/backend).

---

## Testing Strategy

**Unit Tests** (required per constitution):
- Skill extraction Regex patterns (skillInference.service.test.js)
- Crawl pipeline partial failure handling (resourceCrawler.pipeline.test.js)
- Trend ±10% computation (marketTracker.trend.test.js)
- Free/paid classifiers per source (extracted to separate test file)
- API adapter mocking (tavily.adapter.test.js, personalizationContext.test.js)

**Integration Tests**:
- Per-route tests (academic, trends, resources endpoints with auth)
- End-to-end crawl pipeline (mock all external APIs, verify data flow)

**Manual Tests** (from quickstart.md):
1. View skill detail page → resources section loads
2. View /market-insight page → market trends displayed
3. View course node → academic materials section loads
4. Check deduplication: run crawl twice, verify no duplicates
5. Verify free/paid correctness on a few resources

---

## Known Risks & Mitigation

| Risk | Mitigation |
|------|-----------|
| Tavily API quota exhausted (100/mo free) | Monitor usage weekly; current estimate 150–450 searches/mo may exceed; escalate if needed |
| Gemini skill inference confidence/cost | Test Regex-only approach first; use Gemini only if needed for accuracy; cost: ~$0 on free tier |
| Feature 001 (StudentProfile) delayed | Build Cap.2 (marketTracker) to work without personalization initially; add StudentProfile integration when Feature 001 ready |
| Feature 009 (RoadmapNodeSchema) API change | **Only nodesCatalog.service.js needs update**; all three crawlers remain unchanged (isolated adapter pattern) |
| Job board data stale / URLs rot quickly | Plan re-crawl frequency; implement isAvailable flag; suppress broken links from UI |
| No student onboarding data for personalization | Fall back to generic courseName query; skip StudentProfile enrichment; store null personalizationContext |

