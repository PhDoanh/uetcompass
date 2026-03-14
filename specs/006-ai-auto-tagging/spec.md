# Feature Specification: AI Auto-Tagging System

**Feature Branch**: `006-ai-auto-tagging`  
**Created**: March 11, 2026  
**Status**: Draft  
**Input**: User description: "1. Feature: AI Auto-Tagging System (feat-ai-tagging)
Mô tả: Hệ thống tự động phân tích và gán nhãn (tags) cho các kỹ năng được thu thập từ web (crawled data) để phân loại dữ liệu mà không cần sự can thiệp thủ công.

ID: FEAT-006

Tiêu đề: Tự động gắn thẻ kỹ năng bằng AI (AI Auto-Tagging)

Mô tả chức năng: Khi một skill mới được trích xuất từ các nguồn học liệu (courses), hệ thống sẽ gửi nội dung (tên skill, mô tả course) qua một LLM (Large Language Model) để xác định các nhãn liên quan.

Yêu cầu kỹ thuật:

Input: Skill Name, Course Context, Domain (ví dụ: IT, Marketing).

Output: Danh sách các tags (ví dụ: #frontend, #javascript, #beginner, #logic).

Logic: AI phải so sánh skill đó với bộ tag hiện có trong database hoặc đề xuất tag mới nếu độ tin cậy (confidence score) > 85%."

## Clarifications

### Session 2026-03-11

- Q: What is the expected volume/throughput of skills to process daily? → A: 1,000-10,000 skills per day
- Q: How should the system access the LLM (deployment/service model)? → A: Managed API service (OpenAI, Anthropic, Google)
- Q: How should the system process skills (synchronous vs asynchronous)? → A: Asynchronous batch processing via queue system
- Q: How should the system handle LLM API failures during batch processing? → A: Continue processing remaining skills; mark failed skills for retry/manual review

### Canonical Refinement 2026-03-14

- `Skill` and `Tag` are entities of the **tagging/search bounded context** (shared by feature 006 and consumed by feature 008), not `roadmap-core` entities.
- Canonical `Skill.tags` must be stored as search-ready metadata objects containing at least `tagId`, `normalizedName`, and `confidence`.
- Re-tagging uses an **overwrite strategy**: latest successful tagging result replaces prior `Skill.tags` snapshot.
- `Tag` remains the dictionary/management source for lifecycle and deduplication.
- Output contracts are standardized so feature 008 can consume tagging results directly with no intermediate transformation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automatic Skill Tagging (Priority: P1)

As a content curator, I want new skills extracted from courses to be automatically analyzed and tagged by AI so that I can efficiently categorize and organize educational content without manual tagging effort.

**Why this priority**: This is the core functionality that enables automatic classification of skills, reducing manual work and improving data organization.

**Independent Test**: Can be fully tested by providing a skill input and verifying that appropriate tags are generated and assigned.

**Acceptance Scenarios**:

1. **Given** a new skill "JavaScript" extracted from course "Introduction to Web Development" in domain "IT", **When** the system processes it through the LLM, **Then** it assigns relevant tags like #frontend, #javascript, #programming.
2. **Given** a skill with existing tags in the database, **When** the LLM suggests similar tags with high confidence, **Then** the system uses the existing tags instead of creating duplicates.
3. **Given** a skill where the LLM has low confidence (<85%), **When** processing, **Then** the system flags it for manual review.

---

### User Story 2 - Tag Database Management (Priority: P2)

As a system administrator, I want the AI to maintain and update the tag database with new tags when confidence is high so that the system learns and improves over time.

**Why this priority**: Ensures the tag database grows and adapts, improving future tagging accuracy.

**Independent Test**: Can be tested by monitoring database updates after high-confidence tagging operations.

**Acceptance Scenarios**:

1. **Given** a new tag suggestion with confidence >85%, **When** the system processes it, **Then** the tag is added to the database.
2. **Given** multiple instances of the same new tag, **When** confidence remains high, **Then** the tag is consolidated in the database.

---

### User Story 3 - Tagging Quality Assurance (Priority: P3)

As a data analyst, I want to review tagging accuracy metrics so that I can monitor and improve the AI performance.

**Why this priority**: Provides oversight and continuous improvement capabilities.

**Independent Test**: Can be tested by generating reports on tagging accuracy and confidence scores.

**Acceptance Scenarios**:

1. **Given** completed tagging operations, **When** I request a quality report, **Then** I see metrics on accuracy, confidence scores, and manual review rates.

---

### Edge Cases

- What happens when LLM API fails for specific skills? System continues processing the batch, marks failed skills with error status, and queues them for retry.
- What if a batch partially fails (some skills succeed, some fail)? System completes all possible tagging, reports results for successful skills, and isolates failed ones for manual review or retry.
- How does system handle skills in non-IT domains like Marketing? Should still generate appropriate tags based on domain context.
- What if course context is missing or incomplete? System should still attempt tagging based on skill name and domain.
- How to handle multilingual skills or courses? Assume English for now, but system should be extensible.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept input consisting of Skill Name, Course Context, and Domain, placing skills into a processing queue.
- **FR-002**: System MUST process queued skills asynchronously via batch processing and send the data to a managed LLM API service (OpenAI, Anthropic, or Google) for tag generation.
- **FR-003**: System MUST receive and process tag suggestions from the LLM including confidence scores.
- **FR-004**: System MUST compare suggested tags with existing database tags and map matches to canonical `Tag` entries.
- **FR-005**: System MUST add new dictionary tags to the `Tag` store when confidence score > 85%.
- **FR-006**: System MUST output/store canonical `Skill.tags` metadata for each processed skill with fields `tagId`, `normalizedName`, and `confidence`.
- **FR-006a**: System MUST apply overwrite strategy on re-tagging, replacing the full `Skill.tags` set with the newest successful tagging output.
- **FR-007**: System MUST flag skills where LLM confidence is below threshold for manual review.
- **FR-008**: System MUST support multiple domains (IT, Marketing, etc.) for context-aware tagging.
- **FR-009**: System MUST implement batch processing via job queue with configurable batch size and scheduling (scheduled or event-driven).
- **FR-010**: System MUST continue processing remaining skills when LLM API fails for individual items; mark failed skills with error status and add them to a retry queue.
- **FR-011**: System MUST provide visibility into batch processing status, including counts of successfully tagged, failed, and flagged-for-review skills.
- **FR-012**: System MUST expose a normalized response contract for downstream search modules (feature 008) to consume directly.

### Non-Functional Requirements

- **NFR-001**: System MUST process between 1,000 and 10,000 skills per day via batch jobs.
- **NFR-002**: System MUST return results for batch jobs within 24 hours of submission (average case: within 1 hour).
- **NFR-003**: System MUST achieve 99% uptime for job queue and processing system.
- **NFR-004**: System MUST handle individual LLM API failures by continuing batch processing, marking failed items for retry, and implementing exponential backoff retry logic for failed skills (minimum 3 retry attempts with configurable delay).
- **NFR-005**: System MUST respect LLM API rate limits and throttle batch processing accordingly.
- **NFR-006**: System MUST ensure no individual skill failure blocks batch completion or affects other skills in the batch.

### Key Entities *(include if feature involves data)*

- **Skill** *(tagging/search bounded context)*: Represents a competency or ability, with attributes like name, description, source course, and canonical `tags` metadata (`tagId`, `normalizedName`, `confidence`).
- **Tag** *(tagging/search bounded context)*: Represents a dictionary classification label, with attributes like display name, normalized name, category, usage count.
- **Course**: Represents the learning source, with attributes like title, description, domain.

## Success Criteria *(mandatory)*

- 95% of processed skills receive accurate tags (measured by manual review of sample outputs).
- System successfully processes batches of 1,000-10,000 skills per day within budget constraints.
- Average batch processing time is under 1 hour for standard daily volume.
- Tag database grows by at least 20% within first month of operation.
- Manual review rate stays below 10% of total processed skills.
- System maintains 99% uptime for tagging operations.

## Assumptions

- Managed LLM API service (OpenAI, Anthropic, or Google) has 99%+ uptime SLA.
- Existing tag database is initialized with common tags.
- Input data is in English.
- LLM confidence scores returned by the API are reliable and calibrated.
- API rate limits and costs are within project budget.

## Dependencies

- Managed LLM API service (OpenAI API, Anthropic Claude API, or Google Vertex AI).
- API credentials and billing setup for chosen managed service.
- Job queue/task scheduling system (e.g., Celery, RabbitMQ, or cloud-native job queue).
- Database for storing tags, skills, and tagging results.
- Batch job scheduler for triggering tagging jobs (scheduled or event-driven).