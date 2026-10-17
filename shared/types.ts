// Contract shared by the Worker (API + ingress) and the UI.
//
// REST API (all under /api, JSON, protected by Cloudflare Access):
//   GET    /api/endpoints                          -> Endpoint[]            (newest first)
//   POST   /api/endpoints          CreateEndpoint  -> 201 Endpoint | 400 | 409 (slug taken)
//   GET    /api/endpoints/:slug                    -> Endpoint | 404
//   PATCH  /api/endpoints/:slug    UpdateEndpoint  -> Endpoint | 400 | 404
//   DELETE /api/endpoints/:slug                    -> 204 | 404             (endpoint + all its requests)
//   GET    /api/endpoints/:slug/requests?q=        -> RequestSummary[]      (newest first; q filters method/path/body)
//   DELETE /api/endpoints/:slug/requests           -> 204 | 404             (clear, keeps the endpoint)
//   GET    /api/endpoints/:slug/requests/:id       -> CapturedRequest | 404
//   DELETE /api/endpoints/:slug/requests/:id       -> 204 | 404
//   GET    /api/ws                                 -> WebSocket upgrade; server sends ServerMessage JSON.
//                                                    Client may send the text "ping"; server answers "pong".
// Errors are `ApiError` JSON with a 4xx/5xx status.
//
// Ingress (public): ANY /h/:slug and /h/:slug/* -> the endpoint's configured response.

/** Ordered key/value pair. Lists of these preserve order and duplicates. */
export type KV = [key: string, value: string];

export interface ResponseConfig {
  status: number;
  contentType: string;
  body: string;
  /** Extra response headers. */
  headers: KV[];
}

export interface Endpoint {
  slug: string;
  name: string | null;
  createdAt: number; // epoch ms
  requestCount: number;
  lastRequestAt: number | null; // epoch ms
  response: ResponseConfig;
}

export interface CreateEndpoint {
  name?: string | null;
  /** Custom slug; random when omitted. Must match SLUG_RE. */
  slug?: string | null;
}

export interface UpdateEndpoint {
  name?: string | null;
  response?: ResponseConfig;
}

/** Subset of `request.cf` kept per request. */
export interface CfMeta {
  country?: string;
  city?: string;
  region?: string;
  continent?: string;
  timezone?: string;
  asn?: number;
  asOrganization?: string;
  colo?: string;
  httpProtocol?: string;
  tlsVersion?: string;
  tlsCipher?: string;
}

export type BodyEncoding = "utf8" | "base64";

export interface RequestSummary {
  /** Time-sortable id (ULID). */
  id: string;
  slug: string;
  receivedAt: number; // epoch ms
  method: string;
  /** Sub-path after /h/:slug, e.g. "/a/b". Empty string when there is none. */
  path: string;
  contentType: string | null;
  /** Original body size in bytes (before any truncation). */
  size: number;
  ip: string | null;
  /** First 16 bytes (32 hex chars) of the SHA-256 of the stored body. Identical payloads share a digest. */
  digest: string;
}

export interface CapturedRequest extends RequestSummary {
  query: KV[];
  /** As exposed by the Workers runtime: lowercase names, duplicate headers comma-joined (except set-cookie). */
  headers: KV[];
  /** UTF-8 text when bodyEncoding is "utf8", otherwise base64 of the raw bytes. */
  body: string;
  bodyEncoding: BodyEncoding;
  /** True when only the first MAX_BODY_BYTES were stored; `size` keeps the original size. */
  truncated: boolean;
  cf: CfMeta;
}

/** WebSocket messages sent by the server. */
export type ServerMessage = { type: "request"; request: RequestSummary };

export interface ApiError {
  error: string;
}
