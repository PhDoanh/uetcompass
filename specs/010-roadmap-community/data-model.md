# Data Model: Roadmap Community

**Feature**: `010-roadmap-community`
**Date**: 2026-03-29
**Research dependency**: `research.md`

## Entity: RoadmapSnapshot

Collection: `roadmap_snapshots`

Purpose: Immutable capture of roadmap nodes at share/publish time.

Fields:
- `_id: ObjectId`
- `userId: ObjectId` (owner)
- `acceptedRoadmapId: ObjectId` (source accepted roadmap)
- `capturedAt: Date` (immutable)
- `contentHash: String` (hash of canonical node payload for duplicate detection)
- `nodes: SnapshotNode[]` (immutable array)
- `nodeCount: Number`

SnapshotNode fields:
- `courseCode: String`
- `courseName: String`
- `skills: string[]`
- `reason: String`
- `major: String` (when available from source node/catalog resolution for fork filtering)

Indexes:
- `{ userId: 1, capturedAt: -1 }`
- `{ acceptedRoadmapId: 1, contentHash: 1 }` unique

Rules:
- Never updated after creation.
- Contains only publicly permitted roadmap fields.

## Entity: SharedRoadmap

Collection: `shared_roadmaps`

Purpose: Link object for one snapshot with stable token and mutable access controls.

Fields:
- `_id: ObjectId`
- `userId: ObjectId`
- `snapshotId: ObjectId` (unique, one SharedRoadmap per snapshot)
- `token: String` (unique, stable)
- `accessMode: 'private' | 'users-only' | 'public'`
- `allowedUserIds: ObjectId[]` (used only when `users-only`)
- `status: 'active' | 'revoked'`
- `createdAt: Date`
- `updatedAt: Date`
- `revokedAt: Date | null`

Indexes:
- `{ token: 1 }` unique
- `{ snapshotId: 1 }` unique
- `{ userId: 1, status: 1, createdAt: -1 }`

Rules:
- Token does not change when access mode changes.
- Switching to `private` blocks external access immediately.
- Revoked links are retained for audit and always resolve as not found/forbidden externally.

## Entity: CommunityPost

Collection: `community_posts`

Purpose: Feed-visible immutable publication that points to exactly one `SharedRoadmap`.

Fields:
- `_id: ObjectId`
- `userId: ObjectId` (post owner)
- `sharedRoadmapId: ObjectId` (snapshot pointer through share)
- `publishedAt: Date`
- `likeCount: Number` (>= 0)
- `createdAt: Date`

Indexes:
- `{ userId: 1 }` unique partial where active post semantics apply (or replace-upsert by user)
- `{ publishedAt: -1 }`
- `{ likeCount: -1, publishedAt: -1 }` (optional for sort mode support)
- `{ sharedRoadmapId: 1 }` unique

Rules:
- Post content/snapshot pointer is immutable after publish; no edit endpoint.
- At most one active post per user.
- Likes belong to post identity and remain attached unless post is removed.
- If access mode no longer allows public feed visibility, publication behavior follows explicit product rule (unpublish or hidden state as defined in API contract).

## Entity: CommunityPostLike

Collection: `community_post_likes`

Purpose: User-to-post like mapping.

Fields:
- `_id: ObjectId`
- `communityPostId: ObjectId`
- `userId: ObjectId`
- `createdAt: Date`

Indexes:
- `{ communityPostId: 1, userId: 1 }` unique
- `{ userId: 1, createdAt: -1 }`

Rules:
- One like per user per post.
- Like/unlike updates `CommunityPost.likeCount` atomically (`$inc`) around like record write.

## Referenced external entities (read-only)

- `users`: `_id`, `displayName`, `privacySetting`, `major` (Feature 005)
- `student_profiles`: `userId`, career goal and completed course records (Feature 001)
- `roadmaps`: accepted roadmap source and nodes (Feature 009)

## State transitions

SharedRoadmap:
- `active` -> `revoked`
- `accessMode` mutable while `status=active` with same token

CommunityPost:
- `none` -> `published`
- `published` -> `unpublished` (delete/archive)
- `published` replaced by republish is modeled as new immutable post record while maintaining one active post per user
