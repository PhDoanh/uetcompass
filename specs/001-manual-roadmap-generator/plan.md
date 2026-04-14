# Implementation Plan: Manual Roadmap Generator

**Branch**: `001-manual-roadmap-generator` | **Date**: 2026-04-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-manual-roadmap-generator/spec.md`

## Summary

Build a manual roadmap authoring feature that lets UETCompass users define DAG roadmaps in YAML, preview them as an interactive React Flow graph, and save/share versions to the community.

This feature is aligned with Feature 009's canonical roadmap persistence model and adopts Feature 004's node status semantics. The backend API will validate YAML + DAG structure, persist roadmaps in MongoDB, and expose save/edit/share contracts. The frontend will use Monaco-style YAML editing and React Flow rendering for graph visualization.

## Technical Context

**Language/Version**: JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
**Primary Dependencies**:
- Backend: `express`, `mongoose`, `js-yaml`, `ajv`, `jest`
- Frontend: `react`, `@xyflow/react` (React Flow), `monaco-editor`, `react-router`, `zustand` or native state hooks
- Shared: `js-yaml` for YAML parsing, `ajv` for JSON schema validation
**Storage**: MongoDB Atlas free tier via Mongoose. Roadmaps are stored with a schema aligned to Feature 009 and node subdocuments compatible with Feature 004 semantics.
**Testing**: Jest 29; React Testing Library for frontend components; mocked backend dependencies for unit tests.
**Target Platform**: Backend → Render (Node.js web service, free tier); Frontend → Vercel (React SPA)
**Project Type**: Web application — modular monolith backend + React frontend feature.
**Performance Goals**:
- YAML parse + structural validation under 200ms for 10KB payloads
- Graph preview updates within 100ms for 50-node DAGs
- Save/share API responses under 300ms p95 for core user flows
**Constraints**:
- No Redis, no WebSocket, no server-side queue
- Free-tier Render cold start acknowledged in frontend UX
- Roadmap YAML capped at 10KB per clarification
- Minimal persisted personal data; no credential storage
**Scale/Scope**:
- UET-VNU students only
- Multiple roadmap drafts/versions per user with one active shared version
- Community sharing limited to platform members

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Modular Monolithic**: Backend logic is isolated within `backend/src/modules/manual-roadmap/`. Feature boundaries are respected and cross-module access occurs through service interfaces.
- [x] **UET-First**: The roadmap editor and sharing behavior are scoped to UETCompass. Even though the YAML model is generic, the feature remains within the UET platform and does not generalize to other universities.
- [x] **Privacy by Minimalism**: Only minimal user metadata, roadmap YAML, and node metadata are stored. No student portal credentials or sensitive profile data are persisted by this feature.
- [x] **AI-Assisted, Human-Controlled**: Core roadmap validation is code-driven. If future roadmap suggestions use AI, they must be validated and user-overridable. Current design does not require Gemini for core save/share flows.
- [x] **Test What Matters**: Unit tests cover YAML parsing and validation, DAG/topological checks, node unlock/status rules, save/share APIs, and frontend preview behavior. External integrations are mocked.

## Project Structure

### Documentation (this feature)
```text
specs/001-manual-roadmap-generator/
├── plan.md              # This file
├── spec.md              # Feature requirements
├── research.md          # Existing research decisions
├── data-model.md        # Phase 1 output: canonical roadmap schema
├── quickstart.md        # Phase 1 output: local dev + manual test guide
├── contracts/
│   └── rest-api.md      # Phase 1 output: save/edit/share API contract
└── tasks.md             # Phase 2 output (/speckit.tasks, not created here)
```

### Source Code (repository root)
```text
backend/
├── src/
│   └── modules/
│       └── manual-roadmap/
│           ├── manualRoadmap.model.js       # Mongoose schema + indexes
│           ├── manualRoadmap.service.js     # save, load, share, version logic
│           ├── manualRoadmap.validation.js  # YAML parse + DAG validation + node semantics
│           ├── manualRoadmap.controller.js  # Express route handlers
│           ├── manualRoadmap.routes.js      # /api/manual-roadmaps routes
│           └── manualRoadmap.utils.js       # DAG utilities + status helpers
frontend/
├── src/
│   └── features/
│       └── manual-roadmap/
│           ├── RoadmapEditor.jsx           # YAML editor + validation panel
│           ├── RoadmapGraph.jsx            # React Flow DAG renderer
│           ├── roadmapApi.js               # save/fetch/share API client
│           └── roadmapSlice.js             # local editor state + draft handling
```

**Structure Decision**: Option 2 — Web application. Modular monolith backend; new manual roadmap logic is isolated in a dedicated backend module. Frontend feature code follows existing React SPA conventions and uses React Flow for DAG visualization.

## Complexity Tracking

No Constitution violations detected. No additional complexity justification is required.
