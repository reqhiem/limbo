import { utf8Decoder } from "../lib/capture";
import type { BodyEncoding, CapturedRequest, Endpoint, RequestSummary } from "../../shared/types";

export type EndpointRow = {
  slug: string;
  name: string | null;
  created_at: number;
  response_status: number;
  response_content_type: string;
  response_body: string;
  response_headers: string;
  request_count: number;
  last_request_at: number | null;
};

export const SUMMARY_COLUMNS = "slug, id, received_at, method, path, content_type, size, ip, digest";

export type SummaryRow = {
  slug: string;
  id: string;
  received_at: number;
  method: string;
  path: string;
  content_type: string | null;
  size: number;
  ip: string | null;
  digest: string;
};

export type RequestRow = SummaryRow & {
  search: string;
  body_encoding: string;
  truncated: number;
  query: string;
  headers: string;
  cf: string;
  body: ArrayBuffer;
};

export function toEndpoint(r: EndpointRow): Endpoint {
  return {
    slug: r.slug,
    name: r.name,
    createdAt: r.created_at,
    requestCount: r.request_count,
    lastRequestAt: r.last_request_at,
    response: {
      status: r.response_status,
      contentType: r.response_content_type,
      body: r.response_body,
      headers: JSON.parse(r.response_headers),
    },
  };
}

export function toSummary(r: SummaryRow): RequestSummary {
  return {
    id: r.id,
    slug: r.slug,
    receivedAt: r.received_at,
    method: r.method,
    path: r.path,
    contentType: r.content_type,
    size: r.size,
    ip: r.ip,
    digest: r.digest,
  };
}

export function toCaptured(r: RequestRow): CapturedRequest {
  const bodyEncoding = r.body_encoding as BodyEncoding;
  const bytes = new Uint8Array(r.body);
  return {
    ...toSummary(r),
    search: r.search,
    query: JSON.parse(r.query),
    headers: JSON.parse(r.headers),
    body: bodyEncoding === "utf8" ? utf8Decoder.decode(bytes) : bytes.toBase64(),
    bodyEncoding,
    truncated: r.truncated === 1,
    cf: JSON.parse(r.cf),
  };
}
