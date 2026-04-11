# Domain Checklist: AI-Powered Personalised Roadmap Generator

**Purpose**: Validate that domain-specific requirements — AI integration contract, topological validation, in-memory preview lifecycle, concurrency, node enrichment, and cross-feature boundaries — are precisely and completely specified. Complements the generic `requirements.md` checklist.
**Created**: 2026-03-11
**Feature**: [spec.md](../spec.md) | [research.md](../research.md) | [data-model.md](../data-model.md) | [contracts/rest-api.md](../contracts/rest-api.md)

---

## AI Integration Contract

- [ ] CHK001 - Are the inputs to the AI model exhaustively enumerated (StudentProfile fields, CourseUnit DAG structure, existing roadmap for re-gen)? [Completeness, Spec §FR-005, FR-006, FR-039]
- [ ] CHK002 - Is the AI's dual responsibility (course selection AND topological ordering) unambiguously stated as a single-call contract, not a two-phase interaction? [Clarity, Spec §FR-007]
- [ ] CHK003 - Is the `responseSchema` shape — required fields per `RoadmapNode`, field types, mandatory vs optional — fully specified in the requirements or research? [Completeness, research.md §R-001]
- [ ] CHK004 - Is the re-generation base context requirement precise: does the spec state *what* from the existing roadmap is passed to the AI (full `nodes` array) and in what capacity (informs but does not constrain)? [Clarity, Spec §FR-039, US4 §AS-2]
- [ ] CHK005 - Is the low-personalisation routing condition unambiguously defined — specifically, are both `careerGoal.role` AND `careerGoal.companyType` being absent/empty required, or is either alone sufficient? [Clarity, Spec §FR-018]
- [ ] CHK006 - Is the handling of a free-text career goal with no recognisable role explicitly required to reach the AI (not silently fall back to generic pathway)? [Coverage, Spec §Edge Cases]

## Topological Sort Validation

- [ ] CHK007 - Is "valid topological ordering" defined precisely enough to be implemented deterministically — specifically, is a transitive prerequisite violation treated identically to a direct prerequisite violation? [Clarity, Spec §FR-012, NFR-001]
- [ ] CHK008 - Are cycle detection (data integrity guard) and ordering validation (AI output check) specified as distinct checks with distinct failure messages, or collapsed into a single failure path? [Clarity, Spec §NFR-005, FR-012]
- [ ] CHK009 - Is the failure contract for a topological ordering violation complete — which fields are stored, what notification is sent, and what state does the `roadmaps` document end up in? [Completeness, Spec §FR-012, FR-028, data-model.md]
- [ ] CHK010 - Are completed courses specified as exempt from the ordering validation (they are satisfied prerequisites, not nodes)? [Clarity, Spec §FR-010, FR-011]

## In-Memory Preview Lifecycle

- [ ] CHK011 - Is the scope of "in-memory" bounded to the process level (not request-scoped, not shared across instances), and is this made explicit in the requirements? [Clarity, Spec §FR-034]
- [ ] CHK012 - Are all four preview terminal states — accepted, rejected (initial), rejected (re-gen), lost on worker restart — requirements explicitly specified, each with a distinct outcome? [Coverage, Spec §FR-036, FR-037, FR-038, FR-034]
- [ ] CHK013 - Is the SIGTERM / worker-restart failure path a documented requirement (store `status: failed`, notify student, clear preview) rather than an implementation detail only? [Completeness, Spec §FR-034, Edge Cases]
- [ ] CHK014 - Is the preview identified by `userId` (not a preview token or session ID) stated as a requirement, ensuring the accept/reject endpoints need no body parameter? [Clarity, contracts/rest-api.md §POST /accept, §POST /reject]
- [ ] CHK015 - Is the scenario of a second preview arriving before the student acts on the first one addressed in requirements (can a new generation overwrite a pending preview)? [Coverage, Gap]

## Concurrency Guard

- [ ] CHK016 - Is the concurrency guard scope explicitly per-user (not per-endpoint or per-session), and is this unambiguous in the requirements? [Clarity, Spec §FR-004, NFR-006]
- [ ] CHK017 - Is the behaviour when a duplicate trigger fires while generation is in-progress specified — silent drop vs queuing vs error response — and is it consistent between the internal trigger and the `/api/roadmap/retry` endpoint? [Consistency, Spec §FR-004, contracts/rest-api.md §POST /retry]
- [ ] CHK018 - Is the `repersonalizationPending` + in-progress initial generation race condition addressed with a specified resolution? [Coverage, Spec §Edge Cases]

## Acceptance / Rejection Flow

- [ ] CHK019 - Are the cross-feature obligations on rejection consistent: does rejecting a re-generation preview always clear `repersonalizationPending` regardless of whether the student has an active roadmap? [Consistency, Spec §FR-031, FR-038]
- [ ] CHK020 - Is the "student has no active roadmap after rejecting an initial preview" state explicitly declared as valid (not an error, not a constraint violation)? [Clarity, Spec §FR-037]
- [ ] CHK021 - Are the API boundaries between student-facing actions (accept, reject, retry) and internal triggers (profile submission, repersonalization signal) explicitly stated as a requirement, not just an implementation choice? [Clarity, Spec §FR-033]
- [ ] CHK022 - Is the acceptance outcome complete: replacing document, setting `status: completed`, setting `acceptedAt`, and clearing `repersonalizationPending` when applicable — all in one atomic requirement statement? [Completeness, Spec §FR-036, FR-031, data-model.md]

## Node Enrichment Requirements

- [ ] CHK023 - Is the mutual exclusivity of `gainedSkills` and `supportingSkills` on the same node specified as a hard constraint (requirement), not a soft guideline? [Clarity, Spec §FR-013, FR-014]
- [ ] CHK024 - Is the explicit permission for the same skill to appear in `supportingSkills` on multiple nodes (cross-node deduplication is NOT required) stated in requirements so renderers know not to strip duplicates? [Clarity, Spec §FR-014, Clarifications]
- [ ] CHK025 - Is `resources: []` at generation time specified as a schema contract for Feature 003 consumers — meaning the field MUST be present and MUST be an empty array, not absent or null? [Clarity, Spec §FR-017, NFR-004]
- [ ] CHK026 - Are `reason` and `careerRelevanceNote` requirements distinguished clearly enough that an implementer would produce different content for each field on the same node? [Clarity, Spec §FR-015, FR-016]

## Generation Failure and Retry

- [ ] CHK027 - Are all failure modes that trigger the failure path enumerated? Specifically: AI service error, response parse failure, topological ordering violation, cycle detected in DAG, worker restart with pending preview. [Completeness, Spec §FR-012, FR-034, Edge Cases]
- [ ] CHK028 - Is the partial-failure storage contract specified — on re-generation failure, are the previous `nodes` preserved in the `roadmaps` document or overwritten? [Clarity, data-model.md §State Machine]
- [ ] CHK029 - Is the retry precondition (`status: failed` document must exist) a stated requirement, and is the 409 response for "no failed roadmap" covered in the API contract? [Completeness, Spec §FR-028, FR-030, contracts/rest-api.md §POST /retry]
- [ ] CHK030 - Is NFR-003 (idempotency of retry / re-gen) measurably defined — does it specify that a partial or corrupted previous document is fully replaced, not merged? [Measurability, Spec §NFR-003]

## Cross-Feature Boundaries

- [ ] CHK031 - Are the read-only access patterns to Feature 001 (`student_profiles`) and Feature 002 (`course_units`) explicitly bounded in requirements — no writes except the `repersonalizationPending` clear? [Completeness, Spec §FR-005, FR-006, FR-031]
- [ ] CHK032 - Is the notification payload shape (including `retryable: true` flag and `retryEndpoint` reference) a stated requirement so Feature 004 and Feature 005 can rely on it without coordination? [Completeness, Spec §FR-027, research.md §R-005]
- [ ] CHK033 - Is the `status` field exposure via `GET /api/roadmap` a documented requirement that Feature 004 (Skill Tree) can cite as its contract for surfacing a retry affordance? [Completeness, Spec §FR-029, contracts/rest-api.md §GET /api/roadmap]
- [ ] CHK034 - Is the assumption that `repersonalizationPending` is set by Feature 005 and only cleared by this feature explicitly documented as a boundary, preventing both features from owning the flag lifecycle? [Clarity, Spec §Assumptions]
- [ ] CHK035 - Is the absence of Feature 003 data at generation time a stated non-blocking requirement (generation must not wait for resources), and is `resources: []` the specified bridge to Feature 003? [Completeness, Spec §FR-032, FR-017]

## Acceptance Criteria Measurability

- [ ] CHK036 - Is SC-002 ("valid topological sort, zero violations across all generated roadmaps") verifiable with a concrete algorithmic definition of "violation" rather than a qualitative statement? [Measurability, Spec §SC-002]
- [ ] CHK037 - Is SC-006 ("re-generation reflects the new career goal — previous enrichments not reused if they conflict") measurable without subjective judgement about what "conflict" means? [Measurability, Spec §SC-006]
- [ ] CHK038 - Are SC-005 ("begins within a reasonable time") and SC-008 ("no visible latency") measurable — do they reference a specific threshold or are they vacuously true? [Measurability, Spec §SC-005, SC-008]
