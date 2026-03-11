# API Contracts: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Research dependency**: [research.md](research.md) (R-002, R-004)  
**Base URL**: `/api/progress`  
**Auth**: All endpoints require a valid JWT Access Token in the `Authorization: Bearer <token>` header, verified by the shared `auth.middleware.js`. The SSE endpoint uses `?token=<JWT>` query param instead (see endpoint 3).

---

## Endpoint 1 — GET /api/progress/summaries

Returns the progress summary for all roadmaps the authenticated student is enrolled in. Data is served from `roadmap_progress_cache` — no aggregation at read time.

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

**Empty state** (student has no roadmaps yet):

```json
{
  "roadmaps": []
}
```

### Response fields

| Field | Type | Notes |
|---|---|---|
| `roadmapId` | String (ObjectId) | Identifies the roadmap — used to build deep-link URLs |
| `roadmapName` | String | Human-readable roadmap name |
| `totalNodes` | Number | Total course nodes on this roadmap path |
| `doneNodes` | Number | Nodes in `done` status |
| `inProgressNodes` | Number | Nodes in `in_progress` status |
| `pendingNodes` | Number | Nodes in `pending` status (locked + actionable) |
| `progressPercent` | Number | `Math.round(doneNodes / totalNodes * 100)`; `0` when `totalNodes === 0` |
| `lastActivityDate` | String (ISO 8601) | UTC timestamp of the most recent node status change on this roadmap |

### Error responses

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or expired access token |
| `500 Internal Server Error` | Unexpected DB failure |

---

## Endpoint 2 — GET /api/progress/summaries/:roadmapId/nodes

Returns every node on a specific roadmap, grouped by status. This enables the detail view (User Story 2). Data is served from the Skill Tree module via `skillTreeService.getNodesByStatus(userId, roadmapId)` — not from the cache.

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
      { "nodeId": "aaa111", "nodeCode": "INT2215", "nodeName": "Lập trình" },
      { "nodeId": "aaa112", "nodeCode": "INT2204", "nodeName": "Nhập môn lập trình" }
    ],
    "inProgress": [
      { "nodeId": "bbb222", "nodeCode": "INT2210", "nodeName": "Cấu trúc dữ liệu và Giải thuật" }
    ],
    "pending": [
      { "nodeId": "ccc333", "nodeCode": "INT3120", "nodeName": "Lập trình Web" },
      { "nodeId": "ccc334", "nodeCode": "INT3121", "nodeName": "Phát triển ứng dụng Web" }
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
| `nodes.*.nodeId` | String (ObjectId) | Used to build the Skill Tree deep-link URL |
| `nodes.*.nodeCode` | String | Course code, e.g. `INT2215` |
| `nodes.*.nodeName` | String | Course display name |

### Error responses

| Status | Condition |
|---|---|
| `401 Unauthorized` | Missing or expired access token |
| `403 Forbidden` | Authenticated student is not enrolled in this `roadmapId` |
| `404 Not Found` | `roadmapId` does not exist |
| `500 Internal Server Error` | Unexpected DB or service failure |

---

## Endpoint 3 — GET /api/progress/sse (Server-Sent Events)

Long-lived SSE connection. The server pushes a `progress:update` event each time the authenticated student's progress changes on any roadmap (triggered by Skill Tree node status writes). The client does not need to poll or reload the dashboard.

### Request

```http
GET /api/progress/sse?token=<accessToken>
Accept: text/event-stream
```

**Query parameter**:

| Param | Type | Notes |
|---|---|---|
| `token` | String | JWT Access Token. Required because `EventSource` does not support custom request headers. |

### Response headers (on successful connection)

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

### SSE event: `progress:update`

Fired after each successful cache refresh. Payload is the updated summary for the affected roadmap — identical shape to a single element of the `GET /api/progress/summaries` `roadmaps` array.

```
event: progress:update
data: {"roadmapId":"64f1a2b3c4d5e6f7a8b9c0d1","roadmapName":"Frontend Developer","totalNodes":24,"doneNodes":9,"inProgressNodes":2,"pendingNodes":13,"progressPercent":38,"lastActivityDate":"2026-03-11T10:05:00.000Z"}

```

### SSE event: `error` (auth failure)

Sent when the `token` query param is missing or invalid. The server then closes the connection. The frontend MUST call `es.close()` on receiving this event to prevent infinite EventSource retries.

```
event: error
data: {"code":"UNAUTHORIZED","message":"Invalid or expired token"}

```

### SSE heartbeat (comment line)

Sent every 15 seconds to prevent Render's idle-connection close (~30s). Does not fire a client-side event.

```
: heartbeat

```

### Frontend usage pattern

```js
// useProgressSSE.js
const es = new EventSource(`/api/progress/sse?token=${accessToken}`);

es.addEventListener('progress:update', (e) => {
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

- `:roadmapId` — the `roadmapId` from the current detail view.
- `focus=<nodeId>` — the `nodeId` of the tapped node.
- The Skill Tree page reads `useSearchParams()` and scrolls/highlights the node matching `focus`.
- This is a React Router client-side navigation — no backend endpoint. The Skill Tree feature is responsible for reading and honoring the `focus` param.
