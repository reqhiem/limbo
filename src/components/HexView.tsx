import styles from "./HexView.module.css";

const BYTES_PER_LINE = 16;

const hex2 = (b: number) => b.toString(16).padStart(2, "0");
const printable = (b: number) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : ".");

/** offset · 16 bytes hex · ASCII column, for the first `limit` bytes. */
export function HexView({ bytes, limit = 4096 }: { bytes: Uint8Array; limit?: number }) {
  const shown = bytes.subarray(0, limit);
  const lines = [];
  for (let off = 0; off < shown.length; off += BYTES_PER_LINE) {
    const chunk = [...shown.subarray(off, off + BYTES_PER_LINE)];
    const hex = chunk.map(hex2);
    lines.push(
      <div key={off} className={styles.line}>
        <span className={styles.offset}>{off.toString(16).padStart(8, "0")}</span>
        <span>{`${hex.slice(0, 8).join(" ")}  ${hex.slice(8).join(" ")}`.padEnd(48)}</span>
        <span className={styles.ascii}>{chunk.map(printable).join("")}</span>
      </div>,
    );
  }
  return (
    <pre className={styles.hex} aria-label={`Hex dump of the first ${shown.length} bytes`}>
      {lines}
    </pre>
  );
}
