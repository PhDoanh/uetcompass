# Data Model for AI Auto-Tagging System

This document enumerates the primary entities, their attributes, and relations.

## Bounded Context Ownership

- `Skill` and `Tag` in this feature belong to the **tagging/search bounded context**.
- They are canonical data structures for tagging + search behavior and are **not** `roadmap-core` entities.

## Skill
Represents a competency extracted from a course or other source.

| Field        | Type     | Description                              | Notes                          |
|--------------|----------|------------------------------------------|--------------------------------|
| _id          | ObjectId | Primary key                              |                                |
| name         | String   | Human-readable skill name                | indexed                        |
| description  | String   | Optional short description from source   |                                |
| sourceCourse | ObjectId | Reference to `Course` (if applicable)    | optional; for analysis         |
| domain       | String   | e.g., "IT", "Marketing"              | used to provide context to LLM |
| tags         | [SkillTag] | Canonical search-ready tag metadata    | overwritten on re-tagging      |
| createdAt    | Date     | Ingestion timestamp                      | indexed                        |

### SkillTag (embedded metadata in `Skill.tags`)

| Field          | Type     | Description                                      | Notes                                  |
|----------------|----------|--------------------------------------------------|----------------------------------------|
| tagId          | ObjectId | Reference to `Tag` dictionary entry              | required                               |
| normalizedName | String   | Canonical normalized tag key (e.g., `javascript`) | required; lowercase + trimmed          |
| confidence     | Number   | Confidence for this assignment (0–100)           | required; used by search/review logic  |

`Skill.tags` follows overwrite semantics: on successful re-tagging, the entire
array is replaced by the latest canonical output.

## Tag
Represents a classification label assigned to skills.

| Field        | Type     | Description                              | Notes                          |
|--------------|----------|------------------------------------------|--------------------------------|
| _id          | ObjectId | Primary key                              |                                |
| name         | String   | Human-facing label (e.g., "JavaScript") | dictionary/management source    |
| normalizedName | String | Canonical key (e.g., "javascript")      | unique, lowercase + trimmed     |
| category     | String   | Optional category (e.g., "language")   | for future filtering           |
| usageCount   | Number   | Number of skills tagged with this label  | incremented on assignment      |
| createdAt    | Date     | Timestamp of tag creation                |                                |

A unique index on `normalizedName` avoids duplicates; normalization to lowercase
plus trimming is applied before persistence.

`Tag` acts as dictionary and lifecycle management source. `Skill.tags` stores
the canonical assignment snapshot for search execution.

## TaggingJob
Implements the queue and audit log for asynchronous processing.

| Field        | Type       | Description                                         | Notes                          |
|--------------|------------|-----------------------------------------------------|--------------------------------|
| _id          | ObjectId   | Primary key                                         |                                |
| skillId      | ObjectId   | Reference to Skill being processed                  |                                |
| status       | String     | `pending`, `in_progress`, `done`, `failed`         | indexed                        |
| attempts     | Number     | Retry count (default 0)                             |                                |
| lastError    | String     | Error message from last failure (optional)          |                                |
| resultTags   | [SkillTag] | Canonical tags assigned when status=`done`          | mirrors `Skill.tags` shape     |
| confidence   | Number     | Confidence score returned by LLM (0–100)           | stored for reporting/review    |
| createdAt    | Date       | Job creation time                                   | indexed for dequeue ordering   |
| updatedAt    | Date       | Last update timestamp                               |                                |

A compound index on `{ status: 1, createdAt: 1 }` supports efficient batch
selection of pending jobs.

## Relationships

- `Skill.tags` stores canonical tag metadata (`tagId`, `normalizedName`,
  `confidence`) for direct search/query use.
- Each `TaggingJob` links to a single Skill; multiple jobs may exist for the
  same skill in case of retries.
- `TaggingJob.resultTags` mirrors `Skill.tags` for auditability and downstream
  API contract consistency.

## Notes

- The existing `Course` entity (from other features) may be linked via
  `Skill.sourceCourse` but is not required for tagging.
- Domain enumeration is currently free-text; future validation may introduce a
  separate `Domain` collection if needed.

This data model supports asynchronous processing, de-duplication of tags, and
post-run reporting without additional infrastructure beyond MongoDB.