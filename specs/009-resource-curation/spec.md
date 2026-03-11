# Feature Specification: Resource Curation

**Feature Branch**: `009-resource-curation`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Build the Resource Curation feature for UETCompass — a brand-new subsystem responsible for automatically gathering, classifying, and surfacing external learning resources for students."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – Browse Curated Learning Resources for a Skill (Priority: P1)

A student viewing their personalized roadmap selects a skill (e.g. "React"). They see a list of curated learning resources for that skill — both free and paid — automatically crawled from Udemy, Coursera, YouTube, edX, freeCodeCamp, and Viblo. Resources are clearly distinguishable as free or paid at a glance, without the student needing to leave UETCompass or search manually.

**Why this priority**: This directly delivers the core value of the feature — replacing manual external searches with an in-app curated experience anchored to the student's current skill focus.

**Independent Test**: Can be fully tested by selecting any major skill in the catalog and verifying that at least 5 resources (mix of free and paid) appear with correct classifications, sourced from the supported platforms.

**Acceptance Scenarios**:

1. **Given** a student views a skill's detail page, **When** the page loads, **Then** a list of curated learning resources for that skill is displayed, each showing title, source platform, type (video/article/course/document), and free/paid indicator.
2. **Given** resources are listed for a skill, **When** the student scans the list, **Then** at least 5 resources are present for any major skill in the catalog.
3. **Given** a resource in the list, **When** the student looks at it, **Then** the free/paid status is determined exclusively from source data — no manual admin tagging is reflected or required.
4. **Given** a student selects a resource, **When** they tap or click on it, **Then** they are navigated to the original resource URL on the external platform.
5. **Given** the resource list, **When** a rating or quality signal is available from the source, **Then** it is displayed alongside the resource entry.
6. **Given** no resources have been crawled yet for a skill, **When** the student opens that skill's page, **Then** the system displays a graceful empty state message rather than showing an error.

---

### User Story 2 – Find Lecture Slides and Materials for a UET Course (Priority: P2)

A student preparing for a UET-VNU course (e.g. "Lập trình web") opens the course or skill detail page. The system surfaces publicly available slides, lecture notes, syllabi, and exercises automatically linked to the relevant skill — gathered from UET faculty pages, GitHub repositories, and open educational resource sites — without any manual admin mapping.

**Why this priority**: UET-specific academic materials are highly relevant to the target audience and cannot be found on Udemy/Coursera; this fills a gap that general resource crawling cannot address.

**Independent Test**: Can be fully tested by checking the document list for a UET course with known public materials (e.g. "Lập trình web") and verifying that documents are displayed, classified by type, and linked to the correct skill — with no manual admin action having occurred.

**Acceptance Scenarios**:

1. **Given** a student opens a UET course or related skill, **When** the page loads, **Then** a list of academic documents (slides, lecture notes, syllabi, exercises) is shown, each displaying title, URL, source type (UET official / GitHub / external), associated course name, and document type.
2. **Given** a document list is shown, **When** the student scans it, **Then** documents sourced from UET-VNU official pages appear ranked above those from GitHub or other external sources.
3. **Given** documents from multiple source types are present, **When** the student views a document, **Then** the source type is clearly labeled (UET official / GitHub / external).
4. **Given** a skill has documents retrieved from UET official pages and from GitHub, **When** ranking is applied, **Then** UET official documents consistently appear first.
5. **Given** a document in the list, **When** the student clicks it, **Then** they are taken to the original publicly accessible URL — no authentication is required to access it.
6. **Given** the skill-to-course mapping process, **When** documents are ingested, **Then** a document is linked to a skill based on course name, document title, and content signals — no manual admin assignment is needed.

---

### User Story 3 – Check Which Skills Are Hot on the Market (Priority: P2)

A student exploring career options opens the Market Insight section. They see a ranked list of skills showing job count, average salary range, and a trend indicator (up/stable/down), refreshed daily from TopDev, ITviec, LinkedIn, and JobOKO. The student can scan and interpret the full list in under 30 seconds.

**Why this priority**: Market trend data provides career-oriented context that helps students prioritize which skills to develop next — a distinct and high-value complement to the skill catalog.

**Independent Test**: Can be fully tested by opening the Market Insight section on any given day, verifying that the list contains skills with job counts, salary ranges, and trend indicators, and confirming the data was refreshed within the past 24 hours from at least 3 of the 4 specified job boards.

**Acceptance Scenarios**:

1. **Given** a student opens the Market Insight section, **When** the page loads, **Then** a flat, ranked list of skills is displayed, each showing: skill name, job count, average salary range, and trend indicator (↑/→/↓).
2. **Given** the market trend list, **When** data was last refreshed, **Then** it reflects information collected within the past 24 hours.
3. **Given** data is sourced from job boards, **When** the list is computed, **Then** job counts and salary ranges are derived from at least 3 of the 4 specified platforms: TopDev, ITviec, LinkedIn, JobOKO.
4. **Given** a skill's trend indicator, **When** it is displayed, **Then** it reflects movement compared to the previous refresh period (more jobs = ↑, roughly equal = →, fewer jobs = ↓).
5. **Given** a student views the list, **When** they scan it, **Then** the entire list is designed to be scannable and interpretable in under 30 seconds — no charts or complex visualizations are shown.
6. **Given** a job board is temporarily unavailable during a refresh cycle, **When** the daily job runs, **Then** data from remaining available boards is still collected and used — the refresh is not fully blocked by a single source failure.

---

### User Story 4 – Resources Are Always Up-to-Date Without Manual Action (Priority: P3)

The system runs background crawling jobs on a schedule for both learning resources (Capability 1) and academic slides (Capability 2). No student action, admin trigger, or manual configuration is required to keep the data fresh. Students simply benefit from a continuously maintained corpus.

**Why this priority**: The value of all three capabilities depends on fresh, automatically maintained data. Without scheduled automation, the feature degrades over time without any visible failure signal.

**Independent Test**: Can be fully tested by verifying that resource and document records are updated over time without any user or admin interaction — specifically that new crawl results appear and stale data is refreshed on schedule.

**Acceptance Scenarios**:

1. **Given** the system is running normally, **When** a scheduled crawl cycle executes for learning resources, **Then** new or updated resources are added to the data store for all skills in the catalog.
2. **Given** the system is running normally, **When** a scheduled crawl cycle executes for academic documents, **Then** newly discovered public documents are added and linked to the appropriate skills.
3. **Given** a crawl completes, **When** new resources are stored, **Then** students browsing skill pages see the updated data on their next load — no manual refresh or admin publish step is required.
4. **Given** a crawl job encounters an error for one source (e.g., Udemy is unreachable), **When** the job runs, **Then** other sources continue to be crawled and the partial results are still saved.

---

### Edge Cases

- What happens when a skill in the catalog has no resources from any crawled source after a full crawl cycle?
- How does the system handle duplicate resources discovered from multiple sources (same URL, different platforms)?
- What if the free/paid signal is ambiguous or missing from the source data for a resource?
- What if a previously public UET document URL becomes inaccessible between crawl cycles?
- What happens when all 4 job board sources are unavailable on a given day — does the market trend data show stale results or an explicit staleness indicator?
- How does the system handle a skill that appears in job postings but is not yet in the UETCompass skill catalog?

---

## Requirements *(mandatory)*

### Functional Requirements

**Capability 1 — Learning Resource Crawler**

- **FR-001**: The system MUST automatically crawl learning resources (courses, videos, articles, documents) from Udemy, Coursera, and YouTube as primary sources.
- **FR-002**: The system MUST also crawl additional publicly accessible educational platforms including edX, freeCodeCamp, and Viblo.
- **FR-003**: For each crawled resource, the system MUST capture: title, URL, source platform, resource type (video / article / course / document), free/paid flag, rating or quality signal (if available), and linked skill ID from the UETCompass skill catalog.
- **FR-004**: The free/paid classification for every resource MUST be determined solely from source data (e.g., price field, "free enroll" indicator) — no manual admin tagging is required.
- **FR-005**: Crawling MUST run on a scheduled basis with no student or admin action required to trigger it.
- **FR-006**: Each resource MUST be associated to a skill entity in the UETCompass skill catalog — resources are not linked directly to individual users.

**Capability 2 — Academic Slide & Lecture Finder**

- **FR-007**: The system MUST automatically search for and retrieve publicly accessible academic documents (slides, lecture notes, syllabi, exercises) related to UET-VNU courses.
- **FR-008**: Sources for academic documents MUST include: UET-VNU official public pages and faculty pages, publicly accessible GitHub repositories, and open educational resource sites with public Google Drive links.
- **FR-009**: For each academic document, the system MUST capture: title, URL, source type (UET official / GitHub / external), associated course name, linked skill ID, and document type (slide / lecture note / syllabus / exercise).
- **FR-010**: Skill-to-course mapping MUST be inferred automatically based on course name, document title, and content signals — no manual admin mapping is required.
- **FR-011**: The system MUST only retrieve documents that are publicly accessible without authentication.
- **FR-012**: In display ranking, documents sourced from UET-VNU official pages MUST be ranked above documents from external sources.

**Capability 3 — Market Skill Trend Tracker**

- **FR-013**: The system MUST crawl job postings from TopDev, ITviec, LinkedIn, and JobOKO to identify skills in demand.
- **FR-014**: For each skill identified from job postings, the system MUST capture: job count, average salary range, and trend direction (increasing / stable / decreasing) compared to the previous refresh period.
- **FR-015**: Market trend data MUST be refreshed once per day via a background job — no manual trigger is required.
- **FR-016**: If a job board source is unavailable during a daily refresh, the system MUST still collect data from the remaining available sources and store partial results.
- **FR-017**: Students MUST be able to view a flat ranked list of skills showing: skill name, job count, average salary range, and trend indicator.
- **FR-018**: All three capabilities (learning resources, academic documents, market trends) MUST be anchored to skill entities in the existing UETCompass skill catalog.

### Key Entities

- **Learning Resource**: An external resource (video, course, article, document) from a supported crawl source. Key attributes: title, URL, source platform, resource type, free/paid flag, quality signal, linked skill ID, last crawled timestamp.
- **Academic Document**: A publicly accessible academic file from UET or affiliated sources. Key attributes: title, URL, source type, associated course name, linked skill ID, document type, last crawled timestamp.
- **Market Trend Record**: A daily snapshot of job-market demand for a skill. Key attributes: linked skill ID, job count, average salary range, trend direction, data date, contributing sources.
- **Crawl Job**: A scheduled background task responsible for executing a crawl cycle for one or more capabilities.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A student can find at least 5 curated resources (including a mix of free and paid) for any major skill in the catalog within the UETCompass interface, without leaving the app to search externally.
- **SC-002**: 100% of resources in the system have their free/paid status determined from source data alone — no manually tagged resources exist.
- **SC-003**: Academic documents for UET courses are discoverable and linked to the correct skill with no manual admin intervention at any point in the process.
- **SC-004**: Market trend data is refreshed at least once every 24 hours and reflects real job posting signals from at least 3 of the 4 specified job board sources.
- **SC-005**: A student can scan the market trend skill list and identify the top demanded skills and their directional trends in under 30 seconds.
- **SC-006**: A single source failure (one job board unavailable, one platform unreachable) does not prevent a crawl cycle from completing and producing results from the remaining sources.

---

## Assumptions

- The UETCompass skill catalog already exists and is the single authoritative source of skill identities; all three capabilities link their data to skill IDs defined there.
- "Publicly accessible" means no login, paywall, or special credentials are required to retrieve the content at crawl time.
- Salary ranges extracted from job postings are treated as approximate averages and are displayed as-is without normalization to a single currency (postings are expected to be in VND or USD from Vietnamese/regional boards).
- There is no requirement for real-time crawling; scheduled batch jobs are the intended delivery mechanism for all three capabilities.
- Crawl frequency for Capabilities 1 and 2 (learning resources and academic documents) is assumed to be at least weekly; exact frequency is not specified and may be tuned during planning.
- The student-facing presentation for Capabilities 1 and 2 is integrated into the existing skill/course detail pages; no separate standalone discovery page is required unless determined during planning.
- Skills that appear in job postings but do not yet exist in the UETCompass skill catalog are not surfaced in the market trend list; they may be flagged for catalog review as a future enhancement.
