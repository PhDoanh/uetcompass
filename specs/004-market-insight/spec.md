# Feature Specification: Market Insight – IT Job Market Dashboard

**Feature Branch**: `004-market-insight`  
**Created**: 2026-03-09  
**Status**: Draft  
**Input**: User description: "Xây dựng tính năng Market Insight cho hệ thống UETCompass — một dashboard thống kê thị trường tuyển dụng IT tại Việt Nam, được lọc theo career goal của sinh viên, hiển thị skill phổ biến, mức lương, xu hướng và skill gap cá nhân, với khả năng thêm skill vào roadmap."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – View Role-Filtered Market Dashboard (Priority: P1)

A student who has completed onboarding with a career goal (e.g., Backend Developer) navigates to the Market Insight page. They see a dashboard pre-filtered to their role, showing the top demanded skills in the current IT job market for that role, each accompanied by the number of active job postings and the average salary range.

**Why this priority**: This is the foundational view that all other interactions depend on. Without a meaningful, role-specific market overview, no other Market Insight feature delivers value.

**Independent Test**: Can be fully tested by logging in as an onboarded student with a "Backend" career goal, navigating to Market Insight, and confirming that the dashboard shows Backend-specific skill cards with job counts and salary ranges.

**Acceptance Scenarios**:

1. **Given** a student has completed onboarding with a Backend career goal, **When** they open the Market Insight page, **Then** the dashboard displays the top demanded skills for the Backend role, sorted by job posting count (highest first).
2. **Given** the dashboard is loaded, **When** the student inspects a skill card, **Then** it shows the skill name, the number of active job postings requiring that skill, and the average salary range for positions demanding that skill.
3. **Given** the dashboard is loaded, **When** the student views the header area, **Then** the page clearly indicates it is showing data for their assigned career goal role and displays the timestamp of the last market data refresh.
4. **Given** a student has a DevOps career goal, **When** they open the Market Insight page, **Then** only DevOps-relevant skills are displayed — no Backend, Frontend, or Data skills appear.

---

### User Story 2 – View Skill Demand Trends (Priority: P1)

A student examines skill trend indicators on the dashboard. Each skill card shows whether demand for that skill has increased or decreased over the past 30 days and by what percentage.

**Why this priority**: Trend data transforms a static snapshot into actionable career intelligence, helping students distinguish between skills that are growing in relevance and those that are declining.

**Independent Test**: Can be fully tested by verifying each skill card on the dashboard displays a trend indicator (positive or negative percentage), and that the indicator reflects the direction of change over the prior 30-day window.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the student views any skill card, **Then** a trend indicator is visible showing the percentage change in job-posting demand over the past 30 days (e.g., "+12% in 30 days" or "−5% in 30 days").
2. **Given** a skill's demand has increased, **When** displayed on the card, **Then** the trend indicator is styled positively (e.g., green upward arrow).
3. **Given** a skill's demand has decreased, **When** displayed on the card, **Then** the trend indicator is styled negatively (e.g., red downward arrow).
4. **Given** insufficient trend data exists for a skill (fewer than 30 days of history), **When** displayed, **Then** the card shows "Insufficient data" instead of a percentage.

---

### User Story 3 – Understand Personal Skill Gap (Priority: P1)

A student views the Skill Gap section of the dashboard. This section compares the market's top demanded skills for their role against the skills the student currently has (from their completed learning path), and surfaces the skills they are missing most.

**Why this priority**: The Skill Gap panel is the most personalized element of the feature — it directly translates abstract market data into individual action items, telling the student exactly what they need to learn next.

**Independent Test**: Can be fully tested by comparing a student's profile skills (Done nodes from their Skill Tree) against the top market skills list, and confirming that the Skill Gap section shows only skills absent from the student's completed set, ordered by market demand.

**Acceptance Scenarios**:

1. **Given** the dashboard is loaded, **When** the student views the Skill Gap section, **Then** it shows skills from the top market demand list that are absent from the student's current learned skill set, ranked by job posting count.
2. **Given** a student has already learned a top market skill (e.g., "Docker" is in their Skill Tree as Done), **When** viewing the Skill Gap section, **Then** "Docker" does NOT appear as a gap item.
3. **Given** a student has all top market skills for their role, **When** viewing the Skill Gap section, **Then** the section shows a positive completion message rather than a list of missing skills.
4. **Given** the Skill Gap section is visible, **When** the student inspects a gap skill entry, **Then** the entry shows the skill name, its job count demand, and an "Add to Roadmap" action button.

---

### User Story 4 – Add Market Skill to Personal Roadmap (Priority: P2)

From either the main skill list or the Skill Gap section, a student clicks "Add to Roadmap" on a skill they want to learn. The skill is immediately added to their personal self-study track in the Skill Tree, and the button state updates to confirm the action.

**Why this priority**: This is the direct action that bridges market awareness with personal planning. It is secondary because it requires the read-only dashboard (P1 stories) to work first, and the core value is delivered even before this action is taken.

**Independent Test**: Can be fully tested by clicking "Add to Roadmap" on a skill not yet in the student's Skill Tree, then navigating to the Skill Tree and confirming the skill appears as a new self-study node.

**Acceptance Scenarios**:

1. **Given** a skill is not yet in the student's roadmap, **When** the student clicks "Add to Roadmap" on that skill card, **Then** the skill is added to the student's self-study track in their Skill Tree, and the button changes to a "Added" state on the same page without a full page reload.
2. **Given** a skill is already in the student's roadmap, **When** the dashboard loads, **Then** the "Add to Roadmap" button for that skill is disabled or visually replaced with an "Already in Roadmap" indicator.
3. **Given** the student adds a skill from the Skill Gap section, **When** the action completes, **Then** the skill is removed from the gap list and the "Already in Roadmap" indicator appears in its place.
4. **Given** the student adds a skill from the main skill list, **When** the action completes, **Then** the student remains on the Market Insight page and no navigation occurs.

---

### User Story 5 – Access Gating for Non-Onboarded Students (Priority: P1)

A student who has not completed onboarding (no career goal set) attempts to access the Market Insight page. They are shown an informative empty state or redirect that explains the feature requires a career goal and guides them toward completing onboarding.

**Why this priority**: Access gating protects the relevance of the feature — market data without a career goal context is meaningless, and surfacing generic, uncurated market data could mislead students.

**Independent Test**: Can be fully tested by navigating to Market Insight as a user who has not completed onboarding, and confirming no market data is shown and an appropriate message/redirect is presented.

**Acceptance Scenarios**:

1. **Given** a student has NOT completed onboarding (no career goal), **When** they navigate to the Market Insight page, **Then** no market data is displayed and an explanatory message instructs them to complete onboarding first.
2. **Given** the access-gated state is shown, **When** the student views the page, **Then** a visible call-to-action link or button is present that takes them directly to the onboarding flow.
3. **Given** a student completes onboarding and returns to Market Insight, **When** the page loads, **Then** the full dashboard renders correctly for their newly configured career goal.

---

### Edge Cases

- What happens when market data for a role has not been refreshed for more than 24 hours? → The dashboard displays the stale data alongside a visible warning banner indicating the data is out of date and showing the last update timestamp.
- What happens when a student's career goal changes after they have previously added market skills to their roadmap? → Skills already added to the roadmap remain in the Skill Tree. The Market Insight dashboard re-renders with data for the new career goal on next load.
- What happens when a student tries to add a skill that is already in their roadmap via a race condition (double-click)? → The system is idempotent: duplicate add requests result in a single entry in the roadmap and both button states converge to "Already in Roadmap."
- What happens when a role has fewer than 5 skills in the market data? → The dashboard displays however many skills are available (even if fewer than 5) with no artificial padding.
- What happens when a student's Skill Tree has no completed (Done) nodes yet? → The entire market skill list appears as the Skill Gap, indicating the student is starting from zero for that role.
- What happens when TopDev, ITviec, LinkedIn, and JobOKO return conflicting job counts for the same skill? → Skill demand counts are calculated as the deduplicated total across all four platforms.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Market Insight page MUST only be accessible to students who have completed onboarding and have an assigned career goal; all other students MUST see an access-gated state with a call-to-action to complete onboarding.
- **FR-002**: The dashboard MUST display market data exclusively for the student's assigned career goal role (Backend, Frontend, DevOps, or Data); role switching or custom filtering is NOT available in MVP.
- **FR-003**: The dashboard MUST display a ranked list of the top demanded skills for the student's role, ordered by descending job posting count aggregated across all tracked data sources.
- **FR-004**: Each skill entry MUST display the skill name, the total number of active job postings requiring that skill, and a 30-day demand trend indicator (percentage change, styled positively or negatively).
- **FR-005**: Each skill entry MUST display the average salary range for positions that list that skill as a requirement.
- **FR-006**: The dashboard MUST include a Skill Gap section that compares the top market skills for the student's role against the student's current learned skill set, and surfaces only the market skills the student has not yet acquired, ranked by demand.
- **FR-007**: A student's "current learned skill set" for Skill Gap comparison MUST be derived from the skills the student has marked as Done in their Skill Tree.
- **FR-008**: Students MUST be able to add any skill visible on the Market Insight dashboard to their personal self-study track via a single "Add to Roadmap" action button on each skill card; this action MUST NOT navigate the student away from the page.
- **FR-009**: The "Add to Roadmap" button MUST transition to a disabled "Already in Roadmap" state if the skill is already present in the student's roadmap, both on initial page load and immediately after a successful add action.
- **FR-010**: The dashboard MUST display a visible "last updated" timestamp showing when the market data was most recently refreshed.
- **FR-011**: When market data is more than 24 hours old, the dashboard MUST display a visible staleness warning alongside the last-updated timestamp.

### Non-Functional Requirements

- **NFR-001**: The Market Insight dashboard MUST load and display all market data within 3 seconds for a student on a standard broadband connection.
- **NFR-002**: Market data across all tracked sources (TopDev, ITviec, LinkedIn, JobOKO) MUST be refreshed at least once every 24 hours.

### Key Entities

- **Market Snapshot**: The aggregated, role-specific market intelligence data at a given point in time. Contains a ranked list of Skill Demand Entries for a single career goal role, plus the timestamp of the last refresh.
- **Skill Demand Entry**: A single skill's presence in the current market for a given role. Attributes include: skill name, total job posting count (deduplicated across all sources), average salary range (in VND millions per month), and 30-day demand trend percentage.
- **Skill Gap**: The personalized subset of market-demanded skills that the student has not yet learned. Computed by subtracting the student's Done skills (from their Skill Tree) from the top market skills for their role, then ranking by demand.
- **Career Goal**: The target role selected by the student during onboarding (Backend / Frontend / DevOps / Data). Determines which Market Snapshot is shown to the student.
- **Student Skill Set**: The set of skills a student is considered to have learned, derived from all nodes marked as Done in their personal Skill Tree (both curriculum-defined and self-study nodes).

### Assumptions

- Students have completed the onboarding flow (Feature 001) and have a career goal, and have an active Skill Tree (Feature 003) before accessing Market Insight.
- A student's learned skill set is determined by the Done nodes in their Skill Tree (Feature 003); skills from transcript uploads but not yet reflected as Done nodes are not counted separately.
- Market skills added to the roadmap via Market Insight are added as self-study nodes in the student's Skill Tree, distinct from curriculum-defined (CTDT) nodes.
- Salary ranges are displayed in Vietnamese Dong (VND millions per month), which is the standard format on Vietnamese job platforms.
- The dashboard displays the top 20 skills by job count for each role; this number is a reasonable MVP default and can be adjusted during planning.
- Job listing deduplication across platforms is handled at the data ingestion layer; the feature specification does not define the deduplication algorithm.
- In MVP, students cannot change the role filter or view multiple roles simultaneously; the career goal set during onboarding determines the single data view.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student can open Market Insight and identify their top 3 most-demanded missing skills within 2 minutes of landing on the page, without any external assistance.
- **SC-002**: The dashboard always displays a "last updated" timestamp, and the displayed data is never more than 24 hours old during normal system operation.
- **SC-003**: A student can add a missing skill to their personal roadmap in a single interaction (one click) and receive visual confirmation — all without leaving the Market Insight page.
- **SC-004**: The Skill Gap section correctly reflects the student's current Skill Tree state: a skill marked as Done in the Skill Tree never appears in the Skill Gap section.
- **SC-005**: The dashboard page loads and is fully interactive within 3 seconds for any onboarded student on a standard broadband connection.
