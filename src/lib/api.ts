import type {
  CapturedRequest,
  CreateEndpoint,
  Endpoint,
  RequestSummary,
  UpdateEndpoint,
} from "../../shared/types";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function call<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`.trim();
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "error" in data && typeof data.error === "string") message = data.error;
    } catch {
      // Non-JSON error body (e.g. an Access login page); keep the status line.
    }
    throw new HttpError(res.status, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const ep = (slug: string) => `/endpoints/${encodeURIComponent(slug)}`;

export const api = {
  listEndpoints: (signal?: AbortSignal) => call<Endpoint[]>("GET", "/endpoints", undefined, signal),
  createEndpoint: (input: CreateEndpoint) => call<Endpoint>("POST", "/endpoints", input),
  updateEndpoint: (slug: string, patch: UpdateEndpoint) => call<Endpoint>("PATCH", ep(slug), patch),
  deleteEndpoint: (slug: string) => call<void>("DELETE", ep(slug)),
  listRequests: (slug: string, q: string, signal?: AbortSignal) =>
    call<RequestSummary[]>("GET", `${ep(slug)}/requests${q ? `?q=${encodeURIComponent(q)}` : ""}`, undefined, signal),
  clearRequests: (slug: string) => call<void>("DELETE", `${ep(slug)}/requests`),
  getRequest: (slug: string, id: string, signal?: AbortSignal) =>
    call<CapturedRequest>("GET", `${ep(slug)}/requests/${encodeURIComponent(id)}`, undefined, signal),
  deleteRequest: (slug: string, id: string) => call<void>("DELETE", `${ep(slug)}/requests/${encodeURIComponent(id)}`),
};

export const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
export const isAbort = (err: unknown) => err instanceof DOMException && err.name === "AbortError";
