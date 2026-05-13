# API Contracts: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Updated**: 2026-03-30  
**Research dependency**: [research.md](research.md) (R-002, R-004, R-008)  
**Base URL**: `/api/progress`  
**Auth**: All non-SSE endpoints require a valid JWT Access Token in the `Authorization: Bearer <token>` header, verified by the shared `auth.middleware.js`. SSE uses short-lived query token `?sseToken=<token>` (see endpoint 3).

---

## Common Conventions

### Error envelope (all non-2xx responses)

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

`details` is optional and included only when additional machine-readable context is useful.

### Error code taxonomy

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_INPUT` | Request input (query/path/body) failed validation |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired auth token |
| 403 | `FORBIDDEN` | Authenticated student is not allowed to access requested roadmap |
| 404 | `ROADMAP_NOT_FOUND` | Requested roadmap does not exist |
| 500 | `INTERNAL_ERROR` | Unexpected server/service/cache failure |

SSE auth failures use `UNAUTHORIZED` with the same envelope fields in SSE `event: error` payload.

### SSE naming convention

SSE event names use namespaced format `<domain>:<action>`.

---

## Endpoint 1 — GET /api/progress/summaries

Returns the progress summary for all roadmap documents owned by the authenticated student (canonical ownership from Feature 009). Data is served from `roadmap_progress_cache` — no aggregation at read time.

### Request

```http
GET /api/progress/summaries
Authorization: Bearer <accessToken>
```

No query parameters. No request body.

### Response `200 OK`

```json
{
  "roadmaps": [
    {
      "roadmapId": "64f1a2b3c4d5e6f7a8b9c0d1",
      "roadmapName": "Frontend Developer",
      "isPrimary": true,
      "totalNodes": 24,
      "doneNodes": 8,
      "inProgressNodes": 2,
      "pendingNodes": 14,
      "progressPercent": 33,
      "lastActivityDate": "2026-03-10T14:22:00.000Z"
    },
    {
      "roadmapId": "74f1a2b3c4d5e6f7a8b9c0d2",
      "roadmapName": "Backend Developer",
      "isPrimary": false,
      "totalNodes": 30,
      "doneNodes": 0,
      "inProgressNodes": 0,
      "pendingNodes": 30,
      "progressPercent": 0,
      "lastActivityDate": "2026-03-05T09:00:00.000Z"
    }
  ]
}
```

**Empty state** (student owns no roadmap yet):

```json
{
  "roadmaps": []
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `roadmapId` | String (ObjectId) | Stable roadmap identifier from Feature 009 (`roadmaps._id`) |
| `roadmapName` | String | Human-readable roadmap name |
| `isPrimary` | Boolean | Snapshot from canonical roadmap ownership; useful for ordering/badges |
| `totalNodes` | Number | Total course nodes on this roadmap path |
| `doneNodes` | Number | Nodes in `done` status |
| `inProgressNodes` | Number | Nodes in `in_progress` status |
| `pendingNodes` | Number | Nodes in `pending` status (locked + actionable) |
| `progressPercent` | Number | `Math.round(doneNodes / totalNodes * 100)`; `0` when `totalNodes === 0` |
| `lastActivityDate` | String (ISO 8601) | UTC timestamp of the most recent node status change on this roadmap |

### Error responses

| Status | `code` | Condition |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired access token |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected DB failure |

---

## Endpoint 2 — GET /api/progress/summaries/:roadmapId/nodes

Returns every node on a specific roadmap, grouped by status. This enables the detail view (User Story 2). Data is served from Feature 004 canonical contract `skillTreeService.getNodesByStatus(userId, roadmapId)` — not from the cache.

### Request

```http
GET /api/progress/summaries/:roadmapId/nodes
Authorization: Bearer <accessToken>
```

**Path parameter**:

| Param | Type | Notes |
|---|---|---|
| `roadmapId` | String (ObjectId) | The roadmap to drill into |

### Response `200 OK`

```json
{
  "roadmapId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "roadmapName": "Frontend Developer",
  "nodes": {
    "done": [
      { "nodeId": "aaa111", "courseCode": "INT2215", "courseName": "Lập trình", "status": "done", "updatedAt": "2026-03-10T14:22:00.000Z" },
      { "nodeId": "aaa112", "courseCode": "INT2204", "courseName": "Nhập môn lập trình", "status": "done", "updatedAt": "2026-03-09T09:00:00.000Z" }
    ],
    "inProgress": [
      { "nodeId": "bbb222", "courseCode": "INT2210", "courseName": "Cấu trúc dữ liệu và Giải thuật", "status": "in_progress", "updatedAt": "2026-03-11T10:05:00.000Z" }
    ],
    "pending": [
      { "nodeId": "ccc333", "courseCode": "INT3120", "courseName": "Lập trình Web", "status": "pending", "updatedAt": "2026-03-05T09:00:00.000Z" },
      { "nodeId": "ccc334", "courseCode": "INT3121", "courseName": "Phát triển ứng dụng Web", "status": "pending", "updatedAt": "2026-03-05T09:00:00.000Z" }
    ]
  }
}
```

**Empty group** (no nodes in a given status):

```json
{
  "nodes": {
    "done": [],
    "inProgress": [],
    "pending": [...]
  }
}
```

All three keys (`done`, `inProgress`, `pending`) are always present — never omitted — so the frontend can render an empty state per group without null-checking.

### Response fields

| Field | Type | Notes |
|---|---|---|
| `roadmapId` | String (ObjectId) | Echoed from the path param |
| `roadmapName` | String | Roadmap display name |
| `nodes.done` | Array | Nodes in `done` status |
| `nodes.inProgress` | Array | Nodes in `in_progress` status |
| `nodes.pending` | Array | Nodes in `pending` status (locked + actionable, not distinguished here — locked state is a Skill Tree concern) |
| `nodes.*.nodeId` | String | Used to build the Skill Tree deep-link URL |
| `nodes.*.courseCode` | String | Course code, e.g. `INT2215` |
| `nodes.*.courseName` | String | Course display name |
| `nodes.*.status` | String | `done` / `in_progress` / `pending` |
| `nodes.*.updatedAt` | String (ISO 8601) | Last status update timestamp |

### Error responses

| Status | `code` | Condition |
|---|---|---|
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired access token |
| `403 Forbidden` | `FORBIDDEN` | Authenticated student does not own this `roadmapId` |
| `404 Not Found` | `ROADMAP_NOT_FOUND` | `roadmapId` does not exist |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected DB or service failure |

---

## Endpoint 3 — GET /api/progress/sse (Server-Sent Events)

Long-lived SSE connection. The server pushes a `progress:updated` event each time the authenticated student's progress changes on any roadmap (triggered by Skill Tree node status writes). The client does not need to poll or reload the dashboard.

### Request

```http
GET /api/progress/sse?sseToken=<short-lived-sse-token>
Accept: text/event-stream
```

**Query parameter**:

| Param | Type | Notes |
|---|---|---|
| `sseToken` | String | Short-lived, purpose-bound SSE token minted from authenticated context. Required because `EventSource` does not support custom request headers reliably. |

### Response headers (on successful connection)

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### SSE event: `progress:updated`

Fired after each successful cache refresh. Payload is the updated summary for the affected roadmap — identical shape to a single element of the `GET /api/progress/summaries` `roadmaps` array.

```
event: progress:updated
data: {"roadmapId":"64f1a2b3c4d5e6f7a8b9c0d1","roadmapName":"Frontend Developer","isPrimary":true,"totalNodes":24,"doneNodes":9,"inProgressNodes":2,"pendingNodes":13,"progressPercent":38,"lastActivityDate":"2026-03-11T10:05:00.000Z"}

```

### SSE event: `error` (auth failure)

Sent when the `sseToken` query param is missing, invalid, or expired. The server then closes the connection. The frontend MUST call `es.close()` on receiving this event to prevent infinite EventSource retries.

```
event: error
data: {"code":"UNAUTHORIZED","message":"Invalid or missing sseToken"}

```

### SSE heartbeat (comment line)

Sent every 15 seconds to prevent Render's idle-connection close (~30s). Does not fire a client-side event.

```
: heartbeat

```

### Frontend usage pattern

```js
// useProgressSSE.js
const es = new EventSource(`/api/progress/sse?sseToken=${sseToken}`);

es.addEventListener('progress:updated', (e) => {
  const summary = JSON.parse(e.data);
  // Merge into dashboard state: update the card matching summary.roadmapId
});

es.addEventListener('error', (e) => {
  if (e.data) {
    const { code } = JSON.parse(e.data);
    if (code === 'UNAUTHORIZED') es.close(); // auth error — do not retry
  }
  // Network-level errors: EventSource retries automatically — no action needed
});
```

### Deep-link URL convention (client-side, no backend endpoint)

When a student taps a node in the detail view, the frontend navigates to:

```
/skill-tree/:roadmapId?focus=<nodeId>
```

- `:roadmapId` — stable roadmap `_id` from Feature 009.
- `focus=<nodeId>` — the `nodeId` of the tapped node.
- The Skill Tree page reads `useSearchParams()` and scrolls/highlights the node matching `focus`.
- This is a React Router client-side navigation — no backend endpoint. The Skill Tree feature is responsible for reading and honoring the `focus` param.

### Consistency policy note

`refreshCache` failures are treated as soft-fail events because cache is derived data. Skill Tree user action is not failed; cache repair is retried asynchronously (eventual consistency). During repair window, `GET /api/progress/summaries` may return briefly stale values.

---

## Endpoint 4 — GET /api/progress/tracking

Returns tracking tables for learning frequency and completion rate, grouped weekly or monthly. Supports both all-roadmaps scope and a single roadmap scope.

### Request

```http
GET /api/progress/tracking?scope=all&groupBy=weekly
Authorization: Bearer <accessToken>
```

```http
GET /api/progress/tracking?scope=roadmap&roadmapId=64f1a2b3c4d5e6f7a8b9c0d1&groupBy=monthly
Authorization: Bearer <accessToken>
```

**Query parameters**:

| Param | Type | Notes |
|---|---|---|
| `scope` | String | `all` or `roadmap` |
| `roadmapId` | String | Required when `scope=roadmap` |
| `groupBy` | String | `weekly` or `monthly` |

### Response `200 OK`

```json
{
  "scope": "roadmap",
  "roadmapId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "groupBy": "weekly",
  "summary": {
    "totalNodes": 24,
    "completedNodes": 9,
    "completionRate": 0.375
  },
  "buckets": [
    {
      "periodStart": "2026-03-01",
      "periodEnd": "2026-03-07",
      "activeDays": 2,
      "completedNodes": 1,
      "completionRate": 0.0417
    },
    {
      "periodStart": "2026-03-08",
      "periodEnd": "2026-03-14",
      "activeDays": 3,
      "completedNodes": 2,
      "completionRate": 0.0833
    }
  ]
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `scope` | String | Echoed from request (`all` or `roadmap`) |
| `roadmapId` | String | Present when scope is `roadmap` |
| `groupBy` | String | Echoed from request (`weekly` or `monthly`) |
| `summary.totalNodes` | Number | Total nodes in the scope |
| `summary.completedNodes` | Number | Count of nodes with `lastDoneAt` in the scope |
| `summary.completionRate` | Number | `completedNodes / totalNodes` (0 when `totalNodes=0`) |
| `buckets[].periodStart` | String | ISO date (YYYY-MM-DD) in UTC |
| `buckets[].periodEnd` | String | ISO date (YYYY-MM-DD) in UTC |
| `buckets[].activeDays` | Number | Distinct days with any activity window overlap |
| `buckets[].completedNodes` | Number | Nodes with `lastDoneAt` within the bucket |
| `buckets[].completionRate` | Number | `completedNodes / totalNodes` for the bucket |

### Error responses

| Status | `code` | Condition |
|---|---|---|
| `400 Bad Request` | `INVALID_INPUT` | Missing/invalid `scope`, `groupBy`, or `roadmapId` |
| `401 Unauthorized` | `UNAUTHORIZED` | Missing or expired access token |
| `403 Forbidden` | `FORBIDDEN` | Authenticated student does not own this `roadmapId` |
| `500 Internal Server Error` | `INTERNAL_ERROR` | Unexpected DB or service failure |
