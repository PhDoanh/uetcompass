# Implementation Plan: UET Authentication and Access Control Update

**Branch**: `011-authentication` | **Date**: 2026-04-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/011-authentication/spec.md`

## Summary

Feature 011 introduces a strict two-role access model (`guest`, `uet_student`) with anonymous guest public access and UET-only private access. It updates authentication domain policy (`@vnu.edu.vn` only for email-password and Google), OTP policy (4-digit, TTL 2 minutes, resend cooldown 2 minutes, hourly caps per account and per IP), guard behavior (private UI redirect login, private API 401), and mandatory audit event emission. Password reset behavior is clarified to invalidate only the current session/device.

## Technical Context

**Language/Version**: JavaScript (Node.js backend, React frontend)
**Primary Dependencies**: Express, Mongoose, jsonwebtoken, bcryptjs, nodemailer, google-auth-library, React, React Router, Axios/Zustand
**Storage**: MongoDB (accounts, otp challenge state, sessions, audit events)
**Testing**: Jest (unit-focused), with service/controller guard behavior validated via mocked dependencies
**Target Platform**: Web application (backend API + frontend SPA)
**Project Type**: Web application (modular monolith)
**Performance Goals**: Guard checks and authorization decisions complete within request lifecycle with no additional external dependency; OTP and auth endpoints remain responsive under expected student usage
**Constraints**: Guest remains anonymous (no authenticated guest session/token); UET domain enforcement is server-side; no admin role/portal; session strategy implementation-defined but observable behavior must match spec
**Scale/Scope**: UET student product scope; role model limited to `guest` and `uet_student`; public capabilities limited to exactly three defined flows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Modular Monolithic): PASS
  - Keep auth/access updates inside existing auth/account and guard modules in monolith boundaries.
- Principle II (UET-First Scope): PASS
  - Domain policy remains hard-constrained to `@vnu.edu.vn`.
- Principle III (Privacy by Minimalism): PASS
  - No additional sensitive credential persistence beyond required auth/session metadata and audit records.
- Principle IV (AI-Assisted, Human-Controlled): PASS
  - No AI decision path required for this feature.
- Principle V (Test What Matters): PASS
  - Unit-focused tests target guard behavior, OTP policy, Google domain deny path, and audit event emission.

## Project Structure

### Documentation (this feature)

```text
specs/011-authentication/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rest-api.md
├── checklists/
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── middleware/
│   │   └── auth.middleware.js
│   └── modules/
│       ├── auth/
│       ├── account/
│       └── notifications/
└── tests/
    └── unit/

frontend/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   ├── account/
│   │   └── general/
│   ├── guards/
│   └── services/
```

**Structure Decision**: Use existing web app modular-monolith layout; implement access-control updates in auth/account/guard surfaces without introducing new service boundaries.

## Phase 0: Outline and Research

Resolved research tracks:
- Guest anonymous model and public/private boundary enforcement.
- OTP resend throttling policy combining per-account and per-IP limits.
- Google login domain gate behavior and account create-vs-login branching.
- Session invalidation semantics after password reset (current session only).
- Mandatory audit event catalog and minimal event payload requirements.

Output artifact:
- [research.md](./research.md)

## Phase 1: Design and Contracts

Design outputs:
- [data-model.md](./data-model.md) for role/access, OTP, session, and audit entities.
- [contracts/rest-api.md](./contracts/rest-api.md) for auth/guard-relevant endpoints and response contracts.
- [quickstart.md](./quickstart.md) for validation flow and regression checklist.

Agent context update:
- Run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`.

## Post-Design Constitution Check

- Principle I (Modular Monolithic): PASS
  - Contracts and models remain in module boundaries.
- Principle II (UET-First Scope): PASS
  - UET domain constraints are explicit in contracts and success criteria.
- Principle III (Privacy by Minimalism): PASS
  - Anonymous guest model avoids extra credential/session overhead.
- Principle IV (AI-Assisted, Human-Controlled): PASS
  - No AI dependency introduced.
- Principle V (Test What Matters): PASS
  - Quickstart and contracts target high-risk auth/guard behaviors.

## Complexity Tracking

No constitution violations requiring exception.
