import { useEffect, useState, type KeyboardEvent } from "react";
import type { CapturedRequest } from "../../shared/types";
import { api, errorMessage, HttpError, isAbort } from "../lib/api";
import { requestTarget, toCurl } from "../lib/curl";
import { formatAgo, formatClock, formatDate, formatInt } from "../lib/format";
import { hrefFor } from "../lib/router";
import { ConfirmButton } from "./ConfirmButton";
import { CopyButton } from "./CopyButton";
import { IconTrash } from "./icons";
import styles from "./RequestDetail.module.css";
import { Empty, ErrorBlock, Skeleton } from "./States";
import { BodyTab } from "./tabs/BodyTab";
import { HeadersTab } from "./tabs/HeadersTab";
import { MetaTab } from "./tabs/MetaTab";
import { QueryTab } from "./tabs/QueryTab";
import { RawTab } from "./tabs/RawTab";

const TABS = ["body", "headers", "query", "meta", "raw"] as const;
type Tab = (typeof TABS)[number];

type Load =
  | { state: "loading" }
  | { state: "missing" }
  | { state: "error"; message: string }
  | { state: "ok"; req: CapturedRequest };

interface Props {
  slug: string;
  id: string;
  now: number;
  onDeleted: (id: string) => void;
}

export function RequestDetail({ slug, id, now, onDeleted }: Props) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<Tab>("body");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setLoad({ state: "loading" });
    setDeleteError(null);
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

  if (load.state === "loading") return <Skeleton rows={7} height={44} />;
  if (load.state === "missing") {
    return (
      <Empty title="Request not found">
        It was deleted or expired (requests are kept 7 days, 500 per endpoint).{" "}
        <a className={styles.inlineLink} href={hrefFor(slug)}>
          Back to the endpoint
        </a>
      </Empty>
    );
  }
  if (load.state === "error") return <ErrorBlock message={load.message} onRetry={() => setAttempt((a) => a + 1)} />;

  const { req } = load;
  const binary = req.bodyEncoding === "base64";
  const counts: Record<Tab, string> = {
    body: "",
    headers: String(req.headers.length),
    query: String(req.query.length),
    meta: "",
    raw: "",
  };
  const labels: Record<Tab, string> = { body: "Body", headers: "Headers", query: "Query", meta: "Metadata", raw: "Raw" };

  const onTabKey = (e: KeyboardEvent) => {
    const i = TABS.indexOf(tab);
    const next =
      e.key === "ArrowRight"
        ? TABS[(i + 1) % TABS.length]
        : e.key === "ArrowLeft"
          ? TABS[(i - 1 + TABS.length) % TABS.length]
          : e.key === "Home"
            ? TABS[0]
            : e.key === "End"
              ? TABS[TABS.length - 1]
              : undefined;
    if (!next) return;
    e.preventDefault();
    setTab(next);
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
        <h1 id="request-line" className={styles.line}>
          <span className={styles.method}>{req.method}</span> <span>{requestTarget(req)}</span>
        </h1>
        <dl className={styles.facts}>
          <div>
            <dt className="label">Received</dt>
            <dd>
              {formatDate(req.receivedAt)} {formatClock(req.receivedAt, true)}{" "}
              <span className={styles.ago}>{formatAgo(req.receivedAt, now)}</span>
            </dd>
          </div>
          <div>
            <dt className="label">Size</dt>
            <dd>{formatInt(req.size)} B</dd>
          </div>
          <div>
            <dt className="label">Content type</dt>
            <dd>{req.contentType ?? "none"}</dd>
          </div>
          <div>
            <dt className="label">IP</dt>
            <dd>{req.ip ?? "none"}</dd>
          </div>
        </dl>
        <div className={styles.actions}>
          {(req.truncated || binary) && (
            <div className={styles.flags}>
              {req.truncated && <span className="badge">Truncated</span>}
              {binary && <span className="badge">Binary</span>}
            </div>
          )}
          {req.body !== "" && <CopyButton text={req.body} label={binary ? "Copy base64" : "Copy body"} small />}
          <CopyButton text={() => toCurl(req, location.origin)} label="Copy as cURL" small />
          <ConfirmButton label="Delete" icon={<IconTrash />} onConfirm={onDelete} small />
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
            onClick={() => setTab(t)}
          >
            {labels[t]}
            {counts[t] && <span className={styles.count}>{counts[t]}</span>}
          </button>
        ))}
      </div>

      <div id="tabpanel" className={styles.panel} role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>
        {tab === "body" && <BodyTab key={req.id} req={req} />}
        {tab === "headers" && <HeadersTab req={req} />}
        {tab === "query" && <QueryTab req={req} />}
        {tab === "meta" && <MetaTab req={req} />}
        {tab === "raw" && <RawTab req={req} />}
      </div>
    </article>
  );
}

