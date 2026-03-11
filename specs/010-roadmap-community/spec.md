# Feature Specification: Roadmap Community

**Feature Branch**: `010-roadmap-community`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Build the Roadmap Community feature for UETCompass — a system that allows students to share their personalised learning roadmaps with others, either via a public shareable link or by publishing to a discoverable community feed."

---

## Context & Scope

Roadmap Community enables students to share their accepted personalised roadmaps — either as persistent read-only snapshot links or as live discoverable community entries — so that peers with similar career goals can benefit from real examples.

Two distinct sharing mechanisms exist with different persistence semantics:

- **Share via link (snapshot)**: The link captures the roadmap at the moment it is generated. If the student later accepts a new roadmap, the link continues to serve the original snapshot. The link persists until the student explicitly revokes it; it is never automatically invalidated.
- **Publish to community feed (live)**: The community entry always reflects the student's current accepted roadmap. When the student accepts a new roadmap, the community entry automatically updates — no republication is needed.

Both sharing actions are time-gated: a student must have held their current accepted roadmap for a minimum configurable period of **Y days** before generating a new share link or making an initial publication to the community. The time-gate resets when a new roadmap is accepted, but it only governs new share link generation and new community publications — automatic community entry updates on roadmap replacement are not subject to the time-gate.

Authenticated UETCompass users can also **like** a community entry (a simple interest signal displayed as a count) and **fork** a published roadmap — sending its course sequence through Feature 009's standard acceptance flow (including prerequisite validation), which, if it passes, saves the forked roadmap as the forking student's new accepted roadmap. Both actions require authentication and apply only to community feed entries, not to share link snapshots.

This feature depends on Feature 009's prerequisite compatibility validation being in place at the acceptance endpoint. That validation is specified and owned by Feature 009; this feature consumes it (fork triggers it) but does not define it.

**What this feature does NOT do:**

- Does not allow viewers to edit, rate, or comment on shared roadmaps.
- Does not include admin moderation tools for published roadmaps.
- Does not specify or modify Feature 009's prerequisite validation logic — that is Feature 009's responsibility.
- Does not determine the value of Y (treated as a configurable system parameter).
- Does not define the exact major group label mapping (treated as a system configuration, not a specification concern).
- Does not expose `supportingSkills` or `careerRelevanceNote` fields in any community or shared view (these contain personal career context).

---

## Clarifications

### Session 2026-03-11

- Q: Are liking and forking in scope for this feature, or are they also out of scope like commenting, rating, and editing? → A: Both liking and forking are IN scope. Commenting, rating, and editing remain out of scope.
- Q: Does User Story 1 (prerequisite validation on roadmap acceptance) belong to this feature or Feature 009? → A: It belongs to Feature 009. This feature depends on it but does not own it.
- Q: What does fork produce — a read-only reference copy, a re-personalised template via Feature 009, or a direct import through Feature 009's standard acceptance flow? → A: Fork sends the community roadmap's course sequence through Feature 009's acceptance flow (with prerequisite checking). If it passes, the forked roadmap becomes the forking student's new accepted roadmap.
- Q: Can a student have multiple simultaneous active share links, or only one? → A: Each accepted roadmap can have at most one active share link. A student cannot generate a second link while one already exists for their current roadmap.
- Q: What is the default sort order of the community feed — publication date, like count, or something else? → A: Entries are ordered by relevance to the viewing student's major: entries from the same or related major group appear first.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Check Eligibility and Share via Snapshot Link (Priority: P1)

An eligible student (whose accepted roadmap has been held for at least Y days) opens their roadmap and chooses to generate a public read-only link. The link is a snapshot — it captures the roadmap at the moment it is generated. If the student later accepts a new roadmap, the existing snapshot link continues to serve the original content; it is not invalidated. The student can revoke the link at any time, after which the URL returns an invalid/not-found response.

**Why this priority**: Link sharing is the simplest, most direct sharing path and requires no community infrastructure. The snapshot semantic — where the link captures a moment in time and survives roadmap changes — distinguishes this from the live community entry and is essential to specify correctly.

**Independent Test**: Can be fully tested by generating a share link, visiting it unauthenticated to verify the snapshot renders, then accepting a new roadmap, visiting the link again and verifying it still serves the original snapshot, then revoking the link and confirming the URL is now invalid.

**Acceptance Scenarios**:

1. **Given** a student's accepted roadmap has been held for fewer than Y days, **When** they view the roadmap page, **Then** the "Share via link" action is unavailable (disabled or hidden) and the UI communicates how many days remain before eligibility.
2. **Given** a student's accepted roadmap has been held for exactly Y days or more, **When** they view the roadmap page, **Then** the "Share via link" action is available.
3. **Given** an eligible student activates "Share via link", **When** the action is confirmed, **Then** a unique shareable URL is generated and displayed to the student; the URL captures the roadmap's current node content as an immutable snapshot.
4. **Given** a valid share link exists, **When** an unauthenticated visitor opens the URL, **Then** a read-only snapshot of the roadmap is displayed — showing all nodes with `courseCode`, `courseName`, `gainedSkills`, and `reason` — with no edit actions available.
5. **Given** a valid share link exists, **When** an authenticated UETCompass student opens the URL, **Then** the same read-only snapshot is displayed.
6. **Given** a student has an active share link and then accepts a new roadmap, **When** a visitor opens the existing link, **Then** the link continues to serve the snapshot captured at generation time — it is NOT invalidated by the roadmap change.
7. **Given** a student has an active share link and then accepts a new roadmap, **When** the student attempts to generate a new share link, **Then** the "Share via link" action is unavailable until the new roadmap has been held for Y days — the time-gate has reset for new link generation.
8. **Given** a student revokes an existing share link, **When** the revoke action is confirmed, **Then** the previously generated URL immediately returns an invalid/not-found response for any visitor.

---

### User Story 2 – Publish Roadmap to Community Feed (Live Entry) (Priority: P1)

An eligible student publishes their accepted roadmap to the community feed. The community entry is live — it always reflects the student's current accepted roadmap. If the student later accepts a new roadmap, the community entry automatically updates without the student needing to republish. Authenticated peers can discover it while browsing the feed. The student can unpublish at any time and controls whether their real identity or "Anonymous" is shown.

**Why this priority**: Publishing to the community feed is the central social value proposition. The live semantic — where the community entry tracks the student's current roadmap automatically — keeps the feed accurate without manual maintenance overhead.

**Independent Test**: Can be fully tested by publishing a roadmap as an eligible student, verifying the entry appears in the feed with correct metadata, then accepting a new roadmap and verifying the community entry updates automatically to the new content — without the student taking any re-publication action.

**Acceptance Scenarios**:

1. **Given** a student's accepted roadmap has been held for fewer than Y days and they have no existing community entry, **When** they view the roadmap page, **Then** the "Publish to community" action is unavailable and the UI communicates how many days remain before eligibility.
2. **Given** an eligible student activates "Publish to community", **When** the action is confirmed, **Then** their roadmap entry appears in the community feed visible to all authenticated users.
3. **Given** a community entry is displayed, **When** a viewer inspects its metadata, **Then** they see: owner's display name (or "Anonymous"), major identity (exact major when identified; major group label when anonymous), career goal role, number of roadmap nodes, publication date, and a preview of the first few nodes.
4. **Given** a published roadmap, **When** any authenticated user views the full roadmap detail from the community, **Then** they see all nodes with `courseCode`, `courseName`, `gainedSkills`, and `reason` — but `supportingSkills` and `careerRelevanceNote` are NOT shown.
5. **Given** a student has an active community entry and then accepts a new roadmap, **When** another student views the community feed, **Then** the community entry automatically reflects the new roadmap content — the student did not need to take any republication action.
6. **Given** a student has an active community entry and accepts a new roadmap, **When** the student checks whether they need to republish, **Then** no action is required — the time-gate does NOT prevent this automatic update; it only applies to students who have no current community entry and wish to publish for the first time (or after an explicit unpublish).
7. **Given** a student publishes their roadmap, **When** they later activate "Unpublish", **Then** the entry is removed from the community feed immediately and is no longer discoverable.
8. **Given** a student who previously unpublished wants to republish after accepting a new roadmap, **When** they attempt to publish, **Then** the Y-day hold on the current roadmap applies — they must wait until eligible.
9. **Given** a student has no share link generated but has published to the community, **When** another student visits the community detail view, **Then** the detail renders without error — share link and community publication are independent.

---

### User Story 3 – Control Privacy (Display Name and Major Identity) (Priority: P2)

Before or after generating a share link or publishing to the community, a student can choose to appear identified (real display name + exact major) or anonymous ("Anonymous" + major group label). When anonymous, the exact major is replaced with a general major group label to reduce re-identification risk in small cohorts. This choice can be changed at any time and takes effect immediately.

**Why this priority**: Privacy control is critical in a small-cohort university context where even a general description combined with a career goal could re-identify a student. The major group obfuscation is key to making anonymous mode meaningfully private. It is P2 because the feature works with a default of identified mode and this story adds user control.

**Independent Test**: Can be fully tested by publishing a roadmap in anonymous mode, verifying the entry shows "Anonymous" and a major group label (not the exact major), then switching to identified mode and verifying the real name and exact major appear — without re-publishing.

**Acceptance Scenarios**:

1. **Given** a student has not yet made a privacy choice, **When** they initiate a share or publish action, **Then** the system defaults to identified mode — showing their real display name and exact major.
2. **Given** a student switches their privacy setting to anonymous, **When** another authenticated user views the community feed, **Then** the entry shows "Anonymous" and the student's major group label — not the real name or exact major — immediately; the student does not need to re-publish.
3. **Given** a student's share link is active and they switch to anonymous, **When** an unauthenticated visitor opens the share link, **Then** the snapshot shows "Anonymous" and the major group label — not the real name or exact major.
4. **Given** a student switches from anonymous back to identified, **When** the community feed is viewed, **Then** the entry correctly shows the student's real display name and exact major — confirming the reversal works.
5. **Given** a student changes their display name in their account settings (Feature 005), **When** they look at the community feed or share link in identified mode, **Then** the roadmap entry reflects the updated display name.
6. **Given** two students share the same major group label, **When** one is anonymous and one is identified, **Then** the anonymous entry shows only the group label while the identified entry shows the exact major — both remain in the feed without conflict.

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

An authenticated student browsing the community feed clicks an entry to open the full read-only detail view of that roadmap. Because community entries are live, they see the current roadmap content for that student — all nodes with skills and reasoning, but no personal career context fields.

**Why this priority**: The detail view completes the loop from discovery (feed) to depth (full roadmap). Without it the feed is a summary list with no actionable content. It is P2 because it depends on the feed existing (Story 4).

**Independent Test**: Can be fully tested by clicking a feed entry and verifying all nodes appear with `courseCode`, `courseName`, `gainedSkills`, and `reason`, while `supportingSkills` and `careerRelevanceNote` are absent from every node.

**Acceptance Scenarios**:

1. **Given** a community entry is shown in the feed, **When** the student clicks it, **Then** the full roadmap detail opens in a read-only view.
2. **Given** the full detail view is open, **When** the student inspects each node, **Then** they see `courseCode`, `courseName`, `gainedSkills`, and `reason` for every node.
3. **Given** the full detail view is open, **When** the student searches the page for sensitive fields, **Then** `supportingSkills` and `careerRelevanceNote` do not appear anywhere.
4. **Given** the student is viewing a community detail and the owner unpublishes the roadmap while they are reading it, **When** the student navigates away and attempts to return to the same URL, **Then** the page shows a not-found or unavailable state, not the old content.
5. **Given** the student opens a share link snapshot (unauthenticated path), **When** the detail renders, **Then** the same field visibility rules apply — `supportingSkills` and `careerRelevanceNote` are not shown — and the snapshot content (not necessarily the current roadmap) is displayed.

---

### User Story 6 – Like a Community Entry (Priority: P3)

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

An authenticated student viewing a community roadmap detail activates "Fork this roadmap". The system sends the community roadmap's course sequence through Feature 009's standard acceptance flow — the same flow that runs when a student accepts any roadmap, including prerequisite validation. If the validation passes, the forked roadmap becomes the student's new accepted roadmap (replacing whatever they had before). If validation fails, the fork is blocked and the student sees which courses violate their prerequisite constraints. Forking resets the student's Y-day eligibility clock, exactly as accepting any new roadmap does.

**Why this priority**: Forking enables active reuse of peer roadmaps, closing the loop from passive discovery to personal adoption. It is P3 because the community feature delivers full discovery and sharing value independently; fork adds an optional adoption path.

**Independent Test**: Can be fully tested by forking a community roadmap from a student whose course sequence is compatible with the forking student's prerequisite constraints, verifying the forked roadmap becomes the forking student's new accepted roadmap, and then attempting a fork of a roadmap that violates prerequisites and verifying it is blocked with an error.

**Acceptance Scenarios**:

1. **Given** an authenticated student is viewing a community roadmap detail view, **When** they inspect the page, **Then** a "Fork this roadmap" action is visible. (A student MUST NOT be able to fork their own community entry.)
2. **Given** a student activates "Fork this roadmap", **When** the action is submitted, **Then** the community roadmap's course sequence is submitted to Feature 009's acceptance flow for prerequisite validation.
3. **Given** the fork's course sequence passes Feature 009's prerequisite validation, **When** acceptance succeeds, **Then** the forked roadmap is saved as the student's new accepted roadmap, replacing any previously accepted roadmap.
4. **Given** a fork acceptance succeeds, **When** the student returns to their roadmap view, **Then** they see the forked roadmap as their current accepted roadmap, with all standard post-acceptance behaviour applying (Y-day clock resets; any existing snapshot share links survive; any existing community entry auto-updates to the new content).
5. **Given** the fork's course sequence fails Feature 009's prerequisite validation, **When** the error is returned, **Then** the fork is blocked; the student sees a clear error message identifying the violating courses (as per Feature 009's validation behaviour). The student's existing accepted roadmap, share links, and community entry are unaffected.
6. **Given** an unauthenticated visitor opens a share link snapshot, **When** they view the snapshot, **Then** no "Fork this roadmap" action is shown — forking is only available to authenticated users on community entries.

---

### Edge Cases

- **Roadmap replaced while snapshot link is active**: The snapshot link is NOT invalidated — it continues to serve the content captured at generation time. The student cannot generate a new share link until the new roadmap has been held for Y days.
- **Roadmap replaced while community entry is published**: The community entry automatically updates to reflect the new roadmap content — it is NOT removed. The Y-day time-gate does not apply to this automatic update.
- **Ineligible for new sharing but snapshot link persists**: After the Y-day clock resets, the student cannot generate a new share link, but their existing snapshot links remain valid indefinitely until explicitly revoked.
- **Y-day threshold at exact boundary**: A student whose roadmap acceptance timestamp is exactly Y days old at the moment they view the page sees sharing actions as available (inclusive boundary).
- **Anonymous student in a small cohort**: The major group label (not the exact major) is displayed, reducing re-identification risk even when few students share the same major.
- **Student revokes share link while a visitor is viewing it**: The URL becomes invalid immediately; the viewer receives a not-found response if they refresh or navigate.
- **Student unpublishes community entry**: The entry is removed from the feed immediately; any direct link to the community detail view returns a not-found response.
- **Fork attempt fails prerequisite validation**: A student forks a community roadmap whose course sequence violates their prerequisite constraints. Feature 009 blocks the acceptance and returns a clear error identifying the violating courses. The forking student's existing accepted roadmap, share links, and community entry are unaffected.
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
- **FR-006**: The share link view MUST display all roadmap nodes with `courseCode`, `courseName`, `gainedSkills`, and `reason`, and MUST NOT display `supportingSkills` or `careerRelevanceNote`.
- **FR-007**: When a student accepts a new roadmap, existing snapshot share links MUST NOT be invalidated — they MUST continue to serve the snapshot content captured at generation time.
- **FR-008**: When a student accepts a new roadmap, the Y-day eligibility clock MUST reset for new share link generation.
- **FR-009**: A student MUST be able to revoke their active share link at any time, after which the URL MUST immediately return an invalid/not-found response. Once revoked, the student may generate a new link (subject to the Y-day eligibility check on any newly accepted roadmap).

**Publish to Community Feed (Live)**

- **FR-010**: Once eligible, a student MUST be able to publish their current accepted roadmap to the community feed as a live entry.
- **FR-011**: A live community entry MUST always reflect the student's current accepted roadmap. When the student accepts a new roadmap, the community entry MUST automatically update to the new roadmap content without requiring student action.
- **FR-012**: The automatic community entry update triggered by a new roadmap acceptance MUST NOT be subject to the Y-day time gate.
- **FR-013**: A student MUST be able to unpublish their community entry at any time; the entry MUST be removed from the feed immediately.
- **FR-014**: After an explicit unpublish, re-publication is subject to the Y-day hold on the current accepted roadmap.
- **FR-015**: The community feed MUST be accessible only to authenticated UETCompass users.

**Community Feed Browsing**

- **FR-016**: Each entry in the community feed MUST display: owner's display name (or "Anonymous"), major identity (exact major when identified; major group label when anonymous), career goal role, number of roadmap nodes, publication date, and a preview of the first few roadmap nodes.
- **FR-017**: The community feed MUST support filtering by: major group, career goal role, and personalisation level (full / low). Filtering by major group MUST work for both anonymous entries (showing the group label) and identified entries (whose exact major belongs to that group). The default feed ordering MUST rank entries from the viewing student's own major group first, followed by entries from other major groups.

**Community Detail View**

- **FR-018**: The community detail view MUST display all roadmap nodes with `courseCode`, `courseName`, `gainedSkills`, and `reason`, and MUST NOT display `supportingSkills` or `careerRelevanceNote`.

**Privacy Controls**

- **FR-019**: A student MUST be able to set their sharing identity to either identified (real display name + exact major) or anonymous ("Anonymous" + major group label). The default is identified.
- **FR-020**: A privacy setting change MUST apply immediately to all active share links and published community entries without requiring re-generation or re-publication.
- **FR-021**: The major group label used for anonymous entries MUST be determined by a system-level configuration mapping that does not require a code deployment to change.

**Like**

- **FR-022**: An authenticated user MUST be able to like a community entry. The like MUST be recorded per user per entry — a user cannot like the same entry more than once.
- **FR-023**: An authenticated user MUST be able to remove a like from a community entry they have previously liked.
- **FR-024**: The like count for a community entry MUST be visible on both the feed card and the detail view.
- **FR-025**: The like count MUST NOT reset when the entry owner accepts a new roadmap and the community entry auto-updates.
- **FR-026**: The like action MUST NOT be available to unauthenticated visitors or on share link snapshot views.

**Fork**

- **FR-027**: An authenticated user MUST be able to fork a community roadmap entry. A student MUST NOT be able to fork their own community entry.
- **FR-028**: A fork action MUST submit the community roadmap's course sequence to Feature 009's standard acceptance flow, including prerequisite validation.
- **FR-029**: If Feature 009's acceptance flow succeeds, the forked roadmap MUST become the forking student's new accepted roadmap, with all consequences of a new acceptance applying (Y-day clock resets; existing snapshot share links survive; existing community entry auto-updates).
- **FR-030**: If Feature 009's acceptance flow fails prerequisite validation, the fork MUST be blocked. Feature 009's error message identifying the violating courses MUST be surfaced to the forking student. The forking student's existing accepted roadmap, share links, and community entry MUST remain unchanged.
- **FR-031**: The fork action MUST NOT be available to unauthenticated visitors or on share link snapshot views.

### Key Entities

- **ShareLink**: A snapshot-based share token generated by an eligible student. Contains an immutable copy of the roadmap nodes at generation time (`courseCode`, `courseName`, `gainedSkills`, `reason` only), a unique token, a generation timestamp, and a reference to the owning student's privacy setting. At most one active ShareLink exists per accepted roadmap snapshot. Not invalidated by subsequent roadmap changes; persists until explicitly revoked.
- **CommunityEntry**: A live, discoverable record in the community feed. Always mirrors the student's current accepted roadmap content. Tracks major group, career goal role, personalisation level, node count, preview nodes, and the original publication date. Automatically reflects the latest accepted roadmap when the student accepts a new one.
- **RoadmapSnapshot**: An immutable point-in-time export of a student's roadmap nodes captured when a ShareLink is generated. Contains only the fields exposed publicly (`courseCode`, `courseName`, `gainedSkills`, `reason`). Distinct from a CommunityEntry, which is live rather than snapshot-based.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student who meets the Y-day eligibility threshold can generate a share link or publish to the community in under 60 seconds with no more than 3 user interactions.
- **SC-002**: A share link revocation takes effect within 5 seconds — a visitor who held the link and refreshes after revocation sees the invalid/not-found response without any caching grace period visible to them.
- **SC-003**: An unpublish action removes the community entry within 5 seconds — the entry is no longer visible to any peer browsing the feed within that window.
- **SC-004**: A community entry update triggered by a new roadmap acceptance is reflected in the community feed within 10 seconds — a peer who refreshes the feed within that window sees the updated content.
- **SC-005**: The community feed, with up to 500 published entries, displays filtered results within 2 seconds of the filter being applied.
- **SC-006**: A privacy setting change (identified ↔ anonymous) is reflected in the community feed and any active share link views within one page refresh — no manual re-publish or re-generation required.
- **SC-007**: Zero instances of `supportingSkills` or `careerRelevanceNote` content are exposed in any share link or community view (verified by audit of rendered outputs).
- **SC-008**: Zero instances of an anonymous student's exact major being exposed in any share link or community feed view when anonymous mode is active (verified by audit).

---

## Assumptions

- **Y default value**: The specification does not prescribe Y. The planning phase will identify a suitable default (assumed to be 7 days) until the configuration value is set by the product owner.
- **Snapshot timing for share links**: The roadmap node snapshot for a share link is taken at the moment the student generates the link — not at acceptance time. Subsequent changes to the accepted roadmap data do not update existing snapshots.
- **Community entries are live at render time**: There is no separate snapshot for community entries. The entry content is derived from the student's current accepted roadmap at the time it is rendered.
- **Single accepted roadmap per student**: Each student has at most one accepted roadmap at a time. All sharing and eligibility rules apply to that single active roadmap.
- **Feature 009 defines roadmap structure**: The node fields (`courseCode`, `courseName`, `gainedSkills`, `reason`, `supportingSkills`, `careerRelevanceNote`) are defined and owned by Feature 009. This feature treats them as read-only inputs.
- **Display name source**: The student's display name is stored in Feature 005 (Account Management), populated during Feature 001 (Profile Onboarding). Updates are reflected in identified community entries and share link views.
- **Major group mapping**: The mapping of exact majors to major group labels (e.g., "Computer Science" → "CS-related") is a system configuration. This feature does not define the mapping contents.
- **Feed ordering default**: The community feed defaults to major-relevance order — entries from the viewing student's own major group appear first, followed by entries from other major groups. Within each group, secondary ordering is by publication date (most recent first). No user-controlled sort switching is required for this iteration.
- **Personalisation level definition**: "Full" and "low" personalisation levels are properties attached to the generated roadmap by Feature 009. This feature reads them as-is for filtering and display.
- **One community entry per student**: Each student can have at most one active community entry at any time (reflecting their current accepted roadmap).

---

## Dependencies

- **Feature 009** (AI-Powered Personalised Roadmap Generator): Provides the accepted roadmap structure including all node fields and personalisation level. The roadmap's `accepted_at` timestamp is the start of the eligibility clock. Fork actions in this feature invoke Feature 009's standard acceptance flow (including its prerequisite validation); Feature 009 owns that logic.
- **Feature 002** (Seed CTDT DAG): Provides the authoritative CourseUnit prerequisite graph consumed by Feature 009's acceptance flow — relevant transitively via fork.
- **Feature 005** (Account Management): Provides the student's display name and exact major used in community and share link views.
- **Feature 001** (Profile Onboarding): Provides the student's career goal role and major used as community feed metadata.
- **Feature 004** (Skill Tree): Owns the primary rendering of a student's own roadmap. The community feature provides a separate, independent read-only rendering context and does not reuse Skill Tree's interactive components.
