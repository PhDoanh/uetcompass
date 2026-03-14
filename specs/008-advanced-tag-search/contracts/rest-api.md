# API Contracts: Advanced Tag-Based Search

**Feature**: `008-advanced-tag-search`  
**Date**: 2026-03-11  
**Research dependency**: [../research.md](../research.md) (R-001 to R-008)  
**Base URL**: `/api/search`  
**Auth**: All endpoints require a valid JWT Access Token in the `Authorization: Bearer <token>` header, verified by the shared `auth.middleware.js`. The user ID is extracted from the JWT payload.

---

## Common Conventions

### Canonical tag normalization

- For `queryType = "tag"`, request may provide:
  - `query.tagId`, or
  - `query.tagNormalizedName`, or
  - both (if consistent)
- Backend MUST normalize to canonical `resolvedTagId` before executing the search query.

### Error envelope (all non-2xx responses)

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Error codes

| HTTP | code | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Validation or normalization failed |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 404 | `NOT_FOUND` | Resource not found (optional endpoint-specific usage) |
| 500 | `INTERNAL_ERROR` | Unexpected server/index/cache failure |

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
  "query": {
    "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",           // optional for tag query
    "tagNormalizedName": "database",               // optional for tag query
    "keyword": "database"                          // required for keyword query
  },
  "filters": {
    "levels": ["Beginner", "Intermediate"],       // optional, AND semantics
    "domains": ["Backend"],                        // optional, AND semantics
    "additionalTagIds": ["64f1a2b3c4d5e6f..."],    // optional, AND semantics
    "minConfidence": 60                              // optional, 0-100
  },
  "sort": {
    "by": "relevance" | "alphabetical",          // optional, default: relevance
    "order": "asc" | "desc"                      // optional, default: desc
  },
  "pagination": {
    "page": 1,                                      // optional, default: 1, must be ≥ 1
    "pageSize": 20                                  // optional, default: 20, range: 1-50
  },
  "personalization": {
    "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2" // optional
  }
}
```

### Request body fields

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `queryType` | String | yes | `"tag"` \| `"keyword"` | Determines search mode |
| `query` | Object | yes | Nested object | Search input payload |
| `query.tagId` | String (ObjectId) | conditional | required for tag search when `query.tagNormalizedName` absent | Canonical tag identifier |
| `query.tagNormalizedName` | String | conditional | required for tag search when `query.tagId` absent | Lowercase+trimmed key; backend resolves to `tagId` |
| `query.keyword` | String | conditional | required if `queryType === "keyword"`; 1–100 chars | Free-text search term |
| `filters` | Object | no | Nested object with arrays | Optional filtering criteria |
| `filters.levels` | Array[String] | no | Enum values from courses collection | Multi-select filter (AND semantics) |
| `filters.domains` | Array[String] | no | Enum values from courses collection | Multi-select filter (AND semantics) |
| `filters.additionalTagIds` | Array[String] | no | Array of ObjectIds (as strings) | Additional canonical tag filters |
| `filters.minConfidence` | Number | no | 0–100 | Minimum confidence for matched `Skill.tags` |
| `sort.by` | String | no | `"relevance"` \| `"alphabetical"` | Default: `"relevance"`; forced `"alphabetical"` in fallback |
| `sort.order` | String | no | `"asc"` \| `"desc"` | Default: `"desc"` |
| `pagination.page` | Number | no | Integer ≥ 1 | Default: 1 |
| `pagination.pageSize` | Number | no | Integer in [1,50] | Default: 20 |
| `personalization.enrolledRoadmapId` | String (ObjectId) | no | Optional; ref: `roadmaps._id` | User's enrolled roadmap ID for highlighting |

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
      "matchedTags": [
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0d1", "normalizedName": "database", "confidence": 92 },
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0d9", "normalizedName": "sql", "confidence": 90 }
      ],
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
      "matchedTags": [
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0d1", "normalizedName": "database", "confidence": 88 },
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0da", "normalizedName": "nosql", "confidence": 86 }
      ],
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
      "matchedTags": [
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0d1", "normalizedName": "database", "confidence": 91 },
        { "tagId": "64f1a2b3c4d5e6f7a8b9c0db", "normalizedName": "backend", "confidence": 84 }
      ],
      "highlightedCourseCount": 3,
      "highlighted": true,
      "highlightReason": "Your enrolled roadmap"
    }
  ],
  "queryContext": {
    "queryType": "tag",
    "input": { "tagNormalizedName": "database" },
    "resolvedTagId": "64f1a2b3c4d5e6f7a8b9c0d1"
  },
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
    "additionalTagIds": [],
    "minConfidence": 0
  },
  "appliedSort": {
    "by": "relevance",
    "order": "desc"
  },
  "fallbackMode": false
}
```

### Response field descriptions

| Field | Type | Notes |
|---|---|---|
| `courses` | Array[CourseResult] | List of related courses (max 20 per page); empty if no matches |
| `roadmaps` | Array[RoadmapResult] | List of related roadmaps (max 20 per page); empty if no matches |
| `queryContext` | Object | Canonical query context after input normalization |
| `pagination` | PaginationMeta | Pagination metadata for both sections |
| `appliedFilters` | Object | Echo of filters sent in request (for UI feedback) |
| `appliedSort` | Object | Effective sorting strategy used by backend |
| `fallbackMode` | Boolean | `true` if results served from pre-cached fallback (search index unavailable); `false` if from live index |

**CourseResult fields**:
- `courseId`: Unique course identifier
- `name`, `code`: Course identification
- `level`: Enum: Beginner, Intermediate, Advanced
- `domain`: Domain category (Backend, Frontend, Data, etc.)
- `description`: Short course overview
- `matchedTags`: Canonical tag metadata array (`tagId`, `normalizedName`, `confidence`)
- `relatedSkillCount`: Number of skills in this course matching the search
- `highlighted`: Boolean; `true` if course is part of enrolled roadmap
- `highlightReason`: String explaining why highlighted

**RoadmapResult fields**:
- `roadmapId`: Unique roadmap identifier
- `name`, `description`: Roadmap identification
- `difficulty`: Enum: Beginner, Intermediate, Advanced
- `duration`: Estimated learning duration (e.g., "6 months")
- `courseCount`: Total courses in this roadmap
- `matchedTags`: Canonical tag metadata aggregated from roadmap courses
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
| `400 Bad Request` | `queryType` missing/invalid, invalid query payload, unresolved/ conflicting tag input, invalid pagination/sort/filter | `{ "error": { "code": "INVALID_INPUT", "message": "Invalid search request", "details": { ... } } }` |
| `401 Unauthorized` | Missing or expired access token | `{ "error": { "code": "UNAUTHORIZED", "message": "Unauthorized" } }` |
| `500 Internal Server Error` | Unexpected DB/index/cache failure and no fallback available | `{ "error": { "code": "INTERNAL_ERROR", "message": "Search query failed" } }` |

### Example requests

**Tag-based search with personalization:**
```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "tag",
    "query": { "tagNormalizedName": "database" },
    "filters": { "levels": ["Intermediate"], "minConfidence": 60 },
    "sort": { "by": "relevance", "order": "desc" },
    "pagination": { "page": 1, "pageSize": 20 },
    "personalization": { "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2" }
  }'
```

**Keyword search with multiple filters:**
```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "keyword",
    "query": { "keyword": "database" },
    "filters": {
      "levels": ["Intermediate", "Advanced"],
      "domains": ["Backend"],
      "additionalTagIds": ["64f1a2b3c4d5e6f..."]
    },
    "sort": { "by": "alphabetical", "order": "asc" },
    "pagination": { "page": 1, "pageSize": 20 }
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
      "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "normalizedName": "database",
      "displayName": "#Database",
      "count": 42
    },
    {
      "tagId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "normalizedName": "javascript",
      "displayName": "#JavaScript",
      "count": 35
    },
    {
      "tagId": "64f1a2b3c4d5e6f7a8b9c0d3",
      "normalizedName": "backend",
      "displayName": "#Backend",
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
- `tagId`: Tag ID (ObjectId as string)
- `normalizedName`: Canonical key (lowercase + trimmed)
- `displayName`: UI label (e.g., "#Database")
- `count`: Number of skills tagged with this tag (optional, for UI badges)

### Error responses

| Status | Condition | Response |
|---|---|---|
| `401 Unauthorized` | Missing or expired access token | `{ "error": { "code": "UNAUTHORIZED", "message": "Unauthorized" } }` |
| `500 Internal Server Error` | Unexpected DB failure | `{ "error": { "code": "INTERNAL_ERROR", "message": "Failed to fetch filters" } }` |

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
| `401 Unauthorized` | Missing or expired access token | `{ "error": { "code": "UNAUTHORIZED", "message": "Unauthorized" } }` |
| `500 Internal Server Error` | Unexpected DB failure | `{ "error": { "code": "INTERNAL_ERROR", "message": "Failed to fetch personalization data" } }` |

### Example request

```bash
curl -X GET http://localhost:4000/api/search/personalization \
  -H "Authorization: Bearer <token>"
```

---

## Error Handling & Graceful Degradation

### Search Engine Failure (Endpoint 1)

If the live search index (MongoDB text index in MVP) is unavailable:

1. The backend catches the index query error
2. Falls back to the `search_cache` collection (pre-computed fallback data)
3. Returns results with `fallbackMode: true`
4. Fallback results are **alphabetical only** (no relevance scoring)
5. Fallback results do **not include personalization highlighting** (limiting to basic discovery)

**Expected client handling**:
- Disable `sort.by = "relevance"` option when `fallbackMode: true`
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
