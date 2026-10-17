import { useState } from "react";
import type { Endpoint } from "../../shared/types";
import { formatAgo, useNow } from "../lib/format";
import { hrefFor } from "../lib/router";
import { CreateEndpointForm } from "./CreateEndpointForm";
import styles from "./EndpointList.module.css";
import { IconClose, IconPlus } from "./icons";
import { Empty, ErrorBlock, Skeleton } from "./States";

interface Props {
  className?: string;
  endpoints: Endpoint[] | null;
  error: string | null;
  selected: string | null;
  onRetry: () => void;
  onCreated: (endpoint: Endpoint) => void;
}

export function EndpointList({ className, endpoints, error, selected, onRetry, onCreated }: Props) {
  const now = useNow(15_000);
  const [creating, setCreating] = useState(false);
  // With nothing to list, the form is the whole point: keep it open.
  const formOpen = creating || endpoints?.length === 0;

  return (
    <nav className={`${styles.column} ${className ?? ""}`} aria-labelledby="endpoints-title">
      <div className={styles.head}>
        <h2 id="endpoints-title" className="label">
          Endpoints{endpoints ? ` · ${endpoints.length}` : ""}
        </h2>
        {endpoints?.length !== 0 && (
          <button
            type="button"
            className="btn small"
            aria-expanded={formOpen}
            aria-controls="create-endpoint"
            onClick={() => setCreating((c) => !c)}
          >
            {formOpen ? <IconClose /> : <IconPlus />}
            {formOpen ? "Cancel" : "New"}
          </button>
        )}
      </div>
      {formOpen && (
        <CreateEndpointForm
          id="create-endpoint"
          onCancel={() => setCreating(false)}
          onCreated={(ep) => {
            setCreating(false);
            onCreated(ep);
          }}
        />
      )}
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
                      {e.lastRequestAt === null ? (
                        <span className="label">No requests yet</span>
                      ) : (
                        <>
                          <span className="label">Last</span> {formatAgo(e.lastRequestAt, now)}
                        </>
                      )}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </nav>
  );
}
