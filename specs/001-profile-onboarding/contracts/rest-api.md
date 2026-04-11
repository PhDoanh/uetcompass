# REST API Contract: Onboarding Module

**Feature**: `001-profile-onboarding`
**Date**: 2026-03-07
**Base path**: `/api/onboarding`
**Authentication**: All non-SSE endpoints require a valid JWT in `Authorization: Bearer <token>`. `GET /api/onboarding/status` uses a short-lived SSE query token (`sseToken`) instead of passing JWT directly in URL.

---

## Common Conventions

`careerGoal` remains a nested object in all request/response bodies. Any downstream/read-model `careerGoalRole` field is derived from `careerGoal.role` only.

`privacySetting` is out of scope for onboarding payloads and must not appear in this contract (owned by `User` / feature 005).

**Request headers** (all endpoints):
```
Authorization: Bearer <JWT>
Content-Type: application/json   (except GET /status — SSE)
```

**Error envelope** (all non-2xx responses):
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

`details` is optional and only included when additional machine-readable context is helpful (e.g., field-level validation metadata).

**Error codes**:

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Request body failed validation (invalid major, invalid role option, invalid date format, malformed payload) |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `ONBOARDING_ALREADY_COMPLETED` | Draft access/update is blocked because onboarding is already submitted |
| 409 | `ONBOARDING_ALREADY_COMPLETED` | Submit attempted on an already-submitted profile |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## GET /api/onboarding/course-catalog

Fetch onboarding catalog metadata used by the major selector, required-courses link, and elective-course selector.

### Request

No body.

### Response — 200 OK

```json
{
  "majors": ["Computer Science", "Information Systems"],
  "roleOptionsByMajor": {
    "Computer Science": ["Backend Engineer", "Data Engineer"]
  },
  "courseCatalog": {
    "Computer Science": [
      {
        "courseCode": "INT2204",
        "name": "Object-Oriented Programming",
        "courseUnitId": "64a1b2c3d4e5f6a7b8c9d0e1"
      }
    ]
  },
  "requiredCourseLinks": {
    "Computer Science": "https://uet.vnu.edu.vn/chuong-trinh-dao-tao-cntt"
  }
}
```

### Data-source rules

- `majors` is built from `programs.nameEN`.
- `roleOptionsByMajor[major]` is built from `programs.careerTracks` of the selected program.
- `requiredCourseLinks[major]` is built from `course_units.source.url` using any row whose `programId` matches the selected program.
- `courseCatalog[major]` includes only `course_units` rows where `programId` matches selected program and `type = "elective"`.

---

## GET /api/onboarding/draft

Fetch the current user's draft profile. Called on panel mount to pre-populate the form.

### Request

No body.

### Response — 200 OK (draft exists)

```json
{
  "isDraft": true,
  "major": "Computer Science",
  "completedCourses": [
    {
      "major": "Computer Science",
      "courseCode": "INT2204",
      "courseUnitId": "64a1b2c3d4e5f6a7b8c9d0e1"
    },
    {
      "major": "Computer Science",
      "courseCode": "INT2211"
    }
  ],
  "careerGoal": {
    "role": "Backend Engineer",
    "graduationTimeline": "2027-06-30"
  },
  "updatedAt": "2026-03-07T08:30:00.000Z"
}
```

### Response — 204 No Content (no draft exists yet)

Empty body. Frontend treats this as a blank form (first visit).

### Response — 403 Forbidden (profile already submitted)

```json
{
  "error": {
    "code": "ONBOARDING_ALREADY_COMPLETED",
    "message": "Onboarding is complete. Use the profile settings page to make changes.",
    "details": {
      "isDraft": false
    }
  }
}
```

Frontend reacts to 403 by closing the onboarding panel permanently and triggering the redirect guard.

---

## PUT /api/onboarding/draft

Upsert the draft (auto-save). Called on every debounce flush (800ms after last change). Idempotent — safe to call repeatedly.

### Request body

All fields optional. The server merges the provided fields into the existing draft using `$set`. Fields not included in the body are **not** cleared.

```json
{
  "major": "Computer Science",
  "completedCourses": [
    {
      "major": "Computer Science",
      "courseCode": "INT2204",
      "courseUnitId": "64a1b2c3d4e5f6a7b8c9d0e1"
    }
  ],
  "careerGoal": {
    "role": "Backend Engineer",
    "graduationTimeline": "2027-06-30"
  }
}
```

| Field | Type | Constraints |
|---|---|---|
| `major` | string \| null | Must match `programs.nameEN` when provided |
| `completedCourses` | Array<{ major, courseCode, courseUnitId? }> | Canonical identity is (`major`, `courseCode`); `courseUnitId` optional for join optimization |
| `careerGoal.role` | string \| null | Must be selected from `programs.careerTracks` of the selected major |
| `careerGoal.graduationTimeline` | string \| null | Must be a valid date in `YYYY-MM-DD` format |

If duplicate items with same (`major`, `courseCode`) are sent, server canonicalizes to one record. Courses outside the selected program's elective set are dropped.

### Response — 200 OK

Returns the full updated draft document (same shape as `GET /draft` 200 response).

### Response — 400 Bad Request (validation failure)

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "careerGoal.role: Must contain at least one letter",
    "details": {
      "field": "careerGoal.role"
    }
  }
}
```

### Response — 403 Forbidden

Returned if the profile has already been submitted (`isDraft: false`). See GET /draft 403 for shape.

---

## POST /api/onboarding/submit

Finalize the profile. Transitions `isDraft: true → false`. Triggers async roadmap generation. Irreversible.

### Request body

Same shape as `PUT /draft`. The full profile state at the time of submission. `major` is required.

```json
{
  "major": "Computer Science",
  "completedCourses": [
    {
      "major": "Computer Science",
      "courseCode": "INT2204",
      "courseUnitId": "64a1b2c3d4e5f6a7b8c9d0e1"
    }
  ],
  "careerGoal": {
    "role": "Backend Engineer",
    "graduationTimeline": "2027-06-30"
  }
}
```

| Field | Required | Notes |
|---|---|---|
| `major` | **yes** | Must be a non-empty string matching a known UET major |
| `completedCourses` | no | Canonical identity by (`major`, `courseCode`); `courseUnitId` optional |
| all other fields | no | Omitting all optional fields is valid — triggers generic roadmap (BR-003) |

### Response — 202 Accepted

Profile has been saved as submitted. Roadmap generation has been triggered asynchronously.

```json
{
  "message": "Profile submitted. Roadmap generation in progress.",
  "isGeneric": false
}
```

`isGeneric: true` is returned when all optional fields were empty at submission time. The frontend uses this flag to display the low-personalisation notice.

### Response — 400 Bad Request

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "major: Major is required to submit your profile",
    "details": {
      "field": "major"
    }
  }
}
```

### Response — 409 Conflict

```json
{
  "error": {
    "code": "ONBOARDING_ALREADY_COMPLETED",
    "message": "Profile already submitted",
    "details": {
      "isDraft": false
    }
  }
}
```

---

## GET /api/onboarding/status  *(SSE)*

Server-Sent Events stream. Client opens this connection after submission to receive the roadmap generation result. The connection stays open until the client navigates away or the event fires.

### Request

No body. Standard SSE — opened via the browser's `EventSource` API.

```js
// Frontend
const es = new EventSource(`/api/onboarding/status?sseToken=${sseToken}`);
```

> **Unified SSE auth policy**: Native `EventSource` does not reliably support custom headers. For consistency and URL hygiene, this endpoint accepts only a **short-lived, purpose-bound query token** (`sseToken`) and does **not** accept raw access JWT in query string. `sseToken` is minted from an authenticated context, expires quickly, and is valid only for onboarding status stream.

### Server response headers

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### Events emitted by server

**Handshake** (immediately on connect — comment line, no event fires on client):
```
:ok
```

**Heartbeat** (every 15s — comment line, no event fires on client):
```
: heartbeat
```

**Roadmap completed**:
```
event: roadmap:status
data: {"status":"completed"}
```

**Roadmap failed**:
```
event: roadmap:status
data: {"status":"failed","retryable":true}
```

### Client handling

```js
es.addEventListener('roadmap:status', (e) => {
  const { status, retryable } = JSON.parse(e.data);
  if (status === 'completed') {
    showSuccess('Your roadmap is ready!');
    es.close();
  } else if (status === 'failed') {
    showError('Roadmap generation failed.', { showRetry: retryable });
    es.close();
  }
});

es.onerror = () => {
  // EventSource auto-retries on network drop.
  // Show a subtle "reconnecting..." indicator after 5s of no connection.
};
```

### Behaviour when SSE is closed on job completion

If the SSE connection is closed when the roadmap job completes, the SSE event is silently dropped. The student receives the result via **email notification only** (Nodemailer). No server-side queue. See [research.md R-008](../research.md).

### Response — 401 Unauthorized

If the `sseToken` query parameter is missing, invalid, or expired, the server closes the SSE stream immediately with:
```
event: error
data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}
```

---

## Retry: POST /api/roadmap/retry  *(out of onboarding module scope)*

When roadmap generation fails (communicated via SSE or email), the student can retry generation. This endpoint lives in the `roadmap` module and is triggered from the frontend. The onboarding module communicates the failure status; the retry action is handled by the roadmap service layer.

This is documented here for cross-reference only — it is **not implemented** by the onboarding module.

---

## Pre-Implementation Policy

This contract update is pre-implementation alignment. Runtime migration/backfill is not part of onboarding request handling.
