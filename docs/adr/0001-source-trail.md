# ADR 0001: Store the source trail with the answer

## Context

A research answer is only useful if its sources can be reopened. Model output alone cannot be trusted as an audit trail.

## Decision

- The backend performs the Tavily search.
- Source URLs are validated as http(s), normalized, and deduplicated by URL.
- The AI message stores the final source array.
- Public sharing exposes the stored thread and sources read-only.

## Consequences

- The user can reopen or share an answer without re-running the search.
- A source card reflects what the backend actually received.
- Stale sources remain visible; the answer is a snapshot, not a live claim.
- The next step is a private document library with the same source contract.

## Alternatives considered

- Model-generated citations: rejected, unverifiable.
- Live search on every render: rejected, results change and cost repeats.
