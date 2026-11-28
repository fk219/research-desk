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

### Search has two paths: live web and private library

Tavily remains the live-web retrieval layer. The private library path stores uploaded text, splits it into overlapping chunks, computes local 256-dimension hash embeddings, and ranks chunks with a hybrid semantic + keyword score. The assistant gets a `search_library` tool in addition to `search_internet`; both contribute to the same stored source trail.

### Ingestion is asynchronous

Uploading a document returns `202` with a document and job id. An in-process worker marks the job `processing`, builds chunks, and marks it `ready` or `failed`. Jobs interrupted by a restart are resumed on boot. The durable-queue migration is the next scale step.

### Quotas are per user per day

Message creation checks the daily quota before creating a chat or calling a model. Quota responses include the remaining count so the client can explain the limit.

## Collections

| Collection | Purpose | Indexes |
|---|---|---|
| `users` | Account and auth state | email unique |
| `chats` | Thread metadata, pinning, sharing | user + pinned + updatedAt, shareId unique sparse |
| `messages` | User questions and AI answers with sources | chat + createdAt |
| `librarydocuments` | Private uploaded documents and share ids | user + created, user + status, shareId unique sparse |
| `librarychunks` | Chunk text, terms, embedding | document + index unique, user + document |
| `ingestionjobs` | Upload processing state and retries | document + created, status + created |

## Failure behavior

- Tavily failure returns a tool error to the model instead of corrupting the thread.
- Malformed source payloads are ignored; valid sources survive.
- Streaming errors end the SSE response with an error event.
- Model/provider failures return a JSON error before headers are sent, or an SSE error after.
- Request ids are returned in `x-request-id` and error payloads.

## Limits

- Library embeddings are local hash-256 vectors, not transformer embeddings.
- The ingestion worker is in-process, not a durable queue.
- Document ingestion accepts text and Markdown JSON, not PDF/binary uploads yet.
- No citation-quality evaluation set yet.
- Render free-tier cold starts affect first response latency.
