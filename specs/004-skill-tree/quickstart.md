# Quickstart: Skill Tree – Personalized Academic Roadmap Tracker

**Phase 1 output** | Branch: `004-skill-tree` | Date: 2026-03-11

This guide covers how to run the Skill Tree feature locally for development and manual testing.

---

## Prerequisites

The following features must be fully set up and running before starting this feature locally:
- **Feature 001** (Profile Onboarding) — provides `auth.middleware.js`, JWT auth flow, and a seeded `student_profiles` document with `isDraft: false`.
- **Feature 002** (Seed CTĐT DAG) — provides the seeded `course_units` collection consumed by the personalization job that writes to `student_roadmaps`.

**Required software**:
- Node.js 20 LTS (`node --version` should show `v20.x.x`)
- MongoDB Atlas free-tier cluster (connection URI in `.env`)
- npm 9+

---

## Environment Variables

Add the following to `backend/.env` (do not commit this file):

```env
# Existing (from Features 001/002)
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/uetcompass
JWT_SECRET=<your-jwt-secret>

# New for Feature 004
GEMINI_API_KEY=<your-gemini-api-key>
```

Frontend `frontend/.env.local` (never commit this file):
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## Seed Test Data

Before manual testing, seed the required collections. Run these scripts from the repo root (Node.js scripts, not npm packages):

### Seed student_roadmaps (simulates personalization job output)

```js
// scripts/seed-roadmap.js
// Usage: node scripts/seed-roadmap.js <userId>
const mongoose = require('mongoose');
const userId = process.argv[2];
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  await mongoose.connection.collection('student_roadmaps').updateOne(
    { studentId: new mongoose.Types.ObjectId(userId) },
    {
      $set: {
        careerGoal: 'frontend-developer',
        nodes: [
          { courseCode: 'IT1010', nameVi: 'Nhập môn lập trình', nameEn: 'Intro to Programming', credits: 3, prerequisites: [] },
          { courseCode: 'IT3910E', nameVi: 'Lập trình Web', nameEn: 'Web Development', credits: 3, prerequisites: ['IT1010'] },
          { courseCode: 'IT4409', nameVi: 'Kỹ thuật phần mềm', nameEn: 'Software Engineering', credits: 3, prerequisites: ['IT3910E'] }
        ],
        generatedAt: new Date('2026-01-01')  // old date — profile changes will show Re-personalize button
      }
    },
    { upsert: true }
  );
  await mongoose.disconnect();
});
```

### Seed course_resources

```js
// scripts/seed-course-resources.js
await mongoose.connection.collection('course_resources').insertMany([
  { courseCode: 'IT3910E', type: 'textbook', title: 'JavaScript: The Good Parts', url: 'https://example.com/js', description: '' },
  { courseCode: 'IT3910E', type: 'slide', title: 'Week 1 – Intro to Web Dev', url: 'https://example.com/slides/w1', description: '' },
  { courseCode: 'IT3910E', type: 'lab', title: 'Lab 1 – HTML/CSS Basics', url: 'https://example.com/lab1', description: '' },
  { courseCode: 'IT3910E', type: 'assignment', title: 'Final Project – Full-stack App', url: '', description: 'End-of-semester group project' }
]);
```

### Seed market_skills and skill_learning_resources

```js
// scripts/seed-market-skills.js
await mongoose.connection.collection('market_skills').insertOne({
  courseCode: 'IT3910E',
  skills: [
    { name: 'React.js', jobCount: 1240 },
    { name: 'Node.js', jobCount: 980 },
    { name: 'REST API design', jobCount: 870 }
  ],
  crawledAt: new Date()
});
await mongoose.connection.collection('skill_learning_resources').insertOne({
  skillName: 'React.js',
  resources: [
    { title: 'React Docs', url: 'https://react.dev', type: 'free', platform: 'Official Docs' },
    { title: 'React – The Complete Guide', url: 'https://udemy.com/...', type: 'paid', platform: 'Udemy' }
  ],
  updatedAt: new Date()
});
```

---

## Start Development Servers

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev     # nodemon on port 3001

# Terminal 2 — Frontend  
cd frontend
npm install
npm run dev     # Vite dev server on port 5173
```

Navigate to `http://localhost:5173/skill-tree`.

---

## Manual Test Scenarios

### Scenario A — View tree (P1 user story)
1. Log in as a student with submitted onboarding profile.
2. Navigate to `/skill-tree`.
3. **Expected**: Interactive graph renders. IT1010 (no prerequisites) appears unlocked. IT3910E appears unlocked only if IT1010 is `done`. IT4409 appears locked.

### Scenario B — Node state transitions (P2 user story)
1. Click IT1010 (unlocked, `pending`) → **Expected**: status changes to `in_progress` immediately (optimistic update); badge color changes.
2. Click IT1010 again → **Expected**: status changes to `done`; IT3910E becomes unlocked.
3. Try clicking IT4409 (locked) → **Expected**: no state change; locked indicator persists.
4. Refresh the page → **Expected**: all states preserved.

### Scenario C — Course detail panel (P3 user story)
1. Click any node → **Expected**: side panel opens with 3 tabs (Resources, Why This Course, Market Skills).
2. Click Resources tab → **Expected**: seeded materials grouped by type.
3. Click "Why This Course" tab → **Expected**: loading spinner briefly, then AI-generated content.
4. Click "Why This Course" tab again for the same course → **Expected**: content loads instantly (cache hit; `cached: true` in API response).
5. Click Market Skills tab → **Expected**: skill list with job counts.

### Scenario D — Skill sub-panel (P4 user story)
1. Open Market Skills tab for IT3910E.
2. Click "React.js" → **Expected**: modal opens with Free and Paid resource sections.
3. Click a resource link → **Expected**: opens in new tab.

### Scenario E — Re-personalize (P5 user story)
1. In MongoDB Atlas, manually set `student_profiles.updatedAt` to `Date.now()` (newer than `student_roadmaps.generatedAt`).
2. Navigate to `/skill-tree` or wait for the next 2500ms poll.
3. **Expected**: "Re-personalize" button appears prominently on the page.
4. Click it → **Expected**: button shows loading state; disappears once `repersonalizing` clears; tree re-renders with updated nodes.

### Scenario F — AI service unavailable
1. Set `GEMINI_API_KEY` to an invalid value (e.g., `invalid_key`).
2. Open the "Why This Course" tab for a course without a cached AI context.
3. **Expected**: friendly error message shown in the tab ("Content temporarily unavailable"); no crash.

---

## Running Tests

```bash
cd backend
npm test -- --testPathPattern=skill-tree
```

All tests run in-process with mocked MongoDB and mocked Gemini SDK. No external service required.
