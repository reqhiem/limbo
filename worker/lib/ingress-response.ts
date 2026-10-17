import type { ResponseConfig } from "../../shared/types";

const NULL_BODY_STATUSES = new Set([204, 205, 304]);

export function ingressResponse(method: string, config: ResponseConfig): Response {
  const headers = new Headers();
  if (config.contentType) headers.set("content-type", config.contentType);
  for (const [name, value] of config.headers) headers.append(name, value);
  headers.set("access-control-allow-origin", "*");
  if (method === "OPTIONS") {
    if (!headers.has("access-control-allow-methods")) headers.set("access-control-allow-methods", "*");
    if (!headers.has("access-control-allow-headers")) headers.set("access-control-allow-headers", "*");
  }
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store");
  // Served on the UI's origin: never let a configured response be sniffed or run as a page.
  headers.set("x-content-type-options", "nosniff");
  headers.set("content-security-policy", "sandbox");
  const body = method === "HEAD" || NULL_BODY_STATUSES.has(config.status) ? null : config.body;
  return new Response(body, { status: config.status, headers });
}

export function plainText(status: number, text: string): Response {
  return new Response(text, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "x-content-type-options": "nosniff",
    },
  });
}
