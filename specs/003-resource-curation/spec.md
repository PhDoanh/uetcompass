# Feature Specification: Resource Curation

**Feature Branch**: `003-resource-curation`  
**Created**: 2026-03-11  
**Revised**: 2026-03-28  
**Status**: Draft  
**Architecture Dependency**: Feature 009 (Roadmap with RoadmapNodeSchema) and Feature 001 (Profile Onboarding with StudentProfile)  
**External Service**: Tavily Search API (free tier, 100 searches/month)  
**Input**: User description: "Build the Resource Curation feature for UETCompass — a brand-new subsystem responsible for automatically gathering, classifying, and surfacing external learning resources for students grouped by courses in their personalized roadmaps."

---

## Context & Scope

Resource Curation introduces a brand-new data-acquisition and presentation layer to UETCompass. It consists of three interconnected capabilities that automatically gather external signals and surface them to students, enriching course-based learning and career planning:

1. **Academic Material Finder** — automatically discovers publicly accessible slides, lecture notes, and syllabi linked to each course in a student's roadmap using Tavily Search API with the course name as the primary query term. Results are **generic** — identical for all students taking that course.
2. **Market Skill Trend Tracker** — harvests trending skills from job posting data for each course, using Tavily Search API with a combined query of course name PLUS student's declared major, career goal, and company type preferences (from onboarding profile Feature 001) to ensure **personalized, contextually relevant** skill recommendations. **Only this capability uses StudentProfile data for personalization.**
3. **Learning Resource Crawler** — automatically collects free and paid courses, videos, and documents for each trending skill discovered by the tracker, using Tavily Search API with skill name as the search query. Results are **generic** — the same for all students interested in that skill, regardless of their StudentProfile.

All three capabilities share a common design principle: **students are passive consumers of curated data organized by their course roadmap** — they never need to trigger crawling, approve content, or configure sources. Every collection job runs on a schedule without any user interaction.

The feature is structured as a **three-tier hierarchy**:
- **RoadmapNodeSchema** (course/node level) → provides `courseName`
- **AcademicDocument** & **SkillTrendSnapshot** (course-linked tier) → crawl using course name + Regex
- **LearningResource** (skill-focused tier) → crawl using skill name extracted from trends

**What this feature does NOT do:**

- Does not allow students to upload, submit, or manually add resources.
- Does not create new learning materials, skills, or courses — it only crawls and organizes external public content.
- Does not modify existing roadmap definitions — it reads from RoadmapNodeSchema and displays supplementary materials.
- Does not send push notifications or proactively recommend resources — it surfaces curated data when a student views their roadmap or a course node.
- Does not require admin approval before displaying collected resources.

---

## Clarification: User Stories ↔ Capabilities Mapping

To avoid confusion across documents, this table consolidates terminology:

| User Story | Capability | Priority | Crawl Input | Output Data |
|---|---|---|---|---|
| **US1** = Academic Materials | **Cap.1** | **P1** | RoadmapNode.courseName | AcademicDocument (slides, notes, syllabi, exercises from UET/GitHub/external) |
| **US2** = Trending Skills | **Cap.2** | **P2** | RoadmapNode.courseName + StudentProfile | SkillTrendSnapshot (job counts, salary, trend, personalized by career goals) |
| **US3** = Learning Resources | **Cap.3** | **P3** | SkillTrendSnapshot.skillName | LearningResource (courses, videos, articles from Udemy, Coursera, YouTube, etc.) |

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Discover Academic Materials for a UET Course (Priority: P1)

**Independent Test**: Can be fully tested by navigating to a UET course or skill known to have publicly accessible slides, verifying at least one document appears labeled with the correct source type (UET official / GitHub / external), document type (slide / lecture note / syllabus / exercise), and an associated skill name.

**Acceptance Scenarios**:

1. **Given** a student navigates to a UET course view or a skill linked to one, **When** the academic materials section loads, **Then** a list of associated public documents is shown — each with title, source type, document type, and linked skill name.
2. **Given** documents include both UET-official and external sources for the same course, **When** the list is displayed, **Then** UET-official documents appear above external ones.
3. **Given** a document was retrieved from a UET faculty page, **When** displayed, **Then** its source type is clearly marked as "UET official" — distinguishable from "GitHub" or "external."
4. **Given** the system has inferred a skill association for a document based on course name and content, **When** the document is shown, **Then** the inferred skill name is visible on the entry so the student understands the connection.
5. **Given** no public documents are found for a course, **When** the academic materials section is rendered, **Then** an appropriate "no materials found" empty state is shown — not a broken layout or error.

---

### User Story 2 — Discover Trending Skills for a Course (Personalized by Career Goal) (Priority: P2)

A student preparing for "Phát triển ứng dụng web" wants to know which skills are currently most demanded in the job market for THEIR specific career goals. In a dedicated "Market Trends" section on their course node, they see a list of trending skills extracted from recent job postings, but crucially, the results are personalized: if they selected "Software Engineer" as their role and "Startup" as preferred company type during onboarding (Feature 001), the system surfaces exactly the skills that startups are actively hiring for, ranked by relevance to the startup-SWE career path. If instead they prefer "Enterprise" companies, entirely different skills appear (since enterprise hiring differs from startup hiring). Each entry shows job posting count, salary range, and trend indicator (increasing/stable/decreasing). This personalized curation means the student sees market data tailored to THEIR career goal, not generic market trends for the course.

**Why this priority**: This bridges gap between course study and market readiness while personalizing insights to individual career aspirations: course context + market signal + personal relevance = highly actionable guidance. Though it depends on P1 (academic materials), it is strategic enough to justify P2 priority because it compounds value through personalization.

---

### User Story 3 — Browse Learning Resources for Trending Skills (Priority: P3)

A student has discovered trending skills from the Market Insight page for courses they're taking. Now they want to deepen their knowledge by finding high-quality learning resources — courses, videos, tutorials, articles — specifically tailored to master each trending skill. For the skill "React" discovered from "Phát triển ứng dụng web", the system surfaces free and paid courses from Udemy, Coursera, YouTube, and other platforms, ranked by quality signal (rating, view count, enrollment). The student can quickly filter and access learning materials without needing to search the web manually.

**Why this priority**: This capability depends on US2 generating trending skills; it extends the value chain from market insight (US2) to actionable learning resources. Though it comes last in execution, it provides essential learner agency — students can immediately act on trending skill insights by accessing curated resources.

**Independent Test**: Can be fully tested by selecting any trending skill and verifying that a resource list appears with items from at least two different platforms, each correctly labeled free or paid, with title, source, and resource type visible — without any manual action needed to populate the list.

**Acceptance Scenarios**:

1. **Given** a student navigates to a skill page (via Market Insight or skill catalog), **When** the learning resources section loads, **Then** a list of curated learning resources for that skill is shown — each entry displaying title, source platform, resource type, and free/paid indicator.
2. **Given** a skill's resources include both free and paid items, **When** the student views the list, **Then** free and paid status is visible on each entry without requiring the student to open a detail view.
3. **Given** resources come from multiple platforms, **When** the student views the list, **Then** the source platform name is shown for each resource so the student knows where the link leads.
4. **Given** a resource has a quality signal (e.g., rating, enrollment count), **When** the resource is displayed, **Then** that signal is shown alongside the entry to help the student assess quality.
5. **Given** no resources have been collected yet for a skill, **When** a student views that skill, **Then** an appropriate "no resources available yet" message is shown — not a blank section or an error.

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

**Capability 1 — Academic Material Finder**

- **FR-008**: The system MUST automatically search for and retrieve publicly accessible academic documents (slides, lecture notes, syllabi, exercises) related to UET-VNU courses on a recurring scheduled basis.
- **FR-009**: Sources MUST include UET-VNU official public and faculty pages; external sources (GitHub repositories, open educational resource sites) MAY also be included.
- **FR-010**: Each collected academic document MUST record at minimum: title, URL, source type (UET official / GitHub / external), document type (slide / lecture note / syllabus / exercise), associated course name, and linked skill ID.
- **FR-011**: The system MUST infer the skill association for each academic document automatically, based on course name, document title, and available content signals — no manual admin mapping is required.
- **FR-012**: Academic documents from UET-VNU official sources MUST be ranked above documents from external sources in all display contexts.
- **FR-013**: Only documents accessible without authentication MUST be surfaced; any document requiring a login MUST be excluded.

**Capability 2 — Market Skill Trend Tracker**

- **FR-014**: The system MUST collect job posting data from at least 3 of the following 4 sources: TopDev, ITviec, LinkedIn, JobOKO.
- **FR-015**: For each skill, the system MUST extract: job posting count, average salary range (when salary information is present in postings), and trend direction (increasing / stable / decreasing) compared to the previous 7-day period.
- **FR-016**: Trend direction MUST be calculated as: ≥10% increase in job count → "increasing"; ≥10% decrease → "decreasing"; within ±10% → "stable."
- **FR-017**: Job posting data MUST be refreshed once every 24 hours via an automatic background job — no manual trigger is required.
- **FR-018**: Students MUST be able to access a flat ranked list of skills ordered by job demand; each entry MUST display skill name, job posting count, average salary range, and trend direction indicator.
- **FR-019**: Skills with no job postings found MUST still appear in the Market Insight list with a count of 0 and a "stable" trend indicator.

**Capability 3 — Learning Resource Crawler**

- **FR-001**: The system MUST automatically collect learning resources for each skill in the UETCompass skill catalog on a recurring scheduled basis, without any student or administrator action.
- **FR-002**: The system MUST collect resources from at minimum Udemy, Coursera, and YouTube; additional publicly accessible educational platforms (e.g., edX, freeCodeCamp, Viblo) are permitted.
- **FR-003**: Each collected resource MUST record at minimum: title, URL, source platform, resource type (video / article / course / document), free/paid status, quality signal (if available from source), and the linked skill ID.
- **FR-004**: Free or paid status MUST be determined solely from data returned by the source (e.g., price field, free-enrollment indicator) — no manual admin classification is required or permitted.
- **FR-005**: Students MUST be able to view all curated resources for any skill they visit; free/paid status MUST be visible on each resource entry without requiring additional navigation.
- **FR-006**: Resources MUST be associated to skill entities, not to individual student accounts.
- **FR-007**: The system MUST deduplicate resources by URL per skill, ensuring the same resource does not appear multiple times under a single skill.

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
