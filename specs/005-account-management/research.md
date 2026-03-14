# Research: Student Account Management

**Feature**: `005-account-management`
**Date**: 2026-03-11
**Status**: Complete — all unknowns resolved

---

## R-001: Google Sign-In Account Picker on the Web

**Decision**: Use `@react-oauth/google` on the frontend (React wrapper for Google Identity Services / GIS). Use `google-auth-library` (`OAuth2Client.verifyIdToken`) on the backend. The account picker popup is triggered via the `<GoogleLogin>` component (which calls GIS's popup UX and shows all Google accounts the user has signed in to in their browser). Domain enforcement happens server-side only — client-side `hd` hint is advisory.

**Rationale**: `@react-oauth/google` is the standard React wrapper for GIS with zero dependencies, built-in TypeScript types, and automatic GIS script injection. The account picker popup (showing browser-signed-in accounts) is GIS's built-in behavior when using the popup flow. Using `<GoogleLogin>` is the simplest path to receive a raw ID token JWT in the `onSuccess` callback — the ID token is then sent directly to the backend for verification. `firebase/auth` was rejected as it pulls in the full Firebase SDK unnecessarily.

**Pattern**:
```js
// frontend: main.jsx
<GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>

// frontend: LoginPage.jsx
<GoogleLogin
  onSuccess={({ credential }) => authApi.postGoogleLogin(credential)}
  onError={() => setError('Google Sign-In failed — please try again')}
/>

// backend: google.service.js
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) throw new Error('Email not verified by Google');
  if (!payload.email.endsWith('@vnu.edu.vn')) throw new Error('Domain not allowed');
  return { googleId: payload.sub, email: payload.email, name: payload.name };
}
```

**Domain check**: `payload.email.endsWith('@vnu.edu.vn')` with `payload.email_verified === true`. The `hd` field is only present for Google Workspace accounts and may be absent for consumer Gmail accounts even if the email ends in `@vnu.edu.vn` — so `email` suffix check is the authoritative enforcement.

**Alternatives considered**:
- `firebase/auth` (rejected — unnecessary Firebase SDK weight)
- `useGoogleLogin` hook with `flow: 'implicit'` (rejected — returns `access_token`, not `credential` JWT; needs extra step to get ID token)
- Plain GIS `<script>` tag (valid but requires manual `useEffect` wiring; `@react-oauth/google` is simpler)

---

## R-002: OTP Generation and Storage

**Decision**: Generate 4-digit OTP with `crypto.randomInt(1000, 9999)` (cryptographically secure). Store as an embedded sub-document on the `users` document (`emailVerification` and `passwordReset` sub-documents respectively) — no separate collection. TTL enforcement is application-layer: check `otp.expiresAt < Date.now()` in the service.

**Rationale**: Embedding OTP state in the user document avoids an extra collection and keeps the OTP atomically co-located with the account it protects — no JOIN needed. A separate collection with MongoDB TTL index would auto-clean but adds schema complexity for a short-lived artifact. Since OTPs are per-user and there is at most one active OTP per user per flow (registration vs. password reset are separate sub-documents), embedding is safe and sufficient.

**Pattern**:
```js
// Stored in users document:
emailVerification: {
  otp: String,          // plaintext 4-digit code (low-value token, short-lived)
  expiresAt: Date,      // Date.now() + 2 * 60 * 1000
  verified: Boolean,
}
passwordReset: {
  otp: String,
  expiresAt: Date,
  attempts: Number,     // wrong-attempt counter, max 10
  expiresAt: Date,
}

// Service:
function generateOTP() {
  return String(crypto.randomInt(1000, 9999)).padStart(4, '0');
}
function buildOTPExpiry() {
  return new Date(Date.now() + 2 * 60 * 1000);  // 2 minutes
}
```

OTPs are stored in plaintext (4-digit short-lived codes with no persistent value after expiry — the risk of storing them hashed is not worth the complexity overhead for a value that expires in 2 minutes).

**Alternatives considered**:
- Separate `otp_tokens` collection with MongoDB TTL index (rejected — extra collection, extra query on every OTP check; embedding is simpler for per-user single-OTP use case)
- Signed JWT as OTP (rejected — OTP is a 4-digit code intended for manual entry, not a long URL-safe token)

---

## R-003: Password Hashing

**Decision**: `bcryptjs` (pure JavaScript implementation) with **12 salt rounds**.

**Rationale**: `bcryptjs` is pure JS — it installs without native compilation, avoiding Render free-tier build issues that can arise with `bcrypt` (which uses native bindings via `node-gyp`). 12 rounds produces a ~250ms hash on a modern CPU — strong against brute force while staying below the 300ms login target. `argon2` was not chosen because its memory-hardness properties are beneficial but its Node.js binding (`argon2` npm package) has the same native compilation dependency issue as `bcrypt`.

**Pattern**:
```js
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}
async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}
```

**Alternatives considered**:
- `bcrypt` (native) — rejected: Render free-tier `node-gyp` build issues
- `argon2` — rejected: same native build dependency issue; overkill for this scale
- `crypto.pbkdf2` — valid fallback but `bcryptjs` is purpose-built and more audited for password hashing

---

## R-004: JWT Session Strategy (Access Token + Refresh Token)

**Decision**: Short-lived **access token** (HS256 JWT, 15 min) stored in React memory + long-lived **refresh token** (opaque `crypto.randomBytes(64)` hex, 7 days) stored as SHA-256 hash in a `refresh_tokens` MongoDB collection, delivered as `httpOnly; Secure; SameSite=None; path=/api/auth` cookie.

**Rationale**: AT in memory (not `localStorage`) avoids persistent XSS storage — it's lost on page reload but silently re-issued via RT on app mount. RT as an opaque token with SHA-256 hash storage means even a DB leak exposes no usable token. httpOnly cookie eliminates all JS access to the RT. `SameSite=None` is required because Vercel (frontend) and Render (backend) are different eTLD+1 origins.

**RT rotation**: Every `/api/auth/refresh` call atomically revokes the old RT (sets `revokedAt`) and issues a new one in the same `family` UUID. If a stolen old token is replayed (`revokedAt !== null`), the entire family is revoked — forcing re-login on all sessions that share that login. This is the OAuth 2.0 Security BCP refresh token rotation approach.

**Logout**: `POST /api/auth/logout` — finds the RT by hash and sets `revokedAt = now`. TTL index auto-purges the document after `expiresAt`.

**Silent refresh on app mount**:
```js
// AuthProvider.jsx — handles Render cold start
async function silentRefresh(attempt = 0) {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      signal: AbortSignal.timeout(60_000),  // 60s covers ~50s Render cold start
    });
    if (!res.ok) throw new Error(res.status);
    const { accessToken } = await res.json();
    setAccessToken(accessToken);
    scheduleNextRefresh(14 * 60 * 1000);  // re-run at 14 min (before AT expires)
  } catch {
    if (attempt < 2) { await sleep(3000); return silentRefresh(attempt + 1); }
    setUnauthenticated();
  }
}
```

**CORS setup**: `Access-Control-Allow-Origin: <exact origin>` (no wildcard) + `Access-Control-Allow-Credentials: true` — both required for cross-origin cookie delivery.

**Alternatives considered**:
- AT in localStorage (rejected — persistent XSS exposure)
- RT as signed JWT (rejected — still needs DB record for revocation; opaque token is simpler)
- Embedded refresh tokens in user document (rejected — no TTL auto-cleanup, `$push`/`$pull` under concurrency; separate collection with TTL index is cleaner)

---

## R-005: Login Attempt Lockout

**Decision**: Store `failedLoginAttempts: Number` (default 0) and `lockedUntil: Date | null` (default `null`) on the `users` document. On the 5th consecutive failure, set `lockedUntil = Date.now() + 15 * 60 * 1000` and reset `failedLoginAttempts = 0`. Reset both fields to baseline on any successful login.

**Rationale**: Embedding lockout state on the user document keeps it atomic with the account — no extra lookup. Using `lockedUntil` as a timestamp (rather than a boolean flag) means no cron job is needed to clear the lock; the service simply checks `lockedUntil > new Date()`. The remaining lockout time for the error message is `Math.ceil((lockedUntil - Date.now()) / 1000)` seconds.

**Pattern**:
```js
async function attemptLogin(email, password) {
  const user = await User.findOne({ email });
  if (!user) return { error: 'INVALID_CREDENTIALS' };  // no account enumeration

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingSec = Math.ceil((user.lockedUntil - Date.now()) / 1000);
    return { error: 'ACCOUNT_LOCKED', remainingSec };
  }

  const match = await verifyPassword(password, user.passwordHash);
  if (!match) {
    const newCount = user.failedLoginAttempts + 1;
    if (newCount >= 5) {
      await User.updateOne({ _id: user._id }, {
        $set: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000), failedLoginAttempts: 0 }
      });
    } else {
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: newCount } });
    }
    return { error: 'INVALID_CREDENTIALS' };
  }

  await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null } });
  return { user };
}
```

**Alternatives considered**:
- Redis-based rate limiting (rejected — no Redis; MongoDB-only constraint)
- `express-rate-limit` middleware (rejected — IP-based, not account-based; would also block other users behind the same IP/proxy; spec requires per-account lockout)

---

## R-006: Account Hard Delete with Email Confirmation Token

**Decision**: Store deletion token as an embedded sub-document on `users`: `{ hash: String, expiresAt: Date, used: Boolean }`. Raw token is `crypto.randomBytes(32).toString('hex')` (URL-safe); stored hash is `sha256(rawToken)`. On click: hash the incoming token → find user by hash → verify not expired and not used → execute cascade deletion.

**Cascade deletion sequence** (explicit service-layer, no Mongoose middleware):
1. `User.deleteOne({ _id: userId })`
2. `StudentProfile.deleteOne({ userId })`
3. `RefreshToken.deleteMany({ userId })`
4. `Notification.deleteMany({ userId })`
5. `DeletedEmail.create({ email, deletedAt: now })` — to allow re-registration

**`deleted_emails` collection**: `{ email: String (unique), deletedAt: Date }`. Checked at registration: if email exists in `deleted_emails`, it is treated as available for new registration (hard delete removes the restriction).

**Rationale**: Explicit cascade in service layer is more transparent than Mongoose middleware — easier to audit, test, and sequence correctly. A short-lived deletion token (1-hour expiry) stored as a hash prevents replay attacks. The `used: Boolean` guard prevents double-execution if the confirmation URL is clicked twice.

**Alternatives considered**:
- Mongoose `pre('deleteOne')` middleware cascade (rejected — execution order is implicit, hard to test, not compatible with `deleteMany`)
- Separate `deletion_tokens` collection (rejected — overkill for a single-use, short-lived token embedded per user)

---

## R-007: Re-personalization Signal (Feature 004 Integration)

**Decision**: When `PATCH /api/auth/account/profile` saves changes, `profileSettings.service.js` compares new values against the stored `StudentProfile` for the 6 onboarding fields (major, completedCourseIds, careerGoal.role, careerGoal.companyType, graduationTimeline, personalAspirations). If any changed, it sets `student_profiles.repersonalizationPending = true` via `StudentProfile.updateOne()` (service-layer call — no direct cross-module import), and creates a `Notification` record of type `REPERSONALIZE` with a link to the roadmap.

**SSE delivery**: Uses the shared `notification.sse.js` (same pattern as `onboarding.sse.js` from Feature 001 — `Map<userId, res>` + `notifyUser(userId, event, data)`). If the student is not currently connected, the notification persists in the `notifications` collection and is fetched on next mount.

**Feature 004 reads**: `GET /api/roadmap/status` (Feature 004's responsibility) reads `student_profiles.repersonalizationPending` to decide whether to show the "Re-personalize" button. When the student acts on it, Feature 004 clears the flag via `StudentProfile.updateOne({ userId }, { $set: { repersonalizationPending: false } })`.

**Rationale**: A boolean flag on `StudentProfile` is the simplest cross-feature signal — no event bus, no queue, no additional storage beyond what already exists. The flag is owned by the `student_profiles` collection (Feature 001) but is set by Feature 004 and read/cleared by Feature 004 via the service layer, maintaining the module boundary.

**Alternatives considered**:
- Event emitter (rejected — in-process only, lost on Render restart; fragile)
- Separate `personalization_signals` collection (rejected — overkill; the flag is a single boolean that belongs on the profile document)

---

## R-008: In-App Notification Persistence

**Decision**: `notifications` collection in MongoDB — `{ _id, userId (indexed), type (enum), message, link, read (Boolean, default false), createdAt }`. SSE push (via `notification.sse.js`) for connected clients. On reconnect or mount, `GET /api/notifications?read=false` fetches all unread notifications.

**Rationale**: A persistent `notifications` collection ensures notifications are not lost when the student is offline at the time of the event (e.g., roadmap ready while the tab is closed). The unread-fetch-on-mount pattern is identical to the "roadmap status check" pattern from Feature 001 and keeps the SSE as an enhancement (not a requirement) for real-time delivery.

**`type` enum**: `['ROADMAP_READY', 'ROADMAP_FAILED', 'REPERSONALIZE']` — extensible by other features. Feature 001 creates `ROADMAP_READY` / `ROADMAP_FAILED`; Feature 004 creates `REPERSONALIZE`.

**Alternatives considered**:
- SSE-only, no persistence (rejected — notifications lost if client disconnects; spec requires in-app notification delivery which implies persistence for the case where client is offline)
- WebSocket (rejected — bidirectional overkill; SSE is sufficient for server→client push)

---

## R-009: Post-Login Onboarding State Detection

**Decision**: After any successful authentication (email/password or Google), the auth service fetches `StudentProfile.findOne({ userId })` to determine the routing state:
- `null` (no document) → first-time user → frontend flag `onboardingState: 'NEVER_STARTED'`
- `{ isDraft: true }` → incomplete onboarding → frontend flag `onboardingState: 'DRAFT_IN_PROGRESS'`
- `{ isDraft: false }` → completed → frontend flag `onboardingState: 'COMPLETED'`

This state is included in the login/token response payload (not in the JWT itself — it changes over time). The frontend `AuthProvider` stores this flag and passes it to the `OnboardingPanel` orchestration logic (Feature 001).

**Rationale**: A single `findOne` on `student_profiles` after login is negligible overhead and avoids a separate endpoint. Including it in the login response avoids an extra round-trip on page load. The flag must NOT be in the JWT because it changes when onboarding is submitted — the JWT would become stale.

**Alternatives considered**:
- Separate `GET /api/auth/me` endpoint called on mount (valid, but adds a round-trip; inline in login response is cheaper)
- Encoding onboarding state in the JWT payload (rejected — JWT is not refreshed on onboarding submission; the flag would become stale until the next login)

---

## R-010: Global Identity Preferences Ownership (displayName/fullName/privacy)

**Decision**: Feature 005 owns global account preferences on `users` by introducing:
- `privacySetting`: enum `identified | anonymous`, default `identified`
- `displayName`: primary public identity field
- `fullName`: separate editable field (independent from `displayName`)

Identity rendering is standardized with one fallback policy used by all clients and API consumers:
1. valid `displayName`
2. `fullName`
3. sanitized local-part of `email`
4. literal `"Student"`

The backend computes and returns `effectiveDisplayName` in account/profile responses so frontend apps do not diverge in rendering behavior.

**Rationale**: Splitting `displayName` from `fullName` decouples public identity presentation from legal/private naming needs. Storing `privacySetting` on `users` keeps global account preferences in the same ownership boundary as authentication and account lifecycle (Feature 005), avoiding cross-feature coupling. Server-computed fallback output prevents inconsistent UI identity behavior across web surfaces.

**Pattern**:
```js
function sanitizeEmailLocalPart(email) {
  const [local = ''] = String(email || '').split('@');
  return local.replace(/[^a-zA-Z0-9._-]/g, '').trim();
}

function isValidDisplayName(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function resolveEffectiveDisplayName({ displayName, fullName, email }) {
  if (isValidDisplayName(displayName)) return displayName.trim();
  if (isValidDisplayName(fullName)) return fullName.trim();
  const localPart = sanitizeEmailLocalPart(email);
  if (localPart.length > 0) return localPart;
  return 'Student';
}
```

**Alternatives considered**:
- Keep only `fullName` and derive public display from it (rejected — cannot support independent public identity preferences)
- Store privacy preferences in a separate `user_preferences` collection (rejected — unnecessary extra read/join for global account fields)
- Let each frontend implement fallback logic independently (rejected — drift risk and inconsistent UX)
