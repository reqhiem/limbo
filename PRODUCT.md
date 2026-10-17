# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite (via `@cloudflare/vite-plugin`) served as Workers Static Assets; Hono Worker + one SQLite-backed Durable Object; Cloudflare Access in front. Fixed by the PRD.

## Users

A single user: the owner, a developer. Typical scene: on a laptop, integrating a third-party provider (Stripe, GitHub, etc.), firing a test event from the provider's dashboard or a terminal, and wanting to see the request land and dissect its payload within seconds. Sessions are short and intense, with Limbo open beside the terminal or the provider's dashboard.

## Product Purpose

Personal webhook inspector at `limbo.reqhiem.dev`: create webhook URLs on demand, capture every request sent to them with full fidelity (method, path, query, headers, body, Cloudflare edge metadata), inspect them live, and configure what each endpoint answers. Success: a request appears in the open UI within a second, and the owner can read, copy, or replay its content immediately.

## Positioning

Owned, private, and free: runs entirely on the owner's Cloudflare free plan behind Cloudflare Access, with capture fidelity (binary bodies byte-identical, truncation honestly flagged, edge metadata) that public bins don't promise.

## Operating Context

Used next to a provider dashboard or terminal during integration work. The owner copies the webhook URL into the provider, sends test events, and copies bodies or cURL commands back into their own tooling. Laptop width; mobile is not a target.

## Capabilities and Constraints

- Endpoints: custom or random slug, name, per-endpoint response (status 200–599, content type, body, extra headers), clear and delete.
- Requests: newest-first live list (WebSocket), text filter (method, path, body), detail tabs Body / Headers / Query / Metadata / Raw, copy body, copy as cURL, delete, deep links `#/e/:slug/:requestId`, pause/resume stream.
- Retention: 500 requests per endpoint, 7 days, bodies over 1 MB truncated and flagged.
- Captured payloads are untrusted: always rendered as inert text, never as HTML.
- Dark theme by default. UI copy in English.

## Brand Commitments

Name: "Limbo". No logo or identity system exists; no binding visual references.

## Evidence on Hand

None beyond the product itself. No users, testimonials, or metrics exist; none may be invented.

## Product Principles

- Arrival is the moment: a new request must be impossible to miss and instant to open.
- Fidelity over prettiness: show exactly what was received, flag what was altered (truncation, header normalization).
- Copy-out is a first-class action: URL, body, and cURL are always one click away.
- Untrusted content stays inert.
