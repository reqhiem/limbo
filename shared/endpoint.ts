import type { ResponseConfig } from "./types";

export const SLUG_RE = /^[a-z0-9-]{3,48}$/;

export const DEFAULT_RESPONSE: ResponseConfig = {
  status: 200,
  contentType: "application/json",
  body: '{"ok":true}',
  headers: [],
};

/**
 * Workers cannot emit 1xx responses, so the configurable range starts at 200
 * (the PRD's 100–599 minus what the platform can actually send).
 */
export const MIN_STATUS = 200;
export const MAX_STATUS = 599;
