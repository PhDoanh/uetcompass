# Research: Skill Tree – Personalized Academic Roadmap Tracker

**Phase 0 output** | Branch: `004-skill-tree` | Date: 2026-03-11

All NEEDS CLARIFICATION items from Technical Context are resolved below. No remaining blockers.

---

## Decision 1: Personalized roadmap JSON — storage and consumption

**Decision**: The personalized roadmap is stored in a MongoDB collection `student_roadmaps` as one document per student. It is written by the onboarding/personalization job (out of scope) and read by this feature. The document contains the student's career goal, ordered node list (each with `courseCode`, `nameVi`, `nameEn`, `prerequisites[]`), and a `generatedAt` timestamp.

**Rationale**:
- Feature 003 used static hardcoded career-path JSON files. Feature 004 requires per-student personalization — the personalized roadmap must be student-scoped and mutable over time (re-personalization).
- The collection is the natural handoff point between the onboarding/personalization service (writer) and the skill tree feature (reader). Using a named MongoDB collection creates a clean contract between features with no direct code coupling.
- The `generatedAt` timestamp enables detection of "profile updated since last personalization" (see Decision 3).
- Students without a roadmap (onboarding incomplete) receive a clear 404 response from `GET /api/skill-tree`, and the frontend routes them to the onboarding flow.

**Alternatives considered**:
- Static JSON files per student on the filesystem — rejected because they cannot be updated at runtime on Render; Render's ephemeral filesystem means files are lost on restart.
- Embedding the roadmap array inside `StudentProfile` — rejected because it couples two distinct concerns: profile identity + personalized curriculum. Separate collection preserves clean module boundaries.
- Generating roadmap on-the-fly from `StudentProfile.careerGoal + course_units` — rejected because the personalization logic is non-trivial, belongs to the onboarding/personalization feature, and would duplicate that logic here.

---

## Decision 2: Gemini API caching for "Why This Course" content

**Decision**: Generated "Why This Course" explanations are cached in a MongoDB collection `course_ai_contexts`, keyed by `{ courseCode, careerGoal }`. On the first request for a given (courseCode, careerGoal) pair, the backend calls Gemini, validates the response (non-empty string, ≥ 50 characters, no refusal pattern), persists it, and returns it. All subsequent requests return the cached document immediately — no further Gemini call.

**Rationale**:
- Constitution Principle IV mandates minimizing LLM token usage: "Free tier constraint: design prompts to minimize token usage; do not call LLM for logic that can be handled in code." Content generated once per (course, career goal) pair is semantically stable — it describes a fixed relationship between course content and a career path. Re-generating it on every student view would burn free-tier quota without added value.
- The cache key is `{ courseCode, careerGoal }` (not per-student) because the explanation is about the course-to-career-goal relevance, not personalized to the individual student's transcript.
- A `generatedAt` field on the cache document allows future cache invalidation (e.g., if a career goal definition changes) without dropping the entire collection.
- Validation before caching (length ≥ 50 chars, no refusal) is mandatory per Constitution Principle IV: "Gemini output MUST be validated before saving."

**Alternatives considered**:
- No caching — generate Gemini response on every tab open — rejected; the same content would be regenerated thousands of times across students. With Gemini's free-tier rate limits (~15 req/min on the Flash model), this would cause frequent 429 errors during peak usage.
- Cache in `localStorage` or in-memory on the backend — rejected; `localStorage` is client-side and not shared between devices; in-process cache is wiped on every Render restart (cold start occurs regularly on free tier).
- Redis-based cache — rejected; no Redis is available per Constitution constraints (Render free tier).

---

## Decision 3: Re-personalize button visibility — profile change detection

**Decision**: A `needsRepersonalization` boolean flag is computed server-side on every `GET /api/skill-tree` call. The flag is `true` when `studentProfile.updatedAt > studentRoadmap.generatedAt`. When the student clicks "Re-personalize", the backend dispatches the personalization job asynchronously (same Promise-based pattern as Feature 001's roadmap trigger), updates `studentRoadmap.generatedAt` to `Date.now()`, and returns `202 Accepted`. The frontend polls `GET /api/skill-tree` every 2500ms (existing pattern from Feature 003) to detect when the new roadmap is ready.

**Rationale**:
- `StudentProfile.updatedAt` is already maintained by Feature 001 (updated on every `PUT /onboarding/draft` and on submit). `student_roadmaps.generatedAt` is set when the personalization job completes. The delta is the cheapest possible signal for "profile newer than roadmap."
- Updating `generatedAt` to `Date.now()` on the POST request (before job completion) prevents the button from reappearing immediately on the next poll while the job is still running.
- The polling approach reuses the existing 2500ms polling infrastructure (Feature 003) — no new SSE channel or WebSocket needed. This is consistent with the "polling only" constraint from the constitution (Render free tier, no Redis/WebSocket).

**Alternatives considered**:
- A separate "repersonalization status" endpoint — rejected; adds a round-trip. Including `needsRepersonalization` in the existing `GET /api/skill-tree` response is zero-cost.
- SSE for re-personalization completion notification — rejected; no SSE channel is established for the skill tree feature; polling is sufficient for a 10s completion target.
- Setting `generatedAt` after job completion (not before) — rejected; this would cause a brief window where the button reappears mid-job, confusing the student.

---

## Decision 4: Market Skills and Learning Resources — DB schema and ownership

**Decision**: Two read-only collections consumed by this feature:
- `market_skills`: keyed by `courseCode`, contains an array of skill objects `{ name, jobCount }` representing industry-relevant skills associated with the course. Written by the job market crawling service (separate feature).
- `skill_learning_resources`: keyed by `skillName`, contains an array of resource objects `{ title, url, type: 'free'|'paid', platform }`. Written by the same crawling/curation service.

This feature only reads from both collections via `GET /api/skill-tree/nodes/:courseCode/market-skills` and `GET /api/skill-tree/skills/:skillName/learning-resources`.

**Rationale**:
- Separating `market_skills` and `skill_learning_resources` into two collections decouples the crawling granularity: skills can be refreshed per-course while learning resources can be refreshed per-skill independently.
- A single compound document (skills + resources nested) would require the crawling job to always update the full document, making partial updates harder. Two collections with separate keys enable independent updates.
- "Owned by crawling service, read-only here" mirrors the `course_units` pattern from Feature 002 — a well-established boundary in this codebase.

**Alternatives considered**:
- Nesting learning resources inside `market_skills` documents — rejected; resources and skills have different refresh cadences (skills refresh quarterly, resources can update weekly) and different ownership granularity.
- Generating market skills via LLM (Gemini) — rejected twice: Constitution Principle IV restricts LLM to parse/transform tasks, not data generation; and the spec explicitly sources this data from "Vietnamese IT job platform crawling."

---

## Decision 5: Course Resources — DB schema

**Decision**: New collection `course_resources` — one document per (courseCode × resourceType). Schema: `{ courseCode, type: 'textbook'|'slide'|'lab'|'assignment', title, url, description? }`. Admin-seeded. This feature's Resources tab queries `find({ courseCode })` and groups the results by `type` for display.

**Rationale**:
- Multiple documents per courseCode (one per material item) rather than a single array makes individual resource CRUD by administrators simpler — no need to $pull / $push nested arrays.
- The four `type` values map directly to the four UI groupings in the Resources tab.
- Read-only from the student's perspective; admin operations are out of this feature's scope.

**Alternatives considered**:
- Single document per courseCode with nested arrays per type — rejected; makes admin upsert operations more complex (array mutation rather than document-level upsert).
- Reusing `course_units` with a resources sub-field — rejected; mixing curriculum metadata with editable resource links in the same document violates the single-responsibility principle and couples Feature 002's schema to runtime-editable data.

---

## Decision 6: Frontend panel state management — three nested layers

**Decision**: The Zustand `skillTreeStore` has three state fields governing the panel layers:
1. `activeCourseId: string | null` — set when a node is clicked; `null` when panel is closed.
2. `activeTab: 'resources' | 'why' | 'skills'` — reset to `'resources'` each time `activeCourseId` changes.
3. `activeSkillName: string | null` — set when a skill item in the Market Skills tab is clicked; `null` when sub-panel is closed.

Panel renders are gated: the course detail side panel renders only when `activeCourseId !== null`; the skill sub-panel renders only when `activeSkillName !== null`. No route changes — all three layers coexist on the single `/skill-tree` page.

**Rationale**:
- A single Zustand store for all panel states avoids prop-drilling across the canvas, side panel, and modal layers.
- Resetting `activeTab` on course switch prevents a stale "Why This Course" tab from remaining open when the student navigates to a different node.
- Keeping all panels on one page (`/skill-tree`) follows the Next.js SPA pattern established by Feature 003 and avoids unnecessary route complexity for what is fundamentally a layered UI state problem.

**Alternatives considered**:
- URL-based panel state (query params `/skill-tree?course=IT3910E&tab=why`) — rejected; it adds routing complexity, makes deep-linking possible but undesirable (direct link to an AI tab would trigger an LLM call from URL), and is inconsistent with Feature 003's store-based state management.
- React Context for panel state — rejected; Zustand is already established in this feature's stack (from Feature 003 precedent); adding Context would create competing state management paradigms.

---

## Decision 7: Graph rendering — @xyflow/react v12 (consistent with Feature 003)

**Decision**: Reuse `@xyflow/react` v12 (React Flow) for the skill tree graph — same library and version as Feature 003.

**Rationale**:
- Feature 003 thoroughly evaluated graph rendering options (see Feature 003 research Decision 1) and chose React Flow v12 for React-native integration, built-in pan/zoom, and zero SVG boilerplate. Feature 004 has the same rendering requirements plus an additional node interaction (click to open detail panel) — fully supported by React Flow's `onNodeClick` handler.
- Reusing the same library means the `CourseNode` custom component pattern (Feature 003) can be carried forward with minimal changes: add an `onClick` prop for panel opening, add locked visual indicator.
- The college-tree data source changes (from static JSON to personalized roadmap in DB), but the graph rendering layer is identical.

**Alternatives considered**:
- Switching to Cytoscape.js or D3 — no reason to change; Feature 003's decision reasoning still holds. Adding a new graph library for an existing use case would be inconsistent.

---

## Decision 8: Node state enum casing — `pending`/`in_progress`/`done` (lowercase snake_case)

**Decision**: Node states are stored as lowercase snake_case strings: `"pending"`, `"in_progress"`, `"done"`. This differs from Feature 003's PascalCase (`"Pending"`, `"InProgress"`, `"Done"`).

**Rationale**:
- The new spec consistently uses lowercase snake_case in its text (`pending`, `in_progress`, `done`). Using the spec's native casing eliminates conversion at every spec-to-code boundary.
- Lowercase snake_case is idiomatic for MongoDB string enum fields and matches the convention used in `course_units.prerequisites[]` and other existing schemas in this codebase.
- Feature 003 is a separate (superseded) feature — its `skill_node_statuses` collection is not shared with Feature 004. Feature 004's new `skill_node_statuses` v2 documents are written only by this feature, so no migration compatibility is required.

**Alternatives considered**:
- PascalCase (as in Feature 003) — rejected; the spec uses lowercase, and PascalCase status strings would diverge from spec language at every review and test assertion.
- SCREAMING_SNAKE_CASE (`PENDING`, `IN_PROGRESS`, `DONE`) — rejected; inconsistent with the rest of the codebase.
