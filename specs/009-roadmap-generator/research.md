# Research: AI-Powered Personalised Roadmap Generator

**Feature**: `009-roadmap-generator`
**Date**: 2026-03-11
**Status**: Complete — all unknowns resolved

---

## R-001: Gemini Structured JSON Output for Roadmap Generation

**Decision**: Use `@google/generative-ai` SDK (already in-codebase from Feature 002) with `responseMimeType: 'application/json'` and `responseSchema` set to a JSON Schema matching `RoadmapNode[]`. The AI is instructed via a single prompt to (1) select career-relevant courses, (2) return them in valid topological order, and (3) enrich each node with `gainedSkills`, `supportingSkills`, `reason`, and `careerRelevanceNote`. Re-generation with base roadmap context passes the existing accepted roadmap's `nodes` array in the prompt alongside the updated profile and full DAG.

**Rationale**: `responseSchema` enforcement (available in Gemini 1.5 Flash) ensures the AI never returns free-form text or partially-structured JSON, eliminating the need for a post-response parser. Gemini validates the response shape server-side before it reaches the application. A single prompt (selection + ordering + enrichment) is more token-efficient than a two-pass approach and keeps the generation lifecycle simple. The `resources` field is **not** included in the schema — the system appends an empty array to every node after parsing.

**Pattern**:
```js
// backend/src/modules/roadmap/generation.service.js
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const roadmapNodeSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      courseCode:          { type: SchemaType.STRING },
      courseName:          { type: SchemaType.STRING },
      credits:             { type: SchemaType.NUMBER },
      suggestedSemester:   { type: SchemaType.NUMBER },
      gainedSkills:        { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      supportingSkills:    { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
      reason:              { type: SchemaType.STRING },
      careerRelevanceNote: { type: SchemaType.STRING },
    },
    required: [
      'courseCode', 'courseName', 'credits',
      'gainedSkills', 'supportingSkills', 'reason', 'careerRelevanceNote',
    ],
  },
};

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: roadmapNodeSchema,
  },
});

async function callGemini(profile, courseUnits, existingRoadmap = null) {
  const baseContext = existingRoadmap
    ? `\nExisting accepted roadmap (use as base context — informs but does not constrain the new output):\n${JSON.stringify(existingRoadmap.nodes)}`
    : '';

  const prompt = `You are a personalised learning roadmap generator for UET-VNU students.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}
- Completed Course Codes: ${(profile.completedCourseCodes ?? []).join(', ') || 'none'}

Available CourseUnits (DAG with prerequisites):
${JSON.stringify(courseUnits)}
${baseContext}

Instructions:
1. Select only career-relevant courses: all required-type courses that are direct or transitive
   prerequisites of career-relevant courses, plus only the electives that best match the career goal.
2. Exclude courses listed in Completed Course Codes as actionable nodes.
   Treat completed courses as satisfied prerequisites when determining accessible nodes.
3. Return selected nodes in valid topological order: each node MUST appear after all its prerequisites.
4. If no career goal is provided, include all required-type courses in topological order.
5. For each node, populate gainedSkills (skills the course teaches), supportingSkills (skills needed
   in practice for the career goal that the course does NOT teach), reason, and careerRelevanceNote.
6. supportingSkills must NOT repeat skills already listed in gainedSkills for the same node.
7. Do NOT include a resources field — the system will append an empty array after parsing.`;

  const result = await model.generateContent(prompt);
  const nodes = JSON.parse(result.response.text());
  // Append resources: [] to every node after parsing
  return nodes.map((node) => ({ ...node, resources: [] }));
}
```

**Alternatives considered**:
- Manually parsing free-text Gemini response (rejected — response format is unstable across calls; `responseSchema` provides a binding guarantee)
- Two-pass approach: selection in Pass 1, enrichment in Pass 2 (rejected — doubles LLM calls and token cost; single call is sufficient)
- `suggestedSemester` as required field in schema (rejected — the AI may not always have semester data; made optional to prevent schema validation failures on missing metadata)

---

## R-002: Topological Sort Validation (DFS + Cycle Detection)

**Decision**: After receiving the AI-ordered `RoadmapNode[]`, perform an O(V+E) DFS on the CourseUnit prerequisite subgraph to (a) detect cycles (data integrity guard, NFR-005) and (b) validate that the AI's node sequence is a valid topological ordering. Any cycle in the DAG or any ordering violation in the AI output is treated as a generation failure.

**Rationale**: The specification mandates system-level validation of the AI's output ordering (NFR-001). DFS-based cycle detection (3-colour marking) and ordering validation can be combined in a single O(V+E) pass — well within budget for UET's curriculum scale (~200 course nodes maximum). No external library is needed; a 30-line helper is sufficient.

**Pattern**:
```js
// backend/src/modules/roadmap/generation.service.js
function validateTopologicalOrder(selectedNodes, allCourseUnits) {
  // Build prerequisite adjacency map from the full DAG
  const prereqMap = new Map();
  for (const unit of allCourseUnits) {
    prereqMap.set(unit.code, unit.prerequisites ?? []);
  }

  // Phase 1: Detect cycles using 3-colour DFS
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();

  function dfs(code) {
    const c = color.get(code) ?? WHITE;
    if (c === GRAY) {
      throw new Error(`DAG cycle detected involving course: ${code}`);
    }
    if (c === BLACK) return;
    color.set(code, GRAY);
    for (const prereq of prereqMap.get(code) ?? []) {
      dfs(prereq);
    }
    color.set(code, BLACK);
  }

  for (const unit of allCourseUnits) {
    if ((color.get(unit.code) ?? WHITE) === WHITE) {
      dfs(unit.code);
    }
  }

  // Phase 2: Validate AI ordering against prerequisite constraints
  // Build a position index for nodes in the AI output
  const positionMap = new Map();
  selectedNodes.forEach((node, i) => positionMap.set(node.courseCode, i));

  for (const node of selectedNodes) {
    const prereqs = prereqMap.get(node.courseCode) ?? [];
    for (const prereq of prereqs) {
      // Completed courses are satisfied prerequisites — they are not in the output nodes array
      if (!positionMap.has(prereq)) continue;
      if (positionMap.get(prereq) >= positionMap.get(node.courseCode)) {
        throw new Error(
          `Ordering violation: ${node.courseCode} appears before its prerequisite ${prereq}`
        );
      }
    }
  }
}
```

If `validateTopologicalOrder()` throws, `generation.service.js` catches the error, stores a `status: failed` document, and sends the failure notification to the student (see R-005).

**Alternatives considered**:
- Kahn's algorithm (BFS): rejected — DFS combines cycle detection and order validation in a single traversal with less bookkeeping
- `graphlib` npm library: rejected — adding a library dependency for a 30-line function is over-engineering for a fixed-size curriculum graph
- Trusting the AI's ordering without validation: rejected — NFR-001 explicitly mandates system-level validation; spec treats violations as generation failures

---

## R-003: In-Process Async Generation + Concurrency Guard

**Decision**: Fire-and-forget `async` function from the generation trigger (no `await` at the call site). Concurrency guard = module-level `Set<string>` of active `userId` strings in `generation.service.js`. Add `userId` on generation start; delete in the `finally` block on completion or failure. On new trigger, check `Set` membership before starting — reject with `GENERATION_IN_PROGRESS` if found.

**Rationale**: No Redis, no BullMQ — Render free-tier is a single instance with no external queue service (established in Feature 001). An in-memory `Set` is the correct single-instance concurrency guard. The fire-and-forget pattern keeps the HTTP trigger response immediate (202 Accepted) while generation runs in the background.

**Pattern**:
```js
// backend/src/modules/roadmap/generation.service.js
const activeGenerations = new Set(); // module-level; one entry per userId currently generating

async function triggerGeneration(userId, studentProfileId, triggerReason) {
  if (activeGenerations.has(userId.toString())) {
    throw new Error('GENERATION_IN_PROGRESS');
  }

  // Fire and forget — caller returns immediately
  runGenerationLifecycle(userId, studentProfileId, triggerReason).catch((err) => {
    // Unhandled errors here are bugs — log for debugging
    console.error('[generation] Unhandled lifecycle error:', err);
  });
}

async function runGenerationLifecycle(userId, studentProfileId, triggerReason) {
  activeGenerations.add(userId.toString());
  try {
    const profile      = await loadStudentProfile(studentProfileId);
    const courseUnits  = await loadCourseUnitDAG(profile.major);
    const existingRoadmap =
      triggerReason === 'repersonalization'
        ? await roadmapService.getCompletedByUser(userId)  // null if none
        : null;

    const nodes = await callGemini(profile, courseUnits, existingRoadmap);
    validateTopologicalOrder(nodes, courseUnits);

    const personalisationLevel =
      profile.careerGoal?.role || profile.careerGoal?.companyType ? 'full' : 'low';

    previewStore.storePendingPreview(userId, {
      nodes,
      personalisationLevel,
      triggerReason,
      studentProfileId,
    });

    await notifyPreviewReady(userId, { nodes, personalisationLevel });
  } catch (err) {
    await roadmapService.upsertFailed(userId, err.message);
    await notifyGenerationFailed(userId);
  } finally {
    activeGenerations.delete(userId.toString());
  }
}
```

Worker restart recovery: the `finally` block always runs on normal termination. On `SIGTERM` (graceful Render shutdown), any `userId` whose generation was in-flight has the preview lost; the `SIGTERM` handler should iterate `pendingPreviews` (R-004) and call `upsertFailed` for each. On ungraceful crash, the student will receive no notification — the retry mechanism is available from the Skill Tree once they reload and see `status: failed` on their roadmap (if a previous roadmap document existed).

**Alternatives considered**:
- BullMQ + Redis queue (rejected — requires Redis; Render free-tier constraint from Feature 001)
- Worker threads (rejected — unnecessary complexity for a per-user, low-frequency job)
- Database-level `processing` status flag (rejected — would require polling or change streams for status updates; in-memory `Set` covers single-instance deployment without DB overhead)

---

## R-004: In-Memory Preview Storage

**Decision**: Module-level `Map<string, PreviewPayload>` in a dedicated `roadmap.preview.store.js` file, mapping `userId.toString()` to the full preview payload. The accept endpoint reads and clears the preview; the reject endpoint clears it without committing. Preview does not survive a worker restart (per FR-034).

**Rationale**: No `roadmap_previews` MongoDB collection — the spec explicitly mandates in-memory-only preview storage (FR-034). The Map is lightweight, bounded by the number of users with a pending preview (typically very low), and makes accept/reject synchronous O(1) lookups. Extracting the Map to a dedicated module allows `generation.service.js` and `roadmapAcceptance.service.js` to both access it without circular imports.

**Pattern**:
```js
// backend/src/modules/roadmap/roadmap.preview.store.js
const pendingPreviews = new Map(); // userId (string) → PreviewPayload

function storePendingPreview(userId, payload) {
  pendingPreviews.set(userId.toString(), payload);
}

function getPendingPreview(userId) {
  return pendingPreviews.get(userId.toString()) ?? null;
}

function clearPendingPreview(userId) {
  pendingPreviews.delete(userId.toString());
}

// Called on SIGTERM to surface failures for any pending previews
function getAllPendingUserIds() {
  return [...pendingPreviews.keys()];
}

module.exports = { storePendingPreview, getPendingPreview, clearPendingPreview, getAllPendingUserIds };
```

**Preview payload shape**:
```js
{
  nodes: RoadmapNode[],            // AI output with resources: [] appended
  personalisationLevel: 'full' | 'low',
  triggerReason: 'profile_submission' | 'retry' | 'repersonalization',
  studentProfileId: ObjectId,
}
```

**Worker restart / SIGTERM handler** (registered once in `app.js` or a lifecycle module):
```js
process.on('SIGTERM', async () => {
  const pendingUserIds = previewStore.getAllPendingUserIds();
  for (const userId of pendingUserIds) {
    await roadmapService.upsertFailed(userId, 'Worker restart — generation preview lost');
    await notifyGenerationFailed(userId);
    previewStore.clearPendingPreview(userId);
  }
  process.exit(0);
});
```

**Alternatives considered**:
- Redis cache for preview storage (rejected — Render free-tier constraint; no Redis available)
- `roadmap_previews` MongoDB collection (rejected — spec explicitly prohibits persistence before acceptance; FR-034)
- JWT-encoded preview returned to client and round-tripped on accept (rejected — preview payload can be large; round-trip through untrusted client is a security concern)

---

## R-005: SSE Notification Delivery for Roadmap Events

**Decision**: Reuse the existing `notification.service.js` (Feature 005) and `notification.sse.js` SSE connection Map for delivering roadmap generation events. Use two event names: `roadmap_preview_ready` (success) and `roadmap_generation_failed` (failure). The success payload includes the full preview (nodes + `personalisationLevel`); the failure payload includes `retryable: true` and a reference to the retry endpoint so any consuming surface can render a retry action.

**Rationale**: Feature 005 built a shared notification infrastructure (SSE delivery + `notifications` collection persistence) specifically for cross-feature use. Re-using it avoids duplicating SSE connection management and the heartbeat pattern. The event naming convention (`roadmap_*`) follows the same pattern as other feature events.

**SSE event payload shapes**:
```js
// Success — delivered when in-memory preview is ready
notifyUser(userId, 'roadmap_preview_ready', {
  type:                  'roadmap_preview_ready',
  personalisationLevel:  'full' | 'low',
  lowPersonalisationNotice: personalisationLevel === 'low'
    ? 'Your roadmap was generated without career goal data. Update your profile for a personalised roadmap.'
    : null,
  preview: {
    nodes: RoadmapNode[],  // Full preview — Feature 004 renders from this
  },
});

// Failure — delivered when generation fails at any stage
notifyUser(userId, 'roadmap_generation_failed', {
  type:           'roadmap_generation_failed',
  retryable:      true,
  retryEndpoint:  'POST /api/roadmap/retry',
  message:        'Roadmap generation failed. You can retry from the Skill Tree.',
});
```

`notification.service.js` persists each notification to the `notifications` collection AND pushes it through the SSE connection if the user has an active tab open. If the user is offline, the notification waits in the `notifications` collection and is delivered when they next open the app (Feature 005's unread-fetch mechanism).

**Alternatives considered**:
- Polling endpoint (`GET /api/roadmap/status`) (rejected — SSE is already in place from Feature 001/005; polling adds unnecessary server load)
- Separate SSE endpoint for roadmap events (rejected — duplicates connection management; Feature 005's notification module is designed for cross-feature consumption)
- WebSocket (rejected — bidirectional channel is overkill for one-way server→client push)
