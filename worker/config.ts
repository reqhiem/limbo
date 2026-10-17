export interface Config {
  retentionMs: number;
  maxRequests: number;
  maxBodyBytes: number;
}

const DAY_MS = 86_400_000;
const MAX_STORABLE_BODY = 1_800_000;

export function readConfig(env: Env): Config {
  const days = parseFloat(env.RETENTION_DAYS);
  const maxRequests = parseInt(env.MAX_REQUESTS_PER_ENDPOINT, 10);
  const maxBodyBytes = parseInt(env.MAX_BODY_BYTES, 10);
  return {
    retentionMs: (Number.isFinite(days) && days > 0 ? days : 7) * DAY_MS,
    maxRequests: Number.isNaN(maxRequests) ? 500 : Math.max(1, maxRequests),
    // A Durable Object SQLite row is capped at 2 MB; leave room for headers and metadata.
    maxBodyBytes: maxBodyBytes >= 0 ? Math.min(maxBodyBytes, MAX_STORABLE_BODY) : 1_048_576,
  };
}
