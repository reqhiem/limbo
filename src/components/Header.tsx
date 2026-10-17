import type { LiveStatus } from "../lib/live";
import styles from "./Header.module.css";
import { IconPause, IconPlay } from "./icons";
import { SineTrace } from "./SineTrace";

interface Props {
  status: LiveStatus;
  paused: boolean;
  waiting: number;
  endpointCount: number | null;
  captured: number | null;
  phase: number;
  onTogglePause: () => void;
}

const pad = (n: number | null) => (n === null ? "---" : String(n).padStart(3, "0"));

export function Header({ status, paused, waiting, endpointCount, captured, phase, onTogglePause }: Props) {
  const stateText = paused ? `Paused · ${waiting} waiting` : status;
  return (
    <header className={styles.header}>
      <a className={styles.mark} href="#/" aria-label="Limbo home">
        Limbo
      </a>
      <div className={styles.trace}>
        <SineTrace phase={phase} />
      </div>
      <dl className={styles.counters}>
        <div>
          <dt className="label">Endpoints</dt>
          <dd>{pad(endpointCount)}</dd>
        </div>
        <div>
          <dt className="label">Captured</dt>
          <dd>{pad(captured)}</dd>
        </div>
      </dl>
      <div className={`${styles.state}${paused ? " inv" : ""}`} role="status">
        <span className={styles.lamp} data-state={paused ? "paused" : status} aria-hidden="true" />
        <span className="visually-hidden">Stream </span>
        {stateText}
      </div>
      <button type="button" className={`btn ${styles.pause}`} onClick={onTogglePause}>
        {paused ? <IconPlay /> : <IconPause />}
        {paused ? "Resume" : "Pause"}
      </button>
    </header>
  );
}
