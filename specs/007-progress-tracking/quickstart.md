# Quickstart: Progress Tracking Dashboard

**Feature**: `007-progress-tracking`  
**Date**: 2026-03-11  
**Prerequisites**: Feature 005 (Account Management) must be running — the Progress module shares `auth.middleware.js` and reads from `users`. Feature 004 (Skill Tree) must be running — the Progress module calls `skillTreeService.getNodesByStatus()` and depends on `roadmap_nodes` being populated.

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| MongoDB Atlas URI | M0 free | env var `MONGODB_URI` |
| Features 001, 002, 004, 005 | running | roadmaps + nodes exist in DB |

---

## 2. Environment Variables

No new environment variables are introduced by this feature. It reuses the existing backend `.env`:

```env
# Already required by other features — no additions needed
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass
JWT_ACCESS_SECRET=<same secret used by auth.middleware.js>
PORT=4000
```

Frontend (`.env.local` — already present from Feature 005):

```env
VITE_API_URL=http://localhost:4000
```

---

## 3. Backend — Mount the Progress Module

### 3.1 Register the Mongoose model

In `backend/src/app.js`, require the new model so Mongoose registers the collection on startup:

```js
// Add alongside other model requires
require('./modules/progress/roadmapProgressCache.model');
```

### 3.2 Mount the progress router

```js
const progressRoutes = require('./modules/progress/progress.routes');
// Add alongside other route mounts
app.use('/api/progress', progressRoutes);
```

### 3.3 Wire the cache refresh call in Skill Tree

In `backend/src/modules/skill-tree/skillTree.service.js`, inject the progress service and add the refresh call:

```js
const progressService = require('../progress/progress.service');

async function updateNodeStatus(userId, roadmapId, nodeId, newStatus) {
  // ... existing node write ...

  try {
    await progressService.refreshCache(userId, roadmapId);
  } catch (err) {
    console.error('[progress] refreshCache failed:', err.message);
    // Soft-fail — node write already committed
  }
}
```

### 3.4 Start the backend

```bash
cd backend
npm install   # no new packages required
npm run dev   # or: node src/app.js
```

Expected output:
```
Server listening on port 4000
MongoDB connected to uetcompass
```

---

## 4. Frontend — Add the Progress Route

### 4.1 Register the `/progress` route

In `frontend/src/App.jsx` (or wherever React Router routes are declared):

```jsx
import ProgressDashboard from './features/progress/ProgressDashboard';

// Inside your <Routes> block:
<Route path="/progress" element={<AuthGuard><ProgressDashboard /></AuthGuard>} />
```

### 4.2 Add navigation link

In the main navigation component (e.g., `Navbar.jsx`):

```jsx
<Link to="/progress">Tiến độ học tập</Link>
```

### 4.3 Start the frontend

```bash
cd frontend
npm install   # no new packages required
npm run dev
```

Frontend available at `http://localhost:5173`.

---

## 5. Seed Test Data

To test the dashboard without a full Skill Tree UI, you can manually insert test documents:

```js
// Run once in a MongoDB shell or via a seed script
// 1. Use an existing userId from the users collection
const userId = ObjectId("...your-test-user-id...");
const roadmapId = ObjectId("...your-test-roadmap-id...");

// 2. Insert roadmap_nodes (Skill Tree's collection)
db.roadmap_nodes.insertMany([
  { userId, roadmapId, nodeId: ObjectId(), nodeCode: "INT2204", nodeName: "Nhập môn lập trình", status: "done" },
  { userId, roadmapId, nodeId: ObjectId(), nodeCode: "INT2215", nodeName: "Lập trình", status: "done" },
  { userId, roadmapId, nodeId: ObjectId(), nodeCode: "INT2210", nodeName: "CTDL & Giải thuật", status: "in_progress" },
  { userId, roadmapId, nodeId: ObjectId(), nodeCode: "INT3120", nodeName: "Lập trình Web", status: "pending" },
  { userId, roadmapId, nodeId: ObjectId(), nodeCode: "INT3121", nodeName: "Phát triển ứng dụng Web", status: "pending" },
]);

// 3. Manually trigger a cache refresh via the Node.js REPL or a one-off script:
// require('./backend/src/modules/progress/progress.service').refreshCache(userId, roadmapId)
```

Alternatively: update any node status through the Skill Tree UI — this triggers `refreshCache` automatically.

---

## 6. Manual Test Scenarios

### Scenario 1 — Overview loads all roadmaps (US-1, SC-001, SC-003)

1. Log in as a student enrolled in 2+ roadmaps.
2. Navigate to `http://localhost:5173/progress`.
3. ✅ All roadmaps appear as cards within 2 seconds.
4. ✅ Each card shows roadmap name, `%`, node counts (Done / In Progress / Pending), and last activity date.
5. ✅ A roadmap with 0 nodes done shows `0%` and "Not started" — no error.

### Scenario 2 — Drill-down detail view (US-2)

1. From the dashboard overview, click any roadmap card.
2. ✅ A detail view opens showing three groups: Done, In Progress, Pending.
3. ✅ Count the nodes in each group — matches the counts on the summary card.
4. ✅ Click back — all roadmap cards are still visible.
5. ✅ A group with 0 nodes shows an empty state message (not a blank section).

### Scenario 3 — Deep-link to Skill Tree node (US-3, FR-006)

1. Open the detail view for any roadmap.
2. Click a node name in any status group.
3. ✅ Browser navigates to `/skill-tree/<roadmapId>?focus=<nodeId>`.
4. ✅ The Skill Tree page loads with the target node visually highlighted or scrolled into view.
5. ✅ Press browser back → returns to the detail view for the same roadmap.

### Scenario 4 — Live dashboard update without reload (US-4, SC-004)

1. Open the Progress Dashboard in Tab A.
2. Open the Skill Tree for any roadmap in Tab B.
3. In Tab B, mark a node as Done.
4. Switch to Tab A without reloading.
5. ✅ The affected roadmap card updates its `%` and Done count within 5 seconds.
6. ✅ The `lastActivityDate` updates to today.

### Scenario 5 — Empty state (Edge case)

1. Log in as a student with no roadmaps assigned (new account, onboarding not completed).
2. Navigate to `/progress`.
3. ✅ Dashboard shows an empty state with a prompt to complete onboarding.
4. ✅ No error page, no empty white screen.

---

## 7. Running Tests

```bash
cd backend
npm test -- --testPathPattern="progress"
```

Expected test file: `tests/unit/progress/progress.service.test.js`

Key test cases covered:
- `refreshCache`: correct `progressPercent` for 0/N, some/N, N/N done nodes
- `refreshCache`: `progressPercent = 0` when `totalNodes = 0` (no division-by-zero)
- `getAll`: returns empty array when no cache documents exist for userId
- `getRoadmapDetail`: delegates to Skill Tree service, groups nodes by status
- `getRoadmapDetail`: returns empty arrays (not null) for status groups with 0 nodes

---

## 8. Phase 7 Validation Notes

- **SC-001 (<=2s on 4G, up to 10 roadmaps)**
  - Device/profile: _fill in during validation_
  - Network throttle profile: _fill in during validation_
  - Measured load time: _fill in during validation_
  - Result: PASS/FAIL

- **SC-002 (Progress percent parity with Skill Tree within ±1pp)**
  - Fixture user/roadmap: _fill in during validation_
  - Dashboard percent: _fill in during validation_
  - Skill Tree percent: _fill in during validation_
  - Delta: _fill in during validation_
  - Result: PASS/FAIL
