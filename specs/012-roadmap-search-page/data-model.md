# Data Model: Roadmap Search Page

## Entity: SearchQuery
- Description: User-entered text used to find public/shared roadmaps.
- Fields:
  - `text` (string): Raw query string.
  - `normalizedText` (string): Trimmed query used for execution.
  - `isValid` (boolean): True when `normalizedText.length >= 2`.
  - `debounceMs` (number): Fixed value `300`.
- Validation rules:
  - Query is executable only when length is at least 2.

## Entity: RoadmapSearchResult
- Description: Lightweight item rendered in result list.
- Fields:
  - `_id` (string): Public roadmap identifier.
  - `title` (string): Roadmap title.
  - `description` (string): Short summary text.
  - `sharedAt` (datetime | null): Community share timestamp.
  - `authorDisplay` (string | null): Optional display metadata for UI.
- Validation rules:
  - `_id` and `title` are required for selectable rows.
  - Results must come only from records where `isPublic = true`.

## Entity: RoadmapPreview
- Description: Detailed payload shown in preview panel for selected result.
- Fields:
  - `_id` (string): Previewed roadmap id.
  - `title` (string): Title.
  - `description` (string): Description.
  - `nodes` (array): DAG nodes used by existing roadmap visual component.
  - `status` (string): `ready` | `fallback` | `error` (UI state-derived).
- Validation rules:
  - `nodes` may be empty; UI must render fallback text instead of crashing.
  - Payload is accessible only when source roadmap is public/shared.

## Entity: SearchPageState
- Description: Page-local state controlling list/preview behavior.
- Fields:
  - `query` (SearchQuery)
  - `results` (RoadmapSearchResult[])
  - `selectedRoadmapId` (string | null)
  - `resultsStatus` (enum): `idle` | `searching` | `loaded` | `empty` | `error`
  - `previewStatus` (enum): `idle` | `loading` | `loaded` | `error`
  - `errorMessage` (string | null)
- State transitions:
  - `idle -> searching`: query reaches 2+ chars and debounce timer elapses.
  - `searching -> loaded`: non-empty result set returned; first item auto-selected.
  - `searching -> empty`: empty result set returned.
  - `searching -> error`: search API failure.
  - `loaded -> loading`: selected result changes and preview fetch begins.
  - `loading -> loaded`: preview fetched successfully.
  - `loading -> error`: preview fetch fails.

## Relationships
- A `SearchQuery` produces zero or more `RoadmapSearchResult` records.
- One `RoadmapSearchResult` can map to one `RoadmapPreview` at a time.
- `SearchPageState.selectedRoadmapId` references one member of `results`.
