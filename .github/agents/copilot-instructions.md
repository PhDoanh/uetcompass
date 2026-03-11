# uetcompass Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-07

## Active Technologies
- Node.js 20 LTS + Express.js (consistent with existing backend stack) + `node-cron` (Cron scheduler), `@google/generative-ai` (Gemini SDK — first integration), `@tavily/core` (Tavily Extract SDK — first integration), `mongoose` (existing) (002-seed-ctdt-dag)
- MongoDB Atlas free tier via Mongoose — collection: `course_units`; upsert filter key: `{ code, major }` (002-seed-ctdt-dag)
- MongoDB Atlas free tier — `users` collection (auth + lockout state), `refresh_tokens` collection (RT rotation + reuse detection with TTL index), `notifications` collection (in-app notification persistence); `student_profiles` collection (read/write — owned by Feature 001, extended here with `repersonalizationPending` flag) (005-account-management)
- MongoDB Atlas free tier — new `roadmap_progress_cache` collection (owned by this feature); reads `roadmap_nodes` collection (owned by Feature 004 — Skill Tree) (007-progress-tracking)
- JavaScript/TypeScript – Node.js 20 LTS for backend (existing monolith), React 18 (frontend admin UI if needed). (006-ai-auto-tagging)
- MongoDB Atlas for primary data; new collections `skills`, `tags`, `tagging_jobs` used as queue and audit log. (006-ai-auto-tagging)

- JavaScript — Node.js 20 LTS (backend), React 18 (frontend) (001-profile-onboarding)

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
- 006-ai-auto-tagging: Added JavaScript/TypeScript – Node.js 20 LTS for backend (existing monolith), React 18 (frontend admin UI if needed).
- 007-progress-tracking: Added JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
- 005-account-management: Added JavaScript — Node.js 20 LTS (backend), React 18 (frontend)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
