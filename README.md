# Limbo

Personal webhook inspector at `https://limbo.reqhiem.dev`. Create webhook URLs on demand, capture every request sent to them, and inspect body, headers, query and edge metadata live.

Single user (the owner), runs entirely on the Cloudflare free plan, deployed with one `wrangler deploy`.

## How it works

```
                 ┌──────────────── Cloudflare Access ────────────────┐
 sender ──► /h/:slug/*   (Bypass policy: public)                     │
 owner  ──► /, /api/*, /api/ws   (Allow: owner email)                │
                 └───────────────────────────┬───────────────────────┘
                                             ▼
                            Worker "limbo" (Hono)
              /h/*  rate limit per slug → read body (≤1 MB kept) → DO.capture()
              /api/* verify Cf-Access-Jwt-Assertion → DO RPC
              /api/ws → DO.fetch() (WebSocket Hibernation)
              everything else → static assets (React UI, hash routing)
                                             ▼
                 Durable Object "LimboStore" (one instance, SQLite)
              endpoints + requests tables, live broadcast, retention alarm
```

| Folder | What lives there |
|---|---|
| `worker/` | Worker entry (`index.ts`), routes (`routes/`), Access middleware (`middleware/`), capture/validation/id helpers (`lib/`), the Durable Object (`store/`) |
| `shared/` | Types and constants shared by the Worker and the UI (the API/WS contract) |
| `src/` | React UI: `components/`, `components/tabs/`, `lib/` (API client, hash router, live stream, body decoding, cURL), `styles/` |
| `public/_headers` | Security headers (CSP etc.) for the UI's static assets |
| `scripts/smoke.mjs` | End-to-end check against a running instance |

Storage budget: each captured request costs at most 3 SQLite rows written (insert, endpoint counter, and, once at the cap, deleting the oldest row) and O(1) rows read. Tables use composite primary keys `WITHOUT ROWID`, so there are no secondary-index writes.

## Local development

```sh
npm install
cp .dev.vars.example .dev.vars   # DEV_SKIP_ACCESS=true (local only)
npm run dev                      # Vite + Worker + Durable Object on http://localhost:5173
```

`DEV_SKIP_ACCESS=true` skips the Access JWT check **only** for requests whose host is `localhost` or `127.0.0.1`. `.dev.vars` is never deployed; in production a missing or invalid JWT is always rejected with `401`.

Running the built app with plain Wrangler:

```sh
npm run build        # type-check + vite build (writes the deploy config under dist/)
npx wrangler dev     # serves the built Worker + assets, picks up the generated config
```

Send it something:

```sh
curl -X POST 'http://localhost:5173/h/<slug>/a/b?x=1' -d '{"a":1}'
```

End-to-end check (dev server running):

```sh
node scripts/smoke.mjs                   # defaults to http://localhost:5173
```

### Verifying retention and caps locally

Lower the values in `.dev.vars` (they override `wrangler.jsonc` vars locally), restart `npm run dev`, then send requests:

```sh
# .dev.vars
DEV_SKIP_ACCESS=true
MAX_REQUESTS_PER_ENDPOINT=3     # only the newest 3 requests per endpoint are kept
RETENTION_DAYS=0.0007           # ~60 s; the retention alarm runs every max(60 s, retention/4)
```

## Configuration

| Name | Type | Default | Purpose |
|---|---|---|---|
| `ACCESS_TEAM_DOMAIN` | var | `https://reqhiem.cloudflareaccess.com` | Issuer and JWKS location for JWT validation |
| `ACCESS_AUD` | var | AUD of the "Limbo" Access app | Expected `aud` claim |
| `RETENTION_DAYS` | var | `7` | Requests older than this are deleted (may be fractional) |
| `MAX_REQUESTS_PER_ENDPOINT` | var | `500` | Oldest requests beyond this are dropped |
| `MAX_BODY_BYTES` | var | `1048576` | Bodies above this are stored truncated and flagged |

Bindings (in `wrangler.jsonc`): `STORE` (Durable Object `LimboStore`, SQLite migration `v1`), `INGRESS_LIMITER` (Rate Limiting, 60 requests / 60 s per slug), static assets (`run_worker_first` for `/h/*` and `/api/*` only, no SPA fallback). `workers_dev` and `preview_urls` are disabled; the Worker is reachable only at the custom domain.

## Deploy

```sh
npx wrangler login     # once
npm run deploy         # vite build + wrangler deploy
```

`wrangler deploy` attaches the custom domain `limbo.reqhiem.dev` (DNS record and certificate are created automatically because `reqhiem.dev` is a zone on the same account). **Configure Access (below) before the first deploy**, so the UI is never public.

## Cloudflare Access setup

Two self-hosted Access applications on the same hostname. The more specific path wins, so `/h/*` is public while everything else requires the owner's login. Without the bypass, senders like Stripe or GitHub would receive the Access login page.

1. Zero Trust dashboard → **Access controls → Applications → Add an application → Self-hosted**.
2. **App 1 "Limbo"**
   - Destination: `limbo.reqhiem.dev` (no path).
   - Policy: *Allow* — Include → Emails → the owner's email (`joelperca.vc@gmail.com`).
   - Save, open the app, and copy its **Application Audience (AUD) tag**.
3. **App 2 "Limbo webhook ingress (public)"**
   - Destination: `limbo.reqhiem.dev`, path `h/*`.
   - Policy: action **Bypass** — Include → **Everyone**.
4. Put the AUD tag in `wrangler.jsonc` → `vars.ACCESS_AUD`, and your team domain (`https://<team>.cloudflareaccess.com`, Zero Trust → Settings → Custom pages / Team domain) in `vars.ACCESS_TEAM_DOMAIN`.
5. `npm run deploy`.

Check it:

```sh
curl -i https://limbo.reqhiem.dev/api/endpoints   # 302 to the Access login (or 401 from the Worker)
curl -i https://limbo.reqhiem.dev/                 # 302 to the Access login
curl -i -X POST https://limbo.reqhiem.dev/h/<slug> -d 'hi'   # your endpoint's configured response
```

The Worker independently verifies the `Cf-Access-Jwt-Assertion` header (signature against the team's certs, issuer and audience) on every `/api/*` request, so a misconfigured Access policy still cannot expose the API.

## Behavior notes and limits

- **Statuses:** configurable 200–599. Workers cannot emit 1xx responses; 204/205/304 and `HEAD` are sent without a body.
- **Ingress responses** always add `Access-Control-Allow-Origin: *` (plus `Allow-Methods/Headers: *` on `OPTIONS`), `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox`, so a configured HTML body can never run script on the UI's origin. Request data is never echoed back.
- **Headers** are recorded as the Workers runtime exposes them: lowercase names, duplicate headers comma-joined (except `set-cookie`), in runtime order. Query parameters keep their original order and duplicates.
- **Bodies** are stored as raw bytes; the API returns UTF-8 text when the bytes are valid UTF-8, otherwise base64. Bodies over `MAX_BODY_BYTES` keep the first `MAX_BODY_BYTES` (trimmed to a whole UTF-8 character for text), are flagged `truncated`, and keep the original `size`.
- **Digest** (and the barcode in the UI) is a SHA-256 prefix of the stored body: identical payloads, such as provider retries, look identical.
- **Rate limit:** 60 requests per minute per slug (per Cloudflare location); excess gets `429` and is not stored.
- Captured content is untrusted and rendered only as text in the UI.
