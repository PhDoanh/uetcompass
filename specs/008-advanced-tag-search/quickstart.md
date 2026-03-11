# Quickstart: Advanced Tag-Based Search

**Feature**: `008-advanced-tag-search`  
**Date**: 2026-03-11  
**Prerequisites**: Feature 005 (Account Management) must be running — the Search module shares `auth.middleware.js` and reads user authentication. Features 001, 002, 006 must provide populated `skills`, `courses`, `roadmaps` collections with tags.

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| MongoDB Atlas URI | M0 free | env var `MONGODB_URI` |
| Features 001, 005, 006 | running | skills + courses + roadmaps exist in DB with tags populated |
| Backend server | port 4000 | `npm run dev` in `backend/` |
| Frontend dev server | port 5173 | `npm run dev` in `frontend/` |

---

## 2. Environment Variables

No new environment variables are introduced by this feature. It reuses the existing backend `.env`:

```env
# Already required by other features — no additions needed
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass
JWT_ACCESS_SECRET=<same secret used by auth.middleware.js>
PORT=4000
SEARCH_CACHE_REFRESH_INTERVAL_MINUTES=360
```

**Optional**:
- `SEARCH_CACHE_REFRESH_INTERVAL_MINUTES`: How often to auto-rebuild fallback cache (default: 360 min = 6 hours)
- `SEARCH_INDEX_TYPE`: `"mongodb"` (default) or `"elasticsearch"` (Phase 2)

Frontend (`.env.local` — already present from Feature 005):

```env
VITE_API_URL=http://localhost:4000
```

---

## 3. Backend — Mount the Search Module

### 3.1 Register the Mongoose models

In `backend/src/app.js`, require the new model so Mongoose registers the collection on startup:

```js
// Add alongside other model requires
require('./modules/search/models/searchCache.model');
```

### 3.2 Create the search module and index the search collections

Create text indexes on the `skills` collection if not already present (this is typically created post-FEAT-006):

```js
// backend/src/modules/search/search.index.js
const Skill = require('../skill/skill.model');

async function initializeSearchIndex() {
  try {
    // Create compound text index for full-text search
    await Skill.collection.createIndex({
      name: 'text',
      description: 'text',
      'tags.name': 'text',
    });
    console.log('[search] Text index created on skills collection');

    // Create regular indexes for filtering
    await Skill.collection.createIndex({ level: 1, categoryId: 1 });
    console.log('[search] Filter indexes created on skills collection');
  } catch (err) {
    if (err.code !== 85) { // 85 = index already exists
      console.error('[search] Index creation failed:', err.message);
    }
  }
}

module.exports = { initializeSearchIndex };
```

Call this function on app startup:

```js
// backend/src/app.js
const { initializeSearchIndex } = require('./modules/search/search.index');

(async () => {
  // ... existing connection code ...
  
  await db.connect(); // Mongoose connect
  await initializeSearchIndex();
  
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
})();
```

### 3.3 Mount the search router

```js
// backend/src/app.js
const searchRoutes = require('./modules/search/search.routes');
// Add alongside other route mounts (after auth middleware)
app.use('/api/search', searchRoutes);
```

### 3.4 Bootstrap the search cache on startup

```js
// backend/src/app.js
const { rebuildSearchCache } = require('./modules/search/search.cache');

(async () => {
  // ... existing code ...
  
  await db.connect();
  await initializeSearchIndex();
  
  // Rebuild cache on startup (takes ~1–2 seconds for 10K skills)
  console.log('[search] Rebuilding fallback cache...');
  await rebuildSearchCache();
  console.log('[search] Fallback cache ready');
  
  // Schedule periodic rebuild
  const cacheRefreshInterval = 
    parseInt(process.env.SEARCH_CACHE_REFRESH_INTERVAL_MINUTES || '360') * 60 * 1000;
  setInterval(rebuildSearchCache, cacheRefreshInterval);
  
  app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
})();
```

### 3.5 Start the backend

```bash
cd backend
npm install   # no new packages required (Mongoose, Express already present)
npm run dev   # or: node src/app.js
```

Expected output:
```
Server listening on port 4000
MongoDB connected to uetcompass
[search] Text index created on skills collection
[search] Rebuilding fallback cache...
[search] Fallback cache ready (5000 skills indexed)
```

---

## 4. Frontend — Add the Search Route

### 4.1 Register the `/search` route

In `frontend/src/App.jsx` (or wherever React Router routes are declared):

```jsx
import SearchPage from './features/search/SearchPage';

// Inside your <Routes> block:
<Route path="/search" element={<AuthGuard><SearchPage /></AuthGuard>} />
```

### 4.2 Add navigation link

In the main navigation component (e.g., `Navbar.jsx`):

```jsx
<Link to="/search">Tìm Kiếm</Link>
```

### 4.3 Initialize personalization on app boot

In `frontend/src/App.jsx` or a context provider:

```jsx
import { useQuery } from 'react-query';
import { fetchPersonalization } from './features/search/search.api';

function App() {
  // Fetch once on app load and cache in React Query
  useQuery('searchPersonalization', fetchPersonalization, {
    staleTime: Infinity, // Cache for entire session
    initialData: { enrolledRoadmapId: null, courseCount: 0 },
  });

  return (
    // ... rest of app ...
  );
}
```

### 4.4 Start the frontend

```bash
cd frontend
npm install   # no new packages required (react-query, react-router already present)
npm run dev
```

Frontend available at `http://localhost:5173`.

---

## 5. Seed Test Data (Optional)

If you want to test the search feature without a full Skill Tree UI, you can manually insert test documents.

### 5.1 Verify existing data

First, check that skills, courses, and roadmaps are already in the DB (from Features 001, 006):

```bash
# Use MongoDB Atlas UI or mongo shell
db.skills.count() # Should be > 0
db.courses.count() # Should be > 0
db.roadmaps.count() # Should be > 0
```

### 5.2 Create test tags (if Features 006 hasn't run yet)

If AI Auto-Tagging (Feature 006) hasn't populated tags yet, manually add them to a few skills:

```js
// Run once in a MongoDB shell or via a seed script
db.skills.updateMany(
  { name: { $regex: /SQL|Database/i } },
  { $set: { tags: [
    { _id: ObjectId(), name: "#Database", confidence: 0.95 },
    { _id: ObjectId(), name: "#SQL", confidence: 0.90 }
  ]}},
  { upsert: false }
);

db.skills.updateMany(
  { name: { $regex: /REST|API/i } },
  { $set: { tags: [
    { _id: ObjectId(), name: "#API", confidence: 0.92 },
    { _id: ObjectId(), name: "#Backend", confidence: 0.88 }
  ]}},
  { upsert: false }
);
```

### 5.3 Enroll a test user in a roadmap

Create an entry in the `student_profiles` collection linking a user to a roadmap:

```js
const userId = ObjectId("...your-test-user-id...");
const roadmapId = ObjectId("...your-test-roadmap-id...");

db.student_profiles.updateOne(
  { userId },
  { $set: { enrolledRoadmap: roadmapId }},
  { upsert: true }
);
```

---

## 6. Test Backend Search Endpoints

Once the backend is running, test the search endpoints via curl:

### 6.1 Get available filters

```bash
curl -X GET http://localhost:4000/api/search/filters \
  -H "Authorization: Bearer <valid-jwt-token>"
```

**Expected response**:
```json
{
  "tags": [
    { "id": "64f1a2b3c...", "name": "#Database", "count": 42 },
    { "id": "64f1a2b3c...", "name": "#API", "count": 35 }
  ],
  "levels": ["Beginner", "Intermediate", "Advanced"],
  "domains": ["Backend", "Frontend", "Data"]
}
```

### 6.2 Get user's enrolled roadmap

```bash
curl -X GET http://localhost:4000/api/search/personalization \
  -H "Authorization: Bearer <valid-jwt-token>"
```

**Expected response**:
```json
{
  "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2",
  "enrolledRoadmapName": "Backend Developer",
  "courseCount": 12
}
```

### 6.3 Tag-based search

```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <valid-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "tag",
    "tagId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "filters": { "levels": ["Beginner", "Intermediate"] },
    "page": 1,
    "enrolledRoadmapId": "74f1a2b3c4d5e6f7a8b9c0d2"
  }'
```

**Expected response** (see [contracts/rest-api.md](../contracts/rest-api.md) for full schema):
```json
{
  "courses": [
    { "courseId": "...", "name": "SQL Fundamentals", ... },
    { "courseId": "...", "name": "NoSQL Basics", ... }
  ],
  "roadmaps": [
    { "roadmapId": "...", "name": "Backend Developer", "highlighted": true, ... }
  ],
  "pagination": { "currentPage": 1, "pageSize": 20, "totalCourses": 42, ... },
  "appliedFilters": { "levels": ["Beginner", "Intermediate"], ... },
  "fallbackMode": false
}
```

### 6.4 Keyword search

```bash
curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <valid-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "queryType": "keyword",
    "keyword": "database design",
    "filters": { "domains": ["Backend"] },
    "sortBy": "relevance",
    "page": 1
  }'
```

---

## 7. Test Frontend Search Flow

### 7.1 Log in and navigate to /search

1. Go to `http://localhost:5173`
2. Log in with a test account
3. Navigate to `/search` (via Navbar link)

### 7.2 Manual test flows

**Flow A: Click a tag**
1. Observe TagCloud component displaying available tags (loaded from Endpoint 2)
2. Click a tag (e.g., "#Database")
3. Verify SearchResults render two sections: "Related Courses" and "Related Roadmaps"
4. Verify pagination controls appear (prev/next buttons, page indicators)
5. If user is enrolled, verify "Recommended for You" badge appears on matching courses/roadmaps

**Flow B: Enter a keyword**
1. Enter keyword "SQL" in SearchBar
2. Verify results show courses/roadmaps matching keyword (full-text search)
3. Verify results are sorted by relevance (default)
4. Execute same search again → verify same results (no randomness)

**Flow C: Apply multiple filters**
1. Enter keyword or click tag
2. Open FilterBar and select Level=Intermediate, Domain=Backend
3. Verify results are filtered (AND semantics): only courses tagged AND level-matched AND domain-matched
4. Clear a filter → verify results update immediately (no re-query needed)
5. Verify filter state persists when switching between pages

**Flow D: Test pagination**
1. Execute search that returns > 20 results
2. Verify page 1 shows courses 1–20
3. Click "Next" or page number → verify page 2 loads
4. Verify prev/next buttons are disabled appropriately (disabled on first/last page)

**Flow E: Test sorting**
1. Execute a keyword search (default: relevance sorting)
2. Verify results are ranked by relevance (MongoDB `textScore`)
3. Switch to "Alphabetical" sort
4. Verify results re-sort alphabetically without re-querying backend (client-side sort)
5. Switch back to "Relevance" → verify relevance ranking restored

**Flow F: Test fallback (optional)**
1. Stop or pause the MongoDB service temporarily
2. Try a search query
3. Verify backend returns `fallbackMode: true` with pre-cached results
4. Verify results are alphabetical (no relevance scoring available)
5. Restart MongoDB → cache is auto-refreshed on next query

---

## 8. Performance Testing (Optional)

### 8.1 Single query timing

Measure latency of a single search query:

```bash
time curl -X POST http://localhost:4000/api/search/query \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "queryType": "keyword", "keyword": "database" }'
```

**Target**: < 500ms for 10K-skill dataset

### 8.2 Concurrent queries

Simulate multiple users searching concurrently:

```bash
# Run 10 searches in parallel
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/search/query \
    -H "Authorization: Bearer <token>" \
    -H "Content-Type: application/json" \
    -d '{ "queryType": "keyword", "keyword": "database" }' &
done
wait
```

Monitor backend logs for latency and error rates.

### 8.3 Cache hit rate

After running for a while, check fallback cache usage:

```bash
# Check how often fallback was triggered (grep backend logs)
grep '\[search\] fallback mode' backend.log | wc -l
```

Low numbers indicate search index is stable; high numbers indicate index reliability issues.

---

## 9. Troubleshooting

### Issue: "No results found" when searching

**Cause**: Skills may not have tags populated yet (Feature 006 not run)
**Solution**:
1. Manually add tags to skills (see section 5.2)
2. Restart backend to rebuild cache
3. Try search again

### Issue: Search queries timeout (>500ms)

**Cause**: MongoDB text index not created, or dataset very large
**Solution**:
1. Verify text index exists: `db.skills.getIndexes()`
2. If missing, run `await initializeSearchIndex()` manually
3. Check dataset size: `db.skills.estimatedDocumentCount()`
4. If > 50K, consider Elasticsearch (Phase 2)

### Issue: Personalization highlighting not working

**Cause**: User not enrolled in a roadmap, or `enrolledRoadmapId` not matching
**Solution**:
1. Verify user is enrolled: `db.student_profiles.findOne({ userId: "..." })`
2. Verify `enrolledRoadmap` field is set
3. Include `enrolledRoadmapId` in search request body
4. Check browser console for personalization fetch errors

### Issue: Filters dropdown empty

**Cause**: Filter endpoint may be timing out
**Solution**:
1. Manually call `/api/search/filters` to check response
2. Verify skills, courses, roadmaps collections have data
3. Check MongoDB logs for slow queries
4. Restart backend if collections updated externally

---

## 10. Integration Checklist

After completing quickstart:

- [ ] Backend routes mounted (`app.use('/api/search', searchRoutes)`)
- [ ] Text index created on `skills` collection
- [ ] Search cache initialized and scheduled refresh running
- [ ] Frontend route `/search` registered and accessible
- [ ] Navigation link added to navbar
- [ ] Personalization hook integrated in App.jsx
- [ ] All three endpoints tested (POST /query, GET /filters, GET /personalization)
- [ ] Manual UI flows tested (tag click, keyword search, filters, pagination, sorting)
- [ ] Performance target met (<500ms p95 latency for test queries)
- [ ] No console/backend errors during normal usage

Next: Run `/speckit.tasks` to generate Phase 2 implementation tasks.
