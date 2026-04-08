# Implementation Plan: Seed UET Curriculum into DB as DAG

**Branch**: `002-seed-ctdt-dag` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-seed-ctdt-dag/spec.md`

## Summary

Build a background job that reads a configured list of UET Programs from
`curriculum.config.js`, each with semantic source URLs (overview, curriculum table, program outcome). For each Program, the job checks whether source content has changed since the last completed run (via `SeedRun` change detection). If changed, it executes a two-phase pipeline: **Call 1** uses Tavily Extract + Gemini to parse and upsert `Program`, `ProgramOutcome`, and `CourseUnit` records (with `emphasis` computed deterministically); **Call 2** uses a single Gemini Batch Enrichment call per Program to infer `difficultyLevel`, `careerTracks`, and `skills` for all CourseUnits and ProgramOutcomes at once, using `CAREER_TRACKS` and `SKILL_VOCABULARY` from config as closed vocabularies. After all Programs are processed, DFS cycle detection runs per-program (`programId`). All run state is tracked in `SeedRun` records. Triggered by `node-cron` (semester schedule) in production and by npm script in dev.

## Technical Context

**Language/Version**: Node.js 20 LTS + Express.js (consistent with existing backend stack)
**Primary Dependencies**: `node-cron` (Cron scheduler), `@google/generative-ai` (Gemini SDK — first integration), `@tavily/core` (Tavily Extract SDK — first integration), `mongoose` (existing)
**Storage**: MongoDB Atlas free tier via Mongoose — collections: `course_units`, `programs`, `program_outcomes`, `course_outcomes` (schema only, empty in MVP), `seed_runs`; upsert filter key for CourseUnit: `{ code, programId }`
**Testing**: Jest — unit tests only; Tavily API, Gemini API, and MongoDB all mocked; fake API key fixtures hardcoded
**Target Platform**: Render free-tier (Node.js server, cold start ~50s); Cron runs in same process as Express app
**Project Type**: Background job embedded in web-service monolith
**Performance Goals**: Sequential Tavily calls (no parallel) to respect free-tier rate limits; single `bulkWrite` round-trip per Program per phase; **Call 2 Batch Enrichment uses a single Gemini call per Program** (not per CourseUnit) to minimize API usage — full program context (60–70 courses) fits well within Gemini 2.5 Flash's 1M token context window; maximum 7 Call 2 invocations for all configured Programs.
**Constraints**: No Redis or external queue — `node-cron` only; New collections scoped to curriculum module: `programs`, `program_outcomes`, `seed_runs`; `course_outcomes` defined but empty in MVP; manual trigger restricted to dev environment (`NODE_ENV !== production`)
**Scale/Scope**: ~7 configured Programs (each with 1–3 source URLs) per run; runs once per semester in production; full batch completes in single cron invocation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Modular Monolithic**: All code lives in `backend/src/modules/curriculum/`. Tavily and Gemini are implementation details of the pipeline — no cross-module imports. Curriculum module boundary is respected.
- [x] **UET-First**: URLs, program identifiers, and schema are all hardcoded/configured for UET-VNU context only. No generalization to other universities.
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
│           ├── program.model.js         # Mongoose schema + model for Program
│           ├── programOutcome.model.js  # Mongoose schema + model for ProgramOutcome
│           ├── courseOutcome.model.js   # Mongoose schema + model for CourseOutcome (schema only, MVP)
│           ├── seedRun.model.js         # Mongoose schema + model for SeedRun
│           ├── seed.pipeline.js         # Main pipeline: extract → parse → validate → upsert
│           ├── enrichment.pipeline.js   # Call 2: Batch Enrichment — single Gemini call per Program
│           ├── seed.job.js              # node-cron registration + manual trigger export
│           ├── tavily.service.js        # Tavily Extract API wrapper
│           ├── gemini.service.js        # Gemini SDK wrapper (structured JSON output)
│           ├── cycle.detector.js        # DFS cycle detection per-program subgraph
│           ├── seed.logger.js           # Console + file log writer
│           └── curriculum.config.js     # Program list + source URLs by scrapeType and add array: CAREER_TRACKS + SKILL_VOCABULARY
├── tests/
│   └── unit/
│       └── curriculum/
│           ├── seed.pipeline.test.js    # Pipeline happy path + per-URL skip
│           ├── cycle.detector.test.js   # Cycle found + clean graph
│           ├── bulkWrite.upsert.test.js # Overwrite on match, insert on new
│           ├── enrichment.pipeline.test.js # Call 2 batch enrichment + vocabulary filtering
│           └── seedRun.changeDetection.test.js # Change detection: skip on no change, re-run on
└── logs/
    └── seed-ctdt.log                    # File log output (gitignored)
```

**Structure Decision**: Option 2 (backend monolith) — all new code is co-located under `backend/src/modules/curriculum/`. No frontend changes. No new top-level directories.

## Complexity Tracking

> No Constitution violations. No justification required.
