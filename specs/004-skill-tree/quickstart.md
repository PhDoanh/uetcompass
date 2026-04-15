# Quickstart: Skill Tree

**Phase output** | Branch: `004-skill-tree` | Date: 2026-04-11

This guide explains how to run and manually verify Skill Tree behavior aligned with Feature 009 contracts in [spec.md](spec.md).

---

## Prerequisites

- Backend and frontend dependencies installed
- Development environment running for the project workspace
- A test account with JWT access
- Feature 009 roadmap/progress endpoints available

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

Open the frontend URL shown by Vite and navigate to Skill Tree.

---

## Manual Verification Scenarios

### Scenario A: Primary Roadmap Contract Rendering

1. Call `GET /api/roadmaps/primary` for a test user (or inspect network call from UI).
2. Confirm payload includes canonical fields: `personalisationLevel`, `acceptedAt`, `nodes[]` with `nodeId`, `nodeType`, `skillName`, `parentNodeId`, `relatedCourses`, `reason`, `resources`.
3. Open Skill Tree and verify each payload node is rendered exactly once by `nodeId`.

Expected result:
- No fallback to legacy node schema.
- Graph renders without missing required node data.

### Scenario B: Topic/Subtopic Graph Semantics

1. Verify `topic` nodes appear on the main flow.
2. Verify `subtopic` nodes attach to parent by `parentNodeId`.
3. Verify edge styles:
   - main topic flow: solid
   - topic to subtopic branch: dashed

Expected result:
- Main learning sequence is clear and branch relationships are readable.

### Scenario C: Low-Personalisation and Lifecycle States

1. Use a roadmap with `personalisationLevel = low` and verify low-personalisation notice is shown.
2. Simulate `ROADMAP_NOT_FOUND` from `GET /api/roadmaps/primary` and verify empty-state guidance.
3. Simulate a roadmap with `acceptedAt = null` and verify retryable/failed state messaging.

Expected result:
- Lifecycle and fallback states are handled via canonical 009 semantics.

### Scenario D: Node Detail Panel

1. Click a `topic` node.
2. Verify detail panel sections:
   - `skillName`
   - `reason`
   - `resources`
   - `relatedCourses` (`courseCode`, `courseName`, `credits`)
3. Repeat with a `subtopic` node.
4. Verify empty-state rendering when `resources` or `relatedCourses` is empty.

Expected result:
- Detail panel remains stable and faithful to payload data.

### Scenario E: Progress Read and Write Contract

1. Call `GET /api/roadmaps/:roadmapId/progress` and verify state arrays: `pending`, `inProgress`, `completed`, `skip`.
2. Trigger valid transitions from UI and verify request payloads:
   - `pending -> inProgress`
   - `pending -> skip`
   - `inProgress -> completed`
3. Reload page and confirm visual state matches persisted progress document.

Expected result:
- Progress is persisted and restored using 009 APIs only.

### Scenario F: Invalid Transition Handling

1. Trigger a stale or invalid transition to force `INVALID_TRANSITION`.
2. Verify UI error feedback appears.
3. Verify node state is not left in a corrupted optimistic state.

Expected result:
- Error path is visible and recoverable, with re-sync from backend.

---

## Acceptance Coverage Map

- Scenario A -> FR-001, FR-002, FR-003
- Scenario B -> FR-004, FR-005, FR-006, FR-007
- Scenario C -> FR-014, FR-015, FR-016
- Scenario D -> FR-008, FR-009
- Scenario E -> FR-010, FR-011, FR-012, SC-003
- Scenario F -> FR-013, FR-016, SC-004

---

## Implementation Validation Snapshot

Executed on 2026-04-11 after contract-alignment refactor:

```bash
# Frontend compile validation
cd frontend
npm run build

# Backend skill-tree regression validation
cd ../backend
npm test -- tests/unit/skill-tree --runInBand
```

Observed results:
- Frontend build completed successfully with production bundle output.
- Backend skill-tree suite passed (`12/12` test suites, `45/45` tests).
