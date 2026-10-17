// No secondary indexes: every lookup is a primary-key point or range scan, and
// each extra index would count as additional rows written per capture.
export function migrate(sql: SqlStorage): void {
  sql.exec(`
    CREATE TABLE IF NOT EXISTS endpoints (
      slug TEXT PRIMARY KEY,
      name TEXT,
      created_at INTEGER NOT NULL,
      response_status INTEGER NOT NULL,
      response_content_type TEXT NOT NULL,
      response_body TEXT NOT NULL,
      response_headers TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      last_request_at INTEGER
    ) WITHOUT ROWID;

    -- Summary columns first and body last, so summary reads never touch the BLOB's overflow pages.
    CREATE TABLE IF NOT EXISTS requests (
      slug TEXT NOT NULL,
      id TEXT NOT NULL,
      received_at INTEGER NOT NULL,
      size INTEGER NOT NULL,
      method TEXT NOT NULL,
      digest TEXT NOT NULL,
      ip TEXT,
      content_type TEXT,
      path TEXT NOT NULL,
      body_encoding TEXT NOT NULL,
      truncated INTEGER NOT NULL,
      query TEXT NOT NULL,
      headers TEXT NOT NULL,
      cf TEXT NOT NULL,
      body BLOB NOT NULL,
      PRIMARY KEY (slug, id)
    ) WITHOUT ROWID;
  `);
}
