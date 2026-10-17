import { useEffect, useState, type KeyboardEvent } from "react";
import type { CapturedRequest } from "../../shared/types";
import { api, errorMessage, HttpError, isAbort } from "../lib/api";
import { bodyInfo, downloadBytes, downloadName } from "../lib/body";
import { toCurl } from "../lib/curl";
import { formatAgo, formatClock, formatDate, formatInt, useNow } from "../lib/format";
import { hrefFor } from "../lib/router";
import { ConfirmButton } from "./ConfirmButton";
import { CopyButton } from "./CopyButton";
import { BackToRequests } from "./BackToRequests";
import { IconDownload, IconTrash } from "./icons";
import styles from "./RequestDetail.module.css";
import { Empty, ErrorBlock, Skeleton } from "./States";
import { BodyTab } from "./tabs/BodyTab";
import { HeadersTab } from "./tabs/HeadersTab";
import { MetaTab } from "./tabs/MetaTab";
import { QueryTab } from "./tabs/QueryTab";
import { RawTab } from "./tabs/RawTab";

export const TABS = ["body", "headers", "query", "meta", "raw"] as const;
export type Tab = (typeof TABS)[number];

const LABELS: Record<Tab, string> = { body: "Body", headers: "Headers", query: "Query", meta: "Metadata", raw: "Raw" };

type Load =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "error"; message: string }
  | { state: "ok"; req: CapturedRequest };

interface Props {
  slug: string;
  id: string;
  /** Lifted to the app so the chosen tab survives moving between requests. */
  tab: Tab;
  onTab: (tab: Tab) => void;
  onDeleted: (id: string) => void;
  /** Unseen arrivals on this endpoint; shown on the back control when the list is hidden (narrow). */
  unseenCount: number;
}

/** Ticks on its own so the open request (and a 1 MB body) never re-renders for the clock. */
function Ago({ ms }: { ms: number }) {
  const now = useNow(10_000);
  return <>{formatAgo(ms, now)}</>;
}

/** Keyed by slug/id by the parent: every request starts from a clean load state. */
export function RequestDetail({ slug, id, tab, onTab, onDeleted, unseenCount }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    api.getRequest(slug, id, ac.signal).then(
      (req) => setLoad({ state: "ok", req }),
      (err) => {
        if (isAbort(err)) return;
        if (err instanceof HttpError && err.status === 404) setLoad({ state: "missing" });
        else setLoad({ state: "error", message: errorMessage(err) });
      },
    );
    return () => ac.abort();
  }, [slug, id, attempt]);

  const back = <BackToRequests slug={slug} unseen={unseenCount} className={styles.back} />;

  if (load.state === "loading") return <Skeleton rows={7} height={44} />;
  if (load.state === "missing") {
    return (
      <div className={styles.state}>
        {back}
        <Empty title="Request not found">
          It was deleted or expired (requests are kept 7 days, 500 per endpoint).{" "}
          <a className={styles.inlineLink} href={hrefFor(slug)}>
            Back to the endpoint
          </a>
        </Empty>
      </div>
    );
  }
  if (load.state === "error") {
    return (
      <div className={styles.state}>
        {back}
        <ErrorBlock
          message={load.message}
          onRetry={() => {
            setLoad({ state: "loading" });
            setAttempt((a) => a + 1);
          }}
        />
      </div>
    );
  }

  const { req } = load;
  const binary = req.bodyEncoding === "base64";
  const { view } = bodyInfo(req);
  const counts: Partial<Record<Tab, string>> = { headers: String(req.headers.length), query: String(req.query.length) };

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const keys: Record<string, number> = { ArrowRight: i + 1, ArrowLeft: i - 1 + TABS.length, Home: 0, End: TABS.length - 1 };
    const to = keys[e.key];
    if (to === undefined) return;
    e.preventDefault();
    const next = TABS[to % TABS.length]!;
    onTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  const onDelete = async () => {
    try {
      await api.deleteRequest(slug, id);
      onDeleted(id);
    } catch (err) {
      setDeleteError(errorMessage(err));
    }
  };

  return (
    <article className={styles.detail} aria-labelledby="request-line">
      <header className={styles.head}>
        {back}
        <h1 id="request-line" className={styles.line}>
          <span className={styles.method}>{req.method}</span>{" "}
          <span className={styles.prefix}>/h/{req.slug}</span>
          <span>{`${req.path}${req.search}`}</span>
        </h1>
        {(req.label || req.truncated || binary) && (
          <p className={styles.tags}>
            {req.label && <span className={styles.event}>{req.label}</span>}
            {req.truncated && <span className="badge">Truncated</span>}
            {binary && <span className="badge">Binary</span>}
          </p>
        )}
        <dl className={styles.facts}>
          <div className={styles.received}>
            <dt className="label">Received</dt>
            <dd>
              {/* Date only when it isn't today; the full ISO time is under Metadata. */}
              {formatDate(req.receivedAt) === formatDate(Date.now()) ? "" : `${formatDate(req.receivedAt)} `}
              {formatClock(req.receivedAt, true)}{" "}
              <span className={styles.ago}>
                <Ago ms={req.receivedAt} />
              </span>
            </dd>
          </div>
          <div>
            <dt className="label">Size</dt>
            <dd>{formatInt(req.size)} B</dd>
          </div>
          <div>
            <dt className="label">Response</dt>
            <dd>{req.responseStatus}</dd>
          </div>
          <div className={styles.type}>
            <dt className="label">Content type</dt>
            <dd>{req.contentType ?? "none"}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {req.body === "" ? (
            <button type="button" className="btn small" disabled>
              No body
            </button>
          ) : (
            <CopyButton text={req.body} label={binary ? "Copy base64" : "Copy body"} small />
          )}
          <CopyButton text={() => toCurl(req, location.origin)} label="Copy as cURL" small />
          {view.kind === "binary" && (
            <button
              type="button"
              className="btn small"
              onClick={() => downloadBytes(view.bytes, downloadName(req.id, req.contentType))}
            >
              <IconDownload />
              Download
            </button>
          )}
          <span className={styles.delete}>
            <ConfirmButton label="Delete" icon={<IconTrash />} onConfirm={onDelete} small />
          </span>
        </div>
        {deleteError && <ErrorBlock message={deleteError} />}
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Request sections" onKeyDown={onTabKey}>
        {TABS.map((t) => (
          <button
            key={t}
            id={`tab-${t}`}
            type="button"
            role="tab"
            className={`${styles.tab} focus-inset${t === tab ? " inv" : ""}`}
            aria-selected={t === tab}
            aria-controls="tabpanel"
            tabIndex={t === tab ? 0 : -1}
            onClick={() => onTab(t)}
          >
            {LABELS[t]}
            {counts[t] && <span className={styles.count}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div id="tabpanel" className={styles.panel} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "body" && <BodyTab req={req} />}
        {tab === "headers" && <HeadersTab req={req} />}
        {tab === "query" && <QueryTab req={req} />}
        {tab === "meta" && <MetaTab req={req} />}
        {tab === "raw" && <RawTab req={req} />}
      </div>
    </article>
  );
}
