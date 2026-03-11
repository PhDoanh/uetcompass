# Quickstart: Roadmap Community

**Feature**: `010-roadmap-community`  
**Date**: 2026-03-11  
**Prerequisites**: Feature 001 (Profile Onboarding) and Feature 009 (Roadmap Generator) must be running — this feature reads `StudentProfile` (completedCourseIds, careerGoalRole, major, privacySetting), `Roadmap` (acceptedAt, nodes, personalisationLevel), and delegates fork acceptance to Feature 009's accept endpoint.

---

## 1. Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 20 LTS | `node --version` |
| npm | ≥ 10 | `npm --version` |
| MongoDB Atlas URI | M0 free | env var `MONGODB_URI` |
| Features 001, 009 | running | Student has an accepted roadmap in DB |

---

## 2. Environment Variables

Add to `backend/.env`:

```env
# Existing — no change needed
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/uetcompass
JWT_ACCESS_SECRET=<same secret used by auth middleware>
PORT=4000

# New for this feature
MAJOR_GROUP_CONFIG='{"Công nghệ thông tin":"CS-related","Kỹ thuật máy tính":"CS-related","Toán tin":"CS-related"}'
```

`Y_DAY_HOLD_DAYS` is stored in the `system_config` MongoDB collection and defaults to `7` if absent. To override locally, insert a document:

```js
// Run in mongosh or Atlas Data Explorer
db.system_config.insertOne({ key: 'Y_DAY_HOLD_DAYS', value: 7, updatedAt: new Date() })
```

Frontend (`frontend/.env.local` — already present from Feature 005):

```env
VITE_API_URL=http://localhost:4000
```

---

## 3. Backend — Register the Community Module

### 3.1 Seed the DB indexes

On first startup, Mongoose will create the indexes defined in the schemas. To verify:

```js
// mongosh
db.share_links.getIndexes()
// Expect: token_unique (unique) and userId_active_partial (unique partial)

db.community_entries.getIndexes()
// Expect: userId_unique (unique)

db.like_records.getIndexes()
// Expect: userId_entryId_unique (unique compound)
```

### 3.2 Mount the community module (NestJS)

In `backend/src/app.module.ts`, add `CommunityModule` to the `imports` array:

```ts
import { CommunityModule } from './modules/community/community.module';

@Module({
  imports: [
    // existing modules...
    CommunityModule,
  ],
})
export class AppModule {}
```

### 3.3 Start the backend

```bash
cd backend
npm install
npm run start:dev
```

---

## 4. Running Tests

```bash
cd backend
npm test -- --testPathPattern=community
```

All tests mock MongoDB — no Atlas connection required locally.

---

## 5. Manual Test Scenarios

### Scenario 1 — Share link generation and snapshot isolation

**Setup**: Student A has an accepted roadmap held for ≥ Y days.

1. `POST /api/community/share-links` → `201` with `token`
2. `GET /api/community/share-links/:token` (no auth) → `200` with node array; confirm `supportingSkills` and `careerRelevanceNote` are absent
3. Accept a new roadmap for Student A via Feature 009
4. `GET /api/community/share-links/:token` again → `200` with the **original** snapshot (not the new roadmap) — confirms snapshot isolation
5. `DELETE /api/community/share-links` → `204`
6. `GET /api/community/share-links/:token` → `404` — confirms revocation

### Scenario 2 — Community publish, re-publish, like count preservation

**Setup**: Student A has an accepted roadmap held for ≥ Y days.

1. `POST /api/community/entries` → `201`
2. `GET /api/community/entries` (as Student B) → entry appears in feed
3. `POST /api/community/entries/:entryId/likes` (as Student B) → `201` with `likeCount: 1`
4. Accept a new roadmap for Student A → wait for Y days (or set `Y_DAY_HOLD_DAYS: 0` in DB for testing)
5. `POST /api/community/entries` (as Student A) → `200` (re-publish replaces entry)
6. `GET /api/community/entries/:entryId` → `likeCount` is still `1` — confirms preservation

### Scenario 3 — Time-gate blocks new sharing

**Setup**: Student A accepts a new roadmap (Y-day clock resets).

1. `POST /api/community/share-links` → `403` with `daysUntilEligible: N`
2. `POST /api/community/entries` → `403` with `daysUntilEligible: N`
3. Set `Y_DAY_HOLD_DAYS: 0` in `system_config` → wait 60s for cache to invalidate
4. Both actions now return `201` / `200`

### Scenario 4 — Fork with completed course filtering

**Setup**: Student A forks Student B's community entry. Student A has `completedCourseIds: ["INT2204"]`. B's roadmap contains `INT2204` plus other courses.

1. `POST /api/community/entries/:entryId/fork` (as Student A) → `200`
2. Verify response `filteredNodeCount` is less than B's `nodeCount` (INT2204 excluded)
3. Check Student A's accepted roadmap in DB — must NOT contain `INT2204`

### Scenario 5 — Privacy toggle

**Setup**: Student A publishes a community entry in **identified** mode.

1. `GET /api/community/entries` → `owner.displayName` is real name, `owner.major` is exact major
2. Toggle Student A's `privacySetting` to `'anonymous'` (via Feature 005 account settings or direct DB update)
3. `GET /api/community/entries` → `owner.displayName` is `"Anonymous"`, `owner.major` is the major group label — **no re-publish required**
