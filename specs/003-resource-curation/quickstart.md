# Quickstart: Resource Curation

**Feature**: `003-resource-curation`  
**Date**: 2026-03-11  
**Prerequisites**: Feature 009 (Roadmap with RoadmapNodeSchema) and Feature 001 (Profile Onboarding with StudentProfile) must be running — provides active roadmap nodes + student onboarding data for personalization. The UETCompass skill catalog (`skills` collection) is optional and used only for convenience skillId matching in SkillTrendSnapshot. Tavily API key required.

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| MongoDB Atlas URI | M0 free | env var `MONGODB_URI` |
| Feature 009 (Roadmap) | running | `roadmap_nodes` collection populated with ≥1 active node |
| Skill catalog (optional) | — | `skills` collection (not required; used for convenience lookup) |

---

## 2. Environment Variables

This feature introduces one new environment variable. Add it to `backend/.env`:

```env
# Already required by other features
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass
JWT_ACCESS_SECRET=<same secret used by auth.middleware.js>
PORT=4000

# NEW — required by Feature 003
TAVILY_API_KEY=<your Tavily Search API key>
```

**How to obtain `TAVILY_API_KEY`**:
1. Go to [Tavily.com](https://tavily.com/) and sign up (free tier includes 100 searches/month).
2. Generate API key from your Tavily dashboard.
3. No billing required for academic/research use free tier.

**No new frontend env vars** — the three new REST endpoints use the existing `VITE_API_URL` already configured in `frontend/.env.local`.

---

## 3. Backend Setup

### 3.1 Register Mongoose models

In `backend/src/app.js`, require the three new models so Mongoose registers the collections on startup:

```js
// Add alongside other model requires
require('./modules/scraping/models/learningResource.model');
require('./modules/scraping/models/academicDocument.model');
require('./modules/scraping/models/skillTrendSnapshot.model');
```

### 3.2 Mount the resource and market routes

```js
const resourceRoutes = require('./modules/scraping/routes/resource.routes');
const marketRoutes   = require('./modules/scraping/routes/market.routes');
const scrapingRoutes = require('./modules/scraping/routes/scraping.routes'); // dev trigger

app.use('/api/resources', resourceRoutes);
app.use('/api/market',    marketRoutes);
app.use('/api/scraping',  scrapingRoutes); // guarded by NODE_ENV check inside the route
```

### 3.3 Register background jobs

In `backend/src/app.js`, mount the scraping job scheduler after the Express app is configured:

```js
const scrapingJob = require('./modules/scraping/scraping.job');
scrapingJob.register(); // registers node-cron schedules; no-op in test environment
```

### 3.4 Start the backend

```bash
cd backend
npm install          # no new global packages; cheerio may be the only new dependency
npm start
```

Verify the server starts with:
```
[scraping] Resource crawler scheduled: 0 17 * * 6 (weekly)
[scraping] Academic finder scheduled:  0 17 * * 6 (weekly)
[scraping] Market tracker scheduled:   0 17 * * * (daily)
```

---

## 4. Manual Trigger (Dev Only)

Since the cron schedules run at off-hours (00:00 Vietnam time = 17:00 UTC), trigger each capability manually during development:

```bash
# From backend/
npm run scrape:resources   # runs resourceCrawler.service.js#runResourceCrawler()
npm run scrape:academic    # runs academicFinder.service.js#runAcademicFinder()
npm run scrape:market      # runs marketTracker.service.js#runMarketTracker()
```

Or via the HTTP trigger (requires a valid JWT from a logged-in student):

```bash
curl -X POST http://localhost:4000/api/scraping/trigger/resources \
  -H "Authorization: Bearer <your_jwt>"

curl -X POST http://localhost:4000/api/scraping/trigger/market \
  -H "Authorization: Bearer <your_jwt>"
```

Expected response: `{ "message": "Crawl job 'resources' started. Check server logs for progress." }`

---

## 5. Verify Data Was Written

After triggering a crawl, confirm records were inserted:

```bash
# Connect to MongoDB Atlas or use mongosh locally
db.learning_resources.countDocuments({})     # should be > 0 after resource crawl
db.academic_documents.countDocuments({})     # should be > 0 after academic crawl
db.skill_trend_snapshots.countDocuments({})  # should be > 0 after market crawl

# Inspect a sample learning resource
db.learning_resources.findOne({}, { title: 1, sourcePlatform: 1, isFree: 1 })

# Inspect a sample trend snapshot
db.skill_trend_snapshots.findOne({}, { skillId: 1, jobCount: 1, trendDirection: 1 })
```

---

## 6. Frontend Setup

No new environment variables or package installations are needed for the frontend.

### 6.1 Register new routes

In your React Router configuration (typically `frontend/src/App.jsx` or the routes file):

```jsx
import MarketInsight from './features/resources/MarketInsight';

// Add alongside existing protected routes
<Route path="/market-insight" element={<AuthGuard><MarketInsight /></AuthGuard>} />
```

The resource and academic sections are sub-sections of the existing skill page — no new top-level route required; they are rendered inside the existing skill detail page:

```jsx
// Inside the skill detail page component:
import SkillResources    from '../features/resources/SkillResources';
import AcademicMaterials from '../features/resources/AcademicMaterials';

// Render both sections after the existing skill info:
<SkillResources    skillId={skill._id} />
<AcademicMaterials skillId={skill._id} />
```

---

## 7. Manual Test Scenarios

### Scenario A — View resources for a skill (User Story 1, P1)

1. Log in as a student. Navigate to any skill page in your active roadmap.
2. **Expected**: A "Learning Resources" section is visible below the skill description, listing resources from at least two different platforms.
3. **Verify**: Each entry shows title, source platform icon/label, resource type, and a free/paid badge.
4. **Edge case**: Navigate to a newly added skill (no crawl run yet). **Expected**: "No resources available yet" empty state — no error, rest of skill page intact.

### Scenario B — View academic materials for a UET course skill (User Story 3, P3)

1. Navigate to a skill linked to a known UET course (e.g., "HTML/CSS" → "Lập trình web").
2. **Expected**: An "Academic Materials" section is visible, listing at least one document.
3. **Verify**: UET official documents appear above GitHub and external documents. Each entry shows source type badge ("UET Official" / "GitHub" / "External") and document type.
4. **Verify**: Clicking a document URL opens the correct external page.

### Scenario C — View Market Insight (User Story 2, P2)

1. Navigate to `/market-insight` in the frontend.
2. **Expected**: A ranked list of skills is displayed, ordered by job count (highest first).
3. **Verify**: Each entry shows skill name, job count, salary range (or "Chưa có thông tin" for null), and a trend arrow/label (↑ / → / ↓).
4. **Verify**: The "Last updated" timestamp is within the past 24 hours after triggering the market crawler.
5. **Verify**: A skill with 0 job postings appears at the bottom of the list with trend "stable".

### Scenario D — Free/paid classification correctness

1. After running the resource crawler, query the API directly:
   ```bash
   curl http://localhost:4000/api/resources/skills/<skillId> \
     -H "Authorization: Bearer <jwt>"
   ```
2. **Verify**: YouTube resources have `isFree: true`. Udemy paid courses have `isFree: false`. Udemy free courses (if any were found) have `isFree: true`.

### Scenario E — Source failure resilience

1. Temporarily set an invalid selector or disconnect a mock adapter for one job board.
2. Trigger the market crawler: `npm run scrape:market`.
3. **Expected**: The crawler completes and inserts snapshots using the remaining sources. Server logs show one source failure warning. The trend list remains populated.
