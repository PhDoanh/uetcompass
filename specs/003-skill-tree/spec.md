# Feature Specification: Skill Tree – Visual Career Path Tracker

**Feature Branch**: `003-skill-tree`  
**Created**: 2026-03-09  
**Status**: Draft  
**Input**: User description: "Skill Tree with 3 node states (Pending, InProgress, Done) for student career path visualization, manual status updates, auto-unlock of dependent nodes, progress tracking, and next-step recommendations aligned to a chosen career goal."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 – View Personal Skill Tree (Priority: P1)

A student who has completed onboarding (uploaded their transcript and selected a career goal) opens the Skill Tree page and sees their personalized learning path rendered as a collapsible, color-coded tree. Each node on the tree is a course or skill required to reach their career goal, and each node shows its current status at a glance.

**Why this priority**: This is the entry point for all other interactions. Without a visible, meaningful tree, no other feature delivers value.

**Independent Test**: Can be fully tested by navigating to the Skill Tree page as an onboarded student and confirming the tree renders correctly with correctly colored and labeled nodes.

**Acceptance Scenarios**:

1. **Given** a student has completed onboarding with a transcript and career goal, **When** they open the Skill Tree page, **Then** the full learning path is displayed as a collapsible tree with at least one visible branch.
2. **Given** the tree is loaded, **When** the student inspects a node, **Then** it shows a name, its current status (Pending / In Progress / Done), and is visually distinct from nodes in other states (different color and icon).
3. **Given** a node has all prerequisites in Done status, **When** the tree loads, **Then** that node appears as unlocked and available for interaction.
4. **Given** a node has at least one prerequisite that is not Done, **When** the tree loads, **Then** that node appears as Pending (locked) and cannot be interacted with.
5. **Given** the tree has both course nodes and skill nodes, **When** displayed, **Then** they are visually distinguishable from each other.

---

### User Story 2 – Update Node Status & Auto-Unlock Dependents (Priority: P1)

A student marks a node as "In Progress" or "Done." When all prerequisites of a child node are marked Done, that child node automatically unlocks — becoming available for the student to engage with. Progress percentage and next-step recommendations update to reflect the change.

**Why this priority**: This is the primary action students take to maintain an accurate reflection of their progress. Auto-unlock drives the sense of advancement.

**Independent Test**: Can be fully tested by marking a node as Done and verifying that all child nodes whose only prerequisite was that node become unlocked, and that the progress bar updates accordingly.

**Acceptance Scenarios**:

1. **Given** an unlocked node is in Pending state, **When** the student selects "Mark In Progress," **Then** the node changes to In Progress (orange, ⚡ icon) immediately.
2. **Given** an unlocked node is in In Progress state, **When** the student selects "Mark Done," **Then** the node changes to Done (green, ✅ icon) immediately.
3. **Given** node "Lập trình Web" is the sole prerequisite of "React," **When** "Lập trình Web" is marked Done, **Then** the "React" node auto-unlocks (changes from locked Pending to actionable Pending) within 1 second, with no page reload required.
4. **Given** a node has multiple prerequisites, **When** only some prerequisites are Done, **Then** the node remains locked.
5. **Given** a status change occurs, **When** the tree re-renders, **Then** the progress bar percentage and the "Next Steps" recommendation update in the same view without a page reload.

---

### User Story 3 – View Progress & Next-Step Recommendations (Priority: P1)

A student sees an overall progress bar showing the percentage of nodes on their path that are Done. Below the tree (or in a summary panel), 1–3 next recommended nodes are surfaced — the most logical unlocked nodes for the student to start next based on their current position on the path.

**Why this priority**: The progress bar and recommendations convert the tree from a passive visualization into an active coaching tool, motivating students to continue.

**Independent Test**: Can be fully tested by confirming the progress percentage equals the count of Done nodes divided by total path nodes, and that recommended nodes are valid unlocked Pending nodes.

**Acceptance Scenarios**:

1. **Given** a path has N total nodes and D nodes are in Done status, **When** the student views the tree, **Then** the progress bar displays D ÷ N × 100% (rounded to nearest whole number).
2. **Given** the student has at least one unlocked-but-not-Done node, **When** viewing the tree, **Then** 1–3 recommended next nodes are shown in a "Next Steps" section.
3. **Given** a student marks a node Done, **When** the tree updates, **Then** the progress bar and Next Steps section reflect the new state immediately.
4. **Given** all nodes are Done, **When** viewing the tree, **Then** progress shows 100% and Next Steps shows a completion message instead of node recommendations.

---

### User Story 4 – Edge Case: Minimal Progress (First-Year Student) (Priority: P1)

A first-year student with only 2 completed courses and a "Frontend Developer" career goal opens the Skill Tree. The tree must show a meaningful, non-empty learning path leading from their current courses toward the goal.

**Why this priority**: The system must be useful from day one of enrollment, not just for students who are far along in their studies.

**Independent Test**: Can be fully tested by logging in as a student with exactly 2 Done courses and confirming the tree shows their full recommended forward path (e.g., Internet Basics → HTML/CSS → JavaScript → React → …).

**Acceptance Scenarios**:

1. **Given** a student has only 2 courses marked Done and a Frontend Developer goal, **When** the Skill Tree loads, **Then** the tree is non-empty and shows a continuous path from their current state through all remaining milestones.
2. **Given** the tree for a first-year student, **When** rendered, **Then** the 2 Done courses appear green ✅ and all subsequent nodes appear in Pending state, correctly unlocked or locked per their prerequisites.
3. **Given** the first-year student's tree, **When** the progress bar is shown, **Then** it reflects their actual percentage (e.g., 2 ÷ total path nodes × 100%).

---

### User Story 5 – Bilingual Display (Priority: P2)

A student switches the display language between Vietnamese and English. All node names, status labels, and UI text update accordingly.

**Why this priority**: Supporting both languages is important for accessibility but does not affect the core tree functionality.

**Independent Test**: Can be fully tested by toggling the language switcher and confirming all visible node names and labels change language.

**Acceptance Scenarios**:

1. **Given** the tree is displayed in Vietnamese, **When** the student selects "English," **Then** all node names and status labels switch to English with no page reload.
2. **Given** the tree is displayed in English, **When** the student selects "Tiếng Việt," **Then** all node names and status labels switch to Vietnamese.
3. **Given** a language preference has been set, **When** the student returns to the page, **Then** the last selected language is remembered and applied.

---

### Edge Cases

- What happens when a student has not yet completed onboarding (no transcript or no career goal selected)? → Show an empty state with a prompt to complete onboarding.
- What happens when a node is a shared prerequisite for multiple children? → The node's unlock status is evaluated independently: it becomes active only when all of its own prerequisites are Done.
- What happens if a student's transcript lists a course not on their chosen career goal path? → Extra courses are not shown in the career path tree but are otherwise acknowledged.
- What happens when the tree has 100 nodes? → Nodes outside the immediate view are collapsible and the total load time stays within the performance threshold.
- What if two branches of the path share a common prerequisite and it gets marked Done? → All dependent nodes on both branches re-evaluate their unlock condition simultaneously.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the student's personalized career path as a collapsible tree of nodes, grouped into branches that can each be expanded or collapsed individually.
- **FR-002**: Each node MUST display its type (Course or Skill) and current status using distinct visual indicators: Pending/locked (grey, 🔒), In Progress (orange, ⚡), Done (green, ✅).
- **FR-003**: Students MUST be able to manually change an unlocked node's status between Pending, In Progress, and Done via a clearly visible control (button or dropdown).
- **FR-004**: The system MUST automatically unlock a child node the moment all of its prerequisites reach Done status, without requiring a page reload.
- **FR-005**: The system MUST display a progress bar showing the percentage of Done nodes out of the total nodes on the student's path, calculated as: Done count ÷ total path nodes × 100%.
- **FR-006**: The system MUST surface 1–3 recommended next nodes in a dedicated "Next Steps" area, selecting from nodes that are currently unlocked but not yet started.
- **FR-007**: The system MUST always display a non-empty, goal-directed tree for any onboarded student, regardless of how few courses they have completed.
- **FR-008**: Status changes MUST be reflected across all open sessions belonging to the same student within 3 seconds, without requiring a page reload.
- **FR-009**: The system MUST support Vietnamese and English display for all node names and UI labels, with the selected language persisted across sessions.
- **FR-010**: A node MUST be locked and non-interactive for any student who has at least one prerequisite not in Done status.

### Non-Functional Requirements

- **NFR-001**: The Skill Tree page MUST load and render fully within 2 seconds for career paths containing 50–100 nodes.
- **NFR-002**: Node status changes MUST propagate and be visually reflected in the current session within 1 second.

### Key Entities

- **Skill Tree**: One student's complete, ordered learning path toward their chosen career goal. Contains all nodes from their current milestone through goal completion.
- **Skill Node**: A single learning milestone — either a university course or a standalone skill. Has a bilingual name (Vietnamese and English), a type (Course or Skill), a current status (Pending / In Progress / Done), a list of prerequisite nodes, a list of child nodes, and an unlocked flag.
- **Node Status**: The three possible states for a node — Pending (not yet started, may be locked), In Progress (actively being worked on), Done (completed). A Pending node may be either locked (has incomplete prerequisites) or actionable (all prerequisites are Done).
- **Career Goal**: The target role or profession chosen by the student during onboarding; defines the structure and content of the Skill Tree.
- **Progress**: The ratio of Done nodes to total path nodes, expressed as a percentage and shown as a visual progress bar.

### Assumptions

- Students have completed the onboarding flow (profile + transcript + career goal selection) defined in Feature 001 before accessing the Skill Tree.
- The prerequisite relationships between nodes are pre-defined by the curriculum data seeded in Feature 002 (CTDT DAG).
- A student's career goal determines which subset of the full curriculum graph constitutes their personal Skill Tree path.
- The language preference toggle is a per-account setting, defaulting to Vietnamese.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Skill Tree page loads and is fully interactive within 2 seconds for any onboarded student on a standard connection, for paths containing up to 100 nodes.
- **SC-002**: When a student marks a node as Done, all newly unlocked child nodes appear in the tree within 1 second, with no page reload required.
- **SC-003**: The progress percentage is mathematically accurate for all 10 distinct student profiles tested, spanning from Year 1 (2 completed courses) through near-graduation (full path minus 1 node).
- **SC-004**: A first-year student with exactly 2 Done courses and a Frontend Developer goal sees a complete, non-empty forward path (at minimum: Internet Basics → HTML/CSS → JavaScript → React) upon first load.
- **SC-005**: All three node states (Pending, In Progress, Done) are distinguishable by both color and icon, ensuring students can understand the tree without relying on color alone (accessibility standard).
- **SC-006**: Language switching between Vietnamese and English applies correctly to 100% of node names and status labels, with the preference retained on the next visit.
- **SC-007**: A status change made in one browser session is visible in a concurrently open second session for the same student within 3 seconds.

