# Research: Skill Tree – Visual Career Path Tracker

**Phase 0 output** | Branch: `003-skill-tree` | Date: 2026-03-10

All NEEDS CLARIFICATION items from Technical Context are resolved below. No remaining blockers.

---

## Decision 1: React Flow version and package name

**Decision**: Use `@xyflow/react` v12 (the current stable release — migration from the former `reactflow` v11 package).

**Rationale**:
- v12 is the actively maintained release as of early 2026; v11 (`reactflow` package) is in maintenance mode only.
- The new package `@xyflow/react` brings a React-first API: custom node components directly receive the full node object via props instead of only a `data` field, simplifying TypeScript usage.
- `useNodesState`, `useEdgesState`, `<ReactFlow>`, `<Background>`, `<Controls>` all still available with identical usage; migration surface is minimal.
- v12 introduces `NodeResizer` and `NodeToolbar` built-ins which simplify status-change controls on nodes without custom overlay logic.

**Alternatives considered**:
- `reactflow` v11 — rejected because it receives only critical security patches going forward; building on it means a forced migration later.
- D3.js manual DAG rendering — rejected because React Flow eliminates all SVG/Canvas boilerplate, provides pan/zoom/collapse hooks, and is React-native (no imperative DOM management).
- Cytoscape.js — rejected because it is jQuery-era and requires a React wrapper; not idiomatic with the existing stack.

---

## Decision 2: i18n strategy for Vietnamese/English toggle

**Decision**: Store `locale: 'vi' | 'en'` in the Zustand store with `persist` middleware writing to `localStorage`. Each node definition carries both `nameVi` and `nameEn`. UI labels use a static `t()` lookup against a co-located `translations.json` object.

**Rationale**:
- The spec requires exactly two languages (Vietnamese and English); no dynamic locale loading needed.
- Adding `react-i18next` (and its peer dependencies) to support only 2 static locales violates Constitution Principle I (YAGNI — no dependencies without actual need).
- A single `translations.js` constant map (`{ vi: {...}, en: {...} }`) plus `const t = (key) => translations[locale][key]` covers all UI strings with zero dependencies.
- Zustand `persist` middleware uses `localStorage` as the backing store — no additional API call required to load/save the preference, and it survives page refresh without a DB round-trip.

**Alternatives considered**:
- `react-i18next` — rejected; adds ~50kB and a plugin setup for a two-language static translation requirement.
- Server-side i18n (locale stored in DB on `StudentProfile`) — rejected for this feature; locale preference is a purely UI concern, and requiring a DB write for a toggle adds latency and server complexity with no benefit.

---

## Decision 3: Career path node definitions — static JSON vs MongoDB collection

**Decision**: Career path definitions live as static JSON files in `backend/src/modules/skill-tree/careerPaths/`, loaded into memory at server startup.

**Rationale**:
- Constitution Principle II: "hardcoded for UET context" — path changes are curriculum decisions, not runtime data. Storing them as code means every change goes through code review.
- No MongoDB collection means no migration burden when adding a new career path. A new `.json` file + PR is the complete workflow.
- Memory footprint is negligible: 5–10 career paths × ~100 nodes × ~200 bytes each ≈ <200KB in-process.
- The loader (`careerPaths/index.js`) reads all JSON files in the directory at startup and caches them in a `Map<careerGoalId, CareerPath>`. Hot-reload in dev is a one-restart operation.

**Alternatives considered**:
- MongoDB `career_paths` collection — rejected because it adds a new collection, requires a seed script, and makes structural changes to the learning path invisible in code history.
- Importing JSON directly as ES modules — rejected because dynamic directory scanning is cleaner than enumerating imports by name, and allows adding future career paths without touching any JS file.

---

## Decision 4: Unlock computation — server-side vs client-side

**Decision**: Unlock computation ("`isUnlocked`" flag per node) is performed **server-side** on every `GET /api/skill-tree/:studentId` response. The client uses the returned `isUnlocked` flag directly; it does not re-run the DAG traversal locally.

**Rationale**:
- Server-side computation is the single source of truth. The client cannot be trusted to enforce the locked-node guard (a student could craft a PATCH request bypassing client-side checks). Guard enforcement must be on the server regardless.
- Since the server already runs the traversal for guard purposes, returning `isUnlocked` in the response avoids duplicating the algorithm in the frontend.
- The traversal is O(V + E) on a small graph (<100 nodes) — negligible computation per request.

**Alternatives considered**:
- Client-side unlock computation from raw statuses — rejected because it doubles the algorithm surface and makes it possible for out-of-sync local state to show incorrect unlock states between polls.

---

## Decision 5: Progress calculation — server-side vs client-side

**Decision**: Progress (`{ done, total, percentage }`) is computed **server-side** and returned in the GET response alongside the nodes array, not computed by the client.

**Rationale**:
- The "total" count is the total number of nodes in the student's career path — a datum the client would need to receive anyway. Sending the precomputed percentage costs zero extra bytes and removes floating-point edge cases from the frontend.
- Keeps frontend components simple: `ProgressBar` receives `percentage` as a prop.

**Alternatives considered**:
- Client-side: `done / nodes.length * 100` — rejected; client already receives nodes so this would technically work, but the server is already iterating over all nodes to compute unlock states, making server-side progress free.

---

## Decision 6: Next-step recommendation algorithm

**Decision**: Pure topological sort (Kahn's algorithm / BFS-based) over the career path DAG. After computing unlock states, collect all nodes where `isUnlocked === true && status === 'Pending'`, then sort by topological ordering (nodes closer to the start of the path rank first), and return the first 1–3.

**Rationale**:
- Constitution Principle IV explicitly mandates: "Next Steps recommendation MUST be implemented as pure DAG traversal code. Do NOT call Gemini API."
- Kahn's algorithm is O(V + E) and has no external dependencies.
- "Closer to the start of the path" is a natural proxy for "most logical next step" — foundational skills before advanced ones.

**Alternatives considered**:
- LLM-based recommendation — explicitly prohibited by Constitution Principle IV.
- Random selection from unlocked-pending nodes — rejected; does not reflect curriculum progression order.
- Heuristic ranking (e.g., fewest remaining dependencies) — over-engineered for MVP; topological position already captures this.

---

## Decision 7: Collapsible subgraph pattern in React Flow

**Decision**: Implement collapsible branches by maintaining a `collapsedNodes: Set<string>` in the Zustand store. When a branch-root node is toggled, a BFS from that node collects all descendant IDs; those node IDs are filtered out of the `nodes` array passed to `<ReactFlow>`. Edges with hidden node endpoints are similarly filtered.

**Rationale**:
- React Flow v12 has no built-in "collapse subgraph" feature. The standard community pattern is to filter the `nodes` / `edges` arrays before rendering.
- Filtering is O(V + E) and runs in the store selector — negligible cost.
- This approach is compatible with React Flow's controlled mode (`useNodesState`) and avoids any internal React Flow state mutations.

**Alternatives considered**:
- React Flow `hidden` property on nodes — setting `node.hidden = true` hides the node in React Flow v12 but still renders it in the DOM (just invisible). Filtering is preferred for tree sizes of 50–100 nodes to avoid unnecessary DOM nodes.
- External `dagre` layout recalculation on collapse — not needed because the remaining visible graph re-layouts automatically via React Flow's built-in layout engine.

---

## Decision 8: Optimistic update pattern with Zustand

**Decision**: Before firing the PATCH request, snapshot the current `nodes` array in Zustand. Update the relevant node's `status` and `isUnlocked` (re-compute locked children) optimistically. If the API returns an error, restore the snapshot. Error message shown via a toast.

**Rationale**:
- FR-008 requires status changes to be "visually reflected within 1 second." With Render cold start ~50s and normal response times of 200–500ms, optimistic update is the only reliable way to meet this goal.
- Zustand's `get()` / `set()` pattern makes snapshot-and-rollback trivial without extra middleware:
  ```js
  const snapshot = get().nodes;
  set({ nodes: updatedNodes });
  try { await patchNodeStatus(...); }
  catch { set({ nodes: snapshot }); showToast('Update failed'); }
  ```
- Immer middleware is not needed for this pattern — direct state replacement with snapshot suffices.

**Alternatives considered**:
- React Query / TanStack Query — provides optimistic update utilities but adds ~13kB for a single feature; Zustand already handles state; rejected per YAGNI.
- Waiting for server confirmation before UI update — rejected; cannot meet the 1s UX requirement against Render free-tier response times.
