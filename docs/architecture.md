# ResearchDesk Architecture

## System shape

```
React/Vite client
   |  httpOnly session cookie
   v
Express API
   |            |              |
 auth        chat          public shares
   |            |              |
 MongoDB     LangChain      read-only chat
             Groq/Mistral
             Tavily tools
```

## Core decisions

### The answer is a stored note, not a transient chat bubble

A chat owns messages. An AI message stores the source cards collected during the run. A shared chat has a random `shareId` and is served through `/api/public/chats/:shareId` without exposing the owner's other threads.

### The backend owns the tool call

The model decides the search query, but the backend performs the Tavily call, normalizes sources, deduplicates by URL, and stores the source trail. The model cannot invent a source URL into the stored list.

### Search is live, not a stale index

ResearchDesk is optimized for current answers. Tavily is the retrieval layer; sources are stored with the answer so the user can reopen the trail. A future document library will add a private retrieval path with the same source contract.

### Quotas are per user per day

Message creation checks the daily quota before creating a chat or calling a model. Quota responses include the remaining count so the client can explain the limit.

## Collections

| Collection | Purpose | Indexes |
|---|---|---|
| `users` | Account and auth state | email unique |
| `chats` | Thread metadata, pinning, sharing | user + pinned + updatedAt, shareId unique sparse |
| `messages` | User questions and AI answers with sources | chat + createdAt |

## Failure behavior

- Tavily failure returns a tool error to the model instead of corrupting the thread.
- Malformed source payloads are ignored; valid sources survive.
- Streaming errors end the SSE response with an error event.
- Model/provider failures return a JSON error before headers are sent, or an SSE error after.
- Request ids are returned in `x-request-id` and error payloads.

## Limits

- No document upload/library yet.
- No background ingestion worker.
- No citation-quality evaluation set yet.
- Render free-tier cold starts affect first response latency.
