# Data Model for AI Auto-Tagging System

This document enumerates the primary entities, their attributes, and relations.

## Skill
Represents a competency extracted from a course or other source.

| Field        | Type     | Description                              | Notes                          |
|--------------|----------|------------------------------------------|--------------------------------|
| _id          | ObjectId | Primary key                              |                                |
| name         | String   | Human-readable skill name                | indexed                        |
| description  | String   | Optional short description from source   |                                |
| sourceCourse | ObjectId | Reference to `Course` (if applicable)    | optional; for analysis         |
| domain       | String   | e.g., "IT", "Marketing"              | used to provide context to LLM |
| tags         | [ObjectId] | Array of Tag references                | populated after processing     |
| createdAt    | Date     | Ingestion timestamp                      | indexed                        |

## Tag
Represents a classification label assigned to skills.

| Field        | Type     | Description                              | Notes                          |
|--------------|----------|------------------------------------------|--------------------------------|
| _id          | ObjectId | Primary key                              |                                |
| name         | String   | e.g., "frontend", "javascript"       | unique, case-normalized        |
| category     | String   | Optional category (e.g., "language")   | for future filtering           |
| usageCount   | Number   | Number of skills tagged with this label  | incremented on assignment      |
| createdAt    | Date     | Timestamp of tag creation                |                                |

A unique index on `name` avoids duplicates; normalization to lowercase plus
trimming is applied before persistence.

## TaggingJob
Implements the queue and audit log for asynchronous processing.

| Field        | Type       | Description                                         | Notes                          |
|--------------|------------|-----------------------------------------------------|--------------------------------|
| _id          | ObjectId   | Primary key                                         |                                |
| skillId      | ObjectId   | Reference to Skill being processed                  |                                |
| status       | String     | `pending`, `in_progress`, `done`, `failed`         | indexed                        |
| attempts     | Number     | Retry count (default 0)                             |                                |
| lastError    | String     | Error message from last failure (optional)          |                                |
| resultTags   | [ObjectId] | Tags assigned (populated when status=`done`)       |                                |
| confidence   | Number     | Confidence score returned by LLM (0–100)           | stored for reporting/review    |
| createdAt    | Date       | Job creation time                                   | indexed for dequeue ordering   |
| updatedAt    | Date       | Last update timestamp                               |                                |

A compound index on `{ status: 1, createdAt: 1 }` supports efficient batch
selection of pending jobs.

## Relationships

- `Skill.tags` holds references to `Tag` documents created or reused during
  tagging.
- Each `TaggingJob` links to a single Skill; multiple jobs may exist for the
  same skill in case of retries.

## Notes

- The existing `Course` entity (from other features) may be linked via
  `Skill.sourceCourse` but is not required for tagging.
- Domain enumeration is currently free-text; future validation may introduce a
  separate `Domain` collection if needed.

This data model supports asynchronous processing, de-duplication of tags, and
post-run reporting without additional infrastructure beyond MongoDB.