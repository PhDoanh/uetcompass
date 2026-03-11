# Data Model: Roadmap Community

**Feature**: `010-roadmap-community`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-001 through R-007)

---

## Entity: RoadmapSnapshot

**MongoDB collection**: `roadmap_snapshots`

**Purpose**: Immutable point-in-time capture of a student's accepted roadmap nodes, created synchronously when a share link is generated OR a community entry is published. Only publicly permissible fields are stored — `supportingSkills` and `careerRelevanceNote` are excluded at capture time and never stored here.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users` | Owning student — for audit only |
| `capturedAt` | Date | yes | `Date.now()` | Set once; never updated | Timestamp of capture |
| `nodes` | Array\<SnapshotNode\> | yes | — | Non-empty | Filtered node records — see sub-document below |
| `nodeCount` | Number | yes | — | Integer ≥ 1; equals `nodes.length` | Denormalized for fast feed card display without loading full node array |

**SnapshotNode sub-document** (embedded):

| Field | Type | Required | Notes |
|---|---|---|---|
| `courseCode` | String | yes | e.g., `"INT2204"` |
| `courseName` | String | yes | e.g., `"Cơ sở dữ liệu"` |
| `gainedSkills` | Array\<String\> | yes | Skills gained from this course |
| `reason` | String | yes | Why this course is in the roadmap |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_idx` | `userId: 1` | Standard | Audit — find all snapshots for a user |

### Write path

Created in one synchronous step at share-link generation or community publish. Never mutated after creation. The old snapshot is retained when a community entry is re-published (the `CommunityEntry.snapshotId` is updated to point to the new snapshot; the old document remains for any active share links that reference it).

---

## Entity: ShareLink

**MongoDB collection**: `share_links`

**Purpose**: Student's active or revoked public share link. Points to an immutable `RoadmapSnapshot`. At most one link with `status: 'active'` per student, enforced by a partial unique index. Revoked links are retained for audit.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users` | Owning student |
| `snapshotId` | ObjectId | yes | — | ref: `roadmap_snapshots` | The immutable snapshot this link serves |
| `token` | String | yes | — | **Unique**; UUID v4 via `crypto.randomUUID()` | Public URL token — never reused |
| `status` | String | yes | `'active'` | Enum: `'active'` \| `'revoked'` | Drives partial unique index |
| `createdAt` | Date | auto | `Date.now()` | Set once | |
| `revokedAt` | Date | no | `null` | Set at revoke time | Null when active |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `token_unique` | `token: 1` | **Unique** | Public token lookup on every share-link serve request |
| `userId_active_partial` | `userId: 1` | **Unique (partial: `{ status: 'active' }`)** | At most one active link per student |
| `userId_idx` | `userId: 1` | Standard | Student's own link management (get current link, revoke) |

### State transitions

```
[no link]         ──generate──▶  [status: active]
[status: active]  ──revoke──▶   [status: revoked]
[status: revoked] ──(retained for audit; never reactivated)
```

### Write paths

**Generate**:
```
1. Check eligibility: Roadmap.acceptedAt + Y_DAY_HOLD_DAYS ≤ now
2. Check no active link exists (application-level, before DB write — gives clear 409)
3. RoadmapSnapshot.create({ userId, capturedAt, nodes: filteredNodes, nodeCount })
4. ShareLink.create({ userId, snapshotId, token: crypto.randomUUID(), status: 'active' })
```

**Revoke**:
```
ShareLink.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { status: 'revoked', revokedAt: Date.now() } }
)
```

---

## Entity: CommunityEntry

**MongoDB collection**: `community_entries`

**Purpose**: A student's snapshot-based presence in the community feed. At most one active entry per student (unique index on `userId`). Content is fixed at publish time via `snapshotId`. Re-publishing updates `snapshotId` and metadata but never resets `likeCount`. Privacy substitution (identified ↔ anonymous) is applied at response time — raw values are always stored here.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users`; **unique** | Enforces one entry per student |
| `snapshotId` | ObjectId | yes | — | ref: `roadmap_snapshots` | Current published snapshot; updated on re-publish |
| `exactMajor` | String | yes | — | — | Raw major string; substituted with `majorGroup` at response time when anonymous |
| `majorGroup` | String | yes | — | From `system_config` major-group mapping | Used for feed filtering and anonymous display |
| `careerGoalRole` | String | yes | — | From Feature 001 `StudentProfile` | Feed metadata and filter |
| `personalisationLevel` | String | yes | — | Enum: `'full'` \| `'low'` | From Feature 009 `Roadmap` |
| `likeCount` | Number | yes | `0` | Integer ≥ 0; atomic `$inc` only | Denormalized counter; **never reset on re-publish** |
| `publishedAt` | Date | yes | `Date.now()` | Updated on each re-publish | Feed sort secondary key |
| `createdAt` | Date | auto | `Date.now()` | Set once via `$setOnInsert` | First-ever publication timestamp |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_unique` | `userId: 1` | **Unique** | At most one community entry per student |
| `majorGroup_idx` | `majorGroup: 1` | Standard | Feed filter by major group |
| `careerGoalRole_idx` | `careerGoalRole: 1` | Standard | Feed filter by career goal role |

### Write paths

**Publish (initial or re-publish)**:
```
1. Check eligibility: Roadmap.acceptedAt + Y_DAY_HOLD_DAYS ≤ now
2. RoadmapSnapshot.create({ userId, capturedAt, nodes: filteredNodes, nodeCount })
3. CommunityEntry.findOneAndUpdate(
     { userId },
     {
       $set: {
         snapshotId,        ← updated to new snapshot
         exactMajor,
         majorGroup,
         careerGoalRole,
         personalisationLevel,
         publishedAt: Date.now()
         // likeCount is intentionally NOT in $set → preserved on re-publish
       },
       $setOnInsert: { likeCount: 0, createdAt: Date.now() }
     },
     { upsert: true, new: true }
   )
```

**Unpublish**:
```
CommunityEntry.deleteOne({ userId })
LikeRecord.deleteMany({ communityEntryId: entry._id })   ← cascade
```

---

## Entity: LikeRecord

**MongoDB collection**: `like_records`

**Purpose**: Tracks which students have liked which community entries. Enforces one-like-per-user-per-entry at the DB level. `CommunityEntry.likeCount` is the fast-read denormalized counter; `LikeRecord` is the uniqueness source of truth.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users`; part of compound unique key | Who liked |
| `communityEntryId` | ObjectId | yes | — | ref: `community_entries`; part of compound unique key | Which entry |
| `createdAt` | Date | auto | `Date.now()` | — | Timestamp of like action |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_entryId_unique` | `userId: 1, communityEntryId: 1` | **Unique compound** | One like per user per entry; fast unlike lookup |
| `entryId_idx` | `communityEntryId: 1` | Standard | Cascade delete when entry is unpublished |

### Like/Unlike atomicity

**Like**:
```
1. LikeRecord.create({ userId, communityEntryId })
   → throws E11000 on duplicate → return 409
2. CommunityEntry.findByIdAndUpdate(communityEntryId, { $inc: { likeCount: 1 } })
```

**Unlike**:
```
1. LikeRecord.deleteOne({ userId, communityEntryId })
   → if noop (record not found) → return 404
2. CommunityEntry.findByIdAndUpdate(communityEntryId, { $inc: { likeCount: -1 } })
```

Both operations use two separate MongoDB writes. A missed `$inc` (e.g., connection drop between the two writes) leaves the counter off by one — a degraded-but-safe state for a social signal, not a critical inconsistency.

---

## Referenced Entity: SystemConfig (shared, read-only by this feature)

**MongoDB collection**: `system_config`

| Field | Type | Notes |
|---|---|---|
| `key` | String | Unique. This feature reads `'Y_DAY_HOLD_DAYS'` |
| `value` | Mixed | Integer for Y (default: `7`) |
| `updatedAt` | Date | Last update timestamp |

This feature caches the value in a module-level variable with a 60-second TTL to avoid a DB round-trip on every eligibility check.

---

## Referenced Entities (read-only, owned by other features)

| Entity | Collection | Owner | Fields read by this feature |
|---|---|---|---|
| `StudentProfile` | `student_profiles` | Feature 001 | `userId`, `completedCourseIds`, `careerGoalRole`, `major`, `privacySetting` |
| `Roadmap` | `roadmaps` | Feature 009 | `userId`, `acceptedAt`, `nodes[]`, `personalisationLevel` |
| `User` | `users` | Feature 005 | `_id`, `displayName` |

This feature MUST NOT write to any of these collections.
