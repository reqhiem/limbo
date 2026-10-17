import type { CapturedRequest, KV } from "../../shared/types";

type FromBase64 = (s: string) => Uint8Array;

export function decodeBase64(b64: string): Uint8Array {
  const native = (Uint8Array as unknown as { fromBase64?: FromBase64 }).fromBase64;
  if (native) return native(b64);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Bytes actually stored (differs from `size` only when truncated). */
export function storedBytes(req: Pick<CapturedRequest, "body" | "bodyEncoding">): number {
  return req.bodyEncoding === "base64" ? decodeBase64(req.body).byteLength : new TextEncoder().encode(req.body).byteLength;
}

/** A JSON number kept as its source text, so 64-bit ids and 1.50 render exactly as received. */
export class JsonNumber {
  readonly source: string;
  constructor(source: string) {
    this.source = source;
  }
}

function parseJson(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown, context?: { source?: string }) =>
    typeof value === "number" && context?.source !== undefined ? new JsonNumber(context.source) : value,
  );
}

export type BodyView =
  | { kind: "empty" }
  | { kind: "binary"; bytes: Uint8Array }
  | { kind: "json"; value: unknown; text: string }
  | { kind: "form"; pairs: KV[]; text: string }
  | { kind: "text"; text: string };

const mediaType = (contentType: string | null) => (contentType ?? "").split(";")[0]!.trim().toLowerCase();

export function viewBody(req: Pick<CapturedRequest, "body" | "bodyEncoding" | "contentType">): BodyView {
  if (req.body === "") return { kind: "empty" };
  if (req.bodyEncoding === "base64") return { kind: "binary", bytes: decodeBase64(req.body) };
  const text = req.body;
  // JSON first: `curl -d '{...}'` labels JSON as x-www-form-urlencoded.
  const head = text.trimStart()[0];
  if (head === "{" || head === "[") {
    try {
      return { kind: "json", value: parseJson(text), text };
    } catch {
      // Not valid JSON (or truncated): fall through.
    }
  }
  if (mediaType(req.contentType) === "application/x-www-form-urlencoded") {
    return { kind: "form", pairs: [...new URLSearchParams(text)], text };
  }
  return { kind: "text", text };
}

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/gzip": "gz",
  "application/x-gzip": "gz",
  "application/x-tar": "tar",
  "application/json": "json",
  "application/xml": "xml",
  "application/protobuf": "pb",
  "application/x-protobuf": "pb",
  "application/msgpack": "msgpack",
  "application/octet-stream": "bin",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "text/plain": "txt",
  "text/csv": "csv",
};

export function downloadName(id: string, contentType: string | null): string {
  return `limbo-${id}.${EXTENSIONS[mediaType(contentType)] ?? "bin"}`;
}

/** Saves the exact captured bytes. Always octet-stream so the browser never renders them. */
export function downloadBytes(bytes: Uint8Array, filename: string): void {
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/octet-stream" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
