# Data Model: Resource Curation

**Feature**: `009-resource-curation`
**Date**: 2026-03-11
**Research dependency**: [research.md](research.md) (R-001–R-007)

---

## MongoDB Collections

### 1. `skill_learning_resources` *(owned by Feature 009; read by Feature 004 Endpoint 6)*

One document per skill. Contains all crawled learning resources aggregated across platforms. **Replaces** Feature 004's placeholder schema with a production-ready extended version; all fields read by Feature 004 (`skillName`, `resources[].title`, `resources[].url`, `resources[].type`, `resources[].platform`) remain intact — backward compatible.

```js
// Mongoose schema: backend/src/modules/resource-curation/learning-resources/learningResource.model.js
{
  _id:       ObjectId,            // auto
  skillName: String,              // required — unique — e.g. "React.js" (skill identity key)
  resources: [
    {
      title:        String,       // required — e.g. "React – The Complete Guide 2026"
      url:          String,       // required — canonical URL to original resource
      platform:     String,       // required — e.g. "Udemy", "YouTube", "Coursera"
      type:         String,       // required — enum: ["free", "paid", "unknown"]
      resourceType: String,       // required — enum: ["video", "article", "course", "document"]
      rating:       Number|null,  // optional — platform quality signal (0–5); null if unavailable
      crawledAt:    Date,         // required — timestamp of this resource's last refresh
    }
  ],
  updatedAt: Date                 // required — set on every upsert (most recent crawl cycle)
}
```

**Indexes**:
```js
{ skillName: 1 }                  // unique — primary lookup key (matches Feature 004 access pattern)
{ updatedAt: 1 }                  // staleness monitoring (optional — for future admin dashboard)
```

**Upsert pattern**: `findOneAndUpdate({ skillName }, { $set: { resources, updatedAt } }, { upsert: true })`. Entire `resources` array is replaced on each crawl cycle (not appended) to remove stale results.

**Validation rules** (service layer pre-write):
- `skillName` must be non-empty
- Each `resources[]` entry must have `title`, `url`, `platform` — missing entries are skipped and logged
- `type` values produced by Gemini fallback (R-002) are validated to enum before write; invalid → default `"unknown"`

---

### 2. `academic_documents` *(new — owned by Feature 009)*

One document per discovered academic file. Auto-crawled; not manually curated.

```js
// Mongoose schema: backend/src/modules/resource-curation/academic-docs/academicDocument.model.js
{
  _id:          ObjectId,         // auto
  title:        String,           // required — document or page title
  url:          String,           // required — unique — canonical URL to document
  sourceType:   String,           // required — enum: ["uet_official", "github", "external"]
  courseName:   String|null,      // optional — raw course name extracted from source
  courseCode:   String|null,      // optional — mapped to UET course code (R-005); null if unmapped
  skillName:    String|null,      // optional — inferred skill name from courseCode lookup
  documentType: String,           // required — enum: ["slide", "lecture_note", "syllabus", "exercise"]
  crawledAt:    Date              // required — timestamp of last crawl
}
```

**Indexes**:
```js
{ url: 1 }                        // unique — deduplicate on re-crawl
{ courseCode: 1 }                 // filter by course (primary query pattern)
{ sourceType: 1 }                 // filter by source type (ranking: uet_official first)
{ courseCode: 1, sourceType: 1 } // compound — ranked fetch per course
```

**Ranking contract**: `GET /api/resource-curation/courses/:courseCode/academic-docs` returns documents ordered by `sourceType` priority: `"uet_official"` > `"github"` > `"external"`, then by `crawledAt` descending within each group.

**Validation rules** (service layer pre-write):
- `url` must be non-empty and parseable as a valid URL
- `sourceType` must match enum; unknown sources default to `"external"`
- Documents where Gemini returns `confidence: "low"` for `courseCode` mapping are stored with `courseCode: null` (still persisted, surfaced only in unfiltered searches, not shown in per-course views)

---

### 3. `market_trend_snapshots` *(new — owned by Feature 009)*

One document per skill per day. Daily snapshot of job market demand. Provides the data for the Market Insight page (`GET /api/resource-curation/market-trends`).

```js
// Mongoose schema: backend/src/modules/resource-curation/market-trends/marketTrendSnapshot.model.js
{
  _id:               ObjectId,     // auto
  skillName:         String,       // required — e.g. "React.js" (same key as skill_learning_resources)
  dataDate:          Date,         // required — UTC date with time zeroed (idempotent upsert key)
  jobCount:          Number,       // required — total job postings mentioning this skill across all sources
  avgSalary:         String|null,  // optional — e.g. "15–25 triệu VND" or "Up to $2,000"; null if unavailable
  trendDirection:    String,       // required — enum: ["increasing", "stable", "decreasing"]
  previousJobCount:  Number|null,  // optional — jobCount from previous day's snapshot (R-004)
  sources:           String[],     // required — boards that contributed: ["TopDev", "ITviec", ...]
  crawledAt:         Date          // required — actual wall-clock timestamp of this run
}
```

**Indexes**:
```js
{ skillName: 1, dataDate: -1 }  // compound — primary query: latest snapshot per skill
{ dataDate: -1, jobCount: -1 }  // ranked list query: GET /api/resource-curation/market-trends
{ skillName: 1, dataDate: 1 }   // unique compound — upsert deduplication key
```

**Upsert pattern** (idempotent daily re-run): `findOneAndUpdate({ skillName, dataDate: today() }, { $set: { ... } }, { upsert: true })` — re-running on the same day overwrites the existing snapshot.

**Data retention**: No TTL index defined at this stage; ~365 documents per skill per year is manageable on MongoDB Atlas free tier. A TTL index on `dataDate` (90-day retention) can be added later as an operational decision.

**Ranked list query pattern** (for `GET /api/resource-curation/market-trends`):
```js
// Get one latest snapshot per skill, ranked by jobCount desc
const today = getTodayUTC();
const results = await MarketTrendSnapshot
  .find({ dataDate: today })
  .sort({ jobCount: -1 })
  .lean();
```

---

### 4. `market_skills` *(owned by Feature 009; read by Feature 004 Endpoint 5)*

One document per course. Contains per-course skill associations derived from job postings — consumed by Feature 004's Market Skills tab. Feature 009 writes this collection as a derivative of the market trend crawl; Feature 004 reads it via `GET /api/skill-tree/nodes/:courseCode/market-skills`.

```js
// Mongoose schema: backend/src/modules/resource-curation/market-trends/marketSkill.model.js
{
  _id:        ObjectId,            // auto
  courseCode: String,              // required — unique — e.g. "IT3910E"
  skills: [
    {
      name:     String,            // required — e.g. "React.js"
      jobCount: Number             // required — from market_trend_snapshots
    }
  ],
  crawledAt:  Date                 // required — timestamp of last derivation run
}
```

**Derivation pattern**: After each daily market trend crawl, `trendAnalyzer.service.js` iterates over the latest `market_trend_snapshots` entries and uses Gemini (R-005 approach) to associate each crawled `skillName` with the most relevant `courseCode` from `course_units`. The resulting associations are bulk-upserted into `market_skills`.

**Indexes**:
```js
{ courseCode: 1 }                 // unique — matches Feature 004 access pattern exactly
```

**Backward compatibility**: Schema is identical to what Feature 004 expects (`courseCode`, `skills: [{name, jobCount}]`, `crawledAt`). No changes needed to Feature 004's reader.

---

## Referenced Collections (read-only, owned by other features)

### `course_units` *(seeded by Feature 002)*

Read by Feature 009 to resolve skill-to-course mappings (R-005, R-006). Relevant fields:

```js
{
  code:  String,   // e.g. "IT3910E"
  name:  String,   // full course name — used for Gemini matching
  major: String    // major identifier (not used by Feature 009 directly)
}
```

**Access pattern**: `CourseUnit.find({}, { code: 1, name: 1 })` — fetched once per job run, cached in-memory for the duration of the run.

### `course_resources` *(owned by Feature 004)*

Not modified by Feature 009. Admin-seeded textbooks, slides, lab materials for the Resources tab. Feature 009's academic documents (`academic_documents`) are stored separately.

---

## State Machine: Crawl Job Run (per capability)

```text
                    ┌──────────────────────────────────┐
                    │     Resource Curation Job Run    │
                    └──────────────────────────────────┘

  [idle / waiting for cron trigger]
         │
         │  Cron fires OR npm trigger (dev)
         ▼
  [loading config]    Fetch skill list / source URL list / course catalog
         │
         ▼
  [crawl loop]        For each skill or source URL (sequential):
         │              1. Tavily Search or Extract  →  raw content
         │              2. Gemini parse              →  structured records
         │              3. JSON schema validation    →  reject invalid
         │              4. MongoDB upsert            →  write result
         │
         │  All items attempted
         ▼
  [post-process]      (market-trends job only)
         │              Derive market_skills per-course associations
         │              Bulk-upsert market_skills
         │
         ▼
  [reporting]         Write structured log entry

         │ all items OK    │ ≥1 item failed     │ ≥1 board unavailable
         │ no errors       │ (data quality)     │ (partial source failure)
         ▼                 ▼                    ▼
      SUCCESS        PARTIAL_FAILURE       PARTIAL_FAILURE
                         (non-blocking)       (non-blocking,
                                               SC-004 still satisfied
                                               if ≥3 boards succeed)
```

**Exit statuses**:

| Status | Condition |
|---|---|
| `SUCCESS` | All sources crawled; all records written |
| `PARTIAL_FAILURE` | ≥1 source skipped or ≥1 record rejected; remaining records persisted |

There is no `FAILED` status for resource curation jobs — partial results are always better than no results. Unlike Feature 002's cycle detection which invalidates the entire graph on a cycle, a missing resource or a skipped job board does not corrupt system state.

---

## Crawl Log Schema

All three crawlers write structured log entries to console and `backend/logs/resource-curation.log`.

```json
{
  "timestamp": "2026-03-11T01:00:01.234Z",
  "level": "info|warn|error",
  "job":   "learning-resources|academic-docs|market-trends",
  "event": "SOURCE_SUCCESS|SOURCE_SKIP|ITEM_REJECTED|JOB_COMPLETE",
  "source": "Udemy|ITviec|uet_official|...",
  "skill":  "React.js",          // present for skill-scoped events
  "reason": "string",            // present on SOURCE_SKIP and ITEM_REJECTED
  "count":  42,                  // items written (present on JOB_COMPLETE)
  "exitStatus": "SUCCESS|PARTIAL_FAILURE"
}
```
