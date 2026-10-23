import { useMemo, useState, type ReactNode } from "react";
import { JsonNumber, parseJson } from "../lib/body";
import { formatClock, formatDate } from "../lib/format";
import { IconChevron } from "./icons";
import styles from "./JsonTree.module.css";

const PAGE = 200;
const OPEN_MAX_DEPTH = 3;
const OPEN_MAX_CHILDREN = 50;

const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] =>
  v !== null && typeof v === "object" && !(v instanceof JsonNumber);

const scalar = (v: unknown) => (v instanceof JsonNumber ? v.source : JSON.stringify(v));

// Keys that name a moment: creation_date, createdAt, timestamp, exp…
const isDateKey = (k: string) => /date|time|stamp/i.test(k) || /_at$|[a-z]At$|^(ts|iat|exp|nbf)$/.test(k);

/** The one suggestion a leaf can carry: a timestamp read as local time, or a string holding JSON. */
function suggest(name: NodeProps["name"], v: unknown) {
  if (v instanceof JsonNumber && typeof name === "string" && isDateKey(name) && /^\d{9,14}$/.test(v.source)) {
    const n = Number(v.source);
    // ponytail: 1e11 splits seconds from ms (year 1973 vs 5138); revisit if sub-second units ever show up.
    const ms = n < 1e11 ? n * 1000 : n;
    return { label: "Local", hint: "Show as local time", text: `${formatDate(ms)} ${formatClock(ms, true)}`, json: undefined };
  }
  if (typeof v === "string" && /^\s*(\{[^]*\}|\[[^]*\])\s*$/.test(v)) {
    try {
      const json = parseJson(v);
      if (json !== null && typeof json === "object") return { label: "Parse", hint: "Parse the string as JSON", text: "", json };
    } catch {
      /* Braces, but not JSON. Leave the string alone. */
    }
  }
  return null;
}

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
  /** Suggestion toggle, drawn on the node's own first line. */
  extra?: ReactNode;
}

/** A leaf with a suggestion: pressed swaps the value for its reading (local time, or the parsed tree). */
function Leaf({ name, value, depth, comma, small }: NodeProps) {
  const hint = useMemo(() => suggest(name, value), [name, value]);
  // Embedded JSON opens parsed (the escaped string is unreadable); a timestamp stays as received until asked.
  const [on, setOn] = useState(hint?.json !== undefined);
  const lens = hint && (
    <button
      type="button"
      className={`btn small ${styles.lens}`}
      aria-pressed={on}
      aria-label={hint.hint}
      title={hint.hint}
      onClick={() => setOn((o) => !o)}
    >
      {hint.label}
    </button>
  );
  if (hint?.json !== undefined && on) {
    return <Node name={name} value={hint.json} depth={depth} comma={comma} small={small} extra={lens} />;
  }
  return (
    <div className={styles.line} style={{ paddingInlineStart: `${depth * 2}ch` }}>
      <Key name={name} />
      <span>{on && hint ? hint.text : scalar(value)}</span>
      <Comma show={comma} />
      {lens}
    </div>
  );
}

function Key({ name }: { name: NodeProps["name"] }) {
  if (name === null) return null;
  return (
    <>
      <span className={styles.key}>{typeof name === "number" ? name : JSON.stringify(name)}</span>
      <span className={styles.punct}>: </span>
    </>
  );
}

const Comma = ({ show }: { show: boolean }) => (show ? <span className={styles.punct}>,</span> : null);

function Node({ name, value, depth, comma, small, extra }: NodeProps) {
  const container = isContainer(value);
  const entries: [string | number, unknown][] = !container
    ? []
    : Array.isArray(value)
      ? value.map((v, i) => [i, v])
      : Object.entries(value);
  // Children render only while open.
  const [open, setOpen] = useState(
    depth === 0 || extra !== undefined || (small && depth < OPEN_MAX_DEPTH && entries.length <= OPEN_MAX_CHILDREN),
  );
  const [limit, setLimit] = useState(PAGE);
  const indent = { paddingInlineStart: `${depth * 2}ch` };

  if (!container) return <Leaf name={name} value={value} depth={depth} comma={comma} small={small} />;

  const isArray = Array.isArray(value);
  const [openCh, closeCh] = isArray ? ["[", "]"] : ["{", "}"];

  if (entries.length === 0) {
    return (
      <div className={styles.line} style={indent}>
        <Key name={name} />
        <span className={styles.punct}>{openCh + closeCh}</span>
        <Comma show={comma} />
        {extra}
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
        {extra}
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
