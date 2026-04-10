# Skill Tree Module

## Overview

The Skill Tree module provides the core API and business logic for the **Personalized Academic Roadmap Tracker** feature. This module:

1. Fetches canonical roadmap topology from Feature 009 (primary roadmap)
2. Maintains explicit node status records (`skill_node_statuses`)
3. Evaluates node unlock states via DAG traversal
4. Handles state transitions with validation guards
5. Caches Gemini-generated "Why This Course" explanations
6. Provides market skill mappings and learning resource aggregations

## Project Structure

```
backend/src/modules/skill-tree/
├── skillNodeStatus.model.js      # Mongoose schema for student progress
├── aiContext.model.js             # Mongoose schema for AI content cache
├── skillTree.service.js           # Core business logic (DAG, pending, transitions)
├── skillTree.controller.js        # Express request handlers
├── skillTree.routes.js            # Express router with auth middleware
├── skillTree.validation.js        # Input validation utilities
├── primaryRoadmap.service.js      # Feature 009 adapter (read-only roadmap)
├── courseResource.service.js      # Course materials read service
├── marketSkill.service.js         # Market skills + learning resources
├── aiContext.service.js           # Gemini integration for explanations
└── index.js                       # Module exports
```

## API Endpoints

All endpoints require `Authorization: Bearer <JWT>` header.

### `GET /api/skill-tree`

Fetch the personalized skill tree for the authenticated student.

**Response (200 OK)**:
```json
{
  "roadmapId": "rm_frontend_2026_v1",
  "roadmapName": "Frontend Developer Roadmap",
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
    }
  ]
}
```

### `PATCH /api/skill-tree/nodes/:courseCode/status`

Transition a course node to the next state.

**Request**:
```json
{
  "status": "in_progress"
}
```

**Response (200 OK)**:
```json
{
  "status": "in_progress",
  "updatedAt": "2026-03-23T10:15:00Z"
}
```

### Other Endpoints

- `GET /api/skill-tree/nodes/:courseCode/resources` — Grouped course materials
- `GET /api/skill-tree/nodes/:courseCode/why` — AI-generated explanation
- `GET /api/skill-tree/nodes/:courseCode/market-skills` — Ranked skills from job data
- `GET /api/skill-tree/skills/:skillName/learning-resources` — Free/paid learning resources

**Note**: Repersonalization is handled by Feature 005 (Account Management) which calls Feature 009 endpoint directly: `POST /api/roadmaps/primary/regenerate`. Skill Tree fetches the updated roadmap via `GET /api/skill-tree` after Feature 009 completes generation.

## Data Models

### `skill_node_statuses` Collection

Stores explicit progress for each (student, course) pair.

```javascript
{
  _id: ObjectId,
  studentId: ObjectId,      // Reference to users
  courseCode: String,       // Course code identifier (e.g., "IT1010")
  status: String,           // "pending" | "in_progress" | "done"
  updatedAt: Date           // Manual update only, set by service
}
```

**Indexes**:
- `{ studentId: 1, courseCode: 1 }` — Compound unique index

### `course_ai_contexts` Collection

Caches Gemini-generated explanations by `{ courseCode, careerGoal }` key.

```javascript
{
  _id: ObjectId,
  courseCode: String,       // e.g., "IT3910E"
  careerGoal: String,       // e.g., "frontend-developer"
  content: String,          // AI-generated text (validated: length >= 50 chars)
  generatedAt: Date
}
```

**Indexes**:
- `{ courseCode: 1, careerGoal: 1 }` — Compound unique index

## Running Tests

```bash
# Run all skill-tree unit tests
npm test -- --testPathPattern=skill-tree

# Run specific test file
npm test -- backend/tests/unit/skill-tree/dagTraversal.test.js

# Run with coverage
npm test -- --coverage backend/tests/unit/skill-tree
```

## Environment Variables

Configure in `backend/.env`:

```env
# Gemini SDK for "Why This Course" generation
GEMINI_API_KEY=<your-api-key>

# MongoDB
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/uetcompass
```

## State Machine

```
[locked ← has unfinished prerequisites]
    ↓
[pending] → [in_progress] → [done]
    ↑           ↑             ↑
    └───────────┴─────────────┘
       Only forward transitions allowed
```

## Design Decisions

1. **Explicit Pending**: Every roadmap node must have an explicit `skill_node_statuses` record. Missing records are upserted as `pending` during each read.

2. **Server-Side Unlock Evaluation**: The DAG traversal that determines `isUnlocked` is computed server-side, preventing client tampering with lock states.

3. **Gemini Caching**: "Why This Course" content is cached in `course_ai_contexts` with a compound key `{ courseCode, careerGoal }` to share results across students with the same career goal.

4. **No Redis**: Gemini responses are persisted in MongoDB; no TTL is set (cache invalidation is managed by Feature 009 when roadmaps are regenerated).

5. **Polling for Repersonalization**: Feature 004 detects roadmap regeneration completion via 2500ms polling (paused when browser tab is hidden), delegating the actual regeneration to Feature 009.

## Contributing

- Follow the modular structure: models, services, controller, routes in separate files.
- All business logic lives in service files; controllers are thin request handlers.
- Mutable operations (status updates) include guard checks in the service layer.
- Tests are required for DAG logic, state guards, and AI validation (see `backend/tests/unit/skill-tree/`).
