# Tasks: Community Roadmap Review & Rating System

**Input**: Design documents from `/specs/014-community-roadmap-reviews/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md
**Tests**: Backend unit tests are required for moderation, rating recalculation, and SSE payloads. Frontend validation is included where the feature surface is UI-driven.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the review feature boundary and shared frontend entry points

- [ ] T001 Create the review module and component folders in backend/src/modules/review/ and frontend/src/features/{skill-tree,general}/
- [ ] T002 [P] Scaffold the review API client and request helper files in frontend/src/services/review.api.js and frontend/src/services/http.js
- [ ] T003 [P] Add review surface style anchors in frontend/src/features/skill-tree/skill-tree.css and frontend/src/style/general-component.css

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core schema, routing, and shared service helpers required by every story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T004 Create the Review mongoose schema with the unique { roadmapId, studentId } index in backend/src/modules/review/review.model.js
- [ ] T005 [P] Add averageRating fields to backend/src/modules/roadmap/roadmap.model.js and backend/src/modules/roadmap/manualRoadmap.model.js
- [ ] T006 [P] Add roadmap validation and average-rating update helpers in backend/src/modules/roadmap/roadmap.service.js
- [ ] T007 [P] Scaffold the review moderation, SSE, and notification helper modules in backend/src/modules/review/review.moderation.service.js, backend/src/modules/review/review.sse.js, and backend/src/modules/review/review.notifications.js
- [ ] T008 Register the review router and SSE endpoint in backend/src/app.js and backend/src/modules/review/review.routes.js

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Authenticated Review Management (Priority: P1) 🎯 MVP

**Goal**: A signed-in UET student can submit or update exactly one review per roadmap from the roadmap detail panel.

**Independent Test**: Sign in as a UET student, submit a review for a roadmap, then submit a second review for the same roadmap and confirm the same review record is updated in place.

### Tests for User Story 1

- [ ] T009 [P] [US1] Add review upsert unit coverage for one-review-per-roadmap behavior in backend/tests/unit/review/review.service.test.js

### Implementation for User Story 1

- [ ] T010 [US1] Implement POST /api/reviews validation and upsert flow in backend/src/modules/review/review.controller.js and backend/src/modules/review/review.service.js
- [ ] T011 [P] [US1] Add review submit and edit API helpers in frontend/src/services/review.api.js
- [ ] T012 [US1] Mount the shared ReviewTab in the authenticated detail panel from frontend/src/features/skill-tree/SkillTreePage.jsx and frontend/src/features/skill-tree/CourseDetailPanel.jsx
- [ ] T013 [US1] Build the authenticated comment box, 1-to-5 star selector, and edit affordance in frontend/src/features/skill-tree/ReviewTab.jsx

**Checkpoint**: User Story 1 should be fully functional and independently testable

---

## Phase 4: User Story 2 - Review Moderation and Visibility (Priority: P2)

**Goal**: Review submissions are filtered for blocked content, moderated asynchronously, and hidden reviews trigger notifications.

**Independent Test**: Submit a review that contains blocked content and confirm it is rejected immediately; submit a review that passes sync checks and confirm it can later move to approved or flagged status with the correct notifications.

### Tests for User Story 2

- [ ] T014 [P] [US2] Add moderation pipeline unit tests for blacklist rejection, Perspective fallback, retries, and status transitions in backend/tests/unit/review/review.moderation.service.test.js
- [ ] T015 [P] [US2] Add rating recalculation and flagging coverage in backend/tests/unit/review/review.rating.test.js

### Implementation for User Story 2

- [ ] T016 [US2] Implement sync blacklist rejection and async moderation orchestration in backend/src/modules/review/review.moderation.service.js
- [ ] T017 [US2] Persist moderation status changes and hide flagged reviews in backend/src/modules/review/review.service.js
- [ ] T018 [US2] Send internal toast notifications and external email alerts for flagged reviews in backend/src/modules/review/review.notifications.js and backend/src/modules/review/review.service.js
- [ ] T019 [US2] Recalculate roadmap averageRating after approval or flagging and broadcast moderation events from backend/src/modules/review/review.sse.js and backend/src/modules/review/review.service.js

**Checkpoint**: User Stories 1 and 2 should now work independently

---

## Phase 5: User Story 3 - Guest Review Reading (Priority: P3)

**Goal**: Guests can read approved roadmap reviews and see the average rating, but cannot access the review editor.

**Independent Test**: Open the review tab while logged out and confirm approved reviews and the average rating are visible while the comment box is replaced by a login prompt.

### Tests for User Story 3

- [ ] T020 [P] [US3] Add paginated approved-review list tests in backend/tests/unit/review/review.list.test.js

### Implementation for User Story 3

- [ ] T021 [US3] Implement GET /api/reviews approved-only newest-first pagination and summary payloads in backend/src/modules/review/review.controller.js and backend/src/modules/review/review.service.js
- [ ] T022 [US3] Mount the shared ReviewTab in the guest roadmap panel and show the login prompt instead of the editor in frontend/src/features/skill-tree/PublicRoadmapNodePanel.jsx and frontend/src/features/skill-tree/ReviewTab.jsx
- [ ] T023 [US3] Surface the roadmap average rating and load-more review pagination in frontend/src/features/skill-tree/ReviewTab.jsx and frontend/src/features/skill-tree/CourseDetailPanel.jsx

**Checkpoint**: User Stories 1, 2, and 3 should now be independently functional

---

## Phase 6: User Story 4 - Guest Homepage Review Carousel (Priority: P4)

**Goal**: Guests see a top-20 review carousel on the homepage, while signed-in users do not.

**Independent Test**: Open the homepage as a guest and verify the carousel appears, auto-scrolls, pauses on hover, respects reduced-motion, and disappears when signed in.

### Tests for User Story 4

- [ ] T024 [P] [US4] Add top-20 carousel query and reduced-motion coverage in backend/tests/unit/review/review.carousel.test.js
- [ ] T025 [P] [US4] Add homepage visibility coverage for the guest-only carousel in frontend/src/features/general/ReviewCarousel.test.jsx

### Implementation for User Story 4

- [ ] T026 [US4] Implement GET /api/reviews/carousel with weighted rating-recency sorting in backend/src/modules/review/review.controller.js and backend/src/modules/review/review.service.js
- [ ] T027 [P] [US4] Build the CSS-only dual-track carousel animation, hover pause, and reduced-motion behavior in frontend/src/features/general/ReviewCarousel.jsx and frontend/src/style/general-component.css
- [ ] T028 [US4] Render the guest-only carousel in frontend/src/features/general/Homepage.jsx and keep it hidden for signed-in users

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation alignment across stories

- [ ] T029 [P] Update the review feature documentation and examples in specs/014-community-roadmap-reviews/contracts/rest-api.md and specs/014-community-roadmap-reviews/quickstart.md
- [ ] T030 Run the review-focused backend and frontend validation paths in backend/tests/unit/review/ and frontend/src/features/general/ReviewCarousel.jsx

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on completion of the desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational; no dependency on later stories
- **User Story 2 (P2)**: Can start after Foundational; reuses review persistence from US1 but remains independently testable
- **User Story 3 (P3)**: Can start after Foundational; consumes approved-review listing and shared tab UI
- **User Story 4 (P4)**: Can start after Foundational; consumes carousel query and homepage guest gating

### Within Each User Story

- Tests are written before implementation tasks in that story phase
- Schema/helpers before controller/service behavior
- Backend behavior before frontend wiring
- Core feature before polish and documentation updates

### Parallel Opportunities

- Setup tasks T002 and T003 can run in parallel
- Foundational tasks T005, T006, and T007 can run in parallel after T004
- User Story 1 test and API helper tasks can proceed in parallel once the schema is ready
- User Story 2 test tasks can run in parallel, as can the notification and SSE implementation slices
- User Story 3 and User Story 4 tests can run in parallel once the review service contract is stable

---

## Parallel Example: User Story 1

```bash
Task: "Add review upsert unit coverage for one-review-per-roadmap behavior in backend/tests/unit/review/review.service.test.js"
Task: "Add review submit and edit API helpers in frontend/src/services/review.api.js"
```

## Parallel Example: User Story 4

```bash
Task: "Add top-20 carousel query and reduced-motion coverage in backend/tests/unit/review/review.carousel.test.js"
Task: "Build the CSS-only dual-track carousel animation, hover pause, and reduced-motion behavior in frontend/src/features/general/ReviewCarousel.jsx and frontend/src/style/general-component.css"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the submit/update flow before moving on

### Incremental Delivery

1. Setup + Foundational establish the review boundary and shared helpers
2. User Story 1 delivers the core authenticated review write flow
3. User Story 2 adds moderation, notification, and visibility handling
4. User Story 3 adds guest-readable review browsing and average rating display
5. User Story 4 adds the guest-only homepage carousel

### Parallel Team Strategy

1. One developer can own backend schema and service work while another starts the frontend review tab shell
2. Moderation, notification, and carousel work can proceed independently after the foundation is in place
3. Validation tasks can be queued once the feature slices are merged
