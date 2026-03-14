# Research: Skill Tree – Personalized Academic Roadmap Tracker

**Phase 0 output** | Branch: `004-skill-tree` | Date: 2026-03-11

All NEEDS CLARIFICATION items from Technical Context are resolved below. No remaining blockers.

---

## Decision 1: Canonical roadmap ownership — consume from Feature 009

**Decision**: Feature 004 does **not** own or read a local `student_roadmaps` collection. Skill Tree consumes the canonical roadmap from Feature 009 through `GET /api/primary-roadmap` (or an equivalent service-layer adapter). The response is treated as the single source of truth for `roadmapId`, `roadmapName`, `careerGoal`, ordered nodes, and roadmap freshness metadata (`generatedAt`, `repersonalizing`).

**Rationale**:
- Feature 009 already defines roadmap generation and canonical ownership. Re-creating `student_roadmaps` in Feature 004 would duplicate source-of-truth and introduce divergence risk.
- Consuming `GET /api/primary-roadmap` creates a clean boundary: Feature 009 writes and evolves roadmap logic; Feature 004 only reads canonical data and manages progress state.
- The canonical payload already carries freshness metadata required by Feature 004 (`generatedAt`, `repersonalizing`), so no duplicate persistence is needed.
- Students without a canonical roadmap (onboarding incomplete or roadmap not generated) return a clear 404-like domain error from the primary roadmap contract, and the frontend routes to onboarding.

**Alternatives considered**:
- Local `student_roadmaps` mirror inside Feature 004 — rejected because it creates dual-write/dual-read ownership and stale-read risk versus Feature 009 canonical data.
- Static JSON files per student on the filesystem — rejected because they cannot be updated at runtime on Render; Render's ephemeral filesystem means files are lost on restart.
- Generating roadmap on-the-fly from `StudentProfile.careerGoal + course_units` inside Feature 004 — rejected because personalization belongs to Feature 009 and would duplicate logic.

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

## Decision 3: Re-personalize button visibility — canonical freshness from Feature 009

**Decision**: A `needsRepersonalization` boolean flag is computed server-side on every `GET /api/skill-tree` call using canonical roadmap metadata from Feature 009. The flag is `true` when `studentProfile.updatedAt > primaryRoadmap.generatedAt`. When the student clicks "Re-personalize", Feature 004 delegates regeneration to Feature 009 (async), returns `202 Accepted`, and relies on polling `GET /api/skill-tree` every 2500ms to detect completion via canonical `repersonalizing`/`generatedAt` updates.

**Rationale**:
- `StudentProfile.updatedAt` is already maintained by Feature 001, while `primaryRoadmap.generatedAt` is owned by Feature 009. Their delta is the cheapest signal for "profile newer than roadmap" without extra state.
- Keeping `repersonalizing` ownership in Feature 009 avoids duplicate state machines across modules.
- Polling reuses the existing 2500ms infrastructure (Feature 003) — no SSE/WebSocket required.

**Alternatives considered**:
- A separate "repersonalization status" endpoint in Feature 004 — rejected; status already belongs to canonical roadmap metadata.
- Mirroring `generatedAt` into a local Feature 004 document — rejected; violates single source of truth.
- SSE for completion notification — rejected; polling is sufficient for the 10s completion target.

---

## Decision 4: Node progress canonicalization — explicit `pending` records

**Decision**: `skill_node_statuses` is the canonical progress collection and must contain an explicit record for every node in the student's primary roadmap. `pending` is stored as a real persisted status, not inferred from missing documents.

**Rationale**:
- Downstream consumers require deterministic grouping by status without null/default inference.
- Explicit records simplify analytics and contract stability (`done`/`in_progress`/`pending` counts always computed from persisted rows).
- Re-personalization can reconcile statuses by upserting/removing records against the latest primary roadmap node set.

**Alternatives considered**:
- Implicit pending (`missing doc => pending`) — rejected due to ambiguity, extra branching in read paths, and weak downstream contracts.

---

## Decision 5: Market Skills and Learning Resources — DB schema and ownership

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

## Decision 6: Course Resources — DB schema

**Decision**: New collection `course_resources` — one document per (courseCode × resourceType). Schema: `{ courseCode, type: 'textbook'|'slide'|'lab'|'assignment', title, url, description? }`. Admin-seeded. This feature's Resources tab queries `find({ courseCode })` and groups the results by `type` for display.

**Rationale**:
- Multiple documents per courseCode (one per material item) rather than a single array makes individual resource CRUD by administrators simpler — no need to $pull / $push nested arrays.
- The four `type` values map directly to the four UI groupings in the Resources tab.
- Read-only from the student's perspective; admin operations are out of this feature's scope.

**Alternatives considered**:
- Single document per courseCode with nested arrays per type — rejected; makes admin upsert operations more complex (array mutation rather than document-level upsert).
- Reusing `course_units` with a resources sub-field — rejected; mixing curriculum metadata with editable resource links in the same document violates the single-responsibility principle and couples Feature 002's schema to runtime-editable data.

---

## Decision 7: Frontend panel state management — three nested layers

**Decision**: The Zustand `skillTreeStore` has three state fields governing the panel layers:
1. `activeCourseId: string | null` — set when a node is clicked; `null` when panel is closed.
2. `activeTab: 'resources' | 'why' | 'skills'` — reset to `'resources'` each time `activeCourseId` changes.
3. `activeSkillName: string | null` — set when a skill item in the Market Skills tab is clicked; `null` when sub-panel is closed.

Panel renders are gated: the course detail side panel renders only when `activeCourseId !== null`; the skill sub-panel renders only when `activeSkillName !== null`. No route changes — all three layers coexist on the single `/skill-tree` page.

**Rationale**:
- A single Zustand store for all panel states avoids prop-drilling across the canvas, side panel, and modal layers.
- Resetting `activeTab` on course switch prevents a stale "Why This Course" tab from remaining open when the student navigates to a different node.
- Keeping all panels on one page (`/skill-tree`) avoids unnecessary route complexity for what is fundamentally a layered UI state problem. The existing React Router setup (Feature 001) registers `/skill-tree` as a single route; all panel layers are pure in-page state.

**Alternatives considered**:
- URL-based panel state (query params `/skill-tree?course=IT3910E&tab=why`) — rejected; it adds routing complexity, makes deep-linking possible but undesirable (direct link to an AI tab would trigger an LLM call from URL), and is inconsistent with the store-based state management used in this project.
- React Context for panel state — rejected; Zustand is established as the client state management approach; adding Context would create competing state management paradigms.

---

## Decision 8: Graph rendering — @xyflow/react v12 (consistent with Feature 003)

**Decision**: Use `@xyflow/react` v12 (React Flow) for the skill tree graph.

**Rationale**:
- React Flow v12 provides React-native integration, built-in pan/zoom/collapse hooks, and zero SVG/Canvas boilerplate — ideal for a React SPA.
- The `onNodeClick` handler natively supports opening the course detail side panel on node click without any additional event wiring.
- `NodeResizer` and `NodeToolbar` built-ins (v12) simplify status-change controls on nodes without custom overlay logic.
- As a plain React library (not framework-specific), it works identically in a React 18 + React Router SPA as in any other React setup.
- The `CourseNode` custom component pattern can be applied directly: add an `onClick` prop for panel opening, add a locked visual indicator.
- The data source changes (from static JSON to canonical primary roadmap from Feature 009), but the graph rendering layer is identical.

**Alternatives considered**:
- Switching to Cytoscape.js or D3 — no reason to change; Feature 003's decision reasoning still holds. Adding a new graph library for an existing use case would be inconsistent.

---

## Decision 9: Node state enum casing — `pending`/`in_progress`/`done` (lowercase snake_case)

**Decision**: Node states are stored as lowercase snake_case strings: `"pending"`, `"in_progress"`, `"done"`. This differs from Feature 003's PascalCase (`"Pending"`, `"InProgress"`, `"Done"`).

**Rationale**:
- The new spec consistently uses lowercase snake_case in its text (`pending`, `in_progress`, `done`). Using the spec's native casing eliminates conversion at every spec-to-code boundary.
- Lowercase snake_case is idiomatic for MongoDB string enum fields and matches the convention used in `course_units.prerequisites[]` and other existing schemas in this codebase.
- Feature 003 is a separate (superseded) feature — its `skill_node_statuses` collection is not shared with Feature 004. Feature 004's new `skill_node_statuses` v2 documents are written only by this feature, so no migration compatibility is required.

**Alternatives considered**:
- PascalCase (as in Feature 003) — rejected; the spec uses lowercase, and PascalCase status strings would diverge from spec language at every review and test assertion.
- SCREAMING_SNAKE_CASE (`PENDING`, `IN_PROGRESS`, `DONE`) — rejected; inconsistent with the rest of the codebase.
