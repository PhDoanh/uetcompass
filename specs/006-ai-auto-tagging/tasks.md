# Tasks: AI Auto-Tagging System

**Input**: Design documents from `/specs/006-ai-auto-tagging/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are OPTIONAL - not requested in feature specification.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Web app: `backend/src/`, `frontend/src/`
- Paths based on plan.md structure

**Summary**:
- **Total tasks**: 29
- **Tasks per user story**:
  - User Story 1 (Automatic Skill Tagging): 10 tasks
  - User Story 2 (Tag Database Management): 3 tasks  
  - User Story 3 (Tagging Quality Assurance): 4 tasks

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per implementation plan
- [X] T002 Initialize Node.js project with Express.js, Mongoose 8, google-generative-ai dependencies
- [X] T003 [P] Configure ESLint and Prettier for linting and formatting

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Setup MongoDB connection and configuration in backend/src/lib/db.js
- [X] T005 [P] Implement base error handling and logging infrastructure in backend/src/lib/logger.js
- [X] T006 [P] Setup environment configuration management in backend/src/lib/config.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automatic Skill Tagging (Priority: P1) 🎯 MVP

**Goal**: Enable automatic analysis and tagging of new skills extracted from courses by AI

**Independent Test**: Enqueue a skill via API, trigger batch processing, verify that appropriate tags are generated and assigned to the skill in the database

### Implementation for User Story 1

- [ ] T007 [P] [US1] Create Skill, Tag, and TaggingJob Mongoose models in backend/src/modules/tagging/tagging.model.js
- [ ] T008 [US1] Implement tagging service for enqueuing skills and processing batches in backend/src/modules/tagging/tagging.service.js
- [ ] T009 [US1] Implement batch worker for periodic job processing in backend/src/modules/tagging/tagging.worker.js
- [ ] T010 [US1] Implement API routes for skill ingestion in backend/src/modules/tagging/tagging.routes.js
- [ ] T011 [US1] Integrate Google Gemini API for tag generation with confidence scores
- [ ] T012 [US1] Add tag deduplication against existing Tag collection
- [ ] T013 [US1] Implement retry logic for failed LLM API calls with exponential backoff
- [ ] T014 [US1] Add overwrite strategy for Skill.tags on re-tagging
- [ ] T027 [US1] Implement API rate limiting and throttling for Google Gemini calls in backend/src/modules/tagging/tagging.worker.js
- [ ] T028 [US1] Define and implement normalized output contract schema for downstream search (feature 008) in backend/src/modules/tagging/tagging.service.js

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Tag Database Management (Priority: P2)

**Goal**: Maintain and update the tag database with new tags when AI confidence is high

**Independent Test**: Process skills with high-confidence new tags, verify tags are added to Tag collection and usage counts updated

### Implementation for User Story 2

- [ ] T015 [US2] Extend tagging service to add new tags when confidence >85 in backend/src/modules/tagging/tagging.service.js
- [ ] T016 [US2] Implement logic to update tag usage counts on assignment
- [ ] T017 [US2] Add normalization and deduplication for tag names

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Tagging Quality Assurance (Priority: P3)

**Goal**: Provide visibility into tagging accuracy metrics for monitoring and improvement

**Independent Test**: Generate reports showing processed counts, failure rates, and average confidence scores

### Implementation for User Story 3

- [ ] T018 [US3] Implement job listing and detail API endpoints in backend/src/modules/tagging/tagging.routes.js
- [ ] T019 [US3] Add manual review endpoint for updating job results
- [ ] T020 [US3] Implement aggregate statistics and reporting logic in backend/src/modules/tagging/tagging.service.js
- [ ] T021 [US3] Add reporting API endpoint for daily/weekly metrics

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T022 [P] Documentation updates in README.md and API docs
- [ ] T023 Code cleanup and refactoring across tagging module
- [ ] T024 [P] Additional error handling for edge cases
- [ ] T025 Security hardening for API endpoints
- [ ] T026 Run quickstart.md validation
- [ ] T029 Implement queue health monitoring and uptime reporting for 99% SLA in backend/src/modules/tagging/tagging.service.js

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 completion - Builds on tagging logic
- **User Story 3 (P3)**: Depends on User Story 1 completion - Uses job data for reporting

### Within Each User Story

- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all models for User Story 1 together:
Task: "Create Skill, Tag, and TaggingJob Mongoose models in backend/src/modules/tagging/tagging.model.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence</content>
<parameter name="filePath">D:\Desktop\compass\uetcompass\specs\006-ai-auto-tagging\tasks.md