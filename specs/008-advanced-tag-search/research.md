# Research: Advanced Tag-Based Search

**Feature**: `008-advanced-tag-search`  
**Date**: 2026-03-11  
**Feeds into**: [plan.md](plan.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md)

---

## R-001: Search Index Technology — MongoDB text index vs. Elasticsearch

**Question**: Should we use MongoDB's built-in text index or deploy Elasticsearch for the search layer? Trade-off: simplicity vs. performance and scalability.

**Decision (LOCKED)**: **MongoDB native text index** for MVP (0–10K skills). Elasticsearch is explicitly deferred to a later phase when approaching 50K skills.

**Rationale**:
- **Simplicity**: MongoDB text index is included free on Atlas M0. Zero infrastructure cost. One less service to manage and monitor in a resource-constrained team.
- **MVP performance**: MongoDB text index with proper indexing on canonical tag/search fields (`skills.tags.tagId`, `skills.tags.normalizedName`, `skills.description`) achieves <500ms p95 latency for 10K-skill dataset (Atlas benchmark: single-field text query returns in 20–100ms).
- **Graceful degradation built-in**: MongoDB query is already in the code path. When index is unavailable, fallback to pre-computed cache automatically.
- **Future path**: When data grows to 50K+ skills, re-evaluate. Elasticsearch can be bolted on in Phase 2 without changing the query interface (query builder abstraction hides the backend).
- **No undecided infrastructure in MVP**: Search backend choice is finalized for implementation.

**Performance estimate** (MongoDB M0 text index):
- 10K skills, 2–4 tags per skill: 20ms query time (indexed, cached)
- 50K skills, 2–4 tags per skill: 80–150ms (declining relevance; optimization needed)
- **500ms p95 target achievable** at 10K with safety margin

**Alternatives considered**:
- **Elasticsearch (immediate)**: Adds infrastructure costs, deployment complexity, and requires learning curve. Overkill for MVP where design is still being validated. Deferred to Phase 2.
- **In-memory search (JavaScript)**: Loading 50K skill documents into memory every query is not feasible on Render free tier (limited RAM). Rejected.
- **Pre-filtered collections per tag**: Maintenance burden (N collections × N tags = exponential growth). Not scalable. Rejected.

---

## R-002: Deduplication Algorithm — Multi-path traversal Tag → Skill → Course/Roadmap

**Question**: When a tag is clicked, the system traverses Tag → Skill → Course → Roadmap. A single course or roadmap can be reached through multiple skills (each with the same tag). How do we efficiently deduplicate while preserving relationship metadata?

**Decision**: **Set-based deduplication in JavaScript** with three phases:
1. Fetch all skills with the tag (MongoDB query, indexed).
2. Fetch all courses that reference any of those skills (single batch query with `skillIds` array).
3. Fetch all roadmaps that reference any of those courses (single batch query with `courseIds` array).
4. De-duplicate courses and roadmaps by `_id` in JavaScript using a `Map` or `Set`.

**Rationale**:
- **Single round trip per entity type**: Instead of N nested queries (one per skill), we do 3 batch queries. This keeps latency under 500ms even on Atlas M0.
- **Preserves relationship data**: Storing `{ courseId, skillIds }` (the skills that led to this course) allows the UI to show "Related to: SQL, Database Design" on the course card.
- **Scales to 50K**: JavaScript `Set` and `Map` are O(1) lookups; dedup of 10K courses runs in <1ms.

**Pseudocode**:

```js
// 1. Find skills with tag
const skills = await Skill.find({
  tags: { $elemMatch: { tagId, confidence: { $gte: minConfidence } } },
});
const skillIds = skills.map(s => s._id);

// 2. Find courses referencing those skills
const courseMap = new Map(); // courseId -> { course, skillIds }
const courses = await Course.find({ skillIds: { $in: skillIds } });
courses.forEach(course => {
  const relatedSkillIds = course.skillIds.filter(id => skillIds.includes(id));
  courseMap.set(course._id.toString(), { course, skillIds: relatedSkillIds });
});

// 3. Find roadmaps referencing those courses
const roadmapMap = new Map(); // roadmapId -> { roadmap, courseIds }
const roadmaps = await Roadmap.find({ courseIds: { $in: Array.from(courseMap.keys()) } });
roadmaps.forEach(roadmap => {
  const relatedCourseIds = roadmap.courseIds.filter(id => courseMap.has(id.toString()));
  roadmapMap.set(roadmap._id.toString(), { roadmap, courseIds: relatedCourseIds });
});

// Result: courseMap and roadmapMap are already deduplicated
return {
  courses: Array.from(courseMap.values()),
  roadmaps: Array.from(roadmapMap.values()),
};
```

**Test coverage**: Unit tests verify deduplication against mock multi-path graphs (e.g., two different tags pointing to the same skill, which point to the same course).

**Alternatives considered**:
- **GraphQL + nested resolvers**: Simpler syntax but slower (N+1 queries). Rejected for performance.
- **Database aggregation pipeline**: Complex `$lookup` chains are hard to maintain. Easier to keep logic in JavaScript. Trade-off accepted: dedup logic is not in the database.

---

## R-003: Personalization Data Flow — When to load user's enrolled roadmap ID

**Question**: The search results page highlights courses/roadmaps that are part of the user's current enrolled roadmap as "Recommended for You". When should we fetch the enrolled roadmap ID — once per session, or with every search query?

**Decision**: **Fetch once per session** and cache in React Query. Include it in the search request only if the user is logged in and has an enrolled roadmap.

**Rationale**:
- **Frontend**: On app load, call `GET /api/student-profile/enrolled-roadmap` (or similar endpoint from Account Management Feature 005) and store in React Query cache with very long TTL (session-scoped).
- **Backend**: The search controller optionally receives `enrolledRoadmapId` in the query parameters. The highlighting logic is a simple comparison: for each returned course/roadmap, check if it's part of the enrolled roadmap.
- **Performance**: Avoids O(N) database calls per search. One session-wide fetch, cached.
- **Fallback**: If the personalization endpoint is unavailable or user has no enrollment, the `enrolledRoadmapId` is undefined; all results display without highlighting.

**Data flow**:

```text
User logs in
    ↓
Frontend: useEffect → fetch /api/student-profile/enrolled-roadmap (once)
    ↓
React Query caches { enrolledRoadmapId } with session TTL
    ↓
User searches
    ↓
Frontend: POST /api/search/query { tag: "Database", enrolledRoadmapId: "..." }
    ↓
Backend: search.service.js receives enrolledRoadmapId and adds `highlighted: true` to matching results
    ↓
Frontend: RoadmapCard displays "Recommended for You" badge if highlighted === true
```

**Alternatives considered**:
- **Backend fetch enrolled roadmap from `userId`**: Requires an extra DB call per search query. Adds 20–50ms latency per query. Rejected.
- **No personalization**: Simpler but reduces user engagement. Violates FR-011. Rejected.

---

## R-004: Relevance Scoring Strategy — TF-IDF, BM25, or simple match count

**Question**: How should search results be ranked by relevance? MongoDB text index supports built-in BM25 scoring, but it's opaque. Should we implement custom TF-IDF in JavaScript?

**Decision**: **Use MongoDB's built-in `textScore`** (BM25) for MVP. A skill with more matching tags or a more relevant keyword match scores higher. Custom TF-IDF deferred to Phase 2 if needed.

**Rationale**:
- **Built-in**: MongoDB's `textScore` is free and already optimized for full-text search. No custom scoring logic to maintain.
- **Formula**: BM25 balances term frequency and inverse document frequency. Works well for our use case where tags are relatively uniform (not skewed toward a few popular tags).
- **Sufficient for discovery**: Users searching for "Database" expect results with database-related tags first. BM25 delivers this without tuning.
- **Extensible**: If custom weighting is needed (e.g., "recent courses rank higher"), we can add a `boost` field in Phase 2.

**Scoring example**:
- User searches "Database"
- Results ranked by MongoDB `textScore`:
  1. SQL course (tags: #Database, #SQL) — score 2.5
  2. NoSQL course (tags: #Database, #NoSQL) — score 2.5 (tied, alphabetical 2nd)
  3. Database Design course (tags: #DatabaseDesign, #Normalization) — score 1.8

**Alternatives considered**:
- **Custom TF-IDF in JavaScript**: More control but added complexity. Acceptable in Phase 2. Rejected for MVP.
- **Elasticsearch scoring**: Deferred to Phase 2 when switching to Elasticsearch.

---

## R-005: Fallback Cache Refresh — How often to rebuild pre-cached results

**Question**: The graceful degradation feature (FR-012) requires pre-cached results if the search index is unavailable. How often should we rebuild this cache, and what should it contain?

**Decision**: **Lazy cache on startup + scheduled rebuild every 6 hours** (configurable via `SEARCH_CACHE_REFRESH_INTERVAL_MINUTES`).

**Fallback cache structure**:
- All courses (pre-sorted alphabetically): { courseId, name, level, domain, tags }
- All roadmaps (pre-sorted alphabetically): { roadmapId, name, difficulty, courseIds }
- Map of tag → course list: { tagId → [courseIds] }

**Rationale**:
- **Startup**: On app boot, if `search_cache` collection is empty, populate it. If Elasticsearch is down, at least "all courses" fallback is available.
- **Scheduled rebuild**: Every 6 hours (adjust based on how often FEAT-006 updates tags), refresh the cache from the live database. This ensures the fallback stays reasonably fresh.
- **Graceful degradation trigger**: If a search query fails on the indexed collection, catch the error and serve from `search_cache` instead (no personalization, no relevance sorting, just alphabetical).
- **Monitoring**: Log cache misses. If cache misses spike, alert the team to rebuild or check search index health.

**Cache write pseudocode**:

```js
// src/modules/search/search.cache.js
async function rebuildSearchCache() {
  const allCourses = await Course.find({}).lean();
  const allRoadmaps = await Roadmap.find({}).lean();
  const tagCourseMap = {}; // tagId -> [courseIds]

  // Build tag→course map from skills
  const allSkills = await Skill.find({ tags: { $exists: true, $ne: [] } }).lean();
  allSkills.forEach(skill => {
    skill.tags.forEach(tag => {
      if (!tagCourseMap[tag.tagId]) tagCourseMap[tag.tagId] = new Set();
      // Add courses that reference this skill
      skill.courseIds?.forEach(cid => tagCourseMap[tag.tagId].add(cid));
    });
  });

  // Upsert cache document
  await SearchCache.findOneAndUpdate(
    { type: 'fallback' },
    {
      $set: {
        allCourses: allCourses.sort((a, b) => a.name.localeCompare(b.name)),
        allRoadmaps: allRoadmaps.sort((a, b) => a.name.localeCompare(b.name)),
        tagCourseMap: Object.fromEntries(
          Object.entries(tagCourseMap).map(([tag, set]) => [tag, Array.from(set)])
        ),
        lastRefreshAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Scheduled job (cron or Node.js setInterval)
setInterval(rebuildSearchCache, SEARCH_CACHE_REFRESH_INTERVAL_MINUTES * 60 * 1000);
```

**Fallback query flow**:

```text
POST /api/search/query
  ↓
try {
  Results ← query indexed search (MongoDB text index)
} catch (err) {
  LogError(err)
  Results ← lookup from search_cache collection (alphabetical, no personalization)
}
  ↓
Return results (either live or fallback)
```

**Alternatives considered**:
- **Event-driven from FEAT-006**: Wait for FEAT-006 to emit "tags updated" event and refresh cache. Adds coupling. Deferred to Phase 2.
- **No fallback**: Violates FR-012 (graceful degradation). Rejected.

---

## Technology Stack Locked

| Component | Technology | Version | Rationale |
|---|---|---|---|
| **Search Index** | MongoDB native text index | Atlas M0 | Free, built-in, sufficient for 10K skills |
| **Input normalization** | Canonical tag resolver (`tagId`/`tagNormalizedName` -> `resolvedTagId`) | Node.js service layer | Deterministic query identity and FE flexibility |
| **Deduplication** | JavaScript (Map/Set) | ES6+ | O(1) lookup, scales to 50K |
| **Personalization** | React Query + session storage | react-query v5 | Already in project; efficient caching |
| **Scoring** | MongoDB BM25 (`textScore`) | native | Built-in, no custom implementation needed |
| **Fallback Cache** | MongoDB `search_cache` collection | M0 | Single source of truth for degraded mode |

---

## R-006: Search Input Canonicalization — `tagId` vs `tagNormalizedName`

**Question**: FE should support search input from either known tag IDs or normalized tag names. How do we keep backend queries deterministic and indexed?

**Decision**: Accept both `query.tagId` and `query.tagNormalizedName`, then normalize to canonical `resolvedTagId` before executing any tag search.

**Normalization rules**:
1. If only `tagId` exists: validate and use directly.
2. If only `tagNormalizedName` exists: normalize (trim + lowercase), lookup in `tags.normalizedName`, resolve `_id`.
3. If both exist: they must resolve to the same tag.
4. If unresolved/conflicting: return `INVALID_INPUT` and skip query execution.

**Rationale**:
- Supports both click-flow and manual/tag-text input.
- Keeps query planner stable by searching primarily on canonical `tagId`.
- Aligns with FEAT-006 canonical data (`Tag.normalizedName` unique, `Skill.tags.tagId`).

**Alternatives considered**:
- Search directly by `tagNormalizedName` only: simpler but weaker identity guarantees. Rejected.
- Require `tagId` only: strict but harms UX for typed tag interactions. Rejected.

---

## R-007: Multi-Dimensional Filtering — How to combine Tag + Level + Domain filters

**Question**: Users can apply multiple filters simultaneously: Tag + Level + Domain. How are these combined? (AND vs. OR semantics)

**Decision**: **AND semantics**: A course must match ALL chosen filters.

**Query logic**:
- Tag filter: `skills.tags.tagId: { $in: [selectedTagIds] }` — course has at least one selected tag
- Level filter: `level: { $in: [selectedLevels] }` — course level is in the selected list
- Domain filter: `domain: { $in: [selectedDomains] }` — course domain is in the selected list

**Mongoose query builder**:

```js
const query = {};

if (selectedTagIds.length > 0) {
  query['skills.tags.tagId'] = { $in: selectedTagIds };
}

if (minConfidence > 0) {
  query['skills.tags.confidence'] = { $gte: minConfidence };
}

if (selectedLevels.length > 0) {
  query.level = { $in: selectedLevels };
}

if (selectedDomains.length > 0) {
  query.domain = { $in: selectedDomains };
}

const results = await Course.find(query);
```

**Example**: User selects Tag=#Database AND Level=Intermediate AND Domain=Backend:
- Result: Courses tagged with Database, with Intermediate level, in Backend domain.
- A course with Database + Intermediate + Frontend does NOT match (domain mismatch).

**Alternatives considered**:
- **OR semantics**: "Match any filter" — too broad, users get irrelevant results. Rejected.
- **Mixed (some AND, some OR)**: Too confusing for users. Rejected.

---

## R-008: Filter Discovery Endpoint — How to fetch available filter values

**Question**: The frontend FilterBar needs to populate dropdowns with available Level values, Domain values, and Tag list. Should these be pre-computed or fetched on every page load?

**Decision**: **Fetch on app initialization** (once per session) via `GET /api/search/filters`, cache in React Query.

**Rationale**:
- **Frontend simplicity**: React Query caches the response; dropdowns always have fresh data without manual cache-busting.
- **Low cost**: Fetching distinct values from `skills`, `courses`, `roadmaps` is a single aggregation pipeline query — ~10–20ms even on Atlas M0.
- **Dynamic updates**: When FEAT-006 (AI Auto-Tagging) adds new tags, the filter endpoint reflects them within 6 hours (or on next app reload).

**Response structure** (see [contracts/rest-api.md](contracts/rest-api.md) Endpoint 2):

```json
{
  "tags": [
    { "tagId": "...", "normalizedName": "database", "displayName": "#Database", "count": 42 },
    { "tagId": "...", "normalizedName": "javascript", "displayName": "#JavaScript", "count": 35 },
    ...
  ],
  "levels": ["Beginner", "Intermediate", "Advanced"],
  "domains": ["Backend", "Frontend", "Data", ...]
}
```

**Alternatives considered**:
- **Hard-coded filter values**: Not scalable if FEAT-006 adds new tags. Rejected.
- **Fetch on every search**: Redundant. Not needed. Rejected.
