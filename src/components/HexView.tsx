import type { ReactNode } from "react";
import styles from "./HexView.module.css";

const BYTES_PER_LINE = 16;

const hex2 = (b: number) => b.toString(16).padStart(2, "0");
const isPrintable = (b: number) => b >= 0x20 && b < 0x7f;

/** Joins consecutive tokens of the same tone into one span, so the DOM stays small. */
function toned(tokens: [text: string, dim: boolean][]): ReactNode[] {
  const out: ReactNode[] = [];
  let text = "";
  let dim: boolean | null = null;
  const flush = () => {
    if (text) out.push(dim ? <span key={out.length} className={styles.dim}>{text}</span> : text);
  };
  for (const [t, d] of tokens) {
    if (d !== dim) {
      flush();
      text = "";
      dim = d;
    }
    text += t;
  }
  flush();
  return out;
}

/** offset · 16 bytes hex · ASCII, first `limit` bytes. `00` and non-printables sit at the label tier. */
export function HexView({ bytes, limit = 4096 }: { bytes: Uint8Array; limit?: number }) {
  const shown = bytes.subarray(0, limit);
  const lines = [];
  for (let off = 0; off < shown.length; off += BYTES_PER_LINE) {
    const chunk = [...shown.subarray(off, off + BYTES_PER_LINE)];
    lines.push(
      <div key={off} className={styles.line}>
        <span className={styles.offset}>{off.toString(16).padStart(8, "0")}</span>
        <span className={styles.bytes}>
          {toned(chunk.map((b, j) => [`${j === 0 ? "" : j === 8 ? "  " : " "}${hex2(b)}`, b === 0]))}
        </span>
        <span className={styles.ascii}>
          {toned(chunk.map((b) => [isPrintable(b) ? String.fromCharCode(b) : ".", !isPrintable(b)]))}
        </span>
      </div>,
    );
  }
  return (
    <pre className={styles.hex} aria-label={`Hex dump of the first ${shown.length} bytes`}>
      {lines}
    </pre>
  );
}
