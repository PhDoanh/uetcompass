# Data Model: Community Roadmap Review & Rating System

## Entities

### Review

Represents one student review for one roadmap.

**Fields**
- `_id`: ObjectId
- `roadmapId`: ObjectId reference to the roadmap document
- `studentId`: ObjectId reference to the student/user document
- `rating`: number from 1 to 5
- `content`: string comment body
- `status`: `pending | approved | flagged`
- `createdAt`: timestamp
- `updatedAt`: timestamp

**Rules**
- Exactly one active review is allowed per `(roadmapId, studentId)` pair.
- `rating` must be an integer between 1 and 5.
- `content` must be present for submitted reviews and may be empty only if the product explicitly allows a rating-only update.
- `status` begins as `pending` after submission and changes only through moderation or approval flow.

**Relationships**
- Belongs to one roadmap.
- Belongs to one student.
- Drives the aggregate rating shown on roadmap cards and in the review tab.

### Roadmap Rating Summary

Represents the aggregate public rating for a roadmap.

**Fields**
- `roadmapId`: ObjectId
- `averageRating`: number
- `reviewCount`: number
- `updatedAt`: timestamp

**Rules**
- Recomputed after each approval or update that changes an approved review.
- Reflects approved reviews only.

**Relationships**
- One summary per roadmap document.
- Applied to both `Roadmap` and `ManualRoadmap` views where the frontend needs display data.

### Moderation Outcome

Represents the moderation result for a submitted review.

**Fields**
- `reviewId`: ObjectId
- `result`: `approved | flagged | rejected`
- `reason`: string
- `attempts`: number
- `completedAt`: timestamp

**Rules**
- Sync blacklist rejection short-circuits before the async pipeline.
- Async moderation updates the existing review record in place.

### Featured Review Set

Represents the global guest-facing selection of top reviews for the homepage carousel.

**Fields**
- `reviewId`: ObjectId
- `roadmapId`: ObjectId
- `rating`: number
- `content`: string
- `studentDisplayName`: string
- `avatarUrl`: string
- `approvedAt`: timestamp
- `compositeScore`: number

**Rules**
- Only approved reviews may appear.
- The guest carousel loads at most 20 entries.
- Ordering is based on rating and recency at query time.

## State Transitions

```text
pending -> approved
pending -> flagged
pending -> rejected
approved -> flagged
approved -> approved (on update after edit)
flagged -> pending (only if the same student resubmits and the review is updated)
```

## Validation Rules

- Reject any `rating` outside the 1-5 range.
- Reject missing `roadmapId` or `studentId`.
- Enforce the unique compound index on `{ roadmapId, studentId }`.
- Require approved reviews for public listing and carousel inclusion.
- Average rating calculations must ignore `flagged` and `rejected` reviews.

## Aggregate Behavior

- `averageRating` is the mean of all approved review ratings for a roadmap.
- `reviewCount` reflects approved review count only.
- When a review is edited in place, the aggregate must be recalculated from the current approved set.
- When a review is flagged after approval, the aggregate must be recalculated without that review.