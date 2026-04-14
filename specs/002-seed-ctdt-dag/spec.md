# Feature Specification: Seed UET Curriculum into DB as DAG

**Feature Branch**: `002-seed-ctdt-dag`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Seed CTĐT UET vào DB dưới dạng DAG"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Batch Seed Succeeds (Priority: P1)

The system processes all configured Programs and their typed source URLs, extracts curriculum information, persists all CourseUnit/ProgramOutcome records, then executes Call 2 batch enrichment per Program. After all data is stored and enriched, it validates the structural integrity of the resulting prerequisite graph.

**Why this priority**: This is the core happy path. Without a successful full-batch seed, no downstream features — academic roadmap, recommendation engine, onboarding UI — have reliable data to work with.

**Independent Test**: Can be fully tested by triggering the job with a pre-configured Program list whose source URLs are all accessible, then verifying that the data store contains all expected CourseUnits with correct prerequisite relationships and enrichment fields, and that the job exits with SUCCESS.

**Acceptance Scenarios**:

1. **Given** a Program-based job configuration is specified, **And** all source URLs are accessible, **And** content extraction + Call 1 parsing succeeds for all sources, **And** Call 2 batch enrichment succeeds for every Program, **When** the job is triggered (scheduled or manual), **Then** all CourseUnits and ProgramOutcomes are upserted into the data store, existing entries with matching identifiers are fully overwritten, enrichment fields are persisted according to policy, post-seed cycle detection runs on the complete graph, all results are written to log, and the job exits with status `SUCCESS`.

2. **Given** a CourseUnit already exists in the data store with the same course code and `programId`, **When** the job runs and produces that record again, **Then** the existing entry is completely overwritten with the new data (no partial update, no duplicate).

---

### User Story 2 - Partial Failure Handling (Priority: P1)

One or more source URLs fail during processing (extraction failure, parse failure, or invalid output), or a Program fails at Call 2 batch enrichment. Successfully processed Programs/sources are still persisted, and the job reports a partial failure without stopping the overall run.

**Why this priority**: Partial failure is the most common real-world condition — curriculum pages change, external services have transient errors. Graceful partial failure ensures the data store always reflects at least the successfully processed data, and makes failures visible without requiring a full re-run.

**Independent Test**: Can be fully tested by configuring a Program/source list that includes at least one intentionally broken URL (or an induced Call 2 failure), triggering the job, and verifying that valid data is saved while the failed unit's error is logged and the job exits with `PARTIAL_FAILURE`.

**Acceptance Scenarios**:

1. **Given** at least one source URL fails at any processing step, or one Program fails at Call 2, **When** the job encounters that failure, **Then** the error is logged with `programId`, URL (if applicable), processing stage, and reason; the job skips only the failed unit of work and continues with remaining Programs/sources; successful records are upserted normally; and the job exits with status `PARTIAL_FAILURE`.

2. **Given** a URL fails at the extraction stage, **When** the error is logged, **Then** no CourseUnit data for that URL is written to the data store, and previously stored data for all other URLs is unaffected.

---

### User Story 3 - Post-Seed Cycle Detection (Priority: P1)

After all upserts complete, the system validates the full prerequisite graph for cyclic dependencies and reports findings through the log.

**Why this priority**: A cycle in the prerequisite graph renders the academic roadmap and any dependency-based features incorrect. Detection must happen automatically after every batch to surface data quality issues immediately, before downstream consumers read the data.

**Independent Test**: Can be fully tested by arranging CourseUnit records in the data store to form a known cycle before the post-seed phase, triggering cycle detection, and verifying that the warning log identifies the specific nodes involved and that the data is unchanged.

**Acceptance Scenarios**:

1. **Given** all upserts are complete, **And** no cycles exist in the prerequisite graph, **When** cycle detection runs, **Then** the system logs a clean-graph confirmation and the job proceeds to SUCCESS.

2. **Given** all upserts are complete, **And** at least one cycle exists in the prerequisite graph, **When** cycle detection runs, **Then** the system logs a warning identifying all nodes involved in each cycle, data in the store is preserved (no rollback), and the job exits with status `FAILED` along with a log note that the graph state is invalid.

---

### User Story 4 - Manual Trigger on Dev Environment (Priority: P2)

A developer can manually trigger the seed job on a development environment to test or debug the pipeline without waiting for the scheduled run.

**Why this priority**: Manual trigger accelerates the development and debugging cycle but is not needed in production. It is a tooling convenience, not a core data integrity feature.

**Independent Test**: Can be fully tested by running the manual trigger on a dev environment and confirming that execution flow, log output, and exit status are identical to a scheduled run under the same conditions.

**Acceptance Scenarios**:

1. **Given** the system is running on a dev environment, **When** a developer manually triggers the job, **Then** the job executes the full pipeline identically to a scheduled run, results are logged to console and file, and the job exits with the appropriate status (`SUCCESS`, `PARTIAL_FAILURE`, or `FAILED`).

---

### Edge Cases

- What happens when **all** configured URLs fail? The job logs all errors and exits with status `PARTIAL_FAILURE`; no data is written or modified.
- What happens when the Program configuration list is empty? The job exits immediately with a log warning and `SUCCESS` status — nothing to process is a valid no-op.
- What happens when the same course code + `programId` appears successfully in multiple URLs within a single run? The last successful upsert within the batch wins (last-write-wins per batch).
- What happens when cycle detection itself fails at runtime (unexpected error)? The error is logged and the job exits with `FAILED`; existing data in the store is preserved.
- What happens when a CourseUnit references a prerequisite that does not exist in the data store? The node is stored as-is; the dangling reference is flagged in the log as an unresolved prerequisite.
- What happens when Call 2 fails for one Program while other Programs succeed? The failing Program is logged and flagged, successful Programs continue, and the run exits with `PARTIAL_FAILURE` unless a global `FAILED` condition occurs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The job MUST load curriculum configuration from curriculum.config.js as defined in FR-017.
- **FR-002**: The job MUST extract raw content from each configured source URL using a content extraction service.
- **FR-003**: Extracted content MUST be processed by an AI parsing service (Call 1) to produce structured Program/CourseUnit/ProgramOutcome records conforming to the defined schema.
- **FR-004**: Each valid CourseUnit record MUST be upserted into the persistent data store; records with a matching course code and `programId` MUST be fully overwritten.
- **FR-005**: If processing fails for any source URL or Program-level AI stage, the job MUST log the failure with `programId`, URL (if applicable), stage, and reason; skip only the failed work item; and continue processing remaining work without interruption.
- **FR-006**: After all upserts complete, the job MUST run cycle detection across the full prerequisite graph in the persistent data store.
- **FR-007**: If a cycle is detected, the job MUST log a warning identifying all nodes involved; the stored data MUST NOT be rolled back.
- **FR-008**: The job MUST be triggered automatically on a recurring schedule, configurable via the `SEED_CRON_SCHEDULE` environment variable (falling back to `0 0 1 3,8 *` if unset).
- **FR-009**: A manual trigger mechanism MUST be available on the development environment.
- **FR-010**: All job events — errors, warnings, results, and final status — MUST be written to both console output and a persistent log file.
- **FR-011**: The job MUST read `SKILL_VOCABULARY` (an array of canonical skill tag strings) from `curriculum.config.js` and inject it into the Batch Enrichment prompt for Call 2. The vocabulary MUST be defined and maintained manually by the team in this config file.
- **FR-012**: The job MUST read `CAREER_TRACKS` (an array of authoritative career track objects, each with `trackId` and `description`) from `curriculum.config.js` and inject it into the Batch Enrichment prompt for Call 2. Only track IDs defined in this config MAY be assigned to CourseUnit and ProgramOutcome records.
- **FR-013**: After all Call 1 upserts complete for a given Program, the job MUST execute a second Gemini call (Call 2 — Batch Enrichment) that receives the full Program context (metadata, all CourseUnits, all ProgramOutcomes, `CAREER_TRACKS`, `SKILL_VOCABULARY`) and returns enrichment fields for ALL CourseUnits and ProgramOutcomes in a SINGLE response. Enrichment fields covered: `difficultyLevel`, `careerTracks` (CourseUnit), `skills` (CourseUnit), `careerTracks` (ProgramOutcome).
- **FR-014**: Each enriched `CourseUnit.skills` array MUST be stored with a source flag `scrapeType: "ai-inferred"` initially. Once a team member reviews and validates the skills for a CourseUnit, the flag MUST be promotable to `"human-validated"` (S4 Authoritative Enrichment Layer policy). Feature 009 MUST prioritize `"human-validated"` over `"ai-inferred"` over `"ai-fallback-runtime"` when reading skills.
- **FR-015**: The `emphasis` field of each CourseUnit MUST be computed deterministically from `theoryHours` and `practiceHours` using the rule: `practiceRatio = practiceHours / (theoryHours + practiceHours)`; `ratio < 0.25` → `"theory-heavy"`; `0.25 ≤ ratio ≤ 0.55` → `"balance"`; `ratio > 0.55` → `"project-heavy"`. This computation MUST happen in the normalization step after Call 1 (not via AI).
- **FR-016**: The job MUST create a `SeedRun` record at the start of each execution, update its `status` throughout the run, and record a `urlSnapshot` (URL, contentHash, httpEtag, lastModified) for each successfully fetched URL. The scheduler MUST compare snapshots from the last completed `SeedRun` against current HTTP headers (HEAD request) before deciding whether to re-process a Program. If no change is detected for all URLs of a Program, that Program MUST be skipped in the current run.
- **FR-017**: The job configuration in `curriculum.config.js` MUST be structured as an array of Program objects, each with a `programId` and a `sources` map keyed by `scrapeType` (`"program-overview"`, `"curriculum-table"`, `"program-outcome"`), rather than a flat list of URLs. This structure enables the pipeline to associate each URL with its semantic role and enables per-Program processing loops.

### Non-Functional Requirements

- **NFR-001 (Isolation)**: A failure at any processing step for one source URL or one Program-level stage MUST NOT affect the processing of any other Program/source in the same run.
- **NFR-002 (Observability)**: Every failure and warning MUST include sufficient context (`programId`, URL if applicable, processing stage, error reason) to diagnose the issue and replay the affected unit manually.
- **NFR-003 (Idempotency)**: Running the job multiple times on the same source data MUST produce the same data store state — no duplicate records, no unintended data loss.
- **NFR-004 (Completeness)**: Cycle detection MUST operate on the full graph state in the persistent data store after each batch, not on an in-memory or partial subset.

### Key Entities

- **CourseUnit**: A single academic course in the curriculum. Uniquely identified by course code and `programId`. Acts as a node in the prerequisite DAG. Key attributes: course code, course name, credit count, `programId`, list of prerequisite course codes, enriched fields (difficultyLevel, careerTracks, skills, emphasis).
- **Prerequisite Relationship**: A directed edge from one CourseUnit to another, indicating that the source course must be completed before the target course. All such relationships collectively form the DAG structure.
- **SeedJob**: The background process that orchestrates the full pipeline — configuration reading → content extraction → AI parsing → upsert → cycle detection → status reporting.
- **Program**: Represents a full UET degree program. Contains metadata: `programId`, `nameVI`, `nameEN`, `degree`, `durationYears`, `totalCredits`, `objectives` (used as AI context), `creditBlocks` (curriculum structure), and `source` (provenance). Uniquely identified by `programId`.
- **ProgramOutcome (PLO)**: A declared program-level learning outcome. Linked to a Program via `programId`. Contains `description` (authoritative AI context for roadmap reasoning), `careerTracks` (AI-inferred, enriched in Call 2). Uniquely identified by `poId`.
- **CourseOutcome (CLO)**: A course-level learning outcome. Linked to a CourseUnit via `courseCode`. Contains `description`, `relatedPoIds` (mapping CLO → PLO), and `skills` (validated skill tags). NOT scraped in MVP (UET CLO pages require authentication); the `courseOutcomeId` field in CourseUnit is nullable and exists only for future enrichment.
- **SeedRun**: Operational record of a single job execution. Tracks `status` (pending/running/completed/failed), `programId` scope, `urlSnapshots` (content hashes and HTTP headers for change detection), timing, and summary counts. Used by the scheduler to detect whether re-processing is needed. NOT the same as `source` provenance in entity records — `SeedRun` is operational metadata; `source` is lineage metadata.
- **CareerTrack**: An authoritative career profile defined in `curriculum.config.js`. Contains `trackId` (e.g. `"software-engineer-japan"`) and `description`. Used as a closed vocabulary for AI enrichment — AI MUST NOT invent new track IDs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The job exits with status `SUCCESS` only when 100% of configured Programs complete all required stages (Call 1 ingest + Call 2 enrichment + post-seed validation); any source URL or Program-level stage failure results in `PARTIAL_FAILURE` — data from successful Programs is always fully persisted.
- **SC-002**: After each job run, every successfully processed CourseUnit in the data store reflects the most recent data from its source URL, including deterministic normalization and enrichment fields — no stale records exist for successfully processed Programs.
- **SC-003**: Post-seed cycle detection runs after every batch and produces a log entry that is unambiguously either a clean-graph confirmation or a warning listing all cycle-involved nodes — no silent or ambiguous outcomes.
- **SC-004**: No failure is swallowed silently — every error and warning appears in both console output and the log file with enough detail to identify the affected URL and stage.
- **SC-005**: A manual trigger on the dev environment produces identical execution behavior and log output to a scheduled trigger under the same input conditions.
- **SC-006**: After Call 2 completes for a Program, every CourseUnit belonging to that Program MUST have non-null `difficultyLevel` (1–5), `careerTracks` (≥1 entry), and `skills` (≥1 entry, source `"ai-inferred"`). A Call 2 failure for a Program MUST be logged and flagged, but MUST NOT block the job from continuing to the next Program.
- **SC-007**: Every `CourseUnit.skills` entry stored with `scrapeType: "ai-inferred"` MUST only contain skill tags present in `SKILL_VOCABULARY`. No free-form or invented tags are accepted — if Gemini returns a tag outside the vocabulary, it MUST be silently dropped before upsert.
- **SC-008**: The change-detection mechanism (via `SeedRun.urlSnapshots`) MUST result in zero Tavily Extract calls and zero Gemini calls for any Program whose source URLs have not changed since the last completed `SeedRun`. This is verified by confirming that re-running the job immediately after a successful run produces no API calls and no DB writes for unchanged Programs.
- **SC-009**: Every `CourseUnit.careerTracks` and `ProgramOutcome.careerTracks` value persisted after Call 2 MUST belong to `CAREER_TRACKS.trackId` from `curriculum.config.js`. Any out-of-vocabulary track ID returned by Gemini MUST be dropped before upsert.

## Assumptions

- The Program/source URL configuration is stable enough to be maintained in a configuration file; dynamic source discovery is out of scope for this feature.
- Course code + `programId` is a sufficient unique identifier for a CourseUnit within the system.
- A cycle in the prerequisite graph results in a `FAILED` job status to signal invalid graph state, but data is preserved (no rollback) to allow manual correction.
- The development environment is identifiable by the system at runtime to gate manual trigger availability.
- Running the seed job on an already-populated data store is expected behavior; overwrite semantics (via upsert) apply at all times.
- `CourseOutcome` records are not populated in MVP. The `courseOutcomeId` field in `CourseUnit` is nullable by design; CLO enrichment is deferred to a future feature.
- `SKILL_VOCABULARY` and `CAREER_TRACKS` are team-maintained static configs. Their accuracy is a team responsibility, not a system guarantee.
