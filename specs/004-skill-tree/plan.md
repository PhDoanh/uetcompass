# Implementation Plan: Skill Tree

**Branch**: `004-skill-tree` | **Date**: 2026-04-11 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from [specs/004-skill-tree/spec.md](spec.md)

## Summary

Implement and align Skill Tree to consume Feature 009 contracts without schema drift:
- Canonical node types: `topic`, `subtopic`
- Canonical node fields: `nodeId`, `nodeType`, `skillName`, `parentNodeId`, `relatedCourses`, `reason`, `resources`
- Canonical progress model: `pending`, `inProgress`, `completed`, `skip`
- Contract-first error and lifecycle handling (`acceptedAt`, `ROADMAP_NOT_FOUND`, `INVALID_TRANSITION`, `CONFLICT`)

This plan covers frontend behavior and any thin adapter layers required to preserve field fidelity.

## Technical Context

**Frontend stack**: React + Vite (existing project stack)  
**Backend integration point**: Skill Tree adapter/service that reads from 009 APIs/services  
**State handling**: Existing frontend store pattern (project-consistent)  
**Routing**: Existing app router with Skill Tree route  
**Data authority**: Feature 009 contracts

## Constitution Check

- [x] Scope is aligned with ownership boundaries.
- [x] No duplicate roadmap generation logic is introduced.
- [x] User-facing behavior is testable from acceptance scenarios.
- [x] Plan enforces schema/contract fidelity with [spec.md](spec.md).

## Workstreams

### Workstream 1: Canonical Contract Binding

Deliverables:
- Audit and remove any legacy mapping that assumes `skill`/`related_knowledge`/`roadmap_reference`
- Ensure adapters pass through canonical 009 fields unchanged
- Normalize roadmap lifecycle handling around `acceptedAt`

Acceptance alignment:
- FR-001, FR-002, FR-003, FR-015, FR-016
- SC-001, SC-002

### Workstream 2: Tree Graph Construction

Deliverables:
- Build main-flow edges from ordered `topic` nodes
- Build branch edges from `topic` to `subtopic` using `parentNodeId`
- Preserve vertical-first layout with controlled horizontal branching

Acceptance alignment:
- FR-004, FR-005, FR-006, FR-007
- SC-001

### Workstream 3: Node Detail Experience

Deliverables:
- Detail panel renders canonical fields: `skillName`, `reason`, `resources`, `relatedCourses`
- Related courses shown with `courseCode`, `courseName`, `credits`
- Stable empty-state rendering for missing optional content

Acceptance alignment:
- FR-008, FR-009
- SC-002

### Workstream 4: Progress Orchestration with 009

Deliverables:
- Read progress from `GET /api/roadmaps/:roadmapId/progress`
- Write transitions via `PATCH /api/roadmaps/:roadmapId/progress/node`
- UI state derived from `pending`, `inProgress`, `completed`, `skip`
- Error handling for `INVALID_TRANSITION` and `CONFLICT`

Acceptance alignment:
- FR-010, FR-011, FR-012, FR-013
- SC-003, SC-004

### Workstream 5: Lifecycle and Empty States

Deliverables:
- Low-personalisation notice (`personalisationLevel = low`)
- Missing primary roadmap state (`ROADMAP_NOT_FOUND`)
- Retryable/failed indication when `acceptedAt` is null

Acceptance alignment:
- FR-014, FR-015, FR-016, FR-017
- SC-005

## Documentation and Verification

- Keep [quickstart.md](quickstart.md) aligned with canonical transitions and API codes.
- Keep [data-model.md](data-model.md) aligned with 009 field names and progress states.
- Keep [research.md](research.md) aligned with contract decisions.
- Validate checklist in [checklists/requirements.md](checklists/requirements.md).

## Risks and Mitigations

- Risk: Legacy adapter still emits old node fields.
  - Mitigation: Add integration tests that assert exact 009 field presence and naming.
- Risk: Orphan `subtopic` nodes degrade layout.
  - Mitigation: Render safe fallback group and log client warning.
- Risk: Progress transition conflicts from concurrent updates.
  - Mitigation: Show conflict feedback and re-fetch progress snapshot after failed mutation.

## Done Criteria

- All requirements in [spec.md](spec.md) are reflected in implementation and tests.
- No schema translation layer renames or drops canonical 009 fields.
- Progress behavior is fully driven by 009 transitions and error semantics.
