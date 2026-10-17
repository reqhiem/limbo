import { useState } from "react";
import { JsonNumber } from "../lib/body";
import { IconChevron } from "./icons";
import styles from "./JsonTree.module.css";

const isContainer = (v: unknown): v is Record<string, unknown> | unknown[] =>
  v !== null && typeof v === "object" && !(v instanceof JsonNumber);

const scalar = (v: unknown) => (v instanceof JsonNumber ? v.source : JSON.stringify(v));

export function JsonTree({ value }: { value: unknown }) {
  return (
    <div className={styles.tree}>
      <Node name={null} value={value} depth={0} comma={false} />
    </div>
  );
}

interface NodeProps {
  name: string | number | null;
  value: unknown;
  depth: number;
  comma: boolean;
}

function Key({ name }: { name: NodeProps["name"] }) {
  if (name === null) return null;
  if (typeof name === "number") return <span className={styles.index}>{name}: </span>;
  return (
    <>
      <span className={styles.key}>{JSON.stringify(name)}</span>
      <span className={styles.punct}>: </span>
    </>
  );
}

const Comma = ({ show }: { show: boolean }) => (show ? <span className={styles.punct}>,</span> : null);

function Node({ name, value, depth, comma }: NodeProps) {
  // Children render only while open; depth 0 and 1 start open.
  const [open, setOpen] = useState(depth < 2);
  const indent = { paddingInlineStart: `${depth * 2}ch` };

  if (!isContainer(value)) {
    return (
      <div className={styles.line} style={indent}>
        <Key name={name} />
        <span className={styles.value}>{scalar(value)}</span>
        <Comma show={comma} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries: [string | number, unknown][] = isArray ? value.map((v, i) => [i, v]) : Object.entries(value);
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

  const count = `${entries.length} ${isArray ? (entries.length === 1 ? "item" : "items") : entries.length === 1 ? "key" : "keys"}`;
  return (
    <>
      <div className={styles.line} style={indent}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
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
          {entries.map(([k, v], i) => (
            <Node key={k} name={k} value={v} depth={depth + 1} comma={i < entries.length - 1} />
          ))}
          <div className={styles.line} style={indent}>
            <span className={styles.punct}>{closeCh}</span>
            <Comma show={comma} />
          </div>
        </>
      )}
    </>
  );
}
