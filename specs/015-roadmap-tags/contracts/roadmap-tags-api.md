# Contract: Roadmap Tags API

## Purpose

Define the request and response shape for roadmap tag editing and tag-filtered roadmap search.

## Endpoints

### Create manual roadmap

`POST /api/roadmaps/manual-roadmaps`

#### Request body

```json
{
  "yamlCode": "string",
  "tags": [
    { "label": "string" }
  ]
}
```

#### Behavior

- Tags are optional.
- The server normalizes each tag label before saving.
- Duplicate tag labels are rejected or deduplicated before persistence, depending on validation mode.

### Update manual roadmap

`PATCH /api/roadmaps/manual-roadmaps/:roadmapId`

#### Request body

```json
{
  "yamlCode": "string",
  "tags": [
    { "label": "string" }
  ]
}
```

#### Behavior

- Tags replace the saved tag list for the draft roadmap.
- Existing tags remain visible when the roadmap is reopened.

### List public manual roadmaps

`GET /api/roadmaps/manual-roadmaps/public?q=...&tags=...&page=1&limit=20`

#### Query parameters

| Name | Type | Description |
| --- | --- | --- |
| `q` | String | Optional keyword query |
| `tags` | String or repeated query values | Optional normalized tag filters |
| `page` | Number | Page number |
| `limit` | Number | Page size |

#### Behavior

- `q` and `tags` are combined with AND semantics.
- Multiple `tags` values use OR semantics.
- Only public/shared roadmaps are returned.

### Get available tags

`GET /api/roadmaps/manual-roadmaps/tags`

#### Behavior

- Returns the distinct tag list derived from public manual roadmaps.
- The result supports editor tag suggestions and search filter options.

## Response shape

### Manual roadmap summary

```json
{
  "_id": "string",
  "title": "string",
  "description": "string",
  "tags": [
    { "label": "string", "normalizedLabel": "string" }
  ]
}
```

### Public list payload

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```
