# Research: AI-Powered Personalised Roadmap Generator

**Feature**: `009-automated-roadmap-generator`
**Date**: 2026-03-14
**Status**: Refined — canonical lifecycle ownership + multi-roadmap model applied

---

## R-001: Gemini Structured JSON Output for Roadmap Generation

**Decision**: Use `@google/generative-ai` SDK (already in-codebase from Feature 002) with `responseMimeType: 'application/json'` and `responseSchema` set to a JSON Schema matching a simple `string[]` of approved skill names. The AI call is scoped to a single task: given a list of off-template skills, return only those that are career-relevant for the student's stated role. Template-matched skill node construction, ordering, and topological validation are handled entirely by system logic; the AI is not involved in those steps.

**Rationale**: `responseSchema` enforcement ensures the AI returns a valid JSON array of strings — no post-response parsing required. Scoping the AI to off-template skill evaluation only (rather than full roadmap generation) minimises token usage and keeps AI responsibility narrow: the system owns template matching, ordering, and node enrichment; the AI only judges career relevance for skills absent from the template. `resources` is **not** included in the AI schema — all nodes receive `resources: []` at generation time; template-matched nodes inherit `resources` from the template if the value is non-null, otherwise the system defaults to `[]`.

**Pattern**:
```js
// backend/src/modules/roadmap/generation.service.js
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const offTemplateEvalSchema = {
  type: SchemaType.ARRAY,
  items: {
    type: SchemaType.OBJECT,
    properties: {
      skillName: { type: SchemaType.STRING },
      reason:    { type: SchemaType.STRING },
    },
    required: ['skillName', 'reason'],
  },
};

const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: offTemplateEvalSchema,
  },
});

async function evaluateOffTemplateSkills(offTemplateSkills, profile, program) {
  if (!profile.careerGoal?.role && !profile.careerGoal?.companyType) {
    return []; // No career goal — skip AI call, exclude all off-template skills
  }

  const prompt = `You are evaluating skills for career relevance for a UET-VNU student.

Student Profile:
- Major: ${profile.major}
- Career Goal Role: ${profile.careerGoal?.role ?? 'not provided'}
- Career Goal Company Type: ${profile.careerGoal?.companyType ?? 'not provided'}
- Graduation Timeline: ${profile.graduationTimeline ?? 'not provided'}
- Personal Aspirations: ${profile.personalAspirations ?? 'not provided'}

Program Description: ${program.objectives}

Off-template skills to evaluate:
${JSON.stringify(offTemplateSkills)}

Instructions:
For each skill in the list that is meaningfully relevant to the student's career goal,
return an object with the skill name and a plain-language reason explaining why it matters
for the student's specific role and company type.
Omit skills that are tangential, redundant, or not applicable. Return an empty array if
no skills qualify.`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text()); // { skillName, reason }[] for approved skills
}
```

**Alternatives considered**:
- Delegating full roadmap generation to AI (rejected — template matching and topological ordering are deterministic system rules; AI involvement should be minimal and scoped to subjective career-relevance judgement for off-template skills only)
- Returning only `skillName[]` from the off-template eval call (rejected — requires a second enrichment call for `reason`; returning `{ skillName, reason }` in the same call is more efficient and keeps the AI context consistent)

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
  // Map each courseCode to the index of the node that contains it in relatedCourses
  const courseToNodePosition = new Map();
  selectedNodes.forEach((node, i) => {
    for (const rc of node.relatedCourses ?? []) {
      courseToNodePosition.set(rc.courseCode, i);
    }
  });

  for (let i = 0; i < selectedNodes.length; i++) {
    const node = selectedNodes[i];
    for (const rc of node.relatedCourses ?? []) {
      const prereqs = prereqMap.get(rc.courseCode) ?? [];
      for (const prereq of prereqs) {
        // Completed courses are satisfied prerequisites — not present in courseToNodePosition
        if (!courseToNodePosition.has(prereq)) continue;
        if (courseToNodePosition.get(prereq) >= i) {
          throw new Error(
            `Ordering violation: skill "${node.skillName}" (via ${rc.courseCode}) appears before its prerequisite ${prereq}`
          );
        }
      }
    }
  }
}
```

If `validateTopologicalOrder()` throws, `generation.service.js` catches the error, calls `roadmapService.upsertFailed()` (leaving the roadmap document without `acceptedAt`), and sends the failure notification to the student (see R-005).

**Alternatives considered**:
- Kahn's algorithm (BFS): rejected — DFS combines cycle detection and order validation in a single traversal with less bookkeeping
- `graphlib` npm library: rejected — adding a library dependency for a 30-line function is over-engineering for a fixed-size curriculum graph
- Trusting the AI's ordering without validation: rejected — NFR-001 explicitly mandates system-level validation; spec treats violations as generation failures

---

## R-003: In-Process Async Generation + Concurrency Guard

**Decision**: Fire-and-forget `async` function from the generation trigger (no `await` at the call site). Concurrency guard = module-level `Set<string>` of active `userId` strings in `generation.service.js`. Add `userId` on generation start; delete in the `finally` block on completion or failure. On new trigger, check `Set` membership before starting — reject with canonical `CONFLICT` semantics if found.

**Rationale**: No Redis, no BullMQ — Render free-tier is a single instance with no external queue service (established in Feature 001). An in-memory `Set` is the correct single-instance concurrency guard. The fire-and-forget pattern keeps the HTTP trigger response immediate (202 Accepted) while generation runs in the background.

**Pattern**:
```js
// backend/src/modules/roadmap/generation.service.js
const activeGenerations = new Set(); // module-level; one entry per userId currently generating

async function triggerGeneration(userId, studentProfileId, triggerReason) {
  if (activeGenerations.has(userId.toString())) {
    throw new Error('CONFLICT');
  }

  // Fire and forget — caller returns immediately
  runGenerationLifecycle(userId, studentProfileId, triggerReason).catch((err) => {
    // Unhandled errors here are bugs — log for debugging
    console.error('[generation] Unhandled lifecycle error:', err);
  });
}

async function runGenerationLifecycle(userId, studentProfileId, triggerReason) {
  activeGenerations.add(userId.toString());
  let personalisationLevel = 'low'; // safe fallback; overwritten after profile is loaded
  try {
    const profile        = await loadStudentProfile(studentProfileId);
    personalisationLevel = profile.careerGoal?.role || profile.careerGoal?.companyType ? 'full' : 'low';
    const program        = await loadProgram(profile.major);          // resolves nameEN → programId
    const courseUnits    = await loadCourseUnitDAG(program._id);      // find({ programId }) — all courses for major
    const template       = await loadRoadmapTemplate(profile.careerGoal?.role ?? null);
    // loads career-track-specific template if careerGoal.role matches a known careerTrack;
    // falls back to { careerTrack: null } generic template if no match or role absent

    // Step 2: collect skills from all non-completed courses, build reverse map
    const skillCoursesMap = buildSkillCoursesMap(courseUnits, profile.completedCourseCodes ?? []);
    // skillCoursesMap: Map<skillName, CourseUnit[]>

    // Step 3: match skills against template; inherit nodeType/parentNodeId/order/reason/resources from template
    const { templateNodes, offTemplateSkills } = matchSkillsToTemplate(skillCoursesMap, template);

    // Step 4: AI evaluates off-template skills for career relevance (skipped if no career goal)
    const approvedOffTemplate = await evaluateOffTemplateSkills(offTemplateSkills, profile, program);

    // Step 5: map approved off-template skills to topic node with most relatedCourses overlap
    const offTemplateNodes = mapOffTemplateSkills(approvedOffTemplate, skillCoursesMap, templateNodes);

    const nodes = [...templateNodes, ...offTemplateNodes];
    validateTopologicalOrder(nodes, courseUnits);

    previewStore.storePendingPreview(userId, {
      nodes,
      personalisationLevel,
      triggerReason,
      studentProfileId,
    });

    await notifyPreviewReady(userId, { nodes, personalisationLevel });
  } catch (err) {
    await roadmapService.upsertFailedWithProfile(userId, studentProfileId, err.message, personalisationLevel);
    await notifyGenerationFailed(userId);
  } finally {
    activeGenerations.delete(userId.toString());
  }
}
```

Worker restart recovery: the `finally` block always runs on normal termination. On `SIGTERM` (graceful Render shutdown), any `userId` whose generation was in-flight has the preview lost; the `SIGTERM` handler should iterate `pendingPreviews` (R-004) and call `upsertFailedWithProfile` for each. On ungraceful crash, the student will receive no notification — the retry mechanism is available from the Skill Tree once they reload and find their roadmap without `acceptedAt` (if a previous roadmap document existed).

**Alternatives considered**:
- BullMQ + Redis queue (rejected — requires Redis; Render free-tier constraint from Feature 001)
- Worker threads (rejected — unnecessary complexity for a per-user, low-frequency job)
- Database-level `processing` status flag (rejected — would require polling or change streams for status updates; in-memory `Set` covers single-instance deployment without DB overhead)

---

## R-004: In-Memory Preview Storage (Transient UX Only)

**Decision**: Keep module-level `Map<string, PreviewPayload>` in `roadmap.preview.store.js`, keyed by `userId.toString()`, but treat it as transient UX cache only. Acceptance commit no longer reads from this store as source of truth; fork-consumable acceptance receives full nodes payload directly.

**Rationale**: No `roadmap_previews` MongoDB collection — preview remains ephemeral by design. Decoupling acceptance from in-memory preview makes the contract fork-consumable and robust to preview-loss scenarios.

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

**Preview payload shape** (unchanged):
```js
{
  nodes: RoadmapNode[],            // all nodes; resources: [] on every node (template-inherited with null→[] coercion, or [] for off-template)
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
    const preview = previewStore.getPendingPreview(userId);
    await roadmapService.upsertFailedWithProfile(userId, preview.studentProfileId, 'Worker restart — generation preview lost', preview.personalisationLevel);
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
  retryEndpoint:  'POST /api/roadmaps/primary/regenerate',
  message:        'Roadmap generation failed. You can retry from the Skill Tree.',
});
```

`notification.service.js` persists each notification to the `notifications` collection AND pushes it through the SSE connection if the user has an active tab open. If the user is offline, the notification waits in the `notifications` collection and is delivered when they next open the app (Feature 005's unread-fetch mechanism).

**Alternatives considered**:
- Polling endpoint (`GET /api/roadmap/status`) (rejected — SSE is already in place from Feature 001/005; polling adds unnecessary server load)
- Separate SSE endpoint for roadmap events (rejected — duplicates connection management; Feature 005's notification module is designed for cross-feature consumption)
- WebSocket (rejected — bidirectional channel is overkill for one-way server→client push)

---

## R-006: Multi-Roadmap Model + Single Primary Invariant

**Decision**: Move from single roadmap per user to multi-roadmap per user, with `isPrimary` boolean and a partial unique index enforcing exactly one primary roadmap per user.

**Rationale**: Multi-roadmap supports version history and forked variants while preserving deterministic consumer behavior (`GET /api/primary-roadmap`).

**Pattern**:
```js
// backend/src/modules/roadmap/roadmap.model.js
roadmapSchema.index(
  { userId: 1, isPrimary: 1 },
  {
    unique: true,
    partialFilterExpression: { isPrimary: true },
    name: 'primary_per_user_unique',
  }
);

roadmapSchema.index(
  { userId: 1, acceptedAt: 1, updatedAt: -1 },
  { name: 'roadmap_list_by_user_acceptedAt_updatedAt' }
);
```

**Alternatives considered**:
- Keep unique `{ userId: 1 }` (rejected — blocks history/forks)
- Store primary pointer on `users` collection (rejected — cross-collection consistency overhead)

---

## R-007: Fork-Consumable Acceptance Pipeline (No Preview-Accept Endpoint)

**Decision**: Replace old preview-accept endpoint with payload-based acceptance endpoint receiving full `RoadmapNode[]` from caller. Enforce canonical pipeline: `filterCompletedCourses` → `validatePrerequisites` → `commitRoadmap`.

**Rationale**: Contract becomes reusable by any producer/consumer fork and independent from volatile in-memory preview state.

**Pattern**:
```js
// backend/src/modules/roadmap/roadmapAcceptance.service.js
async function acceptRoadmapPayload(userId, payload) {
  const filteredNodes = filterCompletedCourses(payload.nodes, payload.completedCourseCodes);
  if (filteredNodes.length === 0) {
    throw createDomainError('ALL_COMPLETED', 'All submitted nodes are already completed.');
  }

  const validation = validatePrerequisites(filteredNodes, payload.courseUnits);
  if (!validation.ok) {
    throw createDomainError('PREREQUISITE_VIOLATION', validation.message);
  }

  return commitAcceptedRoadmap(userId, {
    ...payload,
    nodes: filteredNodes,
  });
}
```

**Error normalization**:
- `PREREQUISITE_VIOLATION`
- `ALL_COMPLETED`
- `CONFLICT`
- `ROADMAP_NOT_FOUND`

**Alternatives considered**:
- Continue using in-memory preview accept (rejected — not fork-consumable)
- Client-only validation before commit (rejected — canonical rules must be enforced server-side)

---

## R-008: Canonical Transition Authority in Feature 009

**Decision**: Feature 009 owns lifecycle transition rules and conflict semantics. Other features only call contracts.

**Rationale**: Prevents divergent transition logic between onboarding, skill tree, and account modules.

**Guardrail**:
```text
No module outside /modules/roadmap may mutate roadmaps collection directly.
All mutations must pass roadmap.service.js / roadmapAcceptance.service.js.
```
