# Feature Specification: Progress Tracking Dashboard

**Feature Branch**: `007-progress-tracking`  
**Created**: 2026-03-11  
**Updated**: 2026-03-14  
**Status**: Draft  
**Input**: User description: "Xây dựng tính năng Theo dõi Tiến độ Học tập (Progress Tracking) cho UETCompass, cho phép sinh viên giám sát tiến độ học tập của mình trên các roadmap đang theo học. Tính năng này bổ sung cho feature Skill Tree — không thay thế hay tái xây dựng bất kỳ phần nào của nó."

---

## Context & Scope

Progress Tracking adds a dedicated **Progress Dashboard** (`/progress`) that gives students a cross-roadmap view of their learning progress — the one thing Skill Tree does not provide because it displays only one roadmap at a time.

Feature boundary alignment:
- Roadmap lifecycle and ownership are canonical in Feature 009.
- `roadmapId` is the stable identifier from Feature 009 (`roadmaps._id`).
- Progress detail contract is consumed from Feature 004 (`getNodesByStatus`) backed by `skill_node_statuses`.

**What this feature does NOT do:**
- Does not display the interactive tree visualization (that is Skill Tree's responsibility).
- Does not allow students to change node statuses — all updates happen on the Skill Tree page.
- Does not re-define the three node states (Pending / In Progress / Done) — those are owned by Skill Tree.
- Does not store authoritative node-state data — Skill Tree is the source of truth; this feature only reads aggregated summaries.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – View Multi-Roadmap Progress Overview (Priority: P1)

A student who owns more than one roadmap opens the Progress Dashboard and immediately sees a summary card for each owned roadmap, showing how far along they are on each path. At a glance, they can tell which roadmap they are most advanced on, which has the most recent activity, and which still needs attention — without having to navigate to each Skill Tree individually.

**Why this priority**: This is the core value proposition of the entire feature. Without the cross-roadmap overview, the dashboard provides no benefit over simply using each Skill Tree separately. Every other user story builds on top of this one.

**Independent Test**: Can be fully tested by logging in as a student with two or more owned roadmap documents, navigating to `/progress`, and verifying that all owned roadmaps appear as separate cards, each showing a correct completion percentage, node counts by status, and last activity date.

**Acceptance Scenarios**:

1. **Given** a student owns 3 roadmaps, **When** they open the Progress Dashboard, **Then** all 3 roadmaps are displayed — one card each — with no roadmap omitted.
2. **Given** a roadmap card is displayed, **When** the student inspects it, **Then** they see the roadmap name, completion percentage (Done ÷ total nodes × 100%), count of Done nodes out of total, and the date of the most recent node-status change on that roadmap.
3. **Given** a student has marked different nodes on different roadmaps, **When** viewing the dashboard, **Then** each card independently reflects its own roadmap's data — cards do not share or mix data.
4. **Given** a student's roadmap has 0 nodes Done and 0 nodes In Progress, **When** its card is shown, **Then** it displays 0% completion and a "Not started" indication rather than an error or missing value.
5. **Given** a student's roadmap has all nodes Done, **When** its card is shown, **Then** it displays 100% completion with a visual completion indicator.

---

### User Story 2 – Drill Down Into a Roadmap's Node-Level Detail (Priority: P1)

After seeing the overview, a student selects one roadmap card and is shown a detailed breakdown of every node on that roadmap, organized into three groups: Done, In Progress, and Pending. They can see exactly which courses they have completed, which they are currently working on, and which still lie ahead — all without switching to the Skill Tree. This detail payload follows Feature 004 `getNodesByStatus(userId, roadmapId)`.

**Why this priority**: The overview cards tell the "how much" story; the detail view tells the "what exactly" story. Together, they satisfy a student's complete diagnostic question: "Where exactly am I on each of my paths?" This story adds the depth needed to make the dashboard truly useful.

**Independent Test**: Can be fully tested by clicking a roadmap card, then verifying that the resulting view lists every node in the roadmap under the correct status group, with no node missing or appearing under the wrong group.

**Acceptance Scenarios**:

1. **Given** the overview dashboard is shown, **When** the student taps or clicks a roadmap card, **Then** a detail view opens (same page or expanded section) showing that roadmap's nodes organized under three labeled groups: Done, In Progress, and Pending.
2. **Given** the detail view is open, **When** the student counts the nodes shown, **Then** the total matches the `total_nodes` value shown on the summary card.
3. **Given** a student has 5 Done nodes, 2 In Progress, and 8 Pending on a roadmap, **When** they open the detail view, **Then** each group header shows the correct count (Done: 5, In Progress: 2, Pending: 8).
4. **Given** a group contains no nodes (e.g., In Progress has 0), **When** the detail view is shown, **Then** that group is either hidden or shows an empty state message — it does not show a blank section that might confuse the student.
5. **Given** the student navigates back to the overview, **When** they return to the dashboard, **Then** all roadmap cards are still visible and the state of the page is preserved.

---

### User Story 3 – Navigate to a Specific Node in Skill Tree (Priority: P2)

While reviewing the node-level detail for a roadmap, a student spots a course they want to act on — perhaps a Pending course they are ready to start, or an In Progress course whose status they want to mark Done. They tap the course name and are taken directly to the Skill Tree page, with that specific node highlighted or scrolled into view.

**Why this priority**: Without this navigation, the dashboard is a dead end — students have to manually search for the node in the Skill Tree. This story closes the loop between discovery (on the dashboard) and action (on the Skill Tree), making the overall experience cohesive. It is P2 because the dashboard is still useful for overview purposes even without deep-links, but the feature is meaningfully incomplete without them.

**Independent Test**: Can be fully tested by clicking a course node in the detail view and confirming the Skill Tree opens with that node visually distinguished (highlighted, scrolled to, or focused) so the student does not have to search for it.

**Acceptance Scenarios**:

1. **Given** a node is listed in the detail view, **When** the student taps its name, **Then** they are taken to the Skill Tree page for that roadmap.
2. **Given** the student is navigated to the Skill Tree, **When** the page loads, **Then** the target node is visually distinguished (highlighted or scrolled into view) so that the student's attention is directed to it immediately.
3. **Given** a Done node and a Pending node are both in the detail view, **When** either is tapped, **Then** both navigate correctly to their respective nodes in the Skill Tree — the navigation works regardless of node status.
4. **Given** the student navigates to the Skill Tree and then presses the browser back button, **When** they return to the dashboard, **Then** the detail view for the same roadmap is still open (they are not thrown back to the overview).

---

### User Story 4 – Dashboard Reflects Skill Tree Changes Without Reload (Priority: P2)

A student has the Progress Dashboard open in one browser tab and the Skill Tree for one of their roadmaps open in another tab. After they mark a node as Done on the Skill Tree, they switch back to the Dashboard tab — without reloading it — and see that the affected roadmap card has updated to reflect the new completion percentage and node counts.

**Why this priority**: Stale data erodes trust in the dashboard. If the overview shows a different percentage than the Skill Tree progress bar, students will be confused. This story ensures consistency between the two views, which is critical for the dashboard to be considered reliable. It is P2 rather than P1 because the dashboard remains functional (even if briefly stale) before this is implemented.

**Independent Test**: Can be fully tested by opening the dashboard and a Skill Tree in separate tabs, changing a node's status on the Skill Tree, switching back to the dashboard tab without reloading, and verifying the relevant roadmap card updates within 5 seconds.

**Acceptance Scenarios**:

1. **Given** the dashboard is open and a student marks a node Done on the Skill Tree in another tab, **When** they switch back to the Dashboard, **Then** the affected roadmap card updates its percentage and node counts within 5 seconds — without a manual page reload.
2. **Given** a roadmap had a last activity date of yesterday, **When** a node is updated today, **Then** the "last activity" date on that roadmap's card updates to today.
3. **Given** a student marks multiple nodes in quick succession on the Skill Tree, **When** they return to the dashboard, **Then** all changes are reflected correctly — no intermediate states are displayed.
4. **Given** the node write succeeds but cache refresh fails, **When** Skill Tree responds to the student action, **Then** the action still succeeds and Progress cache is repaired by eventual-consistency retry.

---

### Edge Cases

- **No roadmaps owned**: A student with no owned roadmap document in Feature 009 opens `/progress` → the dashboard shows an empty state, not an error page.
- **Single roadmap**: A student owning exactly one roadmap opens `/progress` → the dashboard shows that single roadmap's summary and allows access to its detail view; the experience is consistent with the multi-roadmap view.
- **All nodes Pending / 0% progress**: A student who has just started a roadmap and changed no statuses → the dashboard displays 0% and an empty Done group without errors.
- **100% completion**: A student who has marked every node Done → the dashboard shows 100% and an empty Pending and In Progress group, with a visual completion signal.
- **Very large roadmap (100+ nodes)**: A student with a roadmap containing 100+ nodes → the detail view loads completely within the dashboard's performance budget; nodes are presented in a scannable format (e.g., grouped, scrollable) rather than a flat dump.
- **Concurrent update during detail view**: A student is looking at the detail view of a roadmap while simultaneously marking a node Done on the Skill Tree → the detail view also updates to move that node from its old group to Done, consistent with Story 4 behavior.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a dedicated Progress Dashboard at a fixed, predictable URL accessible from the main navigation.
- **FR-002**: The dashboard MUST show one summary card per roadmap document owned by the authenticated student (canonical ownership from Feature 009), covering all owned roadmaps without exception.
- **FR-003**: Each summary card MUST display: (a) the roadmap name, (b) the completion percentage calculated as Done nodes ÷ total nodes × 100% (rounded to the nearest whole number), (c) the count of nodes in each of the three states (Done, In Progress, Pending), and (d) the date of the most recent node-status change on that roadmap.
- **FR-004**: The dashboard MUST be read-only — it MUST NOT provide any control to change a node's status.
- **FR-005**: A student MUST be able to select a roadmap card to open a detail view listing every node in that roadmap, organized into three labeled groups: Done, In Progress, and Pending.
- **FR-006**: Every node in the detail view MUST be tappable/clickable, and the action MUST navigate the student to the Skill Tree page for that roadmap with the selected node visually highlighted or scrolled into view.
- **FR-007**: The completion percentage shown on the dashboard MUST use the same formula as the Skill Tree progress bar (Done ÷ total nodes × 100%), ensuring both views always display the same value.
- **FR-008**: The dashboard MUST reflect node-status changes made on the Skill Tree within 5 seconds, without requiring the student to manually reload the page.
- **FR-009**: The dashboard MUST display an empty state (not an error) for students who have no owned roadmaps.
- **FR-010**: When a status group in the detail view contains zero nodes, the system MUST show a clear empty-state indication for that group rather than hiding it silently or displaying a blank section.
- **FR-011**: The feature MUST use stable `roadmapId` from Feature 009 (`roadmaps._id`) as cache key, API path key, SSE merge key, and deep-link key.
- **FR-012**: The node-detail endpoint MUST use Feature 004 canonical service contract `getNodesByStatus(userId, roadmapId)` backed by `skill_node_statuses`.
- **FR-013**: `refreshCache` policy MUST be **soft-fail + eventual consistency**: refresh failures MUST NOT fail student node-update actions; retry/repair occurs asynchronously.

### Key Entities

- **Progress Dashboard**: The cross-roadmap overview page accessible at a fixed URL. Displays one summary card per owned roadmap. Read-only.
- **Roadmap Progress Summary**: The aggregated representation of one roadmap's progress as seen by a specific student. Contains: roadmap identity, total node count, counts per status (Done / In Progress / Pending), computed completion percentage, and last activity timestamp.
- **Roadmap Progress Cache**: The stored copy of a Roadmap Progress Summary, maintained by the Skill Tree system and read by the dashboard. Updated every time a node's status changes on the corresponding Skill Tree. Has a one-to-one relationship with a (student, roadmap) pair.
- **Node Status Detail**: The individual course node entry shown within a roadmap's detail view. Follows Feature 004 payload shape: `nodeId`, `courseCode`, `courseName`, `status`, `updatedAt`.

### Assumptions

- A student may own multiple roadmap documents through Feature 009 canonical lifecycle.
- The Skill Tree system is the sole writer of node-status data. The Progress Tracking feature only reads the aggregated cache that the Skill Tree system maintains.
- Feature 004 owns node status storage in `skill_node_statuses` and exposes `getNodesByStatus(userId, roadmapId)`.
- The Roadmap Progress Cache is updated by the Skill Tree system synchronously (or near-synchronously) whenever a node status changes, so the dashboard's 5-second update guarantee does not require the dashboard itself to poll raw node data.
- "Roadmap" and "Skill Tree" refer to the same learning-path concept from different perspectives: Skill Tree is the interactive tree view; Roadmap is the canonical data entity owned by Feature 009.
- Students are always authenticated before accessing the dashboard; unauthenticated users are redirected to the login page.
- Node type in this feature is exclusively `Course`, consistent with the scope defined in the Skill Tree specification.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Progress Dashboard loads fully and displays all roadmap summary cards within 2 seconds on a 4G mobile connection, for students owning up to 10 completed roadmaps.
- **SC-002**: The completion percentage displayed on a roadmap's summary card matches the progress bar percentage shown on the corresponding Skill Tree page to within ±1 percentage point (accounting for rounding), at all times.
- **SC-003**: A student owning multiple roadmaps sees every owned roadmap on the dashboard and can select any of them to view a complete node-by-status breakdown; no roadmap is omitted.
- **SC-004**: After a student changes a node's status on the Skill Tree, the corresponding roadmap card on the Progress Dashboard reflects the updated percentage and node counts within 5 seconds, with no manual page reload required.
