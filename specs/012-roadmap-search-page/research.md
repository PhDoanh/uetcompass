# Research: Roadmap Search Page

## Decision 1: Search source will be public/shared manual roadmaps only
- Decision: Use `manual_roadmaps` where `isPublic: true` as the primary searchable source.
- Rationale: Matches clarified scope (public/shared only), aligns with existing share flow, and avoids merging incompatible private/personal roadmap datasets.
- Alternatives considered:
  - Mix public JSON files and manual roadmap documents in one query path: rejected for inconsistent schema and sorting behavior.
  - Include authenticated private drafts in search: rejected by clarified requirement scope.

## Decision 2: Extend existing public listing API with query filtering
- Decision: Add optional `q` parameter to the existing public listing path (`/api/roadmaps/manual-roadmaps/public`) for title-based search.
- Rationale: Reuses existing endpoint/service patterns and pagination contract, minimizing API surface area.
- Alternatives considered:
  - Create a separate `/search` endpoint: rejected as redundant for current scope and would duplicate pagination/filter logic.
  - Filter client-side after loading all items: rejected for performance and scalability concerns.

## Decision 3: Add a dedicated public preview-by-id endpoint
- Decision: Provide an endpoint to fetch preview payload by selected public roadmap id (title/description/nodes/share metadata).
- Rationale: Result list should stay lightweight; preview should fetch richer payload on selection with explicit error handling.
- Alternatives considered:
  - Embed full nodes in search list payload: rejected due to larger response size and unnecessary transfer for unselected items.
  - Continue preview by roadmap name only: rejected due to non-unique title risk.

## Decision 4: Navbar search input click navigates to split-screen page
- Decision: Clicking the global navbar search input navigates to `/roadmaps/search` and focuses the page search input.
- Rationale: Satisfies P1 journey and gives deterministic entry to dedicated discovery workflow.
- Alternatives considered:
  - Keep search in-place with dropdown suggestions: rejected because requested UX is a full split-screen page.
  - Navigate only on Enter: rejected because requirement is click-to-jump.

## Decision 5: Search execution strategy uses 300ms debounce + 2-char minimum
- Decision: Trigger API calls automatically after 300ms inactivity and only when query length >= 2.
- Rationale: Directly implements clarified behavior, balances responsiveness and request volume, and prevents noisy one-character calls.
- Alternatives considered:
  - Enter key only: rejected by clarification.
  - 500ms debounce: rejected as less responsive than selected behavior.

## Decision 6: Selection and preview synchronization policy
- Decision: After each successful search response, auto-select and preview the first result; user clicks override selection for that result set.
- Rationale: Matches clarification and keeps right pane useful immediately.
- Alternatives considered:
  - No auto-selection: rejected by clarification.
  - Persist previous selected id across all result sets: rejected because clarified rule prefers first result on each successful search.

## Decision 7: Stale request and error handling pattern
- Decision: Use request cancellation/ignore-stale strategy in frontend and deterministic state machine (`idle`, `searching`, `loaded`, `empty`, `error`, `preview_loading`, `preview_error`).
- Rationale: Prevents out-of-order response flicker and supports edge-case requirements for rapid typing.
- Alternatives considered:
  - Fire-and-forget requests with last-write-wins in render only: rejected due to race-condition ambiguity.
  - Full global state solution for this feature: rejected as unnecessary complexity for page-local behavior.
