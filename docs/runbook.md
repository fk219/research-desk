# ResearchDesk Runbook

## Local setup

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm --prefix backend ci
npm --prefix frontend ci
```

Required backend keys: `MONGO_URI`, `JWT_SECRET`, `GROQ_API_KEY` or `MISTRAL_API_KEY`, `TAVILY_API_KEY`. Optional: `FRONTEND_URL`, `BACKEND_URL`, `SHARE_BASE_URL`, `CORS_ORIGINS`, email credentials.

## Run

```bash
npm --prefix backend run dev
npm --prefix frontend run dev
```

## Verify

```bash
npm --prefix backend test
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Health

- `GET /health` — process and database state.
- `GET /health/ready` — Mongo ping with latency; `503` when unavailable.
- Every response includes `x-request-id`.

## Deploy

- API: Render service `research-desk-api`.
- Frontend: Vercel project `research-desk`.
- Database: MongoDB Atlas.

Smoke test after deploy:

```bash
curl https://research-desk-api.onrender.com/health
curl https://research-desk-api.onrender.com/health/ready
```

Then open the demo desk, ask one question, and confirm sources persist after refresh.

## Rollback

Promote the previous Vercel deployment and roll back the Render service. Chat data is additive; no destructive migration is required.

## Library ingestion

1. `POST /api/library/documents` with `{ "title": "...", "content": "...", "kind": "text" }`.
2. Poll `GET /api/library/jobs/:jobId` until `ready` or `failed`.
3. Search `GET /api/library/search?q=...`.
4. The assistant can use `search_library` automatically when the user has ready documents.

Jobs are in-process. On restart, queued/processing jobs are resumed by the server.

## Known limits

- Library embeddings are local hash-256 vectors, not transformer embeddings.
- The worker is in-process; there is no durable external queue.
- Text/Markdown only; no PDF or binary parsing yet.
- No citation evaluation benchmark yet.
- Free-tier cold start can take 30–60 seconds.
- Provider quotas and Tavily usage are external limits.
