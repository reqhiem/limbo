import { useState } from "react";
import { JsonNumber } from "../lib/body";
import { IconChevron } from "./icons";
import styles from "./JsonTree.module.css";

const PAGE = 200;
const OPEN_MAX_DEPTH = 3;
const OPEN_MAX_CHILDREN = 50;

const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] =>
  v !== null && typeof v === "object" && !(v instanceof JsonNumber);

const scalar = (v: unknown) => (v instanceof JsonNumber ? v.source : JSON.stringify(v));

/** `small`: body ≤ 64 KiB. Large bodies open only the root; everything else expands on demand. */
export function JsonTree({ value, small }: { value: unknown; small: boolean }) {
  return (
    <div className={styles.tree}>
      <Node name={null} value={value} depth={0} comma={false} small={small} />
    </div>
  );
}

interface NodeProps {
  name: string | number | null;
  value: unknown;
  depth: number;
  comma: boolean;
  small: boolean;
}

function Key({ name }: { name: NodeProps["name"] }) {
  if (name === null) return null;
  return (
    <span className={styles.key}>
      {typeof name === "number" ? name : JSON.stringify(name)}
      {": "}
    </span>
  );
}

const Comma = ({ show }: { show: boolean }) => (show ? <span className={styles.punct}>,</span> : null);

function Node({ name, value, depth, comma, small }: NodeProps) {
  const container = isContainer(value);
  const entries: [string | number, unknown][] = !container
    ? []
    : Array.isArray(value)
      ? value.map((v, i) => [i, v])
      : Object.entries(value);
  // Children render only while open.
  const [open, setOpen] = useState(
    depth === 0 || (small && depth < OPEN_MAX_DEPTH && entries.length <= OPEN_MAX_CHILDREN),
  );
  const [limit, setLimit] = useState(PAGE);
  const indent = { paddingInlineStart: `${depth * 2}ch` };

  if (!container) {
    return (
      <div className={styles.line} style={indent}>
        <Key name={name} />
        <span>{scalar(value)}</span>
        <Comma show={comma} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const [openCh, closeCh] = isArray ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return (
      <div className={styles.line} style={indent}>
        <Key name={name} />
        <span className={styles.punct}>{openCh + closeCh}</span>
        <Comma show={comma} />
      </div>
    );
  }

  const n = entries.length;
  const count = `${n} ${isArray ? (n === 1 ? "item" : "items") : n === 1 ? "key" : "keys"}`;
  const rest = n - limit;
  return (
    <>
      <div className={styles.line} style={indent}>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <IconChevron className={open ? styles.open : undefined} />
          <Key name={name} />
          <span className={styles.punct}>{openCh}</span>
          {!open && (
            <>
              <span className={styles.count}> {count} </span>
              <span className={styles.punct}>{closeCh}</span>
              <Comma show={comma} />
            </>
          )}
        </button>
      </div>
      {open && (
        <>
          {entries.slice(0, limit).map(([k, v], i) => (
            <Node key={k} name={k} value={v} depth={depth + 1} comma={i < n - 1} small={small} />
          ))}
          {rest > 0 && (
            <div className={styles.line} style={{ paddingInlineStart: `${(depth + 1) * 2}ch` }}>
              <button type="button" className="btn small" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, rest)} more · {rest} hidden
              </button>
            </div>
          )}
          <div className={styles.line} style={indent}>
            <span className={styles.punct}>{closeCh}</span>
            <Comma show={comma} />
          </div>
        </>
      )}
    </>
  );
}
