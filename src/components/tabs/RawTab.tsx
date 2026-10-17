import { useMemo } from "react";
import type { CapturedRequest } from "../../../shared/types";
import { toRawHttp } from "../../lib/curl";
import { CopyButton } from "../CopyButton";
import styles from "./tabs.module.css";

export function RawTab({ req }: { req: CapturedRequest }) {
  const raw = useMemo(() => toRawHttp(req), [req]);
  return (
    <>
      <div className={styles.toolbar}>
        <span className="label">Reconstructed HTTP/1.1</span>
        <CopyButton text={raw} label="Copy raw" small />
      </div>
      <pre className={styles.pre}>{raw}</pre>
    </>
  );
}
