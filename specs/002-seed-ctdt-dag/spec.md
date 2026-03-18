# Feature Specification: Seed UET Curriculum into DB as DAG

**Feature Branch**: `002-seed-ctdt-dag`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "Seed CTĐT UET vào DB dưới dạng DAG"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Full Batch Seed Succeeds (Priority: P1)

The system processes all configured curriculum URLs, extracts course information from each, and persists every CourseUnit into the data store. After all data is stored, it validates the structural integrity of the resulting prerequisite graph.

**Why this priority**: This is the core happy path. Without a successful full-batch seed, no downstream features — academic roadmap, recommendation engine, onboarding UI — have reliable data to work with.

**Independent Test**: Can be fully tested by triggering the job with a pre-configured list of accessible URLs and verifying that the data store contains all expected CourseUnits with correct prerequisite relationships, and that the job exits with SUCCESS.

**Acceptance Scenarios**:

1. **Given** a list of curriculum URLs is specified in job configuration, **And** all URLs are accessible, **And** content extraction succeeds for all URLs, **And** all extracted content is parsed into valid CourseUnit records, **When** the job is triggered (scheduled or manual), **Then** all CourseUnits from all URLs are upserted into the data store, existing entries with matching course code and major are fully overwritten, post-seed cycle detection runs on the complete graph, all results are written to log, and the job exits with status `SUCCESS`.

2. **Given** a CourseUnit already exists in the data store with the same course code and major, **When** the job runs and produces that record again, **Then** the existing entry is completely overwritten with the new data (no partial update, no duplicate).

---

### User Story 2 - Partial Failure Handling (Priority: P1)

One or more URLs fail during processing (extraction failure, parse failure, or invalid output). Successfully processed URLs are still persisted, and the job reports a partial failure without stopping the overall run.

**Why this priority**: Partial failure is the most common real-world condition — curriculum pages change, external services have transient errors. Graceful partial failure ensures the data store always reflects at least the successfully processed data, and makes failures visible without requiring a full re-run.

**Independent Test**: Can be fully tested by configuring a URL list that includes at least one intentionally broken URL, triggering the job, and verifying that valid data is saved while the failed URL's error is logged and the job exits with `PARTIAL_FAILURE`.

**Acceptance Scenarios**:

1. **Given** at least one URL fails at any processing step, **When** the job encounters that failure, **Then** the error is logged with URL, processing stage, and reason; the job skips that URL and continues with remaining URLs; CourseUnits from successful URLs are upserted normally; and the job exits with status `PARTIAL_FAILURE`.

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
- What happens when the URL configuration list is empty? The job exits immediately with a log warning and `SUCCESS` status — nothing to process is a valid no-op.
- What happens when the same course code + major appears successfully in multiple URLs within a single run? The last successful upsert within the batch wins (last-write-wins per batch).
- What happens when cycle detection itself fails at runtime (unexpected error)? The error is logged and the job exits with `FAILED`; existing data in the store is preserved.
- What happens when a CourseUnit references a prerequisite that does not exist in the data store? The node is stored as-is; the dangling reference is flagged in the log as an unresolved prerequisite.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The job MUST read the list of curriculum URLs from a designated configuration source.
- **FR-002**: The job MUST extract raw content from each configured URL using a content extraction service.
- **FR-003**: Extracted content MUST be processed by an AI parsing service to produce structured CourseUnit records conforming to the defined schema.
- **FR-004**: Each valid CourseUnit record MUST be upserted into the persistent data store; records with a matching course code and major MUST be fully overwritten.
- **FR-005**: If processing fails for any URL at any stage, the job MUST log the failure with URL, stage, and reason; skip that URL; and continue processing the remaining URLs without interruption.
- **FR-006**: After all upserts complete, the job MUST run cycle detection across the full prerequisite graph in the persistent data store.
- **FR-007**: If a cycle is detected, the job MUST log a warning identifying all nodes involved; the stored data MUST NOT be rolled back.
- **FR-008**: The job MUST be triggered automatically on a recurring schedule, configurable via the `SEED_CRON_SCHEDULE` environment variable (falling back to `0 0 1 3,8 *` if unset).
- **FR-009**: A manual trigger mechanism MUST be available on the development environment.
- **FR-010**: All job events — errors, warnings, results, and final status — MUST be written to both console output and a persistent log file.

### Non-Functional Requirements

- **NFR-001 (Isolation)**: A failure at any processing step for one URL MUST NOT affect the processing of any other URL in the same run.
- **NFR-002 (Observability)**: Every failure and warning MUST include sufficient context (URL, processing stage, error reason) to diagnose the issue and replay the affected URL manually.
- **NFR-003 (Idempotency)**: Running the job multiple times on the same source data MUST produce the same data store state — no duplicate records, no unintended data loss.
- **NFR-004 (Completeness)**: Cycle detection MUST operate on the full graph state in the persistent data store after each batch, not on an in-memory or partial subset.

### Key Entities

- **CourseUnit**: A single academic course in the curriculum. Uniquely identified by course code and major. Acts as a node in the prerequisite DAG. Key attributes: course code, course name, credit count, major, list of prerequisite course codes.
- **Prerequisite Relationship**: A directed edge from one CourseUnit to another, indicating that the source course must be completed before the target course. All such relationships collectively form the DAG structure.
- **SeedJob**: The background process that orchestrates the full pipeline — configuration reading → content extraction → AI parsing → upsert → cycle detection → status reporting.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The job exits with status `SUCCESS` only when 100% of configured URLs are successfully upserted; any URL failure results in `PARTIAL_FAILURE` — data from successful URLs is always fully persisted.
- **SC-002**: After each job run, every CourseUnit in the data store reflects the most recent data from its source URL — no stale records exist for successfully processed URLs.
- **SC-003**: Post-seed cycle detection runs after every batch and produces a log entry that is unambiguously either a clean-graph confirmation or a warning listing all cycle-involved nodes — no silent or ambiguous outcomes.
- **SC-004**: No failure is swallowed silently — every error and warning appears in both console output and the log file with enough detail to identify the affected URL and stage.
- **SC-005**: A manual trigger on the dev environment produces identical execution behavior and log output to a scheduled trigger under the same input conditions.

## Assumptions

- The list of curriculum URLs is stable enough to be maintained in a configuration file; dynamic URL discovery is out of scope for this feature.
- Course code + major is a sufficient unique identifier for a CourseUnit within the system.
- A cycle in the prerequisite graph results in a `FAILED` job status to signal invalid graph state, but data is preserved (no rollback) to allow manual correction.
- The development environment is identifiable by the system at runtime to gate manual trigger availability.
- Running the seed job on an already-populated data store is expected behavior; overwrite semantics (via upsert) apply at all times.
