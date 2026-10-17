import type { Endpoint } from "../../shared/types";
import { formatAgo } from "../lib/format";
import { hrefFor } from "../lib/router";
import { CreateEndpointForm } from "./CreateEndpointForm";
import styles from "./EndpointList.module.css";
import { Empty, ErrorBlock, Skeleton } from "./States";

interface Props {
  endpoints: Endpoint[] | null;
  error: string | null;
  selected: string | null;
  now: number;
  onRetry: () => void;
  onCreated: (endpoint: Endpoint) => void;
}

export function EndpointList({ endpoints, error, selected, now, onRetry, onCreated }: Props) {
  return (
    <nav className={styles.column} aria-labelledby="endpoints-title">
      <div className={styles.head}>
        <h2 id="endpoints-title" className="label">
          Endpoints
        </h2>
      </div>
      <div className={styles.scroll}>
        {error ? (
          <ErrorBlock message={error} onRetry={onRetry} />
        ) : endpoints === null ? (
          <Skeleton rows={3} height={76} />
        ) : endpoints.length === 0 ? (
          <Empty title="No endpoints yet">Create one to get a URL you can paste into Stripe, GitHub or curl.</Empty>
        ) : (
          <ul className={styles.list}>
            {endpoints.map((e) => {
              const isSelected = e.slug === selected;
              return (
                <li key={e.slug}>
                  <a
                    href={hrefFor(e.slug)}
                    className={`${styles.cell} focus-inset${isSelected ? " inv" : ""}`}
                    aria-current={isSelected ? "page" : undefined}
                  >
                    <span className={styles.name}>{e.name ?? e.slug}</span>
                    <span className={styles.meta}>
                      <span className={styles.path}>/h/{e.slug}</span>
                      <span className={styles.count} aria-label={`${e.requestCount} requests`}>
                        {String(e.requestCount).padStart(3, "0")}
                      </span>
                    </span>
                    <span className={styles.last}>
                      <span className="label">Last</span>{" "}
                      {e.lastRequestAt === null ? <span className="label">none yet</span> : formatAgo(e.lastRequestAt, now)}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <CreateEndpointForm onCreated={onCreated} />
    </nav>
  );
}
