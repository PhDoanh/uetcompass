# Implementation Plan: Roadmap Tags

**Branch**: `015-roadmap-tags` | **Date**: 2026-05-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `d:\Desktop\compass\uetcompass\specs\015-roadmap-tags\spec.md`

## Summary

Add an end-to-end roadmap tagging system to the existing UETCompass web app. The feature has two primary flows: users can create, edit, and remove tags while editing a manual roadmap, and learners can search/filter roadmaps by tags alongside existing search behavior. Tags may be selected from an existing catalog or created in the editor, and the same canonical tag set must power both persistence and discovery.

## Technical Context

**Language/Version**: JavaScript (Node.js backend + React 18 frontend)  
**Primary Dependencies**: Express 4, Mongoose 8, React 18, Vite 5, Lucide React, existing roadmap modules  
**Storage**: MongoDB (`manual_roadmaps` for authored/shared roadmaps; tag data stored with roadmap records and indexed for search)  
**Testing**: Jest 29 for backend unit/integration and frontend behavior tests in repo test setup  
**Target Platform**: Web app (desktop/laptop primary with responsive fallback)  
**Project Type**: Web application (frontend + backend monolith)  
**Performance Goals**: Tag edits should save with the roadmap in one flow; tag-filtered search should remain responsive and avoid stale-result flicker  
**Constraints**: Public/shared roadmap discovery only, preserve existing auth/navigation behavior, keep monolithic module boundaries, no new services  
**Scale/Scope**: Single roadmap authoring enhancement plus search/filter extension, with shared tag behavior across edit and discovery flows

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Principle I (Modular Monolithic): PASS. Changes stay inside the existing roadmap backend module and frontend feature/navigation layers.
- Principle II (UET-First Scope): PASS. Tags are tied to UET roadmap workflows and discovery, not generalized multi-tenant taxonomy.
- Principle III (Privacy by Minimalism): PASS. No new sensitive student data is introduced; tag data is part of roadmap content.
- Principle IV (AI-Assisted, Human-Controlled): PASS. Tag creation/editing is user-controlled; no new AI decision logic is required.
- Principle V (Test What Matters): PASS with action. Add tests for tag CRUD in the editor, duplicate prevention, persistence, and tag-filtered search behavior.

## Project Structure

### Documentation (this feature)

```text
specs/015-roadmap-tags/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── roadmap-tags-api.md
└── tasks.md
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── roadmap/
│           ├── roadmap.routes.js
│           ├── roadmap.controller.js
│           ├── roadmap.service.js
│           ├── roadmap.model.js
│           ├── roadmapValidation.service.js
│           └── [tag editing/search extensions]
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── features/
│   │   ├── manual-roadmap/
│   │   │   └── [tag editor UI extensions]
│   │   └── roadmap-search/
│   │       └── [tag filter UI extensions]
│   ├── services/
│   │   └── roadmap.api.js
│   └── style/
│       └── general-component.css
└── tests/
```

**Structure Decision**: Extend the existing frontend/backend monolith. Keep tag persistence and validation inside `backend/src/modules/roadmap/`, add manual-roadmap tag editing UI in the existing manual roadmap feature area, and extend the roadmap search feature to accept tag filters without introducing a new service boundary.

## API Bridge Architecture ⚠️ CRITICAL

The tag feature requires explicit API layer coordination between frontend and backend. This section clarifies the execution flow to prevent the 2 critical gaps identified in project analysis:

### Gap A1: Tag Catalog Endpoint

**Problem**: Editors need to choose tags from an existing catalog OR create new ones. Without exposing existing tags, users cannot see what options are available.

**Solution**: Implement a dedicated `GET /manual-roadmaps/tags` endpoint (Phase 2, T011-T012):
- Backend exposes distinct tags from all public/published roadmaps
- Frontend loads this catalog on `ManualRoadmapPage` mount (Phase 2, T014)
- Catalog loaded via `roadmapSearch.api.js` client and stored in component state
- Editor UI renders tags as selectable chips with existing catalog as suggestions plus free-form creation option

**Where Implemented**:
- Backend: `backend/src/modules/roadmap/roadmap.controller.js` (route parsing) + `manualRoadmap.service.js` (distinct query)
- Frontend: `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx` (mount effect) + `frontend/src/services/roadmapSearch.api.js` (client call)

### Gap A2: Frontend API Payload Wiring

**Problem**: The frontend API client (`manualRoadmap.api.js`) currently only accepts `yamlCode` parameter. Editor can build tag state but cannot send it to backend, breaking persistence.

**Solution**: Update API client functions to accept tags parameter (Phase 2, T013 + Phase 3 early):
- Modify `createManualRoadmap(authToken, { yamlCode, tags })` signature
- Modify `updateManualRoadmap(authToken, roadmapId, { yamlCode, tags })` signature
- Wire editor's tag state into these calls when saving (Phase 3, T018 context)

**Where Implemented**:
- Frontend API: `frontend/src/services/manualRoadmap.api.js` (client functions)
- Frontend UI: `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx` (tag state + save handler wiring)
- Backend: Already ready via T004-T007 (model, validation, serialization)

**Impact**: Without both fixes, the feature cannot ship:
- Without A1 (catalog): Users cannot discover existing tags → cannot select from catalog per FR-006
- Without A2 (API bridge): Tag state from UI never reaches database → tags not persisted per FR-004

---

## Complexity Tracking

No constitution violations requiring justification.

**Critical Gaps Fixed in Phase 2**:
- ✅ Gap A1: Tag catalog endpoint (GET /manual-roadmaps/tags) + frontend loader
- ✅ Gap A2: API client payload wiring (tags parameter in create/update functions)
