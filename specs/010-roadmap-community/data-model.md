## Entity: CommunityPost

**MongoDB collection**: `community_posts`

**Purpose**: Represents a public post in the community feed, linking a SharedRoadmap snapshot to a user-authored post. Handles likes and allows the user to add a content message. Only CommunityPosts are shown in the community feed.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users` | Author of the post |
| `sharedRoadmapId` | ObjectId | yes | — | ref: `shared_roadmaps` | The snapshot being shared |
| `content` | String | no | `""` | Max length 2000 | User-authored text content for the post |
| `likeCount` | Number | yes | `0` | Integer ≥ 0; atomic `$inc` only | Denormalized counter; never reset |
| `createdAt` | Date | auto | `Date.now()` | Set once | Creation timestamp |
| `updatedAt` | Date | auto | `Date.now()` | Updated on edit | Last update timestamp |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `sharedRoadmapId_unique` | `sharedRoadmapId: 1` | **Unique** | One CommunityPost per SharedRoadmap |
| `userId_idx` | `userId: 1` | Standard | Find all posts by a user |

### Write paths

**Create post**:
```
CommunityPost.create({ userId, sharedRoadmapId, content, likeCount: 0, createdAt: Date.now(), updatedAt: Date.now() })
```

**Edit content**:
```
CommunityPost.findOneAndUpdate(
  { _id: postId, userId },
  { $set: { content, updatedAt: Date.now() } }
)
```

**Like/Unlike**: (see LikeRecord, now linked to CommunityPost)

**Feed filtering, forking, and all other features now operate on CommunityPost, not directly on SharedRoadmap.
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
| `skills` | Array\<String\> | yes | Skills gained from this course |
| `reason` | String | yes | Why this course is in the roadmap |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_idx` | `userId: 1` | Standard | Audit — find all snapshots for a user |

### Write path

Created in one synchronous step at share-link generation or community publish. Never mutated after creation. The old snapshot is retained when a community entry is re-published (the `CommunityEntry.snapshotId` is updated to point to the new snapshot; the old document remains for any active share links that reference it).

---



## Entity: SharedRoadmap

**MongoDB collection**: `shared_roadmaps`

**Purpose**: Unified sharing and community publishing object. Each SharedRoadmap points to an immutable RoadmapSnapshot and exposes a single unique URL/token. Link sharing and community publishing access are controlled independently, with privacy and community metadata managed here. This enables flexible toggling between private, community, and public for both direct link and community feed.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users` | Owning student |
| `snapshotId` | ObjectId | yes | — | ref: `roadmap_snapshots` | The immutable snapshot this share serves |
| `token` | String | yes | — | **Unique**; UUID v4 | Public URL token — never reused |
| `accessMode` | String | yes | `'private'` | Enum: `'private'` \| `'users-only'` \| `'public'` |
Controls who can view via direct link:
- `'private'`: Only owner can view
- `'users-only'`: Only specific users (by userId) can view, either by search or link
- `'public'`: Anyone can view (searchable and by link)
| `sharedWithUserIds` | Array<ObjectId> | no | `[]` | Only for `linkAccessMode: 'users-only'` | List of userIds allowed to access (search or link) |
| `status` | String | yes | `'active'` | Enum: `'active'` \| `'revoked'` | Revoked links are retained for audit |
| `privacySetting` | String | yes | `'identified'` | Enum: `'identified'` \| `'anonymous'` | Controls identity display; can be toggled anytime |
| `exactMajor` | String | yes | — | — | Raw major string; substituted with `majorGroup` at response time when anonymous |
| `majorGroup` | String | yes | — | From `system_config` major-group mapping | Used for feed filtering and anonymous display |
| `careerGoalRole` | String | yes | — | From Feature 001 | Feed metadata and filter |
| `personalisationLevel` | String | yes | — | Enum: `'full'` \| `'low'` | From Feature 009 |
| `likeCount` | Number | yes | `0` | Integer ≥ 0; atomic `$inc` only | Denormalized counter; never reset on mode change |
| `createdAt` | Date | auto | `Date.now()` | Set once | Creation timestamp |
| `publishedAt` | Date | no | `null` | Set when communityAccessMode is set to 'community' | Feed sort secondary key |
| `revokedAt` | Date | no | `null` | Set at revoke time | Null when active |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `token_unique` | `token: 1` | **Unique** | Public token lookup |
| `userId_active_partial` | `userId: 1` | Standard | Allows multiple active shares per student |
**Purpose**: Unified sharing and community publishing object. Each SharedRoadmap points to an immutable RoadmapSnapshot and exposes a single unique URL/token. Link sharing and community publishing access are controlled independently, with privacy and community metadata managed here. Multiple active SharedRoadmap records per student are allowed, each representing a specific snapshot/version. Only shares with `linkAccessMode: 'public'` and `communityAccessMode: 'community'` appear in the Community Feed.
| `userId_idx` | `userId: 1` | Standard | Student's own link management |
| `majorGroup_idx` | `majorGroup: 1` | Standard | Feed filter by major group |
| `careerGoalRole_idx` | `careerGoalRole: 1` | Standard | Feed filter by career goal role |

### State transitions

```
[no share]         ──generate──▶  [status: active, linkAccessMode: X, communityAccessMode: Y]
[status: active]   ──revoke──▶   [status: revoked]
[status: revoked]  ──(retained for audit; never reactivated)
// Multiple [status: active] SharedRoadmap records per user are allowed, each for a different snapshot/version.
```

### Write paths

**Generate**:
```
1. Check eligibility: Roadmap.acceptedAt + Y_DAY_HOLD_DAYS ≤ now
2. Check no active share exists (application-level, before DB write — gives clear 409)
2. (Removed) No uniqueness constraint on active shares per user — multiple active shares allowed
3. RoadmapSnapshot.create({ userId, capturedAt, nodes: filteredNodes, nodeCount })
4. SharedRoadmap.create({ userId, snapshotId, token, linkAccessMode, communityAccessMode, privacySetting, ... })
```


**Change link access mode**:
```
// To set as public:
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { linkAccessMode: 'public' } }
)

// To set as link-only:
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { linkAccessMode: 'link-only' } }
)

// To set as users-only (with allowed users):
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { linkAccessMode: 'users-only', sharedWithUserIds: [userId1, userId2, ...] } }
)

// To set as private:
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { linkAccessMode: 'private', sharedWithUserIds: [] } }
)
```

**Change community access mode / publish to community**:
```
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { communityAccessMode: 'community', publishedAt: Date.now() } }
)
```

**Revoke**:
```
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { status: 'revoked', revokedAt: Date.now() } }
)
```

**Toggle privacy**:
```
SharedRoadmap.findOneAndUpdate(
  { userId, status: 'active' },
  { $set: { privacySetting: 'anonymous' } }
)
```

**Like/Unlike**: (see LikeRecord)

**Feed filtering, forking, and all other features now operate on SharedRoadmap, not separate CommunityEntry or ShareLink.

## Fork Processing Rules (cross-feature contract alignment)

1. **Canonical course identity** for completed-course filtering is tuple **`(major, courseCode)`**.
  - `major` comes from node metadata when present; otherwise resolve from course-catalog mapping.
2. `courseUnitId` is optional metadata only and MUST NOT be the canonical identity key.
3. Processing order is strict:
  - filter completed courses from snapshot nodes first,
  - then call Feature 009 fork-consumable acceptance endpoint for prerequisite validation.
4. Fork request payload sent to Feature 009 uses **full roadmap nodes**, not `courseCode[]` only.
5. After a successful fork acceptance, side effects execute: notification dispatch, eligibility clock reset (acceptance semantics), audit log write, and progress-tracking update if Feature 007 integration is present.

---


## Entity: LikeRecord

**MongoDB collection**: `like_records`

**Purpose**: Tracks which students have liked which community posts. Enforces one-like-per-user-per-post at the DB level. `CommunityPost.likeCount` is the fast-read denormalized counter; `LikeRecord` is the uniqueness source of truth.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users`; part of compound unique key | Who liked |
| `communityPostId` | ObjectId | yes | — | ref: `community_posts`; part of compound unique key | Which post |
| `createdAt` | Date | auto | `Date.now()` | — | Timestamp of like action |

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_postId_unique` | `userId: 1, communityPostId: 1` | **Unique compound** | One like per user per post; fast unlike lookup |
| `postId_idx` | `communityPostId: 1` | Standard | Cascade delete when post is deleted |

### Like/Unlike atomicity

**Like**:
```
1. LikeRecord.create({ userId, communityPostId })
  → throws E11000 on duplicate → return 409
2. CommunityPost.findByIdAndUpdate(communityPostId, { $inc: { likeCount: 1 } })
```

**Unlike**:
```
1. LikeRecord.deleteOne({ userId, communityPostId })
  → if noop (record not found) → return 404
2. CommunityPost.findByIdAndUpdate(communityPostId, { $inc: { likeCount: -1 } })
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
| `StudentProfile` | `student_profiles` | Feature 001 | `userId`, `careerGoal.role`, canonical completed-course records by `(major, courseCode)` (optional `courseUnitId`) |
| `Roadmap` | `roadmaps` | Feature 009 | `userId`, `acceptedAt`, `nodes[]`, `personalisationLevel` |
| `User` | `users` | Feature 005 | `_id`, `displayName`, `privacySetting`, `major` |

This feature MUST NOT write to any of these collections.
