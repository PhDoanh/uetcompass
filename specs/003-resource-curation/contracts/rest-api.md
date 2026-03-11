# API Contracts: Resource Curation

**Feature**: `003-resource-curation`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-001, R-002, R-004, R-005)  
**Base URLs**: `/api/resources` (Capabilities 1 & 2) | `/api/market` (Capability 3) | `/api/scraping` (dev-only trigger)  
**Auth**: All student-facing endpoints require a valid JWT Access Token in `Authorization: Bearer <token>`, verified by the shared `auth.middleware.js`. The dev-trigger endpoint additionally requires `NODE_ENV !== production`.

---

## Endpoint 1 — GET /api/resources/skills/:skillId

Returns all available, active learning resources for the specified skill. Data is read from the `learning_resources` collection — no computation at read time.

### Request

```http
GET /api/resources/skills/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK`

```json
{
  "skillId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "skillName": "React",
  "resources": [
    {
      "resourceId": "74f1a2b3c4d5e6f7a8b9c0d2",
      "title": "React - The Complete Guide 2025",
      "url": "https://www.udemy.com/course/react-the-complete-guide-incl-redux/",
      "sourcePlatform": "udemy",
      "resourceType": "course",
      "isFree": false,
      "qualitySignal": {
        "type": "rating",
        "value": 4.7
      }
    },
    {
      "resourceId": "84f1a2b3c4d5e6f7a8b9c0d3",
      "title": "React Tutorial for Beginners",
      "url": "https://www.youtube.com/watch?v=SqcY0GlETPk",
      "sourcePlatform": "youtube",
      "resourceType": "video",
      "isFree": true,
      "qualitySignal": {
        "type": "view_count",
        "value": 2300000
      }
    }
  ]
}
```

**Empty state** (no resources crawled yet for this skill):

```json
{
  "skillId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "skillName": "React",
  "resources": []
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `skillId` | String (ObjectId) | Same as path param |
| `skillName` | String | Human-readable skill name, resolved from skill catalog |
| `resources` | Array | Ordered by `qualitySignal.value` descending (best quality first); max 50 per call |
| `resources[].resourceId` | String (ObjectId) | Stable ID for the resource |
| `resources[].title` | String | Display title |
| `resources[].url` | String | Direct external link to the resource |
| `resources[].sourcePlatform` | String | Enum: `udemy` \| `coursera` \| `youtube` \| `edx` \| `freecodecamp` \| `viblo` \| `other` |
| `resources[].resourceType` | String | Enum: `video` \| `article` \| `course` \| `document` |
| `resources[].isFree` | Boolean | `true` = free, `false` = paid |
| `resources[].qualitySignal` | Object\|null | `{ type, value }` — `null` when no quality data available from source |

### Filter

Only resources with `isAvailable: true` are returned — no broken links exposed.  
Only resources with `skillId` matching a currently active skill are returned (FR-020).

### Error responses

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or expired access token |
| `404 Not Found` | Skill ID does not exist or skill is not active |
| `500 Internal Server Error` | Unexpected DB failure |

---

## Endpoint 2 — GET /api/resources/academic/:skillId

Returns academic documents (slides, lecture notes, syllabi, exercises) linked to the specified skill, ordered by source priority: UET official first, then GitHub, then external (FR-012).

### Request

```http
GET /api/resources/academic/64f1a2b3c4d5e6f7a8b9c0d1
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK`

```json
{
  "skillId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "skillName": "HTML/CSS",
  "documents": [
    {
      "documentId": "94f1a2b3c4d5e6f7a8b9c0d4",
      "title": "Bài giảng Lập trình Web - Chương 2: HTML & CSS",
      "url": "https://uet.vnu.edu.vn/~tinhvt/weblecture/chap2.pdf",
      "sourceType": "uet_official",
      "documentType": "slide",
      "courseName": "Lập trình web"
    },
    {
      "documentId": "a4f1a2b3c4d5e6f7a8b9c0d5",
      "title": "INT2210 Web Programming Slides",
      "url": "https://github.com/uet-user/web-programming/blob/main/slides",
      "sourceType": "github",
      "documentType": "slide",
      "courseName": "Lập trình web"
    }
  ]
}
```

**Empty state**:

```json
{
  "skillId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "skillName": "HTML/CSS",
  "documents": []
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `skillId` | String (ObjectId) | Same as path param |
| `skillName` | String | Human-readable skill name |
| `documents` | Array | Ordered: `uet_official` → `github` → `external` (FR-012); max 30 per call |
| `documents[].documentId` | String (ObjectId) | Stable ID for the document |
| `documents[].title` | String | Display title |
| `documents[].url` | String | Direct external link to the document |
| `documents[].sourceType` | String | Enum: `uet_official` \| `github` \| `external` |
| `documents[].documentType` | String | Enum: `slide` \| `lecture_note` \| `syllabus` \| `exercise` |
| `documents[].courseName` | String | Original UET course name this document is associated with |

### Filter

Only documents with `isVisible: true` (i.e., Gemini confidence `high` or `medium`) are returned.  
Only documents linked to an active skill are returned (FR-020).

### Error responses

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or expired access token |
| `404 Not Found` | Skill ID does not exist or skill is not active |
| `500 Internal Server Error` | Unexpected DB failure |

---

## Endpoint 3 — GET /api/market/trends

Returns the Market Insight ranked list — one entry per active skill in the catalog, ordered by `jobCount` descending. Data is served from the most recent `skill_trend_snapshots` document for each skill — no real-time aggregation.

### Request

```http
GET /api/market/trends
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK`

```json
{
  "lastRefreshedAt": "2026-03-11T17:00:00.000Z",
  "trends": [
    {
      "skillId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "skillName": "React",
      "jobCount": 1420,
      "averageSalaryRange": {
        "min": 15000000,
        "max": 35000000,
        "currency": "VND"
      },
      "trendDirection": "increasing"
    },
    {
      "skillId": "74f1a2b3c4d5e6f7a8b9c0d2",
      "skillName": "Docker",
      "jobCount": 890,
      "averageSalaryRange": null,
      "trendDirection": "stable"
    },
    {
      "skillId": "84f1a2b3c4d5e6f7a8b9c0d3",
      "skillName": "COBOL",
      "jobCount": 0,
      "averageSalaryRange": null,
      "trendDirection": "stable"
    }
  ]
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `lastRefreshedAt` | String (ISO 8601) | Timestamp of the most recent daily snapshot batch — `max(snapshotDate)` across all skills |
| `trends` | Array | All active skills, sorted by `jobCount` descending; skills with `jobCount = 0` rank last (FR-019) |
| `trends[].skillId` | String (ObjectId) | Skill identity |
| `trends[].skillName` | String | Human-readable skill name |
| `trends[].jobCount` | Number | Total job postings found across contributing sources on the snapshot date |
| `trends[].averageSalaryRange` | Object\|null | `null` when no salary data available (shown as "not specified" in UI) |
| `trends[].averageSalaryRange.min` | Number | Lower bound of salary range |
| `trends[].averageSalaryRange.max` | Number | Upper bound |
| `trends[].averageSalaryRange.currency` | String | `"VND"` or `"USD"` |
| `trends[].trendDirection` | String | Enum: `increasing` \| `stable` \| `decreasing` (FR-016) |

### Implementation note

The service resolves "latest snapshot per skill" with a single aggregation:

```js
SkillTrendSnapshot.aggregate([
  { $sort: { skillId: 1, snapshotDate: -1 } },
  { $group: { _id: '$skillId', latest: { $first: '$$ROOT' } } },
  { $replaceRoot: { newRoot: '$latest' } }
])
```

This runs in O(N) with the compound index `skillId_date_desc_idx` — no per-skill query loop.

### Error responses

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or expired access token |
| `404 Not Found` | No snapshots have been generated yet (market tracker has never run) — returns `{ "lastRefreshedAt": null, "trends": [] }` with `200 OK` instead |
| `500 Internal Server Error` | Unexpected DB failure |

---

## Endpoint 4 — POST /api/scraping/trigger/:capability (Dev only)

Manually triggers one of the three crawl capabilities. **Guarded by `NODE_ENV !== production`** — returns `403 Forbidden` in production (consistent with Feature 002 manual trigger pattern).

### Request

```http
POST /api/scraping/trigger/resources
POST /api/scraping/trigger/academic
POST /api/scraping/trigger/market
Authorization: Bearer <accessToken>
```

`:capability` must be one of: `resources`, `academic`, `market`.

### Response `202 Accepted`

```json
{
  "message": "Crawl job 'resources' started. Check server logs for progress."
}
```

The job runs asynchronously in the background. The response is returned immediately without waiting for completion.

### Error responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Unknown capability name |
| `401 Unauthorized` | Missing or expired access token |
| `403 Forbidden` | `NODE_ENV === production` |
| `500 Internal Server Error` | Unexpected error starting the job |
