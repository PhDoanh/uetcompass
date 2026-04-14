# Feature Specification: Skill Tree

**Feature Branch**: `004-skill-tree`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Design the Skill Tree feature as a roadmap.sh-style interactive roadmap focused on frontend presentation, interactions, and state handling."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View the Interactive Skill Tree Overview (Priority: P1)

A student opens the Skill Tree page and sees an interactive roadmap rendered as a tree, inspired by roadmap.sh. Nodes are clearly distinguishable by node type and completion status.

**Why this priority**: The tree visualization is the core user-facing value of the feature.

**Independent Test**: Open a valid roadmap and verify that all nodes and edges render correctly with the expected visual semantics for node type and status.

**Acceptance Scenarios**:

1. **Given** a valid roadmap payload is provided by Feature 009, **When** the Skill Tree page loads, **Then** the system renders an interactive tree with all nodes and connections
2. **Given** a node of type `skill`, **When** it is rendered in `pending`, **Then** it uses yellow styling
3. **Given** a node of type `related_knowledge`, **When** it is rendered in `pending`, **Then** it uses light orange styling
4. **Given** a node of type `roadmap_reference`, **When** it is rendered, **Then** it uses blue styling to indicate cross-roadmap navigation
5. **Given** an edge between two `skill` nodes, **When** it is rendered, **Then** it uses a bold solid line
6. **Given** an edge between a `skill` node and a `related_knowledge` node, **When** it is rendered, **Then** it uses a lighter dashed line
7. **Given** the main roadmap spine connects `skill` nodes, **When** layout is computed, **Then** that spine is primarily vertical
8. **Given** a `skill` node has many related knowledge branches, **When** layout is computed, **Then** the system may branch left or right to connect additional `skill` nodes while preserving readability

---

### User Story 2 - Open Node Detail Content (Priority: P1)

A student clicks any content node to open a detail panel with roadmap.sh-style learning details.

**Why this priority**: The detail panel provides practical learning context beyond the visual map.

**Independent Test**: Click `skill` and `related_knowledge` nodes and verify full content fields. Click `roadmap_reference` and verify navigation to the target roadmap.

**Acceptance Scenarios**:

1. **Given** a student clicks a `skill` node, **When** the detail panel opens, **Then** it displays content name, short explanation, `Free Resources`, `Paid Resources`, and a `Related Courses` section at the bottom
2. **Given** a student clicks a `related_knowledge` node, **When** the detail panel opens, **Then** it displays the same structure as `skill` node detail
3. **Given** the selected node includes related course recommendations, **When** detail is shown, **Then** `Related Courses` is displayed at the bottom of the panel
4. **Given** a student clicks a `roadmap_reference` node, **When** click handling runs, **Then** the app navigates to the referenced roadmap

---

### User Story 3 - Track Progress with Node Status Updates (Priority: P2)

A student updates node status to track learning progress. This feature supports status marking only and does not enforce prerequisite locking/unlocking behavior.

**Why this priority**: Progress tracking is required, but strict gating is intentionally out of scope for this feature.

**Independent Test**: Update statuses for both `skill` and `related_knowledge` nodes across `pending`, `in_progress`, and `done`; verify immediate visual updates and persistence after reload.

**Acceptance Scenarios**:

1. **Given** a `skill` node is `pending`, **When** the student marks it `in_progress`, **Then** it changes to light purple
2. **Given** a `skill` node is `in_progress`, **When** the student marks it `done`, **Then** it changes to gray and its text is struck through
3. **Given** a `related_knowledge` node is `pending`, **When** the student marks it `in_progress`, **Then** it changes to light purple
4. **Given** a `related_knowledge` node is `in_progress`, **When** the student marks it `done`, **Then** it changes to a darker tone and its text is struck through
5. **Given** any node status is updated, **When** the page is reloaded, **Then** the node status and visual style remain consistent with persisted state
6. **Given** any node status update action, **When** the action is processed, **Then** no prerequisite-based lock/unlock rule is applied

---

### User Story 4 - Use Roadmap Reference Nodes as Cross-Roadmap Bridges (Priority: P3)

Roadmap reference nodes are less frequent and are used to bridge into another roadmap when needed.

**Why this priority**: Cross-roadmap continuity is important for advanced or adjacent topics without overloading a single roadmap.

**Independent Test**: Verify that reference nodes can appear at roadmap endpoints or around complex topics, and clicking them leads to the correct target roadmap.

**Acceptance Scenarios**:

1. **Given** the learner reaches a roadmap endpoint, **When** continuation requires another roadmap, **Then** a `roadmap_reference` node may be presented
2. **Given** a topic in the current roadmap needs a separate deep track, **When** that dependency is modeled, **Then** a `roadmap_reference` node may point to the external roadmap (for example, Prompt Engineering)
3. **Given** a `roadmap_reference` node is clicked, **When** navigation succeeds, **Then** the learner lands on the intended target roadmap

---

### Edge Cases

- No `roadmap_reference` node exists in a roadmap: the tree still renders normally
- A node has no `Free Resources` or no `Paid Resources`: the panel shows clear empty-state content without breaking layout
- A node has no `Related Courses`: the panel still renders and shows a "No related courses available" message
- Node detail data arrives slowly: the page shows loading/skeleton states for tree and detail panel
- Target roadmap navigation fails (missing or inaccessible target): the UI shows an error message and keeps the user on the current roadmap
- Large roadmap size: pan/zoom and node selection remain usable without broken connections

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST render roadmap data as a roadmap.sh-style interactive tree focused on frontend presentation and interaction
- **FR-002**: The system MUST support exactly three node types with distinct visual defaults:
  - `skill`: yellow in `pending`
  - `related_knowledge`: light orange in `pending`
  - `roadmap_reference`: blue
- **FR-003**: The system MUST support at least three node statuses: `pending`, `in_progress`, `done`
- **FR-004**: For `skill` nodes, status styling MUST be:
  - `pending`: yellow
  - `in_progress`: light purple
  - `done`: strikethrough text and gray styling
- **FR-005**: For `related_knowledge` nodes, status styling MUST be:
  - `pending`: light orange
  - `in_progress`: light purple
  - `done`: strikethrough text and a darker tone
- **FR-006**: Connections between `skill` and `skill` nodes MUST use bold solid lines
- **FR-007**: Connections between `skill` and `related_knowledge` nodes MUST use lighter dashed lines
- **FR-008**: The primary skill-tree axis (connections among core `skill` nodes) MUST be laid out primarily in the vertical direction
- **FR-009**: The layout engine MUST allow left/right branching from the vertical axis to connect additional `skill` nodes when a local area is dense due to many related knowledge nodes
- **FR-010**: Clicking a `skill` or `related_knowledge` node MUST open a detail panel containing:
  - Content name
  - Short explanation
  - `Free Resources`
  - `Paid Resources`
  - `Related Courses` at the bottom
- **FR-011**: The `Related Courses` section MUST use UET curriculum-based recommendations provided through Feature 009 data processing
- **FR-012**: Clicking a `roadmap_reference` node MUST navigate to its referenced roadmap
- **FR-013**: The system MUST allow students to update node statuses for progress tracking
- **FR-014**: The feature MUST NOT implement prerequisite-based node lock/unlock behavior
- **FR-015**: The feature MUST NOT require prerequisite unlock state transitions to change node status
- **FR-016**: Node statuses MUST remain consistent after reload by consuming persisted state from existing APIs/contracts
- **FR-017**: `roadmap_reference` nodes SHOULD remain limited in usage and primarily appear:
  - Near roadmap endpoints for continuation
  - At complex topics that require a dedicated external roadmap
- **FR-018**: This feature MUST be limited to frontend presentation, interaction handling, and frontend state behavior; roadmap generation and data sourcing remain owned by Feature 009

### Non-Functional Requirements

- **NFR-001 (Rendering Clarity)**: The tree layout must remain readable on desktop and mobile, with labels not overlapping under common zoom levels
- **NFR-002 (Interaction Latency)**: Detail panel opening and visual status update feedback should respond within 300ms excluding network latency
- **NFR-003 (Visual Legibility)**: Colors and line styles must clearly differentiate node/edge semantics before opening details
- **NFR-004 (UI Scalability)**: For large roadmaps (>= 150 nodes), pan/zoom and node interaction must remain stable and usable

### Key Entities

- **Skill Node (`skill`)**: A core roadmap node representing a primary skill/topic
- **Related Knowledge Node (`related_knowledge`)**: A supporting knowledge node attached to a skill node
- **Roadmap Reference Node (`roadmap_reference`)**: A bridge node that links to another roadmap
- **Node Detail Panel**: The panel shown when clicking `skill`/`related_knowledge`, containing explanation, resources, and related courses
- **Related Courses**: Recommended UET courses surfaced for a node through Feature 009 data outputs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of test roadmaps render all three node types with correct visual differentiation
- **SC-002**: 100% of `skill -> skill` links render as bold solid lines and `skill -> related_knowledge` links render as lighter dashed lines
- **SC-003**: At least 95% of node-click interactions open the expected detail behavior on first attempt
- **SC-004**: 100% of `skill` and `related_knowledge` nodes display all required detail sections when data is available
- **SC-005**: 100% of node status updates function without prerequisite-lock interference
- **SC-006**: 100% of valid `roadmap_reference` clicks route to the correct target roadmap

## Assumptions

- Feature 009 is the authoritative source for roadmap content, resources, and related course recommendations
- Feature 004 does not generate roadmap data and does not own backend roadmap business logic
- Node status persistence is provided by existing backend contracts; this feature consumes and renders that state
- The existing frontend stack supports required color rules, edge styles, strikethrough states, and detail panel composition without architectural changes

