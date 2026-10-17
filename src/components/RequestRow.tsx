import type { RequestSummary } from "../../shared/types";
import { formatBytes, formatStamp } from "../lib/format";
import { hrefFor } from "../lib/router";
import { Barcode } from "./Barcode";
import styles from "./RequestRow.module.css";

interface Props {
  request: RequestSummary;
  selected: boolean;
  unseen: boolean;
  arriving: boolean;
  now: number;
}

export function RequestRow({ request: r, selected, unseen, arriving, now }: Props) {
  const cls = [styles.row, "focus-inset", selected && "inv", unseen && styles.unseen, arriving && styles.arriving]
    .filter(Boolean)
    .join(" ");
  return (
    <a href={hrefFor(r.slug, r.id)} className={cls} aria-current={selected ? "true" : undefined}>
      <span className={styles.method}>{r.method}</span>
      <span className={styles.where}>
        <span className={styles.path}>{r.path || "/"}</span>
        <span className={styles.ip}>{r.ip ?? "no ip"}</span>
      </span>
      <Barcode digest={r.digest} />
      <span className={styles.when}>
        <span>{formatStamp(r.receivedAt, now)}</span>
        <span>{formatBytes(r.size)}</span>
      </span>
      {unseen && <span className="visually-hidden">, new</span>}
    </a>
  );
}
