# ADR 0002: Daily per-user quota before generation

## Context

Every question can trigger a model call and a live search. Without a limit, one account can consume the deployment's provider budget.

## Decision

- Check the daily quota before creating a chat or calling the model.
- Return `429` with remaining/reset metadata when exhausted.
- Keep quota accounting per user and per UTC day.
- Apply additional route rate limits to message creation and account operations.

## Consequences

- Cost is bounded per account.
- The client can explain when the next quota resets.
- A user cannot bypass the quota by opening many chats.
- The provider still needs its own spending limits as defense in depth.
