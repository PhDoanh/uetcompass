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
| `major` | String | on submit | `null` | Non-empty when `isDraft: false` | Selected from `programs.nameEN` |
| `completedCourses` | Array<{ major, courseCode, courseUnitId? }> | no | `[]` | Canonical identity = (`major`, `courseCode`); `courseUnitId` optional ObjectId ref `course_units` | Completion flag only — no grade stored |
| `careerGoal.role` | String\|null | no | `null` | Must exist in selected major's `programs.careerTracks` | Dropdown-selected value only |
| `careerGoal.graduationTimeline` | String\|null | no | `null` | Must be a valid `YYYY-MM-DD` date | Date-picker selected value |
| `submittedAt` | Date\|null | no | `null` | Set once on submit; never overwritten | `null` while draft |
| `createdAt` | Date | auto | `Date.now()` | Set on first upsert (`$setOnInsert`) | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every `PUT /onboarding/draft` and on submit | |

> `careerGoalRole` is a downstream/read-model alias and MUST always be read from `careerGoal.role`.
>
> `privacySetting` is intentionally excluded from `StudentProfile`; ownership belongs to `User` (feature 005).
>
> Non-MVP onboarding attributes are intentionally excluded from `StudentProfile` in this phase.

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `userId_unique` | `userId` | **Unique** | One profile per student (BR-001); fast lookup by auth token |

### Validation rules applied at service layer

Career-goal fields are validated before upsert/submit: `careerGoal.role` must be a member of `programs.careerTracks` for the currently selected major (`programId`), and `careerGoal.graduationTimeline` must be a valid `YYYY-MM-DD` date string (see [research.md R-004](research.md)). `null` and empty values both pass for optional fields and are treated as "not provided".

For `completedCourses`, service layer canonicalizes identity by (`major`, `courseCode`) and de-duplicates repeated entries in the same payload. Only courses that map to `course_units` rows with resolved selected `programId` and `type = "elective"` are accepted. `courseUnitId` is optional and does not change identity semantics.

## Pre-Implementation Policy

This specification update is contract-alignment only. No runtime data migration/backfill is performed in onboarding APIs. Any one-off migration (if required) is handled separately as an operational task.

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

## Referenced Entity: Program (read-only from this feature)

**MongoDB collection**: `programs`
**Owned by**: Curriculum / catalog seeding feature (out of scope for this plan)

| Field | Type | Notes |
|---|---|---|
| `programId` | String | Unique identifier for a program; used to join to `course_units.programId` |
| `nameEN` | String | Source of major dropdown display values in onboarding |
| `careerTracks` | Array<String> | Source of Target role dropdown options for students selecting this program |

See details in [data-model.md for curriculum seeding feature](../002-seed-ctdt-dag/data-model.md)

**Access pattern from onboarding module**:
- Fetch all `programs` to populate major dropdown from `nameEN`.
- Resolve selected `nameEN` to its `programId`.
- Read selected program's `careerTracks` to populate and validate Target role options.

---

## Referenced Entity: CourseUnit (read-only from this feature)

**MongoDB collection**: `course_units`
**Owned by**: Curriculum / catalog seeding feature (out of scope for this plan)

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | Optionally referenced by `StudentProfile.completedCourses[].courseUnitId` |
| `code` | String | e.g., `"INT2204"` |
| `name` | String | Display name for the multi-select UI |
| `programId` | String | Filter anchor resolved from selected program |
| `type` | String | Only rows with `type = "elective"` are displayed in completed-courses selector |
| `source.url` | String | Source of the link labeled "Required Courses" (picked from any row matching selected `programId`) |

See details in [data-model.md for curriculum seeding feature](../002-seed-ctdt-dag/data-model.md)

**Access pattern from onboarding module**:
- `find({ programId, type: "elective" })` on draft hydration and on major change for completed-courses options.
- `find({ programId })` and select one row with non-empty `source.url` to populate the "Required Courses" link.
- No writes. `courseUnitId` (when present) is used as join optimization only; canonical matching remains (`major`, `courseCode`).

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
