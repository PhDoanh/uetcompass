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
module.exports = {
  urls: [
    {
      url: "https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-cntt/",
      major: "CNTT",
    },
    {
      url: "https://uet.vnu.edu.vn/chuong-trinh-dao-tao-nganh-ktmt/",
      major: "KTMT",
    },
    // ... additional entries
  ],
};
```

**Rules**:
- `url` — required; must be a non-empty string; no format validation at runtime (network errors surface as Tavily failures)
- `major` — required; non-empty string; used as the `major` field on all CourseUnit records extracted from this URL and as the subgraph key for cycle detection
- Duplicate `{ url, major }` pairs in config are processed sequentially; last successful upsert wins

---

## Exit Status Codes

Reported in the `JOB_COMPLETE` log event and written to the log file.

| Status | Process Exit Code | Condition |
|---|---|---|
| `SUCCESS` | `0` | All configured URLs processed successfully AND no cycles detected in any major's graph |
| `PARTIAL_FAILURE` | `1` | ≥1 URL failed at any processing stage; successful URLs are persisted |
| `FAILED` | `2` | Cycle detected in ≥1 major's prerequisite graph; all data preserved (no rollback) |

> When Cron fires the job in-process, exit codes do not terminate the Express server. They are recorded in the log and surfaced for manual review. When triggered via `npm run seed:ctdt`, the process exits with the corresponding code.

---

## Log Event Taxonomy

All events are written to console (`stdout`/`stderr`) and appended to `backend/logs/seed-ctdt.log`.

| Event | Level | When emitted |
|---|---|---|
| `JOB_START` | `info` | Job begins; includes timestamp and URL count |
| `URL_START` | `info` | Processing begins for a single URL |
| `URL_SUCCESS` | `info` | URL fully processed and CourseUnits upserted |
| `URL_SKIP` | `error` | URL skipped due to failure; includes `stage` and `reason` |
| `UNRESOLVED_PREREQUISITE` | `warn` | Course references prerequisite code not present in current major subgraph |
| `CYCLE_CLEAN` | `info` | Per-major DFS completed with no cycles found |
| `CYCLE_DETECTED` | `warn` | Cycle found in a major's graph; includes `cycles` array |
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
  "major": "CNTT",
  "cycles": [
    { "from": "INT2210", "to": "INT2215" }
  ]
}
```

**`JOB_COMPLETE` extra fields**:
```json
{
  "exitStatus": "SUCCESS | PARTIAL_FAILURE | FAILED",
  "totalUrls": 15,
  "successCount": 14,
  "failCount": 1,
  "cyclesDetected": 0
}
```

**Status note**:
- If all configured URLs fail, final status is still `PARTIAL_FAILURE` (`successCount = 0`, `failCount = totalUrls`).

---

## Environment Variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `TAVILY_API_KEY` | yes | `tvly-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Tavily Extract API key |
| `GEMINI_API_KEY` | yes | `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` | Google Gemini API key |
| `MONGODB_URI` | yes | `mongodb+srv://...` | Existing; shared with rest of backend |
| `SEED_CRON_SCHEDULE` | no | `0 0 1 3,8 *` | Override default Cron expression |
| `NODE_ENV` | yes | `development` / `production` | Gates manual trigger availability |
