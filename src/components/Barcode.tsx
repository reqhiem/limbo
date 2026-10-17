import { useEffect, useRef } from "react";
import styles from "./Barcode.module.css";

/** Bar/space widths (in modules) derived from a hex digest; bars and spaces alternate, bar first. */
export function barcodeRuns(digest: string): number[] {
  const runs = [1, 1, 1, 1]; // start guard: bar, space, bar, space
  for (let i = 0; i + 1 < digest.length && i < 32; i += 2) {
    const b = parseInt(digest.slice(i, i + 2), 16) || 0;
    // Fold the high nibble into the low one so all 128 bits shape the code.
    runs.push(1 + ((b ^ (b >> 4)) & 3), 1 + (((b >> 2) ^ (b >> 6)) & 3));
  }
  runs.push(1, 1, 1); // end guard: bar, space, bar
  return runs;
}

/** Deterministic barcode for a body digest: identical payloads draw identical codes. Sized by CSS. */
export function Barcode({ digest }: { digest: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const runs = barcodeRuns(digest);
    const total = runs.reduce((a, b) => a + b, 0);
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = "#fff";
      let units = 0;
      runs.forEach((run, i) => {
        // Snap both edges to device pixels so every bar is crisp.
        const x0 = Math.round((units * w) / total);
        units += run;
        const x1 = Math.round((units * w) / total);
        if (i % 2 === 0) ctx.fillRect(x0, 0, Math.max(1, x1 - x0), h);
      });
    };
    draw();
    const ro = new ResizeObserver(draw);
    try {
      // Also fires when devicePixelRatio changes (zoom), keeping bars crisp.
      ro.observe(canvas, { box: "device-pixel-content-box" });
    } catch {
      ro.observe(canvas);
    }
    return () => ro.disconnect();
  }, [digest]);

  return <canvas ref={ref} className={styles.code} aria-hidden="true" />;
}
