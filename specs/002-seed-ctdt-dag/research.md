# Research: Seed UET Curriculum into DB as DAG

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Status**: Complete — aligned with finalized spec/plan/data-model/contract

---

## R-001: Job Orchestration — Cron + Manual Trigger

**Decision**: Use in-process `node-cron` for scheduled runs and a dev-only manual trigger (`npm run seed:ctdt`). Schedule is configurable via `SEED_CRON_SCHEDULE` (default `0 0 1 3,8 *`).

**Rationale**: This matches Render free-tier constraints (single process, no queue worker). The job frequency is low (semester cadence), and trigger behavior remains identical between cron/manual modes.

**Operational contract alignment**:
- Triggered in-process; cron does not terminate Express.
- Manual trigger is blocked in production (`NODE_ENV=production`).
- Exit status semantics: `SUCCESS` / `PARTIAL_FAILURE` / `FAILED` (recorded in logs; returned as process code for manual mode).

**Pattern**:
```js
// backend/src/modules/curriculum/seed.job.js
const cron = require('node-cron');
const { runSeedPipeline } = require('./seed.pipeline');

const DEFAULT_CRON = '0 0 1 3,8 *';

function getSchedule() {
  return process.env.SEED_CRON_SCHEDULE || DEFAULT_CRON;
}

function registerCronJob(logger) {
  const schedule = getSchedule();

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid SEED_CRON_SCHEDULE: ${schedule}`);
  }

  cron.schedule(schedule, async () => {
    try {
      await runSeedPipeline({ triggeredBy: 'cron' });
    } catch (err) {
      logger?.error({ event: 'JOB_COMPLETE', exitStatus: 'FAILED', reason: err.message });
    }
  });
}

async function triggerManually() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Manual trigger is not available in production');
  }

  const result = await runSeedPipeline({ triggeredBy: 'manual' });
  // Process exit mapping only applies for CLI wrapper
  const exitMap = { SUCCESS: 0, PARTIAL_FAILURE: 1, FAILED: 2 };
  return { ...result, exitCode: exitMap[result.exitStatus] ?? 2 };
}

module.exports = { registerCronJob, triggerManually };
```

---

## R-002: Configuration Model — Program-Centric + Closed Vocabularies

**Decision**: Replace flat URL list with program-scoped config in `curriculum.config.js`:
- `programs[]` with `programId` and typed `sources` keyed by `scrapeType`.
- `careerTracks[]` as authoritative closed vocabulary.
- `skillVocabulary[]` as authoritative closed vocabulary.

**Rationale**: The pipeline needs source-role semantics (`program-overview`, `curriculum-table`, `program-outcome`) and per-program processing boundaries. Closed vocabularies are required for deterministic filtering and downstream consistency.

**Contract rules alignment**:
- `programId` is required and unique.
- Missing source types are allowed (nullable/omittable when pages are unavailable).
- AI is not allowed to invent new `trackId` values.
- Skill tags outside `SKILL_VOCABULARY` are silently dropped before upsert.

**Pattern**:
```js
// backend/src/modules/curriculum/curriculum.config.js
module.exports = {
  programs: [
    {
      programId: 'CNTT-STANDARD',
      sources: {
        'curriculum-table': { url: 'https://uet.vnu.edu.vn/...' },
        // 'program-overview': { url: '...' },
        // 'program-outcome': { url: '...' },
      },
    },
  ],
  careerTracks: [
    { trackId: 'software-engineer-general', description: '...' },
    { trackId: 'ai-data-engineer', description: '...' },
  ],
  skillVocabulary: ['oop', 'data-structures', 'sql', 'linux'],
};

// backend/src/modules/curriculum/config.loader.js
const cfg = require('./curriculum.config');

function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function loadAndValidateConfig() {
  const { programs = [], careerTracks = [], skillVocabulary = [] } = cfg;

  const seenPrograms = new Set();
  for (const p of programs) {
    assertNonEmptyString(p.programId, 'programId');
    if (seenPrograms.has(p.programId)) {
      throw new Error(`Duplicate programId: ${p.programId}`);
    }
    seenPrograms.add(p.programId);
  }

  const seenTracks = new Set();
  for (const t of careerTracks) {
    assertNonEmptyString(t.trackId, 'careerTracks.trackId');
    if (seenTracks.has(t.trackId)) {
      throw new Error(`Duplicate career trackId: ${t.trackId}`);
    }
    seenTracks.add(t.trackId);
  }

  const vocab = new Set(skillVocabulary.filter(Boolean));
  return { programs, careerTracks, skillVocabulary, vocab, trackIdSet: seenTracks };
}

module.exports = { loadAndValidateConfig };
```

---

## R-003: Change Detection Strategy — SeedRun + HTTP Header Check

**Decision**: Persist operational run metadata in `seed_runs` and perform pre-ingest change detection per program before extraction:
1. Find last completed `SeedRun` by `programId`.
2. Send `HEAD` for each configured source URL.
3. Compare `ETag` / `Last-Modified` / content hash against prior `urlSnapshots`.
4. Skip program when all sources unchanged (`CHANGE_SKIP`); process otherwise.

**Rationale**: Prevents unnecessary Tavily/Gemini calls and DB writes while preserving deterministic re-run behavior.

**Data-model alignment**:
- `SeedRun` stores `runId`, `status`, `triggeredBy`, `startedAt`, `completedAt`, `urlSnapshots`, and `summary`.
- `urlSnapshot` includes `url`, `contentHash`, `httpEtag`, `lastModified`, `checkedAt`.

**Pattern**:
```js
// backend/src/modules/curriculum/change-detection.js
const crypto = require('crypto');

function hashContent(content) {
  return crypto.createHash('sha256').update(content || '').digest('hex');
}

function normalizeHeader(v) {
  return typeof v === 'string' ? v.trim() : null;
}

function hasSnapshotChanged(prev = {}, current = {}) {
  // Prefer strong server hints when present, fallback to content hash
  const etagChanged = prev.httpEtag && current.httpEtag && prev.httpEtag !== current.httpEtag;
  const lmChanged = prev.lastModified && current.lastModified && prev.lastModified !== current.lastModified;
  const hashChanged = prev.contentHash && current.contentHash && prev.contentHash !== current.contentHash;
  return Boolean(etagChanged || lmChanged || hashChanged);
}

async function buildCurrentSnapshot(url, { headFetcher, extractContent }) {
  const head = await headFetcher(url); // returns headers-like object
  const content = await extractContent(url); // kept for contentHash reliability

  return {
    url,
    httpEtag: normalizeHeader(head.get('etag')),
    lastModified: normalizeHeader(head.get('last-modified')),
    contentHash: hashContent(content),
    checkedAt: new Date(),
  };
}

module.exports = { hasSnapshotChanged, buildCurrentSnapshot };
```

---

## R-004: Tavily Extract Integration — Sequential per Source URL

**Decision**: Use `@tavily/core` and execute extraction sequentially per source URL in Call 1.

**Rationale**: Sequential calls are safer on free-tier limits and sufficient for background workload scale.

**Pipeline alignment**:
- Only run for programs that pass change detection.
- URL failures are isolated (`URL_SKIP`) and do not halt the entire job.
- Successful URLs feed Gemini Call 1 parse/normalize/upsert.

**Pattern**:
```js
// backend/src/modules/curriculum/tavily.service.js
const { tavily } = require('@tavily/core');

const client = tavily({ apiKey: process.env.TAVILY_API_KEY });

async function extractContent(url) {
  const res = await client.extract([url]);
  const row = res?.results?.[0];
  if (!row?.raw_content) {
    throw new Error(`Tavily returned empty content for URL: ${url}`);
  }
  return row.raw_content;
}

async function extractSequential(urls, onError) {
  const ok = [];
  for (const url of urls) {
    try {
      ok.push({ url, markdown: await extractContent(url) });
    } catch (err) {
      onError?.({ event: 'URL_SKIP', url, stage: 'tavily', reason: err.message });
    }
  }
  return ok;
}

module.exports = { extractContent, extractSequential };
```

---

## R-005: Gemini Integration — Two-Phase Structured Output

**Decision**: Use Gemini structured JSON output (`responseMimeType: application/json`, `responseSchema`) in two phases:

### Call 1 — Extract & Parse
- Parse typed source content into structured records for `Program`, `ProgramOutcome`, and `CourseUnit`.
- Run service-layer validation before DB writes.
- Compute `CourseUnit.emphasis` deterministically from `theoryHours`/`practiceHours` (not AI-inferred).

### Call 2 — Batch Enrichment (single call per Program)
- One Gemini call per program with full context:
  - Program metadata + all CourseUnits + all ProgramOutcomes
  - `CAREER_TRACKS` + `SKILL_VOCABULARY`
- Apply enrichment fields:
  - CourseUnit: `difficultyLevel`, `careerTracks`, `skills`
  - ProgramOutcome: `careerTracks`
- Mark skill enrichment source as `scrapeType: "ai-inferred"`.
- Silently drop out-of-vocabulary skill tags and emit `SKILL_TAG_DROPPED` warning when applicable.

**Model config alignment**:
- `GEMINI_API_KEY` required.
- `GEMINI_MODEL` optional; default `gemini-2.5-flash`.

**Pattern**:
```js
// backend/src/modules/curriculum/gemini.service.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function model(responseSchema) {
  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });
}

async function callGeminiJSON({ prompt, schema }) {
  const result = await model(schema).generateContent(prompt);
  return JSON.parse(result.response.text());
}

function computeEmphasis(theoryHours, practiceHours) {
  const t = Number(theoryHours ?? 0);
  const p = Number(practiceHours ?? 0);
  const total = t + p;
  if (total <= 0) return null;
  const ratio = p / total;
  if (ratio < 0.25) return 'theory-heavy';
  if (ratio <= 0.55) return 'balance';
  return 'project-heavy';
}

function filterVocabularySkills(skills, vocabSet) {
  const kept = [];
  const dropped = [];
  for (const s of skills || []) {
    if (vocabSet.has(s)) kept.push(s);
    else dropped.push(s);
  }
  return { kept, dropped };
}

module.exports = { callGeminiJSON, computeEmphasis, filterVocabularySkills };
```

---

## R-006: Persistence and Upsert Semantics

**Decision**: Use Mongoose upsert/bulk-write patterns with program-scoped identity and multi-collection persistence:
- Collections: `course_units`, `programs`, `program_outcomes`, `seed_runs` (+ `course_outcomes` schema only for MVP).
- `CourseUnit` identity/upsert filter: `{ code, programId }`.

**Rationale**: Guarantees idempotent overwrite behavior and keeps record ownership consistent with program-centric model.

**Index alignment**:
- `course_units`: unique `{ code: 1, programId: 1 }`, plus `programId_idx`.
- `programs`: unique `programId`.
- `program_outcomes`: unique `poId`, index `programId`.
- `seed_runs`: unique `runId`, compound `{ programId, status }`.

**Pattern**:
```js
// backend/src/modules/curriculum/seed.pipeline.persistence.js
async function upsertCourseUnits(CourseUnit, rows) {
  const ops = rows.map((row) => ({
    updateOne: {
      filter: { code: row.code, programId: row.programId },
      update: { $set: row, $currentDate: { seededAt: true } },
      upsert: true,
    },
  }));
  return CourseUnit.bulkWrite(ops, { ordered: false });
}

async function upsertPrograms(Program, rows) {
  const ops = rows.map((row) => ({
    updateOne: {
      filter: { programId: row.programId },
      update: { $set: row },
      upsert: true,
    },
  }));
  return Program.bulkWrite(ops, { ordered: false });
}

async function upsertProgramOutcomes(ProgramOutcome, rows) {
  const ops = rows.map((row) => ({
    updateOne: {
      filter: { poId: row.poId },
      update: { $set: row },
      upsert: true,
    },
  }));
  return ProgramOutcome.bulkWrite(ops, { ordered: false });
}

module.exports = { upsertCourseUnits, upsertPrograms, upsertProgramOutcomes };
```

---

## R-007: Cycle Detection — Per Program Subgraph (`programId`)

**Decision**: Run DFS cycle detection per distinct `programId` after processing completes.

**Rationale**: Program isolation avoids cross-program false positives and aligns with course identity (`code + programId`).

**Status alignment**:
- No cycles + successful stages → `SUCCESS`.
- Any URL/program-stage failure with continued processing → `PARTIAL_FAILURE`.
- Any detected cycle in any program graph → `FAILED` (data preserved, no rollback).

**Pattern**:
```js
// backend/src/modules/curriculum/cycle.detector.js
function detectCyclesByProgram(courseUnits) {
  const byProgram = new Map();
  for (const u of courseUnits) {
    if (!byProgram.has(u.programId)) byProgram.set(u.programId, []);
    byProgram.get(u.programId).push(u);
  }

  const output = [];

  for (const [programId, rows] of byProgram) {
    const adj = new Map(rows.map((r) => [r.code, r.prerequisites || []]));
    const visited = new Set();
    const stack = new Set();

    function dfs(node) {
      visited.add(node);
      stack.add(node);
      for (const neighbor of adj.get(node) || []) {
        if (!adj.has(neighbor)) continue; // unresolved prerequisite logged elsewhere
        if (!visited.has(neighbor)) dfs(neighbor);
        else if (stack.has(neighbor)) output.push({ programId, from: node, to: neighbor });
      }
      stack.delete(node);
    }

    for (const node of adj.keys()) {
      if (!visited.has(node)) dfs(node);
    }
  }

  return output;
}

module.exports = { detectCyclesByProgram };
```

---

## R-008: Logging Taxonomy — Unified Event Contract

**Decision**: Standardize run observability on the shared event set used by contract and data model:
- `CHANGE_SKIP`, `URL_SUCCESS`, `URL_SKIP`, `ENRICHMENT_START`, `ENRICHMENT_SUCCESS`, `ENRICHMENT_SKIP`, `SKILL_TAG_DROPPED`, `CYCLE_CLEAN`, `CYCLE_DETECTED`, `SEEDRUN_FINALIZE`, `JOB_COMPLETE`.

**Rationale**: Ensures consistent diagnostics across pipeline stages and artifacts.

**Payload alignment**:
- Include `programId` context for program-scoped events.
- Include `stage`, `reason` for skip/failure events.
- Include cycle edge details on `CYCLE_DETECTED`.

**Pattern**:
```js
// backend/src/modules/curriculum/seed.logger.js
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../../logs/seed-ctdt.log');

function write(level, payload) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    ...payload,
  });

  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  fs.appendFileSync(logFile, `${line}\n`);
}

const log = {
  info: (p) => write('info', p),
  warn: (p) => write('warn', p),
  error: (p) => write('error', p),
};

module.exports = { log };
```

---

## R-009: Pipeline Composition Pattern — Functional Core, Imperative Shell

**Decision**: Structure seed execution as a small imperative orchestrator calling pure domain functions (validation, normalization, filtering, status resolution).

**Rationale**: This keeps side effects isolated and unit tests stable with lightweight mocks.

**Pattern**:
```js
// backend/src/modules/curriculum/seed.pipeline.js
function resolveExitStatus({ hasCycle, hasFailure }) {
  if (hasCycle) return 'FAILED';
  if (hasFailure) return 'PARTIAL_FAILURE';
  return 'SUCCESS';
}

async function runSeedPipeline(ctx) {
  // orchestrate: create SeedRun -> change detection -> Call1 -> Call2 -> cycle -> finalize
  const hasFailure = Boolean(ctx.failureCount > 0);
  const hasCycle = Boolean(ctx.cyclesDetected > 0);
  return { exitStatus: resolveExitStatus({ hasCycle, hasFailure }) };
}

module.exports = { runSeedPipeline, resolveExitStatus };
```
