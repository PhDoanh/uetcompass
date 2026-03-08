# Developer Quickstart: Seed UET Curriculum into DB as DAG

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Branch**: `002-seed-ctdt-dag`

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [MongoDB Atlas](https://cloud.mongodb.com) free cluster | `course_units` collection created automatically on first upsert |
| Tavily API key | Free tier | [Sign up at tavily.com](https://tavily.com) → API Keys |
| Gemini API key | Free tier | [Get key at aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Git | Any | Branch: `002-seed-ctdt-dag` |

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 002-seed-ctdt-dag
```

---

## 2. Install new dependencies

```bash
cd backend
npm install node-cron @google/generative-ai @tavily/core
```

---

## 3. Configure environment variables

Add the following to `backend/.env` (create the file if it doesn't exist — never commit it):

```env
# Server (existing)
PORT=3001
NODE_ENV=development

# MongoDB (existing)
MONGODB_URI=mongodb://localhost:27017/uetcompass
# or: mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass

# JWT (existing)
JWT_SECRET=your_local_jwt_secret_at_least_32_chars

# Gmail SMTP (existing)
GMAIL_USER=your.address@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx

# --- NEW for this feature ---

# Tavily Extract API key (https://tavily.com → API Keys)
TAVILY_API_KEY=tvly-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Gemini API key (https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Optional: override the default Cron schedule (default: 0 0 1 3,8 *)
# SEED_CRON_SCHEDULE=0 0 1 3,8 *
```

> **Key format reference** (for test fixtures only — do not use real keys in tests):
> - Tavily: `tvly-` + 32 alphanumeric chars
> - Gemini: `AIzaSy` + 33 alphanumeric chars

---

## 4. Configure curriculum URLs

Edit `backend/src/modules/curriculum/curriculum.config.js` to set the URL list:

```js
module.exports = {
  urls: [
    {
      url: 'https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-cntt/',
      major: 'CNTT',
    },
    {
      url: 'https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-ktmt/',
      major: 'KTMT',
    },
    // Add more UET curriculum URLs as needed
  ],
};
```

---

## 5. Run the seed job manually (dev)

```bash
cd backend
npm run seed:ctdt
```

Expected output (all events in console):

```
{"timestamp":"...","level":"info","event":"JOB_START","totalUrls":2}
{"timestamp":"...","level":"info","event":"URL_START","url":"https://uet.vnu.edu.vn/...","major":"CNTT"}
{"timestamp":"...","level":"info","event":"URL_SUCCESS","url":"https://uet.vnu.edu.vn/...","upsertedCount":45}
{"timestamp":"...","level":"info","event":"CYCLE_CLEAN","major":"CNTT"}
{"timestamp":"...","level":"info","event":"JOB_COMPLETE","exitStatus":"SUCCESS","totalUrls":2,"successCount":2,"failCount":0,"cyclesDetected":0}
```

A log file is also written to `backend/logs/seed-ctdt.log` (created automatically, gitignored).

**If a URL fails**, the job continues and logs:
```
{"level":"error","event":"URL_SKIP","url":"https://...","stage":"tavily","reason":"Request failed with status 429"}
```

**If a cycle is detected**:
```
{"level":"warn","event":"CYCLE_DETECTED","major":"CNTT","cycles":[{"from":"INT2210","to":"INT2215"}]}
{"level":"info","event":"JOB_COMPLETE","exitStatus":"FAILED","cyclesDetected":1}
```

---

## 6. Verify data in MongoDB

After a successful run, inspect the `course_units` collection:

```js
// MongoDB Compass or mongosh
db.course_units.find({ major: 'CNTT' }).limit(5)
// Expected: documents with fields: code, name, credits, major, prerequisites, seededAt
```

Check the compound unique index was created:
```js
db.course_units.getIndexes()
// Expected: index on { code: 1, major: 1 } with unique: true
```

---

## 7. Run unit tests

All tests run locally with **no external services** (Tavily, Gemini, and MongoDB are fully mocked).

```bash
cd backend
npm test
```

Expected test suites:

```
PASS  tests/unit/curriculum/seed.pipeline.test.js
  SeedPipeline
    ✓ processes all URLs successfully and exits with SUCCESS
    ✓ skips URL when Tavily extraction fails and continues
    ✓ skips URL when Gemini parse returns invalid JSON
    ✓ skips URL when schema validation fails
    ✓ exits with PARTIAL_FAILURE when ≥1 URL fails

PASS  tests/unit/curriculum/cycle.detector.test.js
  detectCycles
    ✓ returns empty array for a clean DAG
    ✓ detects a direct cycle A→B→A
    ✓ detects a longer cycle A→B→C→A
    ✓ does not report false positives for diamond-shaped graphs

PASS  tests/unit/curriculum/bulkWrite.upsert.test.js
  CourseUnit bulkWrite upsert
    ✓ inserts new CourseUnit when code+major not in DB
    ✓ overwrites all fields when code+major already exists
    ✓ handles batch of mixed new and existing records correctly
```

---

## 8. Environment variables reference

| Variable | Location | Required | Description |
|---|---|---|---|
| `PORT` | `backend/.env` | yes | Express listen port |
| `MONGODB_URI` | `backend/.env` | yes | MongoDB connection string |
| `JWT_SECRET` | `backend/.env` | yes | JWT signing secret |
| `GMAIL_USER` | `backend/.env` | yes | Gmail address for Nodemailer (existing feature) |
| `GMAIL_APP_PASSWORD` | `backend/.env` | yes | Gmail App Password (existing feature) |
| `TAVILY_API_KEY` | `backend/.env` | **yes (new)** | Tavily Extract API key |
| `GEMINI_API_KEY` | `backend/.env` | **yes (new)** | Google Gemini API key |
| `SEED_CRON_SCHEDULE` | `backend/.env` | no | Override Cron expression (default: `0 0 1 3,8 *`) |
| `NODE_ENV` | `backend/.env` | yes | `development` enables `npm run seed:ctdt` |

> All secrets via environment variables only — never hardcoded. See Constitution §Deployment & Environment.
