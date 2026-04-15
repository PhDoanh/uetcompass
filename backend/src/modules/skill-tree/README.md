# Skill Tree Module

## Overview

Skill Tree is a presentation-focused adapter module for Feature 004.

- Reads canonical roadmap from Feature 009 (`roadmaps`)
- Reads/writes canonical progress from Feature 009 (`roadmap_progress`)
- Returns a UI-ready payload for Skill Tree pages
- Preserves legacy auxiliary endpoints (resources/why/market-skills) for compatibility

This module does not own roadmap lifecycle rules, schema transitions, or progress transition policies.

## Structure

```
backend/src/modules/skill-tree/
├── skillTree.routes.js
├── skillTree.controller.js
├── skillTree.service.js
├── skillTree.validation.js
├── primaryRoadmap.service.js
├── courseResource.service.js          # legacy compatibility
├── marketSkill.service.js             # legacy compatibility
├── aiContext.service.js               # legacy compatibility
└── aiContext.model.js                 # legacy compatibility
```

## Contract-Aligned Endpoints

Base path: `/api/skill-tree`

- `GET /` - canonical tree payload from roadmap + progress
- `GET /roadmaps/:roadmapId/progress` - canonical roadmap progress
- `PATCH /roadmaps/:roadmapId/progress/node` - canonical node transition

Transition payload:

```json
{
  "nodeId": "version-control-systems",
  "fromState": "pending",
  "toState": "inProgress"
}
```

Allowed transitions:

- `pending -> inProgress`
- `pending -> skip`
- `inProgress -> completed`

## Error Mapping

Controller responses use error envelope:

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Transition from 'completed' to 'inProgress' is not allowed."
  }
}
```

Common codes: `ROADMAP_NOT_FOUND`, `INVALID_PAYLOAD`, `INVALID_TRANSITION`, `CONFLICT`, `INTERNAL_SERVER_ERROR`.

## Notes

- Regeneration trigger is owned by Feature 009 endpoint: `POST /api/roadmaps/primary/regenerate`.
- Skill Tree polls/re-fetches to reflect updated roadmap data after regeneration.
