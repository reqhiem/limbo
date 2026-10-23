import type { CapturedRequest, KV } from "../../shared/types";

type FromBase64 = (s: string) => Uint8Array;

/** Throws on malformed input; callers go through `bodyInfo`, which turns that into an "invalid" view. */
export function decodeBase64(b64: string): Uint8Array {
  const native = (Uint8Array as unknown as { fromBase64?: FromBase64 }).fromBase64;
  if (native) return native(b64);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A JSON number kept as its source text, so 64-bit ids and 1.50 render exactly as received. */
export class JsonNumber {
  readonly source: string;
  constructor(source: string) {
    this.source = source;
  }
}

export function parseJson(text: string): unknown {
  return JSON.parse(text, (_key, value: unknown, context?: { source?: string }) =>
    typeof value === "number" && context?.source !== undefined ? new JsonNumber(context.source) : value,
  );
}

export type BodyView =
  | { kind: "empty" }
  | { kind: "binary"; bytes: Uint8Array }
  | { kind: "json"; value: unknown; text: string }
  | { kind: "form"; pairs: KV[]; text: string }
  | { kind: "text"; text: string }
  | { kind: "invalid"; message: string };

export interface BodyInfo {
  view: BodyView;
  /** Bytes actually stored (differs from `size` only when truncated). */
  stored: number;
}

type BodyFields = Pick<CapturedRequest, "body" | "bodyEncoding" | "contentType">;

const mediaType = (contentType: string | null) => (contentType ?? "").split(";")[0]!.trim().toLowerCase();

function view(req: BodyFields): BodyView {
  if (req.body === "") return { kind: "empty" };
  if (req.bodyEncoding === "base64") return { kind: "binary", bytes: decodeBase64(req.body) };
  const text = req.body;
  const type = mediaType(req.contentType);
  const isForm = type === "application/x-www-form-urlencoded";
  const tryJson = (): BodyView | null => {
    try {
      return { kind: "json", value: parseJson(text), text };
    } catch {
      return null; // Not valid JSON (or truncated).
    }
  };
  if (type === "application/json" || type.endsWith("+json")) {
    // Declared JSON: parse scalars too.
    const json = tryJson();
    if (json) return json;
  } else if (!(isForm && text.includes("="))) {
    // Sniff: `curl -d '{...}'` labels JSON as x-www-form-urlencoded.
    const head = text.trimStart()[0];
    if (head === "{" || head === "[") {
      const json = tryJson();
      if (json) return json;
    }
  }
  if (isForm) return { kind: "form", pairs: [...new URLSearchParams(text)], text };
  return { kind: "text", text };
}

const cache = new WeakMap<BodyFields, BodyInfo>();

/** Decoded body + stored byte count, computed once per request object. */
export function bodyInfo(req: BodyFields): BodyInfo {
  let info = cache.get(req);
  if (!info) {
    try {
      const v = view(req);
      const stored =
        v.kind === "binary" ? v.bytes.byteLength : v.kind === "empty" ? 0 : new TextEncoder().encode(req.body).byteLength;
      info = { view: v, stored };
    } catch (err) {
      info = { view: { kind: "invalid", message: `Body could not be decoded: ${String(err)}` }, stored: 0 };
    }
    cache.set(req, info);
  }
  return info;
}

// Never an extension the OS or browser might execute or render as a document (svg, xml, html, js…).
const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/x-icon": "ico",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/gzip": "gz",
  "application/x-gzip": "gz",
  "application/x-tar": "tar",
  "application/json": "json",
  "application/protobuf": "pb",
  "application/x-protobuf": "pb",
  "application/msgpack": "msgpack",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "text/plain": "txt",
  "text/csv": "csv",
};

export function downloadName(id: string, contentType: string | null): string {
  const safeId = id.replace(/[^A-Za-z0-9_-]/g, "") || "body";
  return `limbo-${safeId}.${EXTENSIONS[mediaType(contentType)] ?? "bin"}`;
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
