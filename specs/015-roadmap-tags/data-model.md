# Data Model: Roadmap Tags

## ManualRoadmap

Represents a user-authored roadmap stored in `manual_roadmaps`.

### Fields affected by this feature

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `tags` | Array[RoadmapTag] | no | Canonical tag list attached to the roadmap |

### Validation rules

- Tag labels must be non-empty after trimming.
- Duplicate tags are not allowed within the same roadmap.
- Tag labels are stored with a normalized key for comparison and filtering.
- Existing tag values must survive draft save, edit, and publish flows.

## RoadmapTag

Represents a single tag attached to a roadmap.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | String | yes | Human-readable tag text shown in the editor and search UI |
| `normalizedLabel` | String | yes | Lowercased trimmed key used for deduplication and filtering |

### Rules

- `normalizedLabel` is derived from `label`.
- Two tags are considered identical if their `normalizedLabel` values match.
- A roadmap may contain multiple tags, but each normalized label may appear only once.

## TagFilterSelection

Represents the filter state used by search.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | String | no | Existing keyword query text |
| `selectedTags` | Array[String] | no | Normalized labels selected by the user |
| `matchMode` | String | yes | `any` for v1 multi-tag behavior |

### Rules

- `query` and `selectedTags` combine in the same search request.
- Empty `selectedTags` means no tag filtering is applied.
- Multiple selected tags use OR matching (`any`).

## SearchableRoadmapSummary

Represents the public roadmap result returned by search.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `_id` | String | yes | Roadmap identifier |
| `title` | String | yes | Roadmap title |
| `description` | String | no | Short summary |
| `tags` | Array[RoadmapTag] | yes | Tags included in the result card and filter matching |
| `sharedAt` | Date | no | Public sharing timestamp |

## Search request contract

### Manual roadmap public list query

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `q` | String | no | Existing text query |
| `tags` | String or Array[String] | no | Selected normalized tag labels |
| `page` | Number | no | Pagination page |
| `limit` | Number | no | Page size |

### Behavior

- When `tags` is present, the backend filters roadmaps to those that contain at least one selected tag.
- When both `q` and `tags` are present, both filters apply.
- Search results remain public/shared-only.