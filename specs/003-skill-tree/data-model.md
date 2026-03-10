# Data Model: Skill Tree – Visual Career Path Tracker

**Phase 1 output** | Branch: `003-skill-tree` | Date: 2026-03-10

---

## MongoDB Collections

### 1. `skill_node_statuses` *(new — owned by this feature)*

Stores one document per (student, node) pair. Created on first status write; absent documents imply status `"Pending"`.

```js
// Mongoose schema: backend/src/modules/skill-tree/skillNodeStatus.model.js
{
  _id:       ObjectId,          // auto
  studentId: ObjectId,          // required — ref: students collection (from Feature 001)
  nodeId:    String,            // required — matches node.id in career path JSON
  status:    String,            // required — enum: ["Pending", "InProgress", "Done"]
  updatedAt: Date               // required — set on every write via { timestamps: false } + manual assignment
}
```

**Indexes**:
```js
// Compound unique — primary lookup key
{ studentId: 1, nodeId: 1 }    unique: true

// Support bulk-read for all nodes of a single student
{ studentId: 1 }
```

**Business rules enforced by service layer (not schema)**:
- A status update is rejected (`403`) if `isUnlocked(node) === false` for the requesting student.
- `"Pending"` is the implicit default — no document means Pending; a document with `status: "Pending"` can exist after a rollback.
- Allowed transitions: any status → any status (the spec imposes no invalid-transition rule; the lock guard is the only constraint).

---

### 2. `course_units` *(read-only — seeded by Feature 002)*

Referenced by career path JSON for `nameVi`/`nameEn` lookups on Course-type nodes. Not written to by this feature.

```js
{
  code:          String,    // e.g., "IT3910E" — matches nodeId in career path JSON
  nameVi:        String,
  nameEn:        String,
  credits:       Number,
  prerequisites: [String],  // array of course codes
  major:         String
}
```

---

## Static Career Path Definition (JSON)

*Location*: `backend/src/modules/skill-tree/careerPaths/*.json`

Each file defines one career goal. The loader (`careerPaths/index.js`) reads all files in the directory at server startup and caches them.

### File schema

```jsonc
// Example: frontend-developer.json
{
  "id": "frontend-developer",
  "nameVi": "Lập trình viên Frontend",
  "nameEn": "Frontend Developer",
  "nodes": [
    {
      "id": "IT1010",              // For Course-type nodes, matches course_units.code
      "nameVi": "Nhập môn lập trình",
      "nameEn": "Introduction to Programming",
      "type": "Course",            // "Course" | "Skill"
      "prerequisites": []          // array of node IDs in this career path
    },
    {
      "id": "IT3910E",
      "nameVi": "Lập trình Web",
      "nameEn": "Web Development",
      "type": "Course",
      "prerequisites": ["IT1010"]
    },
    {
      "id": "skill-react",
      "nameVi": "React",
      "nameEn": "React",
      "type": "Skill",
      "prerequisites": ["IT3910E"]
    },
    {
      "id": "skill-html-css",
      "nameVi": "HTML/CSS",
      "nameEn": "HTML/CSS",
      "type": "Skill",
      "prerequisites": ["IT1010"]
    }
  ]
}
```

### Validation rules for JSON files (checked at startup by loader):
- `id` must be unique within the file.
- `prerequisites` must reference IDs that exist within the same file.
- No cycles allowed (DFS cycle check at load time; server startup fails if cycle detected).
- `type` must be `"Course"` or `"Skill"`.

---

## API Data Transfer Objects

### `TreeNodeDTO` — single node as returned by the API

```jsonc
{
  "id": "IT3910E",
  "nameVi": "Lập trình Web",
  "nameEn": "Web Development",
  "type": "Course",             // "Course" | "Skill"
  "status": "Pending",          // "Pending" | "InProgress" | "Done"
  "isUnlocked": true,           // computed server-side: all prerequisites status === "Done"
  "prerequisites": ["IT1010"],  // node IDs (same path scope)
  "children": ["skill-react", "skill-html-css"]  // node IDs of direct children in this path
}
```

### `ProgressDTO`

```jsonc
{
  "done": 2,
  "total": 15,
  "percentage": 13              // Math.round(done / total * 100)
}
```

### `SkillTreeResponseDTO` — full GET response

```jsonc
{
  "careerGoalId": "frontend-developer",
  "careerGoalNameVi": "Lập trình viên Frontend",
  "careerGoalNameEn": "Frontend Developer",
  "progress": { "done": 2, "total": 15, "percentage": 13 },
  "nextSteps": ["IT3910E", "skill-html-css"],  // 1–3 node IDs; empty array if all Done
  "nodes": [ /* TreeNodeDTO[] */ ]
}
```

### `CareerPathSummaryDTO` — item in career-paths list

```jsonc
{
  "id": "frontend-developer",
  "nameVi": "Lập trình viên Frontend",
  "nameEn": "Frontend Developer",
  "nodeCount": 15
}
```

---

## Frontend Store Shape (Zustand)

```js
// stores/skillTreeStore.js
{
  // Tree data
  nodes: TreeNodeDTO[],             // current full node list (from last poll or optimistic update)
  careerGoalId: string | null,
  progress: ProgressDTO | null,
  nextSteps: string[],              // node IDs

  // UI state
  locale: 'vi' | 'en',             // persisted via zustand/middleware persist → localStorage
  collapsedNodes: Set<string>,      // node IDs whose subtrees are hidden

  // Optimistic update bookkeeping
  pendingNodeId: string | null,     // node ID currently being updated (shows loading state)

  // Actions
  setTree(response: SkillTreeResponseDTO): void,
  updateNodeStatus(nodeId: string, status: string): void,   // optimistic
  rollbackNode(nodeId: string, previousStatus: string): void,
  toggleCollapse(nodeId: string): void,
  setLocale(locale: 'vi' | 'en'): void,
}
```

---

## Service Layer Computations

### `computeUnlockStates(nodes, statusMap)`

```
Input:  nodes[]  (from career path JSON)
        statusMap: Map<nodeId, status>  (from skill_node_statuses docs)
Output: nodes[] with isUnlocked computed per node

Algorithm:
  For each node n:
    n.isUnlocked = n.prerequisites.every(prereqId => statusMap.get(prereqId) === 'Done')
    n.status = statusMap.get(n.id) ?? 'Pending'
```

### `computeProgress(nodes)`

```
Input:  nodes[] with status populated
Output: ProgressDTO

Algorithm:
  done  = nodes.filter(n => n.status === 'Done').length
  total = nodes.length
  pct   = Math.round(done / total * 100)  [0 if total === 0]
```

### `computeNextSteps(nodes, topologicalOrder, max = 3)`

```
Input:  nodes[] with isUnlocked + status populated
        topologicalOrder: nodeId[]  (pre-computed via Kahn's algorithm from career path graph)
Output: nodeId[] (1–3 items)

Algorithm:
  candidates = nodes
    .filter(n => n.isUnlocked && n.status === 'Pending')
    .sort((a, b) => topologicalOrder.indexOf(a.id) - topologicalOrder.indexOf(b.id))
  return candidates.slice(0, max).map(n => n.id)
```

### `assertNodeIsUnlocked(nodeId, unlockedNodes)`

```
Input:  nodeId, nodes[] with isUnlocked
Throws: 403 SkillTreeError if node.isUnlocked === false
```
