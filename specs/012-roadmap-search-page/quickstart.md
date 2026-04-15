# Quickstart: Roadmap Search Page

## Goal
Validate the split-screen roadmap search experience:
- Click global search bar -> open search page
- Search public/shared roadmap names
- Click/auto-select result -> preview roadmap

## Prerequisites
- Backend and frontend dependencies installed.
- Backend running on local API port (default project setup).
- Frontend running via Vite.
- At least one public/shared manual roadmap exists.

## Setup Sample Public Data
1. Create a manual roadmap from the manual roadmap page.
2. Share it to community so `isPublic = true`.
3. Confirm homepage community section lists it.

## Run
1. Start backend:
   - `cd backend`
   - `npm run dev`
2. Start frontend:
   - `cd frontend`
   - `npm run dev`
3. Open app homepage.

## Verify Core Flow
1. Click the navbar search input.
2. Confirm navigation to `/roadmaps/search` with split-screen layout.
3. Type at least 2 characters from a known public roadmap title.
4. Confirm results appear after debounce delay.
5. Confirm first result is auto-selected and preview panel loads.
6. Click a different result and verify preview updates.

## Verify Edge Cases
1. Type 1 character:
   - No search request should execute.
   - UI should show guidance requiring 2+ characters.
2. Type quickly with multiple changes:
   - Latest query result must be the one rendered.
   - No stale list override.
3. Simulate preview error (invalid id or forced API error):
   - Preview panel shows user-friendly error state.

## Suggested Tests
- Backend unit/integration:
  - Public search filter by `q`.
  - Query validation (`q.length < 2`).
  - Public preview by id not found and success.
- Frontend behavior:
  - Navbar click navigates to search page.
  - Debounced search execution rules.
  - Auto-preview first result.
  - Click-to-preview synchronization.
