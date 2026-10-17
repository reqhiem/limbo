import { useEffect, useRef } from "react";
import type { Endpoint } from "../../shared/types";
import { hrefFor } from "../lib/router";
import styles from "./EndpointSwitcher.module.css";
import { IconArrowLeft, IconChevron } from "./icons";

/** The endpoint column folded into the request column header (below 1280px). */
export function EndpointSwitcher({ endpoints, current }: { endpoints: Endpoint[]; current: Endpoint }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: Event) => {
      const d = ref.current;
      if (d?.open && !(e.target instanceof Node && d.contains(e.target))) d.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const d = ref.current;
      if (e.key === "Escape" && d?.open) {
        d.open = false;
        d.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details
      ref={ref}
      className={styles.switcher}
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest("a") && ref.current) ref.current.open = false;
      }}
    >
      <summary className={`${styles.summary} focus-inset`} aria-label={`Endpoint: ${current.name ?? current.slug}. Switch`}>
        <span className={styles.name}>{current.name ?? current.slug}</span>
        <IconChevron className={styles.chevron} />
      </summary>
      <ul className={styles.menu}>
        {endpoints.map((e) => (
          <li key={e.slug}>
            <a
              href={hrefFor(e.slug)}
              className={`${styles.item} focus-inset${e.slug === current.slug ? " inv" : ""}`}
              aria-current={e.slug === current.slug ? "page" : undefined}
            >
              <span className={styles.itemName}>{e.name ?? e.slug}</span>
              <span className={styles.itemCount}>{String(e.requestCount).padStart(3, "0")}</span>
            </a>
          </li>
        ))}
        <li>
          <a href={hrefFor(null)} className={`${styles.item} ${styles.all} focus-inset`}>
            <IconArrowLeft />
            All endpoints · new
          </a>
        </li>
      </ul>
    </details>
  );
}
