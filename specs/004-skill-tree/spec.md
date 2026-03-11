# Feature Specification: Skill Tree

**Feature Branch**: `004-skill-tree`  
**Created**: 2026-03-11  
**Status**: Draft  
**Input**: User description: "Build the Skill Tree feature for UETCompass — a personalized academic roadmap system for UET-VNU students."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Personalized Skill Tree (Priority: P1)

A student logs into UETCompass and navigates to the Skill Tree page. They see an interactive directed graph representing their personalized academic roadmap, with courses arranged top-down following prerequisite relationships based on their declared career goal. Courses from their onboarding transcript that are already completed appear as `done`; all others start as `pending`.

**Why this priority**: This is the foundational view upon which all other interactions depend. Without a correctly rendered tree, nothing else in the feature is usable.

**Independent Test**: A student with a completed onboarding profile can navigate to the Skill Tree page and see a correctly structured graph with course nodes in their appropriate initial states (completed courses = `done`, others = `pending`).

**Acceptance Scenarios**:

1. **Given** a student has completed onboarding with a declared career goal, **When** they navigate to the Skill Tree page, **Then** they see an interactive directed graph of relevant courses arranged top-down by prerequisite order
2. **Given** the student's onboarding data includes completed courses, **When** the Skill Tree loads, **Then** those courses are displayed as `done` and all other courses default to `pending`
3. **Given** a course whose prerequisites are not all `done`, **When** the tree renders, **Then** that node appears visually locked and is non-interactable
4. **Given** two students with different career goals, **When** each views their own Skill Tree, **Then** each sees only their own personalized course set with no cross-student data leakage

---

### User Story 2 - Track Progress by Updating Node States (Priority: P2)

A student uses the Skill Tree to track their academic progress. When they begin a course, they click the node to move it from `pending` to `in_progress`. When they complete it, they click again to mark it `done`. This unlocks dependent nodes. Locked nodes (unmet prerequisites) cannot be interacted with.

**Why this priority**: Core interaction model that turns the tree into a living progress tracker rather than a static diagram.

**Independent Test**: A student can click an unlocked `pending` node, transition it to `in_progress`, click again to move it to `done`, observe that a previously locked dependent node becomes unlocked, and confirm that the state is preserved on page refresh.

**Acceptance Scenarios**:

1. **Given** a course node in `pending` state with all prerequisites in `done` state, **When** the student clicks it, **Then** the node transitions to `in_progress`
2. **Given** a course node in `in_progress` state, **When** the student clicks it, **Then** the node transitions to `done`
3. **Given** a course node that has just been marked `done` and all other prerequisites of a dependent node are also `done`, **When** the tree updates, **Then** the dependent node becomes unlocked and interactable
4. **Given** a course node with at least one prerequisite not in `done` state (locked), **When** the student attempts to click it, **Then** no state transition occurs and the locked state is preserved
5. **Given** the student has manually transitioned several nodes, **When** they refresh the page or return in a later session, **Then** all previously set node states are preserved exactly as left

---

### User Story 3 - View Course Detail Panel (Priority: P3)

A student clicks on any node to open a detail side panel. The panel presents three tabs: Resources (course materials), Why This Course (AI-generated career relevance), and Market Skills (industry skills from job platforms). Each tab serves a distinct purpose in enriching the student's learning context.

**Why this priority**: Provides actionable, contextual information that differentiates UETCompass from a plain course catalogue.

**Independent Test**: Clicking any visible course node opens a side panel; each of the 3 tabs loads and displays relevant content for the selected course.

**Acceptance Scenarios**:

1. **Given** a student clicks any course node, **When** the detail panel opens, **Then** it displays the course name, current state, and three tabs: Resources, Why This Course, Market Skills
2. **Given** the Resources tab is selected, **When** course materials exist in the database, **Then** textbooks, lecture slides, lab assignments, and major assignments are all listed separately
3. **Given** the "Why This Course" tab is selected for the first time, **When** the request is sent, **Then** an AI-generated explanation of the course's relevance to the student's career goal is displayed within 5 seconds
4. **Given** the Market Skills tab is selected, **When** data is available, **Then** a list of industry-relevant skills sourced from Vietnamese IT job platforms is displayed (e.g., for "Web Application Development": React.js, Node.js, REST API design)

---

### User Story 4 - Explore Market Skills and Learning Resources (Priority: P4)

From the Market Skills tab, a student clicks on a specific skill (e.g., "React.js") to see a sub-panel with curated learning materials — both free and paid tutorials/courses — so they can self-study that skill independently of the UET curriculum.

**Why this priority**: Creates a direct bridge from academic curriculum to industry skill-building.

**Independent Test**: From the Market Skills tab, clicking a skill name opens a sub-panel or modal showing categorized learning resources (free and paid) for that skill.

**Acceptance Scenarios**:

1. **Given** the Market Skills tab is open and at least one skill is listed, **When** the student clicks a skill, **Then** a sub-panel or modal opens showing learning resources for that skill
2. **Given** the skill sub-panel is open and resources exist, **When** the student views the panel, **Then** resources are visually organized into "Free" and "Paid" categories
3. **Given** the skill sub-panel is open, **When** the student clicks a resource link, **Then** they are directed to the relevant external learning platform

---

### User Story 5 - Re-personalize Skill Tree After Profile Update (Priority: P5)

After updating career goal, current year, or completed courses in the Settings page, a student returns to the Skill Tree and sees a prominent "Re-personalize" button. Clicking it regenerates the tree, reflecting the updated profile — new course set, reordered prerequisites, and refreshed node states.

**Why this priority**: Keeps the roadmap current and accurate as the student's profile evolves over time.

**Independent Test**: After a profile update, the "Re-personalize" button appears on the Skill Tree page; clicking it fully re-renders the tree with updated content.

**Acceptance Scenarios**:

1. **Given** a student has updated their profile (career goal, completed courses, or current year), **When** they navigate to the Skill Tree page, **Then** a prominent "Re-personalize" button is displayed
2. **Given** the "Re-personalize" button is displayed, **When** the student clicks it, **Then** the tree is regenerated and fully re-rendered to reflect the updated profile
3. **Given** the re-personalized tree has loaded, **When** the student views it, **Then** newly completed courses appear as `done`, removed courses are gone, and the course set matches the updated career goal
4. **Given** the student has NOT updated their profile since the last personalization, **When** they view the Skill Tree page, **Then** the "Re-personalize" button is NOT displayed

---

### Edge Cases

- What happens when a student's personalized roadmap has not been generated yet (onboarding incomplete or skipped)?
- What is displayed in the "Why This Course" tab if the AI service is temporarily unavailable?
- What is displayed in the Market Skills tab if no skills data exists for a given course?
- What is displayed in the Resources tab if no materials have been seeded for a given course?
- What happens when a student clicks "Re-personalize" while a previous re-personalization request is still in progress?
- What happens when a student closes the detail panel and opens a different node — is the previously active tab retained for the new node?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the authenticated student's personalized skill tree as an interactive, top-down directed acyclic graph where each node represents a UET curriculum course relevant to the student's declared career goal
- **FR-002**: The system MUST render nodes top-down in prerequisite order, with directed edges representing prerequisite relationships between course nodes
- **FR-003**: Each node MUST visually distinguish between its three possible states: `pending`, `in_progress`, and `done`, using distinct visual styling
- **FR-004**: Each node MUST visually indicate whether it is locked (not all prerequisites `done`) or unlocked (all prerequisites `done`); locked nodes MUST be non-interactable
- **FR-005**: On initial load, nodes corresponding to courses the student completed during onboarding MUST be pre-initialized to `done`; all remaining nodes MUST default to `pending`
- **FR-006**: Students MUST be able to transition node states sequentially by clicking: `pending` → `in_progress` → `done`; no other transitions are permitted
- **FR-007**: A node MUST become interactable only when ALL of its direct prerequisite nodes are in `done` state; partial prerequisite completion MUST NOT unlock a node
- **FR-008**: All node state changes MUST be persisted server-side and survive page reloads and new sessions
- **FR-009**: When a student clicks any course node, the system MUST open a detail side panel with three tabs: Resources, Why This Course, and Market Skills
- **FR-010**: The Resources tab MUST display course materials (textbooks, lecture slides, lab assignments, and major assignments) sourced from the application database
- **FR-011**: The "Why This Course" tab MUST display an AI-generated explanation of why the course is relevant and necessary for the student's declared career goal, generated using course metadata and the student's goal profile
- **FR-012**: The Market Skills tab MUST display a list of industry-relevant skills associated with the course, sourced from Vietnamese IT job platform data (e.g., TopDev, ITviec)
- **FR-013**: Clicking any skill item in the Market Skills tab MUST open a sub-panel or modal listing free and paid learning resources (tutorials and courses) for that skill
- **FR-014**: A "Re-personalize" button MUST appear prominently on the Skill Tree page when the student's profile has been updated since the last tree generation; the button MUST NOT appear otherwise
- **FR-015**: Clicking the "Re-personalize" button MUST trigger re-generation of the personalized roadmap and fully re-render the skill tree with the updated node set, prerequisite ordering, and seeded states
- **FR-016**: Each student MUST only be able to view and interact with their own skill tree; access to another student's tree MUST be prohibited
- **FR-017**: The Skill Tree page MUST be accessible only to authenticated students; unauthenticated requests MUST be rejected

### Key Entities

- **Skill Tree**: The student's complete personalized academic roadmap; scoped to one student and one career goal; contains an ordered set of course nodes derived from the personalization JSON
- **Course Node**: A single UET course in the skill tree; carries a state (`pending`/`in_progress`/`done`), a locked/unlocked status computed from prerequisite states, and references to prerequisite nodes
- **Course Resource**: A learning material item (textbook, slide deck, lab assignment, or major assignment) linked to a course node; pre-seeded by administrators
- **Market Skill**: An industry skill (e.g., "React.js", "REST API design") associated with a course node; populated from Vietnamese IT job platform crawl data
- **Learning Resource**: A tutorial or course (free or paid) linked to a market skill; sourced from crawled or curated data

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Students can view their fully rendered personalized skill tree within 3 seconds of navigating to the page under normal load conditions
- **SC-002**: Node state transitions are visually reflected within 500 milliseconds of a student clicking an unlocked node
- **SC-003**: The course detail side panel opens and displays the default tab within 1 second of a node click
- **SC-004**: AI-generated "Why This Course" content is displayed within 5 seconds of the student selecting that tab
- **SC-005**: Market Skills data is available and displayed for at least 80% of courses in the skill tree
- **SC-006**: Re-personalization fully completes and the updated tree is rendered within 10 seconds of clicking the "Re-personalize" button
- **SC-007**: At least 90% of students can navigate the tree and update at least one node state without external assistance
- **SC-008**: Node states are preserved with 100% consistency across sessions; no state data is lost on page reload or re-login

## Assumptions

- The personalized roadmap JSON (course nodes and prerequisite relationships filtered to the student's career goal) is provided as input by the onboarding/personalization system; this feature does not generate it
- Course resource data (textbooks, slides, lab and major assignments) is pre-seeded into the application database by administrators before students access the feature
- Market skills data is populated and refreshed by a separate job market crawling service; this feature only consumes that data
- AI content for the "Why This Course" tab is generated on-demand by an LLM service accessible to the backend
- Node state transitions are strictly one-directional (`pending` → `in_progress` → `done`); reversal and skipping states are not supported
- The personalized JSON is assumed to represent a valid DAG (no circular prerequisites); this feature does not validate graph integrity
- Students who have not completed onboarding do not yet have a personalized roadmap and will be directed to complete onboarding before accessing the Skill Tree
