import type { Endpoint, RequestSummary } from "../../shared/types";
import { formatInt } from "../lib/format";
import { hrefFor, settingsHref } from "../lib/router";
import { CopyButton } from "./CopyButton";
import { EndpointSwitcher } from "./EndpointSwitcher";
import { IconArrowLeft, IconSearch, IconSliders } from "./icons";
import styles from "./RequestList.module.css";
import { RequestRow } from "./RequestRow";
import { Empty, ErrorBlock, Skeleton } from "./States";

interface Props {
  className?: string;
  endpoint: Endpoint;
  endpoints: Endpoint[];
  requests: RequestSummary[] | null;
  /** The query the shown `requests` were fetched with. */
  shownQuery: string;
  loading: boolean;
  error: string | null;
  filter: string;
  onFilter: (value: string) => void;
  onRetry: () => void;
  selectedId: string | null;
  settingsOpen: boolean;
  unseen: ReadonlyMap<string, string>;
  arriving: ReadonlySet<string>;
}

export function RequestList(props: Props) {
  const { className, endpoint, endpoints, requests, shownQuery, loading, error, filter, onFilter, onRetry } = props;
  const { selectedId, settingsOpen, unseen, arriving } = props;
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
            />
          </li>
        ))}
      </ol>
    );

  return (
    <section className={`${styles.column} ${className ?? ""}`} aria-labelledby="requests-title">
      <div className={styles.head}>
        <div className={styles.titleRow}>
          <a className={`btn small only-narrow ${styles.back}`} href={hrefFor(null)} aria-label="All endpoints">
            <IconArrowLeft />
          </a>
          <h2 id="requests-title" className={styles.title}>
            {endpoint.name ?? endpoint.slug}
          </h2>
          <div className={`below-wide ${styles.switcher}`}>
            <EndpointSwitcher endpoints={endpoints} current={endpoint} />
          </div>
          <span className={`label ${styles.count}`}>
            {shownQuery && requests ? `${formatInt(requests.length)} match` : `${formatInt(endpoint.requestCount)} captured`}
          </span>
          <a
            className={`btn small ${styles.settings}`}
            href={settingsHref(endpoint.slug)}
            aria-current={settingsOpen ? "page" : undefined}
          >
            <IconSliders />
            <span className={styles.settingsText}>Settings</span>
          </a>
        </div>
        <div className={styles.urlRow}>
          <code className={styles.url} title={url}>
            {url}
          </code>
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
