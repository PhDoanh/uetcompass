# Implementation Plan: Seed UET Curriculum into DB as DAG

**Branch**: `002-seed-ctdt-dag` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-seed-ctdt-dag/spec.md`

## Summary

Build a background job that reads a configured list of UET curriculum URLs, extracts raw content via Tavily Extract API, parses each into structured CourseUnit records via Gemini (with JSON schema validation), bulk-upserts into MongoDB `course_units` collection, then runs per-major DFS cycle detection on the resulting DAG and logs all outcomes. Triggered by node-cron on a semester schedule in production and by an npm script in dev.

## Technical Context

**Language/Version**: Node.js 20 LTS + Express.js (consistent with existing backend stack)
**Primary Dependencies**: `node-cron` (Cron scheduler), `@google/generative-ai` (Gemini SDK — first integration), `@tavily/core` (Tavily Extract SDK — first integration), `mongoose` (existing)
**Storage**: MongoDB Atlas free tier via Mongoose — collection: `course_units`; upsert filter key: `{ code, major }`
**Testing**: Jest — unit tests only; Tavily API, Gemini API, and MongoDB all mocked; fake API key fixtures hardcoded
**Target Platform**: Render free-tier (Node.js server, cold start ~50s); Cron runs in same process as Express app
**Project Type**: Background job embedded in web-service monolith
**Performance Goals**: Sequential Tavily calls (no parallel) to respect free-tier rate limits; single `bulkWrite` round-trip per URL batch; minimal Gemini token usage via concise prompts
**Constraints**: No Redis or external queue — `node-cron` only; no new collections beyond `course_units`; manual trigger restricted to dev environment (`NODE_ENV !== production`)
**Scale/Scope**: ~10–20 curriculum URLs per run; runs once per semester in production; full batch completes in single cron invocation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Modular Monolithic**: All code lives in `backend/src/modules/curriculum/`. Tavily and Gemini are implementation details of the pipeline — no cross-module imports. Curriculum module boundary is respected.
- [x] **UET-First**: URLs, major identifiers, and schema are all hardcoded/configured for UET-VNU context only. No generalization to other universities.
- [x] **Privacy**: Feature has no student credentials — operates entirely on publicly available curriculum pages. Privacy rules (no credential storage) are not triggered. ✅ Not applicable.
- [x] **AI-Assisted**: Gemini output is validated against CourseUnit JSON schema before any upsert. Invalid output causes the URL to be skipped and logged — no blind trust.
- [x] **Test What Matters**: Unit tests mandatory for pipeline logic (per-URL processing), cycle detection (DFS with cycle / DFS clean graph), and `bulkWrite` upsert behavior (overwrite on match, insert on new). All external dependencies mocked.

## Project Structure

### Documentation (this feature)

```text
specs/002-seed-ctdt-dag/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── job-interface.md # Trigger interface, exit codes, log schema
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   └── modules/
│       └── curriculum/
│           ├── courseUnit.model.js      # Mongoose schema + model
│           ├── seed.pipeline.js         # Main pipeline: extract → parse → validate → upsert
│           ├── seed.job.js              # node-cron registration + manual trigger export
│           ├── tavily.service.js        # Tavily Extract API wrapper
│           ├── gemini.service.js        # Gemini SDK wrapper (structured JSON output)
│           ├── cycle.detector.js        # DFS cycle detection per-major subgraph
│           ├── seed.logger.js           # Console + file log writer
│           └── curriculum.config.js     # URL list + job config
├── tests/
│   └── unit/
│       └── curriculum/
│           ├── seed.pipeline.test.js    # Pipeline happy path + per-URL skip
│           ├── cycle.detector.test.js   # Cycle found + clean graph
│           └── bulkWrite.upsert.test.js # Overwrite on match, insert on new
└── logs/
    └── seed-ctdt.log                    # File log output (gitignored)
```

**Structure Decision**: Option 2 (backend monolith) — all new code is co-located under `backend/src/modules/curriculum/`. No frontend changes. No new top-level directories.

## Complexity Tracking

> No Constitution violations. No justification required.
