# Quickstart: Community Roadmap Review & Rating System

## Prerequisites

- Node.js and npm already installed
- MongoDB connection configured for backend tests and local development
- Backend environment variables available for Gmail SMTP and moderation APIs

## Local Setup

1. Install backend dependencies from the repository root.
2. Start the backend in development mode.
3. Start the frontend dev server.
4. Open the homepage as a guest to verify the review carousel appears.
5. Open a roadmap detail panel as an authenticated UET student to verify the review tab shows the comment box.

## Manual Verification Scenarios

### Authenticated review flow

1. Sign in as a UET student.
2. Open a roadmap detail panel.
3. Submit a 1-to-5 star review with a comment.
4. Confirm the review appears immediately in the list as pending or visible after moderation.
5. Submit a second review for the same roadmap and confirm the existing review updates in place.

### Sync moderation rejection

1. Submit a review containing blocked content.
2. Confirm the API rejects it immediately with a clear error.

### Async moderation flagging

1. Submit a review that passes the blacklist check.
2. Mock the moderation provider to return a flagged result.
3. Confirm the review becomes hidden, a toast is raised through the notification path, and an email is queued through the notification service.

### Guest reading flow

1. Open the review tab while logged out.
2. Confirm the average rating and approved reviews are visible.
3. Confirm the comment box is replaced with a login prompt.

### Guest homepage carousel

1. Open the homepage while logged out.
2. Confirm the User Reviews carousel renders two moving tracks.
3. Hover the carousel to pause motion.
4. Enable reduced motion and confirm auto-scroll stops.
5. Sign in and confirm the carousel disappears.

## Backend Test Targets

- Moderation pipeline: blacklist rejection, Perspective-to-Gemini fallback, retry behavior, status transitions
- Average rating calculation: submit, edit, and flag flows
- SSE emission: `{ roadmapId, averageRating }` payload after approval

## Notes

- Use mocks for Perspective API, Gemini API, and email delivery in tests.
- Keep review list paging at 10 items by default.
- The carousel should stay CSS-only with no JavaScript animation loop.