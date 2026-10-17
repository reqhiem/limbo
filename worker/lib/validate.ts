import { HTTPException } from "hono/http-exception";
import { MAX_STATUS, MIN_STATUS, SLUG_RE } from "../../shared/endpoint";
import type { KV, ResponseConfig, UpdateEndpoint } from "../../shared/types";

const HEADER_NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const FORBIDDEN_HEADERS = new Set([
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "upgrade",
  "te",
  "trailer",
  "proxy-connection",
  // Ingress shares the UI's origin: nothing that acts on the whole origin (cookies, storage, service workers).
  "set-cookie",
  "clear-site-data",
  "service-worker-allowed",
  // Set through response.contentType instead.
  "content-type",
]);

const bad = (message: string) => new HTTPException(400, { message });

export async function readJson(req: Request): Promise<unknown> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    throw new HTTPException(415, { message: "content-type must be application/json" });
  }
  try {
    return await req.json();
  } catch {
    throw bad("invalid JSON body");
  }
}

export function parseCreateEndpoint(input: unknown): { name: string | null; slug: string | null } {
  const o = asObject(input, "body");
  return { name: parseName(o.name) ?? null, slug: parseSlug(o.slug) };
}

export function parseUpdateEndpoint(input: unknown): UpdateEndpoint {
  const o = asObject(input, "body");
  const patch: UpdateEndpoint = {};
  const name = parseName(o.name);
  if (name !== undefined) patch.name = name;
  if (o.response !== undefined) patch.response = parseResponse(o.response);
  return patch;
}

function asObject(v: unknown, what: string): Record<string, unknown> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) throw bad(`${what} must be a JSON object`);
  return v as Record<string, unknown>;
}

/** undefined = not provided; null = cleared. */
function parseName(v: unknown): string | null | undefined {
  if (v === undefined || v === null) return v;
  if (typeof v !== "string") throw bad("name must be a string");
  const name = v.trim();
  if (name.length > 100) throw bad("name must be at most 100 characters");
  return name || null;
}

function parseSlug(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string" || !SLUG_RE.test(v)) {
    throw bad("slug must be 3-48 characters of lowercase letters, digits and hyphens");
  }
  return v;
}

function parseResponse(v: unknown): ResponseConfig {
  const { status, contentType, body, headers } = asObject(v, "response");
  if (typeof status !== "number" || !Number.isInteger(status) || status < MIN_STATUS || status > MAX_STATUS) {
    throw bad(`response.status must be an integer between ${MIN_STATUS} and ${MAX_STATUS}`);
  }
  if (typeof contentType !== "string" || contentType.length > 200 || !isValidHeader("content-type", contentType)) {
    throw bad("response.contentType must be a valid header value of at most 200 characters");
  }
  if (typeof body !== "string" || body.length > 102_400) {
    throw bad("response.body must be a string of at most 102400 characters");
  }
  if (!Array.isArray(headers) || headers.length > 50) {
    throw bad("response.headers must be an array of at most 50 [name, value] pairs");
  }
  return { status, contentType, body, headers: headers.map(parseHeader) };
}

function parseHeader(pair: unknown, i: number): KV {
  if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== "string" || typeof pair[1] !== "string") {
    throw bad(`response.headers[${i}] must be a [name, value] pair of strings`);
  }
  const [name, value] = pair as [string, string];
  if (name.length > 256 || value.length > 8192) throw bad(`response.headers[${i}] is too long`);
  if (!HEADER_NAME_RE.test(name)) throw bad(`response.headers[${i}] has an invalid header name`);
  if (FORBIDDEN_HEADERS.has(name.toLowerCase())) throw bad(`response.headers[${i}]: "${name}" cannot be set`);
  if (!isValidHeader(name, value)) throw bad(`response.headers[${i}] has an invalid header value`);
  return [name, value];
}

function isValidHeader(name: string, value: string): boolean {
  if (/[\r\n\0]/.test(value)) return false;
  try {
    new Headers([[name, value]]);
    return true;
  } catch {
    return false;
  }
}
