# API Contracts: Advanced Tag-Based Search

**Feature**: `008-advanced-tag-search`  
**Date**: 2026-03-11  
**Research dependency**: [../research.md](../research.md) (R-001 to R-007)  
**Base URL**: `/api/search`  
**Auth**: All endpoints require a valid JWT Access Token in the `Authorization: Bearer <token>` header, verified by the shared `auth.middleware.js`. The user ID is extracted from the JWT payload.

---

## Endpoint 1 — POST /api/search/query

Execute a tag-based or keyword-based search with optional filtering, sorting, and pagination. Returns related courses and roadmaps with pagination metadata.

### Request

```http
POST /api/search/query
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "queryType": "tag" | "keyword",
  "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",           // required if queryType === "tag"
  "keyword": "database",                           // required if queryType === "keyword"
  "filters": {
    "levels": ["Beginner", "Intermediate"],       // optional, AND semantics
    "domains": ["Backend"],                        // optional, AND semantics
    "additionalTags": ["64f1a2b3c4d5e6f..."]      // optional, AND semantics
  },
  "sortBy": "relevance" | "alphabetical",         // optional, default: "relevance"
  "page": 1,                                       // optional, default: 1, must be ≥ 1
  "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2" // optional, for personalization highlighting
}
```

### Request body fields

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `queryType` | String | yes | `"tag"` \| `"keyword"` | Determines search mode |
| `tagId` | String (ObjectId) | conditional | required if `queryType === "tag"` | MongoDB ObjectId as string |
| `keyword` | String | conditional | required if `queryType === "keyword"`; 1–100 chars | Free-text search term |
| `filters` | Object | no | Nested object with arrays | Optional filtering criteria |
| `filters.levels` | Array[String] | no | Enum values from courses collection | Multi-select filter (AND semantics) |
| `filters.domains` | Array[String] | no | Enum values from courses collection | Multi-select filter (AND semantics) |
| `filters.additionalTags` | Array[String] | no | Array of ObjectIds (as strings) | Additional tag filters (AND with main tag/keyword) |
| `sortBy` | String | no | `"relevance"` \| `"alphabetical"` | Default: `"relevance"` for keyword search; `"alphabetical"` for fallback |
| `page` | Number | no | Integer ≥ 1 | Default: 1; each page contains 20 results per section |
| `enrolledRoadmapId` | String (ObjectId) | no | Optional; ref: `roadmaps._id` | User's enrolled roadmap ID for "Recommended for You" highlighting |

### Response `200 OK`

```json
{
  "courses": [
    {
      "courseId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "SQL Fundamentals",
      "code": "INT2201",
      "level": "Beginner",
      "domain": "Backend",
      "description": "Learn SQL basics and database querying.",
      "relatedTags": ["#Database", "#SQL"],
      "relatedSkillCount": 8,
      "highlighted": true,
      "highlightReason": "Part of your Backend Developer roadmap"
    },
    {
      "courseId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "NoSQL & MongoDB",
      "code": "INT2202",
      "level": "Intermediate",
      "domain": "Backend",
      "description": "Master NoSQL databases with MongoDB.",
      "relatedTags": ["#Database", "#NoSQL"],
      "relatedSkillCount": 6,
      "highlighted": false,
      "highlightReason": null
    }
  ],
  "roadmaps": [
    {
      "roadmapId": "74f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Backend Developer",
      "description": "Complete backend development learning path.",
      "difficulty": "Intermediate",
      "duration": "6 months",
      "courseCount": 12,
      "relatedTags": ["#Database", "#Backend", "#Server"],
      "highlightedCourseCount": 3,
      "highlighted": true,
      "highlightReason": "Your enrolled roadmap"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 20,
    "totalCourses": 42,
    "totalRoadmaps": 2,
    "hasNextPageCourses": true,
    "hasNextPageRoadmaps": false,
    "coursePagesTotal": 3,
    "roadmapPagesTotal": 1
  },
  "appliedFilters": {
    "levels": ["Intermediate"],
    "domains": [],
    "additionalTags": []
  },
  "fallbackMode": false
}
```

### Response field descriptions

| Field | Type | Notes |
|---|---|---|
| `courses` | Array[CourseResult] | List of related courses (max 20 per page); empty if no matches |
| `roadmaps` | Array[RoadmapResult] | List of related roadmaps (max 20 per page); empty if no matches |
| `pagination` | PaginationMeta | Pagination metadata for both sections |
| `appliedFilters` | Object | Echo of filters sent in request (for UI feedback) |
| `fallbackMode` | Boolean | `true` if results served from pre-cached fallback (search index unavailable); `false` if from live index |

**CourseResult fields**:
- `courseId`: Unique course identifier
- `name`, `code`: Course identification
- `level`: Enum: Beginner, Intermediate, Advanced
- `domain`: Domain category (Backend, Frontend, Data, etc.)
- `description`: Short course overview
- `relatedTags`: Array of tag names matching the search (shows connection)
- `relatedSkillCount`: Number of skills in this course matching the search
- `highlighted`: Boolean; `true` if course is part of enrolled roadmap
- `highlightReason`: String explaining why highlighted

**RoadmapResult fields**:
- `roadmapId`: Unique roadmap identifier
- `name`, `description`: Roadmap identification
- `difficulty`: Enum: Beginner, Intermediate, Advanced
- `duration`: Estimated learning duration (e.g., "6 months")
- `courseCount`: Total courses in this roadmap
- `relatedTags`: Array of tag names from courses in this roadmap
- `highlightedCourseCount`: Number of courses in this roadmap matching the search
- `highlighted`: Boolean; `true` if this is the user's enrolled roadmap
- `highlightReason`: String explaining why highlighted

**PaginationMeta fields**:
- `currentPage`: Current page number (1-indexed)
- `pageSize`: Fixed at 20 results per page
- `totalCourses`: Total matching courses (across all pages)
- `totalRoadmaps`: Total matching roadmaps (across all pages)
- `hasNextPageCourses`: `true` if more courses beyond current page
- `hasNextPageRoadmaps`: `true` if more roadmaps beyond current page
- `coursePagesTotal`: Total pages of courses
- `roadmapPagesTotal`: Total pages of roadmaps

### Error responses

| Status | Condition | Response |
|---|---|---|
| `400 Bad Request` | `queryType` missing or invalid (not `"tag"` or `"keyword"`)` | `{ "error": "Invalid queryType" }` |
| `400 Bad Request` | `queryType === "tag"` but `tagId` missing or invalid | `{ "error": "Missing or invalid tagId for tag search" }` |
| `400 Bad Request` | `queryType === "keyword"` but `keyword` missing or invalid | `{ "error": "Missing or invalid keyword for keyword search" }` |
| `400 Bad Request` | `page` is < 1 or not an integer | `{ "error": "page must be an integer ≥ 1" }` |
| `401 Unauthorized` | Missing or expired access token | `{ "error": "Unauthorized" }` |
| `500 Internal Server Error` | Unexpected DB or index failure | `{ "error": "Search query failed" }` (returns fallback results if available) |

### Example requests

**Tag-based search with personalization:**
```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "tag",
    "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "filters": { "levels": ["Intermediate"] },
    "page": 1,
    "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2"
  }'
```

**Keyword search with multiple filters:**
```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "keyword",
    "keyword": "database",
    "filters": {
      "levels": ["Intermediate", "Advanced"],
      "domains": ["Backend"],
      "additionalTags": ["64f1a2b3c4d5e6f..."]
    },
    "sortBy": "alphabetical",
    "page": 1
  }'
```

---

## Endpoint 2 — GET /api/search/filters

Fetch available filter values (tags, levels, domains) for populating the FilterBar dropdowns. Results are cached in React Query and fetched once per session.

### Request

```http
GET /api/search/filters
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK`

```json
{
  "tags": [
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "#Database",
      "count": 42
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "#JavaScript",
      "count": 35
    },
    {
      "id": "64f1a2b3c4d5e6f7a8b9c0d3",
      "name": "#Backend",
      "count": 28
    }
  ],
  "levels": [
    "Beginner",
    "Intermediate",
    "Advanced"
  ],
  "domains": [
    "Backend",
    "Frontend",
    "Data",
    "DevOps",
    "Mobile"
  ]
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `tags` | Array[TagFilter] | Available tags (distinct from skills collection); count = number of skills with this tag |
| `levels` | Array[String] | Distinct level values from courses collection |
| `domains` | Array[String] | Distinct domain values from courses collection |

**TagFilter subtype**:
- `id`: Tag ID (ObjectId as string)
- `name`: Tag name (e.g., "#Database")
- `count`: Number of skills tagged with this tag (optional, for UI badges)

### Error responses

| Status | Condition | Response |
|---|---|---|
| `401 Unauthorized` | Missing or expired access token | `{ "error": "Unauthorized" }` |
| `500 Internal Server Error` | Unexpected DB failure | `{ "error": "Failed to fetch filters" }` |

### Example request

```bash
curl -X GET http://localhost:4000/api/search/filters \
  -H "Authorization: Bearer <token>"
```

---

## Endpoint 3 — GET /api/search/personalization

Fetch the user's enrolled roadmap ID (if any) for frontend initialization. Enables personalization highlighting without passing it in every search request. Results are cached in React Query with session TTL.

### Request

```http
GET /api/search/personalization
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK` (user is enrolled in a roadmap)

```json
{
  "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2",
  "enrolledRoadmapName": "Backend Developer",
  "courseCount": 12
}
```

### Response `200 OK` (user has no enrollment)

```json
{
  "enrolledRoadmapId": null,
  "enrolledRoadmapName": null,
  "courseCount": 0
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `enrolledRoadmapId` | String (ObjectId) or null | The roadmap user is currently enrolled in; `null` if not enrolled |
| `enrolledRoadmapName` | String or null | Human-readable name of enrolled roadmap; `null` if not enrolled |
| `courseCount` | Number | Number of courses in the enrolled roadmap; `0` if not enrolled |

### Error responses

| Status | Condition | Response |
|---|---|---|
| `401 Unauthorized` | Missing or expired access token | `{ "error": "Unauthorized" }` |
| `500 Internal Server Error` | Unexpected DB failure | `{ "error": "Failed to fetch personalization data" }` |

### Example request

```bash
curl -X GET http://localhost:4000/api/search/personalization \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling & Graceful Degradation

### Search Engine Failure (Endpoint 1)

If the live search index (MongoDB text index or Elasticsearch) is unavailable:

1. The backend catches the index query error
2. Falls back to the `search_cache` collection (pre-computed fallback data)
3. Returns results with `fallbackMode: true`
4. Fallback results are **alphabetical only** (no relevance scoring)
5. Fallback results do **not include personalization highlighting** (limiting to basic discovery)

**Expected client handling**:
- Disable `sortBy: "relevance"` button when `fallbackMode: true`
- Show a banner: "Search results are temporarily simplified. Please refresh to update."

### Filter & Personalization Failure (Endpoints 2 & 3)

If filter values or personalization data cannot be fetched:

1. Frontend catches `500` error
2. Disables filter dropdowns (show message: "Filters temporarily unavailable")
3. Disables personalization highlighting (show all results without badges)
4. User can still perform basic searches without filters

---

## Performance SLA

**Endpoint 1 (Search Query)**:
- **Target p95 latency**: 500ms for 10K-skill dataset
- **Target p99 latency**: 800ms for 10K-skill dataset
- **Fallback latency**: 100ms from cache

**Endpoint 2 (Fetch Filters)**:
- **Target latency**: 50ms (single aggregation query)
- **Caching**: Client-side (React Query, session TTL)

**Endpoint 3 (Fetch Personalization)**:
- **Target latency**: 30ms (single document lookup)
- **Caching**: Client-side (React Query, session TTL)

---

## API Versioning & Deprecation

Current version: `v1` (implied in base URL `/api/search/*`)

Future versions (v2+) may introduce:
- Custom scoring functions in search query
- Elasticsearch backend support
- Real-time search suggestions (autocomplete)
- User search history tracking

All changes will be backward-compatible within v1 (new optional fields, not breaking). Breaking changes will introduce `/api/v2/search/*` endpoints.
