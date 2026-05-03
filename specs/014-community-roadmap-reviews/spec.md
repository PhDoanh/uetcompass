# Feature Specification: Community Roadmap Review & Rating System

**Feature Branch**: `014-community-roadmap-reviews`  
**Created**: 2026-04-28  
**Status**: Draft  
**Input**: User description: "Feature Name: Community Roadmap Review & Rating System"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticated Review Management (Priority: P1)

A logged-in UET student can open a roadmap detail panel, review the roadmap, submit a star rating and comment, and later update the same review if they return to that roadmap.

**Why this priority**: This is the core value of the feature. It is the only flow that creates and updates community feedback.

**Independent Test**: Sign in as a UET student, submit a review for a roadmap, then submit a second review for the same roadmap and verify the existing review is updated rather than duplicated.

**Acceptance Scenarios**:

1. **Given** a signed-in UET student viewing a roadmap review tab, **When** they submit a star rating and comment, **Then** the review is saved and appears in their review list.
2. **Given** the same student already has a review for that roadmap, **When** they submit an updated rating or comment, **Then** the existing review is replaced in place and still counts as one review.

---

### User Story 2 - Review Moderation and Visibility (Priority: P2)

A submitted review is checked for unacceptable content, then automatically assessed before it becomes publicly visible. If the review is hidden after review, the author is notified.

**Why this priority**: Community trust depends on preventing abusive content and making moderation outcomes clear to the author.

**Independent Test**: Submit a review that violates the content rules and verify it is rejected immediately; submit a review that later fails moderation and verify it is hidden and the author is notified.

**Acceptance Scenarios**:

1. **Given** a review containing blocked language or patterns, **When** the student submits it, **Then** the system rejects it immediately with a clear error message.
2. **Given** a review that passes the initial content check but is later marked for removal, **When** moderation completes, **Then** the review is hidden from public view and the author receives an in-app notification and an email notification.

---

### User Story 3 - Guest Review Reading (Priority: P3)

An unauthenticated visitor can read approved roadmap reviews and see the average rating, but cannot write a review from the roadmap detail panel.

**Why this priority**: This preserves public reading access while keeping review submission restricted to authenticated students.

**Independent Test**: Open the review tab as a guest and verify the review list and average rating are visible, while the comment box is replaced with a login prompt.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor viewing the review tab, **When** they open it, **Then** they can read approved reviews and the average rating.
2. **Given** the same visitor, **When** they look for the review editor, **Then** they see a login prompt instead of a comment box.

---

### User Story 4 - Guest Homepage Review Carousel (Priority: P4)

An unauthenticated visitor sees a featured reviews carousel on the homepage that highlights highly rated, recently active reviews.

**Why this priority**: The carousel promotes social proof for visitors without exposing write access.

**Independent Test**: Open the homepage as a guest and verify the review carousel is visible, auto-advances, pauses on hover, and can be browsed by touch or drag.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the homepage, **When** they view the User Reviews section, **Then** they see two moving review tracks and can browse featured reviews.
2. **Given** the same visitor using a device or browser that prefers reduced motion, **When** the section loads, **Then** the automatic movement is disabled.
3. **Given** an authenticated user, **When** they open the homepage, **Then** the carousel section is not shown.

---

### Edge Cases

- A roadmap has no approved reviews yet, so the review tab still shows the average rating area and an empty-state message.
- A student tries to submit a second review for the same roadmap from another device or session, and the existing review is still updated rather than duplicated.
- A review is approved after submission and then later hidden, so public counts and visible lists exclude it.
- The visitor is on a mobile device and interacts with the homepage carousel using swipe gestures instead of a mouse.
- The visitor has reduced motion enabled, so the homepage carousel remains static.
- A review list spans many entries, so only a portion of reviews is loaded at a time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow authenticated UET students to submit a 1-to-5 star rating and written comment for a community roadmap.
- **FR-002**: The system MUST enforce exactly one active review per student per roadmap and update the existing review when the same student submits again.
- **FR-003**: The system MUST reject any review that matches blocked content rules before it is accepted for moderation.
- **FR-004**: The system MUST place submitted reviews into a moderation state and only show approved reviews publicly.
- **FR-005**: The system MUST hide reviews from public view when moderation marks them as disallowed.
- **FR-006**: The system MUST show the review author's avatar, display name, submission date, star rating, and comment text in the review list.
- **FR-007**: The system MUST display the average rating at the top of the review list for each roadmap.
- **FR-008**: The system MUST keep review browsing ordered newest-first by default.
- **FR-009**: The system MUST load reviews in paginated increments so the full list is never loaded at once.
- **FR-010**: The system MUST show approved reviews and the average rating to unauthenticated visitors viewing the review tab.
- **FR-011**: The system MUST replace the review editor with a login prompt for unauthenticated visitors.
- **FR-012**: The system MUST show the homepage review carousel only to unauthenticated visitors.
- **FR-013**: The system MUST feature the top 20 approved reviews in the homepage carousel using a ranking that combines rating and recency.
- **FR-014**: The system MUST allow users to pause carousel movement by hovering on desktop and by touch or drag interaction on supported devices.
- **FR-015**: The system MUST stop automatic carousel movement when the user's motion preferences request reduced motion.
- **FR-016**: The system MUST notify the author through an in-app toast and email when a review is hidden after moderation.
- **FR-017**: The system MUST update roadmap rating summaries promptly after a review is approved.

### Key Entities *(include if feature involves data)*

- **Review**: A student's rating and comment for a specific roadmap, including author identity, status, submission time, and visibility.
- **Roadmap Rating Summary**: The aggregate rating view associated with a roadmap, including the average score and review count.
- **Moderation Outcome**: The result of content review for a submitted review, such as approved, hidden, or rejected.
- **Featured Review Set**: The curated set of top community reviews shown on the homepage for guests.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student has exactly one active review per roadmap, and a repeated submission updates the original review instead of creating a duplicate.
- **SC-002**: Reviews that violate blocked content rules are rejected immediately and shown with a clear error message.
- **SC-003**: Reviews hidden after moderation are removed from public view and trigger both an in-app notification and a UET email notification within 5 minutes of the moderation result.
- **SC-004**: Roadmap rating summaries reflect approved review changes within 3 seconds of the approval event.
- **SC-005**: The homepage review carousel shows the first 20 featured reviews within 200 milliseconds on mobile devices after the section becomes visible.
- **SC-006**: The homepage carousel does not auto-advance when reduced motion is enabled.
- **SC-007**: Guests who open the roadmap review tab see a login prompt instead of a review editor in 100% of cases.
- **SC-008**: Review browsing never requires the full review list to load at once, while still allowing users to reach older reviews through incremental loading.

## Assumptions

- Existing authentication already distinguishes guests from authenticated UET students.
- Existing avatar, display name, and email data are available for review authors.
- Existing toast and email notification channels can be reused for review moderation events.
- Approved reviews are the only reviews shown in public-facing review surfaces.
- Pagination can be implemented as either load-more or infinite scroll, as long as only partial review data is loaded at a time.
- The guest homepage carousel is intended only for public visitors and remains hidden from signed-in users.
