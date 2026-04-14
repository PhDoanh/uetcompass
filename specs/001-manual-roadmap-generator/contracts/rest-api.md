# REST API Contract: Manual Roadmap Module

**Feature**: `001-manual-roadmap-generator`
**Date**: 2026-04-09
**Base path**: `/api/roadmaps`
**Authentication**: All endpoints require a valid JWT in `Authorization: Bearer <token>`.

---

## Common Conventions

**Request headers**:
```
Authorization: Bearer <JWT>
Content-Type: application/json
```

**Error envelope**:
```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human-readable description"
  }
}
```

**Error codes**:

| HTTP | `code` | Meaning |
|---|---|---|
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN` | User not authorized for the requested roadmap |
| 404 | `ROADMAP_NOT_FOUND` | Roadmap not found or not owned by requester |
| 409 | `CONFLICT` | Concurrent update or share conflict |
| 422 | `VALIDATION_ERROR` | YAML or DAG validation failed |
| 422 | `PUBLICATION_ERROR` | Roadmap cannot be shared in current state |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## GET /api/roadmaps/manual-roadmaps

List the authenticated user's roadmaps.

### Query parameters
- `status` (optional): `draft` | `published` | `archived`
- `page` (optional): integer, default `1`
- `limit` (optional): integer, default `20`, max `100`

### Response — 200 OK
```json
{
  "items": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "title": "Software Engineering Roadmap",
      "status": "draft",
      "shared": false,
      "isPublic": false,
      "updatedAt": "2026-04-09T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## GET /api/roadmaps/manual-roadmaps/:roadmapId

Get a full roadmap document owned by the authenticated user.

### Response — 200 OK
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "title": "Software Engineering Roadmap",
  "description": "Complete path for software engineering students.",
  "yamlCode": "title: ...",
  "nodes": [
    {
      "nodeId": "MATH101",
      "label": "Discrete Mathematics",
      "description": "Foundation for algorithms.",
      "prerequisites": [],
      "status": "pending",
      "skills": ["Discrete Math"],
      "metadata": {}
    }
  ],
  "shared": false,
  "isPublic": false,
  "status": "draft",
  "createdAt": "2026-04-09T08:00:00.000Z",
  "updatedAt": "2026-04-09T08:02:00.000Z"
}
```

### Response — 404 Not Found
```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Roadmap not found."
  }
}
```

---

## POST /api/roadmaps/manual-roadmaps

Create a new draft roadmap.

### Request
```json
{
  "title": "Software Engineering Roadmap",
  "description": "Complete path for software engineering students.",
  "yamlCode": "title: ...",
  "nodes": [
    {
      "nodeId": "MATH101",
      "label": "Discrete Mathematics",
      "prerequisites": [],
      "status": "pending",
      "skills": ["Discrete Math"]
    }
  ]
}
```

### Response — 201 Created
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "draft",
  "shared": false,
  "isPublic": false,
  "createdAt": "2026-04-09T08:00:00.000Z",
  "updatedAt": "2026-04-09T08:00:00.000Z"
}
```

### Response — 422 Unprocessable Entity
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "YAML validation failed.",
    "details": ["Syntax error on line 5", "Duplicate nodeId 'CS101'"]
  }
}
```

---

## PATCH /api/roadmaps/manual-roadmaps/:roadmapId

Update an existing draft roadmap.

### Request
```json
{
  "title": "Updated Roadmap",
  "description": "Changed scope",
  "yamlCode": "title: ...",
  "nodes": [
    {
      "nodeId": "MATH101",
      "label": "Discrete Mathematics",
      "prerequisites": [],
      "status": "pending",
      "skills": ["Discrete Math"]
    }
  ]
}
```

### Response — 200 OK
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "draft",
  "updatedAt": "2026-04-09T08:05:00.000Z"
}
```

---

## POST /api/roadmaps/manual-roadmaps/:roadmapId/share

Publish a draft roadmap to community visibility.

### Request
```json
{
  "isPublic": true
}
```

### Response — 200 OK
```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
  "shared": true,
  "isPublic": true,
  "status": "published",
  "sharedAt": "2026-04-09T08:10:00.000Z"
}
```

### Response — 422 Unprocessable Entity
```json
{
  "error": {
    "code": "PUBLICATION_ERROR",
    "message": "Draft contains invalid DAG structure and cannot be shared."
  }
}
```

---

## GET /api/roadmaps/manual-roadmaps/public

List published roadmaps visible to all users (no auth required).

### Query parameters
- `page` (optional): integer, default `1`
- `limit` (optional): integer, default `20`, max `100`

### Response — 200 OK
```json
{
  "items": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "title": "Software Engineering Roadmap",
      "description": "Publicly shared roadmap.",
      "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "sharedAt": "2026-04-09T08:10:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1
  }
}
```

---

## Data Formats

### YAML Structure
```yaml
title: Roadmap Title
description: Optional description
nodes:
  - nodeId: COURSE101
    label: Course Name
    prerequisites: [COURSE100]
```

### Graph Data
Serialized React Flow nodes + edges for frontend rendering.
