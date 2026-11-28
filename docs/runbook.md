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

## Known limits

- No document library/ingestion yet.
- No citation evaluation benchmark yet.
- Free-tier cold start can take 30–60 seconds.
- Provider quotas and Tavily usage are external limits.
