# REST API Contract: Skill Tree

**Phase 1 output** | Branch: `003-skill-tree` | Date: 2026-03-10

Base URL: `/api/skill-tree`  
Auth: All endpoints require `Authorization: Bearer <JWT>` (middleware reused from Feature 001 — `auth.middleware.js`).

---

## Endpoint 1 — Get Student Skill Tree

### `GET /api/skill-tree/:studentId`

Returns the full career-path tree for the authenticated student, with server-computed unlock states, progress, and next-step recommendations. **Called by the polling hook every 2500ms.**

**Authorization**: The JWT `userId` MUST equal `:studentId`. A mismatch returns `403`.

#### Request

| Element | Value |
|---------|-------|
| Method | `GET` |
| Path params | `studentId` — MongoDB ObjectId string |
| Query params | *(none)* |
| Body | *(none)* |
| Headers | `Authorization: Bearer <token>` |

#### Response `200 OK`

```json
{
  "careerGoalId": "frontend-developer",
  "careerGoalNameVi": "Lập trình viên Frontend",
  "careerGoalNameEn": "Frontend Developer",
  "progress": {
    "done": 2,
    "total": 15,
    "percentage": 13
  },
  "nextSteps": ["IT3910E", "skill-html-css"],
  "nodes": [
    {
      "id": "IT1010",
      "nameVi": "Nhập môn lập trình",
      "nameEn": "Introduction to Programming",
      "type": "Course",
      "status": "Done",
      "isUnlocked": true,
      "prerequisites": [],
      "children": ["IT3910E", "skill-html-css"]
    },
    {
      "id": "IT3910E",
      "nameVi": "Lập trình Web",
      "nameEn": "Web Development",
      "type": "Course",
      "status": "Pending",
      "isUnlocked": true,
      "prerequisites": ["IT1010"],
      "children": ["skill-react"]
    },
    {
      "id": "skill-react",
      "nameVi": "React",
      "nameEn": "React",
      "type": "Skill",
      "status": "Pending",
      "isUnlocked": false,
      "prerequisites": ["IT3910E"],
      "children": []
    }
  ]
}
```

**Field notes**:
- `nextSteps` is an empty array `[]` when all nodes are `Done` (progress = 100%).
- `nodes` is the complete flat list for the career path; the React Flow canvas builds the edge list from `prerequisites` / `children`.
- `isUnlocked` is always `true` for nodes with `prerequisites: []`.
- `status` defaults to `"Pending"` for nodes with no document in `skill_node_statuses`.

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing or invalid JWT | `{ "error": "Unauthorized" }` |
| `403` | JWT `userId` ≠ `:studentId` | `{ "error": "Forbidden" }` |
| `404` | Student has no career goal set (onboarding incomplete) | `{ "error": "Career goal not configured for this student. Complete onboarding first." }` |
| `500` | Unexpected server error | `{ "error": "Internal server error" }` |

---

## Endpoint 2 — Update Node Status

### `PATCH /api/skill-tree/:studentId/nodes/:nodeId`

Updates the status of a single node for the authenticated student. The server validates that the node is currently unlocked before persisting; a locked-node update is rejected with `403`.

**Authorization**: JWT `userId` MUST equal `:studentId`. A mismatch returns `403`.

#### Request

| Element | Value |
|---------|-------|
| Method | `PATCH` |
| Path params | `studentId` — MongoDB ObjectId string |
| Path params | `nodeId` — node ID string (e.g., `"IT3910E"` or `"skill-react"`) |
| Headers | `Authorization: Bearer <token>`, `Content-Type: application/json` |
| Body | See below |

```json
{
  "status": "InProgress"
}
```

`status` must be one of: `"Pending"`, `"InProgress"`, `"Done"`.

#### Response `200 OK`

Returns the updated node DTO with recomputed unlock state:

```json
{
  "id": "IT3910E",
  "nameVi": "Lập trình Web",
  "nameEn": "Web Development",
  "type": "Course",
  "status": "InProgress",
  "isUnlocked": true,
  "prerequisites": ["IT1010"],
  "children": ["skill-react"]
}
```

**Implementation note**: The response DTO is the single updated node. The frontend merge this into its local `nodes` array (the optimistic update already applied the change; the 200 response serves as confirmation). The next poll cycle will return fresh full-tree state.

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `400` | `status` field missing from body | `{ "error": "status is required" }` |
| `401` | Missing or invalid JWT | `{ "error": "Unauthorized" }` |
| `403` | JWT `userId` ≠ `:studentId` | `{ "error": "Forbidden" }` |
| `403` | Node `isUnlocked === false` (has incomplete prerequisites) | `{ "error": "Cannot update a locked node. Complete all prerequisites first." }` |
| `404` | `nodeId` not found in student's career path | `{ "error": "Node not found in career path" }` |
| `422` | `status` value is not one of the three allowed strings | `{ "error": "Invalid status value. Must be one of: Pending, InProgress, Done" }` |
| `500` | Unexpected server error | `{ "error": "Internal server error" }` |

---

## Endpoint 3 — List Career Paths

### `GET /api/skill-tree/career-paths`

Returns the list of available career goals. Used by the Skill Tree page to populate the career-goal selector (and to confirm the student's chosen goal is still valid).

**Authorization**: JWT required (student must be authenticated; returns the pre-configured career path list regardless of student's personal choice).

#### Request

| Element | Value |
|---------|-------|
| Method | `GET` |
| Path params | *(none)* |
| Query params | *(none)* |
| Body | *(none)* |
| Headers | `Authorization: Bearer <token>` |

#### Response `200 OK`

```json
[
  {
    "id": "frontend-developer",
    "nameVi": "Lập trình viên Frontend",
    "nameEn": "Frontend Developer",
    "nodeCount": 15
  },
  {
    "id": "backend-developer",
    "nameVi": "Lập trình viên Backend",
    "nameEn": "Backend Developer",
    "nodeCount": 18
  }
]
```

**Note**: This list is static (loaded from JSON at startup). No DB query is made.

#### Error Responses

| Status | Condition | Body |
|--------|-----------|------|
| `401` | Missing or invalid JWT | `{ "error": "Unauthorized" }` |
| `500` | Career path files failed to load at startup | `{ "error": "Internal server error" }` |

---

## Polling behaviour contract (client-side)

The `useSkillTree` hook MUST implement the following behaviour:

| Condition | Behaviour |
|-----------|-----------|
| Tab is active (`!document.hidden`) | Poll `GET /api/skill-tree/:studentId` every **2500ms** |
| Tab becomes hidden (`visibilitychange` → `document.hidden === true`) | Clear interval immediately |
| Tab becomes visible again | Restart polling immediately (fire one request + re-establish interval) |
| PATCH in flight | Optimistic update applied immediately; poll continues on schedule |
| PATCH returns error | Roll back `nodes` to pre-PATCH snapshot; show error toast |
| 401 response on any request | Redirect to login; stop polling |

**Retry policy**: No automatic retry on network error. The next scheduled poll will pick up the latest state. This avoids request storms on flaky connections.
