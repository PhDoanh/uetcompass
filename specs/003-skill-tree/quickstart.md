# Developer Quickstart: Skill Tree – Visual Career Path Tracker

**Feature**: `003-skill-tree`
**Date**: 2026-03-10
**Branch**: `003-skill-tree`

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [Atlas](https://cloud.mongodb.com) free cluster | `skill_node_statuses` collection is created automatically by Mongoose |
| Git | Any | Branch: `003-skill-tree` |
| Features 001 & 002 complete | — | Student auth (JWT, `students` collection) and `course_units` seed data must be present |

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 003-skill-tree
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

No new environment variables are required for Feature 003. The existing `.env` from Feature 001 is sufficient:

```env
# Already set in Feature 001 — verify these are present:
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/uetcompass
JWT_SECRET=your_local_jwt_secret_at_least_32_chars
```

Start the backend:

```bash
npm run dev
# → Express listening on http://localhost:3001
# → Career path JSON files loaded at startup (logged to console)
# → Mongoose creates skill_node_statuses collection + indexes on first write
```

**Startup validation**: The career path loader performs a cycle check on every JSON file at boot. If a cycle is detected, the server exits with a non-zero code and logs the offending path. Fix the JSON file before restarting.

---

## 3. Frontend setup

```bash
cd ../frontend
npm install
```

`frontend/.env.local` (same as Feature 001 — no new variables):

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001/api
```

Start the Next.js dev server:

```bash
npm run dev
# → Next.js app on http://localhost:3000
```

---

## 4. Seeding a test student with a career goal

Feature 003 requires that the student's `StudentProfile` (from Feature 001) has a `careerGoalId` set to one of the IDs defined in a career path JSON file (e.g., `"frontend-developer"`).

Use the Feature 001 onboarding flow to select a career goal, or update the document directly in MongoDB for dev purposes:

```js
// MongoDB shell / Compass — update an existing student profile:
db.student_profiles.updateOne(
  { studentId: ObjectId("<your-student-id>") },
  { $set: { careerGoalId: "frontend-developer" } }
)
```

---

## 5. Manual test walkthrough

All scenarios below assume you have a valid JWT from Feature 001's login endpoint.

### Scenario A — Load the Skill Tree

```bash
# Replace <TOKEN> and <STUDENT_ID> with real values
curl -s http://localhost:3001/api/skill-tree/<STUDENT_ID> \
  -H "Authorization: Bearer <TOKEN>" | jq .
```

**Expected**: `200` response with `nodes[]`, `progress`, and `nextSteps`. All nodes return `status: "Pending"` on a fresh account. Root nodes (no prerequisites) have `isUnlocked: true`.

---

### Scenario B — Mark a node as In Progress

```bash
curl -s -X PATCH http://localhost:3001/api/skill-tree/<STUDENT_ID>/nodes/IT1010 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"InProgress"}' | jq .
```

**Expected**: `200` with the updated node showing `status: "InProgress"`. Re-poll the GET endpoint and confirm the same.

---

### Scenario C — Mark a prerequisite Done → auto-unlock check

```bash
# 1. Mark IT1010 as Done
curl -s -X PATCH http://localhost:3001/api/skill-tree/<STUDENT_ID>/nodes/IT1010 \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"Done"}' | jq .

# 2. Re-poll the full tree
curl -s http://localhost:3001/api/skill-tree/<STUDENT_ID> \
  -H "Authorization: Bearer <TOKEN>" | jq '.nodes[] | {id, isUnlocked, status}'
```

**Expected**: Node `IT3910E` (child of `IT1010`) now shows `isUnlocked: true`. If `IT1010` was the only prerequisite of `skill-html-css`, that node also shows `isUnlocked: true`.

---

### Scenario D — Attempt to update a locked node → 403

```bash
# skill-react requires IT3910E which is still Pending
curl -s -X PATCH http://localhost:3001/api/skill-tree/<STUDENT_ID>/nodes/skill-react \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status":"InProgress"}' | jq .
```

**Expected**: `403` response — `"Cannot update a locked node. Complete all prerequisites first."`

---

### Scenario E — Cross-session sync (2500ms poll)

1. Open the Skill Tree page in two browser windows for the same student.
2. Mark a node as Done in Window A.
3. Within 3 seconds, Window B's polling cycle fires and the node changes to Done.

**Expected**: Window B updates without any manual action.

---

### Scenario F — Language toggle

1. Load the Skill Tree page (defaults to Vietnamese).
2. Click the language toggle button → all node labels switch to English.
3. Reload the page → English is still selected (Zustand `persist` → `localStorage`).

---

## 6. Running unit tests

```bash
cd backend
npm test -- --testPathPattern=skill-tree
```

Expected output:
```
PASS  tests/unit/skill-tree/dagTraversal.test.js
PASS  tests/unit/skill-tree/progress.test.js
PASS  tests/unit/skill-tree/nextStep.test.js
PASS  tests/unit/skill-tree/statusGuard.test.js

Test Suites: 4 passed, 4 total
Tests:       ~20 passed, ~20 total
```

No network calls, no MongoDB instance needed — all external dependencies are mocked.
