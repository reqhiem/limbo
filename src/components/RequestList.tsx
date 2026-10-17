import type { Endpoint, RequestSummary } from "../../shared/types";
import { formatInt } from "../lib/format";
import { hrefFor } from "../lib/router";
import { CopyButton } from "./CopyButton";
import { IconSearch, IconSliders } from "./icons";
import styles from "./RequestList.module.css";
import { RequestRow } from "./RequestRow";
import { Empty, ErrorBlock, Skeleton } from "./States";

interface Props {
  endpoint: Endpoint;
  requests: RequestSummary[] | null;
  /** The query the shown `requests` were fetched with. */
  shownQuery: string;
  loading: boolean;
  error: string | null;
  filter: string;
  onFilter: (value: string) => void;
  onRetry: () => void;
  selectedId: string | null;
  unseen: ReadonlySet<string>;
  arriving: ReadonlySet<string>;
  now: number;
}

export function RequestList(props: Props) {
  const { endpoint, requests, shownQuery, loading, error, filter, onFilter, onRetry, selectedId, unseen, arriving, now } =
    props;
  const url = `${location.origin}/h/${endpoint.slug}`;

  let body;
  if (error) body = <ErrorBlock message={error} onRetry={onRetry} />;
  else if (requests === null) body = <Skeleton rows={8} />;
  else if (requests.length === 0)
    body = shownQuery ? (
      <Empty title={`No request matches “${shownQuery}”`}>The filter searches method, path and body.</Empty>
    ) : (
      <Empty title="Waiting for the first request">
        Send anything to the URL above. It lands here within a second.
      </Empty>
    );
  else
    body = (
      <ol className={styles.list} aria-label={`Requests to ${endpoint.slug}, newest first`}>
        {requests.map((r) => (
          <li key={r.id}>
            <RequestRow
              request={r}
              selected={r.id === selectedId}
              unseen={unseen.has(r.id)}
              arriving={arriving.has(r.id)}
              now={now}
            />
          </li>
        ))}
      </ol>
    );

  return (
    <section className={styles.column} aria-labelledby="requests-title">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <h2 id="requests-title" className={styles.title}>
            {endpoint.name ?? endpoint.slug}
          </h2>
          <span className={`label ${styles.count}`}>
            {shownQuery && requests ? `${formatInt(requests.length)} match` : `${formatInt(endpoint.requestCount)} captured`}
          </span>
          <a
            className="btn small"
            href={hrefFor(endpoint.slug)}
            aria-current={selectedId === null ? "page" : undefined}
          >
            <IconSliders />
            <span className={styles.settingsText}>Settings</span>
          </a>
        </div>
        <div className={styles.urlRow}>
          <code className={styles.url}>{url}</code>
          <CopyButton text={url} label="Copy URL" small />
        </div>
      </div>
      <label className={styles.filter}>
        <IconSearch />
        <span className="visually-hidden">Filter requests by method, path or body</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => onFilter(e.target.value)}
          placeholder="Filter method, path, body"
          spellCheck={false}
          autoComplete="off"
        />
      </label>
      <div className={styles.scroll} aria-busy={loading || undefined}>
        {body}
      </div>
    </section>
  );
}
