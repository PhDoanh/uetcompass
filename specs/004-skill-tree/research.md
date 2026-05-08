# Research: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-11

This document records contract and UX decisions for Skill Tree after alignment with Feature 009 canonical schemas.

---

## Decision 1: Feature 009 Is the Single Source of Truth

**Decision**: Feature 004 consumes roadmap and progress data only from Feature 009 contracts (`/api/roadmaps/*`).

**Rationale**:
- Eliminates schema drift between frontend and backend.
- Keeps lifecycle and transition rules in one ownership boundary.
- Prevents duplicate business logic in Feature 004.

---

## Decision 2: Canonical Node Taxonomy Is topic/subtopic

**Decision**: Skill Tree uses only two node types from 009:
- `topic`
- `subtopic`

**Rationale**:
- Matches persisted roadmap documents exactly.
- Avoids adapter-level reinterpretation into legacy node categories.

---

## Decision 3: Canonical Node Identity and Fields

**Decision**: `nodeId` is the only persistent node identity used by UI actions and progress updates. Display data must be read from `skillName`, `reason`, `resources`, and `relatedCourses`.

**Rationale**:
- Guarantees write operations target the same identity used by progress APIs.
- Preserves compatibility with `roadmap_progress` state arrays containing `nodeId` values.

---

## Decision 4: Graph Semantics Derived from Node Structure

**Decision**:
- Main flow is derived from ordered `topic` nodes.
- Branch edges are derived from `subtopic.parentNodeId -> topic.nodeId`.

**Rationale**:
- Uses data already present in roadmap nodes.
- Keeps graph generation deterministic without extra backend fields.

---

## Decision 5: Progress Model Is Owned by 009

**Decision**: Feature 004 renders and mutates only these states from 009:
- `pending`
- `inProgress`
- `completed`
- `skip`

Allowed write transitions:
- `pending -> inProgress`
- `pending -> skip`
- `inProgress -> completed`

**Rationale**:
- Matches 009 transition rules and error semantics.
- Prevents invalid client-invented transition paths.

---

## Decision 6: Lifecycle Read Model Uses acceptedAt

**Decision**:
- `acceptedAt` present: accepted/active roadmap state.
- `acceptedAt` null: failed/retryable state.

**Rationale**:
- Aligns with 009 lifecycle contract where no separate `status` field is canonical.

---

## Decision 7: Low-Personalisation UX Signal

**Decision**: When `personalisationLevel = low`, Skill Tree must show a clear notice about reduced personalisation quality.

**Rationale**:
- Communicates roadmap quality context to users.
- Reflects canonical data rather than heuristic inference.

---

## Decision 8: Detail Panel Is Contract-Faithful

**Decision**: Node detail panel shows canonical fields only:
- `skillName`
- `reason`
- `resources`
- `relatedCourses` (`courseCode`, `courseName`, `credits`)

**Rationale**:
- Prevents information loss caused by custom remapping.
- Keeps frontend resilient when resources are empty arrays.

---

## Decision 9: Error Handling Uses Domain Error Codes

**Decision**: Feature 004 handles backend states by 009 error codes (`ROADMAP_NOT_FOUND`, `INVALID_TRANSITION`, `CONFLICT`) and never by parsing free-text messages.

**Rationale**:
- Improves stability across backend message wording changes.
- Enables consistent UX branches for retry and re-sync.

---

## Decision 10: Resilience for Incomplete Graph References

**Decision**: Missing/invalid `parentNodeId` for `subtopic` must not crash rendering; UI should apply fallback placement and log diagnostic warnings.

**Rationale**:
- Preserves usability despite data anomalies.
- Supports incremental backend hardening without blocking the user experience.

---

## Final Integration Notes

- Backend Skill Tree routes now expose canonical progress endpoints:
	- `GET /api/skill-tree/roadmaps/:roadmapId/progress`
	- `PATCH /api/skill-tree/roadmaps/:roadmapId/progress/node`
- Legacy `skill_node_statuses` persistence model has been removed from runtime code paths.
- Frontend graph construction now derives topic main flow and subtopic branches directly from 009 node fields.
- Frontend progress state is sourced from canonical arrays: `pending`, `inProgress`, `completed`, `skip`.
- Error handling is normalized to domain envelopes using `ROADMAP_NOT_FOUND`, `INVALID_PAYLOAD`, `INVALID_TRANSITION`, `CONFLICT`.
