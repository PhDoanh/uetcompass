# Implementation Plan: Student Account Management

**Branch**: `005-account-management` | **Date**: 2026-04-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-account-management/spec.md`

## Summary

Feature 005 implements account self-management for users who already passed authentication and UET verification in Feature 011-authentication. Scope includes basic profile update and password change. Implementation uses a dedicated account module on backend and a dedicated account API client/UI flow on frontend, with strict ownership checks and auditable security events.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express 4, Mongoose 8, bcryptjs, jsonwebtoken, React 18, Zustand, Fetch API
**Storage**: MongoDB Atlas/local MongoDB via Mongoose
**Testing**: Jest 29 (backend + frontend unit tests), React Testing Library/Jest (frontend guard + settings flows)
**Target Platform**: Web app (Vercel frontend + Render backend)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: Profile read/update p95 < 300ms, password change p95 < 400ms
**Constraints**: Must require Feature 011-authentication session + UET-verified state for every endpoint; no cross-account access; privacy fallback rendering must be consistent across surfaces
**Scale/Scope**: UET student-only product scope; initial deployment target up to 10k student accounts

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Modular Monolithic): PASS
  - Keep implementation inside existing backend modules and frontend feature folders; no new service split.
- Principle II (UET-First Scope): PASS
  - Feature remains strictly for verified UET students from Feature 011-authentication.
- Principle III (Privacy by Minimalism): PASS WITH NOTE
  - No UET portal credentials are introduced/stored here; only account/profile fields required by product behavior.
- Principle IV (AI-Assisted, Human-Controlled): PASS
  - No new AI decision path introduced by this feature.
- Principle V (Test What Matters): PASS
  - Plan includes unit tests for ownership checks and password-change verification.

## Project Structure

### Documentation (this feature)

```text
specs/005-account-management/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── middleware/
│   │   └── auth.middleware.js
│   └── modules/
│       ├── account/
│       └── notifications/
└── tests/
  └── unit/

frontend/
├── src/
│   ├── features/
│   │   ├── account/
│   │   └── general/
│   ├── guards/
│   ├── services/
│   │   └── account.api.js
│   └── stores/
```

**Structure Decision**: Use existing web app structure (backend + frontend) and extend current account/profile-related paths. Do not introduce new top-level applications or infrastructure components.

## Phase 0: Outline & Research

Resolved research topics:
- Access precondition pattern from Feature 011-authentication (session + UET-verified gate).
- Identity rendering fallback + privacy consistency policy.
- Audit event boundaries for sensitive account changes.

Output artifact:
- [research.md](./research.md)

## Phase 1: Design & Contracts

Design outputs:
- [data-model.md](./data-model.md) with entities and state constraints.
- [contracts/rest-api.md](./contracts/rest-api.md) for profile/password APIs.
- [quickstart.md](./quickstart.md) with local validation flow and test checklist.

Agent context update:
- Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot` after design artifacts are created.

## Post-Design Constitution Check

- Principle I (Modular Monolithic): PASS
  - Contracts and model changes stay in existing module boundaries.
- Principle II (UET-First Scope): PASS
  - APIs require verified UET-authenticated context from Feature 011-authentication.
- Principle III (Privacy by Minimalism): PASS
  - No additional sensitive credential types introduced; privacy setting and fallback rendering codified.
- Principle IV (AI-Assisted, Human-Controlled): PASS
  - No AI-generated account decisions.
- Principle V (Test What Matters): PASS
  - Quickstart explicitly covers critical side-effect paths and security-sensitive operations.

## Complexity Tracking

No constitution violations requiring exceptions.
