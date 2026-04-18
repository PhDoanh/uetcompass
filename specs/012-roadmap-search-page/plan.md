# Implementation Plan: Roadmap Search Page

**Branch**: `012-roadmap-search-page` | **Date**: 2026-04-14 | **Spec**: `d:\Desktop\compass\uetcompass\specs\012-roadmap-search-page\spec.md`
**Input**: Feature specification from `d:\Desktop\compass\uetcompass\specs\012-roadmap-search-page\spec.md`

## Summary

Implement a desktop-first split-screen roadmap discovery page that opens from the global navbar search input, performs public/shared roadmap name search with 300ms debounce and minimum 2-character threshold, and previews the selected roadmap (auto-selecting first result) in the right panel.

## Technical Context

**Language/Version**: JavaScript (Node.js backend + React 18 frontend)  
**Primary Dependencies**: Express 4, Mongoose 8, React 18, Vite 5, Lucide React, existing roadmap modules  
**Storage**: MongoDB (`manual_roadmaps` for shared items) and existing JSON roadmap data for legacy public preview fallback  
**Testing**: Jest 29 for backend unit/integration and frontend behavior tests in repo test setup  
**Target Platform**: Web app (desktop/laptop split-screen primary; responsive fallback for smaller viewports)  
**Project Type**: Web application (frontend + backend monolith)  
**Performance Goals**: Meet spec SC-002 (95% search responses <= 2s), responsive typing with debounce, no stale-result UI flicker  
**Constraints**: Public/shared data only, debounce = 300ms, minimum query length = 2, auto-preview first result, preserve existing auth/navigation behavior  
**Scale/Scope**: Single new feature page + supporting API enhancements, expected result list page size 6-20 items per query

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- Principle I (Modular Monolithic): PASS. Changes are contained within existing `roadmap` backend module and frontend feature/navigation layers.
- Principle II (UET-First Scope): PASS. Search remains roadmap-focused in current UET context and does not introduce multi-tenant abstractions.
- Principle III (Privacy by Minimalism): PASS. Feature uses public/shared roadmap content only and does not require new sensitive student credentials/data.
- Principle IV (AI-Assisted, Human-Controlled): PASS. No new AI-decision logic added.
- Principle V (Test What Matters): PASS with action. Add tests for search filtering, debounce behavior boundaries, selection/preview synchronization, and failure states.

### Post-Design Gate Review

- PASS. Design artifacts keep implementation inside existing modules, avoid over-generalization, do not add sensitive storage, and define testable critical behaviors.

## Project Structure

### Documentation (this feature)

```text
specs/012-roadmap-search-page/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── roadmap-search-api.md
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
│           └── manualRoadmap.service.js
└── tests/
    ├── integration/
    └── unit/

frontend/
├── src/
│   ├── App.jsx
│   ├── features/
│   │   ├── general/
│   │   │   └── NavBar.jsx
│   │   └── roadmap-search/
│   │       ├── RoadmapSearchPage.jsx
│   │       ├── RoadmapSearchResults.jsx
│   │       └── RoadmapPreviewPanel.jsx
│   ├── services/
│   │   └── roadmapSearch.api.js
│   └── style/
│       └── general-component.css
└── tests/
```

**Structure Decision**: Use the existing web app structure (frontend + backend). Backend logic stays in `backend/src/modules/roadmap` with additive endpoints/service methods. Frontend adds a dedicated feature folder for the new split-screen page and keeps navbar routing trigger in `general/NavBar.jsx`.

## Complexity Tracking

No constitution violations requiring justification.
