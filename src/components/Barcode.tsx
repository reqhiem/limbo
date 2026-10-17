import { useEffect, useRef } from "react";
import styles from "./Barcode.module.css";

/**
 * Run widths (in units) from the first 8 digest bytes: each 2-bit group is one run of 1–3 units,
 * alternating bar/space, bar first. Same digest, same code.
 */
export function barcodeRuns(digest: string): number[] {
  const runs: number[] = [];
  for (let i = 0; i < 16; i += 2) {
    const b = parseInt(digest.slice(i, i + 2), 16) || 0;
    for (let shift = 6; shift >= 0; shift -= 2) runs.push((((b >> shift) & 3) % 3) + 1);
  }
  return runs;
}

// One observer for every barcode on the page (up to 500 rows).
const redraws = new WeakMap<Element, () => void>();
let observer: ResizeObserver | null = null;
const sharedObserver = () =>
  (observer ??= new ResizeObserver((entries) => {
    for (const entry of entries) redraws.get(entry.target)?.();
  }));

interface Props {
  digest: string;
  /** Width of one unit in CSS px; bars are never thinner than this. */
  unit?: number;
  className?: string;
}

/** Deterministic barcode for a body digest: identical payloads draw identical codes. Sized by CSS. */
export function Barcode({ digest, unit = 2, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const runs = barcodeRuns(digest);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "#fff";
      // Left-aligned at a fixed unit; whatever exceeds the box is clipped, never squeezed.
      const u = Math.max(1, Math.round(unit * dpr));
      let x = 0;
      runs.forEach((run, i) => {
        if (i % 2 === 0) ctx.fillRect(x, 0, run * u, h);
        x += run * u;
      });
    };
    draw();
    redraws.set(canvas, draw);
    const ro = sharedObserver();
    try {
      // Also fires when devicePixelRatio changes (zoom), keeping bars crisp.
      ro.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      ro.observe(canvas);
    }
    return () => {
      ro.unobserve(canvas);
      redraws.delete(canvas);
    };
  }, [digest, unit]);

  return <canvas ref={ref} className={`${styles.code}${className ? ` ${className}` : ""}`} aria-hidden="true" />;
}
