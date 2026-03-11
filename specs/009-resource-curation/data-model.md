# Data Model: Resource Curation

**Feature**: `009-resource-curation`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-001, R-002, R-005, R-006)

---

## Entity 1: LearningResource

**MongoDB collection**: `learning_resources`

**Purpose**: One document per unique learning resource (course, video, article, document) associated with a skill. Written exclusively by `resourceCrawler.service.js` during scheduled runs. Read by the REST API for student display. Deduplicated by `(url, skillId)`.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `skillId` | ObjectId | yes | — | ref: `skills`; part of compound unique key | FK to UETCompass skill catalog |
| `title` | String | yes | — | maxlength: 500; trimmed | Display title of the resource |
| `url` | String | yes | — | Valid URL; part of compound unique key with `skillId` | Direct link to the resource |
| `sourcePlatform` | String | yes | — | Enum: `"udemy"` \| `"coursera"` \| `"youtube"` \| `"edx"` \| `"freecodecamp"` \| `"viblo"` \| `"other"` | Identifies the origin platform |
| `resourceType` | String | yes | — | Enum: `"video"` \| `"article"` \| `"course"` \| `"document"` | Nature of the content |
| `isFree` | Boolean | yes | — | Determined from source data; defaults to `false` if signal absent (R-004) | Free/paid classification |
| `qualitySignal` | Object\|null | no | `null` | — | Platform-specific quality metric |
| `qualitySignal.type` | String | — | — | `"rating"` \| `"enrollment_count"` \| `"view_count"` | Metric type |
| `qualitySignal.value` | Number | — | — | ≥ 0 | Numeric metric value |
| `lastCrawledAt` | Date | yes | — | Updated on every upsert | Timestamp of the most recent crawl that updated this record |
| `isAvailable` | Boolean | yes | `true` | `false` = URL was unreachable on last re-crawl | Suppresses broken links from student view |
| `createdAt` | Date | auto | `Date.now()` | Set once on first insert (`$setOnInsert`) | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every upsert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `skillId_url_unique` | `skillId: 1, url: 1` | **Unique compound** | FR-007: deduplication by URL per skill |
| `skillId_available_idx` | `skillId: 1, isAvailable: 1` | Standard | Fast lookup for `GET /api/resources/skills/:skillId?available=true` |

### Write path (via `resourceCrawler.service.js`)

```text
Adapter (udemy/coursera/youtube/…).fetchForSkill(skill)
    │
    │  Returns: RawResource[]
    ▼
classifyFree(rawResource, sourcePlatform)   ← deterministic per R-004
    │
    ▼
LearningResource.findOneAndUpdate(
  { skillId, url },                         ← hits compound unique index
  { $set: { title, sourcePlatform, resourceType, isFree, qualitySignal,
            lastCrawledAt, isAvailable: true, updatedAt },
    $setOnInsert: { createdAt }  },
  { upsert: true, new: true }
)
```

**Re-crawl stale detection**: If an adapter receives an HTTP error for an existing URL, the service calls:
```js
LearningResource.updateOne({ skillId, url }, { $set: { isAvailable: false, lastCrawledAt } })
```

---

## Entity 2: AcademicDocument

**MongoDB collection**: `academic_documents`

**Purpose**: One document per publicly accessible academic file (slide, lecture note, syllabus, exercise) associated with a UET-VNU course and a skill. Written exclusively by `academicFinder.service.js`. Read by the REST API. Documents requiring authentication are excluded at crawl time (FR-013).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `skillId` | ObjectId\|null | yes | — | ref: `skills`; `null` only when Gemini confidence is `low` | FK to UETCompass skill catalog |
| `title` | String | yes | — | maxlength: 500; trimmed | Display title of the document |
| `url` | String | yes | — | Valid URL; unique per collection | Direct link to the document |
| `sourceType` | String | yes | — | Enum: `"uet_official"` \| `"github"` \| `"external"` | Determines display order (FR-012) |
| `documentType` | String | yes | — | Enum: `"slide"` \| `"lecture_note"` \| `"syllabus"` \| `"exercise"` | Nature of academic content |
| `courseName` | String | yes | — | maxlength: 200 | Original UET course name used for inference |
| `inferenceConfidence` | String | yes | — | Enum: `"high"` \| `"medium"` \| `"low"` | Gemini's returned confidence (R-003) |
| `isVisible` | Boolean | yes | `true` | `false` when `inferenceConfidence === "low"` — not shown to students | Controls student visibility |
| `lastCrawledAt` | Date | yes | — | Updated on every upsert | |
| `createdAt` | Date | auto | `Date.now()` | Set once on first insert | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every upsert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `url_unique` | `url` | **Unique** | Deduplication across all academic documents |
| `skillId_visible_source_idx` | `skillId: 1, isVisible: 1, sourceType: 1` | Standard | Fast lookup + server-side ordering by `sourceType` (FR-012) |

### Source priority ordering for display (FR-012)

When returning documents for a skill, the service applies the following sort:

```js
{ sourceType: 1 }  // "uet_official" sorts before "external" alphabetically
```

Explicit sort key mapping: `uet_official` → priority 1, `github` → priority 2, `external` → priority 3. Applied as a computed sort field or handled by the service layer before returning results to the controller.

---

## Entity 3: SkillTrendSnapshot

**MongoDB collection**: `skill_trend_snapshots`

**Purpose**: Daily record of job market signals for one skill. Written by `marketTracker.service.js` once per skill per day. Read by the REST API for the Market Insight list. Old snapshots expire automatically via MongoDB TTL index (30-day retention, R-005).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `skillId` | ObjectId | yes | — | ref: `skills`; part of compound unique key | FK to UETCompass skill catalog |
| `snapshotDate` | Date | yes | — | Stored as date-only (midnight UTC); part of compound unique key | The calendar day this snapshot represents |
| `jobCount` | Number | yes | — | Integer ≥ 0 | Total job postings found across all active sources |
| `averageSalaryRange` | Object\|null | no | `null` | `null` when salary data unavailable from any source | Salary bucket if available |
| `averageSalaryRange.min` | Number | — | — | VND or USD depending on source | Lower bound of salary range |
| `averageSalaryRange.max` | Number | — | — | Upper bound | |
| `averageSalaryRange.currency` | String | — | — | `"VND"` \| `"USD"` | |
| `trendDirection` | String | yes | — | Enum: `"increasing"` \| `"stable"` \| `"decreasing"` | Computed per FR-016 vs. 7-day-ago snapshot |
| `contributingSources` | String[] | yes | — | Subset of `["topdev", "itviec", "linkedin", "joboko"]`; min length 1 | Which sources contributed to this snapshot |
| `expiresAt` | Date | yes | — | `snapshotDate + 30 days` | MongoDB TTL index expiry field (R-005) |
| `createdAt` | Date | auto | `Date.now()` | Set once on insert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `skillId_date_unique` | `skillId: 1, snapshotDate: 1` | **Unique compound** | One snapshot per (skill, day); upsert filter key |
| `skillId_date_desc_idx` | `skillId: 1, snapshotDate: -1` | Standard | Fast "latest snapshot per skill" query for Market Insight read path |
| `expiresAt_ttl` | `expiresAt: 1` | **TTL** (`expireAfterSeconds: 0`) | Automatic 30-day rolling deletion (R-005) |

### Trend direction computation (FR-016)

```text
runMarketTracker() per skill:
  1. Crawl all adapters → { jobCount, salaryRange, source }[]
  2. Aggregate: totalJobCount = sum(jobCount per source)
  3. Fetch baseline: snapshot from 7 days ago for this skill
     → baseline = SkillTrendSnapshot.findOne({ skillId, snapshotDate: { $lte: 7daysAgo } }, sort: { snapshotDate: -1 })
  4. Compute trendDirection:
     - baseline missing → "stable" (first snapshot, no comparison available)
     - (totalJobCount - baseline.jobCount) / baseline.jobCount >= 0.10 → "increasing"
     - (baseline.jobCount - totalJobCount) / baseline.jobCount >= 0.10 → "decreasing"
     - otherwise → "stable"
  5. SkillTrendSnapshot.findOneAndUpdate(
       { skillId, snapshotDate: todayMidnightUTC },
       { $set: { jobCount, averageSalaryRange, trendDirection, contributingSources, expiresAt: today + 30d } },
       { upsert: true }
     )
```

### Edge case: skill with zero job postings (FR-019)

When all adapters return 0 for a skill:
- `jobCount = 0`, `trendDirection = "stable"`, `contributingSources` = sources that responded successfully.
- Still inserted as a snapshot — skill appears in Market Insight list ranked last.

---

## Referenced Entity: Skill (read-only, owned by Roadmap module)

**MongoDB collection**: `skills` *(working name — Roadmap planner may rename)*

**Purpose**: Master list of skills in the UETCompass catalog. The scraping module reads from it to determine which skills to crawl (FR-020).

### Minimum fields required by Resource Curation

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Referenced by `skillId` field in all three new collections |
| `name` | String | Used as query term for API calls and job board searches |
| `isActive` | Boolean | `true` = include in crawl; `false` = skip (FR-020) |

**Access pattern from scraping module**: `getActiveSkills()` → `Skill.find({ isActive: true }, { _id: 1, name: 1 }).lean()`. No writes.

> **Note to Roadmap planner**: The scraping module depends on the above field names, accessed via `skillCatalog.service.js`. If the actual fields differ, only that accessor file needs updating — all three crawl pipelines remain unchanged.

---

## Data flow summary

```text
┌─────────────────────────────────────────────────────────────────┐
│                     External Sources                            │
│  Udemy · Coursera · YouTube · edX · freeCodeCamp · Viblo        │
│  UET faculty pages · GitHub                                     │
│  TopDev · ITviec · LinkedIn · JobOKO                            │
└───────────────────────┬─────────────────────────────────────────┘
                        │  HTTP / API calls (no Playwright for Cap.1)
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│            backend/src/modules/scraping/                        │
│  adapters/         → raw platform data                          │
│  services/         → orchestration, dedup, classification       │
│  skillCatalog.service.js → reads Skill[]                        │
│  scraping.job.js   → node-cron schedules                        │
└────────┬──────────────────────────┬────────────────────────────-┘
         │                          │
         ▼                          ▼
  learning_resources         academic_documents
  skill_trend_snapshots      (with uet_official > github > external ordering)
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  REST API  (read-only)                                          │
│  GET /api/resources/skills/:skillId                             │
│  GET /api/resources/academic/:skillId                           │
│  GET /api/market/trends                                         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
  React frontend: SkillResources.jsx · AcademicMaterials.jsx
                  MarketInsight.jsx
```
