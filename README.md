# Perplexity Clone

A research answer engine: ask a question, the backend searches the live web with Tavily, reasons over the results with Mistral, and returns an answer you can keep in a thread.

**Live app:** https://perplexity.furqankhan.dev
**API:** https://perplexity-clone-7nda.onrender.com

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-22-5FA04E?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Mistral](https://img.shields.io/badge/Mistral-tool--calling-FF7000)
![Render](https://img.shields.io/badge/API-Render-46E3B7)
![Vercel](https://img.shields.io/badge/Web-Vercel-000000?logo=vercel&logoColor=white)

## What it does

Most chat demos answer from the model's memory. This one answers from today's web: the model decides when it needs to search, calls a Tavily search tool, and writes the answer from the returned pages. Every conversation is stored per user, and every account has to verify its email before it can sign in.

## Features

**Research desk**
- Thread rail grouped by date, merging server history with recent local queries.
- Editorial answer layout with markdown rendering, numbered sections, and source cards when the search tool returns sources.
- Copy any answer with a short confirmation.
- Skeleton loading for answers, explicit empty states, and clear error states (including interrupted searches).
- Suggested research prompts on the empty dashboard.
- Mobile thread drawer with scrim, `Escape` to close, and focus handling.
- `Enter` sends, `Shift` + `Enter` adds a line.

**Accounts**
- Register, log in, log out, and protected routes.
- Email verification link with a signed JWT.
- Inline validation on auth forms, password visibility toggle, and loading states.
- JWT delivered in an `httpOnly`, `SameSite=None`, `Secure` cookie; passwords hashed with bcrypt.
- Logout clears the client session and suppresses cookie auto-login until the next sign-in.

## How an answer is produced

```
Client (React + Redux)  ──POST /api/chats/message──►  Express API
                                                        │
                                                        ▼
                                              Mistral + tool calling
                                                   │
                                      search_internet(query)
                                                   │
                                                   ▼
                                            Tavily web search
                                                   │
                                                   ▼
                                     answer + sources  ──► MongoDB
                                                   │
                                                   ▼
                                          client renders answer
```

The search tool is a LangChain `tool()` with a zod schema, so the model chooses the query and the backend controls the execution.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 19, Vite, Redux Toolkit, react-router-dom, react-markdown, lucide-react |
| Backend | Node.js, Express 5, Mongoose, JWT, bcrypt, cookie-parser, morgan |
| AI | Mistral Small via `@langchain/mistralai` |
| Search | Tavily (`@tavily/core`) |
| Email | Nodemailer with a Gmail app password |
| Hosting | Vercel (web), Render (API), MongoDB Atlas (database) |

## Project structure

```
backend/
  server.js
  src/
    app.js                     Express app + CORS
    routes/                    auth, chat
    controllers/               register, verify, login, me, chats, messages
    services/
      ai.services.js           Mistral client + search tool
      internet.service.js      Tavily search adapter
    models/                    User, Chat, Message
frontend/
  src/
    app/                       store, routes, global styles
    features/auth/             auth pages, hook, API client, guard
    features/chat/             dashboard, rail, composer, answer block
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

### Environment variables

| Key | Purpose |
|---|---|
| `PORT` | API port |
| `NODE_ENV` | Enables `Secure`/`SameSite=None` cookies in production |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs session and email-verification tokens |
| `FRONTEND_URL` | Used in email links and client origin |
| `BACKEND_URL` | Base URL for verification links |
| `GOOGLE_USER` / `GOOGLE_PASSWORD` | Gmail sender and app password |
| `MISTRAL_API_KEY` | Answer generation |
| `TAVILY_API_KEY` | Web search |

## API

| Method | Route | Auth | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Create account, send verification email |
| `GET` | `/api/auth/verify-email?token=` | — | Verify email |
| `POST` | `/api/auth/login` | — | Sign in, set cookie |
| `GET` | `/api/auth/get-me` | Cookie | Current user |
| `POST` | `/api/chats/message` | Cookie | Ask a question |
| `GET` | `/api/chats` | Cookie | List threads |
| `GET` | `/api/chats/:chatId/messages` | Cookie | Load a thread |
| `DELETE` | `/api/chats/delete/:chatId` | Cookie | Delete a thread |

## Deployment notes

- The API runs on Render's free plan, so the first request after idle can take ~50 seconds.
- CORS is restricted to the production app URL plus localhost.
- Verification emails need a Gmail app password, not the account password.
- `frontend/vercel.json` rewrites client routes to `index.html`.
