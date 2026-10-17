import type { ReactNode } from "react";
import styles from "./KeyValueTable.module.css";

interface Props {
  rows: readonly (readonly [string, ReactNode])[];
  /** Keys are our labels (Metadata), not captured data (Headers, Query). */
  labelKeys?: boolean;
  caption?: string;
}

export function KeyValueTable({ rows, labelKeys = false, caption }: Props) {
  return (
    // aria-label, not a hidden <caption>: an out-of-flow caption breaks fixed table layout in Chrome.
    <table className={`${styles.table}${labelKeys ? ` ${styles.labelKeys}` : ""}`} aria-label={caption}>
      <tbody>
        {rows.map(([k, v], i) => (
          <tr key={i}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
