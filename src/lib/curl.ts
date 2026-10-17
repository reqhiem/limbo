import type { CapturedRequest, KV } from "../../shared/types";

// Pure module (type-only imports) so it can run under `node --experimental-strip-types`.

type Req = Pick<CapturedRequest, "slug" | "method" | "path" | "search" | "headers" | "body" | "bodyEncoding">;

const DROPPED = new Set(["host", "content-length", "accept-encoding", "cdn-loop", "x-real-ip"]);

const keepHeader = ([name]: KV) => !DROPPED.has(name) && !name.startsWith("cf-") && !name.startsWith("x-forwarded-");

/** POSIX single-quote escaping. */
export const shellQuote = (s: string) => `'${s.replaceAll("'", `'\\''`)}'`;

export const requestTarget = (req: Pick<Req, "slug" | "path" | "search">) => `/h/${req.slug}${req.path}${req.search}`;

export function toCurl(req: Req, origin: string): string {
  const parts = [
    `curl -X ${req.method} ${shellQuote(origin + requestTarget(req))}`,
    ...req.headers.filter(keepHeader).map(([k, v]) => `-H ${shellQuote(`${k}: ${v}`)}`),
  ];
  if (req.bodyEncoding === "base64" && req.body !== "") {
    return `printf '%s' ${shellQuote(req.body)} | base64 -d | ${[...parts, "--data-binary @-"].join(" \\\n  ")}`;
  }
  if (req.body !== "") parts.push(`--data-binary ${shellQuote(req.body)}`);
  return parts.join(" \\\n  ");
}

export function toRawHttp(req: Req & Pick<CapturedRequest, "size">): string {
  const head = [`${req.method} ${requestTarget(req)} HTTP/1.1`, ...req.headers.map(([k, v]) => `${k}: ${v}`)].join("\r\n");
  const body = req.bodyEncoding === "base64" ? `[binary body: ${req.size} bytes]` : req.body;
  return `${head}\r\n\r\n${body}`;
}

export const sampleCurl = (url: string) =>
  `curl -X POST ${shellQuote(url)} -H 'content-type: application/json' -d '{"hello":"limbo"}'`;
