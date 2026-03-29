# Data Model: Resource Curation

**Feature**: `003-resource-curation`  
**Date**: 2026-03-28 (revised)  
**Research dependency**: [research.md](research.md) (R-001, R-002, R-005, R-006, R-007)  
**Architecture dependency**: Feature 009 (RoadmapNodeSchema)

---

## Architecture Overview

Resource Curation operates in a **three-tier hierarchy with selective personalization**:

1. **RoadmapNodeSchema** (Feature 009) → input for Cap.1 & Cap.2
2. **StudentProfile** (Feature 001) → input ONLY for Cap.2 (SkillTrendSnapshot personalization)
3. **AcademicDocument** (Cap.1: crawl via Tavily by courseName only)
4. **SkillTrendSnapshot** (Cap.2: crawl via Tavily by courseName + StudentProfile fields)
5. **LearningResource** (Cap.3: crawl via Tavily by skillName only)

**Data Flow** (showing input to each capability):
```
RoadmapNodeSchema.courseName
    │
    ├─→ AcademicDocument (Tavily: courseName only — NO StudentProfile)
    │
    └─→ SkillTrendSnapshot (Tavily: courseName + StudentProfile.{major, careerGoal})
        │
        └─→ LearningResource (Tavily: skillName only — NO StudentProfile, NO courseName)
```

**Crawl Order**: AcademicDocument (courseName only) → SkillTrendSnapshot (courseName + StudentProfile) → LearningResource (skillName only)

**Key Design Note**: 
- **AcademicDocument**: Generic per-course materials — uses only `courseName` Tavily query
- **SkillTrendSnapshot**: Personalized market insights — uses `courseName` + StudentProfile context (major, career role, company type)
- **LearningResource**: Skill-focused resources — uses only the extracted `skillName` from SkillTrendSnapshot; NO StudentProfile influence

---

## Entity 1: AcademicDocument

**MongoDB collection**: `academic_documents`

**Purpose**: One document per publicly accessible academic file (slide, lecture note, syllabus, exercise) associated with a RoadmapNode course. Written exclusively by `academicFinder.service.js` during scheduled runs. Read by the REST API. Documents requiring authentication are excluded at crawl time. **Uses `courseName` only** — no StudentProfile personalization; results are identical for all students.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `courseCode` | String | yes | — | Non-empty; matches RoadmapNode.courseCode (Feature 009) | Identifier for the course (e.g., "INT2204") — embedded RoadmapNode has no _id |
| `courseName` | String | yes | — | maxlength: 200; trimmed | Display name from RoadmapNode.courseName used for crawling |
| `skillId` | ObjectId\|null | yes | — | ref: `skills`; always `null` for Feature 003 | Optional skill association (not used) |
| `title` | String | yes | — | maxlength: 500; trimmed | Display title of the document |
| `url` | String | yes | — | Valid URL; unique per collection | Direct link to the document |
| `sourceType` | String | yes | — | Enum: `"uet_official"` \| `"github"` \| `"external"` | Determines display order (UET priority) |
| `documentType` | String | yes | — | Enum: `"slide"` \| `"lecture_note"` \| `"syllabus"` \| `"exercise"` \| `"code_sample"` | Nature of academic content |
| `crawlReason` | String | yes | — | Enum: `"course_name_match"` \| `"keyword_extracted"` | Why this document was matched to the node |
| `inferenceConfidence` | String | yes | `"medium"` | Enum: `"high"` \| `"medium"` \| `"low"` | Always "medium" (not used for filtering) |
| `isVisible` | Boolean | yes | `true` | `false` when `inferenceConfidence === "low"` | Controls student visibility |
| `lastCrawledAt` | Date | yes | — | Updated on every upsert | Timestamp of collection |
| `createdAt` | Date | auto | `Date.now()` | Set once on first insert | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every upsert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `url_unique` | `url` | **Unique** | Deduplication across all academic documents |
| `courseCode_source_idx` | `courseCode: 1, sourceType: 1` | Standard | Fast lookup by course + source priority |
| `courseCode_visible_idx` | `courseCode: 1, isVisible: 1` | Standard | Fast student query (visible only) |
| `skillId_idx` | `skillId: 1` | Standard | Lookup by inferred skill if needed |

### Crawl Logic (Tavily-based)

For each active RoadmapNode with `courseCode` and `courseName`:

1. **Query Tavily**: Call `tavily.adapter.search()` with query: `"<courseName> slides lecture notes UET education"`
2. **Filter results**: Keep only URLs from UET official domains (uet.vnu.edu.vn, github.com/uet-*), GitHub, and reputable education sites
3. **Classify source type**: Based on domain:
   - UET domains → `sourceType: "uet_official"`
   - GitHub → `sourceType: "github"`
   - Others → `sourceType: "external"`
4. **Detect document type**: Parse URL + title for keywords:
   - "slide" / ".pptx" / "slide" → `documentType: "slide"`
   - "note" / "lecture" → `documentType: "lecture_note"`
   - "syllabus" / "giáo trình" → `documentType: "syllabus"`
   - ".pdf" + homework context → `documentType: "exercise"`
5. **No skill inference** (optional skillId field reserved for future use; always `null` in current implementation)
6. **Upsert**: One document per unique `url`; deduplication across all courses; mark `isVisible: true` for all documents

---

## Entity 2: SkillTrendSnapshot

**MongoDB collection**: `skill_trend_snapshots`

**Purpose**: A record of trending skills discovered within a RoadmapNode's course, **personalized by StudentProfile** onboarding data (major, career role, company type). Written by `marketTracker.service.js` during scheduled runs. Stores both the skill trend data (job postings, salary) and the skill name for onward resource crawling. Bridges RoadmapNode course-level discovery with Skill-level resource curation. **This is the ONLY entity that uses StudentProfile for personalization.** LearningResource crawling is based solely on the extracted `skillName` from SkillTrendSnapshot.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `roadmapNodeId` | ObjectId | yes | — | ref: `roadmap_nodes` (Feature 009) | FK to the RoadmapNode context |
| `skillName` | String | yes | — | maxlength: 100; trimmed | Extracted hot skill name from job postings (e.g., "React", "Node.js") |
| `skillId` | ObjectId\|null | no | `null` | ref: `skills` if matched | FK to UETCompass skill if exact match exists |
| `personalizationContext` | Object | no | `null` | — | Student profile data used in crawl (for audit/replay) |
| `personalizationContext.major` | String | — | — | From StudentProfile.major | Student's declared major (e.g., "Computer Science") |
| `personalizationContext.careerRole` | String | — | — | From StudentProfile.careerGoal.role | Student's career role target |
| `personalizationContext.companyType` | String | — | — | From StudentProfile.careerGoal.companyType | Student's target company type |
| `jobCount` | Number | yes | — | Integer ≥ 0 | Total job postings requiring this skill |
| `jobCountTrend` | String | yes | `"stable"` | Enum: `"increasing"` \| `"stable"` \| `"decreasing"` | Trend vs. 7 days ago (±10% threshold) |
| `averageSalaryRange` | Object\|null | no | `null` | — | Salary estimate from job postings |
| `averageSalaryRange.min` | Number | — | — | ≥ 0 | Lower bound (VND or USD) |
| `averageSalaryRange.max` | Number | — | — | ≥ min | Upper bound |
| `averageSalaryRange.currency` | String | — | — | `"VND"` \| `"USD"` | Currency code |
| `snapshotDate` | Date | yes | — | Stored as date-only (midnight UTC) | Calendar day this snapshot represents |
| `contributingSources` | String[] | yes | — | Subset of Tavily + job board sources | Which sources matched this skill |
| `expiresAt` | Date | yes | — | `snapshotDate + 30 days` | TTL index expiry (R-005) |
| `createdAt` | Date | auto | `Date.now()` | — | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `roadmapNodeId_skillName_date_unique` | `roadmapNodeId: 1, skillName: 1, snapshotDate: 1` | **Unique compound** | One record per (node, skill, day); upsert key |
| `roadmapNodeId_date_idx` | `roadmapNodeId: 1, snapshotDate: -1` | Standard | Query: "latest trends for this node" |
| `skillId_idx` | `skillId: 1` | Standard | FK query convenience |
| `expiresAt_ttl` | `expiresAt: 1` | **TTL** (`expireAfterSeconds: 0`) | 30-day rolling expiry |

### Market Crawl Logic (Tavily + StudentProfile Personalization)

For each active RoadmapNode with `courseName`:

1. **Gather personalization context** (from Feature 001):
   - Query StudentProfile collection; if multiple students exist, crawl per-student for personalized results
   - OR aggregate across all active students: extract common {major, careerRole, companyType} patterns
   - For personalized mode: use ONE student's profile; for generic mode: use course name + generic terms

2. **Build Tavily query**:
   - **Generic**: `"<courseName> skills job market demand trending"`
   - **Personalized**: `"<courseName> skills job market <major> <careerRole> <companyType>"`
   - Example: `"web development skills market software engineer startup technology"`

3. **Query Tavily**: Call `tavily.adapter.search()` with combined query
   - Tavily returns: job board snippets, salary signals, skill mentions

4. **Extract trending skills** from search results:
   - Parse Tavily snippet + titles for skill mentions using pattern: `/(React|Vue|Node\.?js|Express|MongoDB|PostgreSQL|…)/gi`
   - Build skill frequency histogram; keep skills with ≥3 occurrences

5. **Calculate trend**:
   - Fetch 7-day-ago snapshot for same (roadmapNodeId, skillName)
   - If missing: trend = `"stable"` (first snapshot)
   - If change ≥ ±10%: trend = `"increasing"` or `"decreasing"`

6. **Store personalization context**: Save `personalizationContext` object with major, careerRole, companyType used in crawl (for audit and result relevance validation)

7. **Upsert** by `{ roadmapNodeId, skillName, snapshotDate }`

---

## Entity 3: LearningResource

**MongoDB collection**: `learning_resources`

**Purpose**: One document per unique learning resource (course, video, article) for a trending skill. Written by `resourceCrawler.service.js` during scheduled runs. Read by REST API for student display. Deduplicated by `(url, skillTrendSnapshotId)`. **Uses only `skillName`** (extracted by SkillTrendSnapshot) — not affected by StudentProfile or courseName; results apply to all students interested in that skill.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `skillTrendSnapshotId` | ObjectId | yes | — | ref: `skill_trend_snapshots` | FK to the SkillTrendSnapshot that triggered this resource search |
| `skillName` | String | yes | — | maxlength: 100; trimmed | The trending skill name (denormalized from snapshot for query convenience) |
| `roadmapNodeId` | ObjectId | yes | — | ref: `roadmap_nodes` | Denormalized for fast context lookup |
| `title` | String | yes | — | maxlength: 500; trimmed | Display title of the resource |
| `url` | String | yes | — | Valid URL; part of compound unique key | Direct link to the resource |
| `sourcePlatform` | String | yes | — | Enum: `"udemy"` \| `"coursera"` \| `"youtube"` \| `"edx"` \| `"freecodecamp"` \| `"viblo"` \| `"linkedin_learning"` \| `"other"` | Origin platform |
| `resourceType` | String | yes | — | Enum: `"video"` \| `"article"` \| `"course"` \| `"documentation"` \| `"tutorial"` | Content type |
| `isFree` | Boolean | yes | `false` | Defaults to `false` if signal absent (R-004) | Free/paid classification |
| `qualitySignal` | Object\|null | no | `null` | — | Platform-specific quality metric |
| `qualitySignal.type` | String | — | — | `"rating"` \| `"enrollment_count"` \| `"view_count"` \| `"reviews"` | Metric type |
| `qualitySignal.value` | Number | — | — | ≥ 0 | Numeric value (0–5.0 for rating, etc.) |
| `lastCrawledAt` | Date | yes | — | Updated on every upsert | Last crawl timestamp |
| `isAvailable` | Boolean | yes | `true` | `false` if URL unreachable on re-crawl | Suppresses broken links |
| `createdAt` | Date | auto | `Date.now()` | Set once on first insert | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every upsert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `skillTrendSnapshotId_url_unique` | `skillTrendSnapshotId: 1, url: 1` | **Unique compound** | Deduplication per snapshot |
| `skillTrendSnapshotId_available_idx` | `skillTrendSnapshotId: 1, isAvailable: 1` | Standard | Fast lookup for "available only" queries |
| `roadmapNodeId_skillName_idx` | `roadmapNodeId: 1, skillName: 1` | Standard | Lookup by node + skill |
| `skillName_available_idx` | `skillName: 1, isAvailable: 1` | Standard | Lookup by skill name across all snapshots |

### Crawl Logic (Tavily-based)

For each SkillTrendSnapshot with `skillName`:

1. **Normalize skillName** using Regex (remove special chars, standardize spacing)
   - Example: `"React.js"` → search term `"React"`

2. **Query Tavily**: Call `tavily.adapter.search()` with query: `"learn <skillName> course tutorial free paid"`
   - Tavily returns: resources from Udemy, Coursera, YouTube, edX, freeCodeCamp, etc.

3. **Classify free/paid** from Tavily snippet + URL signals:
   - Udemy URL + "free" keyword → free; otherwise paid
   - YouTube / freeCodeCamp: always free
   - Coursera: check for "audit" option or "free" keyword
   - Others: default to `paid` if ambiguous

4. **Extract quality signal**:
   - Tavily title/snippet may include: rating, enrollment count, view count
   - Parse from snippet if present; otherwise `qualitySignal: null`

5. **Upsert** by `{ skillTrendSnapshotId, url }`

---

## Entity 4: RoadmapNodeSchema (read-only, owned by Feature 009)

**MongoDB collection**: `roadmap_nodes` *(working name; Roadmap planner may rename)*

**Purpose**: Represents a course/node in the personalized learning roadmap. The scraping module reads from it to determine which courses to crawl for academic materials and trending skills.

### Minimum fields required by Resource Curation

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Referenced by roadmapNodeId in AcademicDocument and SkillTrendSnapshot |
| `courseName` | String | Course/node title used as crawl keywords (e.g., "Phát triển ứng dụng web") |
| `isActive` | Boolean | `true` = include in crawls; `false` = skip this node's materials |

**Access pattern**: `getActiveRoadmapNodes()` → `RoadmapNode.find({ isActive: true }, { _id, courseName }).lean()`. No writes.

> **Note to Roadmap planner**: If field names differ, only `nodesCatalog.service.js` needs updating — all three crawl pipelines remain unchanged.

---

## Data Flow Summary

```
┌──────────────────────────────────────────────────────────────┐
│              External Sources                               │
│  Learning Platforms (Udemy, Coursera, YouTube, …)          │
│  Job Boards (TopDev, ITviec, LinkedIn, JobOKO)             │
│  Academic Sites (UET, GitHub, …)                           │
└────────────────────┬─────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ RoadmapNodeSchema      │
        │ (courseName)           │
        └────────┬───────────────┘
                 │
        ┌────────┴───────────────┐
        │                        │
        ▼                        ▼
┌──────────────────┐      ┌────────────────────┐
│ AcademicDocument │      │ SkillTrendSnapshot │
│ (crawl by course)│      │ (crawl by course)  │
│                  │      │ + skillName        │
└──────────────────┘      └────────┬───────────┘
                                   │
                                   ▼
                          ┌────────────────────┐
                          │ LearningResource   │
                          │ (crawl by skill)   │
                          └────────────────────┘
                                   │
                                   ▼
                          ┌────────────────────┐
                          │ REST API (read)    │
                          │ GET /api/…         │
                          └────────────────────┘
```

---

## Referenced Entity: Skill (read-only, optional convenience reference)

**MongoDB collection**: `skills` *(working name; Roadmap planner may rename)*

**Purpose**: Master skill catalog. Used optionally by SkillTrendSnapshot to resolve `skillName` → `skillId` for convenience queries — if no match found, `skillId` remains `null`.

### Minimum fields required

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Referenced (if matched) in SkillTrendSnapshot |
| `name` | String | Matched against SkillTrendSnapshot.skillName using fuzzy matching or Regex |

**Access pattern**: Optional convenience lookup; not required for correctness. If not used, SkillTrendSnapshot operates with `skillId: null` and still provides value via `skillName`.

When returning documents for a skill, the service applies the following sort:

```js
{ sourceType: 1 }  // "uet_official" sorts before "external" alphabetically
```

Explicit sort key mapping: `uet_official` → priority 1, `github` → priority 2, `external` → priority 3. Applied as a computed sort field or handled by the service layer before returning results to the controller.
