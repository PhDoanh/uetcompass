# API Contract: Roadmap Search Page

## Base
- Base URL: `/api/roadmaps`
- Visibility scope for this feature: public/shared roadmap records only.

## 1) Search Public Roadmaps by Name

### Endpoint
- `GET /api/roadmaps/manual-roadmaps/public`

### Query Parameters
- `q` (optional, string): Name keyword filter.
- `page` (optional, integer, default `1`)
- `limit` (optional, integer, default `20`, max `100`)

### Behavioral Rules
- If `q` is provided and has fewer than 2 characters, API returns `400 INVALID_PAYLOAD`.
- Search is case-insensitive and title-based for this release.
- Response includes only public/shared records.

### Response: 200
```json
{
  "items": [
    {
      "_id": "67f1a1b2c3d4e5f678901234",
      "title": "Frontend Developer Roadmap",
      "description": "A complete path for frontend skills.",
      "sharedAt": "2026-04-14T09:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

### Response: 400
```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Search query must be at least 2 characters."
  }
}
```

### Response: 500
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unexpected server error"
  }
}
```

## 2) Preview Public Roadmap by Id

### Endpoint
- `GET /api/roadmaps/manual-roadmaps/public/:roadmapId`

### Behavioral Rules
- Endpoint returns preview payload only if roadmap exists and is public/shared.
- Non-public or missing ids return not found.

### Response: 200
```json
{
  "_id": "67f1a1b2c3d4e5f678901234",
  "title": "Frontend Developer Roadmap",
  "description": "A complete path for frontend skills.",
  "nodes": [
    {
      "nodeId": "HTML_CSS",
      "label": "HTML & CSS",
      "prerequisites": []
    },
    {
      "nodeId": "JS_CORE",
      "label": "JavaScript Core",
      "prerequisites": ["HTML_CSS"]
    }
  ],
  "sharedAt": "2026-04-14T09:00:00.000Z"
}
```

### Response: 404
```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Public roadmap not found."
  }
}
```

### Response: 500
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Unexpected server error"
  }
}
```

## Frontend Interaction Contract
- Clicking navbar search input navigates to `/roadmaps/search`.
- Search page performs debounced queries (`300ms`) only when query length >= 2.
- After each successful search response with non-empty items, the first item is selected and preview endpoint is called.
- Clicking another item updates selected state and triggers preview fetch for that id.
