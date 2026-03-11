# REST API Contracts: Resource Curation

**Feature**: `009-resource-curation`
**Date**: 2026-03-11
**Data model dependency**: [data-model.md](../data-model.md)

All endpoints owned by this feature are served under the `/api/resource-curation` prefix and registered in `backend/src/modules/resource-curation/resource-curation.routes.js`.

---

## Endpoint 1 — GET /api/resource-curation/market-trends

Returns the global ranked list of skills by current market demand, including job count, average salary range, and trend direction. Powers the Market Insight page (User Story 3).

### Request

```
GET /api/resource-curation/market-trends
Authorization: Bearer <JWT>
```

No query parameters.

### Response — 200 OK

```json
{
  "dataDate": "2026-03-11",
  "refresh": {
    "lastCrawledAt": "2026-03-11T01:03:45.123Z",
    "sources": ["TopDev", "ITviec", "JobOKO"]
  },
  "skills": [
    {
      "skillName": "React.js",
      "jobCount": 1840,
      "avgSalary": "20–35 triệu VND",
      "trendDirection": "increasing"
    },
    {
      "skillName": "Node.js",
      "jobCount": 1420,
      "avgSalary": "18–30 triệu VND",
      "trendDirection": "stable"
    },
    {
      "skillName": "Java",
      "jobCount": 980,
      "avgSalary": "15–25 triệu VND",
      "trendDirection": "decreasing"
    }
  ]
}
```

**Field notes**:
- `skills` is sorted by `jobCount` descending (most in-demand first).
- `trendDirection` values: `"increasing"` / `"stable"` / `"decreasing"`.
- `avgSalary` is a raw string extracted from job postings (`null` if unavailable for a skill — the field is omitted from that skill's entry rather than returned as `null`).
- `refresh.sources` lists only the job boards that contributed to today's crawl (excludes boards that were unavailable).
- `dataDate` reflects today's snapshot date; if today's crawl has not yet completed (e.g. first call of the day before 01:00 UTC), the response returns the most recent available snapshot with the `dataDate` of that prior date.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `503 Service Unavailable` | No market trend data has ever been crawled (cold start state); body: `{ "error": "NO_MARKET_DATA_YET" }` |

---

## Endpoint 2 — GET /api/resource-curation/courses/:courseCode/academic-docs

Returns auto-crawled academic documents (slides, lecture notes, syllabi, exercises) for a UET course. Documents sourced from UET official pages are ranked first (User Story 2).

### Request

```
GET /api/resource-curation/courses/:courseCode/academic-docs
Authorization: Bearer <JWT>
```

**Path parameter**: `courseCode` — UET course code, e.g. `IT3910E` (case-insensitive).

### Response — 200 OK

```json
{
  "courseCode": "IT3910E",
  "documents": [
    {
      "title": "Slide Bài giảng Lập trình Web – Tuần 1",
      "url": "https://uet.vnu.edu.vn/~hunglt/web/slide-week1.pdf",
      "sourceType": "uet_official",
      "documentType": "slide",
      "crawledAt": "2026-03-09T03:12:00.000Z"
    },
    {
      "title": "IT3910E – Web Programming Exercises",
      "url": "https://github.com/uet-lab/web-programming/exercises.md",
      "sourceType": "github",
      "documentType": "exercise",
      "crawledAt": "2026-03-09T03:14:00.000Z"
    },
    {
      "title": "Giáo trình Lập trình Web",
      "url": "https://drive.google.com/file/d/...",
      "sourceType": "external",
      "documentType": "lecture_note",
      "crawledAt": "2026-03-09T03:16:00.000Z"
    }
  ]
}
```

**Field notes**:
- `documents` is sorted: `uet_official` first, then `github`, then `external`; within each group sorted by `crawledAt` descending.
- `documentType` values: `"slide"` / `"lecture_note"` / `"syllabus"` / `"exercise"`.
- `sourceType` values: `"uet_official"` / `"github"` / `"external"`.
- An empty `documents: []` array is returned if no documents have been crawled for this course yet — this is not an error.
- `courseCode` in the response is the normalized (uppercase) version of the path parameter.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `400 Bad Request` | `courseCode` path parameter is empty |
| `401 Unauthorized` | Missing or invalid JWT |

---

## Endpoint 3 — GET /api/resource-curation/skills/:skillName/resources

Returns all crawled learning resources for a skill, split into free and paid groups. This is Feature 009's native endpoint; Feature 004 also exposes a similar read via `GET /api/skill-tree/skills/:skillName/learning-resources` (which reads from the same `skill_learning_resources` collection).

### Request

```
GET /api/resource-curation/skills/:skillName/resources
Authorization: Bearer <JWT>
```

**Path parameter**: `skillName` — URL-encoded skill name, e.g. `React.js` → `React.js`.

### Response — 200 OK

```json
{
  "skillName": "React.js",
  "updatedAt": "2026-03-09T02:03:00.000Z",
  "resources": {
    "free": [
      {
        "title": "React Tutorial for Beginners – Full Course",
        "url": "https://www.youtube.com/watch?v=...",
        "platform": "YouTube",
        "resourceType": "video",
        "rating": null
      },
      {
        "title": "React – freeCodeCamp",
        "url": "https://www.freecodecamp.org/learn/front-end-development-libraries/#react",
        "platform": "freeCodeCamp",
        "resourceType": "course",
        "rating": null
      }
    ],
    "paid": [
      {
        "title": "React – The Complete Guide 2026",
        "url": "https://www.udemy.com/course/react-the-complete-guide/",
        "platform": "Udemy",
        "resourceType": "course",
        "rating": 4.7
      }
    ],
    "unknown": []
  }
}
```

**Field notes**:
- `resources` always contains exactly three keys: `free`, `paid`, `unknown` — each may be an empty array.
- `rating` is a number (0–5 scale) or `null` if not available from the source.
- `resourceType` values: `"video"` / `"article"` / `"course"` / `"document"`.
- Resources within `free` and `paid` are ordered by `rating` descending (null ratings placed last).

### Responses — Error Cases

| Status | Condition |
|---|---|
| `400 Bad Request` | `skillName` path parameter is empty |
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | No records exist in `skill_learning_resources` for this `skillName` |

---

## Job Trigger Endpoints (Dev/Admin Only)

These endpoints exist in non-production environments only. Guarded by `NODE_ENV !== 'production'` middleware check.

### POST /api/resource-curation/admin/trigger/:capability

Manual trigger for one crawl capability. `capability` must be one of `learning-resources`, `academic-docs`, `market-trends`.

```
POST /api/resource-curation/admin/trigger/market-trends
```

**Response — 202 Accepted**:
```json
{ "message": "Crawl job started", "capability": "market-trends" }
```

**Response — 403 Forbidden** (in production):
```json
{ "error": "ADMIN_TRIGGER_UNAVAILABLE_IN_PRODUCTION" }
```

---

## Integration Note — Collections Shared With Feature 004

Feature 009 writes two collections that Feature 004 reads via existing endpoints. No contracts in this file govern those reads — they are owned by Feature 004's `contracts/rest-api.md`:

| Feature 004 Endpoint | Collection Written By 009 | Notes |
|---|---|---|
| `GET /api/skill-tree/skills/:skillName/learning-resources` | `skill_learning_resources` | 004 reads subset of fields; backward compatible |
| `GET /api/skill-tree/nodes/:courseCode/market-skills` | `market_skills` | 004 reads all fields; schema identical to 004's expectation |
