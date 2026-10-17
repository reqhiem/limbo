export interface Config {
  retentionMs: number;
  maxRequests: number;
  maxBodyBytes: number;
}

const DAY_MS = 86_400_000;

export function readConfig(env: Env): Config {
  const days = parseFloat(env.RETENTION_DAYS);
  const maxRequests = parseInt(env.MAX_REQUESTS_PER_ENDPOINT, 10);
  const maxBodyBytes = parseInt(env.MAX_BODY_BYTES, 10);
  return {
    retentionMs: (days > 0 ? days : 7) * DAY_MS,
    maxRequests: Number.isNaN(maxRequests) ? 500 : Math.max(1, maxRequests),
    maxBodyBytes: maxBodyBytes >= 0 ? maxBodyBytes : 1_048_576,
  };
}
