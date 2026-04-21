# Tasks: Manual Roadmap Generator

**Input**: Design documents from `specs/013-manual-roadmap-generator/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rest-api.md`

## Phase 1: Setup (Shared Infrastructure)

- [X] T001 Create new frontend feature folder and component placeholders in `frontend/src/features/manual-roadmap/`
- [X] T002 Add manual roadmap API route registration and controller stubs in `backend/src/modules/roadmap/roadmap.routes.js` and `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T003 Add manual roadmap client helpers to `frontend/src/services/roadmap.api.js`
- [ ] T004 Create backend unit test skeletons for manual roadmap validation and service logic in `backend/tests/unit/roadmap/manualRoadmap.validation.test.js`
- [ ] T005 Create frontend smoke test scaffold for manual roadmap page and editor in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

- [X] T006 [P] Update `backend/src/modules/roadmap/roadmap.model.js` to support raw YAML input, draft/published lifecycle fields, shared metadata, and snapshot-compatible roadmap node payloads aligned with Feature 009
- [X] T007 [P] Implement YAML parsing and DAG validation in `backend/src/modules/roadmap/roadmapValidation.service.js`
- [X] T008 [P] Implement manual roadmap persistence and publish state management in `backend/src/modules/roadmap/roadmap.service.js`
- [X] T009 [P] Add backend controller methods for manual roadmap create, update, share, and error response formatting in `backend/src/modules/roadmap/roadmap.controller.js`
- [X] T010 [P] Add frontend validation utilities for YAML schema, size limits, and error presentation in `frontend/src/features/manual-roadmap/manualRoadmap.validation.js`
- [X] T011 [P] Add hardcoded manual roadmap suggestion cards to `frontend/src/features/general/Homepage.jsx` to satisfy the quickstart requirement for roadmap suggestions

---

## Phase 3: User Story 1 - Create Roadmap with Structured Code (Priority: P1)

**Goal**: Let authenticated users author a manual roadmap using YAML structured code, validate it, save it as a draft, and preview the DAG visually.

**Independent Test**: Input valid YAML into the editor, save the roadmap, and verify a graph preview renders correctly. Input invalid YAML and verify a clear validation error is shown.

### Tests

- [ ] T012 [P] [US1] Add backend integration test for manual roadmap creation and validation failure in `backend/tests/integration/manualRoadmap.creation.test.js`
- [ ] T013 [P] [US1] Add frontend smoke test for the YAML editor, validation errors, and preview rendering in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`

### Implementation

- [X] T014 [P] [US1] Implement `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx` as the manual roadmap creation page with editor, preview pane, and action buttons
- [X] T015 [US1] Implement `frontend/src/features/manual-roadmap/ManualRoadmapEditor.jsx` using Monaco Editor for YAML input and syntax validation
- [X] T016 [US1] Implement `frontend/src/features/manual-roadmap/ManualRoadmapPreview.jsx` using `@xyflow/react` to render a DAG preview from parsed roadmap nodes
- [X] T017 [US1] Implement backend manual roadmap creation logic in `backend/src/modules/roadmap/roadmap.controller.js` and `backend/src/modules/roadmap/roadmap.service.js`
- [X] T018 [US1] Implement frontend save flow in `frontend/src/services/roadmap.api.js` to POST new manual roadmaps to `/api/manual-roadmaps`
- [X] T019 [US1] Add backend validation handling for `VALIDATION_ERROR` and `PUBLICATION_ERROR` responses in `backend/src/modules/roadmap/roadmap.controller.js`

**Checkpoint**: User Story 1 should be verified independently with the editor, save, and preview flow.

---

## Phase 4: User Story 2 - Share Roadmap to Community (Priority: P2)

**Goal**: Allow users to publish a manually created roadmap to the community feed so that other authenticated users can view the shared roadmap.

**Independent Test**: Share a drafted roadmap, verify it transitions to published state, and confirm it appears in the community listing with public visibility.

### Tests

- [ ] T020 [P] [US2] Add backend integration test for the share endpoint and public listing behavior in `backend/tests/integration/manualRoadmap.share.test.js`
- [ ] T021 [P] [US2] Add frontend smoke test for the share button and community visibility UI in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`

### Implementation

- [X] T022 [US2] Implement backend share endpoint in `backend/src/modules/roadmap/roadmap.controller.js` for `POST /api/manual-roadmaps/:roadmapId/share`
- [X] T023 [US2] Implement backend community visibility support in `backend/src/modules/roadmap/roadmap.service.js` and route filters for published roadmaps
- [X] T024 [US2] Implement frontend share action and publish confirmation in `frontend/src/features/manual-roadmap/ManualRoadmapPage.jsx`
- [X] T025 [US2] Add community listing integration in `frontend/src/features/general/Homepage.jsx` so shared roadmaps appear in the community section
- [X] T026 [US2] Update `frontend/src/services/roadmap.api.js` to fetch published roadmaps and support shared roadmap visibility

**Checkpoint**: User Story 2 should be verified independently by sharing and browsing the published roadmap.

---

## Phase 5: User Story 3 - Adjust Existing Roadmap (Priority: P3)

**Goal**: Allow users to edit an existing manual roadmap, validate updated YAML, and save the modified version without losing the draft or published history.

**Independent Test**: Open an existing roadmap in the editor, modify the YAML, save successfully, and verify changes are reflected; when invalid YAML is submitted, show errors while preserving the prior content.

### Tests

- [ ] T027 [P] [US3] Add backend integration test for editing an existing roadmap and rejecting invalid updates in `backend/tests/integration/manualRoadmap.edit.test.js`
- [ ] T028 [P] [US3] Add frontend regression test for edit/save behavior and error rollback in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`

### Implementation

- [X] T029 [US3] Implement backend update endpoint in `backend/src/modules/roadmap/roadmap.controller.js` for `PATCH /api/manual-roadmaps/:roadmapId`
- [X] T030 [P] [US3] Implement frontend edit flow in `frontend/src/features/manual-roadmap/ManualRoadmapEditor.jsx`
- [X] T031 [US3] Implement client-side update validation and rollback logic in `frontend/src/features/manual-roadmap/manualRoadmap.validation.js`
- [X] T032 [US3] Implement frontend save/update to backend in `frontend/src/services/roadmap.api.js`

**Checkpoint**: User Story 3 should be verified independently with edit/save and invalid-change behavior.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T033 [P] Update `specs/013-manual-roadmap-generator/quickstart.md` and `specs/013-manual-roadmap-generator/plan.md` to reflect the final implementation details and user flows
- [ ] T034 [P] Add final backend unit tests for manual roadmap model validation and publish state transitions in `backend/tests/unit/roadmap/manualRoadmap.model.test.js`
- [ ] T035 [P] Add final frontend regression tests in `frontend/src/features/manual-roadmap/ManualRoadmapPage.test.jsx`
- [X] T036 [P] Review and refactor manual roadmap backend and frontend code for consistency, removing any placeholder or scaffold code in `backend/src/modules/roadmap/` and `frontend/src/features/manual-roadmap/`
- [X] T037 [P] Validate `specs/013-manual-roadmap-generator/contracts/rest-api.md` against implemented endpoints and update the contract if needed
- [X] T038 [P] Ensure shared roadmaps are only visible in the community section and not on private-only views in `frontend/src/features/general/Homepage.jsx`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately and prepares file structure, API stubs, and test scaffolding
- **Foundational (Phase 2)**: Blocks all user stories until complete
- **User Stories (Phase 3+)**: Depend on Foundation completion; US1 is MVP, US2 and US3 can be implemented after Foundation
- **Polish (Phase 6)**: Depends on all user story implementation and testing

### User Story Dependencies

- **User Story 1 (P1)**: Core creation/edit workflow; foundation must be complete before implementation
- **User Story 2 (P2)**: Relies on saved roadmap data and publish state; can use US1 output or fixtures for independent testing
- **User Story 3 (P3)**: Relies on existing saved roadmaps; can be verified independently by editing a roadmap created in test setup

### Parallel Opportunities

- Tasks marked `[P]` can run in parallel because they touch different files or independent areas
- Backend model, validation, service, and controller foundational tasks can be worked on concurrently
- Frontend editor, preview, and API helper tasks can be worked on concurrently once foundational APIs are defined
- User stories can be implemented in parallel after the foundational backend and validation infrastructure is ready

---

## Implementation Strategy

### MVP First

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate User Story 1 independently
5. Ship the MVP for manual roadmap creation and preview

### Incremental Delivery

1. Add User Story 2 after US1 is stable
2. Add User Story 3 after US1 is stable
3. Use final polish tasks to align docs, tests, and contracts

### Parallel Execution Example

- One developer builds backend roadmap model/validation while another builds frontend editor/preview components
- Another developer can scaffold frontend API hooks and homepage suggestions in parallel
- Integration and regression tests can be added concurrently with the feature implementation
