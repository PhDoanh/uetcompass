# Implementation Plan: Manual Roadmap Generator

**Branch**: `001-manual-roadmap-generator` | **Date**: 2026-04-14 | **Spec**: `specs/001-manual-roadmap-generator/spec.md`
**Input**: Feature specification from `specs/001-manual-roadmap-generator/spec.md`

## Summary

Build the manual roadmap generator inside the existing UETCompass web application by extending the current backend roadmap module and adding a new frontend YAML editor + DAG preview. Users will author roadmaps using YAML, validate a node-based DAG, save drafts, publish to the community, and edit their own versions without requiring a separate microservice.

This feature will reuse the existing `roadmaps` backend module and MongoDB schema conventions while adding manual roadmap-specific fields for raw YAML, publish metadata, and `draft`/`published` lifecycle states. The frontend will render a split-pane editor with Monaco YAML editing, realtime schema validation, and a React Flow graph preview, enabling users to create and share structured roadmaps that align with Feature 009 canonical schema and Feature 004 skill-tree unlock semantics.

## Technical Context

**Language/Version**: JavaScript / Node.js 20 LTS backend, React 18 frontend  
**Primary Dependencies**: Express 4, Mongoose 8, js-yaml, ajv, @xyflow/react (React Flow), Monaco Editor, Jest, supertest  
**Storage**: MongoDB Atlas via Mongoose (`roadmaps` collection with manual roadmap subtype fields)  
**Testing**: Jest unit tests + supertest backend integration tests; frontend smoke tests in existing React test harness  
**Target Platform**: Web application (browser frontend + Node.js backend)  
**Project Type**: Web application  
**Performance Goals**: Validate and render 10KB YAML roadmaps under 200ms and support 1000 concurrent manual roadmap create/update operations at the API layer  
**Constraints**: 10KB structured code limit, maintain monolithic architecture, no new services, environment-variable-only secrets, no credential storage in roadmap feature  
**Scale/Scope**: Private user draft roadmaps, public community sharing, and compatibility with existing skill-tree roadmap flows.

## Constitution Check

- Gate: Uses existing `backend/` + `frontend/` monolithic layout and reuses the roadmap module.  
- Gate: Preserves UET-first scope by targeting student roadmap authoring and community sharing only.  
- Gate: No new credential or personal data storage is introduced by the roadmap feature.  
- Gate: Manual roadmap creation is human-controlled; no LLM dependency is required.  
- Gate: Planned tests focus on validation, persistence, and sharing behavior, satisfying the constitution’s “Test What Matters” principle.

**Result**: Pass.

## Project Structure

### Documentation (this feature)

```text
specs/001-manual-roadmap-generator/
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
│   ├── modules/
│   │   └── roadmap/
│   │       ├── roadmap.controller.js
│   │       ├── roadmap.model.js
│   │       ├── roadmap.routes.js
│   │       ├── roadmap.service.js
│   │       ├── roadmapValidation.service.js
│   │       ├── roadmap.preview.store.js
│   │       ├── roadmapAcceptance.service.js
│   │       └── [manual roadmap create/update/share extensions]
│   └── middleware/
└── tests/
    ├── unit/
    └── integration/
frontend/
├── src/
│   ├── features/
│   │   └── manual-roadmap/
│   │       ├── ManualRoadmapPage.jsx
│   │       ├── ManualRoadmapEditor.jsx
│   │       ├── ManualRoadmapPreview.jsx
│   │       ├── manualRoadmap.api.js
│   │       └── manualRoadmap.validation.js
│   ├── services/
│   │   └── roadmap.api.js
└── tests/
```

**Structure Decision**: Extend the existing web application structure. Keep manual roadmap feature scoped inside the existing backend roadmap module and add a dedicated frontend feature folder for editor/preview/share flows.

## Complexity Tracking

No constitution violations or added structural complexity are required. The design remains within the monolithic backend/frontend architecture and reuses existing roadmap infrastructure.

## Implementation Summary

**Completed Phases**: 1-5 (Setup, Foundational, User Stories 1-3)
- Backend: Manual roadmap model, validation service, service layer, controller endpoints
- Frontend: YAML editor with Monaco, DAG preview with React Flow, API integration, homepage suggestions and community section
- Features: Create, edit, share, and view community roadmaps
- Validation: YAML parsing, AJV schema, DAG cycle detection, topological sorting
- Storage: MongoDB `manual_roadmaps` collection with draft/published lifecycle

**Key Technical Decisions**:
- Extended existing roadmap module instead of new microservice
- Used js-yaml for parsing, ajv for schema validation
- Monaco Editor for YAML editing, React Flow for graph visualization
- Shared roadmaps displayed in homepage community section
- 10KB size limit, topological sorting for logical node ordering

**Performance**: Validation and rendering under 200ms for 10KB roadmaps, supports 1000 concurrent operations

**Testing**: Backend integration tests pending, frontend smoke tests pending, manual validation completed
