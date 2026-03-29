# Feature Specification: Roadmap Community

**Feature Branch**: `010-roadmap-community`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Build the Roadmap Community feature for UETCompass — a system that allows students to share their personalised learning roadmaps with others, either via a public shareable link or by publishing to a discoverable community feed."

---

## Context & Scope

Roadmap Community enables students to share their accepted personalised roadmaps as immutable snapshots. Each time a student clicks "Share," a new snapshot is created and bound to a SharedRoadmap object. Multiple active SharedRoadmap records per student are allowed, each representing a specific version of their journey. Each snapshot can be managed independently (access mode, revocation, etc.). Only shares with `accessMode: public` appear in the Community Feed, which is discoverable by authenticated users.


Two distinct sharing mechanisms exist with different persistence semantics:

- **Share via link (snapshot, accessMode switchable)**: **When a student clicks "share", the system takes an immutable snapshot of the current roadmap and binds it to a unique Share Link URL/token.** This snapshot will never change, regardless of any future edits or replacements to the student's roadmap. The Share Link object itself persists, and its link access mode (`accessMode`) can be changed at any time via Share Settings. The URL/token always remains the same when switching modes; only the access state changes. Supported modes:
	- `private`: Only the owner can view the link.
	- `users-only`: Only specific users (by userId) can view, either by search or link.
	- `public`: Anyone can view (searchable and by link).
If switched to `private`, outside access is instantly blocked (like Google Drive), but the link itself does not change. The link and its snapshot persist until the student explicitly revokes it; it is never automatically invalidated.
- **Publish to community feed (snapshot)**: Publishing captures the student's current accepted roadmap as an immutable snapshot at the moment of publication. Create a community post that linked to sharedRoadmap
Accepting a new roadmap does NOT automatically update or remove the published post. To update their community presence, a student must explicitly publish again, which replaces the existing CommunityPost with a fresh snapshot. At most one active CommunityPost per student exists at any time.
### Session 2026-03-29

- Q: When switching Share Link access mode (e.g., Public to Private), what happens to the old link? Does the Share Link object persist and simply change its access state, or is a new link generated for each mode? Is the same URL reused, or does the link/token change?
	→ A: The Share Link object persists and only its access state changes. The same URL/token is reused; when set to Private, outside access is instantly blocked (like Google Drive), but the link itself does not change. Bookmarks and previously distributed links remain valid but are access-controlled by the current mode.

- Q: What happens to the snapshot when the user clicks "share" and later changes their roadmap?
	→ A: Once the user clicks "share", a snapshot of the roadmap is taken and is immutable. Future changes to the roadmap do not affect the shared snapshot.

Both sharing actions are time-gated: a student must have held their current accepted roadmap for a minimum configurable period of **Y days** before generating a new share link or publishing to the community (including replacing an existing entry with a new publication).

Authenticated UETCompass users can also **like** a CommunityPost (a simple interest signal displayed as a count) and **fork** a published roadmap — sending fork-consumable payload to Feature 009's acceptance flow (including prerequisite validation). Before validation is executed, courses the forking student has already completed are filtered out using canonical identity `(major, courseCode)`. If the filtered payload passes validation, it becomes the forking student's new accepted roadmap and triggers standard post-acceptance side effects (notification, eligibility reset, audit log, optional progress update). Both actions require authentication and apply only to community feed posts, not to share link snapshots.

This feature depends on Feature 009's prerequisite compatibility validation being in place at the acceptance endpoint. That validation is specified and owned by Feature 009; this feature consumes it (fork triggers it) but does not define it.
-Sharing & Snapshots
Snapshot & Link Rule:

Each accepted roadmap snapshot can have only one share link; no duplicate snapshots/links are permitted for the same roadmap content.
To create a new link, a new snapshot (with different content) must be generated; the system must prevent duplicate snapshots for the same roadmap state.
Uniqueness is enforced by computing a hash of all `courseCode` and `skills` fields in the roadmap; if a new snapshot's hash matches an existing one, creation is blocked.
Share Link Modes:

Share links have access modes: private, users-only, public.
Only links with public access can appear in the community feed; toggling access to non-public removes feed eligibility.
If the access mode is changed to non-public, the system will prompt the user to delete the CommunityPost; otherwise, the post remains public and visible in the feed.
On fork prerequisite failure, the error message will list all violating courses.
Community feed entries (CommunityPost) are references (pointers) to existing public snapshot share links.
Feed Listing and Deletion:

To remove an entry from the community feed, the CommunityPost must be deleted.
Unpublishing a community post deletes the CommunityPost object, but the underlying SharedRoadmap/snapshot or share link may persist unless explicitly revoked.
Feed and Snapshot Relationship:

The CommunityPost reveals an existing shared snapshot; no snapshot duplication is allowed.
Eligibility & Time Gates
Y-Day Time Gate:
The minimum-hold period (Y days, system-configurable) to share or publish applies per user and per new accepted roadmap, regardless of how the roadmap was accepted (including forks).
Privacy & Identity
Display Name & Privacy Behavior:

Privacy is determined by User.privacySetting.
If anonymous, display name and exact major are not shown; instead, “Anonymous” and the major group label are displayed.
If identified, the current display name is shown—updates to the display name are reflected immediately (or at least on page refresh).
Change Propagation:

Privacy setting changes are reflected “as soon as possible” in all relevant UIs, with no need to republish or regenerate links.

**What this feature does NOT do:**

- Does not allow viewers to edit, rate, or comment on shared roadmaps.
- Does not include admin moderation tools for published roadmaps.
- Does not specify or modify Feature 009's prerequisite validation logic — that is Feature 009's responsibility.
- Does not determine the value of Y (treated as a configurable system parameter).
- Does not define the exact major group label mapping (treated as a system configuration, not a specification concern).
---

## Clarifications

### Session 2026-03-11

- Q: Are liking and forking in scope for this feature, or are they also out of scope like commenting, rating, and editing? → A: Both liking and forking are IN scope. Commenting, rating, and editing remain out of scope.
- Q: Does User Story 1 (prerequisite validation on roadmap acceptance) belong to this feature or Feature 009? → A: It belongs to Feature 009. This feature depends on it but does not own it.
- Q: What does fork produce — a read-only reference copy, a re-personalised template via Feature 009, or a direct import through Feature 009's standard acceptance flow? → A: Fork sends filtered full-node payload through Feature 009's fork-consumable acceptance contract (with prerequisite checking). If it passes, the forked roadmap becomes the forking student's new accepted roadmap.
- Q: Can a student have multiple simultaneous active share links, or only one? → A: A student can have multiple active SharedRoadmap records, each representing a different snapshot/version of their roadmap. Each snapshot is managed independently and can have its own access mode and revocation state.
- Q: What is the default sort order of the community feed — publication date, like count, or something else? → A: Entries are ordered by relevance to the viewing student's major: entries from the same or related major group appear first.

### Session 2026-03-11 (Pre-plan)

- Q: Is community post content live (auto-updates on roadmap change) or snapshot-based (fixed at publish time)? → A: Snapshot — CommunityPosts capture the roadmap at publication time and do not auto-update when the student accepts a new roadmap.
- Q: Can a student have multiple simultaneous active CommunityPosts? → A: No — at most one active CommunityPost per student; publishing again replaces the existing post.
- Q: When forking, are courses the forking student has already completed excluded from the forked roadmap? → A: Yes — courses already completed by canonical key `(major, courseCode)` are filtered out before validation/commit; the saved roadmap contains only courses not yet completed.

### Session 2026-03-14 (Alignment pass)

- Q: Which domain owns privacy for community/share rendering? → A: Feature 005 `User.privacySetting` is authoritative; Feature 010 must not read privacy from `StudentProfile`.
- Q: In identified mode, what name should community/share UI show? → A: Prefer `User.displayName`; if missing/blank, use the standard system-wide fallback-name policy.
- Q: Which contract should fork call in Feature 009? → A: The new fork-consumable endpoint, with full roadmap nodes payload.
- Q: Must filtering happen before prerequisite validation? → A: Yes, always. Completed-course filtering executes first.
- Q: How to distinguish duplicate course codes across majors? → A: Use canonical key `(major, courseCode)` consistently.
- Q: What side effects are required after successful fork acceptance? → A: Notification, eligibility clock reset, audit log, and progress update when progress module integration exists.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Check Eligibility and Share via Snapshot Link (Priority: P1)


An eligible student (whose accepted roadmap has been held for at least Y days) opens their roadmap and chooses to generate a public read-only link. **At the moment the student clicks "share", the system captures an immutable snapshot of the roadmap and binds it to a unique Share Link URL/token.** This snapshot will never change, even if the student later accepts a new roadmap or makes further edits. The existing snapshot link always serves the original content until explicitly revoked. The student can revoke the link at any time, after which the URL returns an invalid/not-found response.

**Why this priority**: Link sharing is the simplest, most direct sharing path and requires no community infrastructure. The snapshot semantic — where the link captures a moment in time and survives roadmap changes — distinguishes this from the live CommunityPost and is essential to specify correctly.

**Independent Test**: Can be fully tested by generating a share link, visiting it unauthenticated to verify the snapshot renders, then accepting a new roadmap, visiting the link again and verifying it still serves the original snapshot, then revoking the link and confirming the URL is now invalid.

**Acceptance Scenarios**:

1. **Given** a student's accepted roadmap has been held for fewer than Y days, **When** they view the roadmap page, **Then** the "Share via link" action is unavailable (disabled or hidden) and the UI communicates how many days remain before eligibility.
2. **Given** a student's accepted roadmap has been held for exactly Y days or more, **When** they view the roadmap page, **Then** the "Share via link" action is available.
3. **Given** an eligible student activates "Share via link", **When** the action is confirmed, **Then** a unique shareable URL is generated and displayed to the student; the URL captures the roadmap's current node content as an immutable snapshot.
4. **Given** a valid share link exists, **When** an unauthenticated visitor opens the URL, **Then** a read-only snapshot of the roadmap is displayed — showing all nodes with `courseCode`, `courseName`, `skills`, and `reason` — with no edit actions available.
5. **Given** a valid share link exists, **When** an authenticated UETCompass student opens the URL, **Then** the same read-only snapshot is displayed.
6. **Given** a student has an active share link and then accepts a new roadmap, **When** a visitor opens the existing link, **Then** the link continues to serve the snapshot captured at generation time — it is NOT invalidated by the roadmap change.
7. **Given** a student has an active share link and then accepts a new roadmap, **When** the student attempts to generate a new share link, **Then** the "Share via link" action is unavailable until the new roadmap has been held for Y days — the time-gate has reset for new link generation.
8. **Given** a student revokes an existing share link, **When** the revoke action is confirmed, **Then** the previously generated URL immediately returns an invalid/not-found response for any visitor.

---

### User Story 2 – Publish Roadmap to Community Feed (Snapshot Entry/ Community Post) (Priority: P1)

An eligible student publishes their accepted roadmap to the community feed as a snapshot — a fixed capture of their roadmap at the moment of publication. Accepting a new roadmap does not automatically update the published entry; the snapshot persists until the student explicitly publishes again (replacing it) or unpublishes. Authenticated peers can discover the entry while browsing the feed. The student can unpublish at any time and controls whether their real identity or “Anonymous” is shown. 

**Why this priority**: Publishing to the community feed is the central social value proposition. The snapshot semantic ensures that what peers see is a stable, auditable version of a real student roadmap at a point in time.

**Independent Test**: Can be fully tested by publishing a roadmap as an eligible student, verifying the post appears in the feed with correct metadata, then accepting a new roadmap and verifying the CommunityPost still shows the original snapshot — confirming no automatic update occurred. Then publish again after the Y-day hold and verify the existing post is replaced.

**Acceptance Scenarios**:

1. **Given** a student's accepted roadmap has been held for fewer than Y days and they have no existing CommunityPost, **When** they view the roadmap page, **Then** the "Publish to community" action is unavailable and the UI communicates how many days remain before eligibility.
2. **Given** an eligible student activates "Publish to community", **When** the action is confirmed, **Then** their roadmap post appears in the community feed visible to all authenticated users.
3. **Given** a CommunityPost is displayed, **When** a viewer inspects its metadata, **Then** they see: owner's display name (or "Anonymous"), major identity (exact major when identified; major group label when anonymous), career goal role, number of roadmap nodes, publication date, and a preview of the first few nodes.
4. **Given** a published roadmap, **When** any authenticated user views the full roadmap detail from the community, **Then** they see all nodes with `courseCode`, `courseName`, `skills`, and `reason`.
5. **Given** a student has an active CommunityPost and then accepts a new roadmap, **When** another student views the community feed, **Then** the CommunityPost still shows the snapshot captured at the time of the original publication — it is NOT automatically updated by the roadmap change.
6. **Given** a student has an active CommunityPost and later publishes again (after accepting a new roadmap and satisfying the Y-day hold), **When** the new publication is confirmed, **Then** the existing CommunityPost is replaced with a fresh snapshot of the new roadmap.
7. **Given** a student publishes their roadmap, **When** they later activate "Unpublish", **Then** the post is removed from the community feed immediately and is no longer discoverable.
8. **Given** a student who previously unpublished wants to republish after accepting a new roadmap, **When** they attempt to publish, **Then** the Y-day hold on the current roadmap applies — they must wait until eligible.
9. **Given** a student has no share link generated but has published to the community, **When** another student visits the community detail view, **Then** the detail renders a no access — share link and community publication are dependent.

---

### User Story 3 – Control Privacy (Display Name and Major Identity) (Priority: P2)

Before or after generating a share link or publishing to the community, a student can choose to appear identified (real display name + exact major) or anonymous ("Anonymous" + major group label). Privacy mode is read from `User.privacySetting` (Feature 005). In identified mode, the UI prefers `User.displayName`; when it is missing/blank, the system-wide fallback-name policy is applied. When anonymous, the exact major is replaced with a general major group label to reduce re-identification risk in small cohorts. This choice can be changed at any time and takes effect immediately.

**Why this priority**: Privacy control is critical in a small-cohort university context where even a general description combined with a career goal could re-identify a student. The major group obfuscation is key to making anonymous mode meaningfully private. It is P2 because the feature works with a default of identified mode and this story adds user control.

**Independent Test**: Can be fully tested by publishing a roadmap in anonymous mode, verifying the entry shows "Anonymous" and a major group label (not the exact major), then switching to identified mode and verifying the real name and exact major appear — without re-publishing.

**Acceptance Scenarios**:

1. **Given** a student has not yet made a privacy choice, **When** they initiate a share or publish action, **Then** the system defaults to identified mode — showing their real display name and exact major.
2. **Given** a student switches their privacy setting to anonymous, **When** another authenticated user views the community feed, **Then** the entry shows "Anonymous" and the student's major group label — not the real name or exact major — immediately; the student does not need to re-publish.
3. **Given** a student's share link is active and they switch to anonymous, **When** an unauthenticated visitor opens the share link, **Then** the snapshot shows "Anonymous" and the major group label — not the real name or exact major.
4. **Given** a student switches from anonymous back to identified, **When** the community feed is viewed, **Then** the entry correctly shows the student's real display name and exact major — confirming the reversal works.
5. **Given** a student changes their display name in their account settings (Feature 005), **When** they look at the community feed or share link in identified mode, **Then** the roadmap entry reflects the updated display name.
6. **Given** identified mode is active and `displayName` is missing/blank, **When** the community feed or share link is rendered, **Then** the display name is populated by the standard system-wide fallback-name policy.
7. **Given** two students share the same major group label, **When** one is anonymous and one is identified, **Then** the anonymous entry shows only the group label while the identified entry shows the exact major — both remain in the feed without conflict.

---

### User Story 4 – Browse and Filter the Community Feed (Priority: P2)

An authenticated student opens the community feed to discover roadmaps shared by peers. They can filter by major group, career goal role, or personalisation level. Each feed entry shows enough metadata to decide whether to open the full detail view.

**Why this priority**: Browsability transforms the community feed from a publishing utility into a discovery tool. Filtering by major group — rather than exact major — works consistently whether entries are anonymous or identified. It is P2 because the feed is useful for discovery even without filters; filters improve the experience at scale.

**Independent Test**: Can be fully tested by publishing roadmaps from students across at least two different major groups and two career goals, then applying each filter individually and in combination, verifying only matching entries appear for both anonymous and identified entries.

**Acceptance Scenarios**:

1. **Given** there are published community roadmaps, **When** an authenticated student opens the community feed, **Then** entries are ordered by relevance to the viewing student's major: entries from the same or related major group appear first; entries from other major groups appear after.
2. **Given** the community feed is open, **When** the student filters by major group, **Then** only entries belonging to that major group are shown — this works for both anonymous entries (showing the group label) and identified entries (whose exact major belongs to that group).
3. **Given** the community feed is open, **When** the student filters by career goal role, **Then** only entries whose career goal role matches the selected role are shown.
4. **Given** the community feed is open, **When** the student filters by personalisation level (full or low), **Then** only entries with the matching personalisation level are shown.
5. **Given** multiple filters are applied simultaneously, **When** the feed renders, **Then** only entries matching all active filters are shown.
6. **Given** no published roadmaps match the active filters, **When** the feed renders, **Then** an empty state is shown (not an error), with a prompt to clear or adjust filters.
7. **Given** an unauthenticated visitor attempts to access the community feed URL, **When** the page loads, **Then** they are redirected to the login page — the community feed requires authentication.

---

### User Story 5 – View Full Community Roadmap Detail (Priority: P2)

An authenticated student browsing the community feed clicks an entry to open the full read-only detail view of that roadmap. Because community entries are snapshots, they see the roadmap content as it was at the time of publication — all nodes with skills and reasoning, but no personal career context fields.

**Why this priority**: The detail view completes the loop from discovery (feed) to depth (full roadmap). Without it the feed is a summary list with no actionable content. It is P2 because it depends on the feed existing (Story 4).

**Independent Test**: Can be fully tested by clicking a feed entry and verifying all nodes appear with `courseCode`, `courseName`, `skills`, and `reason`.

**Acceptance Scenarios**:

1. **Given** a community entry is shown in the feed, **When** the student clicks it, **Then** the full roadmap detail opens in a read-only view.
2. **Given** the full detail view is open, **When** the student inspects each node, **Then** they see `courseCode`, `courseName`, `skills`, and `reason` for every node.
4. **Given** the student is viewing a community detail and the owner unpublishes the roadmap while they are reading it, **When** the student navigates away and attempts to return to the same URL, **Then** the page shows a not-found or unavailable state, not the old content.
---

### User Story 6 – Like a Community Post (Priority: P3)

An authenticated student browsing the community feed or viewing a roadmap detail can "like" the entry as a simple signal of interest. The like count is visible on the feed card and on the detail view. The student can remove their like at any time. The like count persists even if the entry owner updates their roadmap.

**Why this priority**: Liking adds lightweight social signal to the feed without requiring complex interactions. It is P3 because the feed and detail view deliver full value without it — likes are additive.

**Independent Test**: Can be fully tested by liking a community entry as one authenticated student, verifying the like count increments on both the feed card and the detail view, then un-liking and verifying the count decrements.

**Acceptance Scenarios**:

1. **Given** an authenticated student views a community feed card or detail view, **When** they inspect the entry, **Then** a like count and a like action (button/icon) are visible.
2. **Given** an authenticated student activates the like action on an entry they have not yet liked, **When** the action is confirmed, **Then** the like count for that entry increments by 1 and the like action is shown as active (indicating the student has liked it).
3. **Given** an authenticated student has already liked an entry, **When** they activate the like action again (un-like), **Then** the like count decrements by 1 and the like action returns to its inactive state.
4. **Given** an entry has been liked by multiple students, **When** any authenticated student views the entry, **Then** the displayed like count reflects the total number of distinct likes across all students.
5. **Given** a community entry owner accepts a new roadmap (live update), **When** the entry updates to reflect the new roadmap content, **Then** the existing like count is preserved — likes are not reset by roadmap updates.
6. **Given** an unauthenticated visitor opens a share link snapshot, **When** they view the snapshot, **Then** no like action is shown — liking is only available to authenticated users on community entries, not on share link snapshots.

---

### User Story 7 – Fork a Community Roadmap (Priority: P3)

An authenticated student viewing a community roadmap detail activates “Fork this roadmap”. The system reads the snapshot's full roadmap nodes, filters out courses already completed by the forking student using canonical identity `(major, courseCode)`, then sends the filtered full-node payload to Feature 009's fork-consumable acceptance endpoint (which performs prerequisite validation). If validation passes, the filtered roadmap becomes the student's new accepted roadmap (replacing whatever they had before). If validation fails, the fork is blocked and the student sees which courses violate their prerequisite constraints. Successful fork acceptance triggers post-acceptance side effects: notification, eligibility clock reset, audit log, and progress update when integration is enabled.

**Why this priority**: Forking enables active reuse of peer roadmaps, closing the loop from passive discovery to personal adoption. It is P3 because the community feature delivers full discovery and sharing value independently; fork adds an optional adoption path.

**Independent Test**: Can be fully tested by forking a community roadmap from a student whose course sequence is compatible with the forking student's prerequisite constraints, verifying the forked roadmap becomes the forking student's new accepted roadmap, and then attempting a fork of a roadmap that violates prerequisites and verifying it is blocked with an error.

**Acceptance Scenarios**:

1. **Given** an authenticated student is viewing a community roadmap detail view, **When** they inspect the page, **Then** a "Fork this roadmap" action is visible. (A student MUST NOT be able to fork their own community entry.)
2. **Given** a student activates "Fork this roadmap", **When** the action is submitted, **Then** the system filters completed courses first using canonical key `(major, courseCode)` and only then sends the filtered full-node payload to Feature 009's fork-consumable acceptance endpoint for prerequisite validation.
3. **Given** the filtered fork payload passes Feature 009's prerequisite validation, **When** acceptance succeeds, **Then** the remaining nodes are saved as the student's new accepted roadmap, replacing any previously accepted roadmap.
4. **Given** a fork acceptance succeeds, **When** the student returns to their roadmap view, **Then** they see the forked roadmap (minus their already-completed courses) as their current accepted roadmap, with all standard post-acceptance behaviour applying (notification, Y-day clock reset; any existing snapshot share links survive; any existing community entry remains unchanged as its original snapshot; audit log written; and progress state updated if available).
5. **Given** the fork's course sequence fails Feature 009's prerequisite validation, **When** the error is returned, **Then** the fork is blocked; the student sees a clear error message identifying the violating courses (as per Feature 009's validation behaviour). The student's existing accepted roadmap, share links, and community entry are unaffected.
6. **Given** an unauthenticated visitor opens a share link snapshot, **When** they view the snapshot, **Then** no "Fork this roadmap" action is shown — forking is only available to authenticated users on community entries.

---

### Edge Cases

- **Roadmap replaced while snapshot link is active**: The snapshot link is NOT invalidated — it continues to serve the content captured at generation time. The student cannot generate a new share link until the new roadmap has been held for Y days.
- **Roadmap replaced while community entry is published**: The community entry is NOT automatically updated — it continues to show the snapshot captured at the time of the original publication. The student must explicitly publish again (subject to the Y-day hold on the new roadmap) to update their community presence.
- **Ineligible for new sharing but existing snapshots persist**: After the Y-day clock resets, the student cannot generate a new share link or publish a new community entry, but their existing snapshot share links and any active community entry remain valid until explicitly revoked or unpublished.
- **Y-day threshold at exact boundary**: A student whose roadmap acceptance timestamp is exactly Y days old at the moment they view the page sees sharing actions as available (inclusive boundary).
- **Anonymous student in a small cohort**: The major group label (not the exact major) is displayed, reducing re-identification risk even when few students share the same major.
- **Student revokes share link while a visitor is viewing it**: The URL becomes invalid immediately; the viewer receives a not-found response if they refresh or navigate.
- **Student unpublishes community entry**: The entry is removed from the feed immediately; any direct link to the community detail view returns a not-found response.
- **Fork attempt fails prerequisite validation**: A student forks a community roadmap whose filtered course sequence violates their prerequisite constraints. Feature 009 blocks the acceptance and returns a clear error identifying the violating courses. The forking student's existing accepted roadmap, share links, and community entry are unaffected.
- **Identified mode with missing displayName**: If `User.displayName` is blank/null, the system fallback-name policy is applied consistently in feed, detail, and share-link responses.
- **Student deletes their account**: All share links and published community entries associated with that student are immediately invalidated and removed.
- **No roadmaps published yet**: A student opens the community feed when it is empty → an empty state is shown, not an error page.
- **Privacy toggle mid-session**: A student changes their privacy setting while a peer has the community feed open in another tab → the peer sees the updated identity on next page refresh.

---

## Requirements *(mandatory)*

### Functional Requirements

**Time-Gate Eligibility**

- **FR-001**: The system MUST enforce a minimum hold period of Y days between the acceptance timestamp of a student's current accepted roadmap and: (a) the generation of a new share link, or (b) the initial publication of a community entry (or re-publication after an explicit unpublish).
- **FR-002**: When a sharing action is unavailable due to the time gate, the system MUST display how many days remain before the action becomes available.
- **FR-003**: Y (minimum hold duration in days) MUST be a configurable system parameter that does not require a code deployment to change.

**Share via Link (Snapshot)**

- **FR-004**: Once eligible, a student MUST be able to generate a unique public read-only share link. The link MUST capture the roadmap's current node content as an immutable snapshot at the moment of generation. At most one active share link MAY exist per accepted roadmap; a student MUST revoke any existing link before generating a new one for the same roadmap.
- **FR-005**: The share link MUST be accessible without authentication.
- **FR-006**: The share link view MUST display all roadmap nodes with `courseCode`, `courseName`, `skills`, and `reason`.
- **FR-007**: When a student accepts a new roadmap, existing snapshot share links MUST NOT be invalidated — they MUST continue to serve the snapshot content captured at generation time.
- **FR-008**: When a student accepts a new roadmap, the Y-day eligibility clock MUST reset for new share link generation.
- **FR-009**: A student MUST be able to revoke their active share link at any time, after which the URL MUST immediately return an invalid/not-found response. Once revoked, the student may generate a new link (subject to the Y-day eligibility check on any newly accepted roadmap).

**Publish to Community Feed (Live)**

- **FR-010**: Once eligible, a student MUST be able to publish their current accepted roadmap to the community feed as a snapshot entry. Publishing captures the roadmap's node content at the moment of publication as an immutable snapshot.
- **FR-011**: A community entry is snapshot-based — it MUST NOT be automatically updated when the student accepts a new roadmap. The published content remains fixed until the student explicitly publishes again or unpublishes.
- **FR-012**: A new publication by a student MUST replace their existing community entry (if one exists). At most one active community entry per student is permitted at any time.
- **FR-013**: A student MUST be able to unpublish their community entry at any time; the entry MUST be removed from the feed immediately.
- **FR-014**: Publishing (whether initial, after an unpublish, or replacing an existing entry) is subject to the Y-day hold on the student's current accepted roadmap.
- **FR-015**: The community feed MUST be accessible only to authenticated UETCompass users.

**Community Feed Browsing**

- **FR-016**: Each entry in the community feed MUST display: owner's display name (or "Anonymous"), major identity (exact major when identified; major group label when anonymous), career goal role, number of roadmap nodes, publication date, and a preview of the first few roadmap nodes.
- **FR-017**: The community feed MUST support filtering by: major group, career goal role, and personalisation level (full / low). Filtering by major group MUST work for both anonymous entries (showing the group label) and identified entries (whose exact major belongs to that group). The default feed ordering MUST rank entries from the viewing student's own major group first, followed by entries from other major groups.

**Community Detail View**

- **FR-018**: The community detail view MUST display all roadmap nodes with `courseCode`, `courseName`, `skills`, and `reason`.

**Privacy Controls**

- **FR-019**: A student MUST be able to set their sharing identity to either identified (real display name + exact major) or anonymous ("Anonymous" + major group label). The default is identified. Privacy source of truth is `User.privacySetting` (Feature 005).
- **FR-020**: A privacy setting change MUST apply immediately to all active share links and published community entries without requiring re-generation or re-publication.
- **FR-021A**: In identified mode, rendering MUST prefer `User.displayName`; if missing/blank, rendering MUST apply the standard system-wide fallback-name policy.
- **FR-021**: The major group label used for anonymous entries MUST be determined by a system-level configuration mapping that does not require a code deployment to change.

**Like**

- **FR-022**: An authenticated user MUST be able to like a community entry. The like MUST be recorded per user per entry — a user cannot like the same entry more than once.
- **FR-022**: An authenticated user MUST be able to like a community entry. The like MUST be recorded per user per entry — a user cannot like the same entry more than once. For MVP, race conditions or inaccurate counts may occur and are accepted.
- **FR-023**: An authenticated user MUST be able to remove a like from a community entry they have previously liked.
- **FR-024**: The like count for a community entry MUST be visible on both the feed card and the detail view.
- **FR-025**: The like count MUST NOT reset when the entry owner accepts a new roadmap and the community entry auto-updates.
- **FR-026**: The like action MUST NOT be available to unauthenticated visitors or on share link snapshot views.

**Fork**

- **FR-027**: An authenticated user MUST be able to fork a community roadmap entry. A student MUST NOT be able to fork their own community entry.
- **FR-028**: A fork action MUST filter completed courses first using canonical identity `(major, courseCode)`, then submit the filtered full-node payload to Feature 009's fork-consumable acceptance endpoint, which performs prerequisite validation.
- **FR-029**: If Feature 009's acceptance flow succeeds, the filtered sequence MUST become the forking student's new accepted roadmap, with all consequences of a new acceptance applying.
- **FR-030**: If Feature 009's acceptance flow fails prerequisite validation, the fork MUST be blocked. Feature 009's error message identifying the violating courses MUST be surfaced to the forking student. The forking student's existing accepted roadmap, share links, and community entry MUST remain unchanged.
- **FR-031**: The fork action MUST NOT be available to unauthenticated visitors or on share link snapshot views.
- **FR-032**: After successful fork acceptance, the system MUST execute post-success side effects: user notification, eligibility-clock reset, audit log write, and progress-tracking update when Feature 007 integration is enabled.

### Key Entities

- **SharedRoadmap**: A unified entity for both sharing via link and publishing to the community feed. When a student clicks "share", the system creates an immutable snapshot of the roadmap nodes at that exact moment (`courseCode`, `courseName`, `skills`, `reason`) and binds it to a unique Share Link URL/token. This snapshot is never updated or changed, even if the student later modifies or replaces their roadmap. Privacy rendering for link responses is derived at read-time from `User.privacySetting` (Feature 005). At most one active SharedRoadmap exists per accepted roadmap snapshot. Not invalidated by subsequent roadmap changes; persists until explicitly revoked.
	- `accessMode` controls who can view the link:
		- `private`: Only the owner can view the link.
		- `link-only`: Only those with the link can view (not discoverable/searchable/on community).
		- `users-only`: Only specific users (by userId) can view, either by search on community or link.
		- `public`: Anyone can view (searchable on community and by link).
- **RoadmapSnapshot**: An immutable point-in-time export of a student's roadmap nodes captured when a ShareLink is generated. Contains only the fields exposed publicly (`courseCode`, `courseName`, `skills`, `reason`). Distinct from a CommunityEntry, which is live rather than snapshot-based.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student who meets the Y-day eligibility threshold can generate a share link or publish to the community in under 60 seconds with no more than 3 user interactions.
- **SC-002**: A share link revocation takes effect within 5 seconds — a visitor who held the link and refreshes after revocation sees the invalid/not-found response without any caching grace period visible to them.
- **SC-003**: An unpublish action removes the community entry within 5 seconds — the entry is no longer visible to any peer browsing the feed within that window.
- **SC-004**: The community feed, with up to 500 published entries, displays filtered results within 2 seconds of the filter being applied.
- **SC-005**: A privacy setting change (identified ↔ anonymous) is reflected in the community feed and any active share link views within one page refresh — no manual re-publish or re-generation required.
- **SC-007**: Zero instances of an anonymous student's exact major being exposed in any share link or community feed view when anonymous mode is active (verified by audit).

---

## Assumptions

- **Y default value**: The specification does not prescribe Y. The planning phase will identify a suitable default (assumed to be 7 days) until the configuration value is set by the product owner.
- **Snapshot timing for share links**: The roadmap node snapshot for a share link is taken at the moment the student generates the link — not at acceptance time. Subsequent changes to the accepted roadmap data do not update existing snapshots.
- **Community entries are snapshots**: Community entries capture the roadmap content at publication time, stored as a RoadmapSnapshot. Content does not change after publication; there is no live derivation from the current roadmap.
- **Single accepted roadmap per student**: Each student has at most one accepted roadmap at a time. All sharing and eligibility rules apply to that single active roadmap.
- **Feature 009 defines roadmap structure**: The node fields (`courseCode`, `courseName`, `skills`, `reason`, `supportingSkills`, `careerRelevanceNote`) are defined and owned by Feature 009. This feature treats them as read-only inputs.
- **Display name source**: The student's display name is stored in Feature 005 (Account Management), populated during Feature 001 (Profile Onboarding). Updates are reflected in identified community entries and share link views.
- **Major group mapping**: The mapping of exact majors to major group labels (e.g., "Computer Science" → "CS-related") is a system configuration. This feature does not define the mapping contents.
- **Feed ordering default**: The community feed defaults to major-relevance order — entries from the viewing student's own major group appear first, followed by entries from other major groups. Within each group, secondary ordering is by publication date (most recent first). No user-controlled sort switching is required for this iteration.
- **Personalisation level definition**: "Full" and "low" personalisation levels are properties attached to the generated roadmap by Feature 009. This feature reads them as-is for filtering and display.
- **One community entry per student**: Each student can have at most one active community entry at any time (reflecting their current accepted roadmap).

---


## Feed Ordering
## Feed Ordering

- **Ordering**:
	- Feed entries are ordered by relevance to the viewer’s major group.
	- Within a major group, entries are ordered by the number of likes (most liked first). If there is a tie, the most recent post appears first.

## Dependencies

- **Feature 009** (AI-Powered Personalised Roadmap Generator): Provides the accepted roadmap structure including all node fields and personalisation level. The roadmap's `accepted_at` timestamp is the start of the eligibility clock. Fork actions in this feature invoke Feature 009's fork-consumable acceptance contract (including its prerequisite validation); Feature 009 owns that logic.
- **Feature 002** (Seed CTDT DAG): Provides the authoritative CourseUnit prerequisite graph consumed by Feature 009's acceptance flow — relevant transitively via fork.
- **Feature 005** (Account Management): Provides `User.displayName`, `User.privacySetting`, and exact major used in community/share rendering.
- **Feature 001** (Profile Onboarding): Provides `careerGoal.role` and canonical completed-course records used in feed metadata and fork pre-filtering.
- **Feature 004** (Skill Tree): Owns the primary rendering of a student's own roadmap. The community feature provides a separate, independent read-only rendering context and does not reuse Skill Tree's interactive components.
