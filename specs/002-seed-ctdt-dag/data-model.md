# Data Model: Seed UET Curriculum into DB as DAG

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Research dependency**: [research.md](research.md) (R-003, R-005)

---

## Entity: CourseUnit

**MongoDB collection**: `course_units`

**Purpose**: A single academic course in the UET curriculum. Acts as a node in the prerequisite DAG. Each record belongs to exactly one Program (`programId`). The `prerequisites` field encodes directed edges: `A.prerequisites = [B.code]` means "B must be completed before A" (i.e., edge B → A in the DAG when traversed in dependency order).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `code` | String | yes | — | Non-empty; part of compound unique key | Course code, e.g. `INT2215` |
| `name` | String | yes | — | Non-empty | Full Vietnamese/English course name |
| `credits` | Number | yes | — | Integer ≥ 1 | Credit count |
| `programId` | String | yes | — | FK → Program.programId | Primary ownership anchor for CourseUnit |
| `prerequisites` | String[] | yes | `[]` | Each element is a valid course code | Codes of courses that must be completed first |
| `type` | String | yes | `null` | Enum: `"required"`, `"elective"`, `null` | Course type within the curriculum |
| `theoryHours` | Number | no | `null` | Integer ≥ 0 | Lecture hours from curriculum table |
| `practiceHours` | Number | no | `null` | Integer ≥ 0 | Lab/practice hours from curriculum table |
| `emphasis` | String | no | `null` | Enum: `"theory-heavy"`, `"balance"`, `"project-heavy"` | Computed deterministically from theoryHours/practiceHours after Call 1; NOT AI-inferred |
| `block` | String | no | `null` | Free string from curriculum table | Credit block name (e.g. "Khối kiến thức ngành") |
| `difficultyLevel` | Number | no | `null` | Integer 1–5 | AI-inferred in Call 2 Batch Enrichment; relative within program |
| `careerTracks` | String[] | no | `[]` | Each element is a valid CareerTrack.trackId | AI-inferred in Call 2; constrained to CAREER_TRACKS vocabulary |
| `skills` | String[] | no | `[]` | Each element is a valid SKILL_VOCABULARY tag | AI-inferred in Call 2; constrained to SKILL_VOCABULARY; free-form tags silently dropped |
| `tags` | String[] | no | `[]` | Free-form string tags | e.g. `"industry-partner"`, `"capstone"`, `"language-requirement"` |
| `courseOutcomeId` | String | no | `null` | FK → CourseOutcome.coId; nullable | Populated only when CLO is public or human-labeled; not blocking in MVP |
| `source` | Object | no | `null` | See SourceMeta below | Provenance: which URL/version this record was extracted from |
| `enrichmentSource` | Object | no | `null` | `{ scrapeType: "ai-inferred"\|"human-validated"\|"ai-fallback-runtime", enrichedAt: Date }` | Authoritative Enrichment Layer status for skills |
| `seededAt` | Date | auto | `Date.now()` | Set on every upsert (`$set`) | Timestamp of last successful seed; enables freshness tracking |

### SourceMeta sub-schema

```json
{
       "url": "String",
       "scrapeType": "curriculum-table | program-overview | program-outcome | human-labeled",
       "scrapedAt": "Date",
       "version": "String"
}
```

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `code_program_unique` | `code: 1, programId: 1` | **Unique compound** | One record per course per program; upsert filter key (R-005) |
| `programId_idx` | `programId: 1` | Standard | Fast per-program query for Call 2 enrichment/update |

### Validation rules applied at service layer (pre-upsert)

All CourseUnit records produced by Gemini are validated against the JSON schema defined in `gemini.service.js` (R-003) before any DB write. A record is **rejected and URL skipped** if any of the following hold:
- `code` is missing or empty string
- `name` is missing or empty string
- `credits` is missing, non-numeric, or < 1
- `programId` is missing or empty string
- `prerequisites` is not an array


`skills` tags outside `SKILL_VOCABULARY` are **silently dropped** before upsert (record is not rejected solely because of invalid tags).

---

## Entity: Program

**MongoDB collection**: `programs`

**Purpose**: Represents a full UET degree program. Container for all CourseUnits and ProgramOutcomes of a given program. Provides objectives and creditBlocks as context for AI enrichment in Call 2.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `programId` | String | yes | — | Unique | e.g. `"CNTT-JP"`, `"CNTT-STANDARD"` |
| `nameVI` | String | yes | — | Non-empty | Vietnamese program name |
| `nameEN` | String | yes | — | Non-empty | English program name |
| `degree` | String | yes | — | Enum: `"bachelor"`, `"engineer"`, `"master"`, `"doctoral"` | Affects timeline planning in Feature 009 |
| `durationYears` | Number | yes | — | e.g. 4, 4.5, 2, 3 | Used by Feature 009 for timeline optimization |
| `totalCredits` | Number | yes | — | Integer ≥ 1 | Used for adjacent rule checks in future |
| `objectives` | String | yes | — | Non-empty | Full program objective text; primary AI context for Call 2 |
| `creditBlocks` | Object[] | yes | `[]` | `[{ blockName, requiredCredits }]` | Curriculum structure; used in Call 2 enrichment |
| `source` | SourceMeta | no | `null` | See SourceMeta above | Provenance |

### Indexes
- `programId` unique.

---

## Entity: ProgramOutcome (PLO)

**MongoDB collection**: `program_outcomes`

**Purpose**: Declared learning outcomes at the program level. Used by Feature 009 to map career goals to relevant program outcomes.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `poId` | String | yes | — | Unique | e.g. `"PO-CNTT-JP-01"` |
| `programId` | String | yes | — | FK → Program.programId | |
| `description` | String | yes | — | Non-empty | PLO description text; used in AI reasoning for roadmap |
| `careerTracks` | String[] | no | `[]` | Each element is a valid CareerTrack.trackId | AI-inferred in Call 2 |
| `source` | SourceMeta | no | `null` | See SourceMeta above | Provenance |

### Indexes
- `poId` unique.
- `programId` standard.

---

## Entity: CourseOutcome (CLO)

**MongoDB collection**: `course_outcomes`

**Purpose**: Course-level learning outcomes. NOT populated in MVP (UET CLO pages require authentication). Schema is defined here to document the forward-compatibility contract.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `coId` | String | yes | — | Unique | e.g. `"CO-INT2210-01"` |
| `courseCode` | String | yes | — | FK → CourseUnit.code | |
| `description` | String | yes | — | Non-empty | CLO text |
| `relatedPoIds` | String[] | no | `[]` | FK → ProgramOutcome.poId | CLO-to-PLO mapping |
| `skills` | String[] | no | `[]` | SKILL_VOCABULARY tags | Validated skill tags for this CLO |
| `source` | SourceMeta | no | `null` | `scrapeType: "human-labeled"` in MVP | MVP: human-labeled only; future: scraped if CLO pages become public |

**Note**: `CourseUnit.courseOutcomeId` is nullable. This collection is intentionally empty in MVP. It will be enriched in a future feature when CLO data becomes accessible.

### Indexes
- `coId` unique.
- `courseCode` standard.

---

## Entity: SeedRun
**MongoDB collection**: `seed_runs`

**Purpose**: Operational record of each job execution. Used by the change-detection mechanism to decide whether re-processing is needed for a Program. Distinct from `source` provenance in entity records — `SeedRun` is operational metadata; `source` is lineage metadata.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `runId` | String | yes | — | UUID | Unique run identifier |
| `programId` | String\|null | yes | `null` | FK → Program.programId; null = full run | |
| `status` | String | yes | `"pending"` | Enum: `"pending"`, `"running"`, `"completed"`, `"failed"` | |
| `triggeredBy` | String | yes | — | Enum: `"cron"`, `"manual"` | |
| `startedAt` | Date | yes | — | | |
| `completedAt` | Date | no | `null` | | Set on terminal status |
| `urlSnapshots` | Object[] | no | `[]` | See below | Content hashes for change detection |
| `summary` | Object | no | `null` | `{ coursesUpserted, outcomesUpserted, errors: String[] }` | |

### urlSnapshot sub-schema

```json
{
       "url": "String",
       "contentHash": "String",
       "httpEtag": "String|null",
       "lastModified": "String|null",
       "checkedAt": "Date"
}
```

**Change detection logic**: Scheduler fires → for each Program in config → fetch last `SeedRun` with `status: "completed"` and matching `programId` → for each URL in `program.sources`, send HEAD request → compare `ETag` / `Last-Modified` / content hash against `urlSnapshots` of last run → if NO change detected for ALL URLs: skip Program → if ANY change detected: create new `SeedRun`, trigger re-process.

### Indexes
- `runId` unique.
- `{ programId, status }` compound.
- `startedAt` descending.

---

## DAG Structure

```text
       CourseUnit (node)
       ─────────────────
       code: "INT2210"
       name: "Cấu trúc dữ liệu và Giải thuật"
       credits: 4
       programId: "CNTT-STANDARD"
       prerequisites: ["INT2215"]    ← directed edge: INT2215 → INT2210
       ▲
       │  prerequisite edge
       │
       CourseUnit (node)
       ─────────────────
       code: "INT2215"
       name: "Lập trình"
       credits: 4
       programId: "CNTT-STANDARD"
       prerequisites: []             ← no incoming edges (root node)
```

**Invariant (enforced by post-seed cycle detection)**:
- The subgraph for each program (`programId`) MUST be a DAG (no cycles in `prerequisites` relationships).
- A violation is reported as a warning in the log; data is not rolled back (per FR-007).

---

## State Machine: SeedJob Run

```text
[idle / waiting for trigger]
       │
       │ Cron fires OR npm run seed:ctdt (dev only)
       ▼
[create SeedRun] Create SeedRun record (status: "running")
       │
       │ For each Program in curriculum.config.js:
       ▼
[change detection] HEAD request each source URL
       │ Compare ETag/hash vs last completed SeedRun.urlSnapshots
       │ → No change: skip Program
       │ → Change detected OR no prior run: proceed
       ▼
[CALL 1 — Extract & Parse] For each source URL in Program:
       │ 1. Tavily Extract → raw Markdown
       │ 2. Gemini parse → structured records (Program, ProgramOutcome, CourseUnit[])
       │ 3. JSON schema validation
       │ 4. Compute emphasis deterministically (theoryHours/practiceHours)
       │ 5. bulkWrite upsert to MongoDB (programs, program_outcomes, course_units)
       │
       │ All URLs for Program attempted
       ▼
[CALL 2 — Batch Enrichment] Single Gemini call per Program:
       │ Input: Program metadata + all CourseUnits + all ProgramOutcomes
       │ + CAREER_TRACKS + SKILL_VOCABULARY (from config)
       │ Output: enrichment fields for ALL CourseUnits + ProgramOutcomes
       │ Apply: difficultyLevel, careerTracks, skills (scrapeType: "ai-inferred")
       │ Constraint: skills tags outside SKILL_VOCABULARY are silently dropped
       │
       │ All Programs processed
       ▼
[cycle detection] For each distinct programId in DB:
       │ Build adjacency list → DFS → collect cycles
       ▼
[SeedRun finalize] Update SeedRun status, write urlSnapshots, write summary
       │
       ▼
[reporting]                 Write final status to log
       │ all programs OK     │ ≥1 source/program-stage failed │ cycle detected
       │ no cycle            │                                 │ (regardless of URL status)
       ▼                    ▼                    ▼
SUCCESS             PARTIAL_FAILURE          FAILED
```

**Exit statuses**:

| Status | Condition |
|---|---|
| `SUCCESS` | 100% changed Programs complete Call 1 + Call 2 successfully AND no cycles detected |
| `PARTIAL_FAILURE` | ≥1 source URL or Program-stage failed; successful Programs still persisted |
| `FAILED` | Cycle detected in any program's prerequisite graph (graph state invalid) |

---

## Seed Log Schema

The logger (`seed.logger.js`) writes structured entries to both console and `backend/logs/seed-ctdt.log`.

```json
{
  "runId": "uuid",
  "programId": "CNTT-JP",
  "timestamp": "2026-03-08T00:00:01.234Z",
  "level": "info|warn|error",
       "event": "CHANGE_SKIP|URL_SUCCESS|URL_SKIP|ENRICHMENT_START|ENRICHMENT_SUCCESS|ENRICHMENT_SKIP|SKILL_TAG_DROPPED|CYCLE_DETECTED|CYCLE_CLEAN|SEEDRUN_FINALIZE|JOB_COMPLETE",
  "url": "https://...",         // present for URL-level events
  "stage": "change-detection|tavily|gemini-call1|validate|normalize|upsert|gemini-call2|cycle-detection|seedrun-finalize",
  "reason": "string",           // present on *_SKIP and CYCLE_DETECTED
  "cycles": [                     // present on CYCLE_DETECTED
    { "from": "INT2210", "to": "INT2215" }
  ],
  "urlSnapshot": {
    "url": "https://...",
    "contentHash": "sha256...",
    "httpEtag": "etag-or-null",
    "lastModified": "header-or-null"
  },
  "exitStatus": "SUCCESS|PARTIAL_FAILURE|FAILED"  // present on JOB_COMPLETE
}
```
