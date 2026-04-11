# Data Model: AI-Powered Personalised Roadmap Generator

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-14
**Research dependency**: [research.md](research.md) (R-001, R-003, R-004)

---

## Entity: Roadmap

**MongoDB collection**: `roadmaps`

**Purpose**: Canonical roadmap store owned by Feature 009. A user may have multiple roadmap documents (history/variants), but exactly one roadmap can be primary at any time.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | Indexed; ref: `users` | Foreign key to authenticated user (Feature 005) |
| `isPrimary` | Boolean | yes | `false` | Partial unique index scope (`isPrimary: true`) | Exactly one primary roadmap per user |
| `studentProfileId` | ObjectId | yes | — | ref: `student_profiles` | The profile snapshot that drove this generation (Feature 001) |
| `personalisationLevel` | String | yes | — | Enum: `full` \| `low` | `low` when no career goal provided (FR-020) |
| `status` | String | yes | — | Enum: `completed` \| `failed` | `completed` = accepted and active; `failed` = generation failure awaiting retry (FR-024) |
| `errorMessage` | String \| null | no | `null` | Set on failure; `null` on completed | Human-readable generation error stored for internal debugging (FR-028) |
| `nodes` | RoadmapNode[] | yes | `[]` | Ordered array; see embedded doc below | Empty array is valid (e.g., all courses completed) |
| `createdAt` | Date | auto | `Date.now()` | Set on first insert (`$setOnInsert`) | |
| `acceptedAt` | Date \| null | no | `null` | Set on acceptance | `null` on `failed` documents |
| `updatedAt` | Date | auto | `Date.now()` | Indexed via list index | Timeline/list ordering |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `primary_per_user_unique` | `{ userId: 1, isPrimary: 1 }` with `partialFilterExpression: { isPrimary: true }` | **Unique (partial)** | At most one primary roadmap per user |
| `roadmap_list_by_user_status_updatedAt` | `{ userId: 1, status: 1, updatedAt: -1 }` | Non-unique | Fast listing by user with optional status filter and recency sort |
| `roadmap_detail_by_user_id` | `{ userId: 1, _id: 1 }` | Non-unique | Auth-scoped detail lookup |

### Validation rules applied at service layer

- `personalisationLevel` is derived from the `StudentProfile` before the Gemini call — it is NOT set from user input.
- `status` transitions are controlled exclusively by Feature 009 generation/acceptance services — no direct client-provided status is accepted.
- `errorMessage` is set only on generation failure (never on acceptance); it is cleared (set to `null`) when the document is updated to `completed` via `upsertCompleted`.
- `isPrimary` assignment is controlled only by Feature 009 primary-switch rules (`PATCH /api/roadmaps/:roadmapId/primary`) and acceptance commit policy.

---

## Embedded Sub-Document: RoadmapNode

**Not a separate collection** — embedded as an element of `Roadmap.nodes[]`.

**Purpose**: A single enriched course entry within the roadmap's ordered sequence. The ordering of the array is the canonical topological order produced by the AI and validated by the system.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `courseCode` | String | yes | — | Non-empty | e.g., `"INT2204"` — matches `CourseUnit.code` |
| `courseName` | String | yes | — | Non-empty | Display name from the DAG |
| `credits` | Number | yes | — | Positive integer | Credit count from `CourseUnit` |
| `suggestedSemester` | Number \| null | no | `null` | Positive integer or null | AI-suggested study semester; null if not provided |
| `skills` | String[] | yes | `[]` | Non-null array, empty at generation | Enriched by Feature 003 |
| `reason` | String | yes | — | Non-empty | Why this course is included (FR-015) |
| `resources` | Any[] | yes | `[]` | Always `[]` at generation time | Reserved for Feature 003 to populate later (FR-017, NFR-004) |

**Note on `skills`**: The `skills` array is empty at generation time and is later enriched by Feature 003. Cross-node deduplication is a presentation concern owned by Feature 004.

---

## State Machine: Roadmap Document (Canonical Rules)

```text
                    ┌──────────────────────────────────────────┐
                    │        roadmaps collection               │
                    └──────────────────────────────────────────┘

  [non-existent]
       │
       │  accepted payload commit (filter→validate→commit)
       ▼
  [completed, isPrimary=true|false]
       │
       ├── generation fails
       │   ▼
       │ [failed, isPrimary unchanged]
       │
       ├── PATCH /api/roadmaps/:roadmapId/primary
       │   ▼
       │ [completed, isPrimary=true] + previous primary -> isPrimary=false
       │
       └── new accepted commit
           ▼
         [completed, new version document]
```

**Initial failure path** (no prior accepted roadmap exists):
```text
  [non-existent]
       │  initial generation fails
       ▼
  [failed]  (created on first failure)
       │  retry succeeds + accepted payload commit
       ▼
  [completed]
```

**Transition guards**:

| From | To | Guard | Failure response |
|---|---|---|---|
| non-existent | completed | Acceptance payload passes completed-filter + prerequisite validation | `ALL_COMPLETED` or `PREREQUISITE_VIOLATION` |
| any | failed | Generation failure in lifecycle | Stored as failed with error message |
| failed | completed | Retry + acceptance payload passes validation | `CONFLICT` if generation already in progress |
| completed | completed | New accepted roadmap committed as new document version | `CONFLICT` on primary race |
| completed/failed | primary switched | `PATCH /api/roadmaps/:roadmapId/primary` transactional demote/promote | `ROADMAP_NOT_FOUND` / `CONFLICT` |
| any | any | No direct client-provided status transition allowed | 400 |

**Re-generation failure note**: On re-generation failure, Feature 009 records a failed roadmap state per canonical lifecycle rules. Existing completed roadmap versions remain queryable; primary selection is unaffected unless explicitly switched.

---

## Primary Selection Invariant

For each `userId`, the system invariant is:

$$
\sum\_{r \in \text{Roadmaps}(userId)} [r.isPrimary = true] = 1
$$

Feature 009 enforces this invariant using a partial unique index and transaction-safe demote/promote logic.

---

## In-Memory Entity: RoadmapPreview Store (Transient)

**Not a MongoDB collection** — lives only in the Node.js process heap. Lost on Render restart. The generation lifecycle may store preview payload for notification/review UX. Acceptance commit no longer depends on this store as source of truth.

| Property | Value |
|---|---|
| Type | `Map<string, PreviewPayload>` |
| Key | `userId.toString()` |
| Value | `{ nodes, personalisationLevel, triggerReason, studentProfileId }` |
| Max entries | One per user with a pending review (typically low) |
| Cleanup | `clearPendingPreview(userId)` called on superseded preview, explicit discard, or generation failure |
| Restart handling | `SIGTERM` handler iterates all keys, calls `upsertFailed`, clears all entries |

**See**: [research.md R-004](research.md) for implementation pattern and SIGTERM handler.

---

## Referenced Entities (read-only from this feature)

### StudentProfile

**MongoDB collection**: `student_profiles`
**Owned by**: Feature 001 (Profile Onboarding)
**Access from this feature**: `findOne({ _id: studentProfileId })` to retrieve profile for generation input. `findOneAndUpdate({ userId }, { $set: { repersonalizationPending: false } })` to clear the flag after canonical acceptance/discard handling (FR-031). No other writes.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Used to link roadmap → profile |
| `major` | String | Primary filter for DAG retrieval |
| `completedCourseIds` | ObjectId[] | Used as satisfied prerequisite anchors (not nodes) |
| `careerGoal.role` | String \| null | Determines `personalisationLevel` |
| `careerGoal.companyType` | String \| null | Determines `personalisationLevel` |
| `graduationTimeline` | String \| null | Optional AI context |
| `personalAspirations` | String \| null | Optional AI context |

### CourseUnit

**MongoDB collection**: `course_units`
**Owned by**: Feature 002 (Seed CTĐT DAG)
**Access from this feature**: `find({ major })` to retrieve the full DAG for the student's major. No writes.

| Field | Type | Notes |
|---|---|---|
| `code` | String | e.g., `"INT2204"` — matched against `completedCourseIds` codes |
| `name` | String | Copied into `RoadmapNode.courseName` |
| `credits` | Number | Copied into `RoadmapNode.credits` |
| `type` | String | `required` \| `elective` — used for AI course selection instructions |
| `prerequisites` | String[] | Array of `code` values — used in topological sort validation |
| `suggestedSemester` | Number \| null | Passed to AI as DAG context |
| `major` | String | Filter key for DAG retrieval |
