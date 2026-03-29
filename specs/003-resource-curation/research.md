# Research: Resource Curation

**Feature**: `003-resource-curation`  
**Date**: 2026-03-28 (revised)  
**Feeds into**: [plan.md](plan.md), [data-model.md](data-model.md), [contracts/rest-api.md](contracts/rest-api.md)  
**Architecture Dependency**: Feature 009 (RoadmapNodeSchema)

---

## R-007: Architecture dependency on RoadmapNodeSchema (Feature 009)

**Question**: Feature 003 needs to crawl courses and discover resources per course. Should it depend on the Skill catalog, or on the Roadmap's course nodes?

**Decision**: Depend on **RoadmapNodeSchema** from Feature 009, NOT on the Skill catalog. The three-tier hierarchy is:

1. **RoadmapNodeSchema** (from Feature 009) provides `courseName` (e.g., "Phát triển ứng dụng web")
2. **AcademicDocument** and **SkillTrendSnapshot** crawl using RoadmapNode's `courseName` + Regex keywords
3. **LearningResource** crawls using SkillTrendSnapshot's extracted `skillName`

**Key changes**:
- **AcademicDocument**: FK to roadmapNodeId (not skillId); crawls academic materials for a course
- **SkillTrendSnapshot**: FK to roadmapNodeId; stores both job market signal AND `skillName` (extracted from jobs)
- **LearningResource**: FK to skillTrendSnapshotId; crawls based on skillName

**Rationale**:
- Course-centric organization aligns with student roadmaps — the primary navigation context in UETCompass
- Extracting trending skills per course (not globally) provides market-aligned, contextual insights
- Chaining crawls (course → skills → resources) enables a natural, efficient data pipeline
- Avoids dependency on Skill catalog bloat; works even if a trending skill isn't yet defined in the Skill collection

**Dependency contract with Feature 009**:
RoadmapNodeSchema must provide:
- `_id` (ObjectId): roadmap node identifier
- `courseName` (String): the course/node title (e.g., "Phát triển ứng dụng web")
- `isActive` (Boolean): whether to crawl this node

If Field names differ, only `nodesCatalog.service.js` updates — all three crawlers remain unchanged.

---

## R-008: Web search API for unified resource discovery — Tavily integration

**Question**: Features need to crawl academic materials (by course name), trending skills (by course + personalization), and learning resources (by skill name). Should each use dedicated APIs, or a unified search platform?

**Decision**: Use **Tavily Search API** for all three crawl capabilities — unified, efficient, no Playwright needed.

- **Tavily API**: Free tier (100 searches/month), REST endpoint `https://api.tavily.com/search`. Returns structured search results (title, url, content snippet, source). No rate-limit blocking for academic/research use. Supports semantic search with context.

**Input hierarchy** (critical for correct integration):
- **AcademicDocument crawl**: Input = RoadmapNodeSchema.`courseName` **only** (generic materials for all students). Search query: `"<courseName> slides lecture notes UET education"`. Returns URLs to slides, notes, syllabi. **NO StudentProfile involvement.**
- **SkillTrendSnapshot crawl**: Input = RoadmapNodeSchema.`courseName` **PLUS StudentProfile** (major, careerGoal.role, careerGoal.companyType) — **THE ONLY capability using StudentProfile**. Combined query: e.g., `"web development skills job market <major> <role> <companyType>"` → extracts trending skills + job market demand personalized to career goals.
- **LearningResource crawl**: Input = SkillTrendSnapshot.`skillName` **only** (generic resources for all students). Search query: `"learn <skillName> tutorial course free paid"`. Returns learning resources. **NO StudentProfile involvement, NO courseName.**

**Rationale**:
- Single integration eliminates maintaining N different API clients.
- Semantic search (Tavily) handles Vietnamese course names + personalization context naturally.
- Free tier sufficient: 3 capabilities × (50–150 nodes/skills) per week ≈ 150–450 searches, well under 100/month limit.
- Tavily deduplication + ranking prevents duplicate URLs in results.
- Personalization via StudentProfile makes SkillTrendSnapshot highly relevant to individual student goals.

**Tavily API key management**:
- Store `TAVILY_API_KEY` in `backend/.env`.
- Adapter: `backend/src/modules/scraping/adapters/tavily.adapter.js` handles all three crawl types via an overloaded search method.

**Integration with Feature 001 (Onboarding)**:
- SkillTrendSnapshot crawl queries StudentProfile collection for each student to fetch major, careerGoal.role, careerGoal.companyType.
- Personalized search results rank skills relevant to the student's declared goals + major.
- If StudentProfile incomplete (draft), crawl uses course name only (fallback to non-personalized mode).

---

## R-001: Learning resource data access — API or web scraping for Udemy, Coursera, YouTube?

**Question**: The spec mandates resources from Udemy, Coursera, and YouTube. Do any of these expose free, unauthenticated APIs that remove the need for Playwright scraping?

**Decision**: All three use free, unauthenticated or lightly-authenticated public APIs — no Playwright needed for Capability 1.

- **YouTube Data API v3**: Official Google API, free tier (10,000 units/day). Returns title, URL, channel, thumbnails, view count, and publication date per video. Queried as `search.list?q=<skill name>&type=video&videoCategoryId=27`. Requires a single `YOUTUBE_API_KEY` env var (Google Cloud project, no cost). Videos are always free — no paid classification needed.

- **Udemy public REST API**: Udemy exposes a public, unauthenticated course search endpoint at `https://www.udemy.com/api-2.0/courses/?search=<skill>&price=<free|paid>`. Returns `title`, `url`, `price_detail.amount`, `price_detail.currency`, `is_paid`, `rating`, `num_subscribers`. The `is_paid` boolean is the exact field needed for FR-004.

- **Coursera GraphQL / REST API**: Coursera exposes `https://api.coursera.org/api/courses.v1?q=search&query=<skill>` (no auth required for public catalog). Each result includes `name`, `slug` (→ URL), `domainTypes`. Paid vs. free classification relies on the `productVariants` field (contains "SPECIALIZATION" for paid multi-course tracks) or checking for the "Audit" enrollment type — details resolved via a trial request.

- **edX, freeCodeCamp, Viblo** (supplemental): edX has a public course API at `https://discovery.edx.org/api/v1/search/`; freeCodeCamp content is on GitHub (curated, always free); Viblo (Vietnamese tech community) is accessed via `https://api.viblo.asia/posts?q=<skill>`. All three require only HTTP + JSON parsing — no Playwright.

**Rationale**:
- Using official/public APIs avoids Playwright overhead for these sources and eliminates HTML parsing fragility.
- Free tier quotas are sufficient: skill catalog is estimated at 50–150 skills × weekly run ≈ 50–150 YouTube API units per run (each `search.list` call = 100 units). Comfortably within 10,000/day quota.
- Udemy's public API has no stated rate limit for unauthenticated use; a 500ms delay between skill queries is sufficient for polite crawling.

**Alternatives considered**:
- Playwright scraping of Udemy/Coursera web pages: More brittle, higher latency, risk of blocking. Rejected — public APIs exist.
- Paid partner APIs (Udemy Affiliate, Coursera Partners): Require commercial agreement; not available for a free-tier academic project. Rejected.

---

## R-002: Job board data access — how to extract job counts and salary from TopDev, ITviec, LinkedIn, JobOKO?

**Question**: None of the four specified job boards expose public job-counting APIs. How do we extract per-skill job counts and salary ranges?

**Decision**: HTTP + cheerio (static HTML parsing) as the primary approach. Playwright (already in stack) used only as a fallback for JavaScript-rendered pages.

- **TopDev** (`https://topdev.vn/jobs?q=<skill>`): Search results are server-side rendered. Job count is in the page title `"N Việc làm <skill>"`. Salary ranges appear in job listing cards as text strings. Parseable with `node-fetch` + `cheerio` — no Playwright required.

- **ITviec** (`https://itviec.com/it-jobs/<skill-slug>`): Server-side rendered. Result count in `<span class="job-count">`. Salary extracted per listing. `node-fetch` + `cheerio` sufficient.

- **LinkedIn** (`https://www.linkedin.com/jobs/search/?keywords=<skill>`): Returns a `totalJobCount` in a `<span class="results-context-header__job-count">` element in the initial SSR HTML. Basic salary signals are less consistent — median salary from the "Insights" section requires login. **Decision**: Extract job count only from LinkedIn; mark salary as not available from this source.

- **JobOKO** (`https://joboko.com/tim-kiem-viec-lam?q=<skill>`): Server-side rendered Vietnamese job board. Job count and salary text accessible via cheerio selectors.

**HTML selector maintenance**: Selectors are isolated in each adapter file (`topdev.adapter.js`, etc.) behind a `parseJobCount(html)` function. When a site redesigns, only the adapter changes — no cross-module impact.

**Source failure handling**: If a board returns non-200 or throws a parse error, the adapter logs the failure and returns `{ jobCount: 0, salaryRange: null, success: false }`. The orchestrator (`marketTracker.service.js`) continues with the remaining sources. FR-014 requires at least 3 of 4 — if exactly 1 source fails, the snapshot is still recorded.

**Rationale**:
- Playwright adds ~2–3s overhead per page load. For a daily job that processes 50–150 skills × 4 boards = 200–600 page loads, total runtime with Playwright: 7–30 minutes. With cheerio + node-fetch: 1–6 minutes. cheerio preferred unless JS rendering is confirmed required.
- Playwright is already in the project (Profile Onboarding, Feature 001) — if a specific board migrates to SPA rendering, switching to Playwright requires only adapter changes.

**Alternatives considered**:
- Official LinkedIn Jobs API: Restricted to approved partners only. Rejected.
- Third-party aggregators (e.g., RapidAPI job boards): Incur cost and external dependency. Rejected per free-tier constraint.

---

## R-003: Skill-to-document inference — how to automatically map an academic document to a skill (FR-011)?

**Question**: FR-011 requires automatic inference of skill association for each academic document from course name, title, and content signals. What technology should perform this inference?

**Decision**: Gemini API in "parse/transform" role — consistent with Constitution Principle IV. The academic document's title, snippet (first 200 chars of text content if available), and the queried course name are sent to Gemini. Gemini returns a single object `{ skillId: "<id>", confidence: "high|medium|low" }`. Only `high` and `medium` confidence results are persisted; `low` confidence documents are stored with a `pendingReview` flag but excluded from student display.

**Prompt design** (token-minimized per constitution):
```
Given the UETCompass skill list (JSON array of {id, name}):
{{SKILL_CATALOG_JSON}}

This academic document belongs to UET course "{{COURSE_NAME}}":
Title: "{{DOC_TITLE}}"
Snippet: "{{DOC_SNIPPET}}"

Return JSON: {"skillId": "<id from list or null>", "confidence": "high|medium|low"}
Rules: null if no strong match. Do not invent skill IDs.
```

**Schema validation** (mandatory per constitution Principle IV):
```js
const schema = {
  type: 'object',
  required: ['skillId', 'confidence'],
  properties: {
    skillId: { type: ['string', 'null'] },
    confidence: { enum: ['high', 'medium', 'low'] }
  },
  additionalProperties: false
};
```
If validation fails, the document is skipped and logged — no blind trust.

**Token budget**: Skill catalog JSON (~50–150 skills × ~30 bytes/skill = ~1.5–4.5 KB). Plus title + snippet (~300 bytes). Total ~2–5K tokens per call. Running once per document per weekly crawl — volume is manageable on Gemini free tier.

**Rationale**:
- Pure keyword matching (no Gemini) would use `skill.name.toLowerCase().includes(word)` logic — works for exact matches but fails for "Lập trình hướng đối tượng" → "Object-Oriented Programming" (Vietnamese/English mismatch) or course naming variations. Gemini handles this naturally.
- Gemini is already in the stack (Feature 002); no new dependency introduced.

**Alternatives considered**:
- Manual admin mapping: Rejected — spec and FR-011 explicitly prohibit it.
- Pure keyword/fuzzy matching: Insufficient for Vietnamese ↔ English cross-lingual skill inference. Rejected as sole strategy; may be used as a pre-filter before Gemini to reduce API calls.

---

## R-004: Free/paid classification when source data is ambiguous — what field to trust per source?

**Question**: Each platform exposes price/enrollment data differently. How is the free/paid flag determined consistently across sources?

**Decision**: Per-source classification rules, evaluated deterministically before any Gemini involvement:

| Source | Free indicator | Paid indicator | Missing → default |
|---|---|---|---|
| YouTube | Always free (platform is free) | — | free |
| Udemy | `is_paid === false` OR `price_detail.amount === 0` | `is_paid === true` | paid |
| Coursera | `enrollmentType` includes `"Audit"` OR `courseType === "FreeformProject"` | otherwise | paid |
| edX | `entitlements` is empty OR mode `"audit"` available | has paid `entitlements` | paid |
| freeCodeCamp | Always free (platform is free) | — | free |
| Viblo | Always free (platform is free) | — | free |
| GitHub (academic) | Always free | — | free |
| UET official | Always free | — | free |

**Rule**: When the source data does not clearly indicate free, the system defaults to **paid** (per spec edge case: "Free/paid signal absent from source"). This is safer than falsely advertising a paid resource as free.

**Rationale**:
- Deterministic rules per source eliminate ambiguity. The rules are hard-coded in each adapter's `classifyFree(courseData)` function — simple, testable, no Gemini needed for classification.
- Defaulting to "paid" means false negatives (a few free resources shown as paid) rather than false positives (a paid resource displayed as free) — less harmful to student trust.

**Alternatives considered**:
- Using Gemini to classify from the full course description: Overkill for binary free/paid; adds token cost and latency. Rejected.
- Human review queue: Violates the no-admin-classification requirement (FR-004). Rejected.

---

## R-005: Time-series trend storage — what retention strategy fits MongoDB Atlas M0 free tier?

**Question**: The daily job creates one snapshot per (skill, date). With 150 skills × 365 days = 54,750 documents/year, will this exceed Atlas M0 storage or document count limits?

**Decision**: Rolling 30-day retention. The daily cron job appends today's snapshot and deletes documents older than 30 days in the same transaction. 30-day retention supports the spec's "previous 7-day period" comparison with headroom.

**Storage estimate**: 150 skills × 30 days = 4,500 documents. Each document ≈ 250 bytes (5 fields + ObjectId). Total ≈ 1.1 MB. Atlas M0 has 512 MB storage — this is under 0.25% of the storage limit. No concern.

**Trend calculation**: On each daily run, the `marketTracker.service.js` fetches today's crawl result and looks up the snapshot from exactly 7 days ago (`{ skillId, snapshotDate: { $lte: daysAgo7DateOnly } }` ordered by date desc, limit 1). The ±10% rule (FR-016) is applied and the trend direction is stored in the new snapshot document.

**Rationale**:
- Storing trend direction in the snapshot itself means the read path (`GET /api/market/trends`) is a simple `find` on the most recent snapshot per skill — no aggregation at read time.
- 30 days of history satisfies spec requirements and regulatory minimalism (Constitution Principle III — although this is not student personal data, minimalism is the right default).

**Alternatives considered**:
- Unlimited retention: No need for historical trend analysis in the spec. Wastes storage. Rejected.
- TTL index on `expiresAt` (MongoDB native expiry): Cleaner than a manual delete, but TTL precision is ~60 seconds, acceptable for daily snapshots. Actually, TTL index is the cleaner approach.

**Updated decision**: Use a MongoDB TTL index on `expiresAt` field (set to `snapshotDate + 30 days` on insert) rather than manual deletion in the job. This removes the need for a delete operation in the cron job and reduces code complexity.

---

## R-006: Skill catalog interface — what collection and fields does the scraping module read?

**Question**: The scraping module needs to iterate over all skills in the catalog (to crawl resources per skill, to build the Gemini prompt, and to anchor job trend data). Where does the skill catalog live?

**Decision**: Declare a **forward-compatible interface contract** with the Skill/Roadmap module. The scraping module reads from a `skills` collection (working name — Roadmap planner may rename) via a thin `skillCatalog.service.js` accessor. Only the minimum fields needed are declared:

```js
// Minimum shape required from skills collection
{
  _id: ObjectId,       // Linked skill ID referenced in all three new collections
  name: String,        // Used for search queries and Gemini prompts
  isActive: Boolean    // true = include in crawl; false = skip (FR-020)
}
```

The `skillCatalog.service.js` function:
```js
async function getActiveSkills() {
  return Skill.find({ isActive: true }, { _id: 1, name: 1 }).lean();
}
```

If the Roadmap planner uses a different field name for active status (e.g., `status: 'active'`), only `skillCatalog.service.js` needs to change — no impact on the three adapter pipelines.

**Rationale**:
- Following the same forward-compatible interface contract pattern established by Feature 007 (Progress Tracking and Skill Tree). Consistent with monolith module boundary rule.
- The `scraping` module does NOT import from `roadmap` module directly — it reads from the shared MongoDB collection through its own accessor. This preserves module boundary (Constitution Principle I).

**Alternatives considered**:
- Hardcoding a skills array in config: Not maintainable as skills grow. Rejected.
- Calling the Roadmap module's service directly from Scraping: Cross-module direct import, violates Constitution Principle I. Rejected.

---

## R-007: Background job registration — where in the monolith do scraping crons live?

**Question**: Feature 002 uses `node-cron` registered in `curriculum.job.js` and mounted in `app.js`. Should the three scraping capabilities each have their own job file, or share one?

**Decision**: One shared `scraping.job.js` file registers all three cron schedules. Each schedule calls its own service function:

```js
// scraping.job.js
const cron = require('node-cron');
const { runResourceCrawler }  = require('./services/resourceCrawler.service');
const { runAcademicFinder }   = require('./services/academicFinder.service');
const { runMarketTracker }    = require('./services/marketTracker.service');

// Capability 1 & 2: weekly, Sunday 00:00 Vietnam time (UTC+7 → 17:00 Saturday UTC)
cron.schedule('0 17 * * 6', () => runResourceCrawler().catch(console.error));
cron.schedule('0 17 * * 6', () => runAcademicFinder().catch(console.error));

// Capability 3: daily, 00:00 Vietnam time
cron.schedule('0 17 * * *', () => runMarketTracker().catch(console.error));
```

Manual trigger for dev: an npm script `npm run scrape:resources`, `npm run scrape:academic`, `npm run scrape:market` that calls each service function directly (`NODE_ENV !== production` guard, consistent with Feature 002 pattern).

**Rationale**:
- One file per module (not one per capability) is consistent with Feature 002's `curriculum.job.js` pattern. Three capabilities share the same module boundary, so they share one job file.
- `catch(console.error)` on each schedule keeps the cron runner from crashing the Express process on an unhandled rejection.

**Alternatives considered**:
- Three separate job files (`resourceCrawler.job.js`, etc.): Over-engineering for three schedules in the same module. Rejected per YAGNI.
- In-process worker threads: No need for parallelism at this scale. Rejected.
