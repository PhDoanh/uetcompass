# Feature Specification: Market Insight & Resource Curation

**Feature Branch**: `004-resource-curation`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Resource Curation cho UETCompass: Market Insight (thống kê skill hot từ thị trường VN) và Resource Panel (gợi ý tài liệu khi bấm Skill Node trong Skill Tree)"

---

## Context

This feature operates **within the Skill Tree** (Feature 003). It adds two capabilities to Skill Tree's two existing views:

- **Course View** – shows UET course nodes (môn học) with linked Skill Nodes that have market demand indicators ("hot" badges).
- **Skill View** – shows Skill Nodes as the primary unit, each decorated with live Vietnamese job-market data and filterable by demand signals.

When a student taps any Skill Node (in either view), a side panel slides out displaying curated learning resources without leaving the page.

**Skill Node** re-clarification (extends 003-skill-tree):
- Represents a specific technical skill on the job market (e.g., "React", "Docker", "SQL").
- Linked to one or more Course Nodes that cover related content.
- Carries market data: job count, average salary, trend direction.
- No personal progress state (progress is tracked on Course Nodes only).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – View Market Demand Signals on Skill Nodes (Priority: P1)

A student browsing the Skill Tree (in either Course View or Skill View) can instantly read how in-demand each skill is on the Vietnamese job market — job count, average advertised salary, and whether demand is rising, stable, or falling compared to 30 days ago. "Hot" skills are visually flagged.

**Why this priority**: This is the primary value proposition of the feature. Without market data on Skill Nodes, neither the resource panel (US2) nor the hot-badge on Course Nodes (US3) delivers meaningful context.

**Independent Test**: Can be fully tested by opening the Skill Tree and confirming that each Skill Node displays job count, average salary, and trend direction drawn from data collected within the previous 24 hours.

**Acceptance Scenarios**:

1. **Given** the student is in Skill View, **When** they view a Skill Node (e.g., "Docker"), **Then** the node displays: number of currently open jobs, average advertised salary, and a trend indicator (↑ Rising / → Stable / ↓ Falling) compared to 30 days prior.
2. **Given** a Skill Node's job count or growth rate exceeds the "hot" threshold, **When** the node is rendered, **Then** it carries a visible "hot" badge.
3. **Given** the daily data pipeline has run, **When** any student loads the Skill Tree, **Then** all market data reflects a snapshot collected within the past 24 hours.
4. **Given** a Skill Node has no market data (skill not found in any crawled source), **When** the node is rendered, **Then** it displays a neutral "No data" indicator without breaking the tree layout.

---

### User Story 2 – Open Resource Panel for a Skill Node (Priority: P1)

A student clicks on any Skill Node in either Skill View or Course View. A side panel slides in alongside the tree — it does not navigate away — and shows a curated list of up to 5 free and 5 paid learning resources for that skill, each typed (Article / Video / Course / Tutorial) and linked to its source.

**Why this priority**: Direct access to curated resources is the core student-facing output of this feature. It converts market insight into actionable learning.

**Independent Test**: Can be fully tested by clicking a Skill Node and verifying the panel appears within 1 second, shows the correct skill name and market summary, and lists at least one resource with a working hyperlink.

**Acceptance Scenarios**:

1. **Given** the student is in Skill View or Course View, **When** they click a Skill Node, **Then** a side panel slides in within 1 second without a full-page navigation.
2. **Given** the side panel is open, **When** the student views it, **Then** it displays: the skill name, a market data summary (job count, salary, trend), a "Free" section (≤ 5 items) and a "Paid" section (≤ 5 items).
3. **Given** a resource item is displayed, **When** the student reads the item, **Then** it shows a color-coded type badge (Article = yellow, Video = purple, Course = green, Tutorial = blue) and a clickable title.
4. **Given** the student clicks a resource title, **When** the link activates, **Then** the external source opens in a new browser tab; the side panel remains open.
5. **Given** a Skill Node has fewer than the maximum resources curated, **When** the panel opens, **Then** only the available items are shown; the panel does not display empty placeholder slots.
6. **Given** the side panel is open, **When** the student clicks outside the panel or presses Escape, **Then** the panel closes and the Skill Tree resumes its previous state.

---

### User Story 3 – Discover Hot Skills Linked to a Course Node (Priority: P2)

A student viewing a Course Node in Course View sees which Skill Nodes tied to that course are currently "hot" in the Vietnamese job market, helping them understand the real-world relevance of their coursework.

**Why this priority**: This bridges academic curriculum to market demand. It depends on US1 (market data on Skill Nodes) and delivers additional value for students in Course View.

**Independent Test**: Can be fully tested by opening a Course Node (e.g., "Lập trình Web") and confirming it shows its linked Skill Nodes with hot badges applied consistently with the same data shown in Skill View.

**Acceptance Scenarios**:

1. **Given** a Course Node (e.g., "Lập trình Web"), **When** the student expands or views it in Course View, **Then** the node lists its linked Skill Nodes (e.g., "React", "HTML/CSS", "JavaScript") with their market data badges.
2. **Given** a linked Skill Node is marked "hot," **When** it appears under a Course Node, **Then** it carries the same "hot" badge as in Skill View.
3. **Given** the student clicks a linked Skill Node within a Course Node's view, **When** the click is registered, **Then** the Resource Panel (US2) opens for that skill, consistent with clicking it in Skill View.

---

### User Story 4 – Filter and Sort Skills by Market Demand in Skill View (Priority: P2)

A student in Skill View can narrow and reorder the Skill Node list by job count (high to low), average salary, or trend direction (rising first), allowing them to prioritize which skills to learn next.

**Why this priority**: With potentially dozens of Skill Nodes visible, filtering by market signal helps students make informed choices. Depends on US1.

**Independent Test**: Can be fully tested by opening Skill View, applying each filter in turn, and verifying the rendered node order matches the selected sort criterion.

**Acceptance Scenarios**:

1. **Given** the student is in Skill View, **When** they select "Sort by Job Count," **Then** Skill Nodes re-render in descending order of job count.
2. **Given** the student is in Skill View, **When** they select "Sort by Salary," **Then** Skill Nodes re-render in descending order of average salary.
3. **Given** the student is in Skill View, **When** they select "Filter: Rising trend," **Then** only Skill Nodes with an upward trend direction are shown.
4. **Given** the student switches between Course View and Skill View, **When** they return to Skill View, **Then** their previously selected filter/sort preference is preserved for the session.

---

### User Story 5 – Switch Between Course View and Skill View (Priority: P1)

A student can toggle between the two Skill Tree views without losing their current scroll position, selected node, or open side panel state.

**Why this priority**: View switching is the navigation backbone of the Skill Tree extension. Losing state on switch degrades UX significantly.

**Independent Test**: Can be fully tested by opening a side panel for a skill in Course View, switching to Skill View, and confirming the side panel is still open for the same skill (or gracefully dismissed with state preserved).

**Acceptance Scenarios**:

1. **Given** the student is in Course View with no panel open, **When** they switch to Skill View, **Then** the transition is smooth and all Skill Nodes are visible with their market data.
2. **Given** the student has a side panel open for "React" in Skill View, **When** they switch to Course View, **Then** "React" Skill Node remains accessible in the Course Node that links to it, and the panel either stays open or closes cleanly with no data loss.
3. **Given** the student has applied a filter in Skill View, **When** they switch to Course View and back, **Then** their filter selection is still active.

---

### Edge Cases

- What happens when the daily data crawl fails for one or more sources (TopDev, ITviec, LinkedIn, JobOKO)?  → System uses the most recent successful snapshot for the affected source; each Skill Node's `lastUpdated` timestamp reflects the actual data date so students know data may be stale.
- What happens when a skill name in the crawled data does not exactly match any Skill Node name?  → The system attempts fuzzy/normalized matching; unmatched skills are queued for manual review and are not displayed until a mapping is confirmed.
- What happens when a resource URL becomes unavailable (404/dead link)?  → The resource is hidden from the panel until the URL is updated; a periodic link-health check flags dead links for curator review.
- What happens when a student opens the Skill Tree on a device with limited screen width?  → The side panel renders as a bottom sheet or modal overlay rather than a side panel to fit the viewport.
- What happens when no resources have been curated yet for a newly added Skill Node?  → The Resource Panel opens and displays a "No resources added yet" message rather than an empty panel.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST collect job market data (job count, average salary, trend direction) for each mapped skill from Vietnamese recruitment platforms (TopDev, ITviec, LinkedIn Jobs, JobOKO) on a daily schedule.
- **FR-002**: The system MUST map skills collected from market sources to the corresponding Skill Nodes in the Skill Tree; unmapped skills MUST be queued for manual review.
- **FR-003**: Each Skill Node MUST display: current open job count, average advertised salary, and trend direction (Rising / Stable / Falling) compared to 30 days prior.
- **FR-004**: A Skill Node MUST be automatically marked "hot" when its job count or 30-day growth rate exceeds a configurable threshold.
- **FR-005**: The Skill Tree MUST provide two switchable views: **Course View** (UET course nodes with linked Skill Nodes) and **Skill View** (Skill Nodes as primary units).
- **FR-006**: Each Course Node MUST display its linked Skill Nodes, including any "hot" badges, within Course View.
- **FR-007**: Progress tracking (completed/in-progress/locked state) MUST remain tied exclusively to Course Nodes; Skill Nodes carry no personal progress state.
- **FR-008**: When a student clicks any Skill Node in either view, the system MUST display a Resource Panel as a side panel (or contextually appropriate overlay on small screens) without page navigation.
- **FR-009**: The Resource Panel MUST display: skill name, market data summary, up to 5 free resources, and up to 5 paid resources, each with a type badge and hyperlink.
- **FR-010**: Each resource hyperlink MUST open the external URL in a new browser tab.
- **FR-011**: The system MUST allow filtering and sorting of Skill Nodes in Skill View by: job count (descending), average salary (descending), and trend direction (rising first).
- **FR-012**: Market data displayed on Skill Nodes MUST reflect a snapshot collected within the previous 24 hours; the data age MUST be visible to the student.
- **FR-013**: When a data crawl fails for a source, the system MUST fall back to the most recent successful snapshot and surface a staleness indicator on affected Skill Nodes.

### Key Entities

- **SkillNode**: id, name, category, hot (boolean), marketData (jobCount, avgSalary, trendDirection, lastUpdated, dataSource)
- **CourseNode**: id, name (UET course title), status (completed / in-progress / locked), linkedSkillIds[]
- **Resource**: id, skillId, title, url, type (article / video / course / tutorial), isPaid, isActive
- **MarketSnapshot**: id, skillId, jobCount, avgSalary, trendDirection, crawledAt, source (TopDev / ITviec / LinkedIn / JobOKO), isFallback (boolean)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of Skill Nodes with at least one mapped market source display data collected within the past 24 hours.
- **SC-002**: The Resource Panel opens within 1 second of a student clicking a Skill Node.
- **SC-003**: Each Skill Node in the curated set has at least 3 free resources and 3 paid resources available at launch.
- **SC-004**: Students can switch between Course View and Skill View without losing their active filter selection or open side panel state.
- **SC-005**: Market trend signals (hot badges, trend direction) agree with the top-skill rankings published by TopDev and ITviec at least 80% of the time when measured weekly.
- **SC-006**: Dead resource links are detected and hidden within 48 hours of becoming unavailable.

---

## Assumptions

- Skill Node categorization and the Course-to-Skill mapping table are maintained by the UETCompass team (not auto-generated); this feature consumes the mapping but does not manufacture it.
- "Hot" threshold values (job count ceiling, growth rate floor) are configured at deployment time and adjustable without a code change.
- Resource curation is a manual editorial process; there is no requirement for automated resource discovery in this specification.
- Vietnamese Dong (VND) is the default currency for salary display; conversion to other currencies is out of scope.
- The Skill Tree UI from 003-skill-tree already handles Course View / Skill View tab switching at a structural level; this feature adds data to nodes within those views.
