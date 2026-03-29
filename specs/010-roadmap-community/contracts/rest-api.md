# API Contracts: Roadmap Community

**Feature**: `010-roadmap-community`
**Date**: 2026-03-29
**Base URL**: `/api/community`

## Contract conventions

- Error envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

- Auth: all endpoints require JWT except public share-link resolve endpoint.
- Post immutability: no endpoint exists to edit `CommunityPost` content/snapshot.

## Share link endpoints

### POST /share-links

Create snapshot + shared roadmap link for current accepted roadmap.

Response 201:
```json
{
  "sharedRoadmapId": "...",
  "snapshotId": "...",
  "token": "uuid-token",
  "shareUrl": "https://.../share/uuid-token",
  "accessMode": "private",
  "createdAt": "2026-03-29T10:00:00.000Z"
}
```

Errors:
- 403 `INELIGIBLE`
- 404 `ROADMAP_NOT_FOUND`
- 409 `DUPLICATE_SNAPSHOT_SHARE`

### PATCH /share-links/:token/access

Switch access mode without rotating token.

Request:
```json
{
  "accessMode": "users-only",
  "allowedUserIds": ["userA", "userB"]
}
```

Response 200:
```json
{
  "token": "uuid-token",
  "accessMode": "users-only",
  "allowedUserIds": ["userA", "userB"],
  "updatedAt": "2026-03-29T10:10:00.000Z"
}
```

Errors:
- 400 `INVALID_INPUT`
- 403 `FORBIDDEN`
- 404 `NOT_FOUND`

### DELETE /share-links/:token

Revoke link.

Response 204.

### GET /share-links/:token

Public snapshot resolve endpoint (authorization depends on current `accessMode`).

Response 200:
```json
{
  "snapshotId": "...",
  "owner": {
    "displayName": "Anonymous",
    "major": "Computer Science"
  },
  "capturedAt": "2026-03-29T10:00:00.000Z",
  "nodeCount": 18,
  "nodes": [
    {
      "courseCode": "INT2204",
      "courseName": "Database",
      "skills": ["SQL"],
      "reason": "Core backend foundation",
      "major": "Computer Science"
    }
  ]
}
```

Notes:
- Anonymous mode hides only display name, not major.
- Token remains constant across access changes.

Access behavior by mode:
- `public`: any viewer can resolve; returns `200` when token is active.
- `users-only`: only owner or authenticated users in `allowedUserIds` can resolve; others return `403 FORBIDDEN`.
- `private`: only owner can resolve; all other viewers return `403 FORBIDDEN`.
- `revoked`: all viewers return `404 NOT_FOUND`.

## Community post endpoints

### POST /posts

Publish to community from an active public/shared roadmap snapshot.

Response 201 (or 200 if replace-upsert by user policy):
```json
{
  "communityPostId": "...",
  "sharedRoadmapId": "...",
  "publishedAt": "2026-03-29T10:20:00.000Z",
  "likeCount": 0
}
```

Errors:
- 403 `INELIGIBLE`
- 403 `ACCESS_MODE_NOT_PUBLISHABLE`
- 404 `SHARED_ROADMAP_NOT_FOUND`

### DELETE /posts/me

Unpublish current user's active post.

Response 204.

### GET /posts

Feed listing for authenticated users.

Query:
- `major`
- `careerGoalRole`
- `personalisationLevel`
- `page`, `limit`

Response 200:
```json
{
  "items": [
    {
      "communityPostId": "...",
      "owner": {
        "displayName": "Anonymous",
        "major": "Computer Science"
      },
      "careerGoalRole": "Backend Developer",
      "personalisationLevel": "full",
      "nodeCount": 18,
      "likeCount": 12,
      "publishedAt": "2026-03-29T10:20:00.000Z",
      "previewNodes": [
        {
          "courseCode": "INT2204",
          "courseName": "Database",
          "skills": ["SQL"],
          "reason": "Core backend foundation"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 143
  }
}
```

### GET /posts/:postId

Full detail view (authenticated).

Response 200 includes full nodes and viewer flags (`hasLiked`, `isOwner`).

### POST /posts/:postId/likes

Create like.

Response 201:
```json
{
  "communityPostId": "...",
  "likeCount": 13,
  "hasLiked": true
}
```

### DELETE /posts/:postId/likes

Remove like.

Response 200 with updated count.

## Fork endpoint

### POST /posts/:postId/fork

Fork pipeline:
1. Load post snapshot nodes.
2. Filter completed courses by canonical `(major, courseCode)`.
3. Submit filtered full-node payload to Feature 009 fork-consumable acceptance contract.

Response 200:
```json
{
  "message": "Fork accepted",
  "newRoadmapId": "...",
  "filteredNodeCount": 14,
  "sideEffects": {
    "notificationDispatched": true,
    "eligibilityClockReset": true,
    "auditLogged": true,
    "progressUpdated": false
  }
}
```

Errors:
- 403 `CANNOT_FORK_OWN_POST`
- 404 `NOT_FOUND`
- 422 `ALL_COMPLETED`
- 422 `PREREQUISITE_VIOLATION`

## Access-mode and publication dependency note

If a post depends on a `SharedRoadmap` whose access mode switches from publishable to non-publishable, behavior is explicit and deterministic:
- reject switch with `409 POST_DEPENDENCY_CONFLICT` until post is unpublished.

Backend and UI MUST implement this single behavior consistently.
