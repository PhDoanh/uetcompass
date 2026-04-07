# Implementation Plan: Student Account Management

**Branch**: `005-account-management` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-account-management/spec.md`

## Summary

Feature 005 implements account self-management for users who already passed authentication and UET verification in Feature 011-authentication. Scope includes profile update, onboarding-information behavior in Account Settings (CTA to open Onboarding Panel before completion, direct edit after completion), password change, and soft-delete account with email confirmation. Implementation will reuse existing Express + Mongoose backend and React + Zustand frontend patterns, with strict ownership checks and auditable security events.

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS backend, React 18 frontend)
**Primary Dependencies**: Express 4, Mongoose 8, bcryptjs, jsonwebtoken, nodemailer, React 18, Zustand, Axios
**Storage**: MongoDB Atlas/local MongoDB via Mongoose
**Testing**: Jest 29, Supertest (backend integration), React Testing Library/Jest (frontend guard + settings flows)
**Target Platform**: Web app (Vercel frontend + Render backend)
**Project Type**: Web application (frontend + backend monorepo)
**Performance Goals**: Profile read/update p95 < 300ms (excluding avatar upload transfer), password change p95 < 400ms, deletion confirmation completes and revokes session <= 5s
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
  - Plan includes unit/integration tests for ownership checks, password-change verification, onboarding CTA behavior, and deletion token flow.

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
│       ├── onboarding/
│       └── notifications/
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── features/
│   │   ├── account/
│   │   ├── onboarding/
│   │   └── general/
│   ├── guards/
│   ├── services/
│   └── stores/
```

**Structure Decision**: Use existing web app structure (backend + frontend) and extend current account/profile-related paths. Do not introduce new top-level applications or infrastructure components.

## Phase 0: Outline & Research

Resolved research topics:
- Access precondition pattern from Feature 011-authentication (session + UET-verified gate).
- Soft-delete strategy and deletion-token lifecycle.
- Account Settings behavior before/after onboarding completion.
- Identity rendering fallback + privacy consistency policy.
- Audit event boundaries for sensitive account changes.

Output artifact:
- [research.md](./research.md)

## Phase 1: Design & Contracts

Design outputs:
- [data-model.md](./data-model.md) with entities and state constraints.
- [contracts/rest-api.md](./contracts/rest-api.md) for profile/password/deletion APIs.
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
