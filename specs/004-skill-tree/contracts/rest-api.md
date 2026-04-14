# REST API Contracts: Skill Tree

**Feature**: `004-skill-tree`  
**Date**: 2026-04-11  
**Data authority**: Feature 009 (`roadmaps`, `roadmap_progress`)  
**Base path**: `/api/skill-tree`

All endpoints require `Authorization: Bearer <JWT>`.

---

## Common Error Envelope

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Human-readable description"
  }
}
```

Common codes surfaced by Skill Tree:

- `ROADMAP_NOT_FOUND`
- `INVALID_PAYLOAD`
- `INVALID_TRANSITION`
- `CONFLICT`
- `INTERNAL_SERVER_ERROR`

---

## GET /api/skill-tree

Returns the authenticated user's canonical Skill Tree payload composed from Feature 009 primary roadmap and progress state.

### Response — 200 OK

```json
{
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "roadmapName": "Frontend Developer Roadmap",
  "personalisationLevel": "full",
  "acceptedAt": "2026-04-11T08:05:12.000Z",
  "isPrimary": true,
  "isRetryable": false,
  "nodes": [
    {
      "nodeId": "version-control-systems",
      "nodeType": "topic",
      "skillName": "Version Control Systems",
      "parentNodeId": null,
      "relatedCourses": [
        { "courseCode": "INT2204", "courseName": "Object-Oriented Programming", "credits": 3 }
      ],
      "reason": "Foundation for collaborative software development.",
      "resources": []
    }
  ],
  "progress": {
    "pending": ["version-control-systems"],
    "inProgress": [],
    "completed": [],
    "skip": []
  }
}
```

### Response — 404 Not Found

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "No primary roadmap found."
  }
}
```

---

## GET /api/skill-tree/roadmaps/:roadmapId/progress

Returns the canonical progress document for a roadmap (auth-scoped).

### Response — 200 OK

```json
{
  "_id": "64a1b2c3d4e5f6a7b8c9d0e4",
  "userId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "state": {
    "pending": ["version-control-systems"],
    "inProgress": [],
    "completed": [],
    "skip": []
  },
  "updatedAt": "2026-04-11T08:00:00.000Z"
}
```

### Response — 404 Not Found

```json
{
  "error": {
    "code": "ROADMAP_NOT_FOUND",
    "message": "Roadmap or progress not found."
  }
}
```

---

## PATCH /api/skill-tree/roadmaps/:roadmapId/progress/node

Moves one node between progress states using canonical 009 transition rules.

### Request Body

```json
{
  "nodeId": "version-control-systems",
  "fromState": "pending",
  "toState": "inProgress"
}
```

Valid transitions:

- `pending -> inProgress`
- `pending -> skip`
- `inProgress -> completed`

### Response — 200 OK

```json
{
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "state": {
    "pending": [],
    "inProgress": ["version-control-systems"],
    "completed": [],
    "skip": []
  },
  "updatedAt": "2026-04-11T08:10:00.000Z"
}
```

### Response — 400 Bad Request

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "nodeId is required and must be a non-empty string."
  }
}
```

### Response — 422 Unprocessable Entity

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Transition from 'completed' to 'inProgress' is not allowed."
  }
}
```

---

## GET /api/skill-tree/nodes/:courseCode/resources

Legacy auxiliary endpoint for course-seeded resources. Preserved for compatibility with existing tabs.

## GET /api/skill-tree/nodes/:courseCode/why

Legacy auxiliary endpoint for AI explanation. Preserved for compatibility.

## GET /api/skill-tree/nodes/:courseCode/market-skills

Legacy auxiliary endpoint for market skills. Preserved for compatibility.

## GET /api/skill-tree/skills/:skillName/learning-resources

Legacy auxiliary endpoint for skill resources. Preserved for compatibility.

---

## Regeneration Trigger

Skill Tree UI triggers regeneration through Feature 009 endpoint (not this module):

- `POST /api/roadmaps/primary/regenerate`

Skill Tree then re-fetches `GET /api/skill-tree` to refresh roadmap/progress view.
