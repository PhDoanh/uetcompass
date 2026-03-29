# Tasks: Roadmap Community

**Input**: Design documents from `/specs/010-roadmap-community/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: Included. The specification and quickstart define independent verification and measurable non-functional targets.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unresolved dependency)
- **[Story]**: User story label (`[US1]`..`[US7]`) used only in story phases
- Every task includes a concrete file path

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create Roadmap Community module scaffolding under existing backend/frontend structure.

- [X] T001 Create roadmap-community backend module folders in `backend/src/modules/roadmap/community/`
- [X] T002 Create route bootstrap file for roadmap-community module in `backend/src/modules/roadmap/community/community.routes.js`
- [X] T003 [P] Create roadmap-community frontend feature folders in `frontend/src/features/roadmap-community/`
- [X] T004 [P] Create roadmap-community frontend service client file in `frontend/src/services/roadmapCommunity.api.js`
- [X] T005 Mount roadmap-community routes from app bootstrap in `backend/src/app.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared domain and infrastructure required by all user stories.

**CRITICAL**: No story work begins until this phase is complete.

- [X] T006 Implement immutable `RoadmapSnapshot` model with unique `(acceptedRoadmapId, contentHash)` index in `backend/src/modules/roadmap/community/models/roadmapSnapshot.model.js`
- [X] T007 [P] Implement `SharedRoadmap` model with unique `snapshotId`, stable `token`, and access fields (`private|users-only|public`) in `backend/src/modules/roadmap/community/models/sharedRoadmap.model.js`
- [X] T008 [P] Implement immutable-content `CommunityPost` model with `likeCount` field on post and unique `sharedRoadmapId` in `backend/src/modules/roadmap/community/models/communityPost.model.js`
- [X] T009 [P] Implement `CommunityPostLike` model with unique `(communityPostId,userId)` index in `backend/src/modules/roadmap/community/models/communityPostLike.model.js`
- [X] T010 Implement roadmap snapshot hash/canonicalization utility in `backend/src/modules/roadmap/community/services/snapshotHash.service.js`
- [X] T011 [P] Implement Y-day eligibility service and remaining-days calculator in `backend/src/modules/roadmap/community/services/eligibility.service.js`
- [X] T012 [P] Implement privacy presenter that reads `User.privacySetting` and keeps major from onboarding/profile/account source in `backend/src/modules/roadmap/community/services/privacyPresenter.service.js`
- [X] T013 Implement repository layer for snapshots/sharedRoadmaps/posts/likes in `backend/src/modules/roadmap/community/community.repository.js`
- [X] T014 Implement community service composition root in `backend/src/modules/roadmap/community/community.service.js`
- [X] T015 Add foundational unit tests for cardinality and immutability invariants in `backend/tests/unit/roadmap/community/foundation.invariants.test.js`

**Checkpoint**: Foundation complete. User-story work can begin.

---

## Phase 3: User Story 1 - Check Eligibility and Share via Snapshot Link (Priority: P1) 🎯 MVP

**Goal**: Eligible students create immutable snapshot links, switch access modes on the same token, enforce users-only ACL, and revoke links.

**Independent Test**: Create link, verify immutable snapshot resolve, switch `public -> users-only -> private` on same token, verify ACL behavior, then revoke and verify invalid/not-found.

### Tests for User Story 1

- [X] T016 [P] [US1] Add integration tests for `POST /api/community/share-links` snapshot creation and duplicate-snapshot rejection in `backend/tests/unit/roadmap/community/shareLinks.create.test.js`
- [X] T017 [P] [US1] Add integration tests for `PATCH /api/community/share-links/:token/access` same-token switching and users-only ACL enforcement in `backend/tests/unit/roadmap/community/shareLinks.accessMode.test.js`
- [X] T018 [P] [US1] Add integration tests for `GET /api/community/share-links/:token` read matrix (owner, allowed user, blocked user, anonymous) in `backend/tests/unit/roadmap/community/shareLinks.resolve.test.js`
- [X] T019 [P] [US1] Add integration tests for `DELETE /api/community/share-links/:token` revoke behavior in `backend/tests/unit/roadmap/community/shareLinks.revoke.test.js`
- [X] T020 [P] [US1] Add frontend tests for share controls (eligibility, access mode switch, users-only allowlist editor, revoke) in `frontend/src/features/roadmap-community/__tests__/ShareControls.test.jsx`

### Implementation for User Story 1

- [X] T021 [US1] Implement `POST /api/community/share-links` controller in `backend/src/modules/roadmap/community/controllers/shareLinks.controller.js`
- [X] T022 [US1] Implement `PATCH /api/community/share-links/:token/access` controller with users-only ACL validation, `409 POST_DEPENDENCY_CONFLICT` guard when active post depends on link, and unchanged token response in `backend/src/modules/roadmap/community/controllers/shareLinks.controller.js`
- [X] T023 [US1] Implement `GET /api/community/share-links/:token` controller with access checks by current mode in `backend/src/modules/roadmap/community/controllers/shareLinks.controller.js`
- [X] T024 [US1] Implement `DELETE /api/community/share-links/:token` revoke controller in `backend/src/modules/roadmap/community/controllers/shareLinks.controller.js`
- [ ] T025 [US1] Register share-link routes and request validation schemas in `backend/src/modules/roadmap/community/community.routes.js`
- [X] T026 [US1] Implement share-link service methods (create/switchAccess/resolve/revoke) in `backend/src/modules/roadmap/community/services/shareLinks.service.js`
- [X] T027 [US1] Implement share-link API methods in `frontend/src/services/roadmapCommunity.api.js`
- [X] T028 [US1] Implement share controls UI with access-mode switching and users-only selector in `frontend/src/features/roadmap-community/ShareControls.jsx`
- [X] T029 [US1] Implement public snapshot page for token links in `frontend/src/features/roadmap-community/ShareSnapshotPage.jsx`
- [X] T030 [US1] Register public share route in `frontend/src/App.jsx`

**Checkpoint**: US1 is complete and independently testable.

---

## Phase 4: User Story 2 - Publish Roadmap to Community Feed (Priority: P1)

**Goal**: Publish immutable snapshot-backed posts, enforce one active post per student, and unpublish immediately.

**Independent Test**: Publish post, verify feed visibility, accept new roadmap and verify post snapshot stays unchanged, then unpublish and verify not discoverable.

### Tests for User Story 2

- [X] T031 [P] [US2] Add integration tests for `POST /api/community/posts` publish and replace-upsert semantics in `backend/tests/unit/roadmap/community/posts.publish.test.js`
- [X] T032 [P] [US2] Add integration tests for `DELETE /api/community/posts/me` unpublish behavior in `backend/tests/unit/roadmap/community/posts.unpublish.test.js`
- [X] T033 [P] [US2] Add unit tests confirming CommunityPost snapshot pointer/content immutability and no edit flow in `backend/tests/unit/roadmap/community/posts.immutability.test.js`
- [ ] T034 [P] [US2] Add frontend tests for publish/unpublish controls in `frontend/src/features/roadmap-community/__tests__/PublishControls.test.jsx`

### Implementation for User Story 2

- [X] T035 [US2] Implement `POST /api/community/posts` controller in `backend/src/modules/roadmap/community/controllers/posts.controller.js`
- [X] T036 [US2] Implement `DELETE /api/community/posts/me` controller in `backend/src/modules/roadmap/community/controllers/posts.controller.js`
- [X] T037 [US2] Implement publication service that links post to one sharedRoadmap snapshot and replaces active post per owner in `backend/src/modules/roadmap/community/services/posts.service.js`
- [X] T038 [US2] Add publish/unpublish routes in `backend/src/modules/roadmap/community/community.routes.js`
- [X] T039 [US2] Implement publish/unpublish API methods in `frontend/src/services/roadmapCommunity.api.js`
- [X] T040 [US2] Implement publish/unpublish controls on roadmap page in `frontend/src/features/roadmap-community/PublishControls.jsx`
- [X] T041 [US2] Implement community post card metadata renderer in `frontend/src/features/roadmap-community/CommunityPostCard.jsx`

**Checkpoint**: US2 is complete and independently testable.

---

## Phase 5: User Story 3 - Control Privacy (Display Name and Major Identity) (Priority: P2)

**Goal**: Apply privacy at read time; anonymous mode hides only display name while major still comes from onboarding/profile/account source.

**Independent Test**: Toggle privacy and verify share/feed/detail rendering updates without republish or link regeneration, with major preserved in both modes.

### Tests for User Story 3

- [ ] T042 [P] [US3] Add backend unit tests for identified/anonymous rendering and fallback display name policy in `backend/tests/unit/roadmap/community/privacy.presenter.test.js`
- [ ] T043 [P] [US3] Add backend integration tests for privacy propagation on share/feed/detail responses in `backend/tests/unit/roadmap/community/privacy.integration.test.js`
- [ ] T044 [P] [US3] Add frontend tests for identity rendering updates in feed/detail/share views in `frontend/src/features/roadmap-community/__tests__/PrivacyRendering.test.jsx`

### Implementation for User Story 3

- [ ] T045 [US3] Implement read-time identity formatter (identified vs anonymous) without major-group mapping in `backend/src/modules/roadmap/community/services/privacyPresenter.service.js`
- [ ] T046 [US3] Wire privacy presenter into share-link response path in `backend/src/modules/roadmap/community/controllers/shareLinks.controller.js`
- [ ] T047 [US3] Wire privacy presenter into feed/detail response path in `backend/src/modules/roadmap/community/controllers/posts.controller.js`
- [ ] T048 [US3] Implement owner identity badge component for anonymous/identified display in `frontend/src/features/roadmap-community/OwnerIdentityBadge.jsx`

**Checkpoint**: US3 is complete and independently testable.

---

## Phase 6: User Story 4 - Browse and Filter the Community Feed (Priority: P2)

**Goal**: Provide authenticated feed browsing with major/career-goal/personalisation filters and deterministic ordering.

**Independent Test**: Seed mixed posts and verify filters (major, careerGoalRole, personalisationLevel) individually and combined, including empty state.

### Tests for User Story 4

- [ ] T049 [P] [US4] Add backend tests for feed query filtering (`major`, `careerGoalRole`, `personalisationLevel`) in `backend/tests/unit/roadmap/community/feed.filters.test.js`
- [ ] T050 [P] [US4] Add backend tests for deterministic feed ordering and pagination in `backend/tests/unit/roadmap/community/feed.ordering.test.js`
- [ ] T051 [P] [US4] Add frontend tests for feed filters and empty-state UX in `frontend/src/features/roadmap-community/__tests__/CommunityFeedFilters.test.jsx`

### Implementation for User Story 4

- [ ] T052 [US4] Implement `GET /api/community/posts` controller with validated query params in `backend/src/modules/roadmap/community/controllers/posts.controller.js`
- [ ] T053 [US4] Implement feed query service and aggregation pipeline in `backend/src/modules/roadmap/community/services/feedQuery.service.js`
- [ ] T054 [US4] Implement feed API methods in `frontend/src/services/roadmapCommunity.api.js`
- [ ] T055 [US4] Implement authenticated community feed page in `frontend/src/features/roadmap-community/CommunityFeedPage.jsx`
- [ ] T056 [US4] Implement feed filter panel using `major` (not major-group mapping), `careerGoalRole`, and `personalisationLevel` in `frontend/src/features/roadmap-community/CommunityFeedFilters.jsx`
- [ ] T057 [US4] Add route guard enforcement for community feed route in `frontend/src/guards/OnboardingGuard.jsx`

**Checkpoint**: US4 is complete and independently testable.

---

## Phase 7: User Story 5 - View Full Community Roadmap Detail (Priority: P2)

**Goal**: Show immutable snapshot detail in read-only mode for authenticated users.

**Independent Test**: Open detail from feed and verify full snapshot nodes; after unpublish, revisit URL and verify unavailable state.

### Tests for User Story 5

- [ ] T058 [P] [US5] Add backend tests for `GET /api/community/posts/:postId` payload and not-found after unpublish in `backend/tests/unit/roadmap/community/posts.detail.test.js`
- [ ] T059 [P] [US5] Add frontend tests for detail rendering and unavailable state in `frontend/src/features/roadmap-community/__tests__/CommunityDetailPage.test.jsx`

### Implementation for User Story 5

- [ ] T060 [US5] Implement `GET /api/community/posts/:postId` controller in `backend/src/modules/roadmap/community/controllers/posts.controller.js`
- [ ] T061 [US5] Implement detail service with `hasLiked` and `isOwner` viewer flags in `backend/src/modules/roadmap/community/services/postDetail.service.js`
- [ ] T062 [US5] Implement detail API method in `frontend/src/services/roadmapCommunity.api.js`
- [ ] T063 [US5] Implement read-only community detail page in `frontend/src/features/roadmap-community/CommunityDetailPage.jsx`
- [ ] T064 [US5] Register feed/detail routes in `frontend/src/App.jsx`

**Checkpoint**: US5 is complete and independently testable.

---

## Phase 8: User Story 6 - Like a Community Post (Priority: P3)

**Goal**: Support authenticated like/unlike with `likeCount` stored on `CommunityPost` and consistency with like records.

**Independent Test**: Like/unlike from feed/detail and verify count changes and one-like-per-user invariant.

### Tests for User Story 6

- [ ] T065 [P] [US6] Add backend tests for `POST /api/community/posts/:postId/likes` and uniqueness guard in `backend/tests/unit/roadmap/community/likes.create.test.js`
- [ ] T066 [P] [US6] Add backend tests for `DELETE /api/community/posts/:postId/likes` and idempotent unlike behavior in `backend/tests/unit/roadmap/community/likes.delete.test.js`
- [ ] T067 [P] [US6] Add backend tests verifying `CommunityPost.likeCount` matches distinct like-record count after mutations in `backend/tests/unit/roadmap/community/likes.consistency.test.js`
- [ ] T068 [P] [US6] Add frontend tests for like toggle on feed and detail in `frontend/src/features/roadmap-community/__tests__/LikeToggle.test.jsx`

### Implementation for User Story 6

- [ ] T069 [US6] Implement `POST /api/community/posts/:postId/likes` controller in `backend/src/modules/roadmap/community/controllers/likes.controller.js`
- [ ] T070 [US6] Implement `DELETE /api/community/posts/:postId/likes` controller in `backend/src/modules/roadmap/community/controllers/likes.controller.js`
- [ ] T071 [US6] Implement like service with atomic `likeCount` updates on `CommunityPost` in `backend/src/modules/roadmap/community/services/likes.service.js`
- [ ] T072 [US6] Register like routes in `backend/src/modules/roadmap/community/community.routes.js`
- [ ] T073 [US6] Implement like API methods in `frontend/src/services/roadmapCommunity.api.js`
- [ ] T074 [US6] Implement reusable like toggle component in `frontend/src/features/roadmap-community/LikeToggle.jsx`

**Checkpoint**: US6 is complete and independently testable.

---

## Phase 9: User Story 7 - Fork a Community Roadmap (Priority: P3)

**Goal**: Fork published snapshots through completed-course filtering and Feature 009 acceptance contract.

**Independent Test**: Fork valid post and verify acceptance side effects; fork invalid post and verify prerequisite violations without mutating existing user state.

### Tests for User Story 7

- [ ] T075 [P] [US7] Add backend tests for completed-course filtering by canonical `(major, courseCode)` before contract call in `backend/tests/unit/roadmap/community/fork.filtering.test.js`
- [ ] T076 [P] [US7] Add backend tests for Feature 009 pass-through errors (`ALL_COMPLETED`, `PREREQUISITE_VIOLATION`) in `backend/tests/unit/roadmap/community/fork.contract.test.js`
- [ ] T077 [P] [US7] Add frontend tests for fork action visibility and error handling in `frontend/src/features/roadmap-community/__tests__/ForkRoadmapButton.test.jsx`

### Implementation for User Story 7

- [ ] T078 [US7] Implement fork orchestration service (load snapshot, filter completed, call Feature 009) in `backend/src/modules/roadmap/community/services/fork.service.js`
- [ ] T079 [US7] Implement `POST /api/community/posts/:postId/fork` controller with owner guard in `backend/src/modules/roadmap/community/controllers/fork.controller.js`
- [ ] T080 [US7] Implement Feature 009 fork-consumable client adapter in `backend/src/modules/roadmap/community/integrations/roadmap009.client.js`
- [ ] T081 [US7] Implement post-success side effects integration (notification, eligibility reset, audit, optional progress update) in `backend/src/modules/roadmap/community/services/forkSideEffects.service.js`
- [ ] T082 [US7] Register fork route and error mapping in `backend/src/modules/roadmap/community/community.routes.js`
- [ ] T083 [US7] Implement fork API method in `frontend/src/services/roadmapCommunity.api.js`
- [ ] T084 [US7] Implement fork action component on community detail page in `frontend/src/features/roadmap-community/ForkRoadmapButton.jsx`

**Checkpoint**: US7 is complete and independently testable.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Validate non-functional targets, close consistency gaps, and finalize docs/contracts.

- [ ] T085 [P] Add request/response schema validation and shared error mapper in `backend/src/modules/roadmap/community/community.validators.js`
- [ ] T086 [P] Add structured logging and trace correlation for share/publish/like/fork actions in `backend/src/modules/roadmap/community/community.logging.js`
- [ ] T087 Add contract tests for access-mode to publication dependency behavior (`409 POST_DEPENDENCY_CONFLICT` while post is active) in `backend/tests/unit/roadmap/community/sharePostDependency.contract.test.js`
- [ ] T088 Add non-functional test for feed latency target (p95 <= 2s at 500 posts) in `backend/tests/unit/roadmap/community/nfr.feedLatency.test.js`
- [ ] T089 Add non-functional test for revoke/unpublish and access-mode-switch propagation targets (<= 5s, including SC-006) in `backend/tests/unit/roadmap/community/nfr.propagation.test.js`
- [ ] T090 Add non-functional consistency audit test (`likeCount` vs like records, immutable snapshot/post content) in `backend/tests/unit/roadmap/community/nfr.consistency.test.js`
- [ ] T091 Update API contract examples and endpoint naming to match implementation in `specs/010-roadmap-community/contracts/rest-api.md`
- [ ] T092 Update quickstart with measurable validation commands and evidence capture steps in `specs/010-roadmap-community/quickstart.md`
- [ ] T093 Update community-scope test runner wiring in `scripts/run-tests.mjs`
- [ ] T094 Add SC-001 usability validation task (<=60s and <=3 interactions for share/publish happy paths) in `backend/tests/unit/roadmap/community/nfr.usability.test.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies.
- **Phase 2 (Foundational)**: Depends on Phase 1 and blocks all story phases.
- **Phase 3-9 (User Stories)**: Depend on Phase 2 completion.
- **Phase 10 (Polish)**: Depends on completion of intended user stories.

### User Story Dependencies

- **US1 (P1)**: Starts after Phase 2; no dependency on other stories.
- **US2 (P1)**: Starts after Phase 2; independent from US1 implementation.
- **US3 (P2)**: Starts after Phase 2; uses shared privacy presenter and applies across US1/US2 read paths.
- **US4 (P2)**: Starts after Phase 2; practically validated once US2 posts exist.
- **US5 (P2)**: Depends on US2 post data; can proceed in parallel with US4 implementation.
- **US6 (P3)**: Depends on US2/US5 post surfaces.
- **US7 (P3)**: Depends on US5 detail path and Feature 009 acceptance contract availability.

### Recommended Story Order

1. Phase 1 -> Phase 2
2. US1 (MVP link sharing with access switching)
3. US2 (community publish/unpublish)
4. US3 + US4 (parallel)
5. US5
6. US6 + US7 (parallel)
7. Phase 10 polish and NFR validation

---

## Parallel Opportunities

### US1

- Run in parallel: T016, T017, T018, T019, T020
- Run in parallel: T027, T028, T029

### US2

- Run in parallel: T031, T032, T033, T034
- Run in parallel: T039, T040, T041

### US3

- Run in parallel: T042, T043, T044
- Run in parallel: T046, T047, T048 after T045

### US4

- Run in parallel: T049, T050, T051
- Run in parallel: T055, T056

### US5

- Run in parallel: T058, T059
- Run in parallel: T062, T063

### US6

- Run in parallel: T065, T066, T067, T068
- Run in parallel: T073, T074

### US7

- Run in parallel: T075, T076, T077
- Run in parallel: T080, T081

### Polish

- Run in parallel: T085, T086
- Run in parallel: T088, T089, T090

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) end-to-end.
3. Validate immutable snapshot behavior, same-token access switching, users-only ACL, and revoke behavior.
4. Demo MVP.

### Incremental Delivery

1. Deliver US2 to unlock publish/unpublish.
2. Deliver US3-US5 to complete privacy-safe discovery and detail consumption.
3. Deliver US6-US7 for engagement and adoption workflows.
4. Complete Phase 10 non-functional validation and contract/doc alignment.

### Parallel Team Strategy

1. Team completes Setup + Foundational together.
2. After foundation:
   - Developer A: US1 + US2 backend APIs
   - Developer B: US1-US5 frontend pages and controls
   - Developer C: US6 + US7 domain and integration flows
3. Run cross-story NFR checks in Phase 10 before release.
