# Data Model: Student Account Management

**Feature**: `005-account-management`
**Date**: 2026-03-11
**Research dependency**: [research.md](research.md) (R-002, R-003, R-004, R-005, R-006, R-007, R-008, R-010)

---

## Entity: User (`users` collection)

**MongoDB collection**: `users`

**Purpose**: Primary account document for every UET student. Owns authentication credentials, account status, global account preferences (`privacySetting`), identity fields (`displayName` public + `fullName` private/editable), lockout state, OTP sub-documents, linked Google accounts, and the deletion token. Created at registration (status `pending-verification`); activated after OTP verification.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | MongoDB primary key |
| `email` | String | yes | — | **Unique index**; must end in `@vnu.edu.vn`; lowercased at write | Auth identifier |
| `passwordHash` | String\|null | no | `null` | bcryptjs hash (12 rounds) | `null` for Google-only accounts |
| `displayName` | String\|null | no | `null` | maxlength: 120; trimmed; empty string normalized to `null` | Primary public identity field (owner: Feature 005) |
| `fullName` | String | yes | — | maxlength: 200; non-empty after trim | Editable independently from `displayName` |
| `privacySetting` | String (enum) | yes | `'identified'` | `identified \| anonymous` | Global account preference (owner: Feature 005) |
| `avatarUrl` | String\|null | no | `null` | Valid URL or `null` | Stored as URL, not binary |
| `status` | String (enum) | yes | `'pending-verification'` | `pending-verification \| active \| locked \| deleted` | See state machine below |
| `failedLoginAttempts` | Number | yes | `0` | ≥ 0; reset to 0 on success | Consecutive wrong-password counter |
| `lockedUntil` | Date\|null | yes | `null` | `null` = not locked | Set to `now + 15min` on 5th failure |
| `linkedGoogleAccounts` | Object[] | no | `[]` | Each: `{ googleId: String, email: String }` | Multiple `@vnu.edu.vn` Google accounts; no size limit |
| `emailVerification` | Object\|null | no | `null` | See sub-schema below | Populated at registration; nulled on verify |
| `passwordReset` | Object\|null | no | `null` | See sub-schema below | Populated at forgot-password; nulled on use |
| `deletionToken` | Object\|null | no | `null` | See sub-schema below | Populated on deletion request; nulled after execution |
| `createdAt` | Date | auto | `Date.now()` | — | |
| `updatedAt` | Date | auto | `Date.now()` | Updated on every write | |

#### Sub-schema: `emailVerification`

| Field | Type | Notes |
|---|---|---|
| `otp` | String | 4-digit plaintext code |
| `expiresAt` | Date | `now + 2 min` |
| `verified` | Boolean | `false` → `true` on correct OTP entry |

#### Sub-schema: `passwordReset`

| Field | Type | Notes |
|---|---|---|
| `otp` | String | 4-digit plaintext code |
| `expiresAt` | Date | `now + 2 min` |
| `attempts` | Number | Wrong-entry counter; max 10 before invalidation |

#### Sub-schema: `deletionToken`

| Field | Type | Notes |
|---|---|---|
| `hash` | String | SHA-256 of the raw token sent in email |
| `expiresAt` | Date | `now + 1 hour` |
| `used` | Boolean | `false` → `true` on first click; prevents double-execution |

### Indexes

| Name | Fields | Type | Enforces |
|---|---|---|---|
| `_id` (default) | `_id` | Unique | MongoDB default |
| `email_unique` | `email` | **Unique** | One account per email (across all auth methods) |

### Identity rendering policy (global)

Any user-facing identity rendering MUST follow this order:

1. Valid `displayName` (non-empty after trim, passes name validation)
2. `fullName`
3. Sanitized email local-part (substring before `@`, non `[a-zA-Z0-9._-]` chars removed)
4. Literal fallback `"Student"`

**Notes**:
- `privacySetting = anonymous` does not delete identity fields; it changes which fields public surfaces may expose directly.
- API responses may include a server-computed effective display value to guarantee consistent rendering across clients.

### Account State Machine

```text
  [non-existent]
       │
       │  POST /api/auth/register  (form submit → OTP sent)
       ▼
  [pending-verification]  { status: 'pending-verification', emailVerification.verified: false }
       │                 │
       │  OTP correct    │  OTP expires (2 min), no entry
       │  within 2 min   ▼
       │          [locked]  { status: 'locked' }
       │                │
       │                │  Student requests new OTP → correct OTP entered
       │                │
       └────────────────┘
       ▼
    [active]  { status: 'active' }
       │
       │  (normal use — can be re-locked by login failures)
       │
       │  5 consecutive wrong passwords
       │  → lockedUntil = now + 15 min   (status stays 'active'; lockedUntil is the lock mechanism)
       │  → after 15 min: lockedUntil = null (auto-resolved by service check)
       │
       │  Deletion confirmation link clicked
       ▼
  [deleted]  { status: 'deleted' }  → immediately deleted from collection; email → deleted_emails
```

**Note**: The login-failure lockout does **not** change `status` — it uses `lockedUntil` on an `active` account. Only unverified-OTP-timeout transitions to `status: 'locked'`. This distinction is important: a `locked` status account requires a new OTP; an `active` account with `lockedUntil` in the future just needs to wait 15 minutes.

**State transition guards**:

| From | To | Trigger | Guard |
|---|---|---|---|
| non-existent | pending-verification | `POST /api/auth/register` | unique email check |
| pending-verification | active | Correct OTP within 2 min | `emailVerification.expiresAt > now` AND OTP matches |
| pending-verification | locked | OTP not verified within 2 min | Service TTL check or scheduled scan |
| locked | active | Correct OTP after resend | New OTP issued, matches, within 2 min |
| active | active (login-locked) | 5 consecutive failures | `lockedUntil` set; status unchanged |
| active | deleted | Deletion confirmation link | `deletionToken.hash` matches, not expired, not used |

---

## Entity: RefreshToken (`refresh_tokens` collection)

**MongoDB collection**: `refresh_tokens`

**Purpose**: Stores hashed refresh tokens to enable secure session management, logout, and theft detection via family-based revocation.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | |
| `userId` | ObjectId | yes | — | Index; ref: `users` | |
| `tokenHash` | String | yes | — | **Unique index**; SHA-256 of raw token | Lookup key on `/refresh` |
| `family` | String | yes | — | UUID v4; same across all rotations of one login session | Used for reuse detection cascade |
| `expiresAt` | Date | yes | — | **TTL index** | Auto-purged after expiry; 7 days from issue |
| `revokedAt` | Date\|null | yes | `null` | `null` = active | Set on logout or reuse detection |
| `createdAt` | Date | auto | `Date.now()` | — | |

### Indexes

| Name | Fields | Type | Notes |
|---|---|---|---|
| `tokenHash_unique` | `tokenHash` | **Unique** | O(log n) lookup on refresh; prevents race conditions |
| `userId_idx` | `userId` | Regular | Fetch all tokens for a user (logout-all, delete cascade) |
| `family_idx` | `family` | Regular | Family revocation on reuse detection |
| `ttl_idx` | `expiresAt` | **TTL** (`expireAfterSeconds: 0`) | Auto-deletes expired documents — no cron needed |

### Rotation behaviour

```text
POST /api/auth/refresh:
  1. Find token by tokenHash
     └─ not found → 401 INVALID_TOKEN
     └─ revokedAt !== null → REUSE DETECTED:
          revoke entire family → 401 TOKEN_REUSE_DETECTED
     └─ expiresAt < now → 401 TOKEN_EXPIRED
  2. Revoke old token (set revokedAt = now)
  3. Issue new token (same family, new hash, new expiresAt)
  4. Issue new access token JWT (15 min)
  5. Set new RT in httpOnly cookie
```

---

## Entity: Notification (`notifications` collection)

**MongoDB collection**: `notifications`

**Purpose**: Persistent in-app notifications. Created by auth module (type `REPERSONALIZE`) and onboarding module (types `ROADMAP_READY`, `ROADMAP_FAILED`). Delivered via SSE push when connected; fetched on mount when offline.

### Schema

| Field | Type | Required | Default | Constraints | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | — | — | |
| `userId` | ObjectId | yes | — | Index; ref: `users` | |
| `type` | String (enum) | yes | — | `ROADMAP_READY \| ROADMAP_FAILED \| REPERSONALIZE` | |
| `message` | String | yes | — | maxlength: 500 | Displayed in notification UI |
| `link` | String\|null | no | `null` | Valid path (e.g., `/roadmap`) | Navigation target on click |
| `read` | Boolean | yes | `false` | — | Set `true` when student dismisses notification |
| `createdAt` | Date | auto | `Date.now()` | — | |

### Indexes

| Name | Fields | Type | Notes |
|---|---|---|---|
| `userId_read_idx` | `{ userId, read }` | Compound | Fast unread fetch: `find({ userId, read: false })` |

---

## Entity: DeletedEmail (`deleted_emails` collection)

**MongoDB collection**: `deleted_emails`

**Purpose**: Tracks email addresses of hard-deleted accounts to permit re-registration with the same address. A deleted email in this collection is **not** a blocker — it is a record that the deletion occurred. Registration checks `users.email` first (unique index); the `deleted_emails` collection serves only as an audit trail and allows the application to clearly distinguish "never registered" from "previously deleted".

### Schema

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | — | |
| `email` | String | yes | — | **Unique index** (prevents duplicate deletion records) |
| `deletedAt` | Date | yes | `Date.now()` | Timestamp of account deletion execution |

### Indexes

| Name | Fields | Type |
|---|---|---|
| `email_unique` | `email` | **Unique** |

---

## Modified Entity: StudentProfile (Feature 001 — extended here)

**MongoDB collection**: `student_profiles`
**Owned by**: Feature 001 (Profile Onboarding)

This feature adds one field to the existing `StudentProfile` schema:

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `repersonalizationPending` | Boolean | yes | `false` | Set to `true` by Feature 004 when onboarding profile fields change in Account Settings; read and cleared to `false` by Feature 004 when student acts on Re-personalize |

**Cross-feature boundary**: Feature 004 writes this field via `StudentProfile.updateOne({ userId }, { $set: { repersonalizationPending: true } })` (service-layer call from `profileSettings.service.js`). Feature 004 reads and clears it. Feature 001 does not interact with this field.

---

## Referenced Entity: CourseUnit (read-only)

**MongoDB collection**: `course_units`
**Owned by**: Feature 002 (Seed CTDT DAG)

Used in Account Settings when rendering/editing the `completedCourseIds` multi-select (same as Feature 001 onboarding form). Access pattern: `CourseUnit.find({ major })` — read-only, no writes from this feature.
