# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Build a backend module that automatically tags newly harvested skills by sending their data to a managed LLM API and storing the resulting labels in the tagging/search bounded context. Inputs arrive from the crawler or ingestion service, are enqueued in a MongoDB-backed job queue, and processed in periodic batch jobs that call the LLM (OpenAI/Anthropic/Google) via HTTP. Tags are de‑duplicated against a dictionary `tags` collection and new labels are added when confidence exceeds 85%. Skills store canonical search-ready `Skill.tags` metadata (`tagId`, `normalizedName`, `confidence`) and apply overwrite strategy on re-tagging. Failures for individual items are recorded and retried automatically, while overall batch runs complete within one hour. API outputs are normalized for direct consumption by feature 008 (advanced tag search).

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: JavaScript/TypeScript – Node.js 20 LTS for backend (existing monolith), React 18 (frontend admin UI if needed).  
**Primary Dependencies**:
- Backend: Express.js, Mongoose 8 (MongoDB), `axios` or official OpenAI/Anthropic client, `bull`-style queue implemented atop MongoDB (no Redis), Jest for testing.
- Optional frontend: React 18, Chart.js (for reporting dashboard) – minimal UI work.
**Storage**: MongoDB Atlas for primary data; new collections `skills`, `tags`, `tagging_jobs` used as queue and audit log.
**Testing**: Jest 29 for unit tests; use `nock` or similar to mock HTTP calls to the LLM API.
**Target Platform**: Linux Node.js service on Render (same as existing backend); optional React SPA on Vercel for admin reports.
**Project Type**: Web application – modular monolith backend with a new `tagging` module; optional frontend extension for reporting.
**Performance Goals**: Process 1k–10k skills/day, complete each batch within 1 hour, maintain <1% per-item failure and <10% manual review rate.
**Constraints**: No Redis/BullMQ per constitution; queue must run on MongoDB. LLM API rate limits must be observed; budget < $X/month (estimate later). Batch job memory footprint <500MB to fit Render free tier.
**Scale/Scope**: Single-tenant UET-VNU dataset; few million skills over first year; feature scoped to backend service only (no mobile app).

**Canonical Domain Boundary**: `Skill`/`Tag` in this feature are part of the tagging/search bounded context (shared with feature 008), not `roadmap-core`.
## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Modular Monolithic**: tagging logic will reside entirely in `backend/src/modules/tagging/` with service-layer interface. No cross-module imports except for shared `db` helper.  ✅
- **Boundary Consistency**: `Skill`/`Tag` modeling and contracts are owned by tagging/search context and exposed in canonical form for search consumers.  ✅
- **UET-First**: tags are specific to domains and skills relevant to UET curriculum; no generic external taxonomy required.  ✅
- **Privacy**: only non-sensitive skill/course metadata is used; no student credentials are involved.  ✅
- **AI-Assisted**: LLM is invoked solely for tag suggestion.  Human operators may override via manual review interface.  ✅
- **Test What Matters**: unit tests will cover queue worker logic, tag de‑duplication, and API call mocking.  ✅
- **Additional Constraints**: Avoid Redis/BullMQ by implementing queue on MongoDB; this design justification will be re‑verified in Phase 1.  ✅

All gates satisfied; proceed to Phase 0 research.

*Post-design re-check*: after selecting MongoDB-based queue and confirming no new
infrastructure is required, all constitution gates continue to pass.
## Project Structure

### Documentation (this feature)

```text
specs/006-ai-auto-tagging/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (e.g., job API schema)
└── tasks.md             # Phase 2 output (/speckit.tasks will generate)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── tagging/               # new feature module
│   │   │   ├── tagging.model.js    # Mongoose schemas: Skill, Tag, Job
│   │   │   ├── tagging.service.js  # enqueue, processBatch, retry logic
│   │   │   ├── tagging.worker.js   # cron/interval job runner
│   │   │   ├── tagging.routes.js   # express endpoints for manual review/reporting
│   │   │   └── tagging.tests.js    # unit tests
│   │   └── …other existing modules…
│   ├── lib/                       # shared utilities (db connection, logger)
│   └── app.js                     # express app bootstrap, module registration
└── tests/
    └── unit/                      # existing tests

frontend/                          # optional admin dashboard
├── src/
│   ├── features/
│   │   └── tagging/
│   │       ├── TagReport.jsx      # display batch stats and manual queue
│   │       └── TagReview.jsx      # page to review low-confidence items
│   └── services/
│       └── tagging.api.js        # fetch wrappers for tagging endpoints
└── tests/
```

**Structure Decision**: Option 2 — Web application with a modular monolithic backend. The tagging feature is implemented as a new module (`backend/src/modules/tagging/`) alongside existing services; the queue is MongoDB‑based, avoiding extra infrastructure. Frontend changes are confined to an optional admin dashboard under `frontend/src/features/tagging/`. This keeps the repository layout consistent with prior features.

### Canonical Contract Notes (for Feature 008 interop)

- `Skill.tags` is persisted in canonical search shape with fields: `tagId`, `normalizedName`, `confidence` (optionally enriched with display metadata).
- Re-tagging overwrites prior `Skill.tags` atomically after a successful job completion.
- `Tag` collection remains dictionary/management source for normalization, deduplication, and governance.
- Tagging module response objects mirror persisted canonical shape to avoid downstream transform layers.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
