# Research: Roadmap Community

**Feature**: `010-roadmap-community`  
**Date**: 2026-03-11  
**Feeds into**: [plan.md](plan.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md)

---

## R-001: Snapshot Storage — Embedded vs Separate Collection

**Question**: Should the roadmap node content captured at share-link generation or community publish time be stored embedded inside the ShareLink/CommunityEntry document, or in a separate `RoadmapSnapshot` collection with a reference?

**Decision**: Separate `RoadmapSnapshot` collection. Both `ShareLink` and `CommunityEntry` store a `snapshotId` reference.

**Rationale**:
- Both `ShareLink` and `CommunityEntry` need to capture the same structure (filtered node array). A single `RoadmapSnapshot` collection avoids duplicating the capture/filtering logic and allows both documents to reference the same schema.
- On re-publish, `CommunityEntry` gets a new `snapshotId` pointing to a freshly captured snapshot while the old snapshot is retained; old `ShareLinks` continue to resolve correctly.
- `supportingSkills` and `careerRelevanceNote` are excluded at capture time — the snapshot never contains them, so no response-layer filtering is needed.

**Alternatives considered**:
- Embedded in parent document: Simpler read (no join), but snapshot structure is duplicated across two parent schemas and document size grows unbounded with roadmap length. Rejected.
- Re-derive from audit log: No version history stored in this system. Rejected.

---

## R-002: Like Count Preservation on Re-publish

**Question**: When a student re-publishes (replacing their community entry with a new snapshot), how is the like count preserved?

**Decision**: `likeCount` is a counter field on `CommunityEntry`. Re-publish uses `findOneAndUpdate` with `$set` containing only snapshot-related fields (`snapshotId`, `exactMajor`, `majorGroup`, `careerGoalRole`, `personalisationLevel`, `publishedAt`). `likeCount` is NOT included in the `$set` — MongoDB leaves it unchanged.

**Rationale**:
- Re-publishing updates content but preserves social engagement. A student's peers who liked the entry retain their signal even after the content is refreshed.
- The `LikeRecord` collection (separate, per-user-per-entry) serves as the source of truth for uniqueness; `likeCount` is a denormalized counter for fast read on every feed card.

**Alternatives considered**:
- Delete-and-recreate CommunityEntry on publish: Resets like count to 0 and loses the document `_id`. Rejected.
- Recount from `LikeRecord` on every read: Aggregation cost on every feed render. Rejected.

---

## R-003: Fork Flow — Canonical Completed-Course Filtering + 009 Fork-Consumable Contract

**Question**: When student A forks student B's community roadmap, what is the canonical course-identity rule for filtering completed courses, what call contract should be used with Feature 009, and in what order should operations execute?

**Decision**:
1. Filter out completed courses **before** any prerequisite validation.
2. Use canonical course identity tuple **`(major, courseCode)`** for duplicate-course distinction and completed filtering.
3. Submit the remaining roadmap to Feature 009's new **fork-consumable endpoint** using the **full roadmap node payload** (not course codes only).

**Filter source**: canonical completed-course records from the forking student's `StudentProfile` (Feature 001), compared by `(major, courseCode)`; `courseUnitId` is optional optimization metadata only.

**Fork pipeline**:
```
1. Read CommunityEntry → snapshotId → RoadmapSnapshot.nodes[] (full node objects)
2. Read forking student's StudentProfile completed-course records
3. Build set of completed keys by `(major, courseCode)`
4. Resolve `major` for each snapshot node (`node.major` when available, otherwise derive from course catalog mapping), then filter:
  `filteredNodes = snapshot.nodes.filter(n => !completedSet.has(key(resolveMajor(n), n.courseCode)))`
5. If `filteredNodes` is empty → return `422 ALL_COMPLETED`
6. POST `filteredNodes` (full nodes payload) to Feature 009 fork-consumable endpoint (which runs prerequisite validation)
7. If 009 returns success → persist new accepted roadmap and run post-success side effects:
  - reset Y-day eligibility clock (normal acceptance semantics),
  - emit user notification,
  - write audit log,
  - update progress tracking state if Feature 007 integration is present.
8. If 009 returns validation failure → surface 009's `PREREQUISITE_VIOLATION` payload; no state change in community/share records.
```

**Rationale**:
- Submitting already-completed courses to prerequisite validation is semantically incorrect. Pre-filtering guarantees that validation evaluates only remaining work.
- `(major, courseCode)` alignment matches Feature 001 canonical contract and avoids ambiguity when course codes overlap across majors.
- Feature 009 owns validation and acceptance semantics; Feature 010 sends fork-ready payload to the dedicated 009 contract.

**Alternatives considered**:
- No filtering (Option A): Redundant completed courses in new roadmap. Confusing UX. Rejected.
- "Already done" annotation (Option C): Requires a new field on RoadmapNode, changes to Feature 009 and Feature 004 schemas. Disproportionate complexity. Rejected.

---

## R-004: Anonymous Privacy Substitution — Response-time vs Stored

**Question**: Should anonymous mode be implemented by storing anonymised values, or by substituting at query/response time?

**Decision**: Substitution at response time only. `CommunityEntry` always stores raw values (`exactMajor`, `userId` for display name lookup). When building any community or share-link response payload, the service reads `privacySetting` from **`User` (Feature 005)** and applies:
- `privacySetting === 'anonymous'` → `displayName: "Anonymous"`, `major: majorGroupLabel`
- `privacySetting === 'identified'` → `displayName: <displayName if present, else system fallback name policy>`, `major: exactMajor`

Raw stored data is never altered by a privacy toggle.

**Rationale**:
- A student can toggle privacy freely and immediately (FR-020). If the stored value changed, every toggle would require updating all community entries and share links. Response-time substitution responds instantly with no DB writes.
- Constitution Principle III: store minimum necessary data. One source of truth; no sync problem.
- Using the global fallback-name policy keeps UI naming behavior consistent across features when `displayName` is missing/blank.

**Alternatives considered**:
- Store both raw and anonymised: Redundant data, sync problem on display name changes. Rejected.
- Store only anonymised when anonymous: Loses raw data needed for identified mode. Rejected.

---

## R-005: Y-Day Time-Gate Configuration

**Question**: Should Y (minimum hold period in days) be an environment variable or a DB config document?

**Decision**: DB config document in a shared `system_config` collection (`{ key: 'Y_DAY_HOLD_DAYS', value: 7 }`), with an in-process 60-second cache (module-level variable). Default: `7` if document absent.

**Rationale**:
- Changing an env var on Render triggers a redeploy (~50s cold start). A DB document can be updated via the Atlas UI or a future admin endpoint with no deployment.
- A 60-second in-process cache ensures every request doesn't hit MongoDB for the config value, while still picking up changes within one minute.

**Alternatives considered**:
- Env var only: Requires redeployment to change. Violates FR-003. Rejected.
- Redis cache: Constitution prohibits Redis. Rejected.

---

## R-006: Feed Ordering — Major-Relevance Ranking

**Question**: The spec requires entries from the viewer's major group to appear first. How should this be implemented?

**Decision**: MongoDB aggregation pipeline with `$addFields` + `$cond` to compute a `relevanceScore` (1 = same major group, 0 = other), then `$sort: { relevanceScore: -1, publishedAt: -1 }`.

```js
CommunityEntry.aggregate([
  { $match: filters },
  { $addFields: {
      relevanceScore: {
        $cond: [{ $eq: ['$majorGroup', viewerMajorGroup] }, 1, 0]
      }
  }},
  { $sort: { relevanceScore: -1, publishedAt: -1 } },
  { $skip: (page - 1) * limit },
  { $limit: limit }
]);
```

**Rationale**:
- `majorGroup` is already stored on `CommunityEntry` (it is the anonymous-safe display value). Comparing it against the viewer's major group is O(1) per document.
- Computed field — no additional index needed. Secondary sort by `publishedAt: -1` gives recency ordering within each tier.

**Alternatives considered**:
- Application-level sort (fetch all, sort in JS): Unworkable even at 500 entries when each has an embedded node array. Rejected.
- Stored relevance score: Would need recomputing per viewer. Not meaningful to store. Rejected.

---

## R-007: Share Link Uniqueness — One Active Link per Student

**Question**: FR-004 allows at most one active share link per student. How should this be enforced?

**Decision**: Partial unique index on `{ userId: 1 }` where `status: 'active'`, plus an application-level pre-check that returns a clear 409 error if an active link already exists.

```ts
ShareLinkSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);
```

Revoked links remain in the collection for audit and do not interfere with the uniqueness constraint because they have `status: 'revoked'` (excluded from the partial index).

**Rationale**:
- DB-level enforcement prevents race conditions. Application-level pre-check gives a user-friendly error message before hitting the DB constraint violation.
- Partial index is lighter than a full unique index — only the one active-per-student constraint is enforced; multiple revoked documents per student are allowed.

**Alternatives considered**:
- Application-level check only: Race condition under concurrent requests. Rejected.
- Soft-delete on revoke (remove document): Loses audit trail. Rejected.
