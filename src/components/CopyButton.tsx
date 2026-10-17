import { useEffect, useRef, useState } from "react";
import { announce } from "../lib/announce";
import { copyText } from "../lib/clipboard";
import styles from "./CopyButton.module.css";
import { IconCheck, IconCopy } from "./icons";

interface Props {
  text: string | (() => string);
  label?: string;
  small?: boolean;
}

type CopyState = "idle" | "copied" | "failed";

export function CopyButton({ text, label = "Copy", small = false }: Props) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    let next: CopyState = "copied";
    try {
      await copyText(typeof text === "function" ? text() : text);
    } catch {
      next = "failed";
    }
    setState(next);
    announce(next === "copied" ? `${label}: copied` : `${label}: copy failed`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 1200);
  };

  const shown = state === "copied" ? "Copied" : state === "failed" ? "Failed" : label;
  return (
    <button type="button" className={`btn${small ? " small" : ""}${state === "idle" ? "" : " on"}`} onClick={onClick}>
      {state === "copied" ? <IconCheck /> : <IconCopy />}
      {/* All labels stacked in one grid cell so the button never changes width. */}
      <span className={styles.stack}>
        <span aria-hidden={shown !== label}>{label}</span>
        <span aria-hidden={shown !== "Copied"}>Copied</span>
        <span aria-hidden={shown !== "Failed"}>Failed</span>
      </span>
    </button>
  );
}
