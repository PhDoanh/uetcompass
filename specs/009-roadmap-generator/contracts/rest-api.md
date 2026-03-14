# REST API Contract: Roadmap Module

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-14
**Base path**: `/api`
**Authentication**: All endpoints require a valid JWT in `Authorization: Bearer <token>`. The middleware attaches `req.user.userId` (ObjectId) to every request.

---

## Common Conventions

**Request headers** (all endpoints):
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Error envelope** (all non-2xx responses):
```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Human-readable description"
  }
}
```

**Error codes**:

| HTTP | `code` | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 404 | `ROADMAP_NOT_FOUND` | Roadmap does not exist (or does not belong to authenticated user) |
| 409 | `CONFLICT` | Conflict with current lifecycle state (generation in progress / primary switch race / duplicate transition) |
| 422 | `PREREQUISITE_VIOLATION` | Submitted roadmap nodes violate prerequisite constraints |
| 422 | `ALL_COMPLETED` | All submitted nodes were filtered out because they are already completed |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## GET /api/primary-roadmap

Retrieve the authenticated student's current primary roadmap document.

### Compatibility note

`GET /api/roadmap` is deprecated and maintained only as a compatibility alias to this endpoint during migration.

### Request

No body.

### Response — 200 OK

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "studentProfileId": "64a1b2c3d4e5f6a7b8c9d0e3",
  "personalisationLevel": "full",
  "status": "completed",
  "errorMessage": null,
  "nodes": [
    {
      "courseCode": "INT2204",
      "courseName": "Object-Oriented Programming",
      "credits": 3,
      "suggestedSemester": 2,
      "gainedSkills": ["OOP principles", "Java fundamentals", "design patterns"],
      "supportingSkills": ["SOLID principles", "unit testing with JUnit"],
      "reason": "Foundation for all software engineering courses in the roadmap.",
      "careerRelevanceNote": "Backend engineers at product companies rely on OOP daily for service design.",
      "resources": []
    }
  ],
  "createdAt": "2026-03-11T08:00:00.000Z",
  "isPrimary": true,
  "acceptedAt": "2026-03-11T08:05:00.000Z",
  "updatedAt": "2026-03-14T06:05:00.000Z"
}
```

### Response — 404 Not Found (no roadmap exists)

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "No roadmap has been generated for this user yet."
  }
}
```

---

## GET /api/roadmaps

List roadmap documents for the authenticated user.

### Query parameters

- `status` (optional): `completed` | `failed`
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

### Response — 200 OK

```json
{
  "items": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "studentProfileId": "64a1b2c3d4e5f6a7b8c9d0e3",
      "personalisationLevel": "full",
      "status": "completed",
      "isPrimary": true,
      "errorMessage": null,
      "updatedAt": "2026-03-14T06:05:00.000Z",
      "acceptedAt": "2026-03-11T08:05:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## GET /api/roadmaps/:roadmapId

Get roadmap detail by ID (auth-scoped to requester).

### Response — 200 OK

Returns the full roadmap document.

### Response — 404 Not Found

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Roadmap not found."
  }
}
```

---

## PATCH /api/roadmaps/:roadmapId/primary

Set a specific roadmap as primary for the authenticated user. The previous primary is demoted atomically.

### Request

No body.

### Response — 200 OK

```json
{
  "message": "Primary roadmap updated successfully.",
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "isPrimary": true
}
```

### Response — 404 Not Found

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Roadmap not found."
  }
}
```

### Response — 409 Conflict

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Primary roadmap update conflicted with another in-flight operation. Please retry."
  }
}
```

---

## POST /api/roadmaps/accept

Fork-consumable acceptance endpoint. The caller submits full roadmap nodes payload. Server performs canonical acceptance pipeline:

1. Filter completed courses,
2. Validate prerequisite constraints/topological order,
3. Commit a roadmap document and apply primary policy.

This endpoint does not depend on old preview-accept lookup.

### Request

```json
{
  "studentProfileId": "64a1b2c3d4e5f6a7b8c9d0e3",
  "personalisationLevel": "full",
  "isPrimary": true,
  "nodes": [
    {
      "courseCode": "INT2204",
      "courseName": "Object-Oriented Programming",
      "credits": 3,
      "suggestedSemester": 2,
      "gainedSkills": ["OOP principles", "Java fundamentals"],
      "supportingSkills": ["SOLID principles"],
      "reason": "Foundation for software engineering.",
      "careerRelevanceNote": "Useful for backend development at product companies.",
      "resources": []
    }
  ]
}
```

### Response — 200 OK

Returns the committed roadmap document.

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "studentProfileId": "64a1b2c3d4e5f6a7b8c9d0e3",
  "personalisationLevel": "full",
  "status": "completed",
  "isPrimary": true,
  "errorMessage": null,
  "nodes": [ /* … same shape as primary roadmap response … */ ],
  "createdAt": "2026-03-11T08:00:00.000Z",
  "acceptedAt": "2026-03-11T08:05:12.000Z",
  "updatedAt": "2026-03-14T06:05:12.000Z"
}
```

### Response — 422 Unprocessable Entity (`ALL_COMPLETED`)

```json
{
  "error": {
    "code": "ALL_COMPLETED",
    "message": "All submitted roadmap nodes are already completed by this student."
  }
}
```

### Response — 422 Unprocessable Entity (`PREREQUISITE_VIOLATION`)

```json
{
  "error": {
    "code": "PREREQUISITE_VIOLATION",
    "message": "Ordering violation: INT3101 appears before prerequisite INT2204."
  }
}
```

### Response — 409 Conflict

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "Roadmap acceptance conflicted with an in-flight lifecycle operation. Please retry."
  }
}
```

---

## POST /api/roadmap/retry

Trigger a retry of a failed roadmap generation. The system re-reads the existing `StudentProfile` and re-runs the full generation lifecycle from the input retrieval step. Returns 202 Accepted immediately — the generation runs asynchronously and the student is notified via SSE on completion or failure (FR-030).

**Preconditions**: A `roadmaps` document with `status: failed` must exist for this user. An in-progress generation for this user must not be active.

### Request

No body.

### Response — 202 Accepted

```json
{
  "message": "Roadmap generation retry started. You will be notified when it completes."
}
```

### Response — 409 Conflict (generation already in progress)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "A roadmap generation is already running for this user. Please wait for it to complete."
  }
}
```

### Response — 409 Conflict (no failed roadmap to retry)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "No failed roadmap generation found. Retry is only available after a generation failure."
  }
}
```

---

## Internal Trigger (not a student-facing endpoint)

Generation is triggered internally by two system events (FR-033):

1. **Profile submission** — emitted by Feature 001's `POST /api/onboarding/submit` handler after successfully persisting the `StudentProfile`. The roadmap module exports a `triggerGeneration(userId, studentProfileId, 'profile_submission')` function called directly within the same process.

2. **Repersonalization** — emitted by Feature 005's account settings handler after setting `repersonalizationPending: true` on the `StudentProfile`. The roadmap module exports `triggerGeneration(userId, studentProfileId, 'repersonalization')` called via the service layer.

Neither trigger is exposed as a REST endpoint. Internal generation conflicts map to canonical `CONFLICT` semantics — if generation is already running when either trigger fires, the call is silently dropped (the in-progress generation will complete and notify the student).

---

## Lifecycle Ownership Rule

Feature 009 is the canonical owner of roadmap transitions and persistence semantics. Other features must consume roadmap state through the contracts above and must not write `roadmaps` directly.
