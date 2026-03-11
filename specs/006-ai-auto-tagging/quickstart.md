# Quickstart – AI Auto-Tagging Feature

This guide explains how to set up a development environment and exercise the
new tagging module manually.

## Prerequisites

- Node.js 20 LTS installed
- MongoDB Atlas free-tier cluster (or local MongoDB) with connection string in
  `MONGODB_URI` environment variable.
- API key for chosen LLM provider stored in `LLM_API_KEY` and `LLM_PROVIDER`
  (`openai`, `anthropic`, or `google`).
- (Optional) `DEV_SERVICE_KEY` – a shared secret the crawler uses to call the
  ingestion endpoint.

## Setup

1. **Clone repo & install dependencies**

   ```powershell
   cd D:\Desktop\compass\uetcompass
   npm install   # assumes a package.json at repo root with backend+frontend
   ```

2. **Configure environment**

   Create a `.env` file in the backend root or set variables in your shell:

   ```text
   MONGODB_URI="<your mongo uri>"
   LLM_PROVIDER="openai"
   LLM_API_KEY="sk-..."
   DEV_SERVICE_KEY="supersecret"
   PORT=4000
   ```

3. **Start backend**

   ```powershell
   cd backend
   npm run dev   # starts Express server (nodemon) on PORT
   ```

   The tagging worker runs in the same process on a 30‑second interval by
   default. Adjust `JOB_INTERVAL_MS` in env if needed.

4. **(Optional) Start frontend admin UI**

   ```powershell
   cd frontend
   npm run dev   # React dev server on port 3000
   ```

## Manual Testing

1. **Enqueue a skill**

   ```powershell
   curl -X POST http://localhost:4000/api/tagging/skills \
     -H "Content-Type: application/json" \
     -H "X-Service-Key: supersecret" \
     -d '{"name":"Rust programming","domain":"IT"}'
   ```

   Response should be `202 Accepted` with a `jobId`.

2. **Inspect jobs**

   ```powershell
   curl http://localhost:4000/api/tagging/jobs?status=pending -H "Authorization: Bearer <admin-token>"
   ```

3. **Trigger worker manually (if not waiting)**

   ```powershell
   # assuming worker exports processPendingJobs()
   node -e "require('./backend/src/modules/tagging/tagging.worker').processPendingJobs()"
   ```

4. **Review results**

   ```powershell
   curl http://localhost:4000/api/tagging/jobs/<jobId> -H "Authorization: Bearer <admin-token>"
   ```

   Check that `resultTags` and `confidence` are populated.

5. **Simulate error/retry**

   - Set `LLM_PROVIDER` to an invalid value or disconnect network.
   - Enqueue a new skill; the job should transition to `failed` and remain in the
     queue for retries.

6. **Execute tests**

   ```powershell
   cd backend
   npm run test   # runs Jest unit tests; LLM calls mocked via nock
   ```

## Notes

- Batch interval and size can be configured via environment variables
  (`BATCH_SIZE`, `JOB_INTERVAL_MS`).
- The admin UI is not required for core functionality but helps during
  development and manual QA.
- When running locally with a real LLM API key, be mindful of rate limits and
  cost; use a stubbed provider or mock server for automated tests.

This quickstart should allow a developer to get the tagging system running and
verify its behaviour without needing to set up the full UETCompass frontend.
