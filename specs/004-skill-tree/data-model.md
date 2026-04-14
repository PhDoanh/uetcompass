# Data Model: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-07  
**Spec dependency**: [spec.md](spec.md)

---

## Modeling Scope

Feature 004 models frontend-facing tree structure, interaction state, and view semantics.  
Feature 004 does not own roadmap generation or backend data sourcing.

---

## Domain Objects

### 1. SkillTreeRoadmap

Represents one renderable roadmap payload consumed by the Skill Tree UI.

```ts
interface SkillTreeRoadmap {
  roadmapId: string;
  roadmapName: string;
  nodes: SkillTreeNode[];
  edges: SkillTreeEdge[];
}
```

### 2. SkillTreeNode

Represents one node rendered in the roadmap tree.

```ts
type SkillTreeNodeType = "skill" | "related_knowledge" | "roadmap_reference";
type SkillTreeNodeStatus = "pending" | "in_progress" | "done";

interface SkillTreeNode {
  id: string;
  type: SkillTreeNodeType;
  status: SkillTreeNodeStatus;
  title: string;
  shortExplanation?: string;
  freeResources?: LearningResource[];
  paidResources?: LearningResource[];
  relatedCourses?: RelatedCourse[];
  referencedRoadmapId?: string; // required when type = roadmap_reference
}
```

### 3. SkillTreeEdge

Represents one visual connection between nodes.

```ts
type SkillTreeEdgeType = "skill_spine" | "knowledge_branch" | "reference_link";

interface SkillTreeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: SkillTreeEdgeType;
}
```

Visual semantics:
- `skill_spine`: bold solid line (`skill -> skill`)
- `knowledge_branch`: lighter dashed line (`skill -> related_knowledge`)
- `reference_link`: style controlled by design system for `roadmap_reference` navigation

### 4. LearningResource

```ts
interface LearningResource {
  id: string;
  title: string;
  url: string;
  source?: string;
}
```

### 5. RelatedCourse

Represents UET curriculum-based recommendations shown at the bottom of the detail panel.

```ts
interface RelatedCourse {
  courseId: string;
  courseCode: string;
  courseName: string;
}
```

---

## View-State Model

### Node Detail State

```ts
interface NodeDetailState {
  selectedNodeId: string | null;
  isOpen: boolean;
}
```

Behavior:
- `skill` and `related_knowledge` open detail panel.
- `roadmap_reference` triggers navigation instead of detail panel.

### Progress Update State

```ts
interface ProgressState {
  updatingNodeId: string | null;
  lastUpdatedAt?: string;
}
```

Behavior:
- Status transitions are tracking-only.
- No prerequisite lock/unlock state exists in this model.

### Layout State

```ts
interface LayoutState {
  direction: "vertical_primary_axis";
  allowHorizontalBranching: boolean;
}
```

Layout rules:
- Main skill spine is primarily vertical.
- Left/right branching is allowed to preserve readability in dense local sections.

---

## State-to-Style Mapping

### Skill Node (`skill`)

- `pending`: yellow
- `in_progress`: light purple
- `done`: gray + strikethrough text

### Related Knowledge Node (`related_knowledge`)

- `pending`: light orange
- `in_progress`: light purple
- `done`: darker tone + strikethrough text

### Roadmap Reference Node (`roadmap_reference`)

- Base style: blue
- Primary action: navigate to referenced roadmap

---

## Ownership and Boundaries

- Feature 004 consumes roadmap content and persisted statuses through existing contracts.
- Feature 004 owns presentation mapping, node interaction handling, and local UI state.
- Feature 009 owns roadmap generation, data processing, and curriculum recommendation sourcing.

---

## Validation Rules (UI Contract Level)

- Every node must have `id`, `type`, `status`, and `title`.
- `roadmap_reference` node must include `referencedRoadmapId`.
- Detail panel sections (`Free Resources`, `Paid Resources`, `Related Courses`) may be empty, but section rendering must remain stable.
- Missing optional data must produce explicit empty-state UI, not missing layout blocks.
