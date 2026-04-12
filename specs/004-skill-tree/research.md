# Research: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-07

This document records design decisions that shape the Skill Tree implementation scope and behavior.

---

## Decision 1: Frontend-Only Scope for Feature 004

**Decision**: Feature 004 focuses on presentation, interaction handling, and frontend state behavior. It does not own roadmap generation or backend data sourcing.

**Rationale**:
- Keeps feature boundaries explicit and stable.
- Avoids duplicate business logic across features.
- Aligns with product requirement that roadmap data lifecycle is external to this feature.

---

## Decision 2: Node Taxonomy Fixed to Three Types

**Decision**: The tree uses three node types only:
- `skill`
- `related_knowledge`
- `roadmap_reference`

**Rationale**:
- Clear visual language for users.
- Reduces ambiguity in click behaviors.
- Keeps detail rendering and navigation rules deterministic.

---

## Decision 3: Visual Semantics by Node Type and Status

**Decision**:
- `skill` (pending): yellow
- `related_knowledge` (pending): light orange
- `roadmap_reference`: blue
- `in_progress` (both content node types): light purple
- `done` states: strikethrough + tone change by node type

**Rationale**:
- Users can identify both type and progress state at a glance.
- Supports fast roadmap scanning without opening detail panels.

---

## Decision 4: Edge Semantics by Relationship Type

**Decision**:
- `skill -> skill`: bold solid line
- `skill -> related_knowledge`: lighter dashed line

**Rationale**:
- Distinguishes core progression from supporting knowledge.
- Keeps cognitive hierarchy visible in dense trees.

---

## Decision 5: Tree Axis Strategy

**Decision**: The main progression among core skill nodes is primarily vertical, with optional left/right branching when local density is high.

**Rationale**:
- Vertical spine preserves progression clarity.
- Horizontal branching prevents overlap in sections with many related nodes.
- Matches the intended roadmap.sh-like reading experience.

---

## Decision 6: Node Click Behavior Split by Type

**Decision**:
- Clicking `skill` or `related_knowledge` opens the detail panel.
- Clicking `roadmap_reference` navigates to another roadmap.

**Rationale**:
- Supports two distinct user intents: inspect details vs continue to another roadmap.
- Prevents ambiguous interaction models.

---

## Decision 7: Detail Panel Information Contract

**Decision**: Detail panel for content nodes always includes:
- Content name
- Short explanation
- Free Resources
- Paid Resources
- Related Courses (at bottom)

**Rationale**:
- Provides predictable structure.
- Keeps learning actions and academic recommendations in one place.

---

## Decision 8: Related Courses as Trusted Academic Recommendations

**Decision**: Related courses shown in detail panel are UET curriculum-based recommendations provided by external data processing.

**Rationale**:
- Keeps recommendations academically grounded and trustworthy.
- Preserves separation of concern between data processing and UI feature delivery.

---

## Decision 9: Progress Tracking Without Prerequisite Locking

**Decision**: Node status updates are enabled for progress tracking only. No prerequisite lock/unlock mechanism is enforced in this feature.

**Rationale**:
- Matches intended product behavior for this version.
- Simplifies interaction model and reduces user friction.

---

## Decision 10: Roadmap Reference Nodes Are Limited and Intentional

**Decision**: `roadmap_reference` nodes are used sparingly, primarily:
- Near roadmap endpoints for continuation
- At complex topics requiring a dedicated external roadmap

**Rationale**:
- Maintains focus and readability of the current roadmap.
- Still enables cross-roadmap learning continuity when needed.

---

## Decision 11: Stable Empty-State Rendering

**Decision**: Missing optional node sections must render explicit empty states instead of hidden or collapsing blocks.

**Rationale**:
- Prevents layout breakage.
- Improves user trust and comprehension when data is incomplete.
