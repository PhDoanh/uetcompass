# Research: Roadmap Tags

## Decision 1: Store tags as embedded roadmap metadata
- Decision: Keep tags as an embedded array on each manual roadmap document instead of introducing a separate tag service or microservice.
- Rationale: Tags are authored inside the roadmap editor, reused for roadmap discovery, and need to stay in sync with the roadmap content. Embedding keeps persistence simple, preserves monolith boundaries, and avoids an extra dependency for a feature that is scoped to a single domain.
- Alternatives considered:
  - Separate tag collection with references from roadmaps: rejected because it adds extra writes and sync complexity for a feature that only needs roadmap-scoped tags in v1.
  - Free-text-only tags without normalization: rejected because search/filter options need stable values and duplicate prevention.

## Decision 2: Support both existing tag selection and new tag creation in the editor
- Decision: The manual roadmap editor will allow users to pick from existing tags or create a new tag inline.
- Rationale: This matches the clarified requirement and supports both authoring convenience and discoverability without forcing users into a separate taxonomy-management screen.
- Alternatives considered:
  - Existing-tags-only: rejected because the feature must allow creating tags directly in the editor.
  - Separate tag administration page: rejected because it adds a second workflow not requested by the user.

## Decision 3: Search uses tag filters over the manual roadmap collection
- Decision: Extend the manual roadmap search endpoint to accept tag filters and combine them with the existing keyword query.
- Rationale: The current public roadmap discovery flow already queries `manual_roadmaps`, so extending that path keeps the implementation cohesive and lets one dataset power both editor and search flows.
- Alternatives considered:
  - Build a new search service: rejected because the roadmap module already owns public manual roadmap discovery.
  - Search across multiple roadmap collections: rejected because the feature is limited to manual roadmaps and shared roadmap content.

## Decision 4: Multiple selected tags use OR matching
- Decision: When a user selects more than one tag, results should include roadmaps that match at least one selected tag.
- Rationale: This is the least surprising discovery behavior for a browse/filter experience and aligns with the clarified specification.
- Alternatives considered:
  - AND-only matching: rejected because it would make multi-tag filtering too restrictive for early catalog sizes.
  - Mixed OR/AND modes: rejected for v1 due to unnecessary UI complexity.

## Decision 5: Canonical tag shape is label + normalized key
- Decision: Store each tag with a display label and a normalized key derived from the label.
- Rationale: This gives the editor a friendly display value while search and duplicate detection can rely on a stable normalized form.
- Alternatives considered:
  - Database-generated tag IDs: rejected because the feature does not need a separate tag registry in v1.
  - Raw strings only: rejected because normalization is needed for deduplication and consistent filtering.