# uetcompass Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-07

## Active Technologies
- Node.js 20 LTS + Express.js (consistent with existing backend stack) + `node-cron` (Cron scheduler), `@google/generative-ai` (Gemini SDK — first integration), `@tavily/core` (Tavily Extract SDK — first integration), `mongoose` (existing) (002-seed-ctdt-dag)
- MongoDB Atlas free tier via Mongoose — collection: `course_units`; upsert filter key: `{ code, major }` (002-seed-ctdt-dag)
- MongoDB Atlas free tier — `users` collection (auth + lockout state), `refresh_tokens` collection (RT rotation + reuse detection with TTL index), `notifications` collection (in-app notification persistence); `student_profiles` collection (read/write — owned by Feature 001, extended here with `repersonalizationPending` flag) (005-account-management)
- MongoDB Atlas free tier — new `roadmap_progress_cache` collection (owned by this feature); reads `roadmap_nodes` collection (owned by Feature 004 — Skill Tree) (007-progress-tracking)
- [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION] (009-resource-curation)
- [if applicable, e.g., PostgreSQL, CoreData, files or N/A] (009-resource-curation)
- MongoDB Atlas free tier — 3 new collections: `learning_resources`, `academic_documents`, `skill_trend_snapshots`; reads `skills` collection (owned by Roadmap module) (009-resource-curation)

- JavaScript — Node.js 20 LTS (backend), React 18 (frontend) (001-profile-onboarding)
- JavaScript — Node.js 20 LTS (backend), React 18 (frontend) (004-skill-tree)
- MongoDB Atlas free tier — new collections: `skill_node_statuses`, `course_ai_contexts`, `course_resources`; read-only: `student_roadmaps` (written by personalization job), `market_skills`, `skill_learning_resources` (written by crawling service), `student_profiles` (Feature 001) (004-skill-tree)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test; npm run lint

## Code Style

JavaScript — Node.js 20 LTS (backend), React 18 (frontend): Follow standard conventions

## Recent Changes
- 009-resource-curation: Added JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
- 009-resource-curation: Added [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION] + [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]
- 007-progress-tracking: Added JavaScript — Node.js 20 LTS (backend), React 18 (frontend)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
