# Implementation Plan: Student Account Management

**Branch**: `005-account-management` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-account-management/spec.md`

## Summary

Build the authentication and account-management foundation for UETCompass: email/password registration (OTP-based email verification), Google Sign-In (GIS with `@vnu.edu.vn` domain enforcement), login with 5-attempt lockout, forgot-password via OTP, post-login routing by onboarding state, Account Settings (profile edits + re-personalization signal → Feature 004, change password, Google link/unlink, hard-delete with email confirmation), and logout. Sessions are managed with short-lived JWTs (15 min access token in memory) + opaque refresh tokens stored as SHA-256 hashes in a `refresh_tokens` MongoDB collection with httpOnly cross-site cookies. Passwords are hashed with `bcryptjs`. All auth logic lives in `backend/src/modules/auth/`. A shared `notifications` module handles in-app notification delivery (SSE + persistence) consumed by both this feature and Feature 004.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express.js`, `mongoose 8`, `jsonwebtoken`, `bcryptjs`, `nodemailer`, `google-auth-library`, `cors`, `cookie-parser`, `helmet`, `express-rate-limit`, `uuid`
- Frontend: `React 18`, `React Router v6`, `@react-oauth/google` (Google Identity Services wrapper), native `EventSource` (SSE — reused from Feature 001)

**Storage**: MongoDB Atlas free tier — `users` collection (auth + lockout state), `refresh_tokens` collection (RT rotation + reuse detection with TTL index), `notifications` collection (in-app notification persistence); `student_profiles` collection (read/write — owned by Feature 001, extended here with `repersonalizationPending` flag)
**Testing**: Jest 29 — unit tests only; MongoDB, `bcryptjs`, `google-auth-library`, `nodemailer` all mocked
**Target Platform**: Backend → Render (Node.js web service, free tier, cold start ~50s); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Login response < 300ms p95 (single DB lookup + bcrypt compare); silent refresh absorbs Render cold start via 60s timeout + 2 retries; SSE heartbeat every 15s (inherited from Feature 001 pattern)
**Constraints**: No Redis — MongoDB-only storage; `SameSite=None; Secure` cookie required for Vercel↔Render cross-origin RT delivery; `bcryptjs` (pure JS) preferred over `bcrypt` (native) to avoid Render build issues; AT stored in React memory only (not localStorage); no 2FA beyond OTP email verification
**Scale/Scope**: UET-VNU students only — hundreds to low-thousands of concurrent users; no multi-tenancy; single `@vnu.edu.vn` domain constraint hardcoded

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items pass.*

- [x] **Modular Monolithic**: All auth logic is isolated in `backend/src/modules/auth/`. Shared notification delivery lives in `backend/src/modules/notifications/`. The re-personalization signal is written to `student_profiles.repersonalizationPending` via `studentProfileService` (service-layer call only — no direct cross-module import). No microservice split introduced.
- [x] **UET-First**: `@vnu.edu.vn` domain constraint is hardcoded in both client-side form validation and server-side Google ID token verification. No abstraction for other universities.
- [x] **Privacy**: Passwords are stored as bcrypt hashes only — never plaintext, never logged. UET portal credentials are not involved in this feature. No password history surfaced to users. Only the minimum account data (name, email, avatar, lockout counters, OTP state) is stored — no grades, transcripts, or credential scraping.
- [x] **AI-Assisted**: Gemini API is **not called** in this feature. All validation (email domain, OTP check, password confirmation) is pure code logic. No LLM involved.
- [x] **Test What Matters**: Unit tests mandatory for: OTP expiry + lockout logic (`auth.service.test.js`), bcrypt hash/verify (`password.service.test.js`), refresh token rotation + reuse detection (`token.service.test.js`), re-personalization change detection (`profileSettings.service.test.js`).

## Project Structure

### Documentation (this feature)

```text
specs/005-account-management/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 9 technical decisions resolved
├── data-model.md        ← Phase 1: users, refresh_tokens, notifications schemas
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: all auth + account-settings API contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── user.model.js              # users Mongoose schema + model
│   │   │   ├── auth.service.js            # register, login, logout, OTP logic, lockout
│   │   │   ├── token.service.js           # RT rotation, AT issue, reuse detection
│   │   │   ├── password.service.js        # bcryptjs hash/verify, password reset flow
│   │   │   ├── google.service.js          # google-auth-library ID token verification
│   │   │   ├── deletion.service.js        # hard delete cascade, deletion token flow
│   │   │   ├── profileSettings.service.js # update name/avatar/onboarding fields, re-personalization diff
│   │   │   ├── auth.controller.js         # Express handlers (thin)
│   │   │   ├── auth.routes.js             # /api/auth/* routes + middleware
│   │   │   └── auth.email.js              # OTP and deletion confirmation emails via Nodemailer
│   │   ├── notifications/
│   │   │   ├── notification.model.js      # notifications Mongoose schema
│   │   │   ├── notification.service.js    # create, markRead, getUnread
│   │   │   └── notification.sse.js        # SSE connection store (Map) + push — same pattern as onboarding.sse.js
│   │   └── onboarding/                    # Owned by Feature 001 — read repersonalizationPending flag here
│   ├── middleware/
│   │   └── auth.middleware.js             # JWT AT verify → attaches req.user.userId (shared across features)
│   └── app.js                             # Express bootstrap — mounts auth.routes, cors, helmet, cookieParser
└── tests/
    └── unit/
        └── auth/
            ├── auth.service.test.js        # OTP expiry, account lock/unlock, duplicate email
            ├── token.service.test.js       # RT rotation, reuse detection, family revocation
            ├── password.service.test.js    # bcrypt hash, verify, wrong-password counter
            └── profileSettings.service.test.js  # diff detection, repersonalizationPending flag set

frontend/
├── src/
│   ├── features/
│   │   └── auth/
│   │       ├── LoginPage.jsx              # Email+password form + Google Sign-In button
│   │       ├── RegisterPage.jsx           # Registration form + OTP verification step
│   │       ├── ForgotPasswordPage.jsx     # Email input → OTP → new password
│   │       ├── AccountSettingsPage.jsx    # Profile fields + password change + Google links + delete
│   │       ├── useAuth.js                 # Hook: login, logout, silentRefresh (60s timeout + 2 retries)
│   │       ├── useGoogleAuth.js           # Hook: @react-oauth/google useGoogleLogin wrapper
│   │       └── auth.api.js                # Fetch wrappers for all /api/auth/* endpoints
│   ├── providers/
│   │   └── AuthProvider.jsx              # Context + silent refresh on mount + AT in-memory store
│   └── guards/
│       └── AuthGuard.jsx                 # Redirect to /login if no valid AT
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend; all auth logic isolated in `modules/auth/`. Notifications extracted to `modules/notifications/` (shared with Feature 004). Feature 001's `onboarding` module is read-only from this feature — the `repersonalizationPending` flag is set via `studentProfileService` call through the service layer. Frontend uses a feature-folder structure mirroring the backend module boundary.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
