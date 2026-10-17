import { memo } from "react";
import type { RequestSummary } from "../../shared/types";
import { formatBytes, formatClock, formatDate } from "../lib/format";
import { hrefFor } from "../lib/router";
import { Barcode } from "./Barcode";
import styles from "./RequestRow.module.css";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// "payment_intent." + "succeeded": the head may shrink, the tail is what tells events apart.
const LABEL_SPLIT = /^(.*[.:/])([^.:/]+)$/;

function EventLabel({ label }: { label: string }) {
  const m = LABEL_SPLIT.exec(label);
  return (
    <span className={styles.event} title={label}>
      {m && <span className={styles.head}>{m[1]}</span>}
      <span className={styles.tail}>{m ? m[2] : label}</span>
    </span>
  );
}

interface Props {
  request: RequestSummary;
  selected: boolean;
  unseen: boolean;
  arriving: boolean;
}

export const RequestRow = memo(function RequestRow({ request: r, selected, unseen, arriving }: Props) {
  const cls = [styles.row, "focus-inset", selected && "inv", unseen && styles.unseen, arriving && styles.arriving]
    .filter(Boolean)
    .join(" ");
  const target = `${r.path || "/"}${r.search}`;
  const ip = r.ip ?? "no ip";
  return (
    <a href={hrefFor(r.slug, r.id)} className={cls} aria-current={selected ? "true" : undefined}>
      <span className={styles.main}>
        <span className={styles.line1} title={`${r.method} ${target}`}>
          <span className={SAFE_METHODS.has(r.method) ? styles.safe : styles.mutating}>{r.method}</span> {target}
        </span>
        <span className={styles.line2}>
          {r.responseStatus >= 400 && (
            <span className={`badge ${styles.status}`} title={`Limbo answered ${r.responseStatus}`}>
              {r.responseStatus}
            </span>
          )}
          {r.label && <EventLabel label={r.label} />}
        </span>
      </span>
      <Barcode digest={r.digest} />
      <span className={styles.when}>
        <span title={`${formatDate(r.receivedAt)} ${formatClock(r.receivedAt, true)}`}>{formatClock(r.receivedAt)}</span>
        <span>{formatBytes(r.size)}</span>
        <span className={styles.ip}>{ip}</span>
      </span>
      {unseen && <span className="visually-hidden">, new</span>}
    </a>
  );
});
