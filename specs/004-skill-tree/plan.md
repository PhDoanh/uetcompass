# Implementation Plan: Skill Tree

**Branch**: `004-skill-tree` | **Date**: 2026-04-07 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from [specs/004-skill-tree/spec.md](spec.md)

## Summary

Implement a roadmap.sh-style interactive Skill Tree experience with:
- Three node types: `skill`, `related_knowledge`, `roadmap_reference`
- Three statuses: `pending`, `in_progress`, `done`
- Visual rules for node states and edge semantics
- Primary vertical skill axis with optional left/right branching in dense sections
- Node detail panel for learning content
- Cross-roadmap navigation through `roadmap_reference` nodes

This plan is limited to frontend behavior and interaction handling. Roadmap generation and data sourcing remain external to this feature.

## Technical Context

**Frontend stack**: React + Vite (existing project stack)  
**State handling**: Existing frontend store pattern (project-consistent)  
**Routing**: Existing app router with Skill Tree route  
**Data authority**: Feature 009 contracts

## Constitution Check

- [x] Scope is aligned with feature ownership boundaries.
- [x] No duplicate roadmap generation logic is introduced.
- [x] User-facing behavior is testable from acceptance scenarios.
- [x] The plan preserves product constraints in [spec.md](spec.md).

## Workstreams

### Workstream 1: Tree Rendering and Visual Semantics

Deliverables:
- Node rendering for all three node types
- Status-based node style mapping
- Edge style mapping by relationship type
- Vertical primary axis layout with controlled horizontal branching

Acceptance alignment:
- FR-001 to FR-009
- SC-001 and SC-002

### Workstream 2: Node Interaction and Detail Experience

Deliverables:
- Click behavior split by node type
- Detail panel for `skill` and `related_knowledge`
- Section rendering: content title, short explanation, free resources, paid resources, related courses
- Stable empty-state handling

Acceptance alignment:
- FR-010 to FR-012
- SC-003 and SC-004

### Workstream 3: Progress Tracking and State Consistency

Deliverables:
- Status update interactions for track-only workflow
- UI updates for `pending`/`in_progress`/`done`
- Reload consistency using persisted API state
- Explicit removal of any prerequisite lock/unlock assumptions

Acceptance alignment:
- FR-013 to FR-016
- SC-005

### Workstream 4: Cross-Roadmap Bridge Behavior

Deliverables:
- Navigation behavior for `roadmap_reference`
- Error handling for invalid target roadmap
- Preserved continuity when navigation fails

Acceptance alignment:
- FR-012 and FR-017
- SC-006

## Documentation and Verification

- Keep [quickstart.md](quickstart.md) aligned with current scenarios.
- Keep [data-model.md](data-model.md) aligned with node and edge semantics.
- Keep [research.md](research.md) aligned with design decisions.
- Validate checklist in [checklists/requirements.md](checklists/requirements.md).

## Risks and Mitigations

- Risk: Dense roadmap sections reduce readability.
  - Mitigation: Prefer vertical spine; allow limited horizontal branching where needed.
- Risk: Missing optional node content creates broken layout.
  - Mitigation: Define strict empty-state rendering rules.
- Risk: Old prerequisite-lock logic reappears in implementation.
  - Mitigation: Add explicit test cases confirming no lock/unlock behavior.

## Done Criteria

- All requirements in [spec.md](spec.md) are reflected in behavior and tests.
- Visual semantics and layout behavior are consistent with the specification.
- No implementation contradicts declared ownership boundaries.
