# Feature Specification: Roadmap Tags

**Feature Branch**: `015-roadmap-tags`  
**Created**: 2026-05-12  
**Status**: Draft  
**Input**: User description: "tôi muốn thêm 1 hệ thống tags cho roadmap gồm 2 luồn chính là thêm sửa xáo tags bên trong sửa manual-roadmap page và dùng tags để search lọc kết quả"

## Clarifications

### Session 2026-05-12

- Q: Trong manual-roadmap page, tags có được tạo mới tự do hay chỉ chọn từ danh mục có sẵn? → A: Kết hợp: chọn từ danh mục và có thể tạo tag mới

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage Tags While Editing a Roadmap (Priority: P1)

As a roadmap editor, I want to add, replace, and remove tags while editing a manual roadmap so that the roadmap can be categorized before it is published or saved.

**Why this priority**: Tag management is the source of truth for the rest of the feature. If users cannot maintain roadmap tags during editing, search filtering has no reliable data to use.

**Independent Test**: Create or open a manual roadmap, change its tags, save it, reopen it, and verify the updated tag list is preserved.

**Acceptance Scenarios**:

1. **Given** a manual roadmap editor with a saved roadmap, **When** the user adds one or more valid tags and saves, **Then** the roadmap retains those tags after reload.
2. **Given** a manual roadmap editor with existing tags, **When** the user removes or replaces a tag and saves, **Then** the roadmap reflects only the updated tags.
3. **Given** a manual roadmap editor and a tag name that does not already exist, **When** the user creates the new tag and saves the roadmap, **Then** the new tag is attached to the roadmap and becomes available for later search filtering.

---

### User Story 2 - Filter Search Results by Tags (Priority: P2)

As a learner browsing roadmaps, I want to search and filter results by tags so that I can quickly narrow the roadmap list to topics I care about.

**Why this priority**: Tag-based filtering is the main discovery benefit of the new system and is the primary way users will consume the tag data.

**Independent Test**: Open the roadmap search experience, apply one or more tag filters, and verify that the result set changes to match the selected tags.

**Acceptance Scenarios**:

1. **Given** a search page with available tags, **When** the user selects a tag filter, **Then** the visible results are limited to roadmaps that match that tag.
2. **Given** multiple tag filters are available, **When** the user selects more than one tag, **Then** the results include roadmaps that match at least one of the selected tags.

---

### User Story 3 - Combine Tags With Existing Search Behavior (Priority: P3)

As a learner, I want tag filters to work together with existing search criteria so that I can refine results without losing the rest of my search intent.

**Why this priority**: This keeps the feature useful in real browsing flows and prevents tags from becoming an isolated filter that users must start over to use.

**Independent Test**: Apply a keyword search and tag filters together, then clear or change the tags and verify that the rest of the search still behaves consistently.

**Acceptance Scenarios**:

1. **Given** a keyword search and one or more tag filters, **When** the user updates the tag selection, **Then** the result list updates without resetting unrelated search criteria.
2. **Given** a tag-filtered search with no matching roadmaps, **When** the user clears the tag filter, **Then** broader results become available again if matching roadmaps exist.

---

### Edge Cases

- Adding the same tag more than once must not create duplicate entries.
- Removing the last remaining tag must leave the roadmap in a valid saved state.
- If a user searches with tags that match nothing, the interface must show a clear empty state.
- If a roadmap already has tags and the user opens it for editing, the existing tags must be visible and editable.
- If a tag is unavailable in the current catalog, existing roadmaps must still render their stored tag labels clearly enough for users to remove or replace them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow users to add tags to a roadmap while editing it in the manual roadmap flow.
- **FR-002**: The system MUST allow users to remove existing tags from a roadmap before saving.
- **FR-003**: The system MUST allow users to replace one roadmap tag with another without losing the rest of the roadmap content.
- **FR-004**: The system MUST preserve a roadmap's saved tags when the roadmap is reopened for viewing or editing.
- **FR-005**: The system MUST prevent duplicate tags from being assigned to the same roadmap.
- **FR-006**: The system MUST allow users to create new tags while editing a roadmap.
- **FR-007**: The system MUST use the same tag set for roadmap editing and roadmap search filtering.
- **FR-008**: The system MUST allow users to filter roadmap search results by one or more selected tags.
- **FR-009**: The system MUST keep tag filtering compatible with existing roadmap search criteria so users can refine results without starting over.
- **FR-010**: The system MUST show a clear empty state when no roadmap matches the selected tag filters.
- **FR-011**: The system MUST display existing tags on a roadmap in a way that allows users to understand, remove, or replace them during editing.

### Key Entities *(include if feature involves data)*

- **Roadmap Tag**: A tag attached to a roadmap, identified by its canonical label and used for categorization and search filtering.
- **Tag Catalog Entry**: A tag definition that can already exist or be created in the manual roadmap editor and then reused for search filtering.
- **Roadmap Tag Assignment**: The association between a roadmap and the tags currently attached to it, including the saved tag list shown during editing and search indexing.
- **Tag Filter Selection**: The set of one or more tags a learner chooses to narrow roadmap search results.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of users can add, remove, or replace roadmap tags and save the roadmap successfully within 2 minutes.
- **SC-002**: At least 95% of saved roadmaps reopen with the same tag list that was last saved.
- **SC-003**: At least 90% of tag-filtered roadmap searches return visible results or a clear no-results state within 3 seconds under normal usage.
- **SC-004**: At least 90% of first-time users can narrow roadmap results with tags without assistance.

## Assumptions

- Tags can be selected from an existing catalog or created in the manual roadmap editor.
- Tags are attached to roadmaps, not to individual roadmap steps.
- Tag changes are saved together with the roadmap content in the same editing flow.
- Tag filtering applies to roadmap discovery and search results, not to unrelated app areas.
- Existing keyword search behavior remains available alongside tag filters.
- When multiple tags are selected, search results must include roadmaps that match at least one selected tag.
