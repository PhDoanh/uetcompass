# Quickstart: Roadmap Community

**Feature**: `010-roadmap-community`
**Date**: 2026-03-29

## Prerequisites

- Node.js 20+
- Backend and frontend dependencies installed
- MongoDB Atlas connection configured
- Feature 009 acceptance contract reachable for fork operation

## Local setup

1. Backend:
```bash
cd backend
npm install
npm run dev
```

2. Frontend:
```bash
cd frontend
npm install
npm run dev
```

## Functional verification checklist

1. Share snapshot creation:
- Create share link from eligible roadmap.
- Confirm tokenized link resolves immutable snapshot payload.

2. Access-mode switching (C1):
- Change `public -> users-only -> private` with same token.
- Verify access control changes immediately while URL token remains unchanged.

3. Community publish/unpublish:
- Publish from allowed shared snapshot.
- Verify one active post per user.
- Unpublish and confirm feed/detail no longer resolve.

4. Immutability:
- Confirm no API exists to edit post body/snapshot pointer.
- Confirm post snapshot remains unchanged after owner accepts new roadmap.

5. Likes on CommunityPost:
- Like/unlike as authenticated user.
- Verify `CommunityPost.likeCount` updates and uniqueness is enforced.

6. Fork flow:
- Fork another student's post.
- Verify completed-course filtering by `(major, courseCode)` occurs before sending payload to Feature 009.

## Non-functional validation plan (C3)

1. Revocation/unpublish propagation:
- Measure elapsed time from revoke/unpublish request completion to first not-found/forbidden result from another session.
- Target: <= 5s.

2. Feed latency at scale:
- Seed 500 posts.
- Run filtered feed queries (major/careerGoal/personalisation).
- Capture p95 API response times.
- Target: <= 2s.

3. Access-mode switch consistency:
- Run repeated mode toggles under concurrent read traffic.
- Verify no token rotation and no stale-authorized response after switch beyond acceptable cache TTL.

4. Like consistency:
- Run concurrent like/unlike operations and verify final counter equals distinct like-record count.

## Suggested test files

- `backend/tests/unit/roadmap/community/share-links.test.js`
- `backend/tests/unit/roadmap/community/posts.test.js`
- `backend/tests/unit/roadmap/community/likes.test.js`
- `backend/tests/unit/roadmap/community/fork.test.js`
- `backend/tests/unit/roadmap/community/performance.test.js`
