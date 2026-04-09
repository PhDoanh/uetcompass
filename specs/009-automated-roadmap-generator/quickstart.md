# Developer Quickstart: AI-Powered Personalised Roadmap Generator

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-11
**Branch**: `009-roadmap-generator`

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [MongoDB Atlas](https://cloud.mongodb.com) free cluster | Must have `student_profiles` and `course_units` collections seeded (Features 001 and 002) |
| Gemini API key | Any | [Google AI Studio](https://aistudio.google.com/app/apikey) — free tier is sufficient |
| Git | Any | Branch: `009-roadmap-generator` |

**Dependency order**: Feature 001 (Profile Onboarding) and Feature 002 (Seed CTĐT DAG) must be set up and have data seeded before this feature can generate anything.

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 009-roadmap-generator
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

Create or update `backend/.env` (never commit this file):

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/uetcompass
# or: mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass

# JWT (required for auth middleware — already set from Feature 001/005)
JWT_SECRET=your_local_jwt_secret_at_least_32_chars

# Gemini API (NEW for this feature)
GEMINI_API_KEY=your_gemini_api_key_here
```

Start the backend:

```bash
npm run dev
# → Express listening on http://localhost:3001
```

---

## 3. Seed prerequisite data

Before triggering roadmap generation, ensure the following data exists:

**3a. Seed CourseUnit DAG** (Feature 002):
```bash
npm run seed:ctdt
# → Populates course_units collection for all major programs
```

**3b. Create a user and submit a StudentProfile** (Feature 001):

Use the onboarding API or an existing user from a prior Feature 001 setup. The submitted `StudentProfile` is the trigger input. Record the `userId` and `studentProfileId` for the manual test steps below.

---

## 4. Manually trigger roadmap generation (dev only)

Generation is normally triggered by Feature 001's profile submission event or Feature 005's repersonalization signal. In development, you can trigger it directly via the service layer using the Node.js REPL or a one-off script:

```js
// Run from backend/ directory:
// node -e "require('./src/modules/roadmap/generation.service').triggerGeneration('<userId>', '<studentProfileId>', 'profile_submission')"

const { triggerGeneration } = require('./src/modules/roadmap/generation.service');

triggerGeneration(
  '64a1b2c3d4e5f6a7b8c9d0e2',  // userId (ObjectId string)
  '64a1b2c3d4e5f6a7b8c9d0e3',  // studentProfileId (ObjectId string)
  'profile_submission'
).catch(console.error);
```

Alternatively, submit the onboarding profile via `POST /api/onboarding/submit` — Feature 001's handler calls `triggerGeneration` automatically.

**Expected behaviour**:
1. Function returns immediately (fire-and-forget)
2. After a few seconds, check the `notifications` collection for a `roadmap_preview_ready` event
3. The in-memory preview store now holds the preview under the `userId` key

---

## 5. Test the accept/reject flow

**Step 1** — Subscribe to SSE notifications (in a separate terminal or browser tab with an authenticated session):
```
GET /api/notifications/stream
Authorization: Bearer <JWT>
```

**Step 2** — Trigger generation (see section 4 above or submit via onboarding API).

**Step 3** — Wait for the `roadmap_preview_ready` SSE event. The payload includes the full preview nodes.

**Step 4a — Accept the preview**:
```
POST /api/roadmap/preview/accept
Authorization: Bearer <JWT>
```
Expected: `200 OK` with the committed Roadmap document. Verify the `roadmaps` collection now has a document with `status: completed` for this user.

**Step 4b — Reject the preview** (alternative):
```
POST /api/roadmap/preview/reject
Authorization: Bearer <JWT>
```
Expected: `200 OK`. The `roadmaps` collection should NOT have a new document (or the existing one remains unchanged for re-generation rejections).

---

## 6. Test the retry flow

**Step 1** — Simulate a generation failure by temporarily setting an invalid `GEMINI_API_KEY` in `.env` and restarting the server, then triggering generation.

**Step 2** — Check the `roadmaps` collection for a document with `status: failed` and a non-null `errorMessage`.

**Step 3** — Check the `notifications` collection for a `roadmap_generation_failed` event with `retryable: true`.

**Step 4** — Restore the valid `GEMINI_API_KEY` and restart the server.

**Step 5** — Trigger retry:
```
POST /api/roadmap/retry
Authorization: Bearer <JWT>
```
Expected: `202 Accepted`. Wait for the `roadmap_preview_ready` SSE notification, then accept to confirm the full retry lifecycle completes.

**Step 6** — Verify concurrency guard: trigger retry twice in rapid succession. The second call should return `409 GENERATION_IN_PROGRESS`.

---

## 7. Test re-generation (repersonalization)

**Step 1** — Ensure the user has an accepted roadmap (`status: completed`).

**Step 2** — Set `repersonalizationPending: true` on their `StudentProfile` directly in MongoDB (Feature 005 does this via Account Settings in the full flow):
```js
db.student_profiles.updateOne({ userId: ObjectId('<userId>') }, { $set: { repersonalizationPending: true } });
```

**Step 3** — Trigger generation with `triggerReason: 'repersonalization'`:
```js
triggerGeneration('<userId>', '<studentProfileId>', 'repersonalization');
```

**Expected behaviour**: 
- The existing `completed` roadmap document remains unchanged until the student accepts
- The Gemini prompt includes the existing roadmap nodes as base context
- The SSE event fires with the new preview
- On acceptance: existing document is replaced with the new one; `repersonalizationPending` is cleared
- On rejection: existing document unchanged; `repersonalizationPending` cleared

---

## 8. Run unit tests

```bash
cd backend
npx jest --testPathPattern="tests/unit/roadmap" --verbose
```

All tests must pass with external deps mocked (no real Gemini API calls, no real MongoDB):

```
PASS tests/unit/roadmap/generation.service.test.js
PASS tests/unit/roadmap/roadmapAcceptance.service.test.js
PASS tests/unit/roadmap/roadmap.service.test.js
```
