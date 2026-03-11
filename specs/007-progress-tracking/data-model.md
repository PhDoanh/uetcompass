# Data Model: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-003, R-005)

---

## Entity: RoadmapProgressCache

**MongoDB collection**: `roadmap_progress_cache`

**Purpose**: Pre-computed progress summary for one (student, roadmap) pair. This is the sole collection owned by the Progress Tracking feature. It is written exclusively by `progress.service.js#refreshCache` (called from the Skill Tree module after every node status change) and read by the Progress Dashboard endpoints. It is never written by the API handlers — the REST layer is read-only.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users`; part of compound unique key | FK to authenticated student |
| `roadmapId` | ObjectId | yes | — | ref: `roadmaps` (Skill Tree); part of compound unique key | FK to the student's roadmap |
| `totalNodes` | Number | yes | — | Integer ≥ 0 | Total course nodes on the roadmap path |
| `doneNodes` | Number | yes | — | Integer ≥ 0; ≤ `totalNodes` | Count of nodes in `done` status |
| `inProgressNodes` | Number | yes | — | Integer ≥ 0; ≤ `totalNodes` | Count of nodes in `in_progress` status |
| `pendingNodes` | Number | yes | — | Integer ≥ 0; derived: `totalNodes − doneNodes − inProgressNodes` | Count of nodes in `pending` status (locked + actionable) |
| `progressPercent` | Number | yes | — | Float [0, 100]; stored as `Math.round(doneNodes / totalNodes * 100)` or `0` when `totalNodes = 0` | Pre-computed to avoid division on every read |
| `lastActivityDate` | Date | yes | — | Set to `Date.now()` on every upsert | Timestamp of the most recent node status change on this roadmap |
| `createdAt` | Date | auto | `Date.now()` | Set once on first upsert (`$setOnInsert`) | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every upsert | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_roadmapId_unique` | `userId: 1, roadmapId: 1` | **Unique compound** | One cache document per (student, roadmap) pair; upsert filter key |
| `userId_idx` | `userId: 1` | Standard | Fast `find({ userId })` for the dashboard's overview query |

### Write path (via `progress.service.js#refreshCache`)

```text
Skill Tree updateNodeStatus()
    │
    │  await progressService.refreshCache(userId, roadmapId)
    ▼
RoadmapNode.aggregate([ $match{userId, roadmapId}, $group{totalNodes, doneNodes, inProgressNodes} ])
    │
    │  One round trip to Atlas — atomic snapshot
    ▼
RoadmapProgressCache.findOneAndUpdate(
  { userId, roadmapId },                          ← filter (hits compound unique index)
  { $set: { totalNodes, doneNodes, inProgressNodes, pendingNodes,
            progressPercent, lastActivityDate, updatedAt },
    $setOnInsert: { createdAt } },
  { upsert: true, new: true }
)
    │
    ▼
progressSse.notifyUser(userId, updatedSummary)     ← fire-and-forget SSE push
```

### `progressPercent` computation rule

```
progressPercent = totalNodes === 0
  ? 0
  : Math.round((doneNodes / totalNodes) * 100)
```

This is the same formula as the Skill Tree progress bar (SC-002 consistency guarantee). Stored pre-rounded to the nearest whole number.

---

## Referenced Entity: RoadmapNode (read-only, owned by Feature 004 — Skill Tree)

**MongoDB collection**: `roadmap_nodes` *(working name — Skill Tree's planner may rename)*

**Purpose**: Per-student node status records. The `$group` aggregation in `refreshCache` runs against this collection. Progress Tracking MUST NOT write to it.

### Minimum fields required by Progress Tracking

| Field | Type | Notes |
|---|---|---|
| `userId` | ObjectId | Part of compound index `{ userId, roadmapId }` |
| `roadmapId` | ObjectId | Part of compound index `{ userId, roadmapId }` |
| `nodeId` | ObjectId | ref: `course_units._id` |
| `nodeName` | String | Display name; returned by `getNodesByStatus()` for the detail view |
| `nodeCode` | String | Course code (e.g., `INT2215`); used as a stable key in the deep-link |
| `status` | String (enum) | `"pending"` \| `"in_progress"` \| `"done"` |

**Compound index required**: `{ userId: 1, roadmapId: 1 }` — must be present for the `$group` aggregation to stay within Atlas M0 scan limits.

> **Note to Skill Tree planner**: Progress Tracking depends on the above field names and index. If the actual schema differs, update the `$match` in `progress.service.js#_computeStats` accordingly and document the change in Skill Tree's `data-model.md`.

---

## Referenced Entity: User (read-only, owned by Feature 005 — Account Management)

**MongoDB collection**: `users`

**Purpose**: `userId` in the cache document references `users._id`. Progress Tracking reads `userId` from the JWT payload (via shared `auth.middleware.js`). No direct query on the `users` collection.

---

## Referenced Entity: Roadmap (read-only, owned by Feature 001 — Onboarding / Feature 004 — Skill Tree)

**MongoDB collection**: `roadmaps` *(to be confirmed by Skill Tree planner)*

**Purpose**: `roadmapId` and `roadmapName` are needed to populate the dashboard cards. Progress Tracking reads `roadmapId` and `roadmapName` from the Skill Tree module's `getNodesByStatus()` / `getAllRoadmaps(userId)` service function — it does NOT query the `roadmaps` collection directly.

---

## Data Flow Diagram

```text
Student updates node on Skill Tree
         │
         ▼
  skillTree.service.js#updateNodeStatus(userId, roadmapId, nodeId, newStatus)
         │   writes node status to roadmap_nodes
         │
         │   await progressService.refreshCache(userId, roadmapId)
         ▼
  progress.service.js#refreshCache
         │   reads roadmap_nodes → $group aggregation
         │   upserts roadmap_progress_cache
         │   fire-and-forget: progressSse.notifyUser(userId, summary)
         ▼
  Progress Dashboard (open tab)
         │   receives SSE event: progress:update
         │   merges updated RoadmapProgressSummary into React state
         ▼
  Card re-renders with new %, counts, lastActivityDate
  (no page reload required — SC-004 ✅)
```
