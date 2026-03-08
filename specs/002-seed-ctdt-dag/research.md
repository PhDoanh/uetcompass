# Research: Seed UET Curriculum into DB as DAG

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Status**: Complete — all unknowns resolved

---

## R-001: node-cron — Scheduling in a Single-Process Express App

**Decision**: Use `node-cron` (`cron.schedule(expression, handler)`) registered once at application startup in the same process as the Express server. No distributed lock, no Redis, no external queue.

**Rationale**: `node-cron` is the minimal-dependency Cron implementation for Node.js. It runs entirely in-process, which is exactly what Render free-tier supports (single dyno, no worker processes). The job runs infrequently (once per semester), so in-process scheduling is safe — no risk of overlap between runs at that frequency. Distributed locking would be over-engineering for a single-instance deployment.

**Pattern**:
```js
// backend/src/modules/curriculum/seed.job.js
const cron = require('node-cron');
const { runSeedPipeline } = require('./seed.pipeline');

function registerCronJob() {
  // Example: 00:00 on the 1st of March and August (semester start)
  cron.schedule('0 0 1 3,8 *', async () => {
    await runSeedPipeline();
  });
}

// Dev-only manual trigger — gated on NODE_ENV
async function triggerManually() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Manual trigger is not available in production');
  }
  await runSeedPipeline();
}

module.exports = { registerCronJob, triggerManually };
```

**Manual trigger integration** (npm script in `backend/package.json`):
```json
{
  "scripts": {
    "seed:ctdt": "node -e \"require('./src/modules/curriculum/seed.job').triggerManually().catch(e => { console.error(e); process.exit(1); })\""
  }
}
```

**Alternatives considered**:
- BullMQ + Redis (rejected — requires external Redis service; free-tier overhead unjustified for a once-per-semester job)
- Render Cron Jobs (rejected — separate Render service; Render free-tier allows only one active service)
- `setInterval` (rejected — not Cron-syntax; harder to express "first day of semester" schedule)

---

## R-002: Tavily Extract API — Format and SDK Usage

**Decision**: Use `@tavily/core` SDK. Call `tavily.extract(urls)` for each URL individually (sequential, not batched) to respect free-tier rate limits. The SDK wraps `POST https://api.tavily.com/extract`.

**Rationale**: The `@tavily/core` SDK handles authentication headers, request serialization, and basic error propagation. Sequential calls (one URL per invocation) avoid rate-limit 429 errors on Tavily free tier. The `raw_content` field in the response contains the Markdown-formatted page content suitable for Gemini parsing.

**Response structure** (what matters for this feature):
```js
// sdk result shape
{
  results: [
    {
      url: "https://uet.vnu.edu.vn/...",
      raw_content: "# Chương trình đào tạo ...\n..."  // Markdown text
    }
  ],
  failed_results: []  // non-empty if extraction failed for a URL
}
```

**Pattern**:
```js
// backend/src/modules/curriculum/tavily.service.js
const { tavily } = require('@tavily/core');

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function extractContent(url) {
  const result = await client.extract([url]);
  if (!result.results || result.results.length === 0) {
    throw new Error(`Tavily returned no content for: ${url}`);
  }
  return result.results[0].raw_content;
}

module.exports = { extractContent };
```

**Error handling**: If `extract()` throws or returns empty `results`, the caller (pipeline) catches, logs, and skips the URL.

**Alternatives considered**:
- Direct `fetch` to `/extract` endpoint (rejected — SDK handles auth + retries; no benefit to raw HTTP)
- Parallel `Promise.all` (rejected — free-tier rate limits; sequential is safer and latency is irrelevant for a background job)

---

## R-003: Gemini SDK — Structured JSON Output with Schema

**Decision**: Use `@google/generative-ai` SDK with `responseMimeType: "application/json"` and `responseSchema` in `generationConfig`. This forces Gemini to return JSON conforming to the specified schema, making `JSON.parse()` reliable and reducing validation surface area.

**Rationale**: Gemini's structured output mode (available in `gemini-1.5-flash`) constrains the response to the declared schema — no free-form text wrapping the JSON, no markdown code fences. This eliminates the brittle `JSON.parse(response.replace(/```json|```/g, ''))` pattern. The schema is passed once per call, not embedded in the prompt text, keeping token usage minimal.

**Token optimization**: Prompt contains only the Markdown content and a one-line instruction. The schema is passed via `responseSchema`, not via prompt text.

**Pattern**:
```js
// backend/src/modules/curriculum/gemini.service.js
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const COURSE_UNIT_SCHEMA = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      code:          { type: SchemaType.STRING },
      name:          { type: SchemaType.STRING },
      credits:       { type: SchemaType.NUMBER },
      major:         { type: SchemaType.STRING },
      prerequisites: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      type:          { type: SchemaType.STRING },   // "required" | "elective"
      suggestedSemester: { type: SchemaType.NUMBER, nullable: true },
    },
    required: ['code', 'name', 'credits', 'major', 'prerequisites'],
  },
};

async function parseCourseUnits(markdownContent, major) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: COURSE_UNIT_SCHEMA,
    },
  });

  const prompt = `Extract all course units from the following UET curriculum page for major "${major}". Return JSON only.\n\n${markdownContent}`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

module.exports = { parseCourseUnits };
```

**Alternatives considered**:
- Prompt-injected schema (rejected — inflates token count; less reliable than native structured output)
- `gemini-1.5-pro` (rejected — higher cost/token; `gemini-1.5-flash` is sufficient for parse-only tasks)
- Post-processing with regex (rejected — brittle; structured output mode eliminates the need entirely)

---

## R-004: DFS Cycle Detection — Per-Major Subgraph

**Decision**: Run DFS-based cycle detection independently for each major. Build an in-memory adjacency list from `CourseUnit.find({ major })` where directed edges go from each course to its prerequisites. Run DFS with a "visited" set and a "currently in stack" set; any back-edge indicates a cycle.

**Rationale**: Cross-major cycle detection would produce false positives — a course code like `MAT1101` can exist in multiple majors with different prerequisite structures. Per-major isolation ensures each cycle is meaningful within a single curriculum program. DFS is O(V + E), which is trivially fast for a curriculum graph of 100–200 nodes per major.

**Cycle reporting**: When a back-edge is found, record both the node that closes the cycle and the node it points back to. Collect all cycle paths and log them together after the full DFS pass.

**Pattern**:
```js
// backend/src/modules/curriculum/cycle.detector.js

function detectCycles(courseUnits) {
  // courseUnits: array of { code, prerequisites: [code] }
  const adj = new Map();
  for (const u of courseUnits) {
    adj.set(u.code, u.prerequisites ?? []);
  }

  const visited   = new Set();
  const inStack   = new Set();
  const cycles    = [];

  function dfs(node) {
    visited.add(node);
    inStack.add(node);

    for (const neighbor of (adj.get(node) ?? [])) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor)) {
        cycles.push({ from: node, to: neighbor });
      }
    }

    inStack.delete(node);
  }

  for (const code of adj.keys()) {
    if (!visited.has(code)) dfs(code);
  }

  return cycles; // [] means clean graph
}

module.exports = { detectCycles };
```

**Post-seed integration**: After `bulkWrite` completes for all URLs, query each distinct major from DB, call `detectCycles`, and log results.

**Alternatives considered**:
- Topological sort (Kahn's algorithm) (considered — equivalent correctness; DFS chosen because it naturally identifies the specific back-edge nodes without extra bookkeeping)
- Cross-major single-pass detection (rejected — would require globally unique course codes across all majors; spec does not guarantee this)

---

## R-005: Mongoose `bulkWrite` — Full Overwrite Upsert

**Decision**: Use `CourseUnit.bulkWrite(operations)` where each operation is `updateOne` with `upsert: true` and `$set` applied to the full document. Filter key is `{ code, major }`. This overwrites all fields for existing records and inserts new records.

**Rationale**: `bulkWrite` collapses the entire URL's CourseUnit batch into a single MongoDB round-trip, minimizing network overhead. The `{ code, major }` compound unique index ensures idempotency — re-running the job produces the same DB state. Using `$set` on the full payload (not `$merge`) guarantees stale fields from previous runs are overwritten (freshness guarantee from SC-002).

**Pattern**:
```js
// backend/src/modules/curriculum/seed.pipeline.js (excerpt)
async function upsertCourseUnits(courseUnits) {
  const ops = courseUnits.map(unit => ({
    updateOne: {
      filter: { code: unit.code, major: unit.major },
      update: { $set: unit },
      upsert: true,
    },
  }));
  return CourseUnit.bulkWrite(ops, { ordered: false });
  // ordered: false → all ops attempted even if one fails (belt-and-suspenders)
}
```

**Index required** on `course_units` collection:
```js
courseUnitSchema.index({ code: 1, major: 1 }, { unique: true });
```

**Alternatives considered**:
- `findOneAndUpdate` in a loop (rejected — N round-trips; not atomic for the batch)
- `insertMany` with `ordered: false` (rejected — does not overwrite existing; duplicates would fail silently with `upsert: false`)
- Full document replace with `replaceOne` (considered — equivalent to `$set` on full document; `$set` chosen for explicitness and partial-field safety during schema evolution)
