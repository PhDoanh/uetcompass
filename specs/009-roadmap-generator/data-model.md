# Data Model: AI-Powered Personalised Roadmap Generator

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-11
**Research dependency**: [research.md](research.md) (R-001, R-003, R-004)

---

## Entity: Roadmap

**MongoDB collection**: `roadmaps`

**Purpose**: Single document per authenticated student holding their accepted, active learning roadmap — or a failure record awaiting retry. Only an explicitly accepted preview may be committed here. One document per user at all times (enforced by unique index on `userId`).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | **Unique index**; ref: `users` | Foreign key to authenticated user (Feature 005) |
| `studentProfileId` | ObjectId | yes | — | ref: `student_profiles` | The profile snapshot that drove this generation (Feature 001) |
| `personalisationLevel` | String | yes | — | Enum: `full` \| `low` | `low` when no career goal provided (FR-020) |
| `status` | String | yes | — | Enum: `completed` \| `failed` | `completed` = accepted and active; `failed` = generation failure awaiting retry (FR-024) |
| `errorMessage` | String \| null | no | `null` | Set on failure; `null` on completed | Human-readable generation error stored for internal debugging (FR-028) |
| `nodes` | RoadmapNode[] | yes | `[]` | Ordered array; see embedded doc below | Empty array is valid (e.g., all courses completed) |
| `createdAt` | Date | auto | `Date.now()` | Set on first insert (`$setOnInsert`) | |
| `acceptedAt` | Date \| null | no | `null` | Set on acceptance; never overwritten | `null` on `failed` documents |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_unique` | `{ userId: 1 }` | **Unique** | One roadmap document per student (FR-023); fast lookup by auth token |

### Validation rules applied at service layer

- `personalisationLevel` is derived from the `StudentProfile` before the Gemini call — it is NOT set from user input.
- `status` transitions are controlled exclusively by the generation lifecycle and acceptance services — no direct client-provided status is accepted.
- `errorMessage` is set only on generation failure (never on acceptance); it is cleared (set to `null`) when the document is updated to `completed` via `upsertCompleted`.

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
| `gainedSkills` | String[] | yes | `[]` | Non-null array | Skills taught directly by this course (FR-013) |
| `supportingSkills` | String[] | yes | `[]` | Non-null array; no overlap with `gainedSkills` on the same node | Self-study skills needed in practice (FR-014) |
| `reason` | String | yes | — | Non-empty | Why this course is included (FR-015) |
| `careerRelevanceNote` | String | yes | — | Non-empty | Connects course to the student's target role (FR-016) |
| `resources` | Any[] | yes | `[]` | Always `[]` at generation time | Reserved for Feature 003 to populate later (FR-017, NFR-004) |

**Note on `gainedSkills` vs `supportingSkills`**: These are independently scoped per node — the same skill may appear in `supportingSkills` on multiple nodes if it is genuinely relevant to each. Cross-node deduplication is a presentation concern owned by Feature 004 (as per clarification Q3).

---

## State Machine: Roadmap Document

```text
                    ┌──────────────────────────────────────────┐
                    │        roadmaps collection               │
                    └──────────────────────────────────────────┘

  [non-existent]
       │
       │  generation completes → student accepts preview
       ▼
  [completed]  { status: 'completed', nodes: [...], acceptedAt: Date, errorMessage: null }
       │
       ├─── re-generation completes → student accepts new preview
       │    ──────────────────────────────────────────────────────────────────────▶ [completed]  (document replaced in-place)
       │
       └─── generation fails (Gemini error / topo violation / parse error / restart)
            ▼
       [failed]  { status: 'failed', errorMessage: string, nodes: [...prev or []] }
            │
            │  student triggers /api/roadmap/retry → generation completes → student accepts
            ▼
       [completed]  (document replaced in-place)
```

**Initial failure path** (no prior accepted roadmap exists):
```text
  [non-existent]
       │  initial generation fails
       ▼
  [failed]  (created on first failure)
       │  retry succeeds + student accepts
       ▼
  [completed]
```

**Transition guards**:

| From | To | Guard | Failure response |
|---|---|---|---|
| non-existent | completed | `findOneAndUpdate({ userId }, ..., { upsert: true })` on acceptance | — |
| non-existent | failed | `findOneAndUpdate({ userId }, ..., { upsert: true })` on generation failure | — |
| completed | completed | Student accepts new preview; `upsertCompleted` replaces document in-place | — |
| completed | failed | Re-generation fails; `upsertFailed` updates `status` and `errorMessage` | Previous `nodes` retained for display; only `status` and `errorMessage` change |
| failed | completed | Student triggers retry → generation succeeds → student accepts | 409 if generation already in-progress |
| any | any | No direct client-provided status update is permitted | Controller returns 400 if `status` is in request body |

**Re-generation failure note**: When a re-generation fails while the student has an existing `completed` roadmap, the `status` is updated to `failed` and `errorMessage` is set, but the `nodes` array from the previous accepted generation is preserved. Feature 004 can continue rendering the previous course sequence while showing the "generation failed — retry available" state. On retry success and acceptance, the document is fully replaced with the new `nodes`.

---

## In-Memory Entity: RoadmapPreview Store

**Not a MongoDB collection** — lives only in the Node.js process heap. Lost on Render restart (this is the designed behaviour per FR-034). The generation lifecycle stores a preview here after a successful Gemini call; the acceptance/rejection endpoints look it up and clear it.

| Property | Value |
|---|---|
| Type | `Map<string, PreviewPayload>` |
| Key | `userId.toString()` |
| Value | `{ nodes, personalisationLevel, triggerReason, studentProfileId }` |
| Max entries | One per user with a pending review (typically low) |
| Cleanup | `clearPendingPreview(userId)` called on accept, reject, or generation failure |
| Restart handling | `SIGTERM` handler iterates all keys, calls `upsertFailed`, clears all entries |

**See**: [research.md R-004](research.md) for implementation pattern and SIGTERM handler.

---

## Referenced Entities (read-only from this feature)

### StudentProfile

**MongoDB collection**: `student_profiles`
**Owned by**: Feature 001 (Profile Onboarding)
**Access from this feature**: `findOne({ _id: studentProfileId })` to retrieve profile for generation input. `findOneAndUpdate({ userId }, { $set: { repersonalizationPending: false } })` to clear the flag after re-generation preview accept/reject (FR-031). No other writes.

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Used to link roadmap → profile |
| `major` | String | Primary filter for DAG retrieval |
| `completedCourseIds` | ObjectId[] | Used as satisfied prerequisite anchors (not nodes) |
| `careerGoal.role` | String \| null | Determines `personalisationLevel` |
| `careerGoal.companyType` | String \| null | Determines `personalisationLevel` |
| `graduationTimeline` | String \| null | Optional AI context |
| `personalAspirations` | String \| null | Optional AI context |
| `repersonalizationPending` | Boolean | Read to trigger re-generation; cleared by this feature after accept/reject |

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
