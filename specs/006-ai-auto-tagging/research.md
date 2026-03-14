# Research Notes – AI Auto-Tagging System

This document captures the outcomes of Phase 0 research tasks. All previously flagged
"NEEDS CLARIFICATION" items have been resolved.

## Decision: Use managed LLM API (OpenAI/Anthropic/Google)

**Rationale:**  Managed services provide high availability, easy scaling, and
reduce operational overhead. They align with the non‑functional goal of 99% uptime
and fit within budget when processing ~10k skills/day.  Cost estimates are
easily predictable compared to running open‑source models locally.

**Alternatives considered:**
- Self-hosted open‑source LLMs (Llama, Mistral): required GPU infrastructure,
  higher maintenance, not justifiable for current volume.
- Cloud VM hosting of open models: still significant ops cost and complex
  scaling.

## Decision: Implement job queue using MongoDB collection

**Rationale:**  The project constitution explicitly discourages Redis/BullMQ in
earlier features. To avoid introducing a new infrastructure component on the
free-tier Render environment, we will emulate a queue using a `tagging_jobs`
collection with a status field (`pending`, `in_progress`, `failed`, `done`)
and index on `createdAt`. A periodic Node.js worker (cron or setInterval) will
dequeue batches and process them.

**Alternatives considered:**
- Redis-backed queue (BullMQ, Bee-Queue): straightforward but violates the
  "no Redis/BullMQ" constraint and would require provisioning a Redis addon.
- External queue service (AWS SQS, Azure Queue): adds cloud complexity and
  credentials; overkill for target volume.

## Decision: Batch processing with configurable size and scheduling

**Rationale:**  Throughput requirement (1k–10k/day) is modest; therefore
scheduled batches (every 15 minutes or triggered by new input) simplify
rate-limiting and error handling. Batches allow retries of failed items without
blocking the entire queue.

**Alternatives considered:**
- Real-time processing on enqueue: would need robust backpressure and may hit
  rate limits; unnecessary for business needs.
- Hybrid (real-time for high-priority items): adds complexity without clear use
  case at present.

## Decision: Tag de‑duplication logic in service layer

**Rationale:** Ensure that when the LLM suggests tags already present in the
`tags` collection, existing documents are reused. This avoids proliferation of
synonymous tags. The service will query by normalized name and upsert if
confidence >85%.

**Alternatives considered:**
- Maintain tags purely in memory during batch runs: risk of desynchronization in
  a multi-instance deployment.
- Enforce uniqueness via a database unique index and catch duplicate key errors
  on insert (used as fallback in addition to lookup).

## Decision: Error handling strategy

**Rationale:** Continue processing remaining skills on per-item API failure,
marking failures and enqueueing them for retry (up to 3 attempts with
exponential backoff). This satisfies the requirement that a few bad items should
not abort the whole batch and simplifies operator visibility.

**Alternatives considered:**
- Abort entire batch on first failure: would require manual intervention and
  degrade throughput.
- Silently skip failed items: would hide issues from operators.

## Decision: `Skill`/`Tag` ownership in tagging/search bounded context

**Rationale:**  `Skill` and `Tag` used by auto-tagging are canonical to
tagging/search behavior and must be reused by advanced tag search (feature 008).
Treating them as `roadmap-core` entities would couple unrelated domains and
increase translation logic.

**Alternatives considered:**
- Keep ownership in roadmap-core and map into search indexes: adds repeated
  transform layers and schema drift risk.
- Duplicate skill/tag models in each feature: causes inconsistency and
  maintenance overhead.

## Decision: Canonical `Skill.tags` metadata shape + overwrite re-tagging

**Rationale:**  Persisting `Skill.tags` as canonical metadata
(`tagId`, `normalizedName`, `confidence`) is optimized for search filtering and
ranking while preserving dictionary linkage through `tagId`. Re-tagging should
replace the full tag snapshot to avoid stale mixed states from incremental merges.

**Alternatives considered:**
- Store only tag ObjectIds: insufficient for direct search and requires joins.
- Append-only re-tagging: preserves history but makes active-tag reads and
  confidence interpretation more complex.

## Decision: Keep `Tag` as dictionary/management source

**Rationale:**  The `Tag` entity governs normalization, deduplication,
category metadata, and lifecycle. `Skill.tags` is the assignment snapshot for
query/runtime use.

**Alternatives considered:**
- Flatten tags directly into skills with no dictionary: simpler writes but loses
  governance and deduplication controls.

## Decision: Standardize output contract for direct feature 008 consumption

**Rationale:**  Returning canonical tag objects in API responses avoids
intermediate transformation middleware before advanced search ingestion. This
reduces latency, complexity, and mismatch risk between persisted data and API
shape.

**Alternatives considered:**
- Return human-readable strings only and transform later: easier to read but not
  canonical and insufficient for stable programmatic consumption.


All research decisions are now documented and incorporated into the
specification and plan.