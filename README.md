# Research Desk

Sourced answers you can keep. A research workspace for questions you intend to keep. Ask a question, the backend searches the live web with Tavily and reasons over the results with Groq (Mistral is a drop-in fallback), and the answer is filed as a reading note: sourced prose, a numbered source list, and a thread you can reopen, organise, export or share.

The desk is built around one promise: **give me an answer I can keep, cite, share and verify.**

**Live app:** https://perplexity.furqankhan.dev
**API:** https://perplexity-clone-7nda.onrender.com

![Research Desk research note](docs/preview.png)

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-tool--calling-F55036)
![Render](https://img.shields.io/badge/API-Render-46E3B7)
![Vercel](https://img.shields.io/badge/Web-Vercel-000000?logo=vercel&logoColor=white)

## What it does

Most chat demos answer from the model's memory and throw the conversation away. This one answers from today's web, keeps the question next to the answer, and stores the source cards that the search tool returned. That makes the thread an audit trail rather than a disposable reply.

Core capabilities:

- **Sourced answers with an audit trail.** The search tool hands the model live results, and the answer message stores the numbered sources (title, URL, snippet) that were retrieved. Citations such as `[2]` jump to the matching source card.
- **Saved research threads.** Server-side thread history per account, grouped by date in the rail.
- **Thread organisation.** Rename inline, pin a thread to the top, and keep date grouping for everything else.
- **Read-only public reports.** Turn a thread into a share link at `/share/:shareId`. The public view keeps the same editorial reading layout, exposes no account identity, and can be switched off again.
- **Markdown export.** Download the question, answer, and numbered sources with URLs as a portable `.md` file.
- **Demo access.** One click opens a shared demo desk with seeded example threads. No email verification required.
- **Real logout.** Logout increments the user's `tokenVersion`, revoking every JWT issued before that moment, and clears the cookie.
- **Account settings.** Change the password (which revokes every session), download a JSON export of the account and its research threads, or delete the account and every thread, message and public share link with it.
- **Abuse limits.** 25 answered questions per user per UTC day, plus per-IP rate limits on auth and message sends.

## Demo access

Open **`/login`** and choose **Open the demo desk**.

- The endpoint `POST /api/auth/demo` finds or creates the shared account `demo@researchdesk.local` with a random password hash and a verified email.
- On first use it seeds three clearly labelled example threads with static answers and example sources. Seeding is idempotent and only runs when the demo account has no threads.
- No extra environment variables are required.
- The demo account is shared: threads and questions added there are visible to later visitors. It is a showcase, not a private workspace. The daily quota applies to the demo account too.
- Because the account is shared, logging out of the demo revokes the demo session for other visitors as well. That is the same real session-revocation behaviour every account gets.

The demo endpoint is limited to 3 requests per minute per IP.

## How an answer is produced

```
Client (React + Redux)  ──POST /api/chats/message──►  Express API
                                                        │
                                                        ├─ daily quota check (25/user/UTC day)
                                                        ▼
                                              Groq + tool calling
                                                   │
                                      search_internet(query)
                                                   │
                                                   ▼
                                            Tavily web search
                                                   │
                                      answer + numbered sources
                                                   │
                                                   ▼
                                     MongoDB (Message + sources)
                                                   │
                                                   ▼
                                 client streams answer, then source cards
```

The search tool is a LangChain `tool()` with a zod schema, so the model chooses the query and the backend controls execution. The tool's returned source list is captured alongside the streamed answer, not reconstructed on the client.

## Sharing and privacy

- A chat gets a `shareId` only on its first share. Turning sharing off keeps the id, so turning it back on restores the same link.
- `GET /api/public/chats/:shareId` returns only the title, timestamps, and the messages with role, content, sources, and date.
- The public payload never includes a user email, user id, chat id, or message id.
- Public links are read-only. There is no public endpoint to write, rename, delete, or chat.
- Sharing is off by default for every existing and new thread.

## Limits

| Limit | Scope |
|---|---|
| 25 answered questions per UTC day | Per authenticated user (counted from stored AI messages) |
| 10 requests per minute | `/api/auth/*`, per IP |
| 3 requests per minute | `POST /api/auth/demo`, per IP |
| 10 requests per minute | Message sends, per IP |

Quota and rate-limit failures return HTTP `429` with a JSON `message` and `code` (`DAILY_QUOTA_EXCEEDED` or `RATE_LIMITED`). The composer surfaces the message inline and keeps the question in the draft so it can be retried.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Redux Toolkit, react-router-dom, react-markdown, lucide-react |
| Backend | Node.js, Express 5, Mongoose, JWT, bcrypt, cookie-parser, morgan |
| Security | helmet, express-rate-limit, httpOnly session cookie, token-version revocation |
| AI | Groq (`openai/gpt-oss-120b`) via `@langchain/groq`; Mistral Small optional fallback |
| Search | Tavily (`@tavily/core`) |
| Email | Nodemailer with a Gmail app password |
| Hosting | Vercel (web), Render (API), MongoDB Atlas (database) |

## Project structure

```
backend/
  server.js
  src/
    app.js                     Express app, CORS, helmet, rate limits
    routes/                    auth, chat, public share
    controllers/               auth, account settings, chats, messages, shares
    middleware/                identifyUser, rate limiters
    services/
      ai.services.js           Groq client (Mistral fallback) + source-capturing search tool
      internet.service.js      Tavily search adapter
      demo.service.js          shared demo account + idempotent seed
      quota.service.js         daily answered-question quota
    models/                    User (tokenVersion), Chat (pinned/shared/shareId), Message (sources)
frontend/
  src/
    app/                       store, routes, global styles
    features/auth/             auth pages, demo entry, hook, API client, guard
    features/account/          protected settings page, password, export and deletion
    features/chat/             dashboard, rail, composer, answer block, export helper
    features/share/            public read-only report (lazy-loaded route)
    components/Brand.jsx
```

## Run locally

```bash
# API
cd backend
npm install
cp .env.example .env         # fill in Mongo, JWT, mail and API keys
npm run dev                  # http://localhost:3000

# Web
cd frontend
npm install
npm run dev                  # http://localhost:5173
```

The demo desk needs only a working `MONGO_URI` and `JWT_SECRET`; the live answer flow also needs `GROQ_API_KEY` (or `MISTRAL_API_KEY`) and `TAVILY_API_KEY`. Seeded demo threads do not call either provider.

### Environment variables

| Key | Purpose |
|---|---|
| `PORT` | API port |
| `NODE_ENV` | Enables `Secure`/`SameSite=None` cookies in production |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs session and email-verification tokens |
| `FRONTEND_URL` | Used in email links and as the default base for share links |
| `BACKEND_URL` | Base URL for verification links |
| `GOOGLE_USER` / `GOOGLE_PASSWORD` | Gmail sender and app password |
| `GROQ_API_KEY` | Answer generation (primary) |
| `MISTRAL_API_KEY` | Optional answer fallback when Groq is not configured |
| `TAVILY_API_KEY` | Web search |
| `SHARE_BASE_URL` | *Optional.* Overrides the public base URL used in share responses. Falls back to `FRONTEND_URL`. |

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Create account, send verification email |
| `GET` | `/api/auth/verify-email?token=` | Public | Verify email |
| `POST` | `/api/auth/login` | Public | Sign in, set session cookie |
| `POST` | `/api/auth/demo` | Public | Open the shared demo desk (3/min per IP) |
| `POST` | `/api/auth/logout` | Cookie (best effort) | Increment `tokenVersion`, clear cookie |
| `GET` | `/api/auth/get-me` | Cookie | Current user |
| `PATCH` | `/api/auth/password` | Cookie | Change password, revoke all sessions (8 to 72 characters) |
| `GET` | `/api/auth/export` | Cookie | Download account, threads and messages with sources as JSON |
| `DELETE` | `/api/auth/account` | Cookie | Delete the account, its threads, messages and share links |
| `POST` | `/api/chats/message` | Cookie | Ask a question (SSE when `stream: true`) |
| `GET` | `/api/chats` | Cookie | List threads, pinned first |
| `GET` | `/api/chats/:chatId/messages` | Cookie | Load a thread |
| `PATCH` | `/api/chats/:chatId` | Cookie | Rename (`title`) and/or pin (`pinned`) |
| `POST` | `/api/chats/:chatId/share` | Cookie | Toggle sharing, return public URL |
| `DELETE` | `/api/chats/delete/:chatId` | Cookie | Delete a thread and its messages |
| `GET` | `/api/public/chats/:shareId` | Public | Read-only shared report |

## Deployment notes

- The API runs on Render's free plan, so the first request after idle can take ~50 seconds.
- CORS is restricted to the production app URL plus localhost; `PATCH` and `DELETE` are allowed for account and thread changes.
- Verification emails need a Gmail app password, not the account password.
- `frontend/vercel.json` rewrites client routes to `index.html`, so `/share/:shareId` resolves to the SPA.
- Set `FRONTEND_URL` (or `SHARE_BASE_URL`) to the public web origin so share responses return usable URLs. The frontend copies the current origin's `/share/:shareId` link regardless.
