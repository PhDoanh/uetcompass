# API Contracts: Roadmap Community

**Feature**: `010-roadmap-community`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-001 through R-007)  
**Base URL**: `/api/community`  
**Auth**: All endpoints except the share-link serve endpoint require a valid JWT Access Token in `Authorization: Bearer <token>`. The share-link serve endpoint is unauthenticated.

---

## Common Conventions

### Error envelope (all non-2xx responses)

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

`details` is optional and included only when machine-readable context is useful.

### Error code taxonomy

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Request input failed validation |
| 401 | `UNAUTHORIZED` | Missing or expired token |
| 403 | `FORBIDDEN` | Authenticated user is not allowed to perform the action |
| 404 | `NOT_FOUND` | Requested community/share resource does not exist |
| 404 | `ROADMAP_NOT_FOUND` | No accepted roadmap available for current user (aligned with Feature 009) |
| 409 | `CONFLICT` | State conflict with existing resource lifecycle |
| 422 | `ALL_COMPLETED` | Fork payload fully filtered out by completed courses |
| 422 | `PREREQUISITE_VIOLATION` | Fork payload violates prerequisite constraints (passthrough from Feature 009) |
| 500 | `INTERNAL_ERROR` | Unexpected server failure |

---

## Eligibility Error (shared response shape)

When any write action is blocked by the Y-day time gate, the API returns:

```http
403 Forbidden
```
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Your roadmap must be held for at least Y days before sharing.",
    "details": {
      "reason": "INELIGIBLE",
      "daysUntilEligible": 3
    }
  }
}
```

---

## Endpoint 1 — POST /api/community/share-links

Generate a new snapshot share link for the authenticated student's current accepted roadmap.

### Request

```http
POST /api/community/share-links
Authorization: Bearer <accessToken>
```

No request body.

### Response `201 Created`

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "shareUrl": "https://uetcompass.vercel.app/share/550e8400-e29b-41d4-a716-446655440000",
  "snapshotId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "createdAt": "2026-03-11T10:00:00.000Z"
}
```

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `ROADMAP_NOT_FOUND` | Student has no accepted roadmap |
| `403 Forbidden` | `FORBIDDEN` | Y-day hold not met; includes `details.reason = INELIGIBLE` and `details.daysUntilEligible` |
| `409 Conflict` | `CONFLICT` | An active share link already exists; student must revoke it first |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 2 — DELETE /api/community/share-links

Revoke the authenticated student's active share link. The URL immediately returns 404 for any visitor after this call.

### Request

```http
DELETE /api/community/share-links
Authorization: Bearer <accessToken>
```

No request body.

### Response `204 No Content`

Empty body.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Student has no active link to revoke |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 3 — GET /api/community/share-links/:token

Serve the snapshot for a share link token. **Unauthenticated** — no JWT required. Returns the immutable snapshot captured at link generation time.

### Request

```http
GET /api/community/share-links/:token
```

### Response `200 OK`

```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "owner": {
    "displayName": "Nguyen Van A",
    "major": "Công nghệ thông tin"
  },
  "snapshotId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "capturedAt": "2026-03-11T10:00:00.000Z",
  "nodeCount": 18,
  "nodes": [
    {
      "courseCode": "INT2204",
      "courseName": "Cơ sở dữ liệu",
      "gainedSkills": ["SQL", "Database Design"],
      "reason": "Core backend skill for all software roles"
    }
  ]
}
```

**When anonymous**: `owner.displayName` is `"Anonymous"` and `owner.major` is the major group label (e.g., `"CS-related"`).  
**When identified**: `owner.displayName` prefers `User.displayName`; if missing/blank, apply the system-wide fallback-name policy.  
**Fields never present**: `supportingSkills`, `careerRelevanceNote`.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Token does not exist or has been revoked |

---

## Endpoint 4 — POST /api/community/entries

Publish the authenticated student's current accepted roadmap to the community feed as a snapshot entry. If an entry already exists, it is replaced (snapshotId updated, likeCount preserved).

### Request

```http
POST /api/community/entries
Authorization: Bearer <accessToken>
```

No request body.

### Response `201 Created` (first publish) or `200 OK` (re-publish)

```json
{
  "entryId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "snapshotId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "publishedAt": "2026-03-11T10:05:00.000Z"
}
```

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `ROADMAP_NOT_FOUND` | Student has no accepted roadmap |
| `403 Forbidden` | `FORBIDDEN` | Y-day hold not met; includes `details.reason = INELIGIBLE` and `details.daysUntilEligible` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 5 — DELETE /api/community/entries

Unpublish the authenticated student's community entry. The entry is removed from the feed immediately. LikeRecords are cascade-deleted.

### Request

```http
DELETE /api/community/entries
Authorization: Bearer <accessToken>
```

No request body.

### Response `204 No Content`

Empty body.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Student has no active community entry |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 6 — GET /api/community/entries

Browse the community feed. Authenticated only. Returns paginated snapshot-based entries ordered by major-relevance (viewer's major group first), then by most-recent publication.

### Request

```http
GET /api/community/entries?majorGroup=CS-related&careerGoalRole=Backend+Developer&personalisationLevel=full&page=1&limit=20
Authorization: Bearer <accessToken>
```

### Query parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `majorGroup` | String | no | Filter by major group label |
| `careerGoalRole` | String | no | Filter by career goal role |
| `personalisationLevel` | String | no | `'full'` or `'low'` |
| `page` | Integer | no | Default `1` |
| `limit` | Integer | no | Default `20`, max `50` |

### Response `200 OK`

```json
{
  "entries": [
    {
      "entryId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "owner": {
        "displayName": "Nguyen Van A",
        "major": "Công nghệ thông tin"
      },
      "careerGoalRole": "Backend Developer",
      "personalisationLevel": "full",
      "nodeCount": 18,
      "likeCount": 5,
      "publishedAt": "2026-03-11T10:05:00.000Z",
      "previewNodes": [
        {
          "courseCode": "INT2204",
          "courseName": "Cơ sở dữ liệu",
          "gainedSkills": ["SQL", "Database Design"],
          "reason": "Core backend skill"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 47
  }
}
```

`previewNodes` contains the first 3 nodes from the snapshot.  
**When anonymous**: `owner.displayName` is `"Anonymous"` and `owner.major` is the major group label.  
**When identified**: `owner.displayName` prefers `User.displayName`; if missing/blank, apply the system-wide fallback-name policy.  
**Fields never present**: `supportingSkills`, `careerRelevanceNote`.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 7 — GET /api/community/entries/:entryId

Get the full detail view of a community entry. Authenticated only. Returns all nodes from the snapshot.

### Request

```http
GET /api/community/entries/:entryId
Authorization: Bearer <accessToken>
```

### Response `200 OK`

```json
{
  "entryId": "64f1a2b3c4d5e6f7a8b9c0d2",
  "owner": {
    "displayName": "Nguyen Van A",
    "major": "Công nghệ thông tin"
  },
  "careerGoalRole": "Backend Developer",
  "personalisationLevel": "full",
  "nodeCount": 18,
  "likeCount": 5,
  "publishedAt": "2026-03-11T10:05:00.000Z",
  "snapshotCapturedAt": "2026-03-11T10:05:00.000Z",
  "nodes": [
    {
      "courseCode": "INT2204",
      "courseName": "Cơ sở dữ liệu",
      "gainedSkills": ["SQL", "Database Design"],
      "reason": "Core backend skill for all software roles"
    }
  ],
  "viewer": {
    "hasLiked": true,
    "isOwner": false
  }
}
```

`viewer.hasLiked` is `true` if the authenticated user has an active `LikeRecord` for this entry.  
`viewer.isOwner` is `true` if the viewer is the entry owner (fork action must be hidden in this case).

**When anonymous**: `owner.displayName` is `"Anonymous"` and `owner.major` is the major group label.  
**When identified**: `owner.displayName` prefers `User.displayName`; if missing/blank, apply the system-wide fallback-name policy.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Entry does not exist or has been unpublished |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 8 — POST /api/community/entries/:entryId/likes

Like a community entry. One like per user per entry.

### Request

```http
POST /api/community/entries/:entryId/likes
Authorization: Bearer <accessToken>
```

No request body.

### Response `201 Created`

```json
{
  "likeCount": 6
}
```

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Entry does not exist |
| `409 Conflict` | `CONFLICT` | User has already liked this entry |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 9 — DELETE /api/community/entries/:entryId/likes

Remove a like from a community entry.

### Request

```http
DELETE /api/community/entries/:entryId/likes
Authorization: Bearer <accessToken>
```

No request body.

### Response `200 OK`

```json
{
  "likeCount": 5
}
```

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Entry does not exist, or user has not liked it |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

---

## Endpoint 10 — POST /api/community/entries/:entryId/fork

Fork a community entry. The community roadmap's full snapshot nodes are first filtered against the forking student's completed courses using canonical identity `(major, courseCode)`, then submitted to Feature 009's fork-consumable acceptance endpoint. A student cannot fork their own entry.

### Request

```http
POST /api/community/entries/:entryId/fork
Authorization: Bearer <accessToken>
```

No request body.

### Response `200 OK`

```json
{
  "message": "Fork accepted. The roadmap has been saved as your new accepted roadmap.",
  "newRoadmapId": "74f1a2b3c4d5e6f7a8b9c1e0",
  "filteredNodeCount": 14,
  "sideEffects": {
    "notificationDispatched": true,
    "eligibilityClockReset": true,
    "auditLogged": true,
    "progressUpdated": false
  }
}
```

`filteredNodeCount` is the number of nodes in the fork after removing the student's completed courses.

### Error responses

| Status | Code | Condition |
|---|---|---|
| `404 Not Found` | `NOT_FOUND` | Entry does not exist |
| `403 Forbidden` | `FORBIDDEN` | Student is trying to fork their own entry (`details.reason = CANNOT_FORK_OWN`) |
| `409 Conflict` | `CONFLICT` | Feature 009 acceptance conflicted with an in-flight lifecycle operation |
| `422 Unprocessable Entity` | `ALL_COMPLETED` | All courses in the roadmap are already completed by the student under canonical key `(major, courseCode)` — nothing to fork |
| `422 Unprocessable Entity` | `PREREQUISITE_VIOLATION` | Feature 009 prerequisite validation failed; includes `details.violations[]` from Feature 009 |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired token |

**`PREREQUISITE_VIOLATION` error shape**:

```json
{
  "error": {
    "code": "PREREQUISITE_VIOLATION",
    "message": "This roadmap cannot be accepted because some courses have unmet prerequisites.",
    "details": {
      "violations": [
        {
          "courseCode": "INT3306",
          "courseName": "Kiến trúc phần mềm",
          "missingPrerequisites": ["INT2204", "INT2210"]
        }
      ]
    }
  }
}
```

### Fork contract notes

1. **Order is mandatory**: completed-course filtering executes before prerequisite validation.
2. Completed-course identity uses **`(major, courseCode)`** consistently.
3. Feature 010 calls Feature 009's **fork-consumable** endpoint with **full roadmap nodes payload**.
4. On successful acceptance, side effects are executed: user notification, eligibility-clock reset, audit logging, and progress update when integration exists.
5. This feature exposes no SSE endpoint; async notification side effects are out-of-band and do not change the REST error envelope contract.
