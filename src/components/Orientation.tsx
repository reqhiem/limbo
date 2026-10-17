import type { Endpoint } from "../../shared/types";
import { formatInt } from "../lib/format";
import { hrefFor } from "../lib/router";
import { CopyButton } from "./CopyButton";
import styles from "./Orientation.module.css";

export function Orientation({ endpoints }: { endpoints: Endpoint[] | null }) {
  const has = !!endpoints?.length;
  return (
    <div className={styles.orientation}>
      <h1 className={styles.title}>{has ? "Pick an endpoint" : "Create an endpoint"}</h1>
      <div className={styles.columns}>
        <ol className={styles.steps}>
          <li>
            <span className={styles.n}>1</span>
            <span>Create an endpoint in the left column. Leave the slug blank for a random URL.</span>
          </li>
          <li>
            <span className={styles.n}>2</span>
            <span>Paste its URL into Stripe, GitHub, or any webhook sender, or hit it with curl.</span>
          </li>
          <li>
            <span className={styles.n}>3</span>
            <span>
              Each request lands at the top of the list within a second. Identical payloads draw identical barcodes,
              so retries stand out.
            </span>
          </li>
        </ol>
        {has && (
          <section className={styles.urls} aria-labelledby="urls-title">
            <h2 id="urls-title" className="label">
              Webhook URLs
            </h2>
            <ul>
              {endpoints!.map((e) => {
                const url = `${location.origin}/h/${e.slug}`;
                return (
                  <li key={e.slug} className={styles.url}>
                    <a href={hrefFor(e.slug)} className={styles.urlName}>
                      {e.name ?? e.slug}
                      <span className="label"> · {formatInt(e.requestCount)} captured</span>
                    </a>
                    <code className={styles.urlText} title={url}>
                      {url}
                    </code>
                    <CopyButton text={url} label="Copy URL" small />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
