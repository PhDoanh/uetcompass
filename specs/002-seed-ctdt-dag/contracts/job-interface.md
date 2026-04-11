# Job Interface Contract: Seed UET Curriculum

**Feature**: `002-seed-ctdt-dag`
**Date**: 2026-03-08
**Interface type**: Background job / CLI trigger

---

## Overview

`SeedJob` has no HTTP API surface. It is invoked either by the Cron scheduler embedded in the Express process (production) or by an npm script (dev only). This document defines the trigger interface, input configuration schema, exit codes, and log event taxonomy.

---

## Trigger Interface

### 1. Cron Trigger (production + dev)

Registered automatically at application startup by calling `registerCronJob()` in the Express app entry point.

| Property | Value |
|---|---|
| Scheduler | `node-cron` |
| Default schedule | `0 0 1 3,8 *` (00:00 on March 1 and August 1) |
| Config override | `SEED_CRON_SCHEDULE` environment variable (optional) |
| Availability | All environments |

### 2. Manual Trigger (dev only)

```bash
# From backend/ directory
npm run seed:ctdt
```

| Property | Value |
|---|---|
| Guard | Exits with error if `NODE_ENV=production` |
| Behavior | Identical to Cron trigger: same pipeline, same log output, same exit status |
| Availability | `NODE_ENV !== 'production'` only |

---

## Input Configuration Schema

Defined in `backend/src/modules/curriculum/curriculum.config.js`:

```js
// curriculum.config.js
module.exports = {
  programs: [
    {
      programId: "CNTT-JP",
      sources: {
        "program-overview":  { url: "https://uet.vnu.edu.vn/...8" },
        "curriculum-table":  { url: "https://uet.vnu.edu.vn/...10" },
        "program-outcome":   { url: "https://uet.vnu.edu.vn/...9" },
      },
    },
    {
      programId: "CNTT-STANDARD",
      sources: {
        "curriculum-table":  { url: "https://uet.vnu.edu.vn/...13" },
        // overview and program-outcome nullable for programs without public pages
      },
    },
    // ...
  ],

  careerTracks: [
    { trackId: "software-engineer-japan",   description: "..." },
    { trackId: "software-engineer-general", description: "..." },
    { trackId: "ai-data-engineer",          description: "..." },
    { trackId: "systems-infrastructure",    description: "..." },
  ],

  skillVocabulary: [
    // 50–80 canonical skill tags — team-maintained
    // Layer 1 (UET-anchored): e.g. "system-analysis", "embedded-programming", "japanese-business"
    // Layer 2 (Industry-standard, filtered to CTT-mapped skills):
    // e.g. "oop", "data-structures", "sql", "linux", "machine-learning", "networking"
  ],
};
```

**Rules**:
- `programId` — required; unique identifier for the program
- Each `sources` key is a `scrapeType`; the pipeline uses `scrapeType` to determine which Gemini schema and extraction logic to apply
- `sources` entries are nullable/omittable for programs without a corresponding public page
- `careerTracks` — authoritative closed vocabulary; AI MUST NOT invent new trackIds
- `skillVocabulary` — authoritative closed vocabulary; skills returned by Gemini that are not in this list are silently dropped before upsert

---

## Exit Status Codes

Reported in the `JOB_COMPLETE` log event and written to the log file.

| Status | Process Exit Code | Condition |
|---|---|---|
| `SUCCESS` | `0` | All changed Programs processed successfully (Call 1 + Call 2) AND no cycles detected in any program graph |
| `PARTIAL_FAILURE` | `1` | ≥1 source URL or Program-stage failed; successful Programs are persisted |
| `FAILED` | `2` | Cycle detected in ≥1 program's prerequisite graph; all data preserved (no rollback) |

> When Cron fires the job in-process, exit codes do not terminate the Express server. They are recorded in the log and surfaced for manual review. When triggered via `npm run seed:ctdt`, the process exits with the corresponding code.

---

## Log Event Taxonomy

All events are written to console (`stdout`/`stderr`) and appended to `backend/logs/seed-ctdt.log`.

| Event | Level | When emitted |
|---|---|---|
| `JOB_START` | `info` | Job begins; includes timestamp and configured Program count |
| `URL_START` | `info` | Processing begins for a single URL |
| `URL_SUCCESS` | `info` | URL fully processed and CourseUnits upserted |
| `URL_SKIP` | `error` | URL skipped due to failure; includes `stage` and `reason` |
| `UNRESOLVED_PREREQUISITE` | `warn` | Course references prerequisite code not present in current program subgraph |
| `CHANGE_SKIP` | `info` | Program skipped because no source URL content has changed since last completed SeedRun |
| `ENRICHMENT_START` | `info` | Call 2 Batch Enrichment begins for a Program |
| `ENRICHMENT_SUCCESS` | `info` | Call 2 completed; enrichment fields applied to all CourseUnits and ProgramOutcomes for Program |
| `ENRICHMENT_SKIP` | `warn` | Call 2 failed for a Program; enrichment fields not updated; job continues to next Program |
| `SKILL_TAG_DROPPED` | `warn` | One or more skill tags returned by Gemini were outside SKILL_VOCABULARY and were dropped |
| `CYCLE_CLEAN` | `info` | Per-program DFS completed with no cycles found |
| `CYCLE_DETECTED` | `warn` | Cycle found in a program's graph; includes `cycles` array |
| `JOB_COMPLETE` | `info` | Job finished; includes `exitStatus`, counts of success/fail |

**Log entry format** (JSON, one entry per line):

```json
{ "timestamp": "ISO8601", "level": "info|warn|error", "event": "EVENT_NAME", ...fields }
```

**`URL_SKIP` extra fields**:
```json
{
  "url": "https://...",
  "stage": "tavily | gemini | validate | upsert",
  "reason": "Human-readable error message"
}
```

**`CYCLE_DETECTED` extra fields**:
```json
{
  "programId": "CNTT-STANDARD",
  "cycles": [
    { "from": "INT2210", "to": "INT2215" }
  ]
}
```

**`JOB_COMPLETE` extra fields**:
```json
{
  "exitStatus": "SUCCESS | PARTIAL_FAILURE | FAILED",
  "totalPrograms": 7,
  "processedPrograms": 6,
  "skippedPrograms": 1,
  "successCount": 6,
  "failCount": 0,
  "cyclesDetected": 0
}
```

**Status note**:
- If all changed Programs fail, final status is still `PARTIAL_FAILURE` (`successCount = 0`, `failCount = processedPrograms`).

---

## Environment Variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `TAVILY_API_KEY` | yes | `tvly-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Tavily Extract API key |
| `GEMINI_API_KEY` | yes | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Google Gemini API key |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Override default Gemini model; defaults to `gemini-2.5-flash` |
| `MONGODB_URI` | yes | `mongodb+srv://...` | Existing; shared with rest of backend |
| `SEED_CRON_SCHEDULE` | no | `0 0 1 3,8 *` | Override default Cron expression |
| `NODE_ENV` | yes | `development` / `production` | Gates manual trigger availability |
