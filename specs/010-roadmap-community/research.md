# Research: Roadmap Community

**Feature**: `010-roadmap-community`
**Date**: 2026-03-29
**Feeds into**: `plan.md`, `data-model.md`, `contracts/rest-api.md`, `quickstart.md`

## R-001: Snapshot and post semantics alignment

Decision: Use immutable `RoadmapSnapshot` for both share-link and community publication flows. `CommunityPost` is also immutable for content and snapshot reference after publish; there is no edit flow.

Rationale:
- Matches confirmed decision that post content is immutable and likes are attached to post identity.
- Eliminates ambiguity between live vs snapshot rendering.
- Simplifies auditability and fork reproducibility.

Alternatives considered:
- Live post bound to current accepted roadmap: rejected due to semantic drift and like-content mismatch.
- Editable post body: rejected by confirmed no-edit requirement.

## R-002: Share-link access-mode switching semantics (C1)

Decision: `SharedRoadmap` persists and keeps the same `token`; switching access mode only changes `accessMode` and optional `allowedUserIds`.

Rationale:
- Reuses existing distributed URLs.
- Matches explicit user clarification: private mode blocks outside access instantly without regenerating link.
- Supports deterministic revocation behavior.

Alternatives considered:
- Regenerate token for every mode change: rejected due to broken bookmarks and unnecessary complexity.

## R-003: Snapshot to share cardinality

Decision: Enforce one-to-one between `RoadmapSnapshot` and `SharedRoadmap` (unique `snapshotId` in `shared_roadmaps`). A student may own many snapshots over time.

Rationale:
- Directly enforces confirmed decision 3.
- Prevents duplicate link objects for identical snapshot records.

Alternatives considered:
- Many shared links per snapshot: rejected as duplicate state and policy ambiguity.

## R-004: Major source and anonymous behavior (C2)

Decision: Use major from onboarding/profile/account source as-is for display and feed filtering in all modes. Anonymous mode hides only display name (`"Anonymous"`), not major.

Rationale:
- Implements confirmed decision C2 and removes major-group mapping requirement from this feature.
- Avoids introducing/maintaining mapping configuration logic.
- Keeps filter semantics consistent across identified/anonymous entries.

Alternatives considered:
- Major-group mapping with obfuscation: rejected per C2.

## R-005: Likes model

Decision: Store `likeCount` on `CommunityPost`; enforce one-like-per-user with `CommunityPostLike` unique `(communityPostId,userId)`.

Rationale:
- Matches confirmed decision 1.
- Optimizes feed/detail reads while preserving uniqueness via like records.

Alternatives considered:
- Like count on `SharedRoadmap`: rejected because likes are social signal of post, not raw snapshot link.

## R-006: Non-functional validation planning (C3)

Decision: Add measurable test plan for:
- access switch propagation <= 5s,
- unpublish/revoke visibility <= 5s,
- feed query p95 <= 2s at 500 posts,
- like toggle consistency under concurrent requests (accepted drift threshold documented and monitored).

Rationale:
- Makes success criteria testable pre-implementation.
- Aligns with constitution principle V (test what matters).

Alternatives considered:
- Best-effort manual checks only: rejected due to unmeasurable outcomes.
