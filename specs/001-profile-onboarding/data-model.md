# Data Model: Student Profile Onboarding

**Feature**: `001-profile-onboarding`
**Date**: 2026-03-07
**Research dependency**: [research.md](research.md) (R-002, R-004, R-005, R-007)

---

## Entity: StudentProfile

**MongoDB collection**: `student_profiles`

**Purpose**: Single document per authenticated student that progresses from a mutable draft (auto-saved) to an immutable submitted profile. Submission is irreversible.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `userId` | ObjectId | yes | — | **Unique index**; ref: `users` | Foreign key to authenticated user |
| `isDraft` | Boolean | yes | `true` | — | `false` = submitted; **irreversible once false** |
| `major` | String | on submit | `null` | Non-empty when `isDraft: false` | Selected from predefined UET major list |
| `completedCourseIds` | ObjectId[] | no | `[]` | Each element ref: `course_units` | Completion flag only — no grade stored |
| `careerGoal.role` | String\|null | no | `null` | maxlength: 500; `validateFreeText` if non-null | Predefined option or free-text |
| `careerGoal.companyType` | String\|null | no | `null` | maxlength: 500; `validateFreeText` if non-null | Predefined option or free-text |
| `careerGoal.graduationTimeline` | String\|null | no | `null` | maxlength: 100 | Free-form, e.g. "3 semesters" or "2027-06" |
| `personalAspirations` | String\|null | no | `null` | maxlength: 1000; `validateFreeText` if non-null | Free-text goals / constraints |
| `submittedAt` | Date\|null | no | `null` | Set once on submit; never overwritten | `null` while draft |
| `createdAt` | Date | auto | `Date.now()` | Set on first upsert (`$setOnInsert`) | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every `PUT /onboarding/draft` and on submit | |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_unique` | `userId` | **Unique** | One profile per student (BR-001); fast lookup by auth token |

### Validation rules applied at service layer

All free-text fields (`careerGoal.role`, `careerGoal.companyType`, `personalAspirations`) are passed through `validateFreeText()` (see [research.md R-004](research.md)) before upsert. `null` and empty string after trimming both pass — the field is treated as "not provided".

---

## State Machine

```text
                 ┌──────────────────────────────────────────┐
                 │             StudentProfile                │
                 └──────────────────────────────────────────┘

  [non-existent]
       │
       │  PUT /onboarding/draft (first call, upsert with isDraft: true)
       ▼
    [draft]   { isDraft: true,  submittedAt: null }
       │
       │  POST /onboarding/submit
       │  ── filter: { userId, isDraft: true }
       │  ── if filter misses → 409 Conflict (already submitted or not found)
       ▼
  [submitted]  { isDraft: false, submittedAt: <Date> }
       │
       │  (no further transitions — system MUST NOT allow revert to draft)
```

**Transition guards**:

| From | To | Guard | Failure response |
|---|---|---|---|
| non-existent | draft | `upsert: true` + unique index on `userId` — concurrent duplicate insert fails | Second concurrent call gets `409 Conflict` |
| draft | submitted | DB-level: `findOneAndUpdate({ userId, isDraft: true })` returns null if already `false` | `409 Conflict` — "Profile already submitted" |
| submitted | draft | **Forbidden** — no code path exists; service layer has no `revertSubmit` function | N/A |

---

## Referenced Entity: CourseUnit (read-only from this feature)

**MongoDB collection**: `course_units`
**Owned by**: Curriculum / catalog seeding feature (out of scope for this plan)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Referenced by `StudentProfile.completedCourseIds` |
| `code` | String | e.g., `"INT2204"` |
| `name` | String | Display name for the multi-select UI |
| `major` | String | Used as filter: `CourseUnit.find({ major })` |

See details in [data-model.md for curriculum seeding feature](../002-seed-ctdt-dag/data-model.md)

**Access pattern from onboarding module**: `find({ major })` on `GET /onboarding/draft` response enrichment and on major change. No writes.

---

## In-Memory Entity: SSE Connection Store

**Not persisted** — lives only in the Node.js process heap. Lost on Render restart (expected; SSE clients reconnect automatically via `EventSource`'s built-in retry).

| Property | Value |
|---|---|
| Type | `Map<string, Express.Response>` |
| Key | `userId.toString()` |
| Value | Active Express `res` object for the SSE stream |
| Max entries | One per authenticated user with an open tab |
| Cleanup | `res.on('close', ...)` removes entry + clears heartbeat interval |

**See**: [research.md R-001](research.md) for implementation pattern, [research.md R-008](research.md) for missed-event fallback behaviour.
