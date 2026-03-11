# Developer Quickstart: Resource Curation

**Feature**: `009-resource-curation`
**Date**: 2026-03-11
**Branch**: `009-resource-curation`

---

## Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | 10+ | Bundled with Node 20 |
| MongoDB | Local instance **or** [MongoDB Atlas](https://cloud.mongodb.com) free cluster | All four collections created automatically on first upsert |
| Tavily API key | Free tier | [Sign up at tavily.com](https://tavily.com) → API Keys |
| Gemini API key | Free tier | [Get key at aistudio.google.com](https://aistudio.google.com/app/apikey) |
| Git | Any | Branch: `009-resource-curation` |

---

## 1. Clone and branch

```bash
git clone https://github.com/PhDoanh/uetcompass.git
cd uetcompass
git checkout 009-resource-curation
```

---

## 2. Install dependencies

This feature reuses `@tavily/core` and `@google/generative-ai` already introduced by Feature 002. Confirm they are present:

```bash
cd backend
npm install
# Verify:
node -e "require('@tavily/core'); require('@google/generative-ai'); console.log('OK')"
```

No new top-level npm packages are required.

---

## 3. Configure environment variables

Add the following to `backend/.env` (create the file if it doesn't exist — never commit it):

```env
# Server (existing)
PORT=3001
NODE_ENV=development

# MongoDB (existing)
MONGODB_URI=mongodb://localhost:27017/uetcompass

# JWT (existing)
JWT_SECRET=your_local_jwt_secret_at_least_32_chars

# Gmail SMTP (existing)
GMAIL_USER=your.address@gmail.com
GMAIL_APP_PASSWORD=xxxx_xxxx_xxxx_xxxx

# Tavily API key (existing — shared with Feature 002)
TAVILY_API_KEY=tvly-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Google Gemini API key (existing — shared with Feature 002)
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# --- Optional overrides for this feature (all have sensible defaults) ---

# Cron schedules (defaults shown below):
# CRAWL_RESOURCES_SCHEDULE=0 2 * * 0      (Sunday 02:00 UTC — weekly)
# CRAWL_DOCS_SCHEDULE=0 3 * * 0           (Sunday 03:00 UTC — weekly)
# CRAWL_TRENDS_SCHEDULE=0 1 * * *         (daily 01:00 UTC)

# Max Tavily search results per skill per platform (default: 5)
# CRAWL_RESOURCES_MAX_RESULTS=5

# Skills to crawl (comma-separated; defaults to all skill names in skill_learning_resources)
# CRAWL_SKILLS_OVERRIDE=React.js,Node.js,Python
```

---

## 4. Seed prerequisite data

Feature 009 reads skill names from existing `skill_learning_resources` documents (or falls back to a hardcoded default list on first run). For a meaningful local test, either:

**Option A — Seed a minimal skill list manually**:
```bash
# Start MongoDB locally, then run:
mongosh uetcompass --eval '
  db.skill_learning_resources.insertMany([
    { skillName: "React.js",  resources: [], updatedAt: new Date() },
    { skillName: "Node.js",   resources: [], updatedAt: new Date() },
    { skillName: "Python",    resources: [], updatedAt: new Date() },
  ])
'
```

**Option B — Run Feature 002 first** to seed `course_units`, then let Feature 009 derive skill names from courses on its first crawl run.

---

## 5. Run the unit tests

```bash
cd backend
npm test -- --testPathPattern=resource-curation
```

All tests run without any external network calls (Tavily and Gemini are mocked).

Expected output:
```
PASS tests/unit/resource-curation/trendDirection.test.js
PASS tests/unit/resource-curation/crawlPipeline.test.js
PASS tests/unit/resource-curation/freePaidClassifier.test.js
PASS tests/unit/resource-curation/courseMapper.test.js
```

---

## 6. Trigger a crawl job manually (dev only)

Start the backend server in development mode:
```bash
cd backend
npm run dev
```

Then trigger each capability individually via npm scripts (requires `NODE_ENV=development`):

```bash
# Capability 1 — Learning Resource Crawler
npm run crawl:resources

# Capability 2 — Academic Document Finder
npm run crawl:docs

# Capability 3 — Market Trend Crawler
npm run crawl:trends
```

Or trigger via the dev-only admin API:
```bash
# Trigger market trend crawl
curl -X POST http://localhost:3001/api/resource-curation/admin/trigger/market-trends \
  -H "Authorization: Bearer <your_dev_jwt>"
```

---

## 7. Verify results

After a successful crawl, verify each collection:

```bash
# Check learning resources were written
mongosh uetcompass --eval 'db.skill_learning_resources.find({ skillName: "React.js" }).pretty()'

# Check academic documents
mongosh uetcompass --eval 'db.academic_documents.find({ courseCode: "IT3910E" }).pretty()'

# Check market trend snapshot for today
mongosh uetcompass --eval '
  const today = new Date(); today.setUTCHours(0,0,0,0);
  db.market_trend_snapshots.find({ dataDate: today }).sort({ jobCount: -1 }).pretty()
'

# Check derived per-course market skills
mongosh uetcompass --eval 'db.market_skills.find({ courseCode: "IT3910E" }).pretty()'
```

---

## 8. Test the REST API endpoints

With the backend running:

```bash
# Get a JWT (replace with a valid dev user credential flow from Feature 005)
JWT=<your_dev_jwt>

# Endpoint 1 — global market trend list
curl http://localhost:3001/api/resource-curation/market-trends \
  -H "Authorization: Bearer $JWT" | jq .

# Endpoint 2 — academic docs for a course
curl http://localhost:3001/api/resource-curation/courses/IT3910E/academic-docs \
  -H "Authorization: Bearer $JWT" | jq .

# Endpoint 3 — learning resources for a skill
curl "http://localhost:3001/api/resource-curation/skills/React.js/resources" \
  -H "Authorization: Bearer $JWT" | jq .
```

---

## 9. Frontend Market Insight page (local dev)

```bash
cd frontend
npm run dev
# Navigate to http://localhost:5173/market-insights
```

The page polls `GET /api/resource-curation/market-trends` and renders the ranked skill list with trend arrows.

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Error: TAVILY_API_KEY not set` | Missing env var | Add `TAVILY_API_KEY` to `backend/.env` |
| `Error: GEMINI_API_KEY not set` | Missing env var | Add `GEMINI_API_KEY` to `backend/.env` |
| Market trend list returns `503 NO_MARKET_DATA_YET` | Crawl has never run | Run `npm run crawl:trends` |
| `crawl:trends` returns `PARTIAL_FAILURE` | One or more job boards were rate-limited or unreachable | Check `backend/logs/resource-curation.log`; re-run after a few minutes |
| Skill resources list returns `404` | Skill name not yet crawled | Run `npm run crawl:resources` with the target skill in the skills list |
| Gemini returns validation error | Response too short or refusal | Check Gemini free-tier quota; retry after 1 minute |
