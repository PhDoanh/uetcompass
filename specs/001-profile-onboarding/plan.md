# Implementation Plan: Student Profile Onboarding

**Branch**: `001-profile-onboarding` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-profile-onboarding/spec.md`

## Summary

A one-time, skippable onboarding panel that appears on first login and collects a student's academic profile (major, completed courses) and dropdown-only career goals (role, graduation timeline). Major options are sourced from `programs.nameEN`; after a major is selected, the app resolves selected `programId`, loads curriculum link from `programs.source.url`, and filters completed-courses from `course_units` by (`programId`, `type = "elective"`). `careerGoal` remains a nested object; downstream `careerGoalRole` is always derived from `careerGoal.role`. Completed-course identity follows canonical rule `(`major`, `courseCode`)`, with optional `courseUnitId` persisted only for join optimization. `privacySetting` is not part of `StudentProfile` (owned by `User` in feature 005). All form inputs are auto-saved server-side as a `StudentProfile` draft via a debounced `PUT /onboarding/draft` (800ms). On explicit student submission, the profile transitions irreversibly to `isDraft: false`, and an async roadmap generation job is fired (Promise-based, no queue). The student receives notification via SSE (in-app, while connected) and Nodemailer email (always). Input handling is deterministic list-based validation only.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8, `jsonwebtoken`, `nodemailer`, `express-validator`
- Frontend: React 18, React Router v6, native `EventSource` (SSE client — no extra library)

**Storage**: MongoDB Atlas free tier — `student_profiles` collection; `programs` + `course_units` collections (read-only, pre-seeded by feature 002)
**Testing**: Jest 29 — unit tests only; MongoDB mocked via in-process stubs (`jest.fn()` / `jest.mock()`); no external services required to run tests
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — React SPA + Node.js/Express REST API (modular monolith)
**Performance Goals**: Draft save latency imperceptible to user (debounced, fire-and-forget); SSE heartbeat every 15s to survive Render idle-connection close (~30s); roadmap job triggered within 5s of submit response
**Constraints**: Render cold start ~50s — frontend must show loading states gracefully on first API call; no Redis/BullMQ; no WebSocket; SSE only while client connected (no server-side queue for missed events)
**Scale/Scope**: UET-VNU students only — hundreds to low thousands of concurrent users; no multi-tenancy

**Data Contract Policy**: Pre-implementation alignment only; no runtime migration/backfill is executed in onboarding request path.

## Constitution Check

*Pre-design gate — re-checked after Phase 1 design: all items still pass.*

- [x] **Modular Monolithic**: Onboarding logic is fully contained in `backend/src/modules/onboarding/`. The only cross-module call is `roadmapService.triggerGeneration(userId)` invoked through the service layer — no direct cross-module import.
- [x] **UET-First**: Major list and curriculum links are sourced from UET-seeded `programs`; course choices are sourced from UET-seeded `course_units` (`programId`, `type = "elective"`); role/timeline options remain bounded and UET-contextual. No abstraction for other universities was introduced.
- [x] **Privacy**: No UET portal credentials collected or stored. Only MVP academic profile data (major, completed courses, dropdown-selected career goals) is collected.
- [x] **AI-Assisted**: Gemini API is **not called** in this feature. Validation is deterministic list-membership checking. No LLM calls during onboarding.
- [x] **Test What Matters**: Unit tests cover the two complex pieces with side effects — (1) dropdown option validation and stale-option handling, (2) `StudentProfile` state machine transitions including duplicate-submit rejection.
- [x] **Boundary Ownership**: `privacySetting` remains in `User` domain (feature 005), not duplicated in onboarding `StudentProfile`.

## Project Structure

### Documentation (this feature)

```text
specs/001-profile-onboarding/
├── plan.md              ← this file
├── spec.md              ← feature requirements
├── research.md          ← Phase 0: 8 technical decisions resolved
├── data-model.md        ← Phase 1: StudentProfile schema + state machine
├── quickstart.md        ← Phase 1: local dev setup + manual test guide
├── contracts/
│   └── rest-api.md      ← Phase 1: all 4 API endpoint contracts
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   └── onboarding/
│   │       ├── onboarding.model.js        # StudentProfile Mongoose schema + model
│   │       ├── onboarding.service.js      # Business logic: upsertDraft, submitProfile, state guard
│   │       ├── onboarding.controller.js   # Express handlers (thin — delegates to service)
│   │       ├── onboarding.routes.js       # Express Router + auth middleware applied
│   │       ├── onboarding.validation.js   # dropdown option validation — deterministic, no LLM
│   │       ├── onboarding.errors.js       # Error mapping + standardized API error envelope
│   │       ├── onboarding.sse.js          # SSE connection store (Map) + notifyUser()
│   │       └── onboarding.email.js        # sendRoadmapReadyEmail() via Nodemailer
│   ├── middleware/
│   │   └── auth.middleware.js             # JWT verify → attaches req.user.userId
│   └── app.js                             # Express app bootstrap + route mounting
└── tests/
    └── unit/
        └── onboarding/
            ├── validation.test.js          # dropdown value validation + stale option scenarios
            ├── stateMachine.test.js        # draft→submitted: state transition tests
            └── draftPersistence.test.js    # atomic upsert + restore behavior tests

frontend/
├── src/
│   ├── features/
│   │   └── onboarding/
│   │       ├── OnboardingPanel.jsx        # Outer panel: visibility state + dismiss logic
│   │       ├── MajorSelect.jsx            # Controlled major dropdown (from programs.nameEN)
│   │       ├── CourseMultiSelect.jsx      # Filtered elective courses (course_units by programId)
│   │       ├── CareerGoalForm.jsx         # Role / timeline dropdown selection only
│   │       ├── useOnboardingDraft.js      # Hook: 800ms debounced PUT /draft + fetch on mount
│   │       └── useRoadmapStatus.js        # Hook: EventSource open/close + roadmap:status handler
│   ├── guards/
│   │   └── OnboardingGuard.jsx            # React Router guard: redirect to / if profile submitted
│   └── services/
│       ├── onboarding.api.js              # Fetch wrappers: getDraft, putDraft, postSubmit
│       └── roadmap.api.js                 # Retry trigger wrapper (POST /api/roadmap/retry only)
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend with onboarding logic isolated in `modules/onboarding/`. Feature-folder structure on frontend mirrors the backend module boundary. Communication from `onboarding` to `roadmap` passes through the service layer only — no direct cross-module import.

## Complexity Tracking

No Constitution violations — complexity tracking table not required.
