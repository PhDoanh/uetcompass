# Data Model: Skill Tree – Personalized Academic Roadmap Tracker

**Phase 1 output** | Branch: `004-skill-tree` | Date: 2026-03-11  
**Research dependency**: [research.md](research.md) (Decisions 1–8)

---

## MongoDB Collections

### 1. `skill_node_statuses` *(new — owned by this feature)*

Stores one document per (student, course node) pair. Absent documents imply status `"pending"`.

```js
// Mongoose schema: backend/src/modules/skill-tree/skillNodeStatus.model.js
{
  _id:       ObjectId,          // auto
  studentId: ObjectId,          // required — ref: users (from Feature 001)
  nodeId:    String,            // required — matches courseCode in student_roadmaps.nodes[].courseCode
  status:    String,            // required — enum: ["pending", "in_progress", "done"]
  updatedAt: Date               // required — set manually on every write
}
```

**Indexes**:
```js
{ studentId: 1, nodeId: 1 }    // compound unique — primary lookup
{ studentId: 1 }               // bulk fetch for all nodes of one student
```

**Business rules** (enforced by service layer, not schema):
- A status update is rejected (`403 Forbidden`) if computed `isUnlocked(node) === false` for the requesting student.
- State transitions allowed: `pending → in_progress → done`. No skips, no reversals.
- `"pending"` is the implicit default — no document = pending; documents with `status: "pending"` may exist after a re-personalization cycle.

---

### 2. `student_roadmaps` *(new — owned by personalization job, read by this feature)*

One document per student. Written by the onboarding/personalization service (external to this feature). Read on every `GET /api/skill-tree` call.

```js
// Read-only from Feature 004's perspective
{
  _id:           ObjectId,
  studentId:     ObjectId,          // unique — ref: users
  careerGoal:    String,            // e.g., "frontend-developer" — used as key for AI prompts
  nodes: [
    {
      courseCode:    String,        // e.g., "IT3910E" — uniquely identifies the course
      nameVi:        String,        // Vietnamese name (primary)
      nameEn:        String,        // English name
      credits:       Number,
      prerequisites: [String]       // array of courseCodes in this roadmap
    }
  ],
  generatedAt:   Date               // set when personalization job completes; used for re-personalize flag
}
```

**Access pattern (this feature)**:
- `findOne({ studentId })` on `GET /api/skill-tree` → returns full roadmap; `null` → 404 (redirect to onboarding)
- `findOneAndUpdate({ studentId }, { generatedAt: Date.now() })` on `POST /api/skill-tree/repersonalize` (optimistic timestamp update while job runs)

---

### 3. `course_ai_contexts` *(new — owned by this feature)*

Cache for Gemini-generated "Why This Course" explanations. Never re-generated once written unless manually purged. Keyed by `{ courseCode, careerGoal }` — shared across all students with the same career goal.

```js
// Mongoose schema: backend/src/modules/skill-tree/aiContext.model.js
{
  _id:         ObjectId,
  courseCode:  String,    // required — e.g., "IT3910E"
  careerGoal:  String,    // required — e.g., "frontend-developer"
  content:     String,    // required — AI-generated text (validated: length >= 50 chars)
  generatedAt: Date       // required — set on first write; used for potential future TTL
}
```

**Indexes**:
```js
{ courseCode: 1, careerGoal: 1 }    // compound unique — cache lookup key
```

**Validation before write** (Constitution Principle IV):
- `content.trim().length >= 50` — reject and do not cache Gemini responses that are too short (likely a refusal or network-truncated response).
- Content must not match known refusal patterns: `/^I (cannot|am unable)/i`.

---

### 4. `course_resources` *(new — admin-seeded, read by this feature)*

One document per course material item. Queried by courseCode for the Resources tab.

```js
// Read-only from student perspective
{
  _id:         ObjectId,
  courseCode:  String,            // required — e.g., "IT3910E"
  type:        String,            // required — enum: ["textbook", "slide", "lab", "assignment"]
  title:       String,            // required
  url:         String,            // optional — link to material
  description: String             // optional — brief description
}
```

**Indexes**:
```js
{ courseCode: 1 }                 // bulk-fetch all resources for a course
{ courseCode: 1, type: 1 }       // optional — filter by type
```

---

### 5. `market_skills` *(external — written by crawling service, read by this feature)*

One document per course. Contains ranked skills observed in Vietnamese IT job postings.

```js
// Read-only from Feature 004
{
  _id:        ObjectId,
  courseCode: String,             // unique
  skills: [
    {
      name:     String,           // e.g., "React.js"
      jobCount: Number            // number of job postings mentioning this skill
    }
  ],
  crawledAt:  Date
}
```

**Access pattern**: `findOne({ courseCode })` on `GET /api/skill-tree/nodes/:courseCode/market-skills`

---

### 6. `skill_learning_resources` *(external — written by crawling/curation service, read by this feature)*

One document per skill. Contains curated or crawled learning resources (free and paid).

```js
// Read-only from Feature 004
{
  _id:       ObjectId,
  skillName: String,              // unique — e.g., "React.js" (matches market_skills.skills[].name)
  resources: [
    {
      title:    String,           // e.g., "React – The Complete Guide"
      url:      String,
      type:     String,           // enum: ["free", "paid"]
      platform: String            // e.g., "Udemy", "YouTube", "Coursera"
    }
  ],
  updatedAt: Date
}
```

**Access pattern**: `findOne({ skillName })` on `GET /api/skill-tree/skills/:skillName/learning-resources`

---

## Referenced Collections (read-only, owned by other features)

### `student_profiles` *(maintained by Feature 001)*

Read for the re-personalize flag computation: `findOne({ userId })` → use `updatedAt` field.

Relevant fields only:
```js
{
  userId:     ObjectId,
  updatedAt:  Date,      // compared to student_roadmaps.generatedAt
  isDraft:    Boolean    // guard: don't allow skill tree access if true (onboarding not submitted)
}
```

### `course_units` *(seeded by Feature 002)*

Not directly queried by this feature. Course metadata (`nameVi`, `nameEn`, `credits`, `prerequisites`) is embedded into `student_roadmaps.nodes[]` by the personalization job to avoid a join at render time.

---

## State Machine: Course Node

```text
[locked — prerequisites not all done]
         │
         │  all prerequisites transition to "done"
         ▼
[pending]
         │
         │  student clicks node
         ▼
   [in_progress]
         │
         │  student clicks node
         ▼
       [done]   ←  unlocks dependent nodes whose other prerequisites are also done
```

**Transition guards** (enforced in `skillTree.service.js`):
| Attempted transition | Guard | Failure |
|---|---|---|
| Any → any (on locked node) | `isUnlocked(node) === false` | `403 Forbidden` |
| `done → in_progress` | Not `pending → in_progress → done` order | `400 Bad Request` |
| `in_progress → pending` | Reversal not permitted | `400 Bad Request` |

**`isUnlocked` computation** (server-side, O(V + E)):
- Fetch all `skill_node_statuses` for the student.
- For each node in the roadmap: `isUnlocked = prerequisites.every(prereqCode => status[prereqCode] === 'done')`.
- Nodes with empty `prerequisites` array are **always unlocked**.

---

## Re-personalization Flag

Computed on every `GET /api/skill-tree` response:

```js
const needsRepersonalization =
  studentProfile.isDraft === false &&
  studentRoadmap !== null &&
  studentProfile.updatedAt > studentRoadmap.generatedAt;
```

Included in the response body alongside the node array.
