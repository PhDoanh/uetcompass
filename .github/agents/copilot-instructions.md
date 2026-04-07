# uetcompass Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-07

## Active Technologies
- Node.js 20 LTS + Express.js (consistent with existing backend stack) + `node-cron` (Cron scheduler), `@google/generative-ai` (Gemini SDK — first integration), `@tavily/core` (Tavily Extract SDK — first integration), `mongoose` (existing) (002-seed-ctdt-dag)
- MongoDB Atlas free tier via Mongoose — collection: `course_units`; upsert filter key: `{ code, major }` (002-seed-ctdt-dag)
- MongoDB Atlas free tier — `users` collection (auth + lockout state), `refresh_tokens` collection (RT rotation + reuse detection with TTL index), `notifications` collection (in-app notification persistence); `student_profiles` collection (read/write — owned by Feature 001, extended here with `repersonalizationPending` flag) (005-account-management)
- MongoDB Atlas free tier — new `roadmap_progress_cache` collection (owned by this feature); reads `roadmap_nodes` collection (owned by Feature 004 — Skill Tree) (007-progress-tracking)
- MongoDB Atlas free tier — 3 new collections: `learning_resources`, `academic_documents`, `skill_trend_snapshots`; reads `skills` collection (owned by Roadmap module) (003-resource-curation)
- JavaScript (Node.js backend, React frontend) + Express, Mongoose, jsonwebtoken, bcryptjs, nodemailer, google-auth-library, React, React Router, Axios/Zustand (011-authentication)
- MongoDB (accounts, otp challenge state, sessions, audit events) (011-authentication)

- JavaScript — Node.js 20 LTS (backend), React 18 (frontend) (001-profile-onboarding)
- JavaScript — Node.js 20 LTS (backend), React 18 (frontend) (004-skill-tree)
- MongoDB Atlas free tier — new collections: `skill_node_statuses`, `course_ai_contexts`, `course_resources`; read-only: `student_roadmaps` (written by personalization job), `market_skills`, `skill_learning_resources` (written by crawling service), `student_profiles` (Feature 001) (004-skill-tree)
- TypeScript — Node.js 20 LTS (backend), React 18 (frontend). This feature introduces TypeScript + NestJS as the evolving target stack; existing modules remain in their current JS/Express form. (010-roadmap-community)
- MongoDB Atlas free tier — new collections: `roadmap_snapshots`, `share_links`, `community_entries`, `like_records`; reads (read-only): `student_profiles` (Feature 001), `roadmaps` (Feature 009), `users` (Feature 005); shared: `system_config` (Y-day config) (010-roadmap-community)

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
- 011-authentication: Added JavaScript (Node.js backend, React frontend) + Express, Mongoose, jsonwebtoken, bcryptjs, nodemailer, google-auth-library, React, React Router, Axios/Zustand
- 010-roadmap-community: Added JavaScript — Node.js 20 LTS (backend), React 18 (frontend)
- 010-roadmap-community: Added TypeScript — Node.js 20 LTS (backend), React 18 (frontend). This feature introduces TypeScript + NestJS as the evolving target stack; existing modules remain in their current JS/Express form.


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
