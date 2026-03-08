# Developer Quickstart: Student Profile Onboarding

**Feature**: `001-profile-onboarding`
**Date**: 2026-03-07
**Branch**: `001-profile-onboarding`

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [MongoDB Atlas](https://cloud.mongodb.com) free cluster | Used by backend |
| Gmail account | Any | Enable 2FA + generate an [App Password](https://myaccount.google.com/apppasswords) |
| Git | Any | Branch: `001-profile-onboarding` |

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 001-profile-onboarding
```

---

## 2. Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` (never commit this file):

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/uetcompass
# or: mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass

# JWT
JWT_SECRET=your_local_jwt_secret_at_least_32_chars

# Gmail SMTP (Nodemailer)
GMAIL_USER=your.address@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx   # 16-char App Password, no spaces
```

Start the backend (development mode with auto-reload):

```bash
npm run dev
# → Express listening on http://localhost:3001
```

---

## 3. Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env.local` (never commit this file):

```env
VITE_API_BASE_URL=http://localhost:3001/api
```

Start the frontend dev server:

```bash
npm run dev
# → Vite serving React app at http://localhost:5173
```

---

## 4. Seed course catalog (prerequisite data)

The onboarding course multi-select requires `course_units` documents in MongoDB. Run the seed script (separate feature — you may use a minimal fixture for local dev):

```bash
cd backend
node scripts/seed-courses.js
# Inserts sample CourseUnit documents for each major
```

If the seed script does not exist yet, insert a minimal fixture manually:

```js
// In mongo shell or MongoDB Compass:
db.course_units.insertMany([
  { code: "INT2204", name: "Object-Oriented Programming", major: "Computer Science" },
  { code: "INT2208", name: "Data Structures & Algorithms", major: "Computer Science" },
  // Add more as needed for local testing
]);
```

---

## 5. Run unit tests

The two required unit test suites run entirely locally — **no external services needed** (MongoDB is mocked).

```bash
cd backend
npm test
```

Expected output:

```
PASS  tests/unit/onboarding/validation.test.js
  validateFreeText
    ✓ null input → valid (optional field)
    ✓ empty string after trim → valid (treated as not provided)
    ✓ whitespace-only string → valid (treated as not provided)
    ✓ "ok" (2 chars) → invalid: too short
    ✓ "!!!" (3 chars, no letters) → invalid: no letter
    ✓ "abc" → valid
    ✓ "Kỹ sư backend" (Vietnamese) → valid
    ✓ "   abc   " (leading/trailing spaces) → valid (trimmed to 3 chars)

PASS  tests/unit/onboarding/stateMachine.test.js
  StudentProfile state machine
    ✓ non-existent → draft on first PUT /draft
    ✓ draft fields are updated on subsequent PUT /draft calls
    ✓ draft → submitted on POST /submit
    ✓ second POST /submit returns 409 (irreversible)
    ✓ PUT /draft after submit returns 403
```

---

## 6. Test the onboarding flow manually

### Step A — Obtain a JWT

Authenticate via the existing auth endpoint:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@vnu.edu.vn","password":"testpass"}'
# → { "token": "eyJ..." }
TOKEN="eyJ..."
```

### Step B — Auto-save a draft

```bash
curl -X PUT http://localhost:3001/api/onboarding/draft \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"major":"Computer Science","careerGoal":{"role":"Backend Engineer"}}'
# → 200 with updated draft document
```

### Step C — Fetch the draft (simulate page reload)

```bash
curl http://localhost:3001/api/onboarding/draft \
  -H "Authorization: Bearer $TOKEN"
# → 200 with the saved draft, confirming draft persistence
```

### Step D — Open SSE stream in one terminal

```bash
curl -N "http://localhost:3001/api/onboarding/status?token=$TOKEN"
# Keeps connection open, prints heartbeat comments every 15s
```

### Step E — Submit (in another terminal)

```bash
curl -X POST http://localhost:3001/api/onboarding/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"major":"Computer Science","completedCourseIds":[]}'
# → 202 { "message": "...", "isGeneric": true }
```

Observe Step D terminal: within a few seconds you should see:
```
event: roadmap:status
data: {"status":"completed"}
```
And an email notification sent to your Gmail address.

### Step F — Verify post-submission guard

```bash
curl http://localhost:3001/api/onboarding/draft \
  -H "Authorization: Bearer $TOKEN"
# → 403 PROFILE_ALREADY_SUBMITTED

curl -X PUT http://localhost:3001/api/onboarding/draft \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"major":"Software Engineering"}'
# → 403 PROFILE_ALREADY_SUBMITTED
```

---

## 7. Environment variables reference

| Variable | Location | Required | Description |
|---|---|---|---|
| `PORT` | `backend/.env` | yes | Express listen port |
| `MONGODB_URI` | `backend/.env` | yes | MongoDB connection string |
| `JWT_SECRET` | `backend/.env` | yes | Secret for JWT signing/verification |
| `GMAIL_USER` | `backend/.env` | yes | Gmail address for Nodemailer |
| `GMAIL_APP_PASSWORD` | `backend/.env` | yes | Gmail App Password (not your account password) |
| `VITE_API_BASE_URL` | `frontend/.env.local` | yes | Base URL for backend API calls |

> All secrets are managed via environment variables only — never hardcoded in source. See Constitution §Deployment & Environment.
