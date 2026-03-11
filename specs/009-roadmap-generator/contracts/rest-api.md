# REST API Contract: Roadmap Module

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-11
**Base path**: `/api/roadmap`
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
| 404 | `ROADMAP_NOT_FOUND` | No roadmap document exists for this user |
| 404 | `PREVIEW_NOT_FOUND` | No in-memory preview is pending for this user |
| 409 | `GENERATION_IN_PROGRESS` | A generation is already running for this user |
| 409 | `NO_FAILED_ROADMAP` | Retry attempted but no `status: failed` roadmap exists for this user |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## GET /api/roadmap

Retrieve the authenticated student's active roadmap document from the `roadmaps` collection. Returns the full document (including all nodes and metadata). Used by Feature 004 (Skill Tree) to render the roadmap and to determine whether a retry affordance is appropriate (`status: failed`).

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
  "acceptedAt": "2026-03-11T08:05:00.000Z"
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

**Note on `status: failed`**: When the roadmap exists but `status` is `failed`, the endpoint still returns 200 with the document — `errorMessage` will be non-null and `acceptedAt` will be `null`. Feature 004 uses this to determine whether to show a retry affordance (FR-029).

---

## POST /api/roadmap/preview/accept

Accept the pending in-memory roadmap preview. Commits the preview as the student's active Roadmap document (status `completed`), replacing any previously stored document. Clears the in-memory preview after commit. If the generation was triggered by `repersonalization`, also clears `repersonalizationPending` on the `StudentProfile` (FR-031).

### Request

No body. The preview is identified by `req.user.userId`.

### Response — 200 OK

Returns the newly committed Roadmap document.

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "studentProfileId": "64a1b2c3d4e5f6a7b8c9d0e3",
  "personalisationLevel": "full",
  "status": "completed",
  "errorMessage": null,
  "nodes": [ /* … same shape as GET /api/roadmap response … */ ],
  "createdAt": "2026-03-11T08:00:00.000Z",
  "acceptedAt": "2026-03-11T08:05:12.000Z"
}
```

### Response — 404 Not Found (no pending preview)

```json
{
  "error": {
    "code": "PREVIEW_NOT_FOUND",
    "message": "No pending roadmap preview found. The preview may have expired due to a server restart."
  }
}
```

---

## POST /api/roadmap/preview/reject

Reject and discard the pending in-memory roadmap preview. The existing active roadmap (if any) remains unchanged. If the generation was triggered by `repersonalization`, also clears `repersonalizationPending` on the `StudentProfile` (FR-031, FR-038). For initial generation rejections, the student is left without an active roadmap — the retry mechanism remains available (FR-037).

### Request

No body. The preview is identified by `req.user.userId`.

### Response — 200 OK

```json
{
  "message": "Preview rejected. Your existing roadmap is unchanged."
}
```

### Response — 404 Not Found (no pending preview)

```json
{
  "error": {
    "code": "PREVIEW_NOT_FOUND",
    "message": "No pending roadmap preview found."
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
    "code": "GENERATION_IN_PROGRESS",
    "message": "A roadmap generation is already running for this user. Please wait for it to complete."
  }
}
```

### Response — 409 Conflict (no failed roadmap to retry)

```json
{
  "error": {
    "code": "NO_FAILED_ROADMAP",
    "message": "No failed roadmap generation found. Retry is only available after a generation failure."
  }
}
```

---

## Internal Trigger (not a student-facing endpoint)

Generation is triggered internally by two system events (FR-033):

1. **Profile submission** — emitted by Feature 001's `POST /api/onboarding/submit` handler after successfully persisting the `StudentProfile`. The roadmap module exports a `triggerGeneration(userId, studentProfileId, 'profile_submission')` function called directly within the same process.

2. **Repersonalization** — emitted by Feature 005's account settings handler after setting `repersonalizationPending: true` on the `StudentProfile`. The roadmap module exports `triggerGeneration(userId, studentProfileId, 'repersonalization')` called via the service layer.

Neither trigger is exposed as a REST endpoint. The `GENERATION_IN_PROGRESS` error is handled internally — if generation is already running when either trigger fires, the call is silently dropped (the in-progress generation will complete and notify the student).
