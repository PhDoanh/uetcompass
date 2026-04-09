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
| `nodes` | RoadmapNode[] | yes | `[]` | Ordered array; see embedded doc below | Empty array is valid (e.g., all courses completed) |
| `createdAt` | Date | auto | `Date.now()` | Set on first insert (`$setOnInsert`) | | 
| `acceptedAt` | Date \| null | no | `null` | Set on acceptance | `null` on `failed` documents |
| `updatedAt` | Date | auto | `Date.now()` | Indexed via list index | Timeline/list ordering |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `primary_per_user_unique` | `{ userId: 1, isPrimary: 1 }` with `partialFilterExpression: { isPrimary: true }` | **Unique (partial)** | At most one primary roadmap per user |
| `roadmap_list_by_user_acceptedAt_updatedAt` | `{ userId: 1, acceptedAt: 1, updatedAt: -1 }` | Non-unique | Fast listing by user sorted by recency |
| `roadmap_detail_by_user_id` | `{ userId: 1, _id: 1 }` | Non-unique | Auth-scoped detail lookup |

### Validation rules applied at service layer

- `personalisationLevel` is derived from the `StudentProfile` before the Gemini call — it is NOT set from user input.
- `acceptedAt` presence is the sole indicator of acceptance. A document without `acceptedAt` is failed/retryable. No `status` or `errorMessage` fields exist.
- `isPrimary` assignment is controlled only by Feature 009 primary-switch rules (`PATCH /api/roadmaps/:roadmapId/primary`) and acceptance commit policy.

---

## Embedded Sub-Document: RoadmapNode

**Not a separate collection** — embedded as an element of `Roadmap.nodes[]`.

**Purpose**: A single skill entry in the roadmap. Modelled after the roadmap.sh topic/subtopic structure. There are two node types:
- **`topic`** — a main-line skill concept (e.g. "Version Control Systems"). Sequentially ordered; foundational to the career goal. Connected to the next topic by a solid-edge flow.
- **`subtopic`** — a specific tool or technology that implements a topic (e.g. "Git", "GitHub"). Linked to its parent topic via `parentNodeId`. Connected by dashed edges.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `nodeId` | String | yes | — | Non-empty; unique within roadmap; kebab-slug of `skillName` (off-template) or inherited from template `id` (template-matched) | Stable identifier; used by Feature 004 for node references |
| `nodeType` | String | yes | — | Enum: `topic` \| `subtopic` | `topic` = main-line, `subtopic` = side node |
| `skillName` | String | yes | — | Non-empty | The skill or technology this node represents; primary identity |
| `parentNodeId` | String \| null | yes | `null` | Non-null only when `nodeType = subtopic` | Links subtopic to its parent topic node within the same roadmap |
| `relatedCourses` | RelatedCourse[] | yes | `[]` | Non-null array | Course(s) from the DAG that deliver this skill |
| `reason` | String | yes | — | Non-empty | Why this skill is included and how it contributes to the student's career goal |
| `resources` | Any[] | yes | `[]` | Always `[]` at generation time | Reserved for Feature 003 to populate later |

### RelatedCourse (embedded shape)

| Field | Type | Required | Notes |
|---|---|---|---|
| `courseCode` | String | yes | Matches `CourseUnit.code` |
| `courseName` | String | yes | Display name from the DAG |
| `credits` | Number | yes | Credit count from `CourseUnit` |

**Note on nodeId generation**:
- **Template-matched nodes**: `nodeId` is inherited directly from the template's `TemplateNode.id` field. The template is the authoritative source; no runtime generation is needed.
- **Off-template nodes**: `nodeId` is generated at runtime as a kebab-case slug of `skillName` (e.g. `"Git Flow"` → `"git-flow"`). Because `skillName` is deduplicated within a roadmap, the slug is unique within the roadmap without requiring a UUID. It is also stable across re-generations for the same skill, preserving Feature 004's node references.

**Note on ordering**: `nodes[]` is a flat ordered array. `topic` nodes form the sequential main line; `subtopic` nodes follow their parent topic in the array. Final order is determined jointly by the roadmap template (static JSON) and the AI.

**Note on progress state**: Per-node progress state is NOT embedded in `RoadmapNode`. It is tracked separately in the `roadmap_progress` collection (see RoadmapProgress entity below).

### Mongoose Schema Pattern

```js
// backend/src/modules/roadmap/roadmap.model.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const relatedCourseSchema = new Schema(
  {
    courseCode: { type: String, required: true },
    courseName: { type: String, required: true },
    credits:    { type: Number, required: true },
  },
  { _id: false }
);

const roadmapNodeSchema = new Schema(
  {
    nodeId:       { type: String, required: true }, // template id (template-matched) or kebab-slug of skillName (off-template)
    nodeType:     { type: String, enum: ['topic', 'subtopic'], required: true },
    skillName:    { type: String, required: true },
    parentNodeId: { type: String, default: null },
    relatedCourses: { type: [relatedCourseSchema], default: [] },
    reason:       { type: String, required: true },
    resources:    { type: [Schema.Types.Mixed], default: [] },
  },
  { _id: false }
);

const roadmapSchema = new Schema(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isPrimary:          { type: Boolean, required: true, default: false },
    studentProfileId:   { type: Schema.Types.ObjectId, ref: 'StudentProfile', required: true },
    personalisationLevel: { type: String, enum: ['full', 'low'], required: true },
    nodes:              { type: [roadmapNodeSchema], default: [] },
    acceptedAt:         { type: Date, default: null },
    createdAt:          { type: Date },
    updatedAt:          { type: Date },
  },
  {
    timestamps: true, // manages updatedAt automatically; createdAt set via $setOnInsert
  }
);

// Partial unique index: at most one primary roadmap per user
roadmapSchema.index(
  { userId: 1, isPrimary: 1 },
  { unique: true, partialFilterExpression: { isPrimary: true }, name: 'primary_per_user_unique' }
);

// List index: user roadmaps sorted by acceptance and recency
roadmapSchema.index(
  { userId: 1, acceptedAt: 1, updatedAt: -1 },
  { name: 'roadmap_list_by_user_acceptedAt_updatedAt' }
);

// Detail lookup: auth-scoped single document fetch
roadmapSchema.index(
  { userId: 1, _id: 1 },
  { name: 'roadmap_detail_by_user_id' }
);

module.exports = mongoose.model('Roadmap', roadmapSchema);
```

### Structural Example

```text
Main line (topics, solid edges):
  [Pick a Language] → [Version Control Systems] → [Repo Hosting] → ...

Side nodes (subtopics, dashed edges from parent topic):
  [Version Control Systems] ←── [Git]     (parentNodeId = version-control-systems)
                            ←── [GitHub]  (parentNodeId = version-control-systems)
```

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

## Static Reference: RoadmapTemplate

**Not a MongoDB collection** — defined as a static JSON file in source code, owned and hardcoded by another feature. Feature 009 reads this file at generation time; it does not write to or manage it.

**Purpose**: Provides a full low-personalisation roadmap (the canonical generic skill sequence for a given major or career track) that the AI uses as a base ordering structure during personalised generation.

### Shape (per template entry)

The template JSON mirrors the roadmap.sh node/edge structure. Feature 009 reads nodes and edges from it at generation time.

| Field | Type | Notes |
|---|---|---|
| `major` | String | Major this template applies to |
| `careerTrack` | String \| null | Career track scope; `null` = generic major-wide template |
| `personalisationLevel` | String | Always `'low'` |
| `nodes` | TemplateNode[] | Ordered nodes; each has `id`, `nodeType` (`topic`\|`subtopic`), `skillName` |
| `edges` | TemplateEdge[] | Connections; `edgeStyle: 'solid'` = main-line flow, `edgeStyle: 'dashed'` = topic→subtopic branch |

**TemplateNode fields**: `id`, `nodeType` (`topic` \| `subtopic`), `skillName`

**TemplateEdge fields**: `source` (nodeId), `target` (nodeId), `edgeStyle` (`solid` \| `dashed`)

### Access pattern from this feature

- Loaded from the bundled JSON file at generation time.
- Lookup: match by `major` and `careerTrack`; fall back to `careerTrack: null` if no career-track-specific template exists.
- Feature 009 performs **no writes** to this file.

---

## Referenced Entities (read-only from this feature)

### StudentProfile

**MongoDB collection**: `student_profiles`
**Owned by**: Feature 001 (Profile Onboarding)
**Access from this feature**: `findOne({ _id: studentProfileId })` to retrieve profile for generation input. No other writes.

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
| `skills` | String[] | Pre-seeded skill names — source for roadmap node `skillName` values |
| `prerequisites` | String[] | Array of `code` values — used in topological sort validation |
| `major` | String | Filter key for DAG retrieval |

---

## Entity: RoadmapProgress

**MongoDB collection**: `roadmap_progress`
**Owned by**: Feature 007 (Progress Tracking)
**Access from Feature 009**: Read-only where needed. Feature 009 does not write to this collection.

**Purpose**: Tracks per-node progress state for a given roadmap, decoupled from the `Roadmap` document. Uses a set-membership model — a `nodeId` appears in exactly one of the three arrays, or in none (implying `pending`).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---------|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users` | Owner of the roadmap |
| `roadmapId` | ObjectId | yes | — | ref: `roadmaps` | The roadmap being tracked |
| `done` | String[] | yes | `[]` | Elements are `nodeId` strings | Nodes the student has completed |
| `learning` | String[] | yes | `[]` | Elements are `nodeId` strings | Nodes the student is currently working on |
| `skipped` | String[] | yes | `[]` | Elements are `nodeId` strings | Nodes the student has explicitly skipped |
| `updatedAt` | Date | auto | `Date.now()` | — | Last modification timestamp |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `progress_per_user_roadmap` | `{ userId: 1, roadmapId: 1 }` | **Unique** | One progress document per user per roadmap |

### State model

A `nodeId` absent from all three arrays is implicitly `pending`. Transitions:

```text
  [pending] → [learning] → [done]
      │
      └──────────────────→ [skipped]
```

- A `nodeId` MUST appear in at most one array at any time.
- No reversals permitted.

### Frontend atom shape

This collection maps directly to the frontend progress atom:

```ts
export const roadmapProgress = atom<{
  done: string[];       // nodeId[]
  learning: string[];   // nodeId[]
  skipped: string[];    // nodeId[]
} | null>(null);
```
