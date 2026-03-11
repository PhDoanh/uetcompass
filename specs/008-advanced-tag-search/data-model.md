# Data Model: Advanced Tag-Based Search

**Feature**: `008-advanced-tag-search`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-001 to R-007)

---

## Entity: SearchQuery Request

**Purpose**: Frontend → Backend request payload for tag-based and keyword-based search.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `queryType` | String (enum) | yes | — | `"tag"` \| `"keyword"` | Determines which search mode: tag click or keyword search |
| `tagId` | String (ObjectId) | conditional | — | required if `queryType === "tag"`; ref: `skills.tags` | Tag to search for (e.g., #Database) |
| `keyword` | String | conditional | — | required if `queryType === "keyword"`; 1–100 chars | Free-text search term (e.g., "SQL", "Database") |
| `filters` | Object | no | `{}` | Nested object | Combined filter criteria |
| `filters.levels` | Array[String] | no | `[]` | Enum values from `courses.level` | Level filter (Beginner, Intermediate, Advanced) |
| `filters.domains` | Array[String] | no | `[]` | Enum values from `courses.domain` | Domain filter (Backend, Frontend, Data, etc.) |
| `filters.additionalTags` | Array[String] | no | `[]` | Array of TagIds (ObjectId) | Additional tags to further narrow results (AND semantics) |
| `sortBy` | String (enum) | no | `"relevance"` | `"relevance"` \| `"alphabetical"` | Result sorting strategy |
| `page` | Number | no | `1` | Integer ≥ 1 | Page number for pagination (20 results per page) |
| `enrolledRoadmapId` | String (ObjectId) | no | null | Optional ref: `roadmaps._id` | User's enrolled roadmap ID for personalization highlighting |

### Example payloads

**Tag-based search:**
```json
{
  "queryType": "tag",
  "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "filters": {
    "levels": ["Intermediate"],
    "domains": []
  },
  "sortBy": "relevance",
  "page": 1,
  "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2"
}
```

**Keyword search with multiple filters:**
```json
{
  "queryType": "keyword",
  "keyword": "database design",
  "filters": {
    "levels": ["Intermediate", "Advanced"],
    "domains": ["Backend", "Data"],
    "additionalTags": ["64f1a2b3c4d5e6f7a8b9c0d1"]
  },
  "sortBy": "alphabetical",
  "page": 2,
  "enrolledRoadmapId": null
}
```

---

## Entity: SearchResponse

**Purpose**: Backend → Frontend response payload containing related courses and roadmaps.

### Schema

| Field | Type | Notes |
|---|---|---|
| `courses` | Array[CourseResult] | Related courses (max 20 per page) |
| `roadmaps` | Array[RoadmapResult] | Related roadmaps (max 20 per page) |
| `pagination` | PaginationMeta | Metadata for pagination control |
| `appliedFilters` | Object | Echo of filters applied (for UI feedback) |
| `fallbackMode` | Boolean | `true` if results served from cache (search index unavailable); `false` if from live index |

### CourseResult subtype

| Field | Type | Notes |
|---|---|---|
| `courseId` | String (ObjectId) | Unique course identifier |
| `name` | String | Course title (e.g., "SQL Fundamentals") |
| `code` | String | Course code (e.g., "INT2201") |
| `level` | String | Enum: Beginner, Intermediate, Advanced |
| `domain` | String | Domain category (Backend, Frontend, Data, etc.) |
| `description` | String | Short course description |
| `relatedTags` | Array[String] | Tags that matched the search (shows why course was returned) |
| `relatedSkillCount` | Number | Count of skills in this course matching the search filter |
| `highlighted` | Boolean | `true` if course is part of user's enrolled roadmap (personalization) |
| `highlightReason` | String | If `highlighted: true`, explain why (e.g., "Part of your Backend Developer roadmap") |

### RoadmapResult subtype

| Field | Type | Notes |
|---|---|---|
| `roadmapId` | String (ObjectId) | Unique roadmap identifier |
| `name` | String | Roadmap title (e.g., "Backend Developer") |
| `description` | String | Roadmap overview |
| `difficulty` | String | Difficulty level (Beginner, Intermediate, Advanced) |
| `duration` | String | Estimated duration (e.g., "6 months", "12 weeks") |
| `courseCount` | Number | Number of courses in this roadmap |
| `relatedTags` | Array[String] | Tags that matched the search |
| `highlightedCourseCount` | Number | Count of courses in this roadmap that matched the search (shows connection strength) |
| `highlighted` | Boolean | `true` if this is the user's enrolled roadmap (personalization) |
| `highlightReason` | String | If `highlighted: true`, explain why (e.g., "Your enrolled roadmap") |

### PaginationMeta subtype

| Field | Type | Notes |
|---|---|---|
| `currentPage` | Number | Current page (1-indexed) |
| `pageSize` | Number | Results per page (fixed at 20) |
| `totalCourses` | Number | Total courses matching filters (not truncated to page) |
| `totalRoadmaps` | Number | Total roadmaps matching filters (not truncated to page) |
| `hasNextPageCourses` | Boolean | `true` if more courses exist beyond current page |
| `hasNextPageRoadmaps` | Boolean | `true` if more roadmaps exist beyond current page |
| `coursePagesTotal` | Number | Total pages of courses |
| `roadmapPagesTotal` | Number | Total pages of roadmaps |

### Example response

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

---

## Entity: SearchCache (Fallback Data)

**MongoDB collection**: `search_cache`

**Purpose**: Pre-computed fallback data for graceful degradation when the search index is unavailable (see R-005).

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `type` | String | yes | — | Fixed value: `"fallback"` | Single document of type `fallback` in this collection |
| `allCourses` | Array[Course] | yes | `[]` | Sorted alphabetically by name | Complete course list (name, code, level, domain, tags) |
| `allRoadmaps` | Array[Roadmap] | yes | `[]` | Sorted alphabetically by name | Complete roadmap list (name, difficulty, courseIds) |
| `tagCourseMap` | Object | yes | `{}` | Map of tagId → [courseIds] | Quick lookup: tag → courses for tag-based fallback |
| `lastRefreshAt` | Date | yes | `Date.now()` | — | Timestamp of last cache rebuild |
| `refreshIntervalMinutes` | Number | yes | `360` | Integer ≥ 1 | How often to auto-refresh (minutes) |

### Document example

```json
{
  "_id": ObjectId("..."),
  "type": "fallback",
  "allCourses": [
    {
      "courseId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Advanced Python",
      "code": "INT3101",
      "level": "Advanced",
      "domain": "Backend",
      "tags": ["#Python", "#Backend"]
    },
    {
      "courseId": "64f1a2b3c4d5e6f7a8b9c0d2",
      "name": "Database Design",
      "code": "INT2201",
      "level": "Intermediate",
      "domain": "Data",
      "tags": ["#Database", "#Design"]
    }
  ],
  "allRoadmaps": [
    {
      "roadmapId": "74f1a2b3c4d5e6f7a8b9c0d1",
      "name": "Backend Developer",
      "difficulty": "Intermediate",
      "courseIds": ["64f1a2b3c4d5e6f7a8b9c0d1", "64f1a2b3c4d5e6f7a8b9c0d2"]
    }
  ],
  "tagCourseMap": {
    "64f1a2b3c4d5e6f...(tagId)": ["64f1a2b3c4d5e6f...", "64f1a2b3c4d5e6f..."],
    "...": ["..."]
  },
  "lastRefreshAt": "2026-03-11T12:00:00.000Z",
  "refreshIntervalMinutes": 360
}
```

### Indexes

| Name | Fields | Type | Purpose |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `type_idx` | `type: 1` | Standard | Fast lookup of the single `fallback` document |

---

## Referenced Entity: Skill (read-only, owned by Feature 006 — AI Auto-Tagging)

**MongoDB collection**: `skills`

**Purpose**: Contains tags and descriptions that are searched. The Search module queries but never writes to this collection.

### Minimum fields required by Search module

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Unique skill identifier |
| `name` | String | Skill name (e.g., "SQL", "REST API Design") |
| `description` | String | Detailed description (used in full-text search) |
| `tags` | Array[Object] | Array of tags: `[{ tagId: ObjectId, tagName: String, confidence: Number }]` |
| `categoryId` | ObjectId | ref: `skill_categories` (used for Domain filter) |
| `level` | String | Enum: Beginner, Intermediate, Advanced |

**Index required**: `{ tags: 1, description: "text" }` — for tag matching and full-text search (text index on description). If MongoDB text index is used, this is essential.

---

## Referenced Entity: Course (read-only, owned by Feature 001 — Profile Onboarding)

**MongoDB collection**: `courses`

**Purpose**: Learning modules that the search feature returns in results.

### Minimum fields required by Search module

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Unique course identifier |
| `name` | String | Course title |
| `code` | String | Course code (e.g., "INT2201") |
| `description` | String | Course description |
| `level` | String | Enum: Beginner, Intermediate, Advanced (used for filtering) |
| `domain` | String | Domain/category (Backend, Frontend, Data, etc.) — used for filtering |
| `skillIds` | Array[ObjectId] | ref: `skills._id` — array of skills in this course |

---

## Referenced Entity: Roadmap (read-only, owned by Feature 001 — Profile Onboarding)

**MongoDB collection**: `roadmaps`

**Purpose**: Learning paths that the search feature returns in results.

### Minimum fields required by Search module

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Unique roadmap identifier |
| `name` | String | Roadmap title (e.g., "Backend Developer") |
| `description` | String | Roadmap overview |
| `difficulty` | String | Enum: Beginner, Intermediate, Advanced |
| `duration` | String | Estimated duration (e.g., "6 months") |
| `courseIds` | Array[ObjectId] | ref: `courses._id` — array of courses in this roadmap |

---

## Data Flow Diagram

```text
User clicks tag or enters keyword
        │
        ▼
Frontend: POST /api/search/query
        │
        ▼
Backend: search.controller.js
        │ Validates payload, calls searchService.executeSearch()
        │
        ├─── Try: Query MongoDB text index or Elasticsearch
        │         • Build filter query from criteria
        │         • Fetch courses and roadmaps
        │         • Deduplicate by _id (Map/Set)
        │         • Highlight results (if enrolledRoadmapId provided)
        │         • Paginate and sort
        │
        ├─── Catch: If index unavailable
        │    └─ Read from search_cache fallback
        │       • Lookup courses by tag (tagCourseMap)
        │       • Return all (alphabetical, no personalization)
        │
        ▼
Backend: Return SearchResponse
        │
        ▼
Frontend: React component receives response
        │ Render ResultsSection (two columns: Related Courses + Related Roadmaps)
        │ Display pagination controls
        │
        ▼
User views results with "Recommended for You" highlights
```

---

## Constraints & Consistency Rules

1. **Deduplication**: Same course/roadmap must appear only once in results, regardless of how many paths (Tag → Skill → Course) lead to it.
2. **Pagination**: Page 1 always shows courses 1–20 of total results, not per-section. Same for roadmaps.
3. **Highlighting logic**: A course is highlighted only if it appears in the roadmap (via `roadmapId.courseIds`) that matches `enrolledRoadmapId`.
4. **Fallback mode**: When `fallbackMode: true`, sorting is fixed to alphabetical (no relevance scoring available), and highlighting is disabled (no relationship data available).
5. **Filter consistency**: All three filter types (Tag, Level, Domain) use AND semantics — a result must match all selected filters.

---

## Evolution & Scaling Notes

- **At 10K skills**: MongoDB text index performs well (<100ms query time).
- **At 50K skills**: Re-evaluate and consider migrating to Elasticsearch. Text index latency may exceed 500ms target. Update `search.index.js` to support both backends via abstraction.
- **Fallback cache size**: At 50K skills, fallback document may exceed BSON 16MB limit. Consider splitting into multiple documents or archiving older cache data.
