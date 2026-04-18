# Data Model: Manual Roadmap Generator

**Feature**: `001-manual-roadmap-generator`
**Date**: 2026-04-09
**Alignment**: Data model is intentionally similar to Feature 009's canonical roadmap schema and adopts Feature 004's skill-tree node semantics.

---

## Entity: Roadmap

**MongoDB collection**: `manual_roadmaps`

**Purpose**: Stores user-authored YAML roadmaps with DAG node metadata and sharing/version history.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | Indexed; ref: `users` | Owner reference |
| `title` | String | yes | — | `1..200` chars | User-facing roadmap title |
| `description` | String | no | `''` | `<=1000` chars | Optional description |
| `yamlCode` | String | yes | — | `<=10240` chars | Raw YAML source; validated on save |
| `nodes` | RoadmapNode[] | yes | `[]` | Stable node order for rendering/export | Canonical graph payload |
| `shared` | Boolean | yes | `false` | | Shared state for community visibility |
| `isPublic` | Boolean | yes | `false` | | Public visibility flag for community listing |
| `status` | String | yes | `draft` | Enum: `draft` \\| `published` \\| `archived` | Document lifecycle state |
| `createdAt` | Date | auto | `Date.now()` | | |
| `updatedAt` | Date | auto | `Date.now()` | | |
| `sharedAt` | Date \\| null | no | `null` | | Set when roadmap is shared |
| `versions` | RoadmapSnapshot[] | yes | `[]` | Immutable publish snapshots | Optional history cache |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `manual_roadmap_by_user` | `{ userId: 1, updatedAt: -1 }` | Non-unique | User-scoped listing |
| `manual_roadmap_public` | `{ isPublic: 1, updatedAt: -1 }` | Non-unique | Community listing |
| `manual_roadmap_user_title` | `{ userId: 1, title: 1 }` | Non-unique | Optional de-duplication / UI lookup |

### Validation rules applied at service layer

- `yamlCode` is parsed by `js-yaml` and validated by `ajv` against the roadmap JSON schema.
- `nodes` must be a valid graph payload with unique `nodeId` values.
- `nodes` must be topologically ordered; the server may normalize order before persisting.
- `status` transitions are controlled by feature lifecycle: `draft → published → archived`.
- `sharedAt` is set when `shared` becomes `true` and cleared only if `shared` is reverted.

---

## Embedded Sub-Document: RoadmapNode

**Purpose**: A single node in the roadmap DAG. Node semantics are compatible with Feature 004 skill-tree states.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `nodeId` | String | yes | — | Unique within roadmap | Primary node key |
| `roadmapName` | String | yes | — | Non-empty | Display title |
| `description` | String | no | `''` | `<=1000` chars | Optional details |
| `status` | String | yes | `pending` | Enum: `locked` \\| `pending` \\| `in_progress` \\| `done` | Status semantics follow Feature 004 |
| `skillName` | String | no | `''` | Single skill label or ID | Optional skill mapping |
| `metadata` | Object | no | `{}` | | Additional node metadata for UI or integration |

### Node semantics

- `locked`: node is not available yet; this is a computed state and may be stored for UI convenience.
- `pending`: explicit initial state for unlocked nodes.
- `in_progress`: the user has started work on the node.
- `done`: the node is complete.
- Node unlock rules are implementation-defined and can be driven by metadata.
- The frontend may display locked nodes with a faded style and show details for `pending`/`in_progress`/`done` states.
- Each node stores exactly one `skillName` value; multi-skill arrays are not part of this model.

---

## Entity: RoadmapSnapshot

**Purpose**: Immutable historical capture of a roadmap at share/publish time.

### Schema

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | Snapshot ID |
| `yamlCode` | String | yes | — | Frozen YAML source |
| `nodes` | RoadmapNode[] | yes | — | Frozen node payload |
| `sharedAt` | Date | yes | — | Timestamp of capture |

---

## Referenced Entity: User

The `users` collection is assumed to be shared with other features.

**Relevant fields**:
- `_id`: ObjectId
- `displayName`: String
- `email`: String

---

## Business Rules

- Roadmaps are owned by users and remain editable as `draft` until shared.
- Sharing a roadmap converts it to `published` and creates a `RoadmapSnapshot` entry.
- Users may fork a shared roadmap into a new `draft` version.
- Public roadmaps are visible in community listings only when `isPublic: true`.
- YAML validation occurs on every save and every share.
- Node unlock semantics follow Feature 004 and are evaluated from node metadata/state.
- The roadmap data model intentionally mirrors Feature 009's node-driven graph payload so shared exports and integrations remain compatible.
