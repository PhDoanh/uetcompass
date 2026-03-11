# Feature Specification: Resource Curation

**Feature Branch**: `009-resource-curation`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Build the Resource Curation feature for UETCompass — a brand-new subsystem responsible for automatically gathering, classifying, and surfacing external learning resources for students."

---

## Context & Scope

Resource Curation introduces a brand-new data-acquisition and presentation layer to UETCompass. It consists of three interconnected capabilities that automatically gather external signals and surface them to students, enriching skill-based learning and career planning:

1. **Learning Resource Crawler** — automatically collects free and paid courses, videos, and documents for each skill in the catalog, sourced from Udemy, Coursera, YouTube, and other platforms.
2. **Academic Slide & Lecture Finder** — discovers publicly accessible slides, lecture notes, and syllabi linked to UET-VNU courses and maps them to skills automatically.
3. **Market Skill Trend Tracker** — harvests job posting signals from Vietnamese and regional tech job boards to rank skills by current industry demand.

All three capabilities share a common design principle: **students are passive consumers of curated data** — they never need to trigger crawling, approve content, or configure sources. Every collection job runs on a schedule without any user interaction.

**What this feature does NOT do:**

- Does not allow students to upload, submit, or manually add resources.
- Does not create a new course catalog or modify existing skill definitions — it reads from the existing UETCompass skill catalog.
- Does not send push notifications or proactively recommend resources — it surfaces curated data when a student visits a skill or market insight section.
- Does not require admin approval before displaying collected resources.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Browse Curated Learning Resources for a Skill (Priority: P1)

A student exploring their personalized roadmap selects a skill (e.g., "React"). Without leaving UETCompass, they see a curated list of learning resources for that skill — courses, videos, and articles drawn from Udemy, Coursera, YouTube, and other platforms. Every resource shows whether it is free or paid, so the student can weigh cost against quality at a glance and pick the best fit for their situation.

**Why this priority**: This is the foundational value of the entire feature. Students spend most of their discovery time on skill pages, and surfacing pre-classified resources directly on the skill page eliminates the need to search externally. It is the capability that makes the overall system immediately useful to every student.

**Independent Test**: Can be fully tested by selecting any skill from a student's active roadmap and verifying that a resource list appears with items from at least two different platforms, each correctly labeled free or paid, with title, source, and resource type visible — without any manual action needed to populate the list.

**Acceptance Scenarios**:

1. **Given** a student navigates to a skill page, **When** the resource section loads, **Then** a list of curated learning resources for that skill is shown — each entry displaying title, source platform, resource type, and free/paid indicator.
2. **Given** a skill's resources include both free and paid items, **When** the student views the list, **Then** free and paid status is visible on each entry without requiring the student to open a detail view.
3. **Given** resources come from multiple platforms, **When** the student views the list, **Then** the source platform name is shown for each resource so the student knows where the link leads.
4. **Given** a resource has a quality signal (e.g., rating, enrollment count), **When** the resource is displayed, **Then** that signal is shown alongside the entry to help the student assess quality.
5. **Given** no resources have been collected yet for a skill, **When** a student views that skill, **Then** an appropriate "no resources available yet" message is shown — not a blank section or an error.

---

### User Story 2 — Explore Market Skill Demand Trends (Priority: P2)

A student considering their career path opens the Market Insight section. They see a flat ranked list of skills ordered by current job market demand, compiled from job board data across TopDev, ITviec, LinkedIn, and JobOKO. Each entry shows how many job postings require that skill, the average salary range, and a trend direction (increasing / stable / decreasing) compared to the previous week. In under 30 seconds, the student uses this list to decide which skills to prioritize on their learning roadmap.

**Why this priority**: This capability is self-contained and delivers direct strategic value for career planning — a use case that extends beyond any individual skill page. It is P2 because it provides the broadest strategic signal but does not depend on Capability 1 being complete, and its audience (career-oriented students) is slightly narrower than the general resource browsing use case.

**Independent Test**: Can be fully tested by opening the Market Insight section and verifying a ranked skill list is displayed, each entry showing job count, salary range, and trend indicator, and confirming the last refresh timestamp is within the past 24 hours.

**Acceptance Scenarios**:

1. **Given** the student opens the Market Insight section, **When** the page loads, **Then** a flat list of skills is displayed, ranked from highest to lowest job demand, with no complex charts required.
2. **Given** the ranked list is shown, **When** the student reviews any entry, **Then** it displays: skill name, job posting count, average salary range (or "not specified" if unavailable), and a trend direction indicator (up / stable / down).
3. **Given** the list was last refreshed today, **When** the student views it, **Then** the data reflects signals from at least 3 of the 4 specified job boards (TopDev, ITviec, LinkedIn, JobOKO).
4. **Given** a skill's job count increased ≥10% compared to the previous 7-day period, **When** displayed, **Then** its trend shows "increasing"; if it decreased ≥10%, "decreasing"; if within ±10%, "stable."
5. **Given** the market insight list is loaded, **When** a student scans it, **Then** they can identify the top 5 in-demand skills and their trend directions within 30 seconds — the layout is a simple, scannable list.

---

### User Story 3 — Discover Academic Materials for a UET Course (Priority: P3)

A student preparing for the "Lập trình web" course looks for supplementary study materials. The system surfaces publicly accessible slides, lecture notes, and course syllabi associated with that course — drawn from UET faculty pages, GitHub, and open educational sources — automatically mapped to the relevant skills (HTML, CSS, JavaScript). The student can tell at a glance which documents are from official UET sources and which come from external repositories, making it easy to prioritize authoritative materials.

**Why this priority**: This capability targets a specific academic use case — UET course preparation — supplementing the general learning resource crawler but serving a narrower audience. The requirement for automatic skill-to-course inference adds complexity that justifies deferring it after the foundational capabilities (P1, P2) are established.

**Independent Test**: Can be fully tested by navigating to a UET course or skill known to have publicly accessible slides, verifying at least one document appears labeled with the correct source type (UET official / GitHub / external), document type (slide / lecture note / syllabus / exercise), and an associated skill name.

**Acceptance Scenarios**:

1. **Given** a student navigates to a UET course view or a skill linked to one, **When** the academic materials section loads, **Then** a list of associated public documents is shown — each with title, source type, document type, and linked skill name.
2. **Given** documents include both UET-official and external sources for the same course, **When** the list is displayed, **Then** UET-official documents appear above external ones.
3. **Given** a document was retrieved from a UET faculty page, **When** displayed, **Then** its source type is clearly marked as "UET official" — distinguishable from "GitHub" or "external."
4. **Given** the system has inferred a skill association for a document based on course name and content, **When** the document is shown, **Then** the inferred skill name is visible on the entry so the student understands the connection.
5. **Given** no public documents are found for a course, **When** the academic materials section is rendered, **Then** an appropriate "no materials found" empty state is shown — not a broken layout or error.

---

### Edge Cases

- **Skill with zero resources crawled**: A recently added skill has no collected resources — the resource section shows a clear empty state; the rest of the skill page remains fully functional.
- **Duplicate resource URLs**: The same resource URL is encountered across multiple crawl runs — the system deduplicates and stores only one entry per URL per skill, preventing redundant entries.
- **Resource URL becomes invalid**: A previously surfaced resource URL returns an error on re-crawl — the resource is either removed from display or flagged as unavailable rather than presenting a broken link to students.
- **Free/paid signal absent from source**: A learning platform does not expose a clear price or enrollment indicator — the system defaults to classifying the resource as "paid" rather than risk misclassifying a paid item as free.
- **One crawl source temporarily unreachable**: A job board or learning platform is unavailable during a scheduled run — the system continues with the remaining sources, logs the partial failure, and does not abort the entire collection job.
- **No salary data for a skill**: Job postings requiring a skill do not include salary information — the average salary for that skill is shown as "not specified" rather than inferred, estimated, or displayed as zero.
- **Skill with zero job postings**: A skill in the catalog has no matching job postings across all sources — it still appears in the Market Insight list (ranked last) with a count of 0 and a "stable" trend indicator.
- **Academic document behind authentication**: A document URL requires a login to access — the document is excluded from results; only publicly accessible documents without authentication are shown.
- **Skill removed from catalog**: A skill is deactivated in the UETCompass catalog while resources referencing it still exist — those resources are suppressed from student view until the skill is active again.

---

## Requirements *(mandatory)*

### Functional Requirements

**Capability 1 — Learning Resource Crawler**

- **FR-001**: The system MUST automatically collect learning resources for each skill in the UETCompass skill catalog on a recurring scheduled basis, without any student or administrator action.
- **FR-002**: The system MUST collect resources from at minimum Udemy, Coursera, and YouTube; additional publicly accessible educational platforms (e.g., edX, freeCodeCamp, Viblo) are permitted.
- **FR-003**: Each collected resource MUST record at minimum: title, URL, source platform, resource type (video / article / course / document), free/paid status, quality signal (if available from source), and the linked skill ID.
- **FR-004**: Free or paid status MUST be determined solely from data returned by the source (e.g., price field, free-enrollment indicator) — no manual admin classification is required or permitted.
- **FR-005**: Students MUST be able to view all curated resources for any skill they visit; free/paid status MUST be visible on each resource entry without requiring additional navigation.
- **FR-006**: Resources MUST be associated to skill entities, not to individual student accounts.
- **FR-007**: The system MUST deduplicate resources by URL per skill, ensuring the same resource does not appear multiple times under a single skill.

**Capability 2 — Academic Slide & Lecture Finder**

- **FR-008**: The system MUST automatically search for and retrieve publicly accessible academic documents (slides, lecture notes, syllabi, exercises) related to UET-VNU courses on a recurring scheduled basis.
- **FR-009**: Sources MUST include UET-VNU official public and faculty pages; external sources (GitHub repositories, open educational resource sites) MAY also be included.
- **FR-010**: Each collected academic document MUST record at minimum: title, URL, source type (UET official / GitHub / external), document type (slide / lecture note / syllabus / exercise), associated course name, and linked skill ID.
- **FR-011**: The system MUST infer the skill association for each academic document automatically, based on course name, document title, and available content signals — no manual admin mapping is required.
- **FR-012**: Academic documents from UET-VNU official sources MUST be ranked above documents from external sources in all display contexts.
- **FR-013**: Only documents accessible without authentication MUST be surfaced; any document requiring a login MUST be excluded.

**Capability 3 — Market Skill Trend Tracker**

- **FR-014**: The system MUST collect job posting data from at least 3 of the following 4 sources: TopDev, ITviec, LinkedIn, JobOKO.
- **FR-015**: For each skill, the system MUST extract: job posting count, average salary range (when salary information is present in postings), and trend direction (increasing / stable / decreasing) compared to the previous 7-day period.
- **FR-016**: Trend direction MUST be calculated as: ≥10% increase in job count → "increasing"; ≥10% decrease → "decreasing"; within ±10% → "stable."
- **FR-017**: Job posting data MUST be refreshed once every 24 hours via an automatic background job — no manual trigger is required.
- **FR-018**: Students MUST be able to access a flat ranked list of skills ordered by job demand; each entry MUST display skill name, job posting count, average salary range, and trend direction indicator.
- **FR-019**: Skills with no job postings found MUST still appear in the Market Insight list with a count of 0 and a "stable" trend indicator.

**Cross-Capability**

- **FR-020**: All collected resources, academic documents, and trend data MUST reference a skill entity from the existing UETCompass skill catalog; records referencing skills that are no longer active in the catalog MUST NOT be displayed to students.

### Key Entities

- **Learning Resource**: An externally sourced educational item associated with a skill. Attributes: title, URL, source platform, resource type (video / article / course / document), free/paid flag, optional quality signal, and a reference to the linked skill.
- **Academic Document**: A publicly accessible academic file tied to a UET-VNU course and a skill. Attributes: title, URL, source type (UET official / GitHub / external), document type (slide / lecture note / syllabus / exercise), course name, and linked skill reference.
- **Skill Trend Snapshot**: A daily record of a skill's job market signals. Attributes: skill reference, snapshot date, job posting count, average salary range (nullable), trend direction (increasing / stable / decreasing), and contributing sources.
- **Skill** *(existing)*: An entity in the UETCompass skill catalog. All three new entity types reference Skill by its catalog ID.

### Assumptions

- The UETCompass skill catalog exists and is maintained by existing features; this feature reads from it without modifying it.
- A skill's active status in the catalog determines whether its associated resources are visible to students; deactivated skills suppress all associated content from student view.
- For trend direction, the "previous period" is the most recent complete 7-day window prior to the current snapshot; daily snapshots give a week-over-week view aligned to natural job posting cycles.
- When salary data is absent from the majority of postings for a skill, the salary field is shown as "not specified" — it is never inferred, extrapolated, or displayed as zero.
- The scheduled collection frequency for Capabilities 1 and 2 defaults to weekly (every 7 days); Capability 3 runs daily. These are operational defaults and do not define functional scope.
- Students are authenticated before accessing any resource or market feature; unauthenticated users are redirected to the login page.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any skill present in at least one active student roadmap, students can find 5 or more curated resources — including at least one free and one paid item — directly within UETCompass, without navigating to an external search engine.
- **SC-002**: Every displayed learning resource carries a free/paid classification derived from source data alone; no resource is shown to students without a determined free/paid status.
- **SC-003**: Slides, lecture notes, or syllabi for UET-VNU courses are discoverable within UETCompass and correctly linked to at least one skill, without any manual admin mapping required.
- **SC-004**: Market skill trend data is refreshed at least once every 24 hours and aggregates signals from at least 3 of the 4 specified job boards (TopDev, ITviec, LinkedIn, JobOKO).
- **SC-005**: A student can open the Market Insight skill list, identify the top 5 in-demand skills and their trend directions, and articulate a prioritization decision in under 30 seconds — confirmed through observation with at least 5 students.
- **SC-006**: The resource list for a skill becomes visible to a student within 3 seconds of opening the skill page on a standard 4G mobile connection.
