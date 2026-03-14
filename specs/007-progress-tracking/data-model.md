# Data Model: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Updated**: 2026-03-14  
**Research dependency**: [research.md](research.md) (R-003, R-005)

---

## Entity: RoadmapProgressCache

**MongoDB collection**: `roadmap_progress_cache`

**Purpose**: Pre-computed progress summary for one `(student, roadmap)` pair. This is the sole collection owned by Progress Tracking. It is written exclusively by `progress.service.js#refreshCache` (triggered by Skill Tree after node-status writes) and read by dashboard endpoints. It is never written by REST handlers.

**Cardinality (multi-roadmap)**: For each `userId`, cardinality is `0..N` cache docs where `N` equals count of owned roadmap documents returned by Feature 009 in dashboard scope. Exactly one cache document exists per unique `(userId, roadmapId)`.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | ref: `users`; part of compound unique key | FK to authenticated student |
| `roadmapId` | ObjectId | yes | — | ref: `roadmaps` (Feature 009); part of compound unique key | Stable roadmap key from 009 canonical owner |
| `roadmapName` | String | yes | — | Non-empty | Display name snapshot for dashboard cards |
| `isPrimary` | Boolean | yes | `false` | Non-unique | Snapshot hint from 009 for frontend sort/display |
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
| `userId_updatedAt_idx` | `userId: 1, updatedAt: -1` | Standard compound | Fast dashboard listing by user + recency sort |
| `userId_isPrimary_updatedAt_idx` | `userId: 1, isPrimary: -1, updatedAt: -1` | Standard compound | Optional sort path: primary first, then recent |

### Write path (via `progress.service.js#refreshCache`)

```text
Skill Tree updateNodeStatus()
    │
    │  await progressService.refreshCache(userId, roadmapId)
    ▼
skillTreeService.getNodesByStatus(userId, roadmapId)
       │   returns { roadmapId, roadmapName, done[], inProgress[], pending[] }
       │   backed by Feature 004 `skill_node_statuses`
    │
       │  In-process computation from canonical grouped payload
    ▼
RoadmapProgressCache.findOneAndUpdate(
  { userId, roadmapId },                          ← filter (hits compound unique index)
       { $set: { roadmapName, isPrimary,
                                          totalNodes, doneNodes, inProgressNodes, pendingNodes,
            progressPercent, lastActivityDate, updatedAt },
    $setOnInsert: { createdAt } },
  { upsert: true, new: true }
)
    │
    ▼
progressSse.notifyUser(userId, updatedSummary)     ← fire-and-forget SSE push

On refresh error: log + schedule retry (eventual consistency), do not fail already-committed Skill Tree action.
```

### `progressPercent` computation rule

```
progressPercent = totalNodes === 0
  ? 0
  : Math.round((doneNodes / totalNodes) * 100)
```

This is the same formula as the Skill Tree progress bar (SC-002 consistency guarantee). Stored pre-rounded to the nearest whole number.

---

## Referenced Entity: SkillNodeStatus (read-only, owned by Feature 004 — Skill Tree)

**MongoDB collection**: `skill_node_statuses`

**Purpose**: Canonical node status store (`pending` | `in_progress` | `done`) for Skill Tree. Progress Tracking MUST NOT read this collection directly in normal flow; it consumes Feature 004 service contract `getNodesByStatus(userId, roadmapId)`.

### Contract fields required by Progress Tracking

| Field | Type | Notes |
|---|---|---|
| `nodeId` | String | Stable node identifier in roadmap payload |
| `courseCode` | String | Course code (e.g., `INT2215`) |
| `courseName` | String | Display name for detail view |
| `status` | String (enum) | `"pending"` \| `"in_progress"` \| `"done"` |
| `updatedAt` | Date | Last status mutation timestamp |

`getNodesByStatus(userId, roadmapId)` MUST always return all three arrays (`done`, `inProgress`, `pending`) even when empty.

---

## Referenced Entity: User (read-only, owned by Feature 005 — Account Management)

**MongoDB collection**: `users`

**Purpose**: `userId` in the cache document references `users._id`. Progress Tracking reads `userId` from the JWT payload (via shared `auth.middleware.js`). No direct query on the `users` collection.

---

## Referenced Entity: Roadmap (read-only, owned by Feature 009 — Roadmap Generator)

**MongoDB collection**: `roadmaps`

**Purpose**: Canonical ownership + identity source. Progress Tracking uses 009 service/API contract to resolve which roadmaps the student owns and uses `_id` as stable `roadmapId`.

---

## Data Flow Diagram

```text
Student updates node on Skill Tree
         │
         ▼
  skillTree.service.js#updateNodeStatus(userId, roadmapId, nodeId, newStatus)
         │   writes node status to skill_node_statuses
         │
         │   await progressService.refreshCache(userId, roadmapId)
         ▼
  progress.service.js#refreshCache
         │   calls skillTreeService.getNodesByStatus(userId, roadmapId)
         │   computes counts in-process
         │   upserts roadmap_progress_cache
         │   fire-and-forget: progressSse.notifyUser(userId, summary)
         │   on error: soft-fail + eventual-consistency retry
         ▼
  Progress Dashboard (open tab)
         │   receives SSE event: progress:update
         │   merges updated RoadmapProgressSummary into React state
         ▼
  Card re-renders with new %, counts, lastActivityDate
  (no page reload required — SC-004 ✅)
```
