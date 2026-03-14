# REST API Contract: AI Auto-Tagging Module

**Feature**: `006-ai-auto-tagging`  
**Date**: 2026-03-11  
**Base path**: `/api/tagging`  
**Authentication**: All endpoints require a valid JWT in `Authorization: Bearer <token>`. Middleware attaches `req.user.userId` (ObjectId) to every request.  Only users with the `admin` role may access reporting and manual review endpoints; skill ingestion endpoints are open to the internal crawler service via a shared secret header.

**Bounded context**: `Skill`/`Tag` payloads are canonical contracts for the tagging/search context (shared with feature 008), not roadmap-core contracts.

---

## Common Conventions

**Request headers** (all endpoints):
```
Authorization: Bearer <JWT>
Content-Type: application/json
X-Service-Key: <secret>   # required for ingestion endpoints
```

**Error envelope** (all non-2xx responses):
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human-readable description"
  }
}
```

**Error codes**:

| HTTP | `code`               | Meaning |
|------|----------------------|---------|
| 400  | `INVALID_INPUT`      | Request body failed validation |
| 401  | `UNAUTHORIZED`       | Missing or invalid JWT / service key |
| 403  | `FORBIDDEN`          | Insufficient privileges |
| 404  | `NOT_FOUND`          | Resource not found |
| 409  | `ALREADY_QUEUED`     | Skill already enqueued |
| 429  | `RATE_LIMIT`         | API usage exceeded |
| 500  | `INTERNAL_ERROR`     | Unexpected server error |

---

## Canonical Tag Object (used across responses)

```json
{
  "tagId": "64a9b8c7d6e5f4a3b2c1d0e",
  "normalizedName": "javascript",
  "confidence": 92
}
```

Notes:
- `normalizedName` is lowercase + trimmed canonical key for search.
- Re-tagging follows overwrite strategy: latest successful tagging replaces the previous full tag set.
- This shape is intentionally stable so feature 008 can consume directly without transform middleware.

---

## POST /api/tagging/skills

Enqueue a single skill for tagging. Typically invoked by the crawler when a new
skill is harvested.

### Request body
```json
{
  "name": "JavaScript",
  "description": "A programming language for the web",
  "domain": "IT",
  "sourceCourseId": "64a1b2c3d4e5f6a7b8c9d0e"   
}
```

All fields are required except `description` and `sourceCourseId`.

### Response — 202 Accepted
```json
{
  "jobId": "64a9b8c7d6e5f4a3b2c1d0e",
  "status": "pending"
}
```

### Response — 409 Conflict
```json
{ "error": { "code": "ALREADY_QUEUED", "message": "Skill is already pending tagging." } }
```

---

## GET /api/tagging/jobs

List jobs for admin review. Supports filtering by status.

### Query parameters
- `status` (optional): comma-separated list of `pending,in_progress,failed,done,review`.
- `limit` (optional): page size (default 50).
- `offset` (optional): pagination offset.

### Response — 200 OK
```json
{
  "jobs": [
    {
      "_id": "64a9b8c7d6e5f4a3b2c1d0e",
      "skillName": "JavaScript",
      "status": "failed",
      "attempts": 2,
      "lastError": "Timeout contacting LLM",
      "confidence": 0,
      "createdAt": "2026-03-11T09:00:00Z"
    },
    ...
  ],
  "total": 123
}
```

---

## GET /api/tagging/jobs/{jobId}

Retrieve detailed information about a single tagging job, including assigned
tags if completed.

### Response — 200 OK
```json
{
  "_id": "64a9b8c7d6e5f4a3b2c1d0e",
  "skillName": "JavaScript",
  "status": "done",
  "resultTags": [
    { "tagId": "64aaa111d6e5f4a3b2c1d0e", "normalizedName": "frontend", "confidence": 94 },
    { "tagId": "64aaa222d6e5f4a3b2c1d0e", "normalizedName": "javascript", "confidence": 97 },
    { "tagId": "64aaa333d6e5f4a3b2c1d0e", "normalizedName": "programming", "confidence": 88 }
  ],
  "confidence": 92,
  "attempts": 1,
  "createdAt": "2026-03-11T09:00:00Z",
  "updatedAt": "2026-03-11T09:00:45Z"
}
```

---

## PATCH /api/tagging/jobs/{jobId}/review

Mark a failed or low-confidence job as reviewed by a human, optionally updating
tags or confidence.

### Request body
```json
{
  "status": "done",          // or "review" to keep it flagged
  "resultTags": [
    { "tagId": "64aaa222d6e5f4a3b2c1d0e", "normalizedName": "javascript", "confidence": 100 },
    { "tagId": "64aaa444d6e5f4a3b2c1d0e", "normalizedName": "web", "confidence": 100 }
  ],
  "confidence": 100
}
```

### Response — 200 OK
```json
{ "message": "Job updated" }
```

---

## GET /api/tagging/reports

Retrieve aggregate statistics for finished batches. Admin-only.

### Response — 200 OK
```json
{
  "today": { "processed": 2345, "failed": 12, "avgConfidence": 87.3 },
  "week": { "processed": 15000, "failed": 78, "avgConfidence": 88.1 }
}
```


These endpoints provide the minimal contract needed to ingest skills, monitor
queue progress, and review or override tagging results.

For direct search integration, consumers (feature 008) should read
`resultTags[].normalizedName` and `resultTags[].confidence` without additional
mapping.