# Data Model: Seed UET Curriculum into DB as DAG

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Research dependency**: [research.md](research.md) (R-003, R-005)

---

## Entity: CourseUnit

**MongoDB collection**: `course_units`

**Purpose**: A single academic course in the UET curriculum. Acts as a node in the prerequisite DAG. Each record is owned by exactly one major. The `prerequisites` field encodes directed edges: `A.prerequisites = [B.code]` means "B must be completed before A" (i.e., edge B → A in the DAG when traversed in dependency order).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `code` | String | yes | — | Non-empty; part of compound unique key | Course code, e.g. `INT2215` |
| `name` | String | yes | — | Non-empty | Full Vietnamese/English course name |
| `credits` | Number | yes | — | Integer ≥ 1 | Credit count |
| `major` | String | yes | — | Non-empty; part of compound unique key | UET major identifier, e.g. `CNTT`, `KTMT` |
| `prerequisites` | String[] | yes | `[]` | Each element is a valid course code | Codes of courses that must be completed first |
| `type` | String | no | `null` | Enum: `"required"`, `"elective"`, `null` | Course type within the curriculum |
| `suggestedSemester` | Number\|null | no | `null` | Integer ≥ 1 when present | Recommended semester from CTĐT table |
| `seededAt` | Date | auto | `Date.now()` | Set on every upsert (`$set`) | Timestamp of last successful seed; enables freshness tracking |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `code_major_unique` | `code: 1, major: 1` | **Unique compound** | One record per course per major; upsert filter key (R-005) |
| `major_idx` | `major: 1` | Standard | Fast `find({ major })` for per-major cycle detection (R-004) |

### Validation rules applied at service layer (pre-upsert)

All CourseUnit records produced by Gemini are validated against the JSON schema defined in `gemini.service.js` (R-003) before any DB write. A record is **rejected and URL skipped** if any of the following hold:
- `code` is missing or empty string
- `name` is missing or empty string
- `credits` is missing, non-numeric, or < 1
- `major` is missing or empty string
- `prerequisites` is not an array

`type` and `suggestedSemester` are optional — `null`/missing values are accepted.

---

## DAG Structure

```text
                 CourseUnit (node)
                 ─────────────────
                 code: "INT2210"
                 name: "Cấu trúc dữ liệu và Giải thuật"
                 credits: 4
                 major: "CNTT"
                 prerequisites: ["INT2215"]    ← directed edge: INT2215 → INT2210
                 suggestedSemester: 3

                     ▲
                     │  prerequisite edge
                     │
                 CourseUnit (node)
                 ─────────────────
                 code: "INT2215"
                 name: "Lập trình"
                 credits: 4
                 major: "CNTT"
                 prerequisites: []             ← no incoming edges (root node)
                 suggestedSemester: 1
```

**Invariant (enforced by post-seed cycle detection)**:
- The subgraph for each major MUST be a DAG (no cycles in `prerequisites` relationships).
- A violation is reported as a warning in the log; data is not rolled back (per FR-007).

---

## State Machine: SeedJob Run

```text
                         ┌──────────────────────────────────────┐
                         │           SeedJob Execution          │
                         └──────────────────────────────────────┘

  [idle / waiting for trigger]
         │
         │  Cron fires OR npm run seed:ctdt (dev only)
         ▼
  [reading config]       Read URL list from curriculum.config.js
         │
         │  URLs loaded
         ▼
  [processing URLs]      For each URL (sequential):
         │                 1. Tavily Extract → raw Markdown
         │                 2. Gemini parse   → CourseUnit[]
         │                 3. JSON schema validation
         │                 4. bulkWrite upsert to MongoDB
         │
         │  All URLs attempted (success or per-URL skip)
         ▼
  [cycle detection]      For each distinct major in DB:
         │                 Build adjacency list → DFS → collect cycles
         │
         │  Detection complete
         ▼
  [reporting]            Write final status to log

         │ all URLs OK        │ ≥1 URL failed      │ cycle detected
         │ no cycle           │ OR cycle detected  │ (regardless of URL status)
         ▼                    ▼                    ▼
    SUCCESS             PARTIAL_FAILURE          FAILED
```

**Exit statuses**:

| Status | Condition |
|---|---|
| `SUCCESS` | 100% URLs upserted successfully AND no cycles detected |
| `PARTIAL_FAILURE` | ≥1 URL failed (data quality); successful URLs still persisted |
| `FAILED` | Cycle detected in any major's prerequisite graph (graph state invalid) |

---

## Seed Log Schema

The logger (`seed.logger.js`) writes structured entries to both console and `backend/logs/seed-ctdt.log`.

```json
{
  "timestamp": "2026-03-08T00:00:01.234Z",
  "level": "info|warn|error",
  "event": "URL_SUCCESS|URL_SKIP|CYCLE_DETECTED|CYCLE_CLEAN|JOB_COMPLETE",
  "url": "https://...",         // present for URL-level events
  "stage": "tavily|gemini|validate|upsert",  // present on URL_SKIP
  "reason": "string",           // present on URL_SKIP and CYCLE_DETECTED
  "cycles": [                   // present on CYCLE_DETECTED
    { "from": "INT2210", "to": "INT2215" }
  ],
  "exitStatus": "SUCCESS|PARTIAL_FAILURE|FAILED"  // present on JOB_COMPLETE
}
```
