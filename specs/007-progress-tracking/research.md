# Research: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Feeds into**: [plan.md](plan.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md)

---

## R-001: Cache Update Trigger — how does Skill Tree notify Progress of a node status change?

**Question**: In a monolith with no queue and no cross-module direct imports, how does the Skill Tree module cause the Progress cache to refresh after a node status write?

**Decision**: Sequential `await` via service-layer dependency injection. The Skill Tree service receives a `progressService` reference at bootstrap and calls `await progressService.refreshCache(userId, roadmapId)` directly after the node write commits. If `refreshCache` throws, Skill Tree soft-fails (logs the error, does not re-throw) — because the node write has already committed and returning HTTP 500 to the student would be misleading.

**Rationale**:
- Fire-and-forget (un-awaited Promise) gives no delivery guarantee on a busy event loop. The 5-second SSE update window (SC-004) requires the call to be awaited.
- The call is pure in-process — no network hop, no queue latency. End-to-end latency from node write commit → cache upsert → SSE push is estimated at 50–200ms on MongoDB Atlas M0 free tier.
- Soft-fail is correct because the `roadmap_progress_cache` document is derived data. Stale cache is a degraded-but-safe state; a spurious 500 to the student is a worse failure mode.

**Alternatives considered**:
- MongoDB Change Streams: Not available on Atlas M0 free tier. Rejected.
- Polling from the frontend: Would cause O(students × roadmaps) read pressure on Atlas every N seconds across all open sessions. Rejected.
- BullMQ / Redis queue: Violates the constitution (no Redis) and constitution (no premature infrastructure). Rejected.

---

## R-002: SSE Architecture — dedicated module or reuse existing notification channel?

**Question**: Should Progress Tracking push `progress:update` events through the existing `notification.sse.js` channel (Feature 005) or create a dedicated `progress.sse.js`?

**Decision**: Create a dedicated `progress.sse.js` module following exactly the same Map-based pattern used by `onboarding.sse.js` and `notification.sse.js`.

**Rationale**:
- The Progress payload is a **full aggregated summary object** (7 fields per roadmap) while the notifications channel carries lightweight notification pointers (`type`, `message`, `link`). Mixing payload shapes in one channel introduces coupling and makes the notification stream hard to reason about for future consumers.
- A separate SSE endpoint (`GET /api/progress/sse`) lets the Skill Tree service call `progressSse.notifyUser(userId, summary)` as a fire-and-forget — no dependency on the notifications module, no cross-module coupling introduced.
- Consistent with established pattern: each feature owns its SSE store. No new patterns required.

**Connection survival**: 15-second heartbeat comment line (`: heartbeat\n\n`) matches all other SSE modules. Beats Render's ~30-second idle connection close.

**Auth on SSE endpoint**: Token passed as `?token=<JWT>` query param — EventSource cannot send custom headers. Auth errors are returned as `event: error` SSE frames (not HTTP 401) so the browser's EventSource does not enter an infinite reconnect loop.

**Alternatives considered**:
- WebSocket: Rejected — constitution already established SSE as the real-time primitive; no WebSocket infrastructure exists.
- Long polling: More complex, higher Atlas load. Rejected.
- Reuse `notification.sse.js`: Would require Progress module to depend on Notifications module. Rejected on cross-module coupling grounds.

---

## R-003: Cache Computation — aggregation pipeline vs. multiple `countDocuments` calls?

**Question**: When `refreshCache(userId, roadmapId)` runs, should it compute `totalNodes`, `doneNodes`, `inProgressNodes` via one `$group` aggregation or three separate `countDocuments` calls?

**Decision**: Single `$group` aggregation pipeline with conditional `$sum` operators.

```js
const [result] = await RoadmapNode.aggregate([
  { $match: { userId, roadmapId } },
  {
    $group: {
      _id: null,
      totalNodes:       { $sum: 1 },
      doneNodes:        { $sum: { $cond: [{ $eq: ['$status', 'done'] },        1, 0] } },
      inProgressNodes:  { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
    }
  }
]);
```

**Rationale**:
- Three `countDocuments` calls = 3 round trips to Atlas M0. Each trip adds 20–60ms; total 60–180ms. Worse, the three counts are not from the same logical snapshot — a concurrent write between call 2 and call 3 produces a corrupted cache document.
- A single aggregation is one atomic read, one round trip, consistent counts. On Atlas M0, this runs in 5–20ms for the expected data volume (tens to low hundreds of nodes per student per roadmap).

**Alternatives considered**:
- `countDocuments` × 3: Simpler to read but not atomic, more round trips. Rejected.
- Pre-counting with embedded counters in a `roadmaps` document: Requires counter synchronization logic everywhere Skill Tree updates a node. More complexity for no benefit. Rejected.

---

## R-004: Frontend Deep-Link — URL pattern to navigate Skill Tree to a specific node

**Question**: When a student taps a node in the Progress Dashboard's detail view, how does the app navigate to the Skill Tree and focus on that specific node?

**Decision**: `GET /skill-tree/:roadmapId?focus=<nodeId>` — React Router URL with a `focus` query parameter. The Skill Tree page reads `useSearchParams()` and scrolls/highlights the node matching `focus`.

**Rationale**:
- Pure client-side navigation — no backend involvement. React Router `<Link>` or `navigate()` builds the URL; `useSearchParams` reads it. Consistent with how React Router v6 is already used in the project.
- The `focus` query param survives the browser back button: when the student navigates back from Skill Tree to the dashboard, the URL stack remains intact and the previously open detail view is restored (handled by the dashboard's own state/URL shape).
- Node ID in query param (not path segment) because the highlighted node is optional context, not the primary resource identifier. The Skill Tree page is fully functional without it.

**Alternatives considered**:
- Route state via `navigate('/skill-tree/...', { state: { focusNodeId } })`: Works but state is lost on page refresh. Rejected — the deep-link should be shareable and refresh-safe.
- Anchor (`#nodeId`): Requires the DOM element ID to match the MongoDB ObjectId, coupling the DOM to the data layer. Rejected.

---

## R-005: Skill Tree Node Storage Schema — what does `refreshCache` read from?

**Question**: Feature 004 (Skill Tree) has not been planned yet. What shape of data does `refreshCache` need from the Skill Tree module, and how should this dependency be declared?

**Decision**: Progress Tracking declares a **forward-compatible interface contract** with the Skill Tree module. The contract is:

1. The Skill Tree module MUST maintain a MongoDB collection (working name: `roadmap_nodes`) with at minimum the following fields per document: `userId` (ObjectId), `roadmapId` (ObjectId), `status` (String enum: `"pending"` | `"in_progress"` | `"done"`). A compound index on `{ userId: 1, roadmapId: 1 }` MUST exist for aggregation performance.
2. The Skill Tree module MUST expose a service function `getNodesByStatus(userId, roadmapId)` that returns `{ done: [...], inProgress: [...], pending: [...] }` — each entry with `nodeId`, `nodeCode`, `nodeName` fields. The Progress module calls this for the `/nodes` detail endpoint.
3. The Skill Tree module MUST call `progressService.refreshCache(userId, roadmapId)` from its `updateNodeStatus` service function, after the node write commits.

**Rationale**: Documenting the contract here locks in the interface before Skill Tree planning begins, preventing a design mismatch. Skill Tree's plan can accommodate this contract as an explicit integration requirement.

**Note for Skill Tree planner**: The `roadmap_nodes` collection name is a working assumption. Skill Tree may use a different name or embed nodes inside a `roadmaps` document — what matters is that `progressService.refreshCache` can run the `$group` aggregation against whichever collection Skill Tree uses, and that `getNodesByStatus(userId, roadmapId)` is exposed as a service function.
