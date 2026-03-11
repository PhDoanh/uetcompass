# REST API Contracts: Skill Tree – Personalized Academic Roadmap Tracker

**Phase 1 output** | Branch: `004-skill-tree` | Date: 2026-03-11  
**Data model**: [data-model.md](../data-model.md)

All endpoints require `Authorization: Bearer <JWT>` header. The JWT is issued by the auth system (Feature 001). The payload includes `userId`.

Base path: `/api/skill-tree`

---

## Endpoint 1 — GET /api/skill-tree

Returns the authenticated student's full personalized skill tree with computed unlock states and the re-personalize flag.

### Request

```
GET /api/skill-tree
Authorization: Bearer <JWT>
```

No query parameters. No request body.

### Response — 200 OK

```json
{
  "careerGoal": "frontend-developer",
  "needsRepersonalization": false,
  "repersonalizing": false,
  "nodes": [
    {
      "courseCode": "IT1010",
      "nameVi": "Nhập môn lập trình",
      "nameEn": "Introduction to Programming",
      "credits": 3,
      "prerequisites": [],
      "status": "done",
      "isUnlocked": true
    },
    {
      "courseCode": "IT3910E",
      "nameVi": "Lập trình Web",
      "nameEn": "Web Development",
      "credits": 3,
      "prerequisites": ["IT1010"],
      "status": "pending",
      "isUnlocked": true
    },
    {
      "courseCode": "IT4409",
      "nameVi": "Kỹ thuật phần mềm",
      "nameEn": "Software Engineering",
      "credits": 3,
      "prerequisites": ["IT3910E"],
      "status": "pending",
      "isUnlocked": false
    }
  ]
}
```

**Field notes**:
- `needsRepersonalization`: `true` when `studentProfile.updatedAt > studentRoadmap.generatedAt`.
- `repersonalizing`: `true` in the brief window after `POST /api/skill-tree/repersonalize` returns and before the job completes (tracked via `studentRoadmap.repersonalizing` flag on the document).
- `status`: `"pending"` (default when no document in `skill_node_statuses`), `"in_progress"`, or `"done"`.
- `isUnlocked`: computed server-side; `true` when all `prerequisites` are `"done"` in the student's status records, or when `prerequisites` is empty.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | JWT valid but `studentProfile.isDraft === true` (onboarding not submitted yet) |
| `404 Not Found` | No `student_roadmaps` document for this student (personalization has not run); body: `{ "error": "ROADMAP_NOT_FOUND" }` |

---

## Endpoint 2 — PATCH /api/skill-tree/nodes/:courseCode/status

Transitions a course node to the next state in the `pending → in_progress → done` sequence.

### Request

```
PATCH /api/skill-tree/nodes/:courseCode/status
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "status": "in_progress"
}
```

**Path parameter**: `courseCode` — the course code string (e.g., `"IT3910E"`).  
**Body**: `status` must be one of `"pending"`, `"in_progress"`, `"done"`.

### Response — 200 OK

```json
{
  "courseCode": "IT3910E",
  "status": "in_progress",
  "isUnlocked": true,
  "updatedAt": "2026-03-11T09:00:00.000Z"
}
```

### Responses — Error Cases

| Status | Condition |
|---|---|
| `400 Bad Request` | `status` field missing or not a valid enum value; or transition is not `pending → in_progress → done` (e.g., `done → in_progress`) |
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | Node is locked (`isUnlocked === false`) |
| `404 Not Found` | `courseCode` does not exist in the student's roadmap |

---

## Endpoint 3 — GET /api/skill-tree/nodes/:courseCode/resources

Returns admin-seeded course materials for the Resources tab, grouped by type.

### Request

```
GET /api/skill-tree/nodes/:courseCode/resources
Authorization: Bearer <JWT>
```

### Response — 200 OK

```json
{
  "courseCode": "IT3910E",
  "resources": {
    "textbook": [
      { "title": "JavaScript: The Good Parts", "url": "https://...", "description": "Core JS reference" }
    ],
    "slide": [
      { "title": "Week 1 - Introduction to Web", "url": "https://..." }
    ],
    "lab": [
      { "title": "Lab 1 - HTML/CSS Basics", "url": "https://..." }
    ],
    "assignment": [
      { "title": "Major Project - Full-stack Web App", "url": "https://...", "description": "End-of-semester project" }
    ]
  }
}
```

**Notes**:
- Any of the four type keys (`textbook`, `slide`, `lab`, `assignment`) may be an empty array `[]` if no materials have been seeded.
- All four keys are always present in the response (never missing) to simplify frontend conditional rendering.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | `courseCode` not in the student's roadmap |

---

## Endpoint 4 — GET /api/skill-tree/nodes/:courseCode/why

Returns the AI-generated explanation of why this course is relevant to the student's career goal.  
Response is served from cache if available; otherwise calls Gemini, validates, caches, and returns.

### Request

```
GET /api/skill-tree/nodes/:courseCode/why
Authorization: Bearer <JWT>
```

### Response — 200 OK

```json
{
  "courseCode": "IT3910E",
  "careerGoal": "frontend-developer",
  "content": "Lập trình Web (IT3910E) là môn học nền tảng giúp bạn hiểu cách trình duyệt xử lý HTML, CSS và JavaScript — đây là bộ công nghệ không thể thiếu đối với bất kỳ Lập trình viên Frontend nào...",
  "cached": true,
  "generatedAt": "2026-03-10T14:20:00.000Z"
}
```

**Field notes**:
- `cached`: `true` if content was served from `course_ai_contexts`; `false` if freshly generated.
- `generatedAt`: timestamp of when the content was first generated (not the request time if cached).
- Prompt sent to Gemini includes: course `nameVi`, `nameEn`, `credits`, and `careerGoal`. Does NOT include the requesting student's personal data (privacy by minimalism).

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | `courseCode` not in the student's roadmap |
| `502 Bad Gateway` | Gemini API call failed (cache miss path only); body: `{ "error": "AI_SERVICE_UNAVAILABLE" }` |

---

## Endpoint 5 — GET /api/skill-tree/nodes/:courseCode/market-skills

Returns industry-relevant skills associated with this course, sourced from the market skills collection.

### Request

```
GET /api/skill-tree/nodes/:courseCode/market-skills
Authorization: Bearer <JWT>
```

### Response — 200 OK

```json
{
  "courseCode": "IT3910E",
  "skills": [
    { "name": "React.js", "jobCount": 1240 },
    { "name": "Node.js", "jobCount": 980 },
    { "name": "REST API design", "jobCount": 870 }
  ],
  "crawledAt": "2026-03-01T00:00:00.000Z"
}
```

**Notes**:
- Skills are ordered by `jobCount` descending (most in-demand first).
- `skills` may be an empty array `[]` if no market data has been crawled for this course.
- `crawledAt` is `null` when `skills` is empty.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | `courseCode` not in the student's roadmap |

---

## Endpoint 6 — GET /api/skill-tree/skills/:skillName/learning-resources

Returns free and paid learning resources for a specific skill. Called when a student clicks a skill item in the Market Skills tab.

### Request

```
GET /api/skill-tree/skills/:skillName/learning-resources
Authorization: Bearer <JWT>
```

**Path parameter**: `skillName` — URL-encoded skill name (e.g., `"React.js"` → `React.js`).

### Response — 200 OK

```json
{
  "skillName": "React.js",
  "resources": {
    "free": [
      {
        "title": "React Tutorial for Beginners",
        "url": "https://www.youtube.com/...",
        "platform": "YouTube"
      }
    ],
    "paid": [
      {
        "title": "React – The Complete Guide 2026",
        "url": "https://www.udemy.com/...",
        "platform": "Udemy"
      }
    ]
  },
  "updatedAt": "2026-03-01T00:00:00.000Z"
}
```

**Notes**:
- Both `free` and `paid` keys are always present; either may be an empty array.
- Resources within each group are ordered by curation priority (platform/title alphabetical, or admin-defined order).

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `404 Not Found` | No learning resources found for `skillName` |

---

## Endpoint 7 — POST /api/skill-tree/repersonalize

Triggers re-generation of the student's personalized roadmap. Only available when `needsRepersonalization === true`.

### Request

```
POST /api/skill-tree/repersonalize
Authorization: Bearer <JWT>
```

No body required.

### Response — 202 Accepted

```json
{
  "message": "Re-personalization started",
  "repersonalizing": true
}
```

**Server-side actions on 202**:
1. Set `studentRoadmap.generatedAt = Date.now()` and `studentRoadmap.repersonalizing = true` immediately (prevents button reappearing on next poll).
2. Dispatch personalization job asynchronously (Promise-based, same pattern as Feature 001 roadmap trigger).
3. Job completion: updates `studentRoadmap.nodes[]`, clears `repersonalizing: false`, sets final `generatedAt`.

The frontend continues polling `GET /api/skill-tree` every 2500ms; when `repersonalizing` becomes `false` and the new nodes array is present, the tree re-renders automatically.

### Responses — Error Cases

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or invalid JWT |
| `403 Forbidden` | `needsRepersonalization === false` (profile has not been updated since last personalization) |
| `409 Conflict` | Re-personalization already in progress (`repersonalizing === true`) |
