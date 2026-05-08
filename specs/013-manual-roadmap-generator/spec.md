# Feature Specification: Manual Roadmap Generator

**Feature Branch**: `013-manual-roadmap-generator`  
**Created**: April 7, 2026  
**Status**: Draft  
**Input**: User description: "i want to create a manual roadmap generator for user to build roadmap by using structured code to later make it easy to share to comunity and make ajustment, this window canbe reuse to maybe some existed admin to create template roadmap for reuse and modify"

## Clarifications

### Session 2026-04-07

- Q: What format does the "structured code" use? → A: YAML
- Q: What does the visual representation of the roadmap look like? → A: Graph
- Q: Is roadmap sharing public to all community members, or with permissions? → A: Public
- Q: How are admin users designated and authenticated? → A: no admin just user
- Q: How are concurrent edits to the same roadmap handled? → A: users create their own versions

### Session 2026-04-09

- Q: What is the schema for the YAML structured code? → A: DAG with nodes and directed edges
- Q: What technology/library is used for the graph visualization? → A: jsobject and react flow
- Q: What database technology is used for storing roadmaps? → A: MongoDB
- Q: What are the size limits for the structured code? → A: 10KB per roadmap
- Q: Should the manual roadmap data model match Feature 009? → A: Yes, align with 009
- Q: Should node functions use Feature 004 skill-tree semantics? → A: Yes, node statuses and unlock logic follow 004

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create Roadmap with Structured Code (Priority: P1)

As a user, I want to build a roadmap by inputting structured code so that I can define my learning or project path easily.

**Why this priority**: This is the core functionality for manual roadmap creation.

**Independent Test**: Can be tested by inputting valid structured code and verifying the roadmap is generated and displayed correctly.

**Acceptance Scenarios**:

1. **Given** a user is on the roadmap generator page, **When** they input valid structured code, **Then** the roadmap is created and displayed.
2. **Given** a user inputs invalid structured code, **When** they attempt to create the roadmap, **Then** an error message is shown with suggestions for correction.

---

### User Story 2 - Share Roadmap to Community (Priority: P2)

As a user, I want to share my created roadmap to the community so that others can view and learn from it.

**Why this priority**: Enables community engagement and sharing of knowledge.

**Independent Test**: Can be tested by creating a roadmap, sharing it, and verifying it appears in the community section.

**Acceptance Scenarios**:

1. **Given** a user has created a roadmap, **When** they choose to share it, **Then** it becomes visible to community members.
2. **Given** a shared roadmap, **When** a community member views it, **Then** they can see the structured code and the visual representation.

---

### User Story 3 - Adjust Existing Roadmap (Priority: P3)

As a user, I want to edit my roadmap by modifying the structured code so that I can make adjustments as needed.

**Why this priority**: Allows for iterative improvement of roadmaps.

**Independent Test**: Can be tested by editing the structured code of an existing roadmap and verifying the changes are reflected.

**Acceptance Scenarios**:

1. **Given** an existing roadmap, **When** the user modifies the structured code, **Then** the roadmap updates accordingly.
2. **Given** invalid changes, **When** saved, **Then** errors are shown without losing the original.

### Edge Cases

- What happens when structured code exceeds 10KB size limits? Error message shown.
- How does system handle concurrent edits to the same roadmap? Users create their own versions.
- What if community sharing is disabled for certain users?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to input and edit structured code to define roadmaps.
- **FR-002**: System MUST validate the syntax and structure of the input code.
- **FR-003**: System MUST generate and display a visual representation of the roadmap from the structured code.
- **FR-004**: System MUST allow users to save their roadmaps.
- **FR-005**: System MUST provide public sharing functionality to make roadmaps visible to all community members.
- **FR-006**: System MUST allow users to adjust existing roadmaps by editing the code.
- **FR-007**: System MUST provide hardcoded roadmap suggestions on the main page.
- **FR-008**: System MUST ensure shared roadmaps only appear in the community section.
- **FR-009**: System MUST allow users to create their own versions of roadmaps for concurrent editing.
- **FR-010**: System MUST use a roadmap data model aligned with Feature 009's canonical `roadmaps` schema.
- **FR-011**: System MUST support node functions consistent with Feature 004 skill-tree semantics, including explicit status transitions and unlock rules.
## Non-Functional Requirements

- **NFR-001**: System MUST use MongoDB for data storage.
### Key Entities *(include if feature involves data)*

- **Roadmap**: Represents a user's created roadmap, with structured code in YAML format defining a DAG (nodes and directed edges), visual representation, and metadata like title, description. The data model aligns with Feature 009's canonical `roadmaps` schema.
- **Roadmap Node**: Represents a single roadmap element with node metadata, dependencies, and status. Node functions follow Feature 004 skill-tree semantics, including explicit `pending`, `in_progress`, and `done` transitions and prerequisite unlock rules.
- **Template**: A pre-defined roadmap structure created by admins, available for users to clone and modify.
- **User**: Individuals who create, share, and adjust roadmaps.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a basic roadmap using structured code in under 5 minutes.
- **SC-002**: 95% of valid structured code inputs result in successful roadmap generation.
- **SC-003**: Shared roadmaps receive at least 10 views within the first week of sharing.
- **SC-004**: System handles up to 1000 concurrent roadmap creations without performance degradation.

## Assumptions

- Structured code refers to YAML format for describing roadmap elements like milestones, tasks, dependencies.
- Community sharing is public within the platform.
- Roadmaps include visual elements like graphs.

## Dependencies

- User authentication system.
- Database for storing roadmaps.
- Code editor or input interface for structured code.</content>
<parameter name="filePath">D:\Desktop\compass\uetcompass\specs\013-manual-roadmap-generator\spec.md