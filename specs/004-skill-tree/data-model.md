# Data Model: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-11  
**Spec dependency**: [spec.md](spec.md)

---

## Modeling Scope

Feature 004 models frontend-facing rendering, interaction state, and API binding against Feature 009 contracts.  
Feature 004 does not own roadmap generation, node enrichment logic, or lifecycle state transitions.

---

## Canonical API Data (from Feature 009)

### 1. Roadmap

```ts
interface Roadmap {
  _id: string;
  userId: string;
  studentProfileId: string;
  roadmapName: string;
  personalisationLevel: 'full' | 'low';
  isPrimary: boolean;
  acceptedAt: string | null;
  nodes: RoadmapNode[];
  createdAt: string;
  updatedAt: string;
}
```

### 2. RoadmapNode

```ts
type RoadmapNodeType = 'topic' | 'subtopic';

interface RoadmapNode {
  nodeId: string;
  nodeType: RoadmapNodeType;
  skillName: string;
  parentNodeId: string | null;
  relatedCourses: RelatedCourse[];
  reason: string;
  resources: unknown[];
}
```

### 3. RelatedCourse

```ts
interface RelatedCourse {
  courseCode: string;
  courseName: string;
  credits: number;
}
```

### 4. RoadmapProgress

```ts
type ProgressStateKey = 'pending' | 'inProgress' | 'completed' | 'skip';

interface RoadmapProgress {
  _id: string;
  userId: string;
  roadmapId: string;
  state: {
    pending: string[];
    inProgress: string[];
    completed: string[];
    skip: string[];
  };
  updatedAt: string;
}
```

---

## Frontend View Models

### 1. SkillTreeGraph

Represents a render-ready graph derived from `Roadmap.nodes`.

```ts
interface SkillTreeGraph {
  roadmapId: string;
  roadmapName: string;
  personalisationLevel: 'full' | 'low';
  acceptedAt: string | null;
  nodes: SkillTreeViewNode[];
  edges: SkillTreeEdge[];
}
```

### 2. SkillTreeViewNode

```ts
interface SkillTreeViewNode {
  id: string; // mirrors nodeId
  nodeId: string;
  nodeType: 'topic' | 'subtopic';
  label: string; // mirrors skillName
  parentNodeId: string | null;
  reason: string;
  resources: unknown[];
  relatedCourses: RelatedCourse[];
  progressState: ProgressStateKey;
}
```

### 3. SkillTreeEdge

```ts
type SkillTreeEdgeType = 'main_flow' | 'branch';

interface SkillTreeEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: SkillTreeEdgeType;
}
```

Edge derivation rules:
- `main_flow`: between consecutive `topic` nodes in roadmap order
- `branch`: from topic (`parentNodeId`) to each `subtopic`

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
- `topic` and `subtopic` open the detail panel.

### Progress Mutation State

```ts
interface ProgressMutationState {
  updatingNodeId: string | null;
  lastUpdatedAt?: string;
  errorCode?: 'INVALID_TRANSITION' | 'CONFLICT' | 'INTERNAL_ERROR';
}
```

Behavior:
- State transitions are delegated to Feature 009.
- No prerequisite lock/unlock state exists in Feature 004.

### Layout State

```ts
interface LayoutState {
  direction: 'vertical_primary_axis';
  allowHorizontalBranching: boolean;
}
```

Layout rules:
- Main `topic` spine is primarily vertical.
- Left/right branching is allowed for dense local sections.

---

## Progress and Style Mapping

State-to-style mapping is UI-owned, but state values are contract-owned by Feature 009:

- `pending`
- `inProgress`
- `completed`
- `skip`

Minimum visual requirements:
- Each state must be visually distinguishable.
- `completed` and `skip` must be non-active styles.
- `topic` and `subtopic` must remain distinguishable independent of progress state.

---

## Ownership and Boundaries

- Feature 004 consumes roadmap and progress content through 009 APIs.
- Feature 004 owns presentation mapping, detail interaction, and local UI state.
- Feature 009 owns roadmap lifecycle, progress transition validation, and canonical schemas.

---

## Validation Rules (UI Contract Level)

- Every rendered node must have `nodeId`, `nodeType`, and `skillName` from roadmap payload.
- `subtopic` should have `parentNodeId`; missing parent must not crash rendering.
- `relatedCourses` must render using `courseCode`, `courseName`, `credits` only.
- Progress state for each node must resolve from 009 `state` arrays; unknown/missing mapping defaults to `pending`.
- Detail panel sections may be empty, but section layout must remain stable.
