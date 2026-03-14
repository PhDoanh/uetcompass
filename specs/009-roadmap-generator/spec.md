# Feature Specification: AI-Powered Personalised Roadmap Generator

**Feature Branch**: `009-roadmap-generator`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Generate a software requirements specification for the AI-Powered Personalised Roadmap Generator feature of UETCompass — a personalised learning roadmap system for UET-VNU students."

---

## Clarifications

### Session 2026-03-11

- Q: Who is responsible for producing the topologically sorted output — the AI or the system? → A: The AI outputs nodes in their final order, respecting all prerequisite and elective selection rules. The system validates the sequence and treats any ordering violation as a generation failure.
- Q: Who or what surfaces the retry trigger to the student? → A: Both — the in-app error notification carries a retry call-to-action, AND the Skill Tree (Feature 004) exposes a retry action whenever the roadmap status is `failed`.
- Q: Should `supportingSkills` be deduplicated across the whole roadmap, or scoped independently per node? → A: Each node's `supportingSkills` is independently scoped — the same skill may appear on multiple nodes if it is genuinely relevant to each. Deduplication is a presentation concern owned by Feature 004.
- Q4 dropped — automatic upgrade of low-personalisation roadmap when profile is enriched is a frontend/rendering concern; not in scope for this backend feature.
- Decision: All generated roadmaps (initial and re-generation) require explicit student acceptance before commit. The pre-acceptance state (RoadmapPreview) remains transient and not persisted in the main collection. A user may hold multiple roadmap documents, but exactly one roadmap is primary at any time.
- Decision: Re-generation triggered by `repersonalizationPending` uses the student's existing accepted roadmap as additional AI context. The previous roadmap remains active until the student accepts the new preview; it is preserved unchanged if the student rejects the preview.
- Q: Where does the RoadmapPreview live and does it expire? → A: The preview is held in-memory on the background worker only. It does not survive a worker restart and is not readable cross-session. A worker restart while a preview is pending is treated as a generation failure; the retry mechanism becomes available.
- Q: If no accepted roadmap exists when `repersonalizationPending` triggers re-generation, what happens? → A: Re-generation proceeds as a fresh initial generation — StudentProfile and DAG are the only inputs; no base roadmap context is provided to the AI. This is not an error.
- Decision (canonical ownership): Feature 009 is the sole owner of roadmap lifecycle/state-transition rules. All other features consume roadmap data via 009 API/service contract only.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Generate Personalised Roadmap from Full Profile (Priority: P1)

When a student submits their full onboarding profile (including career goal, completed courses, and other optional fields), the system asynchronously generates a personalised learning roadmap. The roadmap contains a career-targeted subset of courses — all required prerequisite courses plus only the electives the AI determines are most relevant to the student's stated role and company type — ordered to respect all academic prerequisites. Each course node is enriched with the skills gained directly from the course, supporting skills the student must self-study to use that knowledge in practice, and a plain-language explanation of why the course matters for their specific career goal. Upon completion, the student is presented with a roadmap preview; the roadmap is committed as their active roadmap only after they explicitly accept it.

**Why this priority**: This is the core value delivery of the entire system. Without a generated roadmap, UETCompass provides no learning guidance. All downstream features (Skill Tree, Resource Curation) depend on this output existing.

**Independent Test**: Can be fully tested by triggering generation with a complete StudentProfile (all fields filled), then verifying the stored Roadmap document contains: only career-relevant courses in valid prerequisite order, no completed courses as actionable nodes, and every node having non-empty gainedSkills, supportingSkills, reason, careerRelevanceNote, and an empty resources array.

**Acceptance Scenarios**:

1. **Given** a student has submitted a full profile with major, completedCourseIds, and a career goal, **When** the profile submission event fires, **Then** the system accepts it and begins asynchronous roadmap generation without blocking any other student activity.
2. **Given** generation is in progress, **When** the AI selects courses, **Then** all required courses that are direct or transitive prerequisites of career-relevant courses are included, and only career-relevant electives are included.
3. **Given** the student has completed courses, **When** the roadmap is assembled, **Then** completed courses do not appear as actionable roadmap nodes, but their prerequisite relationships are used to determine which subsequent nodes are already unlocked.
4. **Given** the course selection is complete, **When** the roadmap nodes are ordered, **Then** every node appears after all of its prerequisite nodes in the sequence, with no exceptions.
5. **Given** every selected node is ordered, **When** the AI enriches each node, **Then** each node has a gainedSkills list (skills taught by the course), a supportingSkills list (skills NOT in the course but needed in practice for the career goal), a reason, a careerRelevanceNote, and an empty resources array.
6. **Given** generation completes successfully, **When** the AI output is validated, **Then** a roadmap preview is prepared and the student receives an in-app notification that their roadmap is ready for review.
7. **Given** the student reviews the roadmap payload, **When** the student accepts it through the 009 acceptance contract, **Then** the roadmap is committed as a Roadmap document and may become primary according to primary-selection rules.
8. **Given** the student reviews the roadmap preview, **When** the student rejects it, **Then** the preview is discarded, any existing roadmap remains unchanged, and the retry mechanism becomes available.

---

### User Story 2 - Generate Generic Roadmap from Minimal Profile (Priority: P2)

A student submits their onboarding with only the required major field filled in and no career goal provided. The system generates a generic roadmap covering the core required courses of that major in valid prerequisite order. Supporting skills are general best-practice recommendations rather than role-targeted guidance. The roadmap is explicitly flagged as low-personalisation so the downstream Skill Tree can surface a notice prompting the student to enrich their profile.

**Why this priority**: Students who submit minimal profiles must not be left without a roadmap. A generic fallback ensures the system always delivers value while communicating clearly that personalisation was limited.

**Independent Test**: Can be fully tested by triggering generation with a StudentProfile containing only a major (all optional fields empty), then verifying the stored Roadmap document contains all required courses for that major, in valid prerequisite order, with a low-personalisation flag set, and every node having a non-empty gainedSkills and generic supportingSkills.

**Acceptance Scenarios**:

1. **Given** a student has submitted a profile with only a major and no career goal, **When** generation is triggered, **Then** the system detects the absence of career goal data and routes generation through the generic pathway.
2. **Given** generic generation mode is active, **When** the AI selects courses, **Then** all required courses for the student's major are included; elective selection is minimal or omitted.
3. **Given** courses are selected in generic mode, **When** each node is enriched, **Then** gainedSkills are still course-specific, but supportingSkills contain only universally applicable best-practice recommendations rather than role-targeted guidance.
4. **Given** generic generation completes, **When** the roadmap preview is prepared, **Then** it carries a low-personalisation flag.
5. **Given** the roadmap preview is ready, **When** the student receives their notification, **Then** the notification includes an indication that personalisation quality is limited.
6. **Given** the student reviews the generic roadmap payload, **When** the student accepts it, **Then** the roadmap is committed carrying the low-personalisation flag and managed under the same primary-selection rules.

---

### User Story 3 - Retry Roadmap Generation After Failure (Priority: P3)

Roadmap generation fails due to an AI service error or timeout. The system stores the failure state and the student receives an error notification. The student can trigger a retry without resubmitting their profile. On retry, generation runs through the same lifecycle as the initial attempt and produces a complete Roadmap document that replaces any previous (failed) state.

**Why this priority**: Generation failures are anticipated and the retry path is the recovery mechanism. Without it, a failed generation permanently leaves the student without a roadmap.

**Independent Test**: Can be fully tested by simulating a generation failure, confirming the error state is stored and the student is notified, then triggering a retry and confirming a complete Roadmap is produced and replaces the failed state.

**Acceptance Scenarios**:

1. **Given** generation encounters a failure (AI service error, timeout, or malformed AI output), **When** the failure is detected, **Then** the system stores the error state on the Roadmap document without corrupting the student's profile.
2. **Given** a failed generation state is stored, **When** the system finishes error handling, **Then** the student receives an in-app error notification.
3. **Given** a failed Roadmap state exists, **When** the student triggers a retry, **Then** generation re-reads the existing StudentProfile and re-runs the full generation lifecycle.
4. **Given** a retry generation completes successfully, **When** the accepted roadmap is committed, **Then** canonical transition rules are applied and stale failure state is not exposed as the latest accepted version.
5. **Given** the student has not resubmitted their profile, **When** they initiate a retry, **Then** the system uses the same StudentProfile as the original attempt.

---

### User Story 4 - Re-generate Roadmap on Career Goal Update (Priority: P3)

After a student updates their career goal in Account Settings, the `repersonalizationPending` flag is set to true on their profile. The system re-generates the roadmap using the student's existing accepted roadmap as a base alongside the updated profile — previously approved course selections and enrichments inform the new output without constraining it. Re-generation runs asynchronously. On completion, the student is presented with a preview of the updated roadmap. The previous roadmap remains the student's active roadmap until the student explicitly accepts the preview. If the student rejects the preview, the previous roadmap is preserved unchanged and `repersonalizationPending` is cleared.

**Why this priority**: Without re-generation, career goal updates in Account Settings have no effect on the student's roadmap, rendering that feature's personalisation update meaningless.

**Independent Test**: Can be fully tested by updating a student's career goal (setting repersonalizationPending to true), triggering re-generation, confirming the preview builds on the existing roadmap and reflects the new career goal, accepting it, and verifying the new roadmap supersedes the previous one. Separately verified by rejecting the preview and confirming the previous roadmap remains intact and unchanged.

**Acceptance Scenarios**:

1. **Given** a student's career goal has been updated and repersonalizationPending is true, **When** re-generation is triggered, **Then** it runs asynchronously without blocking the student, and the existing accepted roadmap is provided to the AI as additional context.
2. **Given** re-generation is in progress, **When** the AI generates the updated roadmap, **Then** it uses the updated career goal from the current StudentProfile and the existing accepted roadmap as a base; the previous course selections inform but do not constrain the new output.
3. **Given** re-generation completes successfully, **When** the roadmap preview is ready, **Then** the student receives an in-app notification that their updated roadmap is ready for review.
4. **Given** the student reviews the updated roadmap payload, **When** the student accepts it, **Then** the accepted roadmap is committed under canonical transition rules, primary assignment is consistent, and repersonalizationPending is cleared on the StudentProfile.
5. **Given** the student reviews the updated roadmap preview, **When** the student rejects it, **Then** the preview is discarded, the previous roadmap remains the student's active roadmap unchanged, and repersonalizationPending is cleared.
6. **Given** re-generation fails, **When** the failure is detected, **Then** the same retry mechanism is available as for initial generation failure, and the previous roadmap remains in the database unchanged.

---

### Edge Cases

- **All courses already completed**: If the student's `completedCourseIds` covers all (or nearly all) required courses for their major and career-relevant electives, the resulting actionable roadmap may be empty or near-empty. The system MUST store this as a valid result — an empty or minimal roadmap is a correct output, not a failure.
- **AI returns malformed or incomplete output**: If the AI's response cannot be parsed into a valid Roadmap document, the generation is treated as a failure: the error state is stored, and the retry mechanism becomes available.
- **Generation triggered while another is in progress**: If a retry or repersonalization trigger fires while generation is already running for the same student, the new trigger MUST be queued or debounced — duplicate concurrent generations for the same student MUST NOT occur.
- **Elective course pool is empty for a given major**: If a major has no elective courses in the DAG seed data, the AI must generate a valid roadmap from required courses only, without treating this as an error.
- **repersonalizationPending fires immediately after profile submission**: If repersonalizationPending is set while initial generation is already queued or in progress, the system must not double-generate. Re-personalisation re-generation should only run after the initial generation has completed or failed.
- **Prerequisites form a cycle** (data integrity guard): If the CourseUnit DAG unexpectedly contains a cycle (a data integrity violation from Feature 002), generation MUST fail with a descriptive error rather than entering an infinite loop.
- **Career goal is free-text with no recognizable role**: If the career goal is a fully custom free-text value with no predefined mapping, the AI must still attempt to reason about it and produce elective selections; it must not fall back silently to the generic pathway unless the career goal field is entirely absent.
- **Student rejects initial roadmap preview**: If a student has no active roadmap and rejects the first generated preview, the preview is discarded, the student is left without an active roadmap, and the retry mechanism becomes available so they can request a new generation attempt.
- **Student rejects re-generation preview**: The existing accepted roadmap remains the student's active roadmap, completely unchanged. The preview is discarded and `repersonalizationPending` is cleared. The student may trigger re-generation again at any time by updating their career goal in Account Settings.
- **repersonalizationPending triggers with no accepted roadmap**: If a student has rejected all previous previews and has no accepted roadmap when `repersonalizationPending` fires, re-generation proceeds as a fresh initial generation using only the StudentProfile and CourseUnit DAG. No base roadmap context is provided to the AI. This is a valid generation path, not an error.
- **Worker restart while preview is pending**: If the background worker restarts after generation has completed but before the student has accepted or rejected the preview, the in-memory preview is lost. This MUST be treated as a generation failure: the error state is stored on the Roadmap document (status `failed`), the student is notified, and the retry mechanism becomes available. The previous accepted roadmap (if any) remains unchanged.

---

## Requirements *(mandatory)*

### Functional Requirements

**Generation Trigger and Lifecycle**

- **FR-001**: The system MUST initiate roadmap generation asynchronously when a student's onboarding profile submission event fires (as produced by Feature 001).
- **FR-002**: The system MUST support re-generation when the `repersonalizationPending` flag is set to `true` on a StudentProfile (as set by Feature 005), following the same generation lifecycle as initial generation.
- **FR-003**: Generation MUST run fully asynchronously and MUST NOT block the student's use of any other part of the system.
- **FR-004**: If a generation trigger fires for a student who already has a generation in progress, the system MUST NOT launch a duplicate concurrent generation for that student.

**Input Retrieval**

- **FR-005**: Before generation, the system MUST retrieve the student's complete StudentProfile, including: `major`, `completedCourseIds`, `careerGoal.role`, `careerGoal.companyType`, `graduationTimeline`, and `personalAspirations`.
- **FR-006**: Before generation, the system MUST retrieve the full CourseUnit DAG for the student's major, as seeded by Feature 002, including all course codes, names, credits, types (`required` / `elective`), prerequisite arrays, and suggested semesters.

**AI-Driven Course Selection**

- **FR-007**: The system MUST provide the StudentProfile and the full CourseUnit DAG to an AI model and instruct it to (1) select a personalised subset of courses and (2) return those courses in a valid topological order respecting all prerequisite constraints. The AI is responsible for both selection and ordering.
- **FR-008**: The AI selection MUST include all `required`-type courses that are direct or transitive prerequisites of any career-relevant course in the roadmap.
- **FR-009**: The AI selection MUST include only the subset of `elective`-type courses that are most relevant to the student's stated career goal. Elective selection MUST be driven by career goal fit, not by a fixed rule.
- **FR-010**: Courses present in `completedCourseIds` MUST NOT appear as actionable roadmap nodes in the output.
- **FR-011**: Completed courses MUST be used as satisfied prerequisite anchors — the system MUST treat them as unlocked when determining which subsequent nodes in the DAG are now accessible.

**Node Ordering**

- **FR-012**: The AI MUST return roadmap nodes in a valid topological order. The system MUST validate the AI's output sequence after receiving it — if any node appears before a node it depends on directly or transitively, the system MUST treat it as a generation failure and invoke the standard failure-handling path (store error state, notify student, allow retry).

**Node Enrichment**

- **FR-013**: Each roadmap node MUST include a `gainedSkills` field: a list of skills and concepts the student directly acquires by completing the course. This field MUST contain only skills fully covered by the course content.
- **FR-014**: Each roadmap node MUST include a `supportingSkills` field: a list of skills that are NOT taught by the course but are necessary or highly beneficial to use the course's knowledge in practice for the student's career goal. This field MUST NOT repeat skills already captured in that same node's `gainedSkills`. The same skill MAY appear in `supportingSkills` on multiple nodes if it is independently relevant to each — cross-node deduplication is not required and is left to the rendering layer (Feature 004).
- **FR-015**: Each roadmap node MUST include a `reason` field: a plain-language explanation of why this course is included in the roadmap and how it contributes to the student's career goal.
- **FR-016**: Each roadmap node MUST include a `careerRelevanceNote` field: a short note specifically connecting this course to the student's target role and company type.
- **FR-017**: Each roadmap node MUST include a `resources` field. At generation time, this field MUST always be an empty array. It MUST exist in the schema and MUST NOT be omitted or set to null.

**Low-Personalisation (Minimal Profile) Pathway**

- **FR-018**: If the student's profile contains no career goal (both `careerGoal.role` and `careerGoal.companyType` are absent or empty), the system MUST generate a generic roadmap covering the required courses of the student's major in valid prerequisite order.
- **FR-019**: In the low-personalisation pathway, `supportingSkills` for each node MUST contain generic best-practice recommendations rather than role-targeted skills.
- **FR-020**: The Roadmap document MUST carry a `personalisationLevel` flag. It MUST be set to `low` when FR-018 applies, and `full` otherwise.
- **FR-021**: Roadmap generation MUST NEVER be blocked or fail due to the absence of career goal data — the low-personalisation pathway is the mandatory fallback.

**Output Storage**

- **FR-022**: On successful generation, the system MUST create a roadmap preview. The preview MUST NOT be committed to the main roadmap collection until the student explicitly accepts it.
- **FR-023**: A student MAY have multiple Roadmap documents in the main roadmap collection. Exactly one roadmap per student MUST be marked primary (`isPrimary: true`) at all times.
- **FR-024**: The Roadmap document stored in the main collection MUST record a `status` field. Valid persisted statuses are: `completed` (accepted and active) and `failed` (generation failure awaiting retry). Transient generation states are not persisted in the main roadmap collection.
- **FR-024a**: The data model MUST include `isPrimary` and enforce one-primary-per-user with a partial unique index on `{ userId: 1, isPrimary: 1 }` filtered by `{ isPrimary: true }`.
- **FR-024b**: The data model MUST include a list/query index supporting roadmap timeline retrieval by `{ userId: 1, status: 1, updatedAt: -1 }`.

**Notifications**

- **FR-025**: On successful generation, the system MUST deliver an in-app notification to the student informing them that their roadmap preview is ready for review.
- **FR-026**: If the low-personalisation pathway was used, the success notification MUST include an indication that personalisation quality is limited.
- **FR-027**: On generation failure, the system MUST deliver an in-app error notification to the student. The notification payload MUST include metadata indicating the generation is retryable (e.g., a `retryable: true` flag and a reference to the retry endpoint) so that any consuming surface can present a retry action to the student. The system MUST NOT leave the student without any notification of the failure.

**Retry Mechanism**

- **FR-028**: On generation failure, the system MUST store the error state on the Roadmap document (status `failed`) so that the failure is readable by any consuming surface.
- **FR-029**: The system MUST allow the student to trigger a retry of a failed generation without requiring profile resubmission. Retryable state MUST be discoverable via 009 contracts.
- **FR-030**: On retry, the system MUST re-read the existing StudentProfile and re-run the full generation lifecycle from the input retrieval step forward.

**Re-Generation**

- **FR-031**: When a roadmap preview resulting from a `repersonalization` trigger is either accepted or rejected by the student, the system MUST clear the `repersonalizationPending` flag on the StudentProfile regardless of the outcome.

**Feature Boundaries**

- **FR-032**: Roadmap generation MUST NEVER be blocked by the absence of Feature 003 (Resource Curation) data. The `resources` field on each node remains empty at generation time.
- **FR-033**: Roadmap generation MUST be triggered entirely by internal system events — no student-facing API endpoint for initiating generation is permitted. The acceptance and rejection of a roadmap preview are student actions and MUST be served by dedicated API endpoints that this feature provides.
- **FR-033a**: Feature 009 MUST expose canonical read APIs: `GET /api/primary-roadmap`, `GET /api/roadmaps`, and `GET /api/roadmaps/:roadmapId`.
- **FR-033b**: Feature 009 MUST expose canonical primary-switch API: `PATCH /api/roadmaps/:roadmapId/primary`.
- **FR-033c**: During migration, `GET /api/roadmap` MAY be kept as a compatibility alias for `GET /api/primary-roadmap` and MUST be documented as deprecated.

**Acceptance / Commit Contract**

- **FR-034**: Upon successful generation, the system MUST provide preview payload for review (notification-driven), but canonical acceptance MUST be payload-based and not depend on server-side preview lookup.
- **FR-035**: The acceptance endpoint MUST receive full roadmap nodes payload from caller.
- **FR-036**: Acceptance MUST execute mandatory server pipeline: (1) filter completed courses, (2) prerequisite validation, (3) commit roadmap document.
- **FR-037**: If all submitted nodes are filtered out as completed, acceptance MUST fail with `ALL_COMPLETED`.
- **FR-038**: If prerequisite or ordering constraints are violated, acceptance MUST fail with `PREREQUISITE_VIOLATION`.
- **FR-038a**: Lifecycle conflicts (e.g., concurrent generation/primary update/duplicate state operation) MUST return `CONFLICT`.
- **FR-039**: When re-generation is triggered via `repersonalizationPending`, the system MUST check whether the student has an existing accepted Roadmap document. If one exists, the system MUST supply it to the AI as additional context alongside the updated StudentProfile and full CourseUnit DAG. If no accepted Roadmap document exists (e.g., the student previously rejected all previews), the system MUST proceed as a fresh initial generation — StudentProfile and DAG only — without treating the absence of a base roadmap as an error.
- **FR-040**: Feature 009 MUST be the only feature that defines and enforces roadmap state transitions.
- **FR-041**: Acceptance and list/detail/primary APIs MUST use normalized domain error codes: `PREREQUISITE_VIOLATION`, `ALL_COMPLETED`, `CONFLICT`, `ROADMAP_NOT_FOUND`.

---

### Non-Functional Requirements

- **NFR-001 (Correctness)**: The node ordering in every generated Roadmap MUST be a valid topological sort of the selected prerequisite subgraph. The system MUST validate the AI's output ordering before storing the document — any ordering violation MUST be treated as a generation failure and MUST NOT be silently stored.
- **NFR-002 (Isolation)**: A generation failure MUST NOT alter the student's StudentProfile or any system state outside the Roadmap document itself.
- **NFR-003 (Idempotency)**: Retrying or re-generating MUST always produce a complete, valid Roadmap document. A partial or corrupted previous document MUST be fully replaced — never merged or appended to.
- **NFR-004 (Extensibility)**: The `resources` field MUST be present in the schema at generation time so that Feature 003 can later populate it without requiring a schema migration or re-generation.
- **NFR-005 (Data Integrity Guard)**: Before beginning topological ordering, the system MUST detect and reject any cyclic dependency in the CourseUnit DAG, storing a descriptive error rather than entering an infinite resolution loop.
- **NFR-006 (Concurrency Safety)**: Only one generation MUST run at a time per student — concurrent duplicate generations for the same student MUST be prevented at the system level.

---

### Key Entities

- **Roadmap**: A roadmap version document owned by Feature 009. Contains: `userId`, `studentProfileId`, `personalisationLevel`, `status`, `isPrimary`, `errorMessage`, ordered `RoadmapNode[]`, and timestamps.
- **RoadmapPreview**: A transient, in-memory representation for review UX. It is not canonical persistence and not required as acceptance source.
- **RoadmapNode**: A single enriched course entry within the roadmap's ordered sequence. Contains: `courseCode`, `courseName`, `credits`, `suggestedSemester`, `gainedSkills` (array of strings), `supportingSkills` (array of strings), `reason` (string), `careerRelevanceNote` (string), and `resources` (always an empty array at generation time).
- **RoadmapGenerationEvent**: The triggering event that initiates a generation run. Carries: `userId`, `studentProfileId`, and `triggerReason` (`profile_submission` | `retry` | `repersonalization`). This event is emitted by Feature 001 on submission and by the retry/repersonalization mechanisms.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every student who submits a full profile receives a roadmap containing only courses relevant to their stated career goal — all required prerequisite courses are present and only career-targeted electives are included; no extraneous courses appear.
- **SC-002**: Every generated roadmap's node sequence satisfies all prerequisite constraints — inspecting any pair of nodes (A → B where A is a prerequisite of B) confirms that A appears before B in the sequence, with zero violations across all generated roadmaps.
- **SC-003**: Every student who submits with only a major receives a roadmap covering all required courses of that major, flagged as low-personalisation — no student is left without a roadmap due to missing optional profile fields.
- **SC-004**: A student who experiences a generation failure can trigger a retry and receive a fully generated roadmap without resubmitting their profile — the retry path delivers the same output quality as the initial path.
- **SC-005**: Roadmap generation begins within a reasonable time after profile submission, and the student receives an in-app notification upon completion — the student is never left without feedback on generation status.
- **SC-006**: After a student updates their career goal, re-generation produces an updated roadmap that reflects the new goal — the previous roadmap's course selection and skill enrichments are not reused if they conflict with the updated goal.
- **SC-007**: Every node in every generated roadmap contains a non-empty `resources` field (as an empty array) — Feature 003 can populate it at any time without requiring re-generation or schema changes.
- **SC-008**: No roadmap generation event causes visible latency or interruption in the student's concurrent use of any other part of the system — generation is fully non-blocking from the student's perspective.

---

## Assumptions

- The CourseUnit DAG for all relevant majors is fully seeded by Feature 002 before any student submits a profile. If a major has no seeded courses, this is treated as a data integrity issue outside the scope of this feature.
- The in-app notification and SSE delivery infrastructure introduced by Features 001 and 005 is available and operational for this feature to use; this feature does not re-implement the notification mechanism.
- The StudentProfile is immutable after submission (per Feature 001 constraints); the AI always receives a consistent profile snapshot and need not handle mid-generation profile mutations.
- The AI model's outputs may occasionally be invalid or unparseable; the retry mechanism is the designed recovery path for such cases.
- "Asynchronous and non-blocking" means the generation job is enqueued and processed on a background worker; the exact queue implementation is a technical detail outside this specification.
- `repersonalizationPending` is set and cleared by the system, not by the student directly; this feature reads the flag but does not define the mechanism by which it is set.
- Feature 004 (Skill Tree) receives the `RoadmapPreview` payload via the generation completion notification and is the surface through which the student reviews and accepts or rejects it. This feature does not constrain the Skill Tree's rendering logic — including any progressive disclosure of node details.

---

## Out of Scope

- Any frontend or visualisation layer — rendering the roadmap is owned by Feature 004 (Skill Tree)
- Resource curation and population of the `resources` field on roadmap nodes — owned by Feature 003
- Roadmap editing or manual reordering by the student after generation
- Automatic transcript scraping or machine-based course completion detection
- Grade, GPA, or academic performance data in any form
- Admin tooling for reviewing, overriding, or managing individual student roadmaps
- Definition or management of the AI model used for generation (model selection is an operational concern)
- The mechanism by which `repersonalizationPending` is set — that is owned by Feature 005
- Progressive or deferred rendering of supporting skills and supplementary course information (e.g., revealing `supportingSkills` on demand rather than upfront) — owned by Feature 004 (Skill Tree)
