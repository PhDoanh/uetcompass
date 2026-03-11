# Research: Resource Curation

**Feature**: `009-resource-curation`
**Date**: 2026-03-11
**Status**: Complete — all unknowns resolved

---

## R-001: Crawling Learning Resource Platforms via Tavily

**Decision**: Use Tavily Search API (`/search`) with `site:` scoped queries to discover resource URLs and snippets for each skill. No Tavily Extract call is needed per-resource — the search result snippet contains sufficient metadata (title, URL, price signals, rating) for most platforms.

**Rationale**: Tavily Search returns structured results `{ title, url, content, score }` where `content` is the page snippet. For Udemy, Coursera, edX, and YouTube, the snippet reliably captures pricing metadata (e.g., "Free", "₫499,000") and ratings embedded in the page's `<meta>` tags. Tavily Extract is reserved for cases where the snippet is insufficient — only Udemy course pages (which sometimes omit price from search snippets) trigger an additional Extract call. This minimizes API calls against the free-tier limit.

**Query template per skill per platform**:
```js
// resourceCrawler.service.js
const PLATFORM_QUERIES = {
  udemy:        (skill) => `${skill} course site:udemy.com`,
  coursera:     (skill) => `${skill} course site:coursera.org`,
  youtube:      (skill) => `${skill} tutorial site:youtube.com`,
  edx:          (skill) => `${skill} course site:edx.org`,
  freecodecamp: (skill) => `${skill} site:freecodecamp.org`,
  viblo:        (skill) => `${skill} site:viblo.asia`,
};

// For each platform query:
const results = await tavilyClient.search(query, { maxResults: 5 });
// results.results: [{ title, url, content, score }]
```

**Rate limit management**: Searches run sequentially (no `Promise.all`) per skill. With 6 platforms × N skills, a 500ms delay between calls is applied to stay below Tavily free-tier limits. Skills are processed in batches of 10; a batch completes before the next starts.

**Alternatives considered**:
- Platform-specific official APIs (Coursera Catalog API, YouTube Data API v3): rejected for Coursera (requires partner approval, not available for scraping); YouTube Data API is viable for future enhancement but adds a credentials dependency not justified by the MVP; Tavily is sufficient for both.
- Playwright browser automation: rejected — Tavily covers all target platforms with no browser overhead; Render free-tier memory cannot support a headless browser.
- Tavily Extract on every result URL: rejected — too many API calls per skill; Extract is only used when Search snippet is insufficient (Udemy price fallback).

---

## R-002: Free/Paid Classification Without Manual Tagging

**Decision**: Apply a three-layer classification strategy — platform default → keyword heuristic → Gemini fallback — evaluated in order. Gemini is invoked only for resources where the first two layers produce ambiguous or missing signals.

**Layer 1 — Platform defaults** (zero API calls):

| Platform | Classification | Rationale |
|---|---|---|
| YouTube | `free` | All YouTube watch URLs are free |
| freeCodeCamp | `free` | Platform is entirely free by design |
| Viblo | `free` | Vietnamese dev community, all free content |
| edX | `free` | Free-to-audit for nearly all courses; only specialization certificates are paid |

**Layer 2 — Keyword heuristic** on `content` snippet (zero API calls):
```js
function classifyFromSnippet(snippet) {
  const lower = snippet.toLowerCase();
  if (/free|miễn phí|audit|no cost/.test(lower)) return 'free';
  if (/₫|,000|usd|\$|paid|enroll now|buy/.test(lower)) return 'paid';
  return null; // ambiguous → escalate to layer 3
}
```

**Layer 3 — Gemini fallback** (only for ambiguous cases, typically Udemy):
```js
// gemini.helper.js — classification prompt
const schema = {
  type: SchemaType.OBJECT,
  properties: {
    isPaid: { type: SchemaType.BOOLEAN },
    priceNote: { type: SchemaType.STRING, nullable: true }
  },
  required: ['isPaid']
};
// Prompt: "Is this course free or paid? Respond in structured JSON only.\n\nSnippet: {snippet}"
```

**Fallback if all three layers fail**: default to `null` (unknown); record is stored but `isFree` is `null`; not surfaced to students in the free/paid filter.

**Alternatives considered**:
- Full Gemini classification for all resources (rejected — wastes free-tier token budget on deterministic cases; Platform defaults cover ~70% of resources without any LLM call)
- Regex-only with no Gemini fallback (rejected — Udemy snippet content varies significantly by locale/user agent; regex alone misclassifies ~15% of Udemy resources)

---

## R-003: Job Board Crawling — Tavily Extract on Aggregate Pages

**Decision**: Rather than searching per-skill (N skills × 4 boards = potentially hundreds of calls), crawl each job board's public "technology/skills trending" aggregate page using Tavily Extract. These pages list the most in-demand skills with aggregated job counts in a single request.

**Target URLs**:

| Board | Target Page | What Tavily Extracts |
|---|---|---|
| TopDev | `https://topdev.vn/blog/top-ky-nang-lap-trinh-hot/` + job search pages per skill | Skill tags, job counts |
| ITviec | `https://itviec.com/it-jobs` (skills filter sidebar) | Skill tags, frequency |
| LinkedIn | `https://www.linkedin.com/jobs/search/?keywords={skill}&location=Vietnam` | Job count in page headline |
| JobOKO | `https://joboko.com/viec-lam-it` (IT tag pages) | Skill mentions, salary ranges |

For salary range extraction, the job board pages contain individual posting snippets that include salary ranges in Vietnamese (`"15-25 triệu VND"`, `"Thoả thuận"`, `"Up to $2000"`). Gemini is used to parse salary signals from extracted page content into a normalized `{ min, max, currency }` structure.

**Per-board crawl pattern**:
```js
// trendCrawler.service.js
async function crawlBoard(boardName, url) {
  const content = await tavilyClient.extract([url]);  // one Extract call per board
  if (!content.results?.length) {
    logger.warn({ event: 'BOARD_SKIP', board: boardName, reason: 'no_content' });
    return null;
  }
  const parsed = await geminiParser.extractJobSignals(content.results[0].raw_content, boardName);
  // parsed: { skills: [{ name, jobCount, avgSalary }] }
  return parsed;
}
```

**Partial-failure tolerance**: Each board's crawl is wrapped in an independent `try/catch`. A single board failure (403, timeout, unexpected HTML structure) logs a `BOARD_SKIP` event and does not abort the daily job. The remaining boards still run.

**LinkedIn note**: LinkedIn job search pages may require cookies/session for full content. Tavily Extract handles this via its provider's own browser rendering layer. If LinkedIn extraction consistently fails, it degrades gracefully (data from TopDev + ITviec + JobOKO still satisfies SC-004's "at least 3 of 4 boards" criterion).

**Alternatives considered**:
- Per-skill searches on job boards (rejected — too many Tavily Extract calls per daily run; rate limits exceeded quickly)
- Official LinkedIn Jobs API (rejected — requires business partner approval, not available for students/personal projects)
- Playwright scraping directly (rejected — Render free-tier memory cannot support headless browser; Tavily handles rendering)

---

## R-004: Trend Direction Computation Between Daily Snapshots

**Decision**: On each daily run, compute trend direction by comparing the new `jobCount` with the `jobCount` from the immediately preceding snapshot. Store a `previousJobCount` field on the daily snapshot at write time (read from the previous record). Apply a ±5% tolerance band for "stable" classification.

**Algorithm**:
```js
function computeTrendDirection(current, previous) {
  if (previous === null || previous === 0) return 'stable'; // first run or no prior data
  const ratio = (current - previous) / previous;
  if (ratio > 0.05) return 'increasing';
  if (ratio < -0.05) return 'decreasing';
  return 'stable';
}
```

**Snapshot write pattern**:
```js
// trendAnalyzer.service.js
async function buildAndWriteSnapshot(skillName, jobCount, avgSalary, sources) {
  const previous = await MarketTrendSnapshot.findOne({ skillName }).sort({ dataDate: -1 });
  const trend = computeTrendDirection(jobCount, previous?.jobCount ?? null);

  await MarketTrendSnapshot.findOneAndUpdate(
    { skillName, dataDate: today() },
    {
      $set: { jobCount, avgSalary, trendDirection: trend, sources,
              previousJobCount: previous?.jobCount ?? null, crawledAt: new Date() }
    },
    { upsert: true }
  );
}
```

**"Today" as idempotent key**: `{ skillName, dataDate }` is the upsert key — re-running the daily job on the same day overwrites the existing snapshot rather than creating a duplicate. `dataDate` is stored as a UTC date with time component zeroed out (`new Date().setUTCHours(0,0,0,0)`).

**Alternatives considered**:
- Storing a separate `trend_history` collection with full time-series (rejected — unnecessary for the "previous period vs current" requirement; a single `previousJobCount` field on the snapshot is simpler and sufficient)
- Rolling 7-day average as the comparison baseline (rejected — spec requires comparison vs "previous period" which is naturally the previous day run; 7-day average adds complexity not asked for)

---

## R-005: Skill-to-Course Linkage for Academic Documents (Capability 2)

**Decision**: Use a two-step process: (1) extract course name signal from document metadata (URL path, filename, page title), then (2) use Gemini to match the course name signal to the closest `courseCode` in the UET course catalog by comparing against `course_units.name` values fetched from MongoDB.

**Step 1 — Signal extraction**: Tavily Search queries UET faculty pages with course-specific searches:
```js
const UET_QUERIES = [
  (courseName) => `${courseName} slide filetype:pdf site:uet.vnu.edu.vn`,
  (courseName) => `${courseName} lecture notes site:github.com UET`,
  (courseName) => `${courseName} giáo trình site:uet.vnu.edu.vn`,
];
```

The page URL and title typically contain the course code or Vietnamese name (e.g., `it3910e-lap-trinh-web`).

**Step 2 — Gemini course mapping**:
```js
// docFinder.service.js
async function mapDocumentToSkill(docTitle, docUrl, allCourseUnits) {
  const schema = {
    type: SchemaType.OBJECT,
    properties: {
      courseCode: { type: SchemaType.STRING, nullable: true },
      confidence: { type: SchemaType.STRING }  // "high" | "low"
    },
    required: ['courseCode', 'confidence']
  };
  const prompt = `Given this document: "${docTitle}" from "${docUrl}",
which UET course code does it belong to? Available courses (code: name):
${allCourseUnits.map(u => `${u.code}: ${u.name}`).join('\n')}
Return the best matching courseCode or null if no match. Respond in JSON only.`;
  const result = await geminiModel.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  if (parsed.confidence === 'low') return null; // discard ambiguous mappings
  return parsed.courseCode;
}
```

**Token optimization**: `allCourseUnits` list is fetched once per job run and reused for all documents within that run — not fetched per document.

**Alternatives considered**:
- Full-text search / fuzzy string match without Gemini (rejected — Vietnamese course names have many variations in spacing, diacritics, and abbreviations; "Lập trình Web" vs "Lập trình web (Web Programming)" mismatches under exact-match; Gemini handles this naturally)
- Hardcoded URL pattern rules per UET faculty page (rejected — fragile; faculty page structures change frequently)

---

## R-006: Collection Ownership and Alignment With Feature 004

**Decision**: Feature 009 is the **owner/writer** of four collections; Feature 004 reads two of them. A fifth collection (`course_resources`) remains owned by Feature 004 (admin-seeded) and is not modified by Feature 009.

| Collection | Owner (Writer) | Reader(s) | Notes |
|---|---|---|---|
| `skill_learning_resources` | **Feature 009** | Feature 004 (Endpoint 6) | Schema extended with `resourceType`, `rating`, `crawledAt` vs. 004's placeholder |
| `market_skills` | **Feature 009** | Feature 004 (Endpoint 5) | Derived from crawl results; per-course associations |
| `academic_documents` | **Feature 009** | Feature 009 only (new endpoint) | Not consumed by Feature 004's existing endpoints |
| `market_trend_snapshots` | **Feature 009** | Feature 009 only (new endpoint) | Global daily trend, not per-course |
| `course_resources` | Feature 004 | Feature 004 | Admin-seeded materials; Feature 009 does not write here |

**`skill_learning_resources` backward compatibility**: Feature 004 reads only `{ title, url, type (free|paid), platform }` fields per resource. Feature 009 stores a superset of these fields — Feature 004's reader is unaffected by the additional `resourceType`, `rating`, and `crawledAt` fields.

**`market_skills` derivation**: After each daily market trend crawl, Feature 009 derives per-course associations by using Gemini to match crawled skill names against `course_units.name` values (same approach as R-005). This populates `market_skills` so Feature 004's Market Skills tab has data.

**Skill identity**: There is no dedicated `skills` collection in UETCompass. Skills are identified by `skillName` (a String) — e.g. `"React.js"`, `"Node.js"`. This is consistent with Feature 004's existing data models. Feature 009 uses `skillName` as the linkage key, not an ObjectId FK.

**Alternatives considered**:
- Feature 009 writing to `course_resources` for academic documents (rejected — `course_resources` is admin-seeded with a different type taxonomy: textbook/slide/lab/assignment; mixing auto-crawled academic docs into this collection would conflate two data sources with different freshness and quality guarantees)
- Introducing a new `skills` collection as a first-class entity with ObjectId (rejected — no existing feature uses ObjectId-based skill references; introducing a new collection would require changes to Features 004 and constitution; `skillName` string key is sufficient and consistent with current architecture)

---

## R-007: Cron Scheduling — Three Jobs in the Same Express Process

**Decision**: Register three independent `node-cron` jobs at application startup, following the same in-process pattern established in Feature 002 (`seed.job.js`). Each job has its own schedule and its own independent error handling.

| Job | Schedule | Frequency |
|---|---|---|
| Learning Resource Crawler | `0 2 * * 0` (Sunday 02:00 UTC) | Weekly |
| Academic Document Finder | `0 3 * * 0` (Sunday 03:00 UTC) | Weekly |
| Market Trend Crawler | `0 1 * * *` (every day 01:00 UTC) | Daily |

**Staggered start times** (1h apart) prevent three simultaneous Tavily + Gemini requests from hitting rate limits concurrently. Sunday jobs run sequentially within the weekly schedule; the daily market job runs alone on weekdays.

**Manual trigger pattern** (dev-only, consistent with Feature 002):
```js
// resource-curation.jobs.js
async function triggerManually(capability) {
  if (process.env.NODE_ENV === 'production') throw new Error('Not available in production');
  if (capability === 'learning-resources') await runLearningResourceCrawl();
  if (capability === 'academic-docs')      await runAcademicDocFinder();
  if (capability === 'market-trends')      await runMarketTrendCrawl();
}
```

**npm scripts**:
```json
{
  "crawl:resources": "node -e \"require('./src/modules/resource-curation/resource-curation.jobs').triggerManually('learning-resources')\"",
  "crawl:docs":      "node -e \"require('./src/modules/resource-curation/resource-curation.jobs').triggerManually('academic-docs')\"",
  "crawl:trends":    "node -e \"require('./src/modules/resource-curation/resource-curation.jobs').triggerManually('market-trends')\""
}
```

**Alternatives considered**:
- Separate Render Cron jobs (rejected — Render free tier supports only one active web service; separate cron workers would consume the quota)
- BullMQ + Redis for job queuing (rejected — no Redis; `node-cron` in-process is sufficient for infrequent batch jobs with no concurrency requirement)
