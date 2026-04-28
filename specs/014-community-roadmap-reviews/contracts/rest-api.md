# REST API Contract: Community Roadmap Review & Rating System

**Feature**: `014-community-roadmap-reviews`
**Date**: 2026-04-28
**Base path**: `/api`

## Common Conventions

**Authentication**
- `POST /api/reviews` and `GET /api/reviews?roadmapId=...` are available to authenticated students and guests for reading where specified.
- `GET /api/reviews/carousel` is guest-only.
- `GET /api/reviews/rating-stream` uses EventSource and should handle browser reconnect behavior.

**Error envelope**
```json
{
  "error": {
    "code": "REVIEW_NOT_FOUND",
    "message": "Human-readable description"
  }
}
```

**Common error codes**

| HTTP | `code` | Meaning |
|---|---|---|
| 400 | `INVALID_PAYLOAD` | Missing or malformed input |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Authenticated user lacks access or guest-only route accessed while signed in |
| 404 | `ROADMAP_NOT_FOUND` | Roadmap does not exist |
| 404 | `REVIEW_NOT_FOUND` | Review does not exist |
| 409 | `CONFLICT` | Review update or moderation state conflict |
| 422 | `BLACKLISTED_CONTENT` | Sync moderation rejected the submission |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

---

## POST /api/reviews

Create or update a review for a roadmap. The handler performs synchronous blacklist checking, saves the review as `pending`, returns immediately, and starts async moderation in the background.

### Request

```json
{
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "rating": 5,
  "content": "Clear structure and helpful progression."
}
```

### Response — 202 Accepted

```json
{
  "message": "Review submitted for moderation.",
  "review": {
    "_id": "64a1b2c3d4e5f6a7b8c9d0f1",
    "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "studentId": "64a1b2c3d4e5f6a7b8c9d0e2",
    "rating": 5,
    "content": "Clear structure and helpful progression.",
    "status": "pending",
    "createdAt": "2026-04-28T08:00:00.000Z",
    "updatedAt": "2026-04-28T08:00:00.000Z"
  }
}
```

### Response — 422 Unprocessable Entity

```json
{
  "error": {
    "code": "BLACKLISTED_CONTENT",
    "message": "Your review contains blocked language. Please revise and submit again."
  }
}
```

---

## GET /api/reviews

Return paginated approved reviews for a roadmap, newest-first.

### Query Parameters
- `roadmapId` required
- `page` default `1`
- `limit` default `10`

### Response — 200 OK

```json
{
  "items": [
    {
      "_id": "64a1b2c3d4e5f6a7b8c9d0f1",
      "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "studentId": "64a1b2c3d4e5f6a7b8c9d0e2",
      "studentDisplayName": "Nguyen Van A",
      "avatarUrl": "https://...",
      "rating": 5,
      "content": "Clear structure and helpful progression.",
      "status": "approved",
      "createdAt": "2026-04-28T08:00:00.000Z",
      "updatedAt": "2026-04-28T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "hasMore": false
  },
  "summary": {
    "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
    "averageRating": 4.8,
    "reviewCount": 25
  }
}
```

---

## GET /api/reviews/carousel

Return the guest-facing top 20 approved reviews for the homepage carousel.

### Response — 200 OK

```json
{
  "items": [
    {
      "reviewId": "64a1b2c3d4e5f6a7b8c9d0f1",
      "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
      "studentDisplayName": "Nguyen Van A",
      "avatarUrl": "https://...",
      "rating": 5,
      "content": "Clear structure and helpful progression.",
      "approvedAt": "2026-04-28T08:00:00.000Z",
      "compositeScore": 98.4
    }
  ]
}
```

---

## GET /api/reviews/rating-stream

Server-Sent Events endpoint for broad rating updates. The client should keep the connection open and rely on browser reconnection if the server restarts.

### Event: `review:rating`

```json
{
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "averageRating": 4.8
}
```

### Event: `review:moderation`

```json
{
  "reviewId": "64a1b2c3d4e5f6a7b8c9d0f1",
  "roadmapId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "status": "flagged"
}
```

---

## Data Side Effects

- Successful approval recalculates `averageRating` on the associated roadmap document.
- Flagged reviews trigger internal notification creation and an external email to the student’s UET address.
- Review updates operate in place on the existing `(roadmapId, studentId)` record.