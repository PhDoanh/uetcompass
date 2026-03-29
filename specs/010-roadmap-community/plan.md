# Implementation Plan: Roadmap Community

**Branch**: `010-roadmap-community` | **Date**: 2026-03-29 | **Spec**: `specs/010-roadmap-community/spec.md`
**Input**: Feature specification from `specs/010-roadmap-community/spec.md`

## Summary

Deliver a snapshot-first Roadmap Community that supports share-link access-mode switching and authenticated community discovery/forking, while preserving immutable community post content and immutable roadmap snapshots. The design enforces one `SharedRoadmap` per `RoadmapSnapshot` (student can own many snapshots), keeps `likeCount` attached to `CommunityPost`, applies privacy at read time from Feature 005, and uses onboarding/profile major directly for display and feed filtering (including anonymous mode).

## Technical Context

**Language/Version**: JavaScript (Node.js 20 LTS backend, React 18 + Vite frontend)
**Primary Dependencies**: Express, Mongoose, JWT auth middleware, React Query/HTTP service layer (existing frontend services)
**Storage**: MongoDB Atlas (existing monolithic backend DB)
**Testing**: Jest (backend unit/integration), frontend component/service tests (existing Vite test stack), API contract tests under backend test suites
**Target Platform**: Web app (Render backend + Vercel frontend)
**Project Type**: Modular monolith web application
**Performance Goals**: Feed filtering/render response <= 2s at up to 500 posts; share revoke/unpublish effect visible <= 5s
**Constraints**:
- Snapshot content is immutable once captured.
- Community post content is immutable (no edit flow).
- Link token is stable across access-mode changes.
- Feature 010 consumes Feature 009 fork-acceptance contract and does not own prerequisite logic.
- No storage/use of student credentials (constitution privacy principle).
**Scale/Scope**: Authenticated UET users, one active `CommunityPost` per student, many historical snapshots/posts over time.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate

1. **I. Modular Monolithic - Keep It Simple**: PASS
- Keep implementation inside existing backend/frontend modules; no new service split.

2. **II. UET-First Scope**: PASS
- Major/career logic remains UET-specific and sourced from existing onboarding/profile/account data.

3. **III. Privacy by Minimalism**: PASS
- No credential persistence introduced.
- Anonymous rendering hides only display name per confirmed decision C2; major remains from onboarding/profile source.

4. **IV. AI-Assisted, Human-Controlled**: PASS
- No new AI decision paths introduced in this feature.

5. **V. Test What Matters**: PASS WITH REQUIRED PLAN COVERAGE
- Add measurable validation for NFR outcomes (C3): latency, revoke/unpublish propagation, and consistency checks.

No constitution violations requiring exception.

## Project Structure

### Documentation (this feature)

```text
specs/010-roadmap-community/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- rest-api.md
|-- tasks.md
```

### Source Code (repository root)

```text
backend/
|-- src/
|   |-- app.js
|   |-- middleware/
|   |-- modules/
|       |-- roadmap/
|           |-- community/               # to be added/extended for feature 010
|-- tests/
    |-- unit/
        |-- roadmap/
            |-- community/               # unit/contract tests for API + domain rules

frontend/
|-- src/
|   |-- features/
|   |   |-- roadmap-community/           # to be added/extended for feed/detail/publish/share controls
|   |-- guards/
|   |-- services/
|       |-- roadmapCommunity.api.js      # to be added/extended
|-- tests/
```

**Structure Decision**: Use current monolith structure with a dedicated roadmap community module and tests colocated under existing backend/frontend patterns.

## Phase 0: Research Plan

Research resolved all material ambiguities and produced explicit decisions in `research.md`:

1. Clarify snapshot semantics consistently across share links and community posts.
2. Formalize access-mode switching semantics (same token, state changes only).
3. Resolve ownership/cardinality: one `SharedRoadmap` per snapshot; student can own many snapshots.
4. Replace major-group mapping in this feature with direct major usage from onboarding/profile/account source for display/filter.
5. Define measurable non-functional validation strategy for SC-002/SC-003/SC-004 style outcomes.

## Phase 1: Design and Contracts

Design outputs are generated in:

- `data-model.md`: immutable `RoadmapSnapshot`, `SharedRoadmap`, immutable `CommunityPost`, and `CommunityPostLike`.
- `contracts/rest-api.md`: publish/unpublish/feed/detail/share/fork/like contracts with stable token + immutable post semantics.
- `quickstart.md`: implementation and verification flow, including measurable NFR checks.

Agent context update is executed via:

- `.specify/scripts/powershell/update-agent-context.ps1 -AgentType copilot`

## Post-Phase 1 Constitution Re-Check

1. **I. Modular Monolithic - Keep It Simple**: PASS
- Data model and API remain within existing backend/frontend boundaries.

2. **II. UET-First Scope**: PASS
- Filtering/display behavior explicitly tied to UET onboarding/profile/account fields.

3. **III. Privacy by Minimalism**: PASS
- Anonymous mode only changes rendered identity; no duplicated anonymized storage required.

4. **IV. AI-Assisted, Human-Controlled**: PASS
- No AI policy changes.

5. **V. Test What Matters**: PASS
- Plan explicitly includes contract tests, domain behavior tests, and measurable NFR validation steps.

## Complexity Tracking

No constitution exceptions requested.
