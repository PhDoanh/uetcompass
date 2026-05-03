# Research: Community Roadmap Review & Rating System

**Feature**: `014-community-roadmap-reviews`
**Date**: 2026-04-28
**Status**: Resolved

## R-001: Separate Review Collection with Roadmap Service Boundary

**Decision**: Use a standalone `Review` collection in `backend/src/modules/review/` and keep roadmap access behind roadmap service methods only. The review service validates roadmap existence and updates average ratings by calling roadmap service functions, not by importing roadmap models directly.

**Rationale**: The repo already enforces modular monolith boundaries in the roadmap module, and the feature explicitly requires a clear boundary with no direct cross-module model imports. A separate collection keeps the one-review-per-student-per-roadmap invariant simple through a compound unique index, while the roadmap service remains the only owner of roadmap document writes.

**Alternatives considered**:
- Embedding reviews inside roadmap documents, rejected because it complicates pagination, moderation state, and top-20 carousel queries.
- Writing roadmap fields directly from the review module, rejected because it violates the existing service-layer boundary pattern.

## R-002: Async Moderation Pipeline with Fire-and-Forget Job

**Decision**: In the POST handler, persist the review as `pending`, return immediately, and launch moderation as a fire-and-forget promise. Moderation runs sync blacklist checks first, then tries Perspective API, and falls back to the existing Gemini service if the primary check fails or times out. Retry is handled inside the same job with exponential backoff capped at three attempts.

**Rationale**: The repository already uses fire-and-forget background work for roadmap generation, and the feature constraints explicitly rule out a queue. This keeps the request path fast while still allowing moderation to finish asynchronously.

**Alternatives considered**:
- A queue worker, rejected because the project does not use Redis or another job queue dependency.
- Blocking the POST request until moderation finishes, rejected because it would hurt latency and create a poor submit experience.

## R-003: SSE Broadcast for Average Rating Updates

**Decision**: Reuse the existing roadmap SSE pattern by adding a review SSE broadcaster that emits `{ roadmapId, averageRating }` after each approval. The frontend can subscribe once and filter by roadmapId.

**Rationale**: The repo already has a proven SSE connection map pattern in `roadmap.sse.js`, including browser-friendly EventSource semantics. Reusing that shape keeps reconnect behavior simple and matches the feature requirement for near-real-time average rating updates.

**Alternatives considered**:
- Polling, rejected because the requirement asks for SSE-driven updates within 3 seconds.
- Pushing rating updates through the notification system, rejected because it is user-targeted rather than broadcast-oriented.

## R-004: Notification Delivery via Existing Notification Module

**Decision**: Use the existing notification service for internal moderation flag alerts and nodemailer for external UET Gmail email delivery.

**Rationale**: The repository already persists notifications and pushes them through SSE. Reusing that module keeps the review feature consistent with the existing notification architecture, while nodemailer covers the required external email path.

**Alternatives considered**:
- Implementing a new review-specific notification store, rejected as duplicate infrastructure.
- Email-only notifications, rejected because the feature explicitly needs an internal toast as well.

## R-005: Carousel Data and Motion Strategy

**Decision**: Drive the homepage guest carousel from a dedicated top-20 approved review query ordered by a weighted recency score at query time, and implement the motion entirely in CSS with transform-based animation plus reduced-motion suppression.

**Rationale**: The feature disallows new frontend libraries and requires a mobile-friendly implementation. A CSS-only animation keeps runtime overhead low, while a query-time weighted sort avoids extra stored score fields.

**Alternatives considered**:
- A JavaScript animation loop, rejected because it increases jank risk and conflicts with the CSS-only constraint.
- Precomputing a composite score column, rejected because the feature does not need another persisted score field.

## R-006: Review Tab and Carousel Mount Points

**Decision**: Add a shared `ReviewTab` component under the skill-tree feature and a standalone `ReviewCarousel` component under the homepage/general feature. The review tab is mounted inside the existing detail panel, and the carousel is rendered only for guests in the homepage.

**Rationale**: Existing skill-tree code already centers the detail panel as the right place for tabbed content, and `Homepage.jsx` already branches by auth state. Keeping the component placement local minimizes routing changes and preserves the current public/private page split.

**Alternatives considered**:
- Creating a new route for reviews, rejected because the surfaces already exist in the detail panel and homepage.
- Building the carousel into the shared navigation or footer, rejected because it is homepage-specific and guest-only.