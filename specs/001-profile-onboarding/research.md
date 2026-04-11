# Research: Student Profile Onboarding

**Feature**: `001-profile-onboarding`
**Date**: 2026-03-07
**Status**: Complete — all unknowns resolved

---

## R-001: SSE (Server-Sent Events) in Node.js / Express

**Decision**: Use native `res.write()` with `text/event-stream` content type. Store active connections in a module-level `Map<userId, res>`. Send a comment-only heartbeat every **15 seconds** to prevent Render's idle connection timeout.

**Rationale**: SSE is HTTP-native, requires no extra library, and is sufficient for the one-way server→client push needed here. Render's free tier closes idle HTTP connections after ~30s, so a 15s heartbeat keeps the pipe open. The `X-Accel-Buffering: no` header is required to disable Render's Nginx proxy buffering (otherwise SSE data sits in the proxy buffer and never reaches the client).

**Pattern**:
```js
// backend/src/modules/onboarding/onboarding.sse.js
const connections = new Map(); // userId (string) → Express res

function addConnection(userId, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',  // Disable Render/Nginx proxy buffering
  });
  res.write(':ok\n\n'); // initial handshake (comment, no event fired on client)
  connections.set(userId, res);

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15_000);
  res.on('close', () => {
    clearInterval(heartbeat);
    connections.delete(userId);
  });
}

function notifyUser(userId, eventName, data) {
  const res = connections.get(userId);
  if (res) res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
  // Silently no-ops when client not connected — expected behaviour
}

module.exports = { addConnection, notifyUser };
```

**Alternatives considered**:
- WebSocket (rejected — bidirectional; overkill for one-way server push; requires `ws` library)
- Long-polling (rejected — more complex retry/timeout logic, wasteful under frequent polling)

---

## R-002: MongoDB Atomic Draft Upsert

**Decision**: Use `findOneAndUpdate({ userId }, { $set: payload }, { upsert: true, new: true, runValidators: true })`. The unique index on `userId` is the DB-level one-profile-per-user enforcement.

**Rationale**: Atomic upsert prevents the race condition where two rapid debounce flushes could create duplicate documents. With `upsert: true` and a unique index, the second concurrent call will hit a duplicate key error which the service layer catches and treats as a no-op (the first write wins).

**Pattern**:
```js
async function upsertDraft(userId, fields) {
  return StudentProfile.findOneAndUpdate(
    { userId },
    { $set: { ...fields, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true, new: true, runValidators: true }
  );
}
```

**Alternatives considered**:
- `insertOne` then `updateOne` (rejected — not atomic; susceptible to duplicate key on concurrent inserts)
- Separate draft collection (rejected — unnecessary overhead; single document with `isDraft` flag is simpler and sufficient)

---

## R-003: Debounced Auto-Save in React

**Decision**: Debounce interval of **800ms** from the last change event. Implemented as a `useRef`-based timer inside a `useOnboardingDraft` custom hook, with cleanup on unmount.

**Rationale**: 800ms is the standard benchmark for "feels real-time without hammering the server". 300ms would generate ~2.7× more requests; 1500ms would feel noticeably laggy to a fast typist. Using `useRef` (not `useState`) for the timer avoids unnecessary re-renders.

**Pattern**:
```js
// frontend/src/features/onboarding/useOnboardingDraft.js
function useOnboardingDraft() {
  const timerRef = useRef(null);

  const scheduleSave = useCallback((payload) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onboardingApi.putDraft(payload).catch((err) =>
        console.error('[draft] Auto-save failed:', err)
      );
    }, 800);
  }, []);

  // Flush any pending save on unmount
  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { scheduleSave };
}
```

**Alternatives considered**:
- `lodash.debounce` (rejected — adds external dependency for three lines of logic; YAGNI)
- `useDeferredValue` / `useTransition` (rejected — these are rendering utilities, not network debounce tools)

---

## R-004: Role Option + Graduation Date Validation Logic

**Decision**: Career-goal fields in MVP are validated deterministically using field-specific rules:
1. `careerGoal.role` must be either null/empty (optional) or present in selected major's `programs.careerTracks`
2. `careerGoal.graduationTimeline` must be either null/empty (optional) or a valid date in `YYYY-MM-DD` format

Validation is executed on both client-side (fast feedback) and server-side (authoritative guard). No open-ended text parsing is involved.

**Rationale**: This keeps validation deterministic and low-latency while making graduation timeline input more intuitive in UI via date-picker.

**Pattern**:
```js
// backend/src/modules/onboarding/onboarding.validation.js
const roleOptions = selectedProgram?.careerTracks || [];

function validateDropdownValue(value, options) {
  if (value == null) return { valid: true };
  const normalized = String(value).trim();
  if (!normalized) return { valid: true }; // optional field not provided
  return options.includes(normalized)
    ? { valid: true }
    : { valid: false, reason: 'Value must be selected from predefined options' };
}

function validateDateValue(value) {
  if (value == null || String(value).trim() === '') return { valid: true };
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())
    ? { valid: true }
    : { valid: false, reason: 'Value must be a valid date in YYYY-MM-DD format' };
}

module.exports = { validateDropdownValue, validateDateValue };
```

**Alternatives considered**:
- Open-ended text with regex checks (rejected — still ambiguous and high-variance for MVP)
- LLM-based semantic normalization (rejected — non-deterministic and unnecessary for MVP)
- Client-only validation (rejected — insufficient integrity at API boundary)

---

## R-005: Input Source and Validation Rules for MVP

**Decision**:
- Role options are sourced from `programs.careerTracks` for the selected program.
- Graduation timeline uses date-picker input and is validated as `YYYY-MM-DD`.
- Major dropdown options are sourced from `programs.nameEN`.
- Curriculum link labeled "Required Courses" is sourced from `course_units.source.url` of any record whose `programId` matches the selected program.
- Completed-course options are sourced from `course_units` filtered by selected `programId` and `type = "elective"`.
- Draft and submit paths validate role against selected major's `careerTracks` and graduation timeline against date format rules.
- If a previously saved draft contains a role removed from selected major's latest `careerTracks`, the value is treated as stale and must be re-selected before submit.

**Rationale**: Mixed sourcing keeps dynamic academic data aligned with seeded curriculum truth (feature 002) while keeping role values bounded and graduation timeline input intuitive.

---

## R-006: Nodemailer + Gmail SMTP

**Decision**: Gmail App Password (not OAuth2). `GMAIL_USER` and `GMAIL_APP_PASSWORD` stored in environment variables. Email sending is fire-and-forget — failure is logged but does **not** propagate and does **not** fail the roadmap job.

**Rationale**: App Password is simpler than OAuth2 for a single-sender MVP. Gmail free tier allows 500 emails/day (Workspace: 2000/day), which is sufficient for UET student scale. Decoupling email from job success/failure ensures a transient SMTP error doesn't block the student from getting their roadmap.

**Pattern**:
```js
// backend/src/modules/onboarding/onboarding.email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendRoadmapReadyEmail(toEmail, displayName) {
  try {
    await transporter.sendMail({
      from: `"UETCompass" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: 'Your UETCompass roadmap is ready 🎓',
      text: `Hi ${displayName},\n\nYour personalized learning roadmap is ready. Open UETCompass to explore it.\n\n— UETCompass`,
    });
  } catch (err) {
    // Non-fatal: log and continue
    console.error('[email] Failed to send roadmap-ready notification:', err.message);
  }
}

module.exports = { sendRoadmapReadyEmail };
```

**Alternatives considered**:
- SendGrid (rejected — requires separate account/API key; more overhead for MVP)
- Gmail OAuth2 (rejected — more complex setup than App Password for this scale)

---

## R-007: Submit State Machine — Irreversibility

**Decision**: Two-layer guard to make `isDraft: false` irreversible:

1. **DB-level (authoritative)**: `findOneAndUpdate({ userId, isDraft: true }, ...)` — the `isDraft: true` filter condition means an already-submitted profile (where `isDraft: false`) will never be matched. Returns `null` on miss.
2. **Service-level**: Null result from step 1 is treated as a `409 Conflict` — profile already submitted.

This two-layer approach handles the race condition where two simultaneous submit calls (two browser tabs) both pass the service-level check at the same time — only one will win the DB-level conditional update.

**Pattern**:
```js
// backend/src/modules/onboarding/onboarding.service.js
async function submitProfile(userId, profileData) {
  const result = await StudentProfile.findOneAndUpdate(
    { userId, isDraft: true },                         // Only matches if still a draft
    {
      $set: {
        ...profileData,
        isDraft: false,
        submittedAt: new Date(),
        updatedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  );
  if (!result) {
    throw Object.assign(new Error('Profile already submitted'), { status: 409 });
  }
  return result;
}
```

**Alternatives considered**:
- Separate `findOne` + `updateOne` (rejected — not atomic; race condition window between check and update)
- Application-only guard without DB condition (rejected — not safe under concurrent requests)

---

## R-008: SSE Missed Events + Email Fallback

**Decision**: When roadmap generation completes (success or failure), the notification handler:
1. Attempts SSE delivery — `notifyUser(userId, ...)` is a no-op if not connected (no error thrown)
2. **Always** sends email via Nodemailer — regardless of whether SSE was delivered

This means: connected students get both (acceptable duplicate); offline students get email only. No server-side notification queue (confirmed by technical context — YAGNI, no Redis on Render free tier).

**Pattern**:
```js
// called from onboarding.service.js after roadmap job settles
async function dispatchNotifications(userId, userEmail, displayName, status) {
  // SSE — no-op if client disconnected
  notifyUser(userId, 'roadmap:status', { status });
  // Email — always, fire-and-forget
  if (status === 'completed') {
    await sendRoadmapReadyEmail(userEmail, displayName);
  } else {
    await sendRoadmapFailedEmail(userEmail, displayName);
  }
}
```

**Alternatives considered**:
- Server-side notification queue (rejected — YAGNI; Render free tier has no Redis; significant complexity for an edge case)
- SSE-only, no email (rejected — misses offline students entirely; violates FR-023)

---

## R-009: Canonical Contract Alignment (Profile Shape + Course Identity)

**Decision**:
1. Keep `careerGoal` as a nested object in persistence and API payloads.
2. Treat downstream `careerGoalRole` as derived read-model data sourced from `careerGoal.role` only (no duplicate writable field).
3. Exclude `privacySetting` from `StudentProfile`; ownership remains in `User` domain (feature 005).
4. Canonicalize completed-course identity by (`major`, `courseCode`), with optional `courseUnitId` stored only as join optimization metadata.
5. Resolve selected major by `programs.nameEN` to obtain `programId`, then derive curriculum link from `course_units.source.url` (any row with matching `programId`) and elective list from `course_units` where (`programId`, `type = "elective"`).
6. Pre-implementation policy: no runtime migration/backfill in request path for this alignment update.

**Rationale**: This keeps a single source of truth for career goal role, avoids cross-feature ownership leakage for privacy settings, and makes completed-course semantics stable even if `courseUnitId` values evolve. The no-runtime-migration policy reduces risk in hot paths and keeps rollout operationally simple.

**Pattern**:
```js
// canonical completed-course payload item
{
  major: 'Computer Science',
  courseCode: 'INT2204',      // canonical identity component
  courseUnitId: '64a1...'     // optional optimization only
}

// runtime sourcing for selected major
const selectedProgram = await Program.findOne({ nameEN: selectedMajorName });
const curriculumRow = await CourseUnit.findOne({
  programId: selectedProgram?.programId,
  'source.url': { $exists: true, $ne: null },
});
const curriculumUrl = curriculumRow?.source?.url ?? null;
const electiveCourses = await CourseUnit.find({
  programId: selectedProgram?.programId,
  type: 'elective',
});

// downstream mapping (read model only)
const careerGoalRole = profile.careerGoal?.role ?? null;
```

**Alternatives considered**:
- Flatten `careerGoalRole` directly in `StudentProfile` (rejected — duplicated source of truth)
- Canonical identity by `courseUnitId` only (rejected — weaker portability across seed/version changes)
- Runtime migration in onboarding API handlers (rejected — unnecessary coupling and latency/risk in request path)
