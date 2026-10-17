import { DurableObject } from "cloudflare:workers";
import { readConfig, type Config } from "../config";
import { encodeTime, randomSlug, ulidFactory } from "../lib/ids";
import type { CaptureInput } from "../lib/capture";
import { DEFAULT_RESPONSE } from "../../shared/endpoint";
import type {
  CapturedRequest,
  Endpoint,
  RequestSummary,
  ResponseConfig,
  ServerMessage,
  UpdateEndpoint,
} from "../../shared/types";
import { migrate } from "./schema";
import {
  SUMMARY_COLUMNS,
  toCaptured,
  toEndpoint,
  toSummary,
  type EndpointRow,
  type RequestRow,
  type SummaryRow,
} from "./rows";

// ponytail: body search only scans the first 64 KiB of each body, so a filter over 500 x 1 MiB bodies stays cheap.
const SEARCH_BODY_BYTES = 65_536;

export function getStore(env: Env) {
  return env.STORE.getByName("limbo");
}

export class LimboStore extends DurableObject<Env> {
  private readonly sql: SqlStorage;
  private readonly config: Config;
  private readonly nextId = ulidFactory();
  private alarmChecked = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.config = readConfig(env);
    void ctx.blockConcurrencyWhile(async () => migrate(this.sql));
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  /** Stores one ingress request; null when the slug is unknown (nothing stored). */
  async capture(input: CaptureInput): Promise<ResponseConfig | null> {
    const now = Date.now();
    const { maxRequests } = this.config;
    const stored = this.ctx.storage.transactionSync(() => {
      const row = this.endpointRow(input.slug);
      if (!row) return null;
      const id = this.nextId(now);
      this.sql.exec(
        `INSERT INTO requests (slug, id, received_at, method, path, content_type, size, ip, digest, body_encoding, truncated, query, headers, cf, body)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.slug,
        id,
        now,
        input.method,
        input.path,
        input.contentType,
        input.size,
        input.ip,
        input.digest,
        input.bodyEncoding,
        input.truncated ? 1 : 0,
        JSON.stringify(input.query),
        JSON.stringify(input.headers),
        JSON.stringify(input.cf),
        input.body.slice().buffer, // exact-size copy: an RPC'd view may sit on a larger buffer
      );
      let count = row.request_count + 1;
      if (count > maxRequests) {
        this.deleteOldest(input.slug, count - maxRequests);
        count = maxRequests;
      }
      this.sql.exec("UPDATE endpoints SET request_count = ?, last_request_at = ? WHERE slug = ?", count, now, input.slug);
      return { id, response: toEndpoint(row).response };
    });
    if (!stored) return null;

    const summary: RequestSummary = {
      id: stored.id,
      slug: input.slug,
      receivedAt: now,
      method: input.method,
      path: input.path,
      contentType: input.contentType,
      size: input.size,
      ip: input.ip,
      digest: input.digest,
    };
    this.broadcast({ type: "request", request: summary });
    await this.ensureAlarm();
    return stored.response;
  }

  listEndpoints(): Endpoint[] {
    return this.sql.exec<EndpointRow>("SELECT * FROM endpoints ORDER BY created_at DESC, slug").toArray().map(toEndpoint);
  }

  getEndpoint(slug: string): Endpoint | null {
    const row = this.endpointRow(slug);
    return row ? toEndpoint(row) : null;
  }

  createEndpoint(input: { name: string | null; slug: string | null }): Endpoint | "conflict" {
    const createdAt = Date.now();
    const insert = (slug: string) =>
      this.sql.exec(
        `INSERT OR IGNORE INTO endpoints (slug, name, created_at, response_status, response_content_type, response_body, response_headers)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        slug,
        input.name,
        createdAt,
        DEFAULT_RESPONSE.status,
        DEFAULT_RESPONSE.contentType,
        DEFAULT_RESPONSE.body,
        JSON.stringify(DEFAULT_RESPONSE.headers),
      ).rowsWritten > 0;

    let slug = input.slug;
    if (slug) {
      if (!insert(slug)) return "conflict";
    } else {
      do slug = randomSlug();
      while (!insert(slug));
    }
    return { slug, name: input.name, createdAt, requestCount: 0, lastRequestAt: null, response: DEFAULT_RESPONSE };
  }

  updateEndpoint(slug: string, patch: UpdateEndpoint): Endpoint | null {
    const current = this.getEndpoint(slug);
    if (!current) return null;
    const name = patch.name !== undefined ? patch.name : current.name;
    const response = patch.response ?? current.response;
    this.sql.exec(
      `UPDATE endpoints SET name = ?, response_status = ?, response_content_type = ?, response_body = ?, response_headers = ?
       WHERE slug = ?`,
      name,
      response.status,
      response.contentType,
      response.body,
      JSON.stringify(response.headers),
      slug,
    );
    return { ...current, name, response };
  }

  deleteEndpoint(slug: string): boolean {
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM requests WHERE slug = ?", slug);
      return this.sql.exec("DELETE FROM endpoints WHERE slug = ?", slug).rowsWritten > 0;
    });
  }

  clearRequests(slug: string): boolean {
    return this.ctx.storage.transactionSync(() => {
      this.sql.exec("DELETE FROM requests WHERE slug = ?", slug);
      return this.sql.exec("UPDATE endpoints SET request_count = 0 WHERE slug = ?", slug).rowsWritten > 0;
    });
  }

  listRequests(slug: string, q: string): RequestSummary[] | null {
    if (!this.endpointExists(slug)) return null;
    // SQLite's lower() only folds ASCII, so fold only ASCII here too.
    const needle = q.replace(/[A-Z]/g, (c) => c.toLowerCase());
    const cursor = needle
      ? this.sql.exec<SummaryRow>(
          `SELECT ${SUMMARY_COLUMNS} FROM requests
           WHERE slug = ? AND (instr(lower(method), ?) > 0 OR instr(lower(path), ?) > 0
             OR (body_encoding = 'utf8' AND instr(lower(CAST(substr(body, 1, ${SEARCH_BODY_BYTES}) AS TEXT)), ?) > 0))
           ORDER BY id DESC`,
          slug,
          needle,
          needle,
          needle,
        )
      : this.sql.exec<SummaryRow>(`SELECT ${SUMMARY_COLUMNS} FROM requests WHERE slug = ? ORDER BY id DESC`, slug);
    return cursor.toArray().map(toSummary);
  }

  getRequest(slug: string, id: string): CapturedRequest | null {
    const row = this.sql.exec<RequestRow>("SELECT * FROM requests WHERE slug = ? AND id = ?", slug, id).toArray()[0];
    return row ? toCaptured(row) : null;
  }

  deleteRequest(slug: string, id: string): boolean {
    return this.ctx.storage.transactionSync(() => {
      if (this.sql.exec("DELETE FROM requests WHERE slug = ? AND id = ?", slug, id).rowsWritten === 0) return false;
      this.sql.exec("UPDATE endpoints SET request_count = max(request_count - 1, 0) WHERE slug = ?", slug);
      return true;
    });
  }

  async fetch(): Promise<Response> {
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(): void {}

  webSocketClose(): void {}

  /** Retention: drops expired requests, trims endpoints over the cap, reschedules while data remains. */
  async alarm(): Promise<void> {
    const { retentionMs, maxRequests } = this.config;
    const cutoff = encodeTime(Date.now() - retentionMs);
    const remaining = this.ctx.storage.transactionSync(() => {
      const endpoints = this.sql
        .exec<{ slug: string; request_count: number }>("SELECT slug, request_count FROM endpoints")
        .toArray();
      for (const { slug, request_count } of endpoints) {
        let count = request_count;
        // A bare 10-char time prefix sorts before every id with that same prefix.
        count = Math.max(0, count - this.sql.exec("DELETE FROM requests WHERE slug = ? AND id < ?", slug, cutoff).rowsWritten);
        if (count > maxRequests) {
          this.deleteOldest(slug, count - maxRequests);
          count = maxRequests;
        }
        if (count !== request_count) {
          this.sql.exec("UPDATE endpoints SET request_count = ? WHERE slug = ?", count, slug);
        }
      }
      return this.sql.exec("SELECT 1 FROM requests LIMIT 1").toArray().length > 0;
    });
    if (remaining) await this.ctx.storage.setAlarm(Date.now() + this.alarmInterval());
    else this.alarmChecked = false;
  }

  private endpointRow(slug: string): EndpointRow | undefined {
    return this.sql.exec<EndpointRow>("SELECT * FROM endpoints WHERE slug = ?", slug).toArray()[0];
  }

  private endpointExists(slug: string): boolean {
    return this.sql.exec("SELECT 1 FROM endpoints WHERE slug = ?", slug).toArray().length > 0;
  }

  private deleteOldest(slug: string, n: number): void {
    this.sql.exec(
      "DELETE FROM requests WHERE slug = ? AND id IN (SELECT id FROM requests WHERE slug = ? ORDER BY id LIMIT ?)",
      slug,
      slug,
      n,
    );
  }

  private broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // Socket already closing; the runtime drops it.
      }
    }
  }

  /** Arms the retention alarm at most once per instance lifetime (setAlarm counts as a write). */
  private async ensureAlarm(): Promise<void> {
    if (this.alarmChecked) return;
    try {
      if ((await this.ctx.storage.getAlarm()) === null) {
        await this.ctx.storage.setAlarm(Date.now() + this.alarmInterval());
      }
      this.alarmChecked = true;
    } catch (err) {
      // The request is already stored; retry arming on the next capture instead of failing this one.
      console.error("failed to arm retention alarm", err);
    }
  }

  private alarmInterval(): number {
    return Math.min(Math.max(this.config.retentionMs / 4, 60_000), 3_600_000);
  }
}
