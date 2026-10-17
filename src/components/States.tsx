import type { ReactNode } from "react";
import styles from "./States.module.css";
import { IconRetry } from "./icons";

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className={`inv ${styles.error}`} role="alert">
      <span className={styles.code}>ERR</span>
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <button type="button" className="btn small" onClick={onRetry}>
          <IconRetry />
          Retry
        </button>
      )}
    </div>
  );
}

/** Hairline placeholder rows; no spinner, no shimmer. */
export function Skeleton({ rows = 6, height = 52 }: { rows?: number; height?: number }) {
  return (
    <div className={styles.skeleton} aria-busy="true">
      <span className="visually-hidden">Loading…</span>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={styles.skeletonRow} style={{ height }}>
          <span style={{ width: `${18 + ((i * 37) % 30)}%` }} />
          <span style={{ width: `${30 + ((i * 53) % 40)}%` }} />
        </div>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={styles.empty}>
      <p className={styles.emptyTitle}>{title}</p>
      {children && <div className={styles.emptyBody}>{children}</div>}
    </div>
  );
}
