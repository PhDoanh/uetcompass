# Quickstart: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-07

This guide explains how to run and manually verify the Skill Tree feature behavior defined in [spec.md](spec.md).

---

## Prerequisites

- Backend and frontend dependencies installed
- Development environment running for the project workspace
- A test account with access to Skill Tree data payloads
- Feature 009 data contracts available in the environment

---

## Start the Application

Run from repository root in two terminals.

```bash
# Terminal 1
cd backend
npm install
npm run dev

# Terminal 2
cd frontend
npm install
npm run dev
```

Open the frontend URL shown by Vite and navigate to the Skill Tree page.

---

## Manual Verification Scenarios

### Scenario A: Tree Overview and Visual Semantics

1. Open Skill Tree.
2. Verify node types render with correct base styles:
   - `skill`: yellow (pending)
   - `related_knowledge`: light orange (pending)
   - `roadmap_reference`: blue
3. Verify edge styles:
   - `skill -> skill`: bold solid line
   - `skill -> related_knowledge`: lighter dashed line

Expected result:
- Tree renders with clear semantic differentiation.

### Scenario B: Axis and Branching Layout

1. Inspect the core `skill` progression.
2. Verify the main skill path is primarily vertical.
3. In dense areas (many related knowledge nodes), verify the layout may branch left/right to connect additional `skill` nodes while staying readable.

Expected result:
- Vertical main axis is preserved, with selective horizontal branching where needed.

### Scenario C: Node Detail Panel

1. Click a `skill` node.
2. Verify detail panel sections in order:
   - Content name
   - Short explanation
   - Free Resources
   - Paid Resources
   - Related Courses (at bottom)
3. Repeat with a `related_knowledge` node.

Expected result:
- Both node types open a stable, consistent detail panel.

### Scenario D: Roadmap Reference Navigation

1. Click a `roadmap_reference` node.
2. Verify navigation to the referenced roadmap.
3. Simulate or use an invalid target and verify graceful error handling.

Expected result:
- Valid references navigate correctly; invalid references show error feedback and keep current context stable.

### Scenario E: Node Status Tracking

1. Update a `skill` node status across `pending`, `in_progress`, and `done`.
2. Verify style mapping for each state.
3. Update a `related_knowledge` node status across the same states.
4. Reload page and verify state consistency.

Expected result:
- Status updates are reflected correctly and remain consistent after reload.
- No prerequisite-based lock/unlock behavior is enforced.

### Scenario F: Empty-State Rendering

1. Open a node with missing optional sections (no free resources, no paid resources, or no related courses).
2. Verify empty-state messages render without layout break.

Expected result:
- Panel remains stable and readable with explicit empty-state placeholders.

---

## Acceptance Coverage Map

- Scenario A -> User Story 1
- Scenario B -> User Story 1 + FR-008/FR-009
- Scenario C -> User Story 2
- Scenario D -> User Story 4
- Scenario E -> User Story 3
- Scenario F -> Edge Cases
