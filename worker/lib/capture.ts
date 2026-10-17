import type { BodyEncoding, CfMeta, KV } from "../../shared/types";

/** Everything the Worker extracts from an ingress request; sent to the store over RPC. */
export interface CaptureInput {
  slug: string;
  method: string;
  path: string;
  query: KV[];
  headers: KV[];
  contentType: string | null;
  ip: string | null;
  /** First 16 bytes of SHA-256 of the stored body, as hex. */
  digest: string;
  cf: CfMeta;
  size: number;
  truncated: boolean;
  bodyEncoding: BodyEncoding;
  body: Uint8Array;
}

const CF_KEYS = [
  "country",
  "city",
  "region",
  "continent",
  "timezone",
  "asn",
  "asOrganization",
  "colo",
  "httpProtocol",
  "tlsVersion",
  "tlsCipher",
] as const satisfies readonly (keyof CfMeta)[];

// ignoreBOM so a leading BOM is kept and the text round-trips byte-identically.
export const utf8Decoder = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

export async function buildCapture(req: Request, slug: string, path: string, maxBodyBytes: number): Promise<CaptureInput> {
  const url = new URL(req.url);
  const { bytes, size } = await readCapped(req.body, maxBodyBytes);
  const truncated = size > bytes.byteLength;
  const { body, bodyEncoding } = classify(bytes, truncated);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", body));
  return {
    slug,
    method: req.method,
    path,
    query: [...url.searchParams],
    headers: [...req.headers],
    contentType: req.headers.get("content-type"),
    ip: req.headers.get("cf-connecting-ip"),
    digest: hash.subarray(0, 16).toHex(),
    cf: pickCf(req.cf as Record<string, unknown> | undefined),
    size,
    truncated,
    bodyEncoding,
    body,
  };
}

/**
 * Keeps at most `max` bytes but drains the whole stream to learn the original size. Draining
 * (instead of cancelling) lets the sender finish its upload and read our response cleanly.
 */
async function readCapped(stream: ReadableStream<Uint8Array> | null, max: number): Promise<{ bytes: Uint8Array; size: number }> {
  const chunks: Uint8Array[] = [];
  let kept = 0;
  let size = 0;
  if (stream) {
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (kept < max) {
        const part = value.subarray(0, max - kept);
        chunks.push(part);
        kept += part.byteLength;
      }
    }
  }
  const bytes = new Uint8Array(kept);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes, size };
}

/**
 * UTF-8 when the bytes decode cleanly, else base64. For a truncated body, streaming mode lets a
 * *valid* multi-byte prefix cut at the boundary through (it is dropped from the stored bytes),
 * while any invalid byte still fails and keeps the body binary.
 */
function classify(bytes: Uint8Array, truncated: boolean): { body: Uint8Array; bodyEncoding: BodyEncoding } {
  try {
    const text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes, { stream: truncated });
    const body = truncated ? bytes.subarray(0, new TextEncoder().encode(text).byteLength) : bytes;
    return { body, bodyEncoding: "utf8" };
  } catch {
    return { body: bytes, bodyEncoding: "base64" };
  }
}

function pickCf(cf: Record<string, unknown> | undefined): CfMeta {
  const out: Record<string, unknown> = {};
  for (const key of CF_KEYS) if (cf?.[key] !== undefined) out[key] = cf[key];
  return out as CfMeta;
}
