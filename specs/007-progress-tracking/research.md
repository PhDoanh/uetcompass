# Research: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Updated**: 2026-03-14  
**Feeds into**: [plan.md](plan.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md)

---

## R-001: Cache Update Trigger — how does Skill Tree notify Progress of a node status change?

**Question**: In a monolith with no queue and no cross-module direct imports, how does the Skill Tree module cause the Progress cache to refresh after a node status write?

**Decision**: Sequential `await` via service-layer dependency injection. Skill Tree calls `await progressService.refreshCache(userId, roadmapId)` right after status write commit. If `refreshCache` throws, Skill Tree **soft-fails** (log only, do not re-throw) and Progress module schedules asynchronous retry for eventual consistency.

**Rationale**:
- Fire-and-forget (un-awaited Promise) gives no delivery guarantee on a busy event loop. The 5-second SSE update window (SC-004) requires the call to be awaited.
- The call is pure in-process — no network hop, no queue latency. End-to-end latency from node write commit → cache upsert → SSE push is estimated at 50–200ms on MongoDB Atlas M0 free tier.
- Soft-fail is correct because `roadmap_progress_cache` is derived data. Stale cache is degraded-but-safe; a spurious 500 to the student is worse.
- Eventual consistency retry (in-process retry queue with bounded backoff) repairs transient Mongo failures without queue infrastructure.

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

**Question**: With Feature 004 now canonical for node status (`skill_node_statuses` + `getNodesByStatus`), should Progress compute counts by querying Mongo directly or by consuming the 004 grouped contract?

**Decision**: Consume `skillTreeService.getNodesByStatus(userId, roadmapId)` and compute summary counts in-process from returned arrays.

```js
const detail = await skillTreeService.getNodesByStatus(userId, roadmapId);

const doneNodes = detail.done.length;
const inProgressNodes = detail.inProgress.length;
const pendingNodes = detail.pending.length;
const totalNodes = doneNodes + inProgressNodes + pendingNodes;
```

**Rationale**:
- Removes schema coupling from Progress to internal 004 persistence details.
- Reuses already-standardized 004 status grouping payload used by detail endpoint.
- Keeps ownership boundaries strict: 004 owns status semantics; 007 owns aggregate cache.

**Alternatives considered**:
- Direct query on `skill_node_statuses` from Progress: tighter coupling and duplicated grouping logic. Rejected.
- Embedded counters in `roadmaps`: introduces write-time coupling into 009 canonical owner. Rejected.

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

**Question**: What exact 004 contract does Progress depend on after introducing canonical roadmap ownership in 009?

**Decision**: Progress Tracking depends on two canonical contracts:

1. **Feature 004 contract**: `getNodesByStatus(userId, roadmapId)` returns `{ roadmapId, roadmapName, done[], inProgress[], pending[] }` with node entries `{ nodeId, courseCode, courseName, status, updatedAt }`, backed by `skill_node_statuses`.
2. **Feature 009 contract**: roadmap ownership and stable identity come from 009 `roadmaps._id`; Progress treats this as authoritative `roadmapId`.
3. **Trigger contract**: Skill Tree calls `progressService.refreshCache(userId, roadmapId)` after node-status commit.

**Rationale**: This preserves canonical ownership boundaries: 009 owns roadmap lifecycle/identity, 004 owns node status state machine, 007 owns derived aggregation and dashboard read model.

---

## R-006: Multi-roadmap source of truth — enrolled roadmaps vs owned roadmaps

**Question**: Should dashboard scope use legacy onboarding enrollment mapping or canonical roadmap ownership from Feature 009?

**Decision**: Use Feature 009 canonical ownership only. Dashboard list is all owned roadmap documents in dashboard scope (typically `status=completed`).

**Rationale**:
- 009 is explicit canonical owner of roadmap lifecycle and identity.
- Ownership semantics remain correct even with roadmap history/variants and primary switching.
- Avoids cross-feature drift where enrollment view differs from actual roadmap documents.

**Alternatives considered**:
- Onboarding-based enrollment list: legacy assumption, not canonical after 009. Rejected.
- Skill Tree primary-only scope: fails multi-roadmap requirement. Rejected.
